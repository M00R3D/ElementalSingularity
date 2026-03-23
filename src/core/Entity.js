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
    this._nightCooldown = 0; // cooldown between night-group spawns
  }

  update(dt, input, realPlayer = null, worldMap = null, dayNightCycle = null) {
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

      enemy.stunTime = Math.max(0, (enemy.stunTime || 0) - dt);
      enemy.slipperyTime = Math.max(0, (enemy.slipperyTime || 0) - dt);
      const slippery = (enemy.slipperyTime || 0) > 0;
      const slipDecay = Math.max(0, 1 - (slippery ? (1 - (enemy.slipFriction || 0.92)) : 0.32) * dt * 60);
      enemy.slipVx = (enemy.slipVx || 0) * slipDecay;
      enemy.slipVy = (enemy.slipVy || 0) * slipDecay;
      enemy.x += (enemy.slipVx || 0) * dt;
      enemy.y += (enemy.slipVy || 0) * dt;

      // Limb animation phase for simple hands/feet movement
      enemy.limbPhase = (enemy.limbPhase || 0) + dt * (enemy.limbSpeed || 6);
      // Decay recent hit flash (set when takeDamage is called)
      enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - dt * 6);

      // Burn tick damage while the status is active.
      if (enemy.burnTime > 0) {
        enemy.burnTime = Math.max(0, enemy.burnTime - dt);
        enemy.burnTick -= dt;
        if (enemy.burnTick <= 0) {
          enemy.burnTick += 0.4;
          enemy.takeDamage(enemy.burnDamage || 3);
        }
      }

      // Airborne state: parabolic movement with spin and optional fall damage.
      if ((enemy.airborneTime || 0) > 0 || (enemy.z || 0) > 0) {
        enemy.airborneTime = Math.max(0, (enemy.airborneTime || 0) - dt);
        enemy.x += (enemy.airVx || 0) * dt;
        enemy.y += (enemy.airVy || 0) * dt;
        enemy.vz = (enemy.vz || 0) - (enemy.gravity || 640) * dt;
        enemy.z = (enemy.z || 0) + (enemy.vz || 0) * dt;
        enemy.spinAngle = (enemy.spinAngle || 0) + (enemy.spinSpeed || 0) * dt;

        if (!enemy.recoveredInAir && Math.random() < dt * (enemy.reactionRate || 0.55)) {
          enemy.recoveredInAir = true;
        }

        enemy.x = Math.max(enemy.radius, Math.min(this.width - enemy.radius, enemy.x));
        enemy.y = Math.max(enemy.radius, Math.min(this.height - enemy.radius, enemy.y));

        if ((enemy.z || 0) <= 0 && (enemy.vz || 0) <= 0) {
          enemy.z = 0;
          enemy.vz = 0;
          enemy.airborneTime = 0;
          enemy.vx += (enemy.airVx || 0) * 0.2;
          enemy.vy += (enemy.airVy || 0) * 0.2;
          const baseFallDamage = enemy.fallDamage || 0;
          const appliedFallDamage = enemy.recoveredInAir
            ? Math.max(0, Math.floor(baseFallDamage * 0.35))
            : baseFallDamage;
          if (appliedFallDamage > 0) {
            enemy.takeDamage(appliedFallDamage);
          }
          enemy.stunTime = Math.max(enemy.stunTime || 0, enemy.recoveredInAir ? 0.12 : 0.45);
          enemy.recoveredInAir = false;
          enemy.fallDamage = 0;
          enemy.airVx = 0;
          enemy.airVy = 0;
        } else {
          // Keep airborne enemies out of regular steering/attacks until they land.
          continue;
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

      // Movement: compute common vectors
      const tx = target.x - enemy.x;
      const ty = target.y - enemy.y;
      const tdist = Math.hypot(tx, ty) || 1;
      const maxSpd = enemy.speed || 85;

      // Passive animals wander; hostiles home to target
      if (enemy.stunTime > 0) {
        enemy.vx *= 0.75;
        enemy.vy *= 0.75;
      } else if (enemy.passive) {
        // gentle wandering motion
        enemy.wanderPhase = (enemy.wanderPhase || 0) + dt * 0.8;
        const wobble = Math.sin(enemy.wanderPhase) * 8;
        enemy.x += Math.cos(enemy.wanderPhase) * (enemy.speed || 20) * dt * 0.28 + (Math.random() - 0.5) * 6 * dt;
        enemy.y += Math.sin(enemy.wanderPhase) * (enemy.speed || 20) * dt * 0.28 + (Math.random() - 0.5) * 6 * dt;
      } else {
        // Homing hacia el jugador.
        enemy.vx += (tx / tdist) * (maxSpd * 0.65) * dt;
        enemy.vy += (ty / tdist) * (maxSpd * 0.65) * dt;
      }
      const spd = Math.hypot(enemy.vx, enemy.vy);
      if (spd > maxSpd) { enemy.vx = (enemy.vx / spd) * maxSpd; enemy.vy = (enemy.vy / spd) * maxSpd; }

      // Ataque del enemigo al jugador con cooldown (hostiles only)
      if (!enemy.passive && enemy.stunTime <= 0) {
        enemy.attackCooldown = Math.max(0, (enemy.attackCooldown || 0) - dt);
        if (tdist <= (enemy.attackRange || 26) && enemy.attackCooldown <= 0 && target.takeDamage) {
          target.takeDamage(enemy.attackDamage || 6);
          if (target.applyKnockback) target.applyKnockback(enemy.x, enemy.y, 270);
          enemy.attackCooldown = enemy.attackCooldownMax || 1.5;
          enemy.attackFlash = 0.45;
        }
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

      if ((enemy.extinguishSmokeTime || 0) > 0) {
        enemy.extinguishSmokeTime = Math.max(0, (enemy.extinguishSmokeTime || 0) - dt);
        if (Math.random() < 0.75) {
          this.particles.push({
            x: enemy.x + (Math.random() - 0.5) * enemy.radius * 1.6,
            y: enemy.y - enemy.radius * 0.2 + (Math.random() - 0.5) * enemy.radius,
            vx: (Math.random() - 0.5) * 20,
            vy: -22 - Math.random() * 28,
            life: 0.22 + Math.random() * 0.25,
            maxLife: 0.55,
            size: 1.8 + Math.random() * 2.6,
            color: Math.random() < 0.55 ? '#a6afb8' : '#c2c8cf'
          });
        }
      }
    }

    // Auto-spawn entities around the player at intervals.
    // Daytime: occasional passive animals. Nighttime: spawn hostiles in groups (2-3) with a 10s cooldown.
    // Reduce night cooldown timer
    this._nightCooldown = Math.max(0, (this._nightCooldown || 0) - dt);
    this._spawnTimer += dt;
    const daySpawnInterval = this.enemies.length < 5 ? 2 : 5;

    const spawnTarget = realPlayer || this.player;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 350 + Math.random() * 150;
    const baseX = Math.max(30, Math.min(this.width  - 30, spawnTarget.x + Math.cos(angle) * dist));
    const baseY = Math.max(30, Math.min(this.height - 30, spawnTarget.y + Math.sin(angle) * dist));

    if (dayNightCycle && dayNightCycle.isNight) {
      // Night: spawn groups of 2-3 hostiles every 10 seconds (if under cap)
      // Count only hostile enemies for the night cap (exclude passive animals)
      const nightCap = Math.min(this.maxEnemies, 10);
      let currentHostiles = this.enemies.filter(e => !e.passive).length;
      if (this._nightCooldown <= 0 && currentHostiles < nightCap) {
        const groupCount = Math.random() < 0.5 ? 2 : 3;
        let spawned = 0;
        for (let g = 0; g < groupCount; g++) {
          if (currentHostiles >= nightCap || this.enemies.length >= this.maxEnemies) break;
          // spread each member slightly
          const a = angle + (g - (groupCount-1)/2) * 0.5;
          const r = dist + (Math.random() - 0.5) * 40;
          const sx = Math.max(30, Math.min(this.width - 30, spawnTarget.x + Math.cos(a) * r));
          const sy = Math.max(30, Math.min(this.height - 30, spawnTarget.y + Math.sin(a) * r));
          const pool = ['goblin', 'goblin', 'goblin', 'skeleton', 'orc'];
          const typeId = pool[Math.floor(Math.random() * pool.length)];
          this.spawnEnemy(sx, sy, typeId);
          spawned++;
          currentHostiles++;
        }
        if (spawned > 0) {
          this._nightCooldown = 10.0;
          this._spawnTimer = 0;
        }
      }
    } else {
      // Day: occasional passive animals using existing day interval
      if (this._spawnTimer >= daySpawnInterval && this.enemies.length < this.maxEnemies) {
        this._spawnTimer = 0;
        const pool = ['cow', 'chicken'];
        const typeId = pool[Math.floor(Math.random() * pool.length)];
        this.spawnEnemy(baseX, baseY, typeId);
      }
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
      const syGround = enemy.y - offY;
      const sy = syGround - (enemy.z || 0);
      if ((enemy.z || 0) > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(sx, syGround + enemy.radius * 0.55, enemy.radius * 0.88, enemy.radius * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Body with subtle deformation when moving/attacking/hit
      const moveFactor = Math.min(1, Math.hypot(enemy.vx, enemy.vy) / (enemy.speed || 60));
      const deform = 1 + Math.sin(enemy.limbPhase || 0) * 0.03 + (enemy.attackFlash || 0) * 0.12 + (enemy.burnTime > 0 ? 0.06 : 0);
      ctx.save();
      ctx.translate(sx, sy);
      if ((enemy.z || 0) > 0) {
        ctx.rotate(enemy.spinAngle || 0);
      }
      ctx.scale(1 + Math.sin(enemy.limbPhase || 0) * 0.02, 1 - Math.abs(Math.sin(enemy.limbPhase || 0)) * 0.03);
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Face: draw eyes/mouth depending on enemy type (animals/monsters)
      const faceY = sy - 2;
      const eyeXOff = Math.max(4, enemy.radius * 0.45);
      const id = (enemy.typeId || 'goblin').toLowerCase();
      // Simple species detection
      let species = 'default';
      if (id.includes('cow')) species = 'cow';
      else if (id.includes('chicken')) species = 'chicken';
      else if (id.includes('goblin')) species = 'goblin';
      else if (id.includes('orc')) species = 'orc';
      else if (id.includes('skeleton')) species = 'skeleton';
      else if (id.includes('shade')) species = 'shade';

      // Species-specific limbs (patas/extremidades)
      const phase = enemy.limbPhase || 0;
      const swing = Math.sin(phase) * 3;
      
      if (species === 'cow') {
        // Cow: 4 legs in quadruped style (2 front, 2 back) - marrón
        ctx.fillStyle = '#8B6914'; // brown
        const legSize = 4;
        // Front legs
        ctx.beginPath(); ctx.arc(sx - 8, sy + enemy.radius + 6 + Math.abs(Math.sin(phase)) * 1.5, legSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 8, sy + enemy.radius + 6 - Math.abs(Math.sin(phase)) * 1.5, legSize, 0, Math.PI * 2); ctx.fill();
        // Back legs
        ctx.beginPath(); ctx.arc(sx - 6, sy + enemy.radius + 8 + Math.abs(Math.sin(phase + Math.PI)) * 1.5, legSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 6, sy + enemy.radius + 8 - Math.abs(Math.sin(phase + Math.PI)) * 1.5, legSize, 0, Math.PI * 2); ctx.fill();
      } else if (species === 'chicken') {
        // Chicken: 2 orange legs
        ctx.fillStyle = '#FFA500'; // orange
        const legSize = 3;
        ctx.beginPath(); ctx.arc(sx - 3, sy + enemy.radius + 7, legSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 3, sy + enemy.radius + 7, legSize, 0, Math.PI * 2); ctx.fill();
      } else {
        // Default/Goblin/Orc/Skeleton: 4 generic limbs (arms + feet)
        const armOffset = enemy.radius + 4;
        const limbSize = 5;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(sx - armOffset + swing, sy - 2 + swing * 0.2, limbSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + armOffset - swing, sy - 2 - swing * 0.2, limbSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(sx - 4, sy + enemy.radius + 4 + Math.abs(Math.sin(phase)) * 1.2, limbSize - 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 4, sy + enemy.radius + 4 - Math.abs(Math.sin(phase)) * 1.2, limbSize - 1, 0, Math.PI * 2); ctx.fill();
      }
      const isPassive = !!enemy.passive;
      const isBurning = enemy.burnTime > 0;
      const isAttacking = enemy.attackFlash > 0.2;

      // Choose eye/mouth color with enough contrast against body color
      const parseHex = (h) => {
        if (!h || h[0] !== '#') return { r: 34, g: 34, b: 34 };
        const v = h.slice(1);
        const hex = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
        return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
      };
      const bodyRgb = parseHex(enemy.color || '#222222');
      const luminance = (0.2126 * bodyRgb.r + 0.7152 * bodyRgb.g + 0.0722 * bodyRgb.b) / 255;
      const eyeColor = luminance > 0.5 ? '#0a0a0a' : '#ffffff';
      // Eyes
      ctx.fillStyle = eyeColor;
      if (isAttacking) {
        ctx.fillRect(sx - eyeXOff - 2, faceY - 3, 4, 3);
        ctx.fillRect(sx + eyeXOff - 2, faceY - 3, 4, 3);
      } else {
        // type-specific eye styles
        if (species === 'cow') {
          ctx.beginPath(); ctx.arc(sx - eyeXOff * 0.6, faceY - 3, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(sx + eyeXOff * 0.6, faceY - 3, 2.2, 0, Math.PI * 2); ctx.fill();
        } else if (species === 'chicken' || species === 'bird') {
          ctx.beginPath(); ctx.arc(sx - eyeXOff * 0.6, faceY - 3, 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(sx + eyeXOff * 0.6, faceY - 3, 1.6, 0, Math.PI * 2); ctx.fill();
        } else if (species === 'goblin' || species === 'orc') {
          // sly eyes
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(sx - eyeXOff, faceY - 3, 3, 2.2, -0.25, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(sx + eyeXOff, faceY - 3, 3, 2.2, 0.25, 0, Math.PI * 2); ctx.fill();
        } else if (species === 'skeleton' || species === 'shade' || species === 'revenant' || species === 'ghost') {
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sx - eyeXOff, faceY - 3, 3.4, 4.0, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(sx + eyeXOff, faceY - 3, 3.4, 4.0, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(sx - eyeXOff, faceY - 3, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(sx + eyeXOff, faceY - 3, 2, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Mouth / expression (species-specific snouts)
      ctx.strokeStyle = eyeColor; ctx.lineWidth = 1;
      if (species === 'cow') {
        // Cow: visible snout patch with nostrils (always shown, even if passive)
        ctx.fillStyle = '#d3b77b';
        ctx.beginPath();
        ctx.ellipse(sx, faceY + 4.5, 6.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6f5430';
        ctx.beginPath(); ctx.arc(sx - 2.2, faceY + 4.5, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 2.2, faceY + 4.5, 0.9, 0, Math.PI * 2); ctx.fill();
      } else if (species === 'chicken') {
        // Chicken: small orange beak (always shown, even if passive)
        ctx.beginPath();
        ctx.moveTo(sx - 2.8, faceY + 2.8);
        ctx.lineTo(sx + 2.8, faceY + 2.8);
        ctx.lineTo(sx, faceY + 5.8);
        ctx.closePath();
        ctx.fillStyle = '#ff9800';
        ctx.fill();
      } else if (isBurning) {
        // Distressed expression: inverted arc
        ctx.beginPath(); ctx.lineWidth = 2; ctx.arc(sx, faceY + 6, 6, Math.PI * 0.05, Math.PI * 0.95, true); ctx.stroke();
      } else if (isAttacking) {
        // Angry serious mouth
        ctx.fillStyle = eyeColor;
        ctx.fillRect(sx - 5, faceY + 2, 10, 3);
      } else if (isPassive) {
        // Gentle smile when not in danger (for passive non-animal defaults)
        ctx.beginPath(); ctx.arc(sx, faceY + 4, 5, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      } else if (species === 'goblin' || species === 'orc') {
        // Goblin/Orc: large mouth with grin + teeth
        ctx.beginPath();
        ctx.moveTo(sx - 5, faceY + 4);
        ctx.lineTo(sx + 5, faceY + 4);
        ctx.lineWidth = 2;
        ctx.stroke();
        // Small teeth marks
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 3, faceY + 4, 1, 2);
        ctx.fillRect(sx - 0.5, faceY + 4, 1, 2);
        ctx.fillRect(sx + 2, faceY + 4, 1, 2);
      } else if (species === 'skeleton') {
        // Skeleton: rictus grin (wide jawline)
        ctx.beginPath();
        ctx.moveTo(sx - 7, faceY + 5);
        ctx.lineTo(sx + 7, faceY + 5);
        ctx.lineWidth = 2;
        ctx.stroke();
        // Teeth marks along jaw
        for (let i = -6; i <= 6; i += 2) {
          ctx.beginPath();
          ctx.moveTo(sx + i, faceY + 5);
          ctx.lineTo(sx + i, faceY + 7);
          ctx.stroke();
        }
      } else {
        // Default: generic smile
        ctx.beginPath();
        ctx.arc(sx, faceY + 3, 5, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }

      // Hurt tint overlay (red flash) based on hitFlash
      const hurt = Math.min(1, enemy.hitFlash || 0);
      if (hurt > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.9, 0.35 * hurt);
        ctx.fillStyle = '#ff6666';
        ctx.beginPath(); ctx.arc(sx, sy, enemy.radius * 1.02, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

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

      if ((enemy.z || 0) > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(210,230,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, enemy.radius + 7, enemy.spinAngle || 0, (enemy.spinAngle || 0) + Math.PI * 1.35);
        ctx.stroke();
        ctx.restore();
      }

      // DEBUG: Show typeId & species above mob
      ctx.fillStyle = '#FFFF00';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${enemy.typeId}`, sx, sy - enemy.radius - 16);

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
      limbPhase: Math.random() * Math.PI * 2,
      limbSpeed: 4 + Math.random() * 6,
      hitFlash: 0,
      // passive flag for animals
      passive: (typeId === 'cow' || typeId === 'chicken'),
      wanderPhase: Math.random() * Math.PI * 2,
      // ensure animals are slower
      speed: (typeId === 'cow' ? 28 : (typeId === 'chicken' ? 46 : speed)),
      speed,
      dead:     false,
      _dropped: false,
      burnTime:  0,
      burnTick:  0,
      burnDamage: 3,
      burnColor: '#FF4500',
      extinguishSmokeTime: 0,
      attackCooldown:    0,
      attackCooldownMax: 1.5,
      attackRange: radius + 16,
      attackDamage: dmg,
      attackFlash: 0,
      stunTime: 0,
      slipperyTime: 0,
      slipVx: 0,
      slipVy: 0,
      slipFriction: 0.92,
      airborneTime: 0,
      z: 0,
      vz: 0,
      gravity: 640,
      airVx: 0,
      airVy: 0,
      spinAngle: 0,
      spinSpeed: 0,
      fallDamage: 0,
      recoveredInAir: false,
      reactionRate: 0.55,
      xpValue:    xpVal,
      lootItem:   lootId,
      lootChance: lootCh,
      typeId,
      applyParalyze(duration = 0.8) {
        this.stunTime = Math.max(this.stunTime || 0, duration);
      },
      applySlippery(duration = 1.2, dirX = 0, dirY = 0, force = 110, friction = 0.92) {
        this.slipperyTime = Math.max(this.slipperyTime || 0, duration);
        this.slipFriction = Math.max(0.82, Math.min(0.98, friction || 0.92));
        const mag = Math.hypot(dirX, dirY) || 1;
        this.slipVx = (this.slipVx || 0) + (dirX / mag) * force;
        this.slipVy = (this.slipVy || 0) + (dirY / mag) * force;
      },
      launchAirborne(duration = 1.0, upVelocity = 300, dirX = 0, dirY = 0, horizontalForce = 220, spinSpeed = 14, fallDamage = 16) {
        const mag = Math.hypot(dirX, dirY) || 1;
        this.airborneTime = Math.max(this.airborneTime || 0, duration);
        this.vz = Math.max(this.vz || 0, upVelocity);
        this.airVx = (dirX / mag) * horizontalForce;
        this.airVy = (dirY / mag) * horizontalForce;
        this.spinSpeed = spinSpeed;
        this.fallDamage = Math.max(this.fallDamage || 0, fallDamage);
        this.recoveredInAir = false;
        this.stunTime = Math.max(this.stunTime || 0, duration * 0.65);
      },
      takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 1; // trigger red tint briefly
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
