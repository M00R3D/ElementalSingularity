export class EntityManager {
  constructor() {
    this.player = { x: 400, y: 300, vx: 0, vy: 0, radius: 15, color: '#FF6347' };
    this.enemies = [];
    this.maxEnemies = 100;
    this.width = 800;
    this.height = 600;
    this.particles = [];
  }

  update(dt, input, realPlayer = null) {
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
      enemy.vx += (tx / tdist) * 55 * dt;
      enemy.vy += (ty / tdist) * 55 * dt;
      const spd = Math.hypot(enemy.vx, enemy.vy);
      if (spd > 85) { enemy.vx = (enemy.vx / spd) * 85; enemy.vy = (enemy.vy / spd) * 85; }

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

    // Actualizar partículas de burn.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.player.color;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();

    for (const enemy of this.enemies) {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.burnTime > 0) {
        ctx.strokeStyle = enemy.burnColor || '#FF4500';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enemy.attackFlash > 0) {
        ctx.save();
        ctx.globalAlpha = enemy.attackFlash;
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Small HP bar for gameplay feedback
      const barW = 20;
      const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 10, barW, 3);
      ctx.fillStyle = '#ff6666';
      ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 10, barW * hpRatio, 3);
    }

    // Dibujar partículas de burn.
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = (p.life / p.maxLife) * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.fillText('Enemies: ' + this.enemies.length, 10, 80);
  }

  spawnEnemy(x, y) {
    if (this.enemies.length >= this.maxEnemies) return null;
    const enemy = {
      x,
      y,
      vx: Math.random() * 100 - 50,
      vy: Math.random() * 100 - 50,
      radius: 12,
      color: '#228B22',
      maxHp: 40,
      hp: 40,
      dead: false,
      burnTime: 0,
      burnTick: 0,
      burnDamage: 3,
      burnColor: '#FF4500',
      attackCooldown: 0,
      attackCooldownMax: 1.5,
      attackRange: 26,
      attackDamage: 6,
      attackFlash: 0,
      takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
          this.hp = 0;
          this.dead = true;
        }
      }
    };
    this.enemies.push(enemy);
    return enemy;
  }
}

export default EntityManager;
