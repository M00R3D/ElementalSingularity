export class CombatSystem {
  constructor(data, gameState, elementSystem, entityManager) {
    this.data = data;
    this.gameState = gameState;
    this.elementSystem = elementSystem;
    this.entityManager = entityManager;
  }

  getAbilityById(id) {
    return this.data.abilities.find((item) => item.id === id) || null;
  }

  getRunModifiers() {
    const total = { damage: 0, attackSpeed: 0, critChance: 0, critDamage: 0, manaRegen: 0, bounce: 0, pierce: 0 };
    for (const upgrade of this.data.runUpgrades) {
      if (!this.gameState.runUpgrades[upgrade.id]) {
        continue;
      }
      for (const key of Object.keys(upgrade.modifiers)) {
        total[key] = (total[key] || 0) + upgrade.modifiers[key];
      }
    }
    return total;
  }

  getCombinedModifiers(profile) {
    const passive = profile.passiveModifiers || {};
    const run = this.getRunModifiers();
    const meta = this.elementSystem.getMetaModifiers();
    return {
      damage: (passive.damage || 0) + (run.damage || 0) + (meta.damage || 0),
      attackSpeed: (passive.attackSpeed || 0) + (run.attackSpeed || 0),
      critChance: (passive.critChance || 0) + (run.critChance || 0) + (meta.critChance || 0),
      critDamage: (passive.critDamage || 0) + (run.critDamage || 0),
      bounce: (passive.bounce || 0) + (run.bounce || 0),
      pierce: (passive.pierce || 0) + (run.pierce || 0),
      size: passive.size || 0,
      manaRegen: passive.manaRegen || 0
    };
  }

  buildProfile(slotItem) {
    if (!slotItem) {
      return null;
    }

    if (slotItem.kind === 'element') {
      return this.elementSystem.resolveProfile(slotItem.id);
    }

    const ability = this.getAbilityById(slotItem.id);
    if (!ability) {
      return null;
    }

    const base = ability.tags && ability.tags[0] ? this.elementSystem.resolveProfile(ability.tags[0]) : null;
    return {
      name: ability.name,
      attackType: ability.attackType,
      color: ability.color,
      baseDamage: ability.baseDamage,
      cooldown: ability.cooldown,
      manaCost: ability.manaCost,
      staminaCost: ability.staminaCost,
      elementIds: ability.tags || [],
      statuses: base ? base.statuses : [],
      modifiers: { ...(base ? base.modifiers : {}), ...(ability.modifiers || {}) },
      passiveModifiers: this.elementSystem.getPassiveModifiers()
    };
  }

  getSelectedProfile() {
    return this.buildProfile(this.gameState.getSelectedSlot());
  }

  tryPlayerAttack(input) {
    const profile = this.getSelectedProfile();
    if (!profile || !input.mouseDown) {
      return;
    }

    const player = this.entityManager.player;
    const modifiers = this.getCombinedModifiers(profile);
    const cooldown = Math.max(0.12, (profile.cooldown || 0.55) / (1 + modifiers.attackSpeed));
    if (player.attackCooldown > 0) {
      return;
    }

    if (!this.gameState.spendResource('mp', profile.manaCost || 0)) {
      return;
    }
    if (!this.gameState.spendResource('stamina', profile.staminaCost || 0)) {
      this.gameState.playerStats.mp += profile.manaCost || 0;
      return;
    }

    player.attackCooldown = cooldown;
    if (profile.attackType === 'projectile') {
      this.spawnPlayerProjectile(profile, modifiers, input.mouseX, input.mouseY);
    }
    if (profile.attackType === 'aoe') {
      this.spawnPlayerAoe(profile, modifiers, input.mouseX, input.mouseY);
    }
    if (profile.attackType === 'aura') {
      this.spawnAura(profile, modifiers);
    }
    if (profile.attackType === 'summon') {
      this.spawnSummon(profile, modifiers);
    }
  }

  spawnPlayerProjectile(profile, modifiers, targetX, targetY) {
    const player = this.entityManager.player;
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const radius = 5 + (profile.modifiers?.size || 0) * 3;
    this.entityManager.spawnProjectile({
      owner: 'player',
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * 520,
      vy: Math.sin(angle) * 520,
      radius,
      life: 1.9,
      damage: profile.baseDamage,
      color: profile.color,
      attackType: 'projectile',
      elementIds: profile.elementIds,
      statuses: profile.statuses,
      critChance: 0.08 + modifiers.critChance,
      critDamage: 0.75 + modifiers.critDamage,
      pierce: (profile.modifiers?.pierce || 0) + modifiers.pierce,
      bounce: (profile.modifiers?.bounce || 0) + modifiers.bounce,
      growth: (profile.modifiers?.size || 0) * 2,
      aoeRadius: profile.radius || 0,
      chainCount: profile.chainCount || 0
    });
  }

  spawnPlayerAoe(profile, modifiers, targetX, targetY) {
    const radius = (profile.radius || 72) * (1 + (profile.modifiers?.size || 0) * 0.1);
    this.entityManager.spawnBurst(targetX, targetY, profile.color, 22, 180);
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active) continue;
      const distance = Math.hypot(enemy.x - targetX, enemy.y - targetY);
      if (distance <= radius) {
        this.dealDamage(enemy, {
          baseDamage: profile.baseDamage,
          color: profile.color,
          elementIds: profile.elementIds,
          statuses: profile.statuses,
          critChance: 0.1 + modifiers.critChance,
          critDamage: 0.75 + modifiers.critDamage
        });
      }
    }
  }

  spawnAura(profile, modifiers) {
    this.entityManager.spawnSummon({
      owner: 'player',
      kind: 'aura',
      x: this.entityManager.player.x,
      y: this.entityManager.player.y,
      radius: 12,
      orbitRadius: 72,
      life: 5.8,
      color: profile.color,
      damage: profile.baseDamage,
      statuses: profile.statuses,
      attackInterval: 0.5 / (1 + modifiers.attackSpeed),
      elementIds: profile.elementIds
    });
  }

  spawnSummon(profile, modifiers) {
    this.entityManager.spawnSummon({
      owner: 'player',
      kind: 'drone',
      x: this.entityManager.player.x,
      y: this.entityManager.player.y,
      radius: 9,
      orbitRadius: 82,
      life: 7,
      color: profile.color,
      damage: profile.baseDamage,
      statuses: profile.statuses,
      attackInterval: 0.42 / (1 + modifiers.attackSpeed),
      elementIds: profile.elementIds
    });
  }

  spawnEnemyShot(enemy) {
    const player = this.entityManager.player;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    this.entityManager.spawnProjectile({
      owner: 'enemy',
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * 240,
      vy: Math.sin(angle) * 240,
      radius: 6,
      life: 3,
      damage: enemy.damage,
      color: '#ffb1eb',
      attackType: 'projectile',
      elementIds: ['thought']
    });
  }

  spawnEnemyBurst(enemy) {
    const count = enemy.phase === 3 ? 8 : 5;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      this.entityManager.spawnProjectile({
        owner: 'enemy',
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 220,
        vy: Math.sin(angle) * 220,
        radius: 7,
        life: 2.6,
        damage: enemy.damage * 0.8,
        color: enemy.phase === 3 ? '#ffef78' : '#ff8ca1',
        attackType: 'projectile',
        elementIds: ['void']
      });
    }
    if (enemy.phase >= 2) {
      this.entityManager.spawnEnemy('fast', enemy.x + 20, enemy.y + 20);
    }
  }

  triggerSummon(summon) {
    const enemy = this.findNearestEnemy(summon.x, summon.y);
    if (!enemy) {
      return;
    }

    if (summon.kind === 'aura') {
      const radius = 74;
      for (const target of this.entityManager.enemies) {
        if (!target.active) continue;
        const distance = Math.hypot(target.x - summon.x, target.y - summon.y);
        if (distance <= radius) {
          this.dealDamage(target, {
            baseDamage: summon.damage,
            color: summon.color,
            elementIds: summon.elementIds,
            statuses: summon.statuses,
            critChance: 0.04,
            critDamage: 0.5
          });
        }
      }
      this.entityManager.spawnBurst(summon.x, summon.y, summon.color, 8, 80);
      return;
    }

    const angle = Math.atan2(enemy.y - summon.y, enemy.x - summon.x);
    this.entityManager.spawnProjectile({
      owner: 'player',
      x: summon.x,
      y: summon.y,
      vx: Math.cos(angle) * 430,
      vy: Math.sin(angle) * 430,
      radius: 5,
      life: 1.5,
      damage: summon.damage,
      color: summon.color,
      attackType: 'projectile',
      elementIds: summon.elementIds,
      statuses: summon.statuses,
      critChance: 0.05,
      critDamage: 0.5
    });
  }

  resolvePlayerProjectile(projectile) {
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active) continue;
      if (projectile.hitTargets.includes(enemy)) continue;
      const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
      if (distance > projectile.radius + enemy.radius) {
        continue;
      }

      projectile.hitTargets.push(enemy);
      this.dealDamage(enemy, projectile);
      if (projectile.aoeRadius > 0) {
        this.entityManager.spawnBurst(projectile.x, projectile.y, projectile.color, 16, 140);
        for (const splash of this.entityManager.enemies) {
          if (!splash.active || splash === enemy) continue;
          const splashDistance = Math.hypot(projectile.x - splash.x, projectile.y - splash.y);
          if (splashDistance <= projectile.aoeRadius) {
            this.dealDamage(splash, { ...projectile, baseDamage: projectile.damage * 0.65 });
          }
        }
      }
      if (projectile.chainCount > 0) {
        this.chainDamage(enemy, projectile, projectile.chainCount);
      }
      if (projectile.pierce > 0) {
        projectile.pierce -= 1;
      } else if (projectile.bounce > 0) {
        projectile.bounce -= 1;
        projectile.vx *= -0.8;
        projectile.vy *= -0.8;
      } else {
        projectile.active = false;
      }
      return;
    }

    for (const spawner of this.entityManager.spawners) {
      if (!spawner.active) continue;
      const distance = Math.hypot(projectile.x - spawner.x, projectile.y - spawner.y);
      if (distance > projectile.radius + spawner.radius) continue;
      spawner.hp -= projectile.damage * 0.8;
      spawner.hitFlash = 1;
      this.entityManager.spawnBurst(spawner.x, spawner.y, '#ff9bb2', 10, 140);
      if (spawner.hp <= 0) {
        spawner.active = false;
        this.gameState.addXp(45);
        this.gameState.notify('Spawner destroyed', '#ff9bb2', 1.4);
      }
      projectile.active = false;
      return;
    }
  }

  resolveEnemyProjectile(projectile) {
    const player = this.entityManager.player;
    const distance = Math.hypot(projectile.x - player.x, projectile.y - player.y);
    if (distance <= projectile.radius + player.radius) {
      this.gameState.damagePlayer(projectile.damage);
      this.entityManager.spawnBurst(player.x, player.y, '#ff6e6e', 12, 160);
      projectile.active = false;
    }
  }

  chainDamage(origin, projectile, count) {
    let source = origin;
    for (let chain = 0; chain < count; chain += 1) {
      const target = this.findNearestEnemy(source.x, source.y, source);
      if (!target) {
        return;
      }
      this.entityManager.spawnBurst(target.x, target.y, projectile.color, 6, 60);
      this.dealDamage(target, { ...projectile, damage: projectile.damage * 0.6, baseDamage: projectile.damage * 0.6, critChance: 0 });
      source = target;
    }
  }

  findNearestEnemy(x, y, exclude = null) {
    let best = null;
    let distance = Infinity;
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active || enemy === exclude) continue;
      const value = Math.hypot(enemy.x - x, enemy.y - y);
      if (value < distance) {
        distance = value;
        best = enemy;
      }
    }
    return best;
  }

  tickStatuses(target, dt) {
    const entries = Object.keys(target.statuses || {});
    for (const statusId of entries) {
      const status = target.statuses[statusId];
      status.time -= dt;
      status.tick -= dt;
      if (status.tick <= 0) {
        status.tick = 0.4;
        if (statusId === 'burn') {
          target.hp -= status.power * 1.1;
          this.entityManager.spawnParticle({ x: target.x, y: target.y, vx: (Math.random() - 0.5) * 30, vy: -20, radius: 2, life: 0.3, color: '#ff9d52', glow: true });
        }
        if (statusId === 'shock') {
          target.hp -= status.power * 0.8;
        }
        if (statusId === 'infection') {
          target.hp -= status.power * 0.9;
        }
      }
      if (status.time <= 0) {
        delete target.statuses[statusId];
      }
    }
  }

  dealDamage(target, packet) {
    const profileDamage = packet.baseDamage || packet.damage || 0;
    const baseModifiers = this.getCombinedModifiers({ passiveModifiers: this.elementSystem.getPassiveModifiers() });
    const critChance = (packet.critChance || 0.08) + baseModifiers.critChance;
    const critDamage = packet.critDamage || 0.75;
    const isCrit = Math.random() < critChance;
    let damage = profileDamage * (1 + baseModifiers.damage + (this.gameState.playerStats.level - 1) * 0.08);

    for (const elementId of packet.elementIds || []) {
      damage *= 1 + (target.weaknesses?.[elementId] || 0);
      damage *= 1 - (target.resistances?.[elementId] || 0);
    }

    if (target.statuses?.infection) {
      damage *= 1.08;
    }
    if (isCrit) {
      damage *= 1.75 + critDamage;
    }

    target.hp -= damage;
    target.hitFlash = 1;
    this.entityManager.spawnDamageText(target.x, target.y - target.radius, `${Math.round(damage)}${isCrit ? '!' : ''}`, isCrit ? '#fff08d' : '#ffffff');
    this.entityManager.spawnBurst(target.x, target.y, packet.color || '#ffffff', 7, 100);

    for (const status of packet.statuses || []) {
      this.applyStatus(target, status);
    }
  }

  applyStatus(target, status) {
    const chain = this.data.chainReactions.find((item) => item.incoming === status.id && target.statuses?.[item.existing]);
    if (chain) {
      target.hp -= chain.bonusDamage;
      this.entityManager.spawnBurst(target.x, target.y, chain.burstColor, 18, 160);
      this.entityManager.spawnDamageText(target.x, target.y - 20, chain.label, chain.burstColor);
    }
    target.statuses[status.id] = { time: status.duration, power: status.power, tick: 0.25 };
  }
}
