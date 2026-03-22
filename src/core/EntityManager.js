import { ObjectPool } from './ObjectPool.js';

function resetEnemy(enemy) {
  enemy.active = false;
  enemy.statuses = {};
  enemy.hitFlash = 0;
}

function resetProjectile(projectile) {
  projectile.active = false;
  projectile.hitTargets = [];
}

function resetParticle(particle) {
  particle.active = false;
}

function resetText(text) {
  text.active = false;
}

function resetSummon(summon) {
  summon.active = false;
}

function resetEffect(effect) {
  effect.active = false;
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const safe = value.length === 3 ? value.split('').map((item) => item + item).join('') : value;
  const int = parseInt(safe, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mixColors(colors, weights) {
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  const mixed = { r: 0, g: 0, b: 0 };
  colors.forEach((color, index) => {
    const rgb = hexToRgb(color);
    const weight = weights[index] / total;
    mixed.r += rgb.r * weight;
    mixed.g += rgb.g * weight;
    mixed.b += rgb.b * weight;
  });
  return rgbToHex(mixed);
}

export class EntityManager {
  constructor(data, gameState) {
    this.data = data;
    this.gameState = gameState;
    this.viewport = { width: window.innerWidth, height: window.innerHeight };
    this.player = this.createPlayer();
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.damageTexts = [];
    this.summons = [];
    this.effects = [];
    this.spawners = [];
    this.orbs = [];
    this.machineStructures = [];

    this.enemyPool = new ObjectPool(() => ({ active: false, statuses: {}, hitFlash: 0 }), resetEnemy);
    this.projectilePool = new ObjectPool(() => ({ active: false, hitTargets: [] }), resetProjectile);
    this.particlePool = new ObjectPool(() => ({ active: false }), resetParticle);
    this.textPool = new ObjectPool(() => ({ active: false }), resetText);
    this.summonPool = new ObjectPool(() => ({ active: false }), resetSummon);
    this.effectPool = new ObjectPool(() => ({ active: false }), resetEffect);

    this.resetWorld();
  }

  createPlayer() {
    return {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      radius: 16,
      speed: 280,
      visuals: {
        arms: true,
        legs: true,
        color: '#ff8c42',
        accentColor: '#ffffff',
        aura: 0,
        distortion: 0,
        mainElements: []
      }
    };
  }

  resetWorld() {
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.particles.length = 0;
    this.damageTexts.length = 0;
    this.summons.length = 0;
    this.effects.length = 0;
    this.spawners.length = 0;
    this.orbs.length = 0;
    this.machineStructures.length = 0;
    this.player.x = this.viewport.width * 0.5;
    this.player.y = this.viewport.height * 0.5;
    for (const def of this.data.spawners) {
      this.spawners.push(this.createSpawner(def));
    }
    for (const def of this.data.machineStructures || []) {
      this.machineStructures.push(this.createMachineStructure(def));
    }
  }

  resize(width, height) {
    this.viewport.width = width;
    this.viewport.height = height;
    this.clampEntity(this.player);
  }

  clampEntity(entity) {
    entity.x = Math.max(entity.radius || 0, Math.min(this.viewport.width - (entity.radius || 0), entity.x));
    entity.y = Math.max(entity.radius || 0, Math.min(this.viewport.height - (entity.radius || 0), entity.y));
  }

  createSpawner(def) {
    return { id: def.id, def, x: 0, y: 0, radius: 24, hp: def.hp, maxHp: def.hp, timer: 0, active: true, hitFlash: 0 };
  }

  createMachineStructure(def) {
    return {
      id: def.id,
      name: def.name,
      machineType: def.machineType,
      xRatio: def.xRatio,
      yRatio: def.yRatio,
      x: this.viewport.width * def.xRatio,
      y: this.viewport.height * def.yRatio,
      radius: 20,
      core: null,
      timer: 0,
      pulse: 0
    };
  }

  rollOrbRarity(multiplier = 1) {
    const rarities = Object.values(this.data.orbRarities);
    const roll = Math.random();
    let threshold = 0;
    for (const rarity of rarities) {
      threshold += Math.min(0.9, rarity.dropChance * multiplier);
      if (roll <= threshold) return rarity.id;
    }
    return 'common';
  }

  spawnOrbPickup(x, y, elementId, rarity = 'common') {
    const rarityDef = this.data.orbRarities[rarity];
    const orbDef = this.data.orbDefinitions[elementId];
    if (!rarityDef || !orbDef) return;
    this.orbs.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 90,
      vy: (Math.random() - 0.5) * 90,
      radius: rarity === 'legendary' ? 12 : rarity === 'rare' ? 10 : 8,
      age: 0,
      life: 22,
      rarity,
      elementId,
      instability: (orbDef.instabilityBase || 0) + (rarityDef.instability || 0),
      phase: Math.random() * Math.PI * 2
    });
  }

  dropLootFromEnemy(enemy) {
    const rarityMultiplier = enemy.typeId === 'boss' ? 3 : enemy.typeId === 'elementalist' ? 1.8 : 1;
    if (Math.random() < Math.min(0.95, 0.22 * rarityMultiplier)) {
      const elementId = enemy.elementId || 'fire';
      const rarity = this.rollOrbRarity(rarityMultiplier);
      this.spawnOrbPickup(enemy.x, enemy.y, elementId, rarity);
    }
    const materialPool = ['wood', 'stone', 'metal', 'crystal'];
    const material = materialPool[Math.floor(Math.random() * materialPool.length)];
    const materialGain = enemy.typeId === 'boss' ? 3 : 1;
    this.gameState.addMaterial(material, materialGain);
  }

  socketMachineCore(machineId, elementId, rarity = 'common') {
    const machine = this.machineStructures.find((item) => item.id === machineId);
    if (!machine) return false;
    if (!this.gameState.spendOrb(elementId, rarity, 1)) return false;
    machine.core = { elementId, rarity };
    machine.pulse = 1;
    this.gameState.notify(`${machine.name} core: ${this.data.elements[elementId].name}`, this.data.elements[elementId].color, 1.4);
    return true;
  }

  updateSpawnerPosition(spawner) {
    const { width, height } = this.viewport;
    if (spawner.def.mode !== 'edge') return;
    if (spawner.def.edge === 'left') {
      spawner.x = 24;
      spawner.y = height * spawner.def.offset;
    }
    if (spawner.def.edge === 'right') {
      spawner.x = width - 24;
      spawner.y = height * spawner.def.offset;
    }
    if (spawner.def.edge === 'top') {
      spawner.x = width * spawner.def.offset;
      spawner.y = 24;
    }
    if (spawner.def.edge === 'bottom') {
      spawner.x = width * spawner.def.offset;
      spawner.y = height - 24;
    }
  }

  getEnemyLoadout(elementId) {
    return this.data.abilities.filter((ability) => ability.elementId === elementId && ability.type !== 'buff').slice(0, 4).map((ability) => ability.id);
  }

  acquireEnemy(typeId, x, y) {
    const archetype = this.data.enemyTypes[typeId];
    const enemy = this.enemyPool.acquire();
    const randomElementId = archetype.dynamicElement ? Object.keys(this.data.elements)[Math.floor(Math.random() * Object.keys(this.data.elements).length)] : archetype.elementId;
    const element = this.data.elements[randomElementId];
    Object.assign(enemy, {
      active: true,
      typeId,
      role: archetype.role,
      x,
      y,
      hp: archetype.hp,
      maxHp: archetype.hp,
      radius: archetype.radius,
      speed: archetype.speed,
      damage: archetype.damage,
      xp: archetype.xp,
      color: archetype.dynamicElement ? element.color : archetype.color,
      accentColor: element.accent,
      elementId: randomElementId,
      resistances: { [randomElementId]: 0.16 },
      weaknesses: { puremana: 0.1 },
      projectileCooldown: archetype.projectileCooldown || 0,
      aiTimer: 0,
      phase: 1,
      hitFlash: 0,
      statuses: {},
      faction: archetype.role === 'elementalist' ? 'rogue' : 'swarm',
      loadout: archetype.role === 'elementalist' || archetype.role === 'boss' ? this.getEnemyLoadout(randomElementId) : this.getEnemyLoadout(randomElementId).slice(0, 2),
      castIndex: 0
    });
    this.enemies.push(enemy);
    return enemy;
  }

  spawnEnemy(typeId, x, y) {
    return this.acquireEnemy(typeId, x, y);
  }

  spawnProjectile(config) {
    const projectile = this.projectilePool.acquire();
    Object.assign(projectile, {
      active: true,
      x: config.x,
      y: config.y,
      vx: config.vx,
      vy: config.vy,
      radius: config.radius,
      life: config.life,
      owner: config.owner,
      sourceEntity: config.sourceEntity || null,
      damage: config.damage,
      color: config.color,
      elementIds: config.elementIds || [],
      statuses: config.statuses || [],
      critChance: config.critChance || 0,
      critDamage: config.critDamage || 0.75,
      pierce: config.pierce || 0,
      bounce: config.bounce || 0,
      growth: config.growth || 0,
      aoeRadius: config.aoeRadius || 0,
      chainCount: config.chainCount || 0,
      hitTargets: [],
      lifeSteal: config.lifeSteal || 0
    });
    this.projectiles.push(projectile);
    return projectile;
  }

  spawnParticle(config) {
    const particle = this.particlePool.acquire();
    Object.assign(particle, { active: true, x: config.x, y: config.y, vx: config.vx, vy: config.vy, radius: config.radius, life: config.life, age: 0, color: config.color, glow: config.glow || false });
    this.particles.push(particle);
  }

  spawnBurst(x, y, color, count, spread = 260) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * spread;
      this.spawnParticle({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 2 + Math.random() * 3, life: 0.25 + Math.random() * 0.5, color, glow: true });
    }
  }

  spawnDamageText(x, y, value, color = '#ffffff') {
    const text = this.textPool.acquire();
    Object.assign(text, { active: true, x, y, value, color, age: 0, life: 0.7, vy: -34 });
    this.damageTexts.push(text);
  }

  spawnSummon(config) {
    const summon = this.summonPool.acquire();
    Object.assign(summon, { active: true, kind: config.kind, x: config.x, y: config.y, radius: config.radius, angle: 0, orbitRadius: config.orbitRadius || 60, life: config.life, age: 0, color: config.color, damage: config.damage, statuses: config.statuses || [], attackTimer: 0, attackInterval: config.attackInterval || 0.45, owner: config.owner, origin: config.origin || this.player, elementIds: config.elementIds || [] });
    this.summons.push(summon);
    return summon;
  }

  spawnEffect(config) {
    const effect = this.effectPool.acquire();
    Object.assign(effect, { active: true, age: 0, ...config });
    this.effects.push(effect);
    return effect;
  }

  syncPlayerVisuals() {
    const build = this.gameState.buildState;
    const energy = this.gameState.visualState.elementEnergy;
    const affinityTop = Object.entries(this.gameState.affinity || {}).sort((left, right) => right[1] - left[1])[0];
    const affinityElement = affinityTop && affinityTop[1] > 0 ? affinityTop[0] : null;
    const dominantElements = build?.dominantElements?.length ? build.dominantElements : ['fire'];
    if (affinityElement && !dominantElements.includes(affinityElement)) dominantElements.unshift(affinityElement);
    const colors = dominantElements.map((elementId) => this.data.elements[elementId].color);
    const weights = dominantElements.map((elementId) => (build.elementCounts[elementId] || 1) + (energy[elementId] || 0) * 4);
    this.player.visuals.color = mixColors(colors, weights);
    this.player.visuals.accentColor = this.data.elements[dominantElements[1] || dominantElements[0]].accent;
    const affinityAura = affinityTop ? Math.min(0.35, affinityTop[1] * 0.008) : 0;
    this.player.visuals.aura = Math.min(1, (build?.activeSetBonuses?.length ? 0.45 : 0.16) + (this.gameState.getPlayerModifiers().aura || 0) + affinityAura + this.gameState.visualState.auraPulse * 0.4);
    this.player.visuals.distortion = this.gameState.visualState.distortion + (affinityTop ? Math.min(0.24, affinityTop[1] * 0.003) : 0);
    this.player.visuals.mainElements = dominantElements;
  }

  updatePlayer(dt, input) {
    this.syncPlayerVisuals();
    let moveX = 0;
    let moveY = 0;
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;
    const length = Math.hypot(moveX, moveY) || 1;
    const moveSpeed = this.player.speed * (1 + (this.gameState.getPlayerModifiers().moveSpeed || 0));
    this.player.x += (moveX / length) * moveSpeed * dt;
    this.player.y += (moveY / length) * moveSpeed * dt;
    this.clampEntity(this.player);
  }

  updateSpawners(dt) {
    const elapsed = this.gameState.time;
    for (const spawner of this.spawners) {
      if (!spawner.active) continue;
      this.updateSpawnerPosition(spawner);
      spawner.hitFlash = Math.max(0, spawner.hitFlash - dt * 5);
      spawner.timer += dt;
      const cadence = Math.max(1, spawner.def.interval - Math.min(1.2, elapsed * 0.01));
      if (spawner.timer < cadence) continue;
      spawner.timer = 0;
      const early = ['emberling', 'tidewisp', 'galeclaw', 'voltshard'];
      const mid = [...early, 'shardmaw', 'shadefang', 'revenant'];
      const late = [...mid, 'manadrone', 'elementalist', 'prismling'];
      const pool = elapsed > 65 ? late : elapsed > 26 ? mid : early;
      const typeId = pool[Math.floor(Math.random() * pool.length)];
      const angle = Math.random() * Math.PI * 2;
      this.spawnEnemy(typeId, spawner.x + Math.cos(angle) * 18, spawner.y + Math.sin(angle) * 18);
      this.spawnBurst(spawner.x, spawner.y, '#9b6cff', 6, 100);
    }

    if (!this.gameState.bossSpawned && elapsed > 110) {
      this.gameState.bossSpawned = true;
      this.spawnEnemy('boss', this.viewport.width * 0.5, 92);
      this.gameState.notify('Boss incoming: Singularity Warden', '#ff6c8a', 2.6);
    }
  }

  updateOrbs(dt) {
    for (let index = this.orbs.length - 1; index >= 0; index -= 1) {
      const orb = this.orbs[index];
      orb.age += dt;
      orb.phase += dt * (2.5 + orb.instability * 4);
      if (orb.age >= orb.life) {
        this.orbs.splice(index, 1);
        continue;
      }
      const toPlayerX = this.player.x - orb.x;
      const toPlayerY = this.player.y - orb.y;
      const distance = Math.hypot(toPlayerX, toPlayerY) || 1;
      if (distance < 170) {
        const pull = 110 + (170 - distance) * 2.4;
        orb.vx += (toPlayerX / distance) * pull * dt;
        orb.vy += (toPlayerY / distance) * pull * dt;
      }
      orb.vx *= 0.96;
      orb.vy *= 0.96;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (distance <= orb.radius + this.player.radius + 2) {
        this.gameState.addOrb(orb.elementId, orb.rarity, 1);
        this.gameState.notify(`Picked ${this.data.elements[orb.elementId].name} orb (${orb.rarity})`, this.data.elements[orb.elementId].color, 1.1);
        this.spawnBurst(orb.x, orb.y, this.data.elements[orb.elementId].color, orb.rarity === 'legendary' ? 18 : 10, 120);
        this.orbs.splice(index, 1);
        continue;
      }
      if (Math.random() < 0.18 + orb.instability) {
        const wobble = Math.sin(orb.phase) * 22;
        this.spawnParticle({
          x: orb.x + Math.cos(orb.phase) * (orb.radius + 2),
          y: orb.y + Math.sin(orb.phase) * (orb.radius + 2),
          vx: (Math.random() - 0.5) * 18 + wobble,
          vy: (Math.random() - 0.5) * 18 - wobble,
          radius: 1 + Math.random() * 1.4,
          life: 0.24 + Math.random() * 0.24,
          color: this.data.elements[orb.elementId].color,
          glow: true
        });
      }
    }
  }

  updateMachines(dt, combatSystem) {
    for (const machine of this.machineStructures) {
      machine.x = this.viewport.width * machine.xRatio;
      machine.y = this.viewport.height * machine.yRatio;
      machine.pulse = Math.max(0, machine.pulse - dt * 1.6);
      if (!machine.core) continue;
      machine.timer += dt;
      const cadence = machine.machineType === 'turret' ? 1.1 : 2.8;
      if (machine.timer < cadence) continue;
      machine.timer = 0;
      if (machine.machineType === 'turret') {
        combatSystem.fireMachineTurret(machine);
      } else if (machine.machineType === 'generator') {
        const rarityScale = machine.core.rarity === 'legendary' ? 3 : machine.core.rarity === 'rare' ? 2 : 1;
        this.gameState.refundResource('mp', 3 * rarityScale);
        this.spawnBurst(machine.x, machine.y, this.data.elements[machine.core.elementId].color, 9, 80);
      }
      machine.pulse = 1;
    }
  }

  getEnemyTarget(enemy) {
    if (enemy.faction === 'rogue') {
      let bestTarget = this.player;
      let bestDistance = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      for (const other of this.enemies) {
        if (!other.active || other === enemy || other.faction === 'rogue') continue;
        const distance = Math.hypot(other.x - enemy.x, other.y - enemy.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTarget = other;
        }
      }
      return bestTarget;
    }
    return this.player;
  }

  updateEnemies(dt, combatSystem) {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (!enemy.active) {
        this.enemies.splice(index, 1);
        this.enemyPool.release(enemy);
        continue;
      }

      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 6);
      enemy.aiTimer += dt;
      combatSystem.tickStatuses(enemy, dt);
      if (enemy.hp <= 0) {
        this.gameState.addXp(enemy.xp);
        this.gameState.recordKill(enemy.typeId);
        this.dropLootFromEnemy(enemy);
        this.spawnBurst(enemy.x, enemy.y, '#77ffb8', enemy.typeId === 'boss' ? 30 : 14, 320);
        this.enemies.splice(index, 1);
        this.enemyPool.release(enemy);
        continue;
      }

      const target = this.getEnemyTarget(enemy);
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      const statusSlow = enemy.statuses.root ? 0.45 : enemy.statuses.slow ? 0.72 : enemy.statuses.gloom ? 0.88 : 1;
      const speed = enemy.speed * statusSlow;

      if (enemy.role === 'rusher' || enemy.role === 'tank' || enemy.role === 'ambush') {
        const dashScale = enemy.role === 'ambush' ? 1.35 : enemy.role === 'tank' ? 0.72 : 1;
        enemy.x += (dx / distance) * speed * dashScale * dt;
        enemy.y += (dy / distance) * speed * dashScale * dt;
      } else if (enemy.role === 'dart') {
        enemy.x += (dx / distance) * speed * 1.15 * dt;
        enemy.y += (dy / distance) * speed * 1.15 * dt;
        enemy.x += Math.cos(enemy.aiTimer * 7) * 28 * dt;
        enemy.y += Math.sin(enemy.aiTimer * 7) * 28 * dt;
      } else if (enemy.role === 'kite' || enemy.role === 'caster' || enemy.role === 'support' || enemy.role === 'elementalist') {
        const desired = enemy.role === 'support' ? 240 : 210;
        const direction = distance < desired ? -1 : 1;
        enemy.x += (dx / distance) * speed * 0.72 * direction * dt;
        enemy.y += (dy / distance) * speed * 0.72 * direction * dt;
        enemy.x += Math.cos(enemy.aiTimer * 2.6) * 18 * dt;
        enemy.y += Math.sin(enemy.aiTimer * 2.6) * 18 * dt;
      } else if (enemy.role === 'phase') {
        enemy.x += (dx / distance) * speed * 0.92 * dt;
        enemy.y += (dy / distance) * speed * 0.92 * dt;
        if (enemy.aiTimer > 3.2) {
          enemy.aiTimer = 0;
          enemy.x += Math.cos(Math.random() * Math.PI * 2) * 120;
          enemy.y += Math.sin(Math.random() * Math.PI * 2) * 120;
          this.clampEntity(enemy);
          this.spawnBurst(enemy.x, enemy.y, enemy.color, 8, 60);
        }
      } else if (enemy.role === 'boss') {
        enemy.phase = enemy.hp / enemy.maxHp > 0.66 ? 1 : enemy.hp / enemy.maxHp > 0.33 ? 2 : 3;
        enemy.x += (dx / distance) * speed * (enemy.phase === 3 ? 1.1 : 0.75) * dt;
        enemy.y += (dy / distance) * speed * (enemy.phase === 3 ? 1.1 : 0.75) * dt;
      }

      this.clampEntity(enemy);
      if (enemy.role !== 'rusher' && enemy.role !== 'tank' && enemy.role !== 'ambush' && enemy.role !== 'dart') {
        enemy.projectileCooldown -= dt;
        const cooldownFloor = enemy.role === 'boss' ? 1.1 : enemy.typeId === 'elementalist' ? 1.45 : 2;
        if (enemy.projectileCooldown <= 0) {
          enemy.projectileCooldown = cooldownFloor;
          combatSystem.castEnemyAbility(enemy, target);
        }
      }

      if (target === this.player && distance < this.player.radius + enemy.radius + 2) {
        this.gameState.damagePlayer(enemy.damage * dt * 2.2);
      }
    }
  }

  updateProjectiles(dt, combatSystem) {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      if (!projectile.active) {
        this.projectiles.splice(index, 1);
        this.projectilePool.release(projectile);
        continue;
      }
      projectile.life -= dt;
      projectile.radius += projectile.growth * dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (projectile.life <= 0) projectile.active = false;
      if (!projectile.active) continue;
      if (projectile.owner === 'player') combatSystem.resolvePlayerProjectile(projectile);
      if (projectile.owner === 'enemy') combatSystem.resolveEnemyProjectile(projectile);
      if (projectile.owner === 'chaos') combatSystem.resolveChaosProjectile(projectile);
      if (projectile.x < -120 || projectile.y < -120 || projectile.x > this.viewport.width + 120 || projectile.y > this.viewport.height + 120) projectile.active = false;
    }
  }

  updateSummons(dt, combatSystem) {
    for (let index = this.summons.length - 1; index >= 0; index -= 1) {
      const summon = this.summons[index];
      if (!summon.active) {
        this.summons.splice(index, 1);
        this.summonPool.release(summon);
        continue;
      }
      summon.age += dt;
      summon.attackTimer -= dt;
      if (summon.age >= summon.life) {
        summon.active = false;
        continue;
      }
      const anchor = summon.origin && summon.origin.active !== false ? summon.origin : this.player;
      summon.angle += dt * 2.2;
      summon.x = anchor.x + Math.cos(summon.angle) * summon.orbitRadius;
      summon.y = anchor.y + Math.sin(summon.angle) * summon.orbitRadius;
      this.spawnParticle({ x: summon.x, y: summon.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, radius: 1.5, life: 0.35, color: summon.color, glow: false });
      if (summon.attackTimer <= 0) {
        summon.attackTimer = summon.attackInterval;
        combatSystem.triggerSummon(summon);
      }
    }
  }

  updateParticles(dt) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      if (!particle.active) {
        this.particles.splice(index, 1);
        this.particlePool.release(particle);
        continue;
      }
      particle.age += dt;
      if (particle.age >= particle.life) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
  }

  updateEffects(dt) {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      if (!effect.active) {
        this.effects.splice(index, 1);
        this.effectPool.release(effect);
        continue;
      }
      effect.age += dt;
      if (effect.age >= effect.life) effect.active = false;
    }
  }

  updateDamageTexts(dt) {
    for (let index = this.damageTexts.length - 1; index >= 0; index -= 1) {
      const text = this.damageTexts[index];
      if (!text.active) {
        this.damageTexts.splice(index, 1);
        this.textPool.release(text);
        continue;
      }
      text.age += dt;
      if (text.age >= text.life) {
        text.active = false;
        continue;
      }
      text.y += text.vy * dt;
    }
  }

  update(dt, input, combatSystem) {
    this.updatePlayer(dt, input);
    this.updateSpawners(dt);
    this.updateOrbs(dt);
    this.updateMachines(dt, combatSystem);
    this.updateEnemies(dt, combatSystem);
    this.updateProjectiles(dt, combatSystem);
    this.updateSummons(dt, combatSystem);
    this.updateParticles(dt);
    this.updateEffects(dt);
    this.updateDamageTexts(dt);
  }

  drawBackground(ctx) {
    ctx.fillStyle = this.data.map.backgroundColor;
    ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    ctx.fillStyle = this.data.map.accentColor;
    for (let x = 0; x < this.viewport.width; x += this.data.map.gridSize) ctx.fillRect(x, 0, 1, this.viewport.height);
    for (let y = 0; y < this.viewport.height; y += this.data.map.gridSize) ctx.fillRect(0, y, this.viewport.width, 1);
  }

  drawElementGlyph(ctx, elementId, size) {
    ctx.save();
    ctx.strokeStyle = this.data.elements[elementId].accent;
    ctx.fillStyle = this.data.elements[elementId].accent;
    ctx.lineWidth = 2;
    if (elementId === 'fire') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.58, -size * 0.1); ctx.lineTo(size * 0.22, size); ctx.lineTo(-size * 0.54, size * 0.54); ctx.closePath(); ctx.fill();
    } else if (elementId === 'water') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * 0.82, 0, 0, size); ctx.quadraticCurveTo(-size * 0.82, 0, 0, -size); ctx.fill();
    } else if (elementId === 'air') {
      for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(-size, i * 4); ctx.quadraticCurveTo(0, i * 2 - size * 0.4, size, i * 4); ctx.stroke(); }
    } else if (elementId === 'earth') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.86, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.86, 0); ctx.closePath(); ctx.fill();
    } else if (elementId === 'electricity') {
      ctx.beginPath(); ctx.moveTo(-size * 0.5, -size); ctx.lineTo(size * 0.1, -size * 0.18); ctx.lineTo(-size * 0.16, -size * 0.18); ctx.lineTo(size * 0.52, size); ctx.lineTo(-size * 0.08, size * 0.16); ctx.lineTo(size * 0.14, size * 0.16); ctx.closePath(); ctx.fill();
    } else if (elementId === 'light') {
      ctx.beginPath(); ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.stroke();
    } else if (elementId === 'darkness') {
      ctx.beginPath(); ctx.arc(0, 0, size * 0.8, Math.PI * 0.2, Math.PI * 1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(size * 0.25, -size * 0.1, size * 0.38, 0, Math.PI * 2); ctx.fill();
    } else if (elementId === 'ghost') {
      ctx.beginPath(); ctx.arc(0, -size * 0.15, size * 0.62, Math.PI, Math.PI * 2); ctx.lineTo(size * 0.62, size * 0.54); ctx.lineTo(size * 0.18, size * 0.2); ctx.lineTo(-size * 0.18, size * 0.54); ctx.lineTo(-size * 0.62, size * 0.2); ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, size * 0.74, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size * 0.5, -size * 0.5); ctx.lineTo(size * 0.5, size * 0.5); ctx.moveTo(size * 0.5, -size * 0.5); ctx.lineTo(-size * 0.5, size * 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  drawPlayer(ctx) {
    const player = this.player;
    ctx.save();
    if (player.visuals.aura > 0) {
      ctx.globalAlpha = 0.18 + player.visuals.aura * 0.2;
      ctx.fillStyle = player.visuals.color;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 12 + player.visuals.aura * 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.translate(player.x, player.y);
    ctx.rotate(Math.sin(performance.now() * 0.004) * 0.04 * player.visuals.distortion);
    ctx.fillStyle = player.visuals.color;
    ctx.strokeStyle = player.visuals.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const radius = player.radius + Math.sin(angle * 3 + performance.now() * 0.005) * 1.6 * player.visuals.distortion;
      if (index === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (player.visuals.arms) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(-player.radius - 6, 0, 5, 0, Math.PI * 2);
      ctx.arc(player.radius + 6, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (player.visuals.legs) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(-5, player.radius + 5, 4, 0, Math.PI * 2);
      ctx.arc(5, player.radius + 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawElementGlyph(ctx, player.visuals.mainElements[0] || 'fire', 7);
    ctx.restore();
  }

  drawSpawner(ctx, spawner) {
    ctx.save();
    ctx.translate(spawner.x, spawner.y);
    ctx.fillStyle = spawner.active ? `rgba(255, 88, 140, ${0.65 + spawner.hitFlash * 0.2})` : 'rgba(100,100,100,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, spawner.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffbfd0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  drawEnemy(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
    ctx.strokeStyle = enemy.accentColor;
    ctx.lineWidth = enemy.typeId === 'boss' ? 4 : 2;
    if (enemy.role === 'tank') {
      ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
    } else if (enemy.role === 'dart' || enemy.role === 'ambush') {
      ctx.beginPath(); ctx.moveTo(0, -enemy.radius); ctx.lineTo(enemy.radius, enemy.radius); ctx.lineTo(-enemy.radius, enemy.radius); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.stroke();
    this.drawElementGlyph(ctx, enemy.elementId, Math.max(6, enemy.radius * 0.34));
    if (enemy.role === 'elementalist') {
      ctx.beginPath(); ctx.arc(0, 0, enemy.radius + 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  drawProjectile(ctx, projectile) {
    ctx.save();
    ctx.fillStyle = projectile.color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawParticle(ctx, particle) {
    const alpha = 1 - particle.age / particle.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    if (particle.glow) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = particle.color;
    }
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawDamageText(ctx, text) {
    ctx.save();
    ctx.globalAlpha = 1 - text.age / text.life;
    ctx.fillStyle = text.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(text.value, text.x, text.y);
    ctx.restore();
  }

  drawEffect(ctx, effect) {
    const alpha = 1 - effect.age / effect.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;
    ctx.lineWidth = effect.width || 3;
    if (effect.kind === 'beam' || effect.kind === 'trail') {
      ctx.beginPath(); ctx.moveTo(effect.x1, effect.y1); ctx.lineTo(effect.x2, effect.y2); ctx.stroke();
    }
    if (effect.kind === 'ring') {
      ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius * (0.45 + effect.age / effect.life), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  drawSummon(ctx, summon) {
    ctx.save();
    ctx.fillStyle = summon.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = summon.color;
    ctx.beginPath();
    ctx.arc(summon.x, summon.y, summon.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawOrb(ctx, orb) {
    const element = this.data.elements[orb.elementId];
    const pulse = 0.75 + Math.sin(orb.phase * 2.2) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = element.color;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius + 10 + pulse * 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = element.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = element.color;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius + pulse * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = element.accent;
    ctx.beginPath();
    ctx.arc(orb.x - orb.radius * 0.25, orb.y - orb.radius * 0.25, Math.max(2, orb.radius * 0.28), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMachine(ctx, machine) {
    ctx.save();
    ctx.translate(machine.x, machine.y);
    const color = machine.core ? this.data.elements[machine.core.elementId].color : '#6e7587';
    const alpha = machine.core ? 0.58 + machine.pulse * 0.24 : 0.3;
    ctx.fillStyle = `rgba(28,34,48,${alpha})`;
    ctx.beginPath();
    ctx.rect(-machine.radius, -machine.radius, machine.radius * 2, machine.radius * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-machine.radius, -machine.radius, machine.radius * 2, machine.radius * 2);
    if (machine.core) {
      ctx.fillStyle = color;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  draw(ctx) {
    this.drawBackground(ctx);
    for (const machine of this.machineStructures) this.drawMachine(ctx, machine);
    for (const spawner of this.spawners) this.drawSpawner(ctx, spawner);
    for (const orb of this.orbs) this.drawOrb(ctx, orb);
    for (const summon of this.summons) this.drawSummon(ctx, summon);
    for (const effect of this.effects) this.drawEffect(ctx, effect);
    for (const projectile of this.projectiles) this.drawProjectile(ctx, projectile);
    for (const enemy of this.enemies) this.drawEnemy(ctx, enemy);
    this.drawPlayer(ctx);
    for (const particle of this.particles) this.drawParticle(ctx, particle);
    for (const text of this.damageTexts) this.drawDamageText(ctx, text);
  }
}