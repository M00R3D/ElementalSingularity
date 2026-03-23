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
    this.lightningBeams = [];
    this._enemyContext = [];
    this._playerContext = null;
    this._worldContext = null;
  }

  setCombatContext(enemies = [], player = null, worldMap = null) {
    this._enemyContext = enemies || [];
    this._playerContext = player || null;
    this._worldContext = worldMap || null;
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

    // Slash/projectile/chain lightning are not range-gated here.
    if (!ability.slash && !ability.projectile && !ability.chainLightning && distance > (ability.range || 9999)) return false;

    if (ability.slash) {
      fromPlayer.playerStats.mana -= ability.manaCost;
      gameState.setCooldown(abilityId, ability.cooldown);
      this.spawnSlash(fromPlayer, toTarget, ability);
      return true;
    }

    if (ability.projectile) {
      fromPlayer.playerStats.mana -= ability.manaCost;
      gameState.setCooldown(abilityId, ability.cooldown);
      this.spawnProjectile(fromPlayer, toTarget, ability);
      return true;
    }

    if (ability.chainLightning) {
      const success = this.castChainLightning(fromPlayer, toTarget, ability);
      if (!success) return false;
      fromPlayer.playerStats.mana -= ability.manaCost;
      gameState.setCooldown(abilityId, ability.cooldown);
      return true;
    }

    if (ability.id === 'airslash') {
      const success = this.castAirSlash(fromPlayer, toTarget, ability);
      if (!success) return false;
      fromPlayer.playerStats.mana -= ability.manaCost;
      gameState.setCooldown(abilityId, ability.cooldown);
      return true;
    }

    if (ability.earthSpike) {
      const success = this.castEarthSpike(fromPlayer, toTarget, ability);
      if (!success) return false;
      fromPlayer.playerStats.mana -= ability.manaCost;
      gameState.setCooldown(abilityId, ability.cooldown);
      return true;
    }

    fromPlayer.playerStats.mana -= ability.manaCost;
    gameState.setCooldown(abilityId, ability.cooldown);

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
      maxLife: life,
      z: 0,
      vz: ability.parabolic ? (ability.arcHeight || 95) : 0,
      gravity: ability.parabolic ? Math.max(260, (ability.arcHeight || 95) * 2.35) : 0,
      ability
    });
  }

  updateProjectiles(dt, enemies, worldMap) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;

      if (projectile.ability.parabolic) {
        projectile.vz -= (projectile.gravity || 0) * dt;
        projectile.z = Math.max(0, (projectile.z || 0) + projectile.vz * dt);
      }

      // Emitir partículas de llama si el proyectil tiene burn (fireball).
      if (projectile.ability.burnDuration) {
        for (let p = 0; p < 2; p++) {
          this.spawnFlameParticle(
            projectile.x + (Math.random() - 0.5) * 6,
            projectile.y + (Math.random() - 0.5) * 6
          );
        }
      }

      // Water projectile trail particles.
      if (projectile.ability.waterPuddleDuration) {
        for (let d = 0; d < 2; d++) {
          this.particles.push({
            x: projectile.x + (Math.random() - 0.5) * 5,
            y: projectile.y - (projectile.z || 0) + (Math.random() - 0.5) * 5,
            vx: (Math.random() - 0.5) * 55,
            vy: -20 - Math.random() * 28,
            life: 0.16 + Math.random() * 0.2,
            maxLife: 0.36,
            size: 1.4 + Math.random() * 1.9,
            color: Math.random() < 0.5 ? '#4aa7ff' : '#8ad9ff'
          });
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

      // Water bolts can extinguish burning trees and create puddles.
      if (!hit && worldMap && projectile.ability.waterPuddleDuration) {
        const extinguished = worldMap.extinguishTreesInRadius(
          projectile.x,
          projectile.y,
          projectile.ability.extinguishRadius || 34
        );
        if (extinguished > 0) {
          hit = true;
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
            if (projectile.ability.waterPuddleDuration) {
              enemy.burnTime = 0;
              enemy.burnTick = 0;
              if (typeof enemy.applySlippery === 'function') {
                enemy.applySlippery(
                  projectile.ability.slipperyDuration || 1.8,
                  enemy.x - projectile.x,
                  enemy.y - projectile.y,
                  110,
                  projectile.ability.slipFriction || 0.92
                );
              }
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
        if (worldMap && projectile.ability.waterPuddleDuration) {
          worldMap.spawnWaterPuddle(
            projectile.x,
            projectile.y,
            projectile.ability.waterPuddleRadius || 30,
            projectile.ability.waterPuddleDuration || 4.5,
            projectile.ability.slipFriction || 0.92,
            projectile.ability.slipperyDuration || 1.8
          );
          worldMap.extinguishTreesInRadius(
            projectile.x,
            projectile.y,
            projectile.ability.extinguishRadius || 34
          );
          for (let s = 0; s < 20; s++) {
            this.particles.push({
              x: projectile.x,
              y: projectile.y - (projectile.z || 0) * 0.3,
              vx: (Math.random() - 0.5) * 180,
              vy: -20 - Math.random() * 80,
              life: 0.25 + Math.random() * 0.3,
              maxLife: 0.55,
              size: 1.6 + Math.random() * 2.6,
              color: Math.random() < 0.5 ? '#4aa7ff' : '#8ad9ff'
            });
          }
        }
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.lightningBeams.length - 1; i >= 0; i--) {
      this.lightningBeams[i].life -= dt;
      if (this.lightningBeams[i].life <= 0) this.lightningBeams.splice(i, 1);
    }
  }

  applyBurn(target, durationSeconds, damagePerTick, color = '#FF4500') {
    target.burnTime = Math.max(target.burnTime || 0, durationSeconds);
    target.burnTick = target.burnTick || 0;
    target.burnDamage = damagePerTick;
    target.burnColor = color;
  }

  applyParalyze(target, durationSeconds = 0.8) {
    if (!target) return;
    if (typeof target.applyParalyze === 'function') {
      target.applyParalyze(durationSeconds);
      return;
    }
    target.stunTime = Math.max(target.stunTime || 0, durationSeconds);
  }

  castChainLightning(fromPlayer, toTarget, ability) {
    const enemies = this._enemyContext || [];
    if (!enemies.length) return false;

    let firstTarget = toTarget && toTarget.takeDamage ? toTarget : null;
    if (!firstTarget || firstTarget.dead) {
      const maxRange = ability.range || 220;
      let best = null;
      let bestDist = Infinity;
      const aimX = toTarget && typeof toTarget.x === 'number' ? toTarget.x : fromPlayer.x;
      const aimY = toTarget && typeof toTarget.y === 'number' ? toTarget.y : fromPlayer.y;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead) continue;
        const d = Math.hypot(enemy.x - fromPlayer.x, enemy.y - fromPlayer.y);
        const aimDist = Math.hypot(enemy.x - aimX, enemy.y - aimY);
        if (d <= maxRange && aimDist < bestDist) {
          best = enemy;
          bestDist = aimDist;
        }
      }
      firstTarget = best;
    }
    if (!firstTarget) return false;

    const chainCount = Math.max(1, ability.chainCount || 4);
    const jumpRadius = ability.chainRadius || 170;
    const hitList = [];
    let current = firstTarget;
    const used = new Set();

    for (let i = 0; i < chainCount && current; i++) {
      used.add(current);
      hitList.push(current);
      let next = null;
      let nearest = Infinity;
      for (const enemy of enemies) {
        if (!enemy || enemy.dead || used.has(enemy)) continue;
        const d = Math.hypot(enemy.x - current.x, enemy.y - current.y);
        if (d <= jumpRadius && d < nearest) {
          next = enemy;
          nearest = d;
        }
      }
      current = next;
    }

    let prevX = fromPlayer.x;
    let prevY = fromPlayer.y;
    for (let i = 0; i < hitList.length; i++) {
      const enemy = hitList[i];
      const falloff = 1 - i * 0.14;
      const dmg = this.calculateDamage({ ...ability, baseDamage: ability.baseDamage * Math.max(0.45, falloff) });
      enemy.takeDamage(dmg);
      this.applyParalyze(enemy, ability.paralyzeDuration || 1.2);
      this.spawnDamageFloat(enemy.x, enemy.y, dmg, '#FFE45E');
      this.lightningBeams.push({
        x1: prevX,
        y1: prevY,
        x2: enemy.x,
        y2: enemy.y,
        life: 0.18,
        maxLife: 0.18,
        color: ability.projectileColor || '#FFE45E'
      });
      prevX = enemy.x;
      prevY = enemy.y;
    }

    return hitList.length > 0;
  }

  castAirSlash(fromPlayer, toTarget, ability) {
    const enemies = this._enemyContext || [];
    const worldMap = this._worldContext || null;
    const maxRange = ability.range || 170;
    const targetDist = Math.hypot((toTarget.x || fromPlayer.x) - fromPlayer.x, (toTarget.y || fromPlayer.y) - fromPlayer.y);
    const angle = Math.atan2((toTarget.y || fromPlayer.y) - fromPlayer.y, (toTarget.x || fromPlayer.x) - fromPlayer.x);
    const centerDist = Math.min(maxRange, targetDist || maxRange * 0.65);
    const centerX = fromPlayer.x + Math.cos(angle) * centerDist;
    const centerY = fromPlayer.y + Math.sin(angle) * centerDist;
    const gustRadius = ability.gustRadius || 120;

    if (worldMap && typeof worldMap.stripLeavesAt === 'function') {
      worldMap.stripLeavesAt(centerX, centerY, ability.leafStripRadius || gustRadius + 20, 14);
    }

    let affected = 0;
    for (const enemy of enemies) {
      if (!enemy || enemy.dead) continue;
      const d = Math.hypot(enemy.x - centerX, enemy.y - centerY);
      if (d > gustRadius + (enemy.radius || 10)) continue;
      const impactScale = Math.max(0.42, 1 - d / Math.max(1, gustRadius));
      const dmg = this.calculateDamage({ ...ability, baseDamage: ability.baseDamage * impactScale });
      enemy.takeDamage(dmg);
      const dirX = enemy.x - centerX;
      const dirY = enemy.y - centerY;
      if (typeof enemy.launchAirborne === 'function') {
        enemy.launchAirborne(
          ability.launchDuration || 1.1,
          ability.launchUpward || 320,
          dirX,
          dirY,
          (ability.launchForce || 250) * impactScale,
          ability.spinSpeed || 14,
          Math.max(6, Math.round((ability.fallDamage || 16) * impactScale))
        );
      } else {
        this.applyKnockback({ x: centerX, y: centerY }, enemy);
      }
      this.spawnDamageFloat(enemy.x, enemy.y, dmg, '#C7ECFF');
      affected++;
    }

    for (let i = 0; i < 24; i++) {
      const a = angle + (Math.random() - 0.5) * 1.3;
      const r = Math.random() * gustRadius * 0.95;
      this.particles.push({
        x: centerX + Math.cos(a) * r,
        y: centerY + Math.sin(a) * r,
        vx: Math.cos(a) * (120 + Math.random() * 130),
        vy: Math.sin(a) * (120 + Math.random() * 130),
        life: 0.18 + Math.random() * 0.24,
        maxLife: 0.42,
        size: 1.5 + Math.random() * 1.8,
        color: Math.random() < 0.45 ? '#DDF6FF' : '#BDE8FF'
      });
    }

    return true;
  }

  castEarthSpike(fromPlayer, toTarget, ability) {
    const enemies = this._enemyContext || [];
    const radius = ability.spikeRadius || 115;
    const knockForce = ability.spikeKnockback || 200;

    // Burst center: between player and cursor, closer to player
    const dx = (toTarget.x || fromPlayer.x) - fromPlayer.x;
    const dy = (toTarget.y || fromPlayer.y) - fromPlayer.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy), radius * 0.55);
    const cX = fromPlayer.x + Math.cos(angle) * dist;
    const cY = fromPlayer.y + Math.sin(angle) * dist;

    let affected = 0;
    for (const enemy of enemies) {
      if (!enemy || enemy.dead) continue;
      const d = Math.hypot(enemy.x - cX, enemy.y - cY);
      if (d > radius + (enemy.radius || 10)) continue;
      const scale = Math.max(0.35, 1 - d / Math.max(1, radius));
      const dmg = this.calculateDamage({ ...ability, baseDamage: ability.baseDamage * scale });
      enemy.takeDamage(dmg);
      // Mini-launch upward + outward knockback
      if (typeof enemy.launchAirborne === 'function') {
        const ex = enemy.x - cX;
        const ey = enemy.y - cY;
        enemy.launchAirborne(
          0.55 + scale * 0.35,
          180 + scale * 140,
          ex, ey,
          knockForce * scale,
          6,
          Math.max(4, Math.round(10 * scale))
        );
      } else {
        this.applyKnockback({ x: cX, y: cY }, enemy);
      }
      if (ability.spikeStunDuration) {
        this.applyParalyze(enemy, ability.spikeStunDuration);
      }
      this.spawnDamageFloat(enemy.x, enemy.y, dmg, '#C8A96E');
      affected++;
    }

    // Rock/earth particles erupting upward
    const colors = ['#A0826D', '#8B6355', '#C8A96E', '#6B4C3B', '#D2B48C'];
    for (let i = 0; i < 32; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.9;
      const speed = 60 + Math.random() * 130;
      this.particles.push({
        x: cX + Math.cos(a) * r * 0.5,
        y: cY + Math.sin(a) * r * 0.5,
        vx: Math.cos(a) * speed * 0.6,
        vy: -speed * (0.6 + Math.random() * 0.8),
        life: 0.22 + Math.random() * 0.32,
        maxLife: 0.54,
        size: 2 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    // Ground crack ring particles
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      this.particles.push({
        x: cX + Math.cos(a) * radius * 0.85,
        y: cY + Math.sin(a) * radius * 0.85,
        vx: Math.cos(a) * 28,
        vy: Math.sin(a) * 28,
        life: 0.28,
        maxLife: 0.28,
        size: 2.5,
        color: '#8B6355'
      });
    }

    return true;
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

    // Lightning beams
    for (const beam of this.lightningBeams) {
      const alpha = Math.max(0, beam.life / beam.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = beam.color || '#FFE45E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(beam.x1 - camX, beam.y1 - camY);
      ctx.lineTo(beam.x2 - camX, beam.y2 - camY);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(beam.x1 - camX, beam.y1 - camY);
      ctx.lineTo(beam.x2 - camX, beam.y2 - camY);
      ctx.stroke();
      ctx.restore();
    }

    for (const projectile of this.projectiles) {
      const color = projectile.ability.projectileColor || '#FFFFFF';
      ctx.save();
      if (projectile.ability.waterPuddleDuration) {
        const px = projectile.x - camX;
        const py = projectile.y - camY - (projectile.z || 0);
        if ((projectile.z || 0) > 0) {
          ctx.fillStyle = 'rgba(20,50,80,0.20)';
          ctx.beginPath();
          ctx.ellipse(projectile.x - camX, projectile.y - camY + projectile.radius * 0.45, projectile.radius + 3, Math.max(2, projectile.radius * 0.65), 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(px, py, projectile.radius + 2, projectile.radius * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(170,230,255,0.8)';
        ctx.beginPath();
        ctx.ellipse(px - 2, py - 2, Math.max(2, projectile.radius * 0.42), Math.max(1.5, projectile.radius * 0.25), 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(projectile.x - camX, projectile.y - camY, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
      }
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
