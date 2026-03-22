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
    this.spawners = [];

    this.enemyPool = new ObjectPool(() => ({ active: false, statuses: {}, hitFlash: 0 }), resetEnemy);
    this.projectilePool = new ObjectPool(() => ({ active: false, hitTargets: [] }), resetProjectile);
    this.particlePool = new ObjectPool(() => ({ active: false }), resetParticle);
    this.textPool = new ObjectPool(() => ({ active: false }), resetText);
    this.summonPool = new ObjectPool(() => ({ active: false }), resetSummon);

    this.resetWorld();
  }

  createPlayer() {
    return {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      radius: 16,
      speed: 280,
      attackCooldown: 0,
      visuals: { arms: true, legs: true, color: '#ff8c42' }
    };
  }

  resetWorld() {
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.particles.length = 0;
    this.damageTexts.length = 0;
    this.summons.length = 0;
    this.spawners.length = 0;
    for (const def of this.data.spawners) {
      this.spawners.push(this.createSpawner(def));
    }
  }

  resize(width, height) {
    this.viewport.width = width;
    this.viewport.height = height;
    this.player.x = Math.min(width - this.player.radius, Math.max(this.player.radius, this.player.x));
    this.player.y = Math.min(height - this.player.radius, Math.max(this.player.radius, this.player.y));
  }

  createSpawner(def) {
    return {
      id: def.id,
      def,
      x: 0,
      y: 0,
      radius: 24,
      hp: def.hp,
      maxHp: def.hp,
      timer: 0,
      active: true,
      hitFlash: 0
    };
  }

  updateSpawnerPosition(spawner) {
    const { width, height } = this.viewport;
    if (spawner.def.mode === 'edge') {
      if (spawner.def.edge === 'left') {
        spawner.x = 22;
        spawner.y = height * spawner.def.offset;
      }
      if (spawner.def.edge === 'right') {
        spawner.x = width - 22;
        spawner.y = height * spawner.def.offset;
      }
      if (spawner.def.edge === 'top') {
        spawner.x = width * spawner.def.offset;
        spawner.y = 22;
      }
      if (spawner.def.edge === 'bottom') {
        spawner.x = width * spawner.def.offset;
        spawner.y = height - 22;
      }
    }
  }

  acquireEnemy(typeId, x, y) {
    const archetype = this.data.enemyTypes[typeId];
    const enemy = this.enemyPool.acquire();
    enemy.active = true;
    enemy.typeId = typeId;
    enemy.x = x;
    enemy.y = y;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.hp = archetype.hp;
    enemy.maxHp = archetype.hp;
    enemy.radius = archetype.radius;
    enemy.speed = archetype.speed;
    enemy.damage = archetype.damage;
    enemy.xp = archetype.xp;
    enemy.color = archetype.color;
    enemy.resistances = archetype.resistances;
    enemy.weaknesses = archetype.weaknesses;
    enemy.aiState = 'approach';
    enemy.aiTimer = 0;
    enemy.projectileCooldown = archetype.projectileCooldown || 0;
    enemy.phase = 1;
    enemy.hitFlash = 0;
    enemy.statuses = {};
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
      damage: config.damage,
      color: config.color,
      attackType: config.attackType,
      elementIds: config.elementIds || [],
      statuses: config.statuses || [],
      critChance: config.critChance || 0,
      critDamage: config.critDamage || 0.75,
      pierce: config.pierce || 0,
      bounce: config.bounce || 0,
      growth: config.growth || 0,
      aoeRadius: config.aoeRadius || 0,
      chainCount: config.chainCount || 0,
      orbitSource: config.orbitSource || null,
      hitTargets: []
    });
    this.projectiles.push(projectile);
    return projectile;
  }

  spawnParticle(config) {
    const particle = this.particlePool.acquire();
    Object.assign(particle, {
      active: true,
      x: config.x,
      y: config.y,
      vx: config.vx,
      vy: config.vy,
      radius: config.radius,
      life: config.life,
      age: 0,
      color: config.color,
      glow: config.glow || false
    });
    this.particles.push(particle);
  }

  spawnBurst(x, y, color, count, spread = 260) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * spread;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        life: 0.25 + Math.random() * 0.5,
        color,
        glow: true
      });
    }
  }

  spawnDamageText(x, y, value, color = '#ffffff') {
    const text = this.textPool.acquire();
    Object.assign(text, {
      active: true,
      x,
      y,
      value,
      color,
      age: 0,
      life: 0.7,
      vy: -34
    });
    this.damageTexts.push(text);
  }

  spawnSummon(config) {
    const summon = this.summonPool.acquire();
    Object.assign(summon, {
      active: true,
      kind: config.kind,
      x: config.x,
      y: config.y,
      radius: config.radius,
      angle: 0,
      orbitRadius: config.orbitRadius || 60,
      life: config.life,
      age: 0,
      color: config.color,
      damage: config.damage,
      statuses: config.statuses || [],
      attackTimer: 0,
      attackInterval: config.attackInterval || 0.45,
      owner: config.owner,
      elementIds: config.elementIds || []
    });
    this.summons.push(summon);
    return summon;
  }

  updatePlayer(dt, input) {
    let moveX = 0;
    let moveY = 0;
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    const length = Math.hypot(moveX, moveY) || 1;
    this.player.x += (moveX / length) * this.player.speed * dt;
    this.player.y += (moveY / length) * this.player.speed * dt;
    this.player.x = Math.max(this.player.radius, Math.min(this.viewport.width - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.viewport.height - this.player.radius, this.player.y));
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
  }

  updateSpawners(dt, combatSystem) {
    const elapsed = this.gameState.time;
    for (const spawner of this.spawners) {
      if (!spawner.active) {
        continue;
      }

      this.updateSpawnerPosition(spawner);
      spawner.hitFlash = Math.max(0, spawner.hitFlash - dt * 5);
      spawner.timer += dt;
      const cadence = Math.max(1, spawner.def.interval - Math.min(1.2, elapsed * 0.01));
      if (spawner.timer < cadence) {
        continue;
      }

      spawner.timer = 0;
      const pool = elapsed > 50 ? ['basic', 'fast', 'tank', 'ranged'] : elapsed > 18 ? ['basic', 'fast', 'ranged'] : ['basic', 'fast'];
      const typeId = pool[Math.floor(Math.random() * pool.length)];
      const angle = Math.random() * Math.PI * 2;
      this.spawnEnemy(typeId, spawner.x + Math.cos(angle) * 18, spawner.y + Math.sin(angle) * 18);
      this.spawnBurst(spawner.x, spawner.y, '#9b6cff', 6, 100);
    }

    if (!this.gameState.bossSpawned && elapsed > 95) {
      this.gameState.bossSpawned = true;
      this.spawnEnemy('boss', this.viewport.width * 0.5, 90);
      this.gameState.notify('Boss incoming: Harmonic Titan', '#ff6c8a', 2.6);
    }
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
        this.spawnBurst(enemy.x, enemy.y, '#77ffb8', enemy.typeId === 'boss' ? 30 : 14, 320);
        this.enemies.splice(index, 1);
        this.enemyPool.release(enemy);
        continue;
      }

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (enemy.typeId === 'ranged') {
        enemy.aiState = distance < 220 ? 'kite' : 'shoot';
      } else if (enemy.typeId === 'fast') {
        enemy.aiState = distance < 120 ? 'dash' : 'approach';
      } else if (enemy.typeId === 'boss') {
        enemy.phase = enemy.hp / enemy.maxHp > 0.66 ? 1 : enemy.hp / enemy.maxHp > 0.33 ? 2 : 3;
        enemy.aiState = enemy.phase === 3 ? 'berserk' : 'boss';
      } else {
        enemy.aiState = 'approach';
      }

      if (enemy.aiState === 'kite') {
        enemy.x -= (dx / distance) * enemy.speed * 0.7 * dt;
        enemy.y -= (dy / distance) * enemy.speed * 0.7 * dt;
      } else if (enemy.aiState === 'dash') {
        enemy.x += (dx / distance) * enemy.speed * 1.6 * dt;
        enemy.y += (dy / distance) * enemy.speed * 1.6 * dt;
      } else if (enemy.aiState === 'boss' || enemy.aiState === 'berserk') {
        enemy.x += (dx / distance) * enemy.speed * (enemy.aiState === 'berserk' ? 1.25 : 0.75) * dt;
        enemy.y += (dy / distance) * enemy.speed * (enemy.aiState === 'berserk' ? 1.25 : 0.75) * dt;
        enemy.projectileCooldown -= dt;
        if (enemy.projectileCooldown <= 0) {
          enemy.projectileCooldown = enemy.aiState === 'berserk' ? 1.2 : 1.8;
          combatSystem.spawnEnemyBurst(enemy);
        }
      } else {
        enemy.x += (dx / distance) * enemy.speed * dt;
        enemy.y += (dy / distance) * enemy.speed * dt;
      }

      if (enemy.typeId === 'ranged') {
        enemy.projectileCooldown -= dt;
        if (enemy.projectileCooldown <= 0) {
          enemy.projectileCooldown = 2.6;
          combatSystem.spawnEnemyShot(enemy);
        }
      }

      if (distance < this.player.radius + enemy.radius + 2) {
        this.gameState.damagePlayer(enemy.damage * dt * 2.4);
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
      if (projectile.life <= 0) {
        projectile.active = false;
      }

      if (!projectile.active) {
        continue;
      }

      if (projectile.owner === 'player') {
        combatSystem.resolvePlayerProjectile(projectile);
      } else {
        combatSystem.resolveEnemyProjectile(projectile);
      }

      if (projectile.x < -120 || projectile.y < -120 || projectile.x > this.viewport.width + 120 || projectile.y > this.viewport.height + 120) {
        projectile.active = false;
      }
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

      summon.angle += dt * 2.2;
      summon.x = this.player.x + Math.cos(summon.angle) * summon.orbitRadius;
      summon.y = this.player.y + Math.sin(summon.angle) * summon.orbitRadius;
      this.spawnParticle({
        x: summon.x,
        y: summon.y,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        radius: 1.5,
        life: 0.35,
        color: summon.color,
        glow: false
      });

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
    this.updateSpawners(dt, combatSystem);
    this.updateEnemies(dt, combatSystem);
    this.updateProjectiles(dt, combatSystem);
    this.updateSummons(dt, combatSystem);
    this.updateParticles(dt);
    this.updateDamageTexts(dt);
  }

  drawBackground(ctx) {
    ctx.fillStyle = this.data.map.backgroundColor;
    ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    ctx.fillStyle = this.data.map.accentColor;
    for (let x = 0; x < this.viewport.width; x += this.data.map.gridSize) {
      ctx.fillRect(x, 0, 1, this.viewport.height);
    }
    for (let y = 0; y < this.viewport.height; y += this.data.map.gridSize) {
      ctx.fillRect(0, y, this.viewport.width, 1);
    }
  }

  drawPlayer(ctx) {
    const player = this.player;
    ctx.save();
    ctx.fillStyle = player.visuals.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (player.visuals.arms) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(player.x - player.radius - 6, player.y, 5, 0, Math.PI * 2);
      ctx.arc(player.x + player.radius + 6, player.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (player.visuals.legs) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(player.x - 5, player.y + player.radius + 5, 4, 0, Math.PI * 2);
      ctx.arc(player.x + 5, player.y + player.radius + 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
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
    ctx.fillStyle = '#1f1220';
    ctx.beginPath();
    ctx.arc(0, 0, spawner.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemy(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
    if (enemy.typeId === 'tank') {
      ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
    } else if (enemy.typeId === 'fast') {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, enemy.radius);
      ctx.lineTo(-enemy.radius, enemy.radius);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.typeId === 'ranged') {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5d9ff';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (enemy.typeId === 'boss') {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = enemy.phase === 3 ? '#fff5a5' : '#ffc4d1';
      ctx.lineWidth = 5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
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

  draw(ctx) {
    this.drawBackground(ctx);
    for (const spawner of this.spawners) {
      this.drawSpawner(ctx, spawner);
    }
    for (const summon of this.summons) {
      this.drawSummon(ctx, summon);
    }
    for (const projectile of this.projectiles) {
      this.drawProjectile(ctx, projectile);
    }
    for (const enemy of this.enemies) {
      this.drawEnemy(ctx, enemy);
    }
    this.drawPlayer(ctx);
    for (const particle of this.particles) {
      this.drawParticle(ctx, particle);
    }
    for (const text of this.damageTexts) {
      this.drawDamageText(ctx, text);
    }
  }
}
