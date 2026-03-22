export class CombatSystem {
  constructor(data, gameState, elementSystem, entityManager) {
    this.data = data;
    this.gameState = gameState;
    this.elementSystem = elementSystem;
    this.entityManager = entityManager;
  }

  getAbilityById(id) {
    return this.elementSystem.getAbility(id);
  }

  getSelectedAbilityId() {
    return this.gameState.getSelectedAbilityId();
  }

  getSelectedAbility() {
    const abilityId = this.getSelectedAbilityId();
    return abilityId ? this.getAbilityById(abilityId) : null;
  }

  getRunModifiers() {
    const total = { damage: 0, attackSpeed: 0, critChance: 0, critDamage: 0, manaRegen: 0, moveSpeed: 0, cooldownReduction: 0 };
    for (const upgrade of this.data.runUpgrades) {
      if (!this.gameState.runUpgrades[upgrade.id]) continue;
      for (const key of Object.keys(upgrade.modifiers)) {
        total[key] = (total[key] || 0) + upgrade.modifiers[key];
      }
    }
    return total;
  }

  getCooldownRatio(abilityId) {
    const ability = this.getAbilityById(abilityId);
    if (!ability) return 0;
    const remaining = this.gameState.getAbilityCooldown(abilityId);
    return Math.max(0, Math.min(1, remaining / ability.cooldown));
  }

  resolveReaction(ability) {
    const lastCast = this.gameState.lastCast;
    if (!lastCast) return null;
    if (this.gameState.time - lastCast.time > 2.6) return null;
    return this.elementSystem.getElementReaction(lastCast.elementId, ability.elementId);
  }

  buildPlayerProfile(abilityId) {
    const ability = this.getAbilityById(abilityId);
    if (!ability) return null;
    const element = this.data.elements[ability.elementId];
    const buildModifiers = this.gameState.getPlayerModifiers();
    const runModifiers = this.getRunModifiers();
    const metaModifiers = this.elementSystem.getMetaModifiers();
    const reaction = this.resolveReaction(ability);
    const equippedUsageType = this.gameState.equipment?.usageType || 'magic';
    const usageMatch = ability.usageType === equippedUsageType || ability.usageType === 'unarmed';
    const compatibilityScale = usageMatch ? 1 : equippedUsageType === 'unarmed' ? 0.7 : 0.84;
    return {
      ...ability,
      color: element.color,
      accent: element.accent,
      reaction,
      buildModifiers,
      runModifiers,
      metaModifiers,
      equippedUsageType,
      compatibilityScale,
      owner: 'player'
    };
  }

  buildEnemyProfile(enemy, abilityId) {
    const ability = this.getAbilityById(abilityId);
    if (!ability) return null;
    const element = this.data.elements[enemy.elementId];
    return {
      ...ability,
      color: element.color,
      accent: element.accent,
      buildModifiers: {},
      runModifiers: {},
      metaModifiers: {},
      damageScale: enemy.typeId === 'boss' ? 1.45 : enemy.typeId === 'elementalist' ? 0.82 : 0.72,
      owner: enemy.faction === 'rogue' ? 'chaos' : 'enemy'
    };
  }

  getFinalCooldown(profile) {
    const reduction = Math.max(0, Math.min(0.45, (profile.buildModifiers.cooldownReduction || 0) + (profile.runModifiers.cooldownReduction || 0)));
    const speedFactor = 1 + (profile.buildModifiers.attackSpeed || 0) + (profile.runModifiers.attackSpeed || 0);
    return Math.max(0.12, (profile.cooldown * (1 - reduction)) / speedFactor);
  }

  getFinalDamage(profile) {
    const levelMultiplier = 1 + (this.gameState.playerStats.level - 1) * 0.1 * (profile.scaling || 1);
    const additive = 1 + (profile.buildModifiers.damage || 0) + (profile.runModifiers.damage || 0) + (profile.metaModifiers.damage || 0);
    const riskBonus = profile.selfDamage ? 0.14 : 0;
    const reactionBonus = profile.reaction ? profile.reaction.bonusDamage : 0;
    return (profile.damage * levelMultiplier * (additive + riskBonus) + reactionBonus) * (profile.damageScale || 1) * (profile.compatibilityScale || 1);
  }

  tryPlayerAttack(input) {
    if (this.gameState.isDead || !input.primaryHeld) return;
    const abilityId = this.getSelectedAbilityId();
    if (!abilityId) return;
    this.tryUsePlayerAbility(abilityId, input.mouseX, input.mouseY);
  }

  tryUsePlayerAbility(abilityId, targetX, targetY) {
    const profile = this.buildPlayerProfile(abilityId);
    if (!profile) return false;
    if (this.gameState.getAbilityCooldown(abilityId) > 0) return false;
    if (!this.gameState.spendResource('mp', profile.manaCost || 0)) return false;
    if (!this.gameState.spendResource('stamina', profile.staminaCost || 0)) {
      this.gameState.refundResource('mp', profile.manaCost || 0);
      return false;
    }

    if (profile.selfDamage) {
      this.gameState.damagePlayer(profile.selfDamage);
      if (this.gameState.isDead) return false;
    }

    this.gameState.setAbilityCooldown(abilityId, this.getFinalCooldown(profile));
    this.gameState.recordAbilityUse(profile, profile.reaction?.label || null);
    this.executeAbility(this.entityManager.player, profile, targetX, targetY, 'player');
    if (profile.reaction) {
      this.entityManager.spawnEffect({ kind: 'ring', x: this.entityManager.player.x, y: this.entityManager.player.y, radius: profile.reaction.radius, color: profile.reaction.color, life: 0.26, width: 2 });
      this.gameState.notify(profile.reaction.label, profile.reaction.color, 1.2);
    }
    return true;
  }

  castEnemyAbility(enemy, target) {
    if (!enemy.loadout || enemy.loadout.length === 0) return;
    const abilityId = enemy.loadout[enemy.castIndex % enemy.loadout.length];
    enemy.castIndex += 1;
    const profile = this.buildEnemyProfile(enemy, abilityId);
    if (!profile) return;
    this.executeAbility(enemy, profile, target.x, target.y, profile.owner);
  }

  executeAbility(source, profile, targetX, targetY, owner) {
    if (profile.type === 'projectile') this.spawnProjectileFrom(source, profile, targetX, targetY, owner);
    if (profile.type === 'burst') this.spawnBurstFrom(source, profile, targetX, targetY, owner);
    if (profile.type === 'aoe') this.spawnAreaFrom(source, profile, targetX, targetY, owner);
    if (profile.type === 'dash') this.performDashFrom(source, profile, targetX, targetY, owner);
    if (profile.type === 'teleport') this.performTeleportFrom(source, profile, targetX, targetY, owner);
    if (profile.type === 'summon') this.spawnSummonFrom(source, profile, owner);
    if (profile.type === 'aura') this.spawnAuraFrom(source, profile, owner);
    if (profile.type === 'laser') this.fireLaserFrom(source, profile, targetX, targetY, owner);
    if (profile.type === 'buff') this.applyBuff(profile);
    if (profile.type === 'chaos') this.executeChaos(source, profile, targetX, targetY, owner);
  }

  executeChaos(source, profile, targetX, targetY, owner) {
    const choice = profile.chaosOptions[Math.floor(Math.random() * profile.chaosOptions.length)] || 'projectile';
    this.executeAbility(source, { ...profile, type: choice, radius: profile.radius || 96 }, targetX, targetY, owner);
  }

  applyBuff(profile) {
    this.gameState.addBuff({ duration: profile.duration || 5, modifiers: profile.buffModifiers || {} });
    this.entityManager.spawnEffect({ kind: 'ring', x: this.entityManager.player.x, y: this.entityManager.player.y, radius: 54, color: profile.color, life: 0.4, width: 3 });
  }

  spawnProjectileFrom(source, profile, targetX, targetY, owner) {
    const angle = Math.atan2(targetY - source.y, targetX - source.x);
    const radius = 5 * (profile.size || 1);
    const packet = this.createPacket(profile, owner);
    this.entityManager.spawnProjectile({
      owner,
      sourceEntity: source,
      x: source.x,
      y: source.y,
      vx: Math.cos(angle) * (profile.speed || 560),
      vy: Math.sin(angle) * (profile.speed || 560),
      radius,
      life: 1.8,
      damage: packet.baseDamage,
      color: profile.color,
      elementIds: packet.elementIds,
      statuses: packet.statuses,
      critChance: packet.critChance,
      critDamage: packet.critDamage,
      pierce: packet.pierce,
      bounce: packet.bounce,
      growth: 1.5 * (profile.size || 1),
      aoeRadius: profile.reaction?.radius || 0,
      chainCount: profile.elementId === 'electricity' ? 1 : 0,
      lifeSteal: packet.lifeSteal
    });
  }

  spawnBurstFrom(source, profile, targetX, targetY, owner) {
    const baseAngle = Math.atan2(targetY - source.y, targetX - source.x);
    const count = profile.projectileCount || 5;
    const spread = profile.spread || 0.4;
    for (let index = 0; index < count; index += 1) {
      const offset = ((index / Math.max(1, count - 1)) - 0.5) * spread;
      const angle = baseAngle + offset;
      this.spawnProjectileFrom(source, { ...profile, speed: profile.speed || 520 }, source.x + Math.cos(angle) * 160, source.y + Math.sin(angle) * 160, owner);
    }
  }

  spawnAreaFrom(source, profile, targetX, targetY, owner) {
    const radius = profile.radius || 90;
    const packet = this.createPacket(profile, owner);
    this.entityManager.spawnEffect({ kind: 'ring', x: targetX, y: targetY, radius, color: profile.color, life: 0.35, width: 3 });
    this.entityManager.spawnBurst(targetX, targetY, profile.color, 18, 150);
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active) continue;
      if (owner === 'player' && Math.hypot(enemy.x - targetX, enemy.y - targetY) <= radius) {
        this.dealDamage(enemy, packet);
      }
      if (owner === 'chaos' && enemy !== source && enemy.faction !== 'rogue' && Math.hypot(enemy.x - targetX, enemy.y - targetY) <= radius) {
        this.dealDamage(enemy, packet);
      }
    }
    if (owner !== 'player') {
      const player = this.entityManager.player;
      if (Math.hypot(player.x - targetX, player.y - targetY) <= radius) {
        this.gameState.damagePlayer(packet.baseDamage * 0.65);
      }
    }
  }

  performDashFrom(source, profile, targetX, targetY, owner) {
    const angle = Math.atan2(targetY - source.y, targetX - source.x);
    const distance = profile.dashDistance || 160;
    const startX = source.x;
    const startY = source.y;
    source.x += Math.cos(angle) * distance;
    source.y += Math.sin(angle) * distance;
    this.entityManager.clampEntity(source);
    this.entityManager.spawnEffect({ kind: 'trail', x1: startX, y1: startY, x2: source.x, y2: source.y, color: profile.color, life: 0.2, width: 3 });
    const packet = this.createPacket(profile, owner);
    if (packet.baseDamage <= 0) return;
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active || (owner === 'chaos' && enemy === source)) continue;
      const distanceToLine = this.distanceToSegment(enemy.x, enemy.y, startX, startY, source.x, source.y);
      if (owner === 'player' && distanceToLine <= enemy.radius + 12) this.dealDamage(enemy, packet);
      if (owner === 'chaos' && enemy.faction !== 'rogue' && distanceToLine <= enemy.radius + 12) this.dealDamage(enemy, packet);
    }
  }

  performTeleportFrom(source, profile, targetX, targetY, owner) {
    const oldX = source.x;
    const oldY = source.y;
    this.performDashFrom(source, { ...profile, damage: 0 }, targetX, targetY, owner);
    this.entityManager.spawnBurst(oldX, oldY, profile.color, 10, 80);
    this.spawnAreaFrom(source, { ...profile, radius: 56, damage: profile.damage * 0.7 }, source.x, source.y, owner);
  }

  spawnSummonFrom(source, profile, owner) {
    const packet = this.createPacket(profile, owner);
    this.entityManager.spawnSummon({
      owner,
      origin: source,
      kind: 'drone',
      x: source.x,
      y: source.y,
      radius: profile.radius || 12,
      orbitRadius: 82,
      life: profile.duration || 8,
      color: profile.color,
      damage: packet.baseDamage,
      statuses: packet.statuses,
      attackInterval: 0.45,
      elementIds: packet.elementIds
    });
  }

  spawnAuraFrom(source, profile, owner) {
    const packet = this.createPacket(profile, owner);
    this.entityManager.spawnSummon({
      owner,
      origin: source,
      kind: 'aura',
      x: source.x,
      y: source.y,
      radius: profile.radius || 14,
      orbitRadius: 68,
      life: profile.duration || 7,
      color: profile.color,
      damage: packet.baseDamage,
      statuses: packet.statuses,
      attackInterval: 0.4,
      elementIds: packet.elementIds
    });
  }

  fireLaserFrom(source, profile, targetX, targetY, owner) {
    const angle = Math.atan2(targetY - source.y, targetX - source.x);
    const range = profile.range || 320;
    const endX = source.x + Math.cos(angle) * range;
    const endY = source.y + Math.sin(angle) * range;
    const packet = this.createPacket(profile, owner);
    this.entityManager.spawnEffect({ kind: 'beam', x1: source.x, y1: source.y, x2: endX, y2: endY, color: profile.color, life: 0.18, width: 4 + (profile.size || 1) * 1.8 });
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active || (owner === 'chaos' && enemy === source)) continue;
      const distance = this.distanceToSegment(enemy.x, enemy.y, source.x, source.y, endX, endY);
      if (owner === 'player' && distance <= enemy.radius + 8) this.dealDamage(enemy, packet);
      if (owner === 'chaos' && enemy.faction !== 'rogue' && distance <= enemy.radius + 8) this.dealDamage(enemy, packet);
    }
    if (owner !== 'player') {
      const player = this.entityManager.player;
      if (this.distanceToSegment(player.x, player.y, source.x, source.y, endX, endY) <= player.radius + 8) {
        this.gameState.damagePlayer(packet.baseDamage * 0.8);
      }
    }
  }

  createPacket(profile, owner) {
    const critChance = 0.06 + (profile.buildModifiers.critChance || 0) + (profile.runModifiers.critChance || 0) + (profile.metaModifiers.critChance || 0);
    const packet = {
      owner,
      baseDamage: this.getFinalDamage(profile),
      color: profile.color,
      elementIds: [profile.elementId],
      statuses: [...(profile.statuses || []), ...(profile.reaction?.extraStatus ? [profile.reaction.extraStatus] : [])],
      critChance,
      critDamage: 0.72 + (profile.buildModifiers.critDamage || 0) + (profile.runModifiers.critDamage || 0),
      pierce: profile.type === 'laser' ? 99 : 0,
      bounce: profile.elementId === 'electricity' ? 1 : 0,
      lifeSteal: profile.buildModifiers.lifeSteal || 0
    };
    if (profile.owner === 'player') {
      this.applyInfusions(packet);
    }
    return packet;
  }

  applyInfusions(packet) {
    const infusions = this.gameState.getCombatInfusions ? this.gameState.getCombatInfusions() : [];
    if (!infusions.length) return;
    for (const infusion of infusions) {
      const effect = this.data.alchemyEffects?.[infusion.elementId];
      if (!effect) continue;
      packet.baseDamage += effect.bonusDamage || 0;
      if (effect.status) packet.statuses.push(effect.status);
      if (effect.chainCount) packet.chainCount = Math.max(packet.chainCount || 0, effect.chainCount);
      if (effect.pierce) packet.pierce = Math.max(packet.pierce || 0, effect.pierce);
      if (effect.critChance) packet.critChance += effect.critChance;
      if (effect.lifeSteal) packet.lifeSteal += effect.lifeSteal;
      if (!packet.elementIds.includes(infusion.elementId)) packet.elementIds.push(infusion.elementId);
    }
    if (infusions.length >= 2) {
      const pair = [infusions[infusions.length - 1].elementId, infusions[infusions.length - 2].elementId].sort().join(':');
      const combo = (this.data.alchemyCombos || []).find((item) => item.pair.slice().sort().join(':') === pair);
      if (combo) {
        packet.baseDamage += combo.bonusDamage || 0;
        if (combo.status) packet.statuses.push(combo.status);
      }
    }
  }

  fireMachineTurret(machine) {
    if (!machine?.core) return;
    const target = this.findNearestEnemy(machine.x, machine.y);
    if (!target) return;
    const element = this.data.elements[machine.core.elementId];
    const rarityScale = machine.core.rarity === 'legendary' ? 1.8 : machine.core.rarity === 'rare' ? 1.35 : 1;
    const angle = Math.atan2(target.y - machine.y, target.x - machine.x);
    const effect = this.data.alchemyEffects?.[machine.core.elementId] || {};
    this.entityManager.spawnProjectile({
      owner: 'player',
      sourceEntity: machine,
      x: machine.x,
      y: machine.y,
      vx: Math.cos(angle) * 520,
      vy: Math.sin(angle) * 520,
      radius: 4,
      life: 1.8,
      damage: (12 + (effect.bonusDamage || 0)) * rarityScale,
      color: element.color,
      elementIds: [machine.core.elementId],
      statuses: effect.status ? [effect.status] : [],
      critChance: 0.08,
      critDamage: 0.45,
      pierce: effect.pierce || 0,
      bounce: effect.chainCount ? 1 : 0,
      growth: 0,
      aoeRadius: 0,
      chainCount: effect.chainCount || 0,
      lifeSteal: 0
    });
    this.entityManager.spawnBurst(machine.x, machine.y, element.color, 6, 70);
  }

  triggerSummon(summon) {
    const target = this.findNearestTarget(summon.x, summon.y, summon.owner === 'player' ? 'enemy' : summon.owner === 'chaos' ? 'mixed' : 'player', summon.origin);
    if (!target) return;
    if (summon.kind === 'aura') {
      const packet = { owner: summon.owner, baseDamage: summon.damage, color: summon.color, elementIds: summon.elementIds, statuses: summon.statuses, critChance: 0.04, critDamage: 0.4, lifeSteal: 0 };
      if (summon.owner === 'player' || summon.owner === 'chaos') {
        for (const enemy of this.entityManager.enemies) {
          if (!enemy.active || (summon.owner === 'chaos' && enemy === summon.origin) || (summon.owner === 'chaos' && enemy.faction === 'rogue')) continue;
          if (Math.hypot(enemy.x - summon.x, enemy.y - summon.y) <= summon.radius + 62) this.dealDamage(enemy, packet);
        }
      }
      if (summon.owner !== 'player') {
        if (Math.hypot(this.entityManager.player.x - summon.x, this.entityManager.player.y - summon.y) <= summon.radius + 62) {
          this.gameState.damagePlayer(summon.damage * 0.5);
        }
      }
      this.entityManager.spawnBurst(summon.x, summon.y, summon.color, 8, 80);
      return;
    }
    const angle = Math.atan2(target.y - summon.y, target.x - summon.x);
    this.entityManager.spawnProjectile({ owner: summon.owner, sourceEntity: summon.origin, x: summon.x, y: summon.y, vx: Math.cos(angle) * 420, vy: Math.sin(angle) * 420, radius: 5, life: 1.4, damage: summon.damage, color: summon.color, elementIds: summon.elementIds, statuses: summon.statuses, critChance: 0.03, critDamage: 0.4, pierce: 0, bounce: 0, growth: 0, aoeRadius: 0, chainCount: 0, lifeSteal: 0 });
  }

  resolvePlayerProjectile(projectile) {
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active || projectile.hitTargets.includes(enemy)) continue;
      if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) > projectile.radius + enemy.radius) continue;
      projectile.hitTargets.push(enemy);
      this.dealDamage(enemy, { ...projectile, owner: 'player', baseDamage: projectile.damage });
      this.afterProjectileHit(projectile, enemy);
      return;
    }
    this.hitSpawner(projectile);
  }

  resolveEnemyProjectile(projectile) {
    const player = this.entityManager.player;
    if (Math.hypot(projectile.x - player.x, projectile.y - player.y) <= projectile.radius + player.radius) {
      this.gameState.damagePlayer(projectile.damage);
      this.entityManager.spawnBurst(player.x, player.y, '#ff6e6e', 12, 160);
      projectile.active = false;
    }
  }

  resolveChaosProjectile(projectile) {
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active || enemy === projectile.sourceEntity || enemy.faction === 'rogue' || projectile.hitTargets.includes(enemy)) continue;
      if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) > projectile.radius + enemy.radius) continue;
      projectile.hitTargets.push(enemy);
      this.dealDamage(enemy, { ...projectile, owner: 'chaos', baseDamage: projectile.damage });
      this.afterProjectileHit(projectile, enemy);
      return;
    }
    const player = this.entityManager.player;
    if (Math.hypot(projectile.x - player.x, projectile.y - player.y) <= projectile.radius + player.radius) {
      this.gameState.damagePlayer(projectile.damage * 0.85);
      this.entityManager.spawnBurst(player.x, player.y, projectile.color, 8, 90);
      projectile.active = false;
    }
  }

  afterProjectileHit(projectile, target) {
    if (projectile.aoeRadius > 0) {
      this.entityManager.spawnBurst(projectile.x, projectile.y, projectile.color, 12, 110);
      for (const splash of this.entityManager.enemies) {
        if (!splash.active || splash === target) continue;
        if (Math.hypot(projectile.x - splash.x, projectile.y - splash.y) <= projectile.aoeRadius) {
          this.dealDamage(splash, { ...projectile, baseDamage: projectile.damage * 0.55, owner: projectile.owner });
        }
      }
    }
    if (projectile.chainCount > 0) this.chainDamage(target, projectile, projectile.chainCount);
    if (projectile.pierce > 0) projectile.pierce -= 1;
    else if (projectile.bounce > 0) {
      projectile.bounce -= 1;
      projectile.vx *= -0.8;
      projectile.vy *= -0.8;
    } else projectile.active = false;
  }

  hitSpawner(projectile) {
    for (const spawner of this.entityManager.spawners) {
      if (!spawner.active) continue;
      if (Math.hypot(projectile.x - spawner.x, projectile.y - spawner.y) > projectile.radius + spawner.radius) continue;
      spawner.hp -= projectile.damage * 0.85;
      spawner.hitFlash = 1;
      this.entityManager.spawnBurst(spawner.x, spawner.y, '#ff9bb2', 10, 140);
      if (spawner.hp <= 0) {
        spawner.active = false;
        this.gameState.addXp(45);
        const orbRarity = Math.random() < 0.08 ? 'legendary' : Math.random() < 0.32 ? 'rare' : 'common';
        const orbElementPool = Object.keys(this.data.elements);
        const orbElement = orbElementPool[Math.floor(Math.random() * orbElementPool.length)];
        this.entityManager.spawnOrbPickup(spawner.x, spawner.y, orbElement, orbRarity);
        this.gameState.addMaterial('metal', 2);
        this.gameState.notify('Spawner destroyed', '#ff9bb2', 1.4);
      }
      projectile.active = false;
      return true;
    }
    return false;
  }

  chainDamage(origin, projectile, count) {
    let source = origin;
    for (let chain = 0; chain < count; chain += 1) {
      const target = this.findNearestEnemy(source.x, source.y, source);
      if (!target) return;
      this.entityManager.spawnBurst(target.x, target.y, projectile.color, 6, 60);
      this.dealDamage(target, { ...projectile, baseDamage: projectile.damage * 0.55, owner: projectile.owner });
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

  findNearestTarget(x, y, mode, exclude = null) {
    if (mode === 'player') return this.entityManager.player;
    if (mode === 'enemy') return this.findNearestEnemy(x, y, exclude);
    let best = { ...this.entityManager.player, kind: 'player', distance: Math.hypot(this.entityManager.player.x - x, this.entityManager.player.y - y) };
    for (const enemy of this.entityManager.enemies) {
      if (!enemy.active || enemy === exclude || enemy.faction === 'rogue') continue;
      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance < best.distance) best = { ...enemy, kind: 'enemy', distance };
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
        status.tick = 0.45;
        if (statusId === 'burn' || statusId === 'ash') target.hp -= status.power * 1.1;
        if (statusId === 'shock' || statusId === 'arcane') target.hp -= status.power * 0.95;
        if (statusId === 'gloom' || statusId === 'haunt') target.hp -= status.power * 0.75;
        if (statusId === 'radiance') target.hp -= status.power * 0.65;
        if (statusId === 'fracture') target.hp -= status.power * 0.85;
      }
      if (status.time <= 0) delete target.statuses[statusId];
    }
  }

  dealDamage(target, packet) {
    const critChance = packet.critChance || 0.08;
    const critDamage = packet.critDamage || 0.75;
    const isCrit = Math.random() < critChance;
    let damage = packet.baseDamage || packet.damage || 0;
    for (const elementId of packet.elementIds || []) {
      damage *= 1 + (target.weaknesses?.[elementId] || 0);
      damage *= 1 - (target.resistances?.[elementId] || 0);
    }
    if (target.statuses?.soak && (packet.elementIds || []).includes('electricity')) damage *= 1.18;
    if (target.statuses?.root) damage *= 1.08;
    if (isCrit) damage *= 1.75 + critDamage;
    target.hp -= damage;
    target.hitFlash = 1;
    this.entityManager.spawnDamageText(target.x, target.y - target.radius, `${Math.round(damage)}${isCrit ? '!' : ''}`, isCrit ? '#fff08d' : '#ffffff');
    this.entityManager.spawnBurst(target.x, target.y, packet.color || '#ffffff', 7, 100);
    for (const status of packet.statuses || []) this.applyStatus(target, status);
    if (packet.owner === 'player' && packet.lifeSteal) {
      this.gameState.playerStats.hp = Math.min(this.gameState.playerStats.maxHp, this.gameState.playerStats.hp + damage * packet.lifeSteal * 0.06);
    }
  }

  applyStatus(target, status) {
    target.statuses[status.id] = { time: status.duration, power: status.power, tick: 0.3 };
  }

  distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
  }
}