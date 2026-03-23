// ========================================
// WorldMap - Procedural World Generation
// Handles: background tiles, trees, rocks, drops
// ========================================

import { buildHitboxProfile, WORLD_HITBOX_TEMPLATES } from './PhysicsConfig.js';

export class WorldMap {
  constructor(config = {}) {
    this.width  = config.width  || 2400;
    this.height = config.height || 1800;
    this.trees  = [];
    this.rocks  = [];
    this.drops  = [];
    this.puddles = [];
    this._generate(config.seed || 1337, config.treeCount || 40, config.rockCount || 25);
  }

  getMinimapBackgroundColor(worldX, worldY) {
    const tw = 80;
    const th = 80;
    const column = Math.floor(worldX / tw);
    const row = Math.floor(worldY / th);
    const palette = ['#18290d', '#1c2f10', '#162608', '#1f330d', '#1a2c0b'];
    const variant = Math.abs((column * 7) ^ (row * 13)) % palette.length;
    return palette[variant];
  }

  // ── Seeded LCG RNG ──────────────────────────────────────────────────────
  _rng(seed) {
    let s = (seed | 0) || 1;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) | 0;
      return (s >>> 0) / 0x100000000;
    };
  }

  // ── Procedural generation ───────────────────────────────────────────────
  _generate(seed, treeCount, rockCount) {
    const rng = this._rng(seed);
    const cx  = this.width  / 2;
    const cy  = this.height / 2;
    const treeHitboxProfile = buildHitboxProfile(WORLD_HITBOX_TEMPLATES.tree, 1);
    const stumpHitboxProfile = buildHitboxProfile(WORLD_HITBOX_TEMPLATES.stump, 1);

    // Trees – avoid the player spawn zone (200 px radius around centre)
    for (let i = 0; i < treeCount; i++) {
      let x, y, tries = 0, overlap = false;
      do {
        x = rng() * (this.width  - 100) + 50;
        y = rng() * (this.height - 100) + 50;
        tries++;
      } while (tries < 30 && Math.hypot(x - cx, y - cy) < 200);

      for (const t of this.trees) {
        if (Math.hypot(x - t.x, y - t.y) < 55) { overlap = true; break; }
      }
      if (overlap) continue;

      this.trees.push({
        x,
        y,
        homeX: x,
        homeY: y,
        hp: 3,
        maxHp: 3,
        radius: 22,
        state: 'alive',
        hitFlash: 0,
        leaflessTime: 0,
        wetTime: 0,
        swayTime: 0,
        swayPower: 0,
        swayPhase: Math.random() * Math.PI * 2,
        smokeParticles: [],
        hitboxOffsets: treeHitboxProfile.hitboxOffsets,
        hitboxRadii: treeHitboxProfile.hitboxRadii,
        hitboxZOffsets: treeHitboxProfile.hitboxZOffsets,
        hitboxHeights: treeHitboxProfile.hitboxHeights,
        stumpHitboxOffsets: stumpHitboxProfile.hitboxOffsets,
        stumpHitboxRadii: stumpHitboxProfile.hitboxRadii,
        stumpHitboxZOffsets: stumpHitboxProfile.hitboxZOffsets,
        stumpHitboxHeights: stumpHitboxProfile.hitboxHeights
      });
    }

    // Rocks
    for (let i = 0; i < rockCount; i++) {
      let x, y, tries = 0;
      do {
        x = rng() * (this.width  - 80) + 40;
        y = rng() * (this.height - 80) + 40;
        tries++;
      } while (tries < 30 && Math.hypot(x - cx, y - cy) < 150);

      const sz = 10 + rng() * 14;
      const rockHitboxProfile = buildHitboxProfile(WORLD_HITBOX_TEMPLATES.rock, sz);
      this.rocks.push({
        x, y,
        rx: sz,
        ry: sz * 0.62,
        angle: rng() * Math.PI,
        shade: 35 + (rng() * 30 | 0),
        hitboxOffsets: rockHitboxProfile.hitboxOffsets,
        hitboxRadii: rockHitboxProfile.hitboxRadii,
        hitboxZOffsets: rockHitboxProfile.hitboxZOffsets,
        hitboxHeights: rockHitboxProfile.hitboxHeights
      });
    }
  }

  getCollisionBodies() {
    const bodies = [];

    for (const tree of this.trees) {
      if (!tree || tree.state === 'burnt') continue;
      const scale = tree.state === 'stump' ? 0.72 : 1;
      bodies.push({
        kind: 'tree',
        solid: true,
        ref: tree,
        x: tree.x,
        y: tree.y,
        z: 0,
        hitboxOffsets: tree.state === 'stump'
          ? (tree.stumpHitboxOffsets || [{ x: 0, y: 8 }])
          : (tree.hitboxOffsets || [{ x: 0, y: 12 }]).map((offset) => ({
              x: offset.x || 0,
              y: (offset.y || 0) * scale
            })),
        hitboxRadii: tree.state === 'stump'
          ? tree.stumpHitboxRadii || [6.5]
          : (tree.hitboxRadii || [9]).map((radius) => radius * scale),
        hitboxZOffsets: tree.state === 'stump'
          ? tree.stumpHitboxZOffsets || [0]
          : tree.hitboxZOffsets || [0],
        hitboxHeights: tree.state === 'stump'
          ? tree.stumpHitboxHeights || [14]
          : tree.hitboxHeights || [28]
      });
    }

    for (const rock of this.rocks) {
      if (!rock) continue;
      bodies.push({
        kind: 'rock',
        solid: true,
        ref: rock,
        x: rock.x,
        y: rock.y,
        z: 0,
        hitboxOffsets: rock.hitboxOffsets || [{ x: 0, y: 0 }],
        hitboxRadii: rock.hitboxRadii || [Math.max(8, Math.min(rock.rx || 10, rock.ry || 8))],
        hitboxZOffsets: rock.hitboxZOffsets || [0],
        hitboxHeights: rock.hitboxHeights || [18]
      });
    }

    return bodies;
  }

  // ── Update ───────────────────────────────────────────────────────────────
  update(dt) {
    for (const tree of this.trees) {
      if (tree.hitFlash > 0) tree.hitFlash -= dt * 5;
      tree.leaflessTime = Math.max(0, (tree.leaflessTime || 0) - dt);
      tree.wetTime = Math.max(0, (tree.wetTime || 0) - dt);
      tree.swayTime = Math.max(0, (tree.swayTime || 0) - dt);
      tree.swayPower = Math.max(0, (tree.swayPower || 0) - dt * 0.9);
      tree.swayPhase = (tree.swayPhase || 0) + dt * (6 + (tree.swayPower || 0) * 2.5);
      tree.x += ((tree.homeX ?? tree.x) - tree.x) * Math.min(1, dt * 4);
      tree.y += ((tree.homeY ?? tree.y) - tree.y) * Math.min(1, dt * 4);

      if (tree.fireParticles) {
        for (let i = tree.fireParticles.length - 1; i >= 0; i--) {
          const p = tree.fireParticles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy -= 80 * dt; // Gravity
          p.life -= dt;
          if (p.life <= 0) tree.fireParticles.splice(i, 1);
        }
      }
      if (tree.smokeParticles) {
        for (let i = tree.smokeParticles.length - 1; i >= 0; i--) {
          const p = tree.smokeParticles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.96;
          p.life -= dt;
          if (p.life <= 0) tree.smokeParticles.splice(i, 1);
        }
      }
    }
    this.updateTreeBurn(dt);
    for (const drop of this.drops) {
      if (!drop.collected) drop._t = ((drop._t || 0) + dt);
    }
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const puddle = this.puddles[i];
      puddle.life -= dt;
      puddle.t = (puddle.t || 0) + dt;
      if (puddle.life <= 0) this.puddles.splice(i, 1);
    }
    // Remove collected drops immediately (tiny perf)
    this.drops = this.drops.filter(d => !d.collected);
  }

  spawnWaterPuddle(x, y, radius = 28, duration = 4.5, friction = 0.92, slipDuration = 1.8) {
    this.puddles.push({
      x,
      y,
      radius: Math.max(14, Math.min(56, radius || 28)),
      life: Math.max(0.5, duration || 4.5),
      maxLife: Math.max(0.5, duration || 4.5),
      friction: Math.max(0.82, Math.min(0.98, friction || 0.92)),
      slipDuration: Math.max(0.3, slipDuration || 1.8),
      t: 0
    });
  }

  _emitTreeSmoke(tree, count = 10) {
    if (!tree) return;
    tree.smokeParticles = tree.smokeParticles || [];
    for (let i = 0; i < count; i++) {
      tree.smokeParticles.push({
        x: tree.x + (Math.random() - 0.5) * 20,
        y: tree.y - 8 + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 22,
        vy: -18 - Math.random() * 38,
        life: 0.35 + Math.random() * 0.45,
        maxLife: 0.8,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.55 ? '#9aa3ad' : '#c4c9cf'
      });
    }
  }

  extinguishTreesInRadius(x, y, radius = 34) {
    let count = 0;
    for (const tree of this.trees) {
      if (Math.hypot(tree.x - x, tree.y - y) > radius + (tree.radius || 0) * 0.6) continue;
      if (tree.state === 'burning') {
        tree.state = 'alive';
        tree.burnDuration = 0;
        tree.fireParticles = [];
        tree.color = null;
        tree.hp = Math.max(1, tree.hp || tree.maxHp || 3);
        this._emitTreeSmoke(tree, 12);
        count++;
      }
      tree.wetTime = Math.max(tree.wetTime || 0, 4.8);
    }
    return count;
  }

  soakTreesInRadius(x, y, radius = 40, wetDuration = 4.8) {
    let soaked = 0;
    for (const tree of this.trees) {
      if (tree.state === 'stump' || tree.state === 'burnt') continue;
      if (Math.hypot(tree.x - x, tree.y - y) > radius + (tree.radius || 0) * 0.7) continue;
      tree.wetTime = Math.max(tree.wetTime || 0, wetDuration);
      if (tree.state === 'burning') {
        tree.state = 'alive';
        tree.burnDuration = 0;
        tree.fireParticles = [];
        tree.color = null;
        tree.hp = Math.max(1, tree.hp || tree.maxHp || 3);
        this._emitTreeSmoke(tree, 13);
      }
      soaked++;
    }
    return soaked;
  }

  applyPuddleEffects(player, enemies = [], dt = 0.016) {
    if (!player) return;
    for (const puddle of this.puddles) {
      this.soakTreesInRadius(puddle.x, puddle.y, puddle.radius * 0.92, 5.2);
      this.extinguishTreesInRadius(puddle.x, puddle.y, puddle.radius * 0.85);

      const toPX = player.x - puddle.x;
      const toPY = player.y - puddle.y;
      const pDist = Math.hypot(toPX, toPY);
      if (pDist <= (puddle.radius + (player.radius || 12))) {
        if (typeof player.applySlippery === 'function') {
          player.applySlippery(puddle.slipDuration, toPX, toPY, 120, puddle.friction);
        }
      }

      for (const enemy of enemies) {
        if (!enemy || enemy.dead) continue;
        const toEX = enemy.x - puddle.x;
        const toEY = enemy.y - puddle.y;
        const eDist = Math.hypot(toEX, toEY);
        if (eDist <= (puddle.radius + (enemy.radius || 10))) {
          if ((enemy.burnTime || 0) > 0) {
            enemy.burnTime = 0;
            enemy.burnTick = 0;
            enemy.extinguishSmokeTime = Math.max(enemy.extinguishSmokeTime || 0, 0.35);
          }
          if (typeof enemy.applySlippery === 'function') {
            enemy.applySlippery(puddle.slipDuration, toEX, toEY, 95, puddle.friction);
          }
        }
      }
    }
  }

  stripLeavesAt(x, y, radius = 120, duration = 12) {
    let count = 0;
    for (const tree of this.trees) {
      if (tree.state !== 'alive') continue;
      if (Math.hypot(tree.x - x, tree.y - y) > radius + (tree.radius || 0)) continue;
      tree.leaflessTime = Math.max(tree.leaflessTime || 0, duration);
      count++;
    }
    return count;
  }

  joltTreesAt(x, y, radius = 120, intensity = 1.0, maxDisplace = 8, swayDuration = 0.65) {
    let moved = 0;
    for (const tree of this.trees) {
      if (tree.state === 'stump' || tree.state === 'burnt') continue;
      const d = Math.hypot(tree.x - x, tree.y - y);
      if (d > radius + (tree.radius || 0) * 0.65) continue;
      const scale = Math.max(0.2, 1 - d / Math.max(1, radius));
      const dirX = (tree.x - x) / Math.max(1, d);
      const dirY = (tree.y - y) / Math.max(1, d);
      const push = maxDisplace * scale * intensity;
      tree.x += dirX * push;
      tree.y += dirY * push * 0.75;
      tree.swayTime = Math.max(tree.swayTime || 0, swayDuration * (0.7 + scale * 0.6));
      tree.swayPower = Math.max(tree.swayPower || 0, 0.35 + scale * 1.15 * intensity);
      moved++;
    }
    return moved;
  }

  // ── Drops ────────────────────────────────────────────────────────────────
  spawnDrop(x, y, type, value) {
    this.drops.push({ x, y, type, value, collected: false, _t: 0 });
  }

  collectDrops(player, radius = 35) {
    const collected = [];
    for (const drop of this.drops) {
      if (drop.collected) continue;
      if (Math.hypot(player.x - drop.x, player.y - drop.y) <= radius) {
        drop.collected = true;
        collected.push(drop);
      }
    }
    return collected;
  }

  // ── Tree harvesting ──────────────────────────────────────────────────────
  harvestTreeAt(worldX, worldY, playerX, playerY, playerReach = 90, hasAxe = false) {
    for (const tree of this.trees) {
      if (tree.state === 'stump' || tree.state === 'burning' || tree.state === 'burnt') continue;
      if (Math.hypot(playerX - tree.x, playerY - tree.y) > playerReach) continue;
      if (Math.hypot(worldX  - tree.x, worldY  - tree.y) > tree.radius + 18) continue;

      // Can only harvest alive trees with an axe (basicAttack cannot cut)
      if (!hasAxe) return { fell: false, reason: 'needs_axe', tree };

      tree.hp--;
      tree.hitFlash = 0.6;
      const fell = tree.hp <= 0;

      if (fell) {
        tree.state = 'stump';
        this.spawnDrop(tree.x, tree.y, 'xp', 8);
        this.spawnDrop(
          tree.x + (Math.random() - 0.5) * 24,
          tree.y + (Math.random() - 0.5) * 24,
          'wood', 1 + (Math.random() < 0.6 ? 1 : 0)
        );
        if (Math.random() < 0.3) {
          this.spawnDrop(
            tree.x + (Math.random() - 0.5) * 30,
            tree.y + (Math.random() - 0.5) * 30,
            'wood', 1
          );
        }
      }
      return { fell, tree };
    }
    return null;
  }

  // ── Tree burning ────────────────────────────────────────────────────────
  burnTreeAt(treeX, treeY, radius = 50) {
    let burned = [];
    for (const tree of this.trees) {
      if (tree.state === 'stump' || tree.state === 'burnt' || tree.state === 'burning') continue;
      if (Math.hypot(treeX - tree.x, treeY - tree.y) > radius) continue;

      tree.state = 'burning';
      tree.burnDuration = 3.0; // Burn for 3 seconds
      tree.maxBurnDuration = tree.burnDuration;
      tree.fireParticles = [];
      burned.push(tree);
    }
    return burned;
  }

  updateTreeBurn(dt) {
    for (const tree of this.trees) {
      if (tree.state !== 'burning') continue;

      tree.burnDuration -= dt;

      // Spawn fire particles
      if (Math.random() < 0.3) {
        tree.fireParticles.push({
          x: tree.x + (Math.random() - 0.5) * 20,
          y: tree.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 40,
          vy: -60 - Math.random() * 40,
          life: 0.8,
          maxLife: 0.8,
          color: Math.random() < 0.6 ? '#FF5500' : '#FFD700'
        });
      }

      if (tree.burnDuration <= 0) {
        tree.state = 'burnt';
        tree.color = '#2a2a1a';
        // Drop burnt wood and charcoal
        this.spawnDrop(tree.x, tree.y, 'xp', 5);
        for (let i = 0; i < 2; i++) {
          this.spawnDrop(
            tree.x + (Math.random() - 0.5) * 30,
            tree.y + (Math.random() - 0.5) * 30,
            Math.random() < 0.6 ? 'burnt_wood' : 'charcoal',
            1
          );
        }
      }
    }
  }

  // ── Drawing ──────────────────────────────────────────────────────────────
  drawBackground(ctx, camera) {
    const tw = 80, th = 80;
    const c0 = Math.floor(camera.x / tw);
    const r0 = Math.floor(camera.y / th);
    const c1 = c0 + Math.ceil(camera.viewWidth  / tw) + 1;
    const r1 = r0 + Math.ceil(camera.viewHeight / th) + 1;
    const palette = ['#18290d', '#1c2f10', '#162608', '#1f330d', '#1a2c0b'];

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const v = Math.abs((c * 7) ^ (r * 13)) % 5;
        ctx.fillStyle = palette[v];
        ctx.fillRect(c * tw - camera.x, r * th - camera.y, tw, th);
      }
    }

    // World boundary
    ctx.strokeStyle = 'rgba(220, 90, 30, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camera.x, -camera.y, this.width, this.height);
  }

  drawObjects(ctx, camera) {
    // Water puddles (under rocks/trees/entities)
    for (const puddle of this.puddles) {
      if (!camera.isVisible(puddle.x, puddle.y, puddle.radius + 6)) continue;
      const sx = puddle.x - camera.x;
      const sy = puddle.y - camera.y;
      const alpha = Math.max(0.18, (puddle.life / puddle.maxLife) * 0.35);
      const wave = Math.sin((puddle.t || 0) * 3.8) * 1.6;

      ctx.save();
      ctx.fillStyle = `rgba(55, 150, 255, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, puddle.radius + wave, puddle.radius * 0.58 + wave * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(155, 220, 255, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(sx - puddle.radius * 0.22, sy - puddle.radius * 0.1, puddle.radius * 0.32, puddle.radius * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Rocks (drawn under trees)
    for (const rock of this.rocks) {
      if (!camera.isVisible(rock.x, rock.y, rock.rx + 5)) continue;
      const sx = rock.x - camera.x;
      const sy = rock.y - camera.y;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rock.angle);
      const sh = rock.shade;
      ctx.fillStyle = `rgb(${sh + 8},${sh + 6},${sh})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, rock.rx, rock.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.ellipse(-rock.rx * 0.2, -rock.ry * 0.3, rock.rx * 0.38, rock.ry * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Trees
    for (const tree of this.trees) {
      if (!camera.isVisible(tree.x, tree.y, tree.radius + 10)) continue;
      const sx = tree.x - camera.x;
      const sy = tree.y - camera.y;
      const swayAmt = (tree.swayTime || 0) > 0 ? Math.sin(tree.swayPhase || 0) * (tree.swayPower || 0) * 3.4 : 0;
      const wetFactor = Math.max(0, Math.min(1, (tree.wetTime || 0) / 4.8));
      const trunkShiftX = swayAmt * 0.35;
      const canopyShiftX = swayAmt;

      if (tree.state === 'stump' || tree.state === 'burnt') {
        // Stump or burnt tree
        const color = tree.state === 'burnt' ? '#1a1a1a' : '#5a3010';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(sx + trunkShiftX, sy, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = tree.state === 'burnt' ? '#0a0a0a' : '#7a4520';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (tree.state === 'burning') {
        // Burning tree - deform trunk and canopy based on burn progress and hit flash
        const burnProgress = 1 - (tree.burnDuration / tree.maxBurnDuration);
        const flash = tree.hitFlash || 0;
        // soft shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx + 5, sy + tree.radius * 0.6, tree.radius * 0.8, tree.radius * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        // Deform using translate+scale so trunk and canopy squash/stretch
        ctx.save();
        ctx.translate(sx + trunkShiftX, sy);
        const sxScale = 1 + burnProgress * 0.08 + flash * 0.03;
        const syScale = 1 - burnProgress * 0.18 - flash * 0.06;
        ctx.scale(sxScale, syScale);
        // Trunk (relative coords)
        ctx.fillStyle = '#3a1a00';
        ctx.fillRect(-5, -4, 10, tree.radius + 10);
        // Burning canopy (relative coords)
        ctx.fillStyle = `rgba(${Math.floor(255 - burnProgress * 100)},${Math.floor(100 + burnProgress * 50)},0,0.9)`;
        ctx.beginPath();
        ctx.arc(canopyShiftX * 0.25, -10, tree.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Glow (draw after restoring to avoid scaling glow)
        ctx.fillStyle = `rgba(255,100,0,${0.4 * (1 - burnProgress)})`;
        ctx.beginPath();
        ctx.arc(sx + canopyShiftX * 0.35, sy - 10, tree.radius + 8, 0, Math.PI * 2);
        ctx.fill();
        // Draw fire particles (no transform)
        if (tree.fireParticles) {
          ctx.save();
          for (const p of tree.fireParticles) {
            ctx.globalAlpha = (p.life / p.maxLife) * 0.7;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx + trunkShiftX + (p.x - tree.x), sy + (p.y - tree.y), 4 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        if (tree.smokeParticles && tree.smokeParticles.length > 0) {
          ctx.save();
          for (const p of tree.smokeParticles) {
            ctx.globalAlpha = (p.life / p.maxLife) * 0.65;
            ctx.fillStyle = p.color || '#aab2bb';
            ctx.beginPath();
            ctx.arc(sx + trunkShiftX + (p.x - tree.x), sy + (p.y - tree.y), p.size || 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        // Alive tree
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx + 5 + trunkShiftX * 0.4, sy + tree.radius * 0.6, tree.radius * 0.8, tree.radius * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trunk with deformation when hit
        const flash = tree.hitFlash || 0;
        ctx.save();
        ctx.translate(sx + trunkShiftX, sy);
        const sxScale = 1 + flash * 0.06;
        const syScale = 1 - flash * 0.12;
        ctx.scale(sxScale, syScale);
        ctx.fillStyle = '#5a3010';
        ctx.fillRect(-5, -4, 10, tree.radius + 10);
        ctx.restore();
        // Hit flash highlight (draw without transform)
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,230,80,${flash * 0.65})`;
          ctx.beginPath();
          ctx.arc(sx + canopyShiftX * 0.3, sy - 10, tree.radius + 4, 0, Math.PI * 2);
          ctx.fill();
        }
        if ((tree.leaflessTime || 0) > 0) {
          const barkTone = '#6a3a16';
          ctx.strokeStyle = barkTone;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx + trunkShiftX, sy - 6);
          ctx.lineTo(sx + trunkShiftX - 9 + canopyShiftX * 0.28, sy - 20);
          ctx.moveTo(sx + trunkShiftX, sy - 8);
          ctx.lineTo(sx + trunkShiftX + 8 + canopyShiftX * 0.24, sy - 18);
          ctx.moveTo(sx + trunkShiftX, sy - 13);
          ctx.lineTo(sx + trunkShiftX - 4 + canopyShiftX * 0.18, sy - 25);
          ctx.stroke();
        } else {
          // Canopy outer with small squash when hit
          ctx.save();
          ctx.translate(sx + canopyShiftX, sy - 10);
          ctx.scale(1 + flash * 0.03 + wetFactor * 0.02, 1 - flash * 0.08);
          ctx.fillStyle = wetFactor > 0 ? '#24501b' : '#2a5a18';
          ctx.beginPath();
          ctx.arc(0, 0, tree.radius, 0, Math.PI * 2);
          ctx.fill();
          // Canopy highlight
          ctx.fillStyle = wetFactor > 0 ? '#3f8b37' : '#3a7a25';
          ctx.beginPath();
          ctx.arc(-5, -4, tree.radius * 0.65, 0, Math.PI * 2);
          ctx.fill();
          if (wetFactor > 0) {
            ctx.fillStyle = `rgba(145, 205, 255, ${0.22 * wetFactor})`;
            ctx.beginPath();
            ctx.arc(-2, -7, tree.radius * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
          // Canopy edge
          ctx.strokeStyle = '#1a3a0e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, tree.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        // HP bar (only when damaged)
        if (tree.hp < tree.maxHp) {
          const bw = 36, bx = sx - 18, by = sy - tree.radius - 16;
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(bx, by, bw, 4);
          ctx.fillStyle = '#66dd33';
          ctx.fillRect(bx, by, bw * (tree.hp / tree.maxHp), 4);
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, bw, 4);
        }
        // (No face) visual deformation handled above for trunk and canopy
      }

      if (tree.smokeParticles && tree.smokeParticles.length > 0 && tree.state !== 'burning') {
        ctx.save();
        for (const p of tree.smokeParticles) {
          ctx.globalAlpha = (p.life / p.maxLife) * 0.62;
          ctx.fillStyle = p.color || '#b4bac2';
          ctx.beginPath();
          ctx.arc(sx + trunkShiftX + (p.x - tree.x), sy + (p.y - tree.y), p.size || 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Ground drops (XP orbs + items)
    const _itemColor = {
      wood: '#8B4513', stone: '#888888', stick: '#A0714F', charcoal: '#1a1a1a',
      burnt_wood: '#3a3a2a', goblin_fang: '#FFD700', orc_hide: '#8B2020', 
      bone: '#DDDDC8', crystal_shard: '#CC44FF', wooden_axe: '#9B6B47',
      stone_axe: '#7A8B9F', elemental_orb_fire: '#FF6A3D', elemental_orb_water: '#4AA7FF',
      elemental_orb_air: '#8FD9FF', elemental_orb_earth: '#A47A5A', elemental_orb_lightning: '#FFE45E'
    };
    for (const drop of this.drops) {
      if (drop.collected) continue;
      if (!camera.isVisible(drop.x, drop.y, 12)) continue;
      const t   = drop._t || 0;
      const sx  = drop.x - camera.x;
      const sy  = drop.y - camera.y - Math.sin(t * 3) * 3;
      const pulse = 0.7 + Math.sin(t * 4) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulse;
      if (drop.type === 'xp') {
        ctx.fillStyle   = '#00FF88';
        ctx.strokeStyle = '#AAFFDD';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#CCFFEE';
        ctx.beginPath();
        ctx.arc(sx - 1.5, sy - 1.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle   = _itemColor[drop.type] || '#CCCCCC';
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(sx - 7, sy - 5, 14, 10, 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export default WorldMap;
