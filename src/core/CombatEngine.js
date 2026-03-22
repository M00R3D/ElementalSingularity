// ========================================
// CombatEngine - Combat Management
// Handles: ability execution, damage, cooldowns
// ========================================

export class CombatEngine {
  constructor(gameData, worldWidth = 2400, worldHeight = 1800) {
    this.gameData    = gameData;
    this.worldWidth  = worldWidth;
    this.worldHeight = worldHeight;
    this.damageFloats = [];
    this.projectiles = [];
    this.slashes = [];
    this.particles = [];
  }

  executeAbility(abilityId, fromPlayer, toTarget, gameState) {
    const ability = this.gameData.abilities.find(a => a.id === abilityId);
    if (!ability) return false;

    const cooldown = gameState.getCooldown(abilityId);
    if (cooldown > 0) return false;

    if (fromPlayer.playerStats.mana < ability.manaCost) return false;

    const distance = Math.sqrt(
      Math.pow(toTarget.x - fromPlayer.x, 2) +
      Math.pow(toTarget.y - fromPlayer.y, 2)
    );

    // Slash and projectile abilities are not range-gated.
    if (!ability.slash && !ability.projectile && distance > (ability.range || 9999)) return false;

    fromPlayer.playerStats.mana -= ability.manaCost;
    gameState.setCooldown(abilityId, ability.cooldown);

    if (ability.slash) {
      this.spawnSlash(fromPlayer, toTarget, ability);
      return true;
    }

    if (ability.projectile) {
      this.spawnProjectile(fromPlayer, toTarget, ability);
      return true;
    }

    const damageDealt = this.calculateDamage(ability);

    if (toTarget.takeDamage) {
      toTarget.takeDamage(damageDealt);
    }

    this.applyKnockback(fromPlayer, toTarget);
    this.spawnDamageFloat(
      toTarget.x,
      toTarget.y,
      damageDealt,
      ability.element ? this.getElementColor(ability.element) : '#FFFFFF'
    );

    return true;
  }

  // ── SLASH ──────────────────────────────────────────────────────────────────
  spawnSlash(fromPlayer, toTarget, ability) {
    const angle  = Math.atan2(toTarget.y - fromPlayer.y, toTarget.x - fromPlayer.x);
    const depth  = ability.slashDepth || 70;
    const width  = ability.slashWidth || 50;
    const life   = ability.slashLife  || 0.16;
    this.slashes.push({ x: fromPlayer.x, y: fromPlayer.y, angle, depth, width, life, maxLife: life, ability });
  }

