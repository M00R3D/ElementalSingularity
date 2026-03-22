export class EntityManager {
  constructor(gameData = null) {
    this.gameData   = gameData;
    this.player     = { x: 1200, y: 900, vx: 0, vy: 0, radius: 15, color: '#FF6347' };
    this.enemies    = [];
    this.maxEnemies = 100;
    this.width      = 2400;
    this.height     = 1800;
    this.particles  = [];
    this._spawnTimer = 0;
  }

  update(dt, input, realPlayer = null, worldMap = null) {
    this.player.vx = 0;
    this.player.vy = 0;

    if (input.w) this.player.vy -= 150;
    if (input.s) this.player.vy += 150;
    if (input.a) this.player.vx -= 150;
    if (input.d) this.player.vx += 150;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    this.player.x = Math.max(this.player.radius, Math.min(this.width - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.height - this.player.radius, this.player.y));

    const target = realPlayer || this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.dead || enemy.hp <= 0) {
        if (!enemy._dropped) {
          enemy._dropped = true;
          if (worldMap) {
            worldMap.spawnDrop(enemy.x, enemy.y, 'xp', enemy.xpValue || 10);
            if (enemy.lootItem && Math.random() < (enemy.lootChance || 0.3)) {
              worldMap.spawnDrop(
                enemy.x + (Math.random() - 0.5) * 22,
                enemy.y + (Math.random() - 0.5) * 22,
                enemy.lootItem, 1
              );
            }
          }
        }
        this.enemies.splice(i, 1);
        continue;
      }

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Burn tick damage while the status is active.
      if (enemy.burnTime > 0) {
        enemy.burnTime = Math.max(0, enemy.burnTime - dt);
        enemy.burnTick -= dt;
        if (enemy.burnTick <= 0) {
          enemy.burnTick += 0.4;
          enemy.takeDamage(enemy.burnDamage || 3);
        }
      }

      // Bounce enemies on map edges instead of despawning.
      if (enemy.x <= enemy.radius) {
        enemy.x = enemy.radius;
        enemy.vx = Math.abs(enemy.vx);
      } else if (enemy.x >= this.width - enemy.radius) {
        enemy.x = this.width - enemy.radius;
        enemy.vx = -Math.abs(enemy.vx);
      }

      if (enemy.y <= enemy.radius) {
        enemy.y = enemy.radius;
        enemy.vy = Math.abs(enemy.vy);
      } else if (enemy.y >= this.height - enemy.radius) {
        enemy.y = this.height - enemy.radius;
        enemy.vy = -Math.abs(enemy.vy);
      }

      // Homing hacia el jugador.
      const tx = target.x - enemy.x;
      const ty = target.y - enemy.y;
      const tdist = Math.hypot(tx, ty) || 1;
      const maxSpd = enemy.speed || 85;
      enemy.vx += (tx / tdist) * (maxSpd * 0.65) * dt;
      enemy.vy += (ty / tdist) * (maxSpd * 0.65) * dt;
      const spd = Math.hypot(enemy.vx, enemy.vy);
      if (spd > maxSpd) { enemy.vx = (enemy.vx / spd) * maxSpd; enemy.vy = (enemy.vy / spd) * maxSpd; }

      // Ataque del enemigo al jugador con cooldown.
      enemy.attackCooldown = Math.max(0, (enemy.attackCooldown || 0) - dt);
      if (tdist <= (enemy.attackRange || 26) && enemy.attackCooldown <= 0 && target.takeDamage) {
        target.takeDamage(enemy.attackDamage || 6);
        if (target.applyKnockback) target.applyKnockback(enemy.x, enemy.y, 270);
        enemy.attackCooldown = enemy.attackCooldownMax || 1.5;
        enemy.attackFlash = 0.45;
      }
      enemy.attackFlash = Math.max(0, (enemy.attackFlash || 0) - dt * 3.5);

      // Emitir partículas de fuego mientras el enemigo está en burn.
      if (enemy.burnTime > 0 && Math.random() < 0.55) {
        this.particles.push({
          x: enemy.x + (Math.random() - 0.5) * enemy.radius * 1.8,
          y: enemy.y + (Math.random() - 0.5) * enemy.radius * 1.8,
          vx: (Math.random() - 0.5) * 35,
          vy: -45 - Math.random() * 55,
          life: 0.3 + Math.random() * 0.3,
          maxLife: 0.6,
          size: 2 + Math.random() * 2.5,
          color: Math.random() > 0.45 ? '#FF4500' : '#FF8C00'
        });
      }
    }

    // Auto-spawn enemies around the player at intervals
    this._spawnTimer += dt;
    const spawnInterval = this.enemies.length < 5 ? 2 : 5;
    if (this._spawnTimer >= spawnInterval && this.enemies.length < this.maxEnemies) {
      this._spawnTimer = 0;
      const spawnTarget = realPlayer || this.player;
      const angle = Math.random() * Math.PI * 2;
      const dist  = 350 + Math.random() * 150;
      const spawnX = Math.max(30, Math.min(this.width  - 30, spawnTarget.x + Math.cos(angle) * dist));
      const spawnY = Math.max(30, Math.min(this.height - 30, spawnTarget.y + Math.sin(angle) * dist));
      const pool = ['goblin', 'goblin', 'goblin', 'skeleton', 'orc'];
      this.spawnEnemy(spawnX, spawnY, pool[Math.floor(Math.random() * pool.length)]);
    }

    // Update burn particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx, camera = null) {
    const offX = camera ? camera.x : 0;
    const offY = camera ? camera.y : 0;

    if (!camera) {
      ctx.fillStyle = this.player.color;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const enemy of this.enemies) {
      if (camera && !camera.isVisible(enemy.x, enemy.y, enemy.radius + 20)) continue;
      const sx = enemy.x - offX;
      const sy = enemy.y - offY;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(sx, sy, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.burnTime > 0) {
        ctx.strokeStyle = enemy.burnColor || '#FF4500';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, enemy.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enemy.attackFlash > 0) {
        ctx.save();
        ctx.globalAlpha = enemy.attackFlash;
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, enemy.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // HP bar
      const barW = 20;
      const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(sx - barW / 2, sy - enemy.radius - 10, barW, 3);
      ctx.fillStyle = '#ff6666';
      ctx.fillRect(sx - barW / 2, sy - enemy.radius - 10, barW * hpRatio, 3);
    }

    // Burn particles
    for (const p of this.particles) {
      if (camera && !camera.isVisible(p.x, p.y, p.size + 2)) continue;
      ctx.save();
      ctx.globalAlpha = (p.life / p.maxLife) * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - offX, p.y - offY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!camera) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText('Enemies: ' + this.enemies.length, 10, 80);
    }
  }

  spawnEnemy(x, y, typeId = 'goblin') {
    if (this.enemies.length >= this.maxEnemies) return null;

    let type = null;
    if (this.gameData && this.gameData.enemyTypes) {
      type = this.gameData.enemyTypes.find(t => t.id === typeId);
    }
    const hp     = type ? type.baseHp                                : 40;
    const speed  = type ? type.speed                                 : 80;
    const radius = type ? type.radius                                : 12;
    const color  = type ? type.color                                 : '#228B22';
    const dmg    = type ? (type.attackDamage || type.baseDamage || 6): 6;
    const xpVal  = type ? type.xpValue                               : 10;
    const lootId = type ? (type.lootItem   || null)                  : null;
    const lootCh = type ? (type.lootChance || 0.3)                   : 0.3;

    const enemy = {
      x, y,
      vx: Math.random() * 100 - 50,
      vy: Math.random() * 100 - 50,
      radius,
      color,
      maxHp: hp,
      hp,
      speed,
      dead:     false,
      _dropped: false,
      burnTime:  0,
      burnTick:  0,
      burnDamage: 3,
      burnColor: '#FF4500',
      attackCooldown:    0,
      attackCooldownMax: 1.5,
      attackRange: radius + 16,
      attackDamage: dmg,
      attackFlash: 0,
      xpValue:    xpVal,
      lootItem:   lootId,
      lootChance: lootCh,
      typeId,
      takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
          this.hp   = 0;
          this.dead = true;
        }
      }
    };
    this.enemies.push(enemy);
    return enemy;
  }
}

export default EntityManager;