  updateSlashes(dt, enemies) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      // Apply damage + knockback on the very first tick.
      if (s.life === s.maxLife) {
        const cx  = s.x + Math.cos(s.angle) * s.depth * 0.5;
        const cy  = s.y + Math.sin(s.angle) * s.depth * 0.5;
        const rx  = s.depth * 0.5;
        const ry  = s.width * 0.5;
        const cos = Math.cos(-s.angle);
        const sin = Math.sin(-s.angle);
        for (const enemy of enemies) {
          if (enemy.dead) continue;
          const dx = enemy.x - cx;
          const dy = enemy.y - cy;
          const lx = dx * cos - dy * sin;
          const ly = dx * sin + dy * cos;
          if ((lx / rx) ** 2 + (ly / ry) ** 2 <= 1) {
            const dmg = this.calculateDamage(s.ability);
            enemy.takeDamage(dmg);
            this.applyKnockback({ x: s.x, y: s.y }, enemy);
            this.spawnDamageFloat(enemy.x, enemy.y, dmg, '#C8DCFF');
          }
        }
      }
      s.life -= dt;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }
  }

  drawSlashes(ctx, camera = null) {
    const camX = camera ? camera.x : 0;
    const camY = camera ? camera.y : 0;
    for (const s of this.slashes) {
      const progress = s.life / s.maxLife; // 1 → 0
      const cx = s.x + Math.cos(s.angle) * s.depth * 0.5 - camX;
      const cy = s.y + Math.sin(s.angle) * s.depth * 0.5 - camY;
      ctx.save();
      ctx.globalAlpha = progress * 0.82;
      ctx.translate(cx, cy);
      ctx.rotate(s.angle);
      // Half-ellipse facing forward (arc from -PI/2 → PI/2 closed at origin)
      ctx.beginPath();
      ctx.ellipse(0, 0, s.depth * 0.5, s.width * 0.5, 0, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(180, 210, 255, 0.55)`;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── PROJECTILE ────────────────────────────────────────────────────────────
  spawnProjectile(fromPlayer, toTarget, ability) {
    const angle = Math.atan2(toTarget.y - fromPlayer.y, toTarget.x - fromPlayer.x);
    const speed  = ability.projectileSpeed  || 400;
    const radius = ability.projectileRadius || 6;
    const life   = ability.projectileLife   || 1.5;
    this.projectiles.push({
      x: fromPlayer.x,
      y: fromPlayer.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      life,
      ability
    });
  }

  updateProjectiles(dt, enemies, worldMap) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;

      // Emitir partículas de llama si el proyectil tiene burn (fireball).
      if (projectile.ability.burnDuration) {
        for (let p = 0; p < 2; p++) {
          this.spawnFlameParticle(
            projectile.x + (Math.random() - 0.5) * 6,
            projectile.y + (Math.random() - 0.5) * 6
          );
        }
      }

      // Rebotar en los bordes del mapa.
      if (projectile.x - projectile.radius <= 0) {
        projectile.x = projectile.radius;
        projectile.vx = Math.abs(projectile.vx);
      } else if (projectile.x + projectile.radius >= this.worldWidth) {
        projectile.x = this.worldWidth - projectile.radius;
        projectile.vx = -Math.abs(projectile.vx);
      }
      if (projectile.y - projectile.radius <= 0) {
        projectile.y = projectile.radius;
        projectile.vy = Math.abs(projectile.vy);
      } else if (projectile.y + projectile.radius >= this.worldHeight) {
        projectile.y = this.worldHeight - projectile.radius;
        projectile.vy = -Math.abs(projectile.vy);
      }

      let hit = false;

      // Colisión con árboles durante el vuelo (para proyectiles con burn).
      if (!hit && !projectile.hasBurned && worldMap && projectile.ability.burnDuration) {
        const collisionR = (projectile.radius || 7) + 24; // proyectil + radio árbol (~22)
        const burned = worldMap.burnTreeAt(projectile.x, projectile.y, collisionR);
        if (burned && burned.length > 0) {
          projectile.hasBurned = true;
          hit = true; // Proyectil se destruye al tocar árbol
        }
      }

      // Colisión con enemigos.
      if (!hit) {
        for (const enemy of enemies) {
          if (enemy.dead) continue;
          const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
          if (dist <= projectile.radius + enemy.radius) {
            const impactDamage = this.calculateDamage(projectile.ability);
            enemy.takeDamage(impactDamage);
            if (projectile.ability.burnDuration) {
              this.applyBurn(enemy, projectile.ability.burnDuration, projectile.ability.burnDps || 4,
                projectile.ability.projectileColor || '#FF4500');
            }
            this.applyKnockback(
              { x: projectile.x - projectile.vx * 0.01, y: projectile.y - projectile.vy * 0.01 },
              enemy
            );
            const floatColor = projectile.ability.projectileColor
              || (projectile.ability.element ? this.getElementColor(projectile.ability.element) : '#FFFFFF');
            this.spawnDamageFloat(enemy.x, enemy.y, impactDamage, floatColor);
            hit = true;
            break;
          }
        }
      }

      if (hit || projectile.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  applyBurn(target, durationSeconds, damagePerTick, color = '#FF4500') {
    target.burnTime = Math.max(target.burnTime || 0, durationSeconds);
    target.burnTick = target.burnTick || 0;
    target.burnDamage = damagePerTick;
    target.burnColor = color;
  }

  spawnDamageFloat(x, y, damage, color) {
    this.damageFloats.push({
      x,
      y,
      damage: Math.round(damage),
      color,
      timeLeft: 1.0
    });
  }

  calculateDamage(ability) {
    const randomFactor = 0.85 + Math.random() * 0.3;
    return ability.baseDamage * randomFactor;
  }

  applyKnockback(fromPlayer, toTarget) {
    if (typeof toTarget.vx !== 'number' || typeof toTarget.vy !== 'number') return;
    const knockbackForce = 150;
    const angle = Math.atan2(toTarget.y - fromPlayer.y, toTarget.x - fromPlayer.x);
    toTarget.vx = Math.cos(angle) * knockbackForce;
    toTarget.vy = Math.sin(angle) * knockbackForce;
  }

  getElementColor(elementId) {
    const element = this.gameData.elements.find(e => e.id === elementId);
    return element ? element.nameColor : '#FFFFFF';
  }

  updateFloats(dt) {
    this.damageFloats = this.damageFloats.map(f => ({
      ...f,
      timeLeft: f.timeLeft - dt,
      y: f.y - 50 * dt
    })).filter(f => f.timeLeft > 0);
  }

  drawProjectiles(ctx, camera = null) {
    const camX = camera ? camera.x : 0;
    const camY = camera ? camera.y : 0;
    for (const projectile of this.projectiles) {
      const color = projectile.ability.projectileColor || '#FFFFFF';
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(projectile.x - camX, projectile.y - camY, projectile.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
  spawnFlameParticle(x, y) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 50,
      vy: -60 - Math.random() * 80,
      life: 0.2 + Math.random() * 0.25,
      maxLife: 0.45,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.4 ? '#FF4500' : '#FF8C00'
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  drawParticles(ctx, camera = null) {
    const camX = camera ? camera.x : 0;
    const camY = camera ? camera.y : 0;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = (p.life / p.maxLife) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFloats(ctx, camera = null) {
    const camX = camera ? camera.x : 0;
    const camY = camera ? camera.y : 0;
    ctx.font = 'bold 16px Arial';
    for (const f of this.damageFloats) {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = f.timeLeft;
      ctx.fillText(f.damage, f.x - camX, f.y - camY);
    }
    ctx.globalAlpha = 1;
  }
}

export default CombatEngine;
