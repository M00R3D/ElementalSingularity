// ========================================
// WorldMap - Procedural World Generation
// Handles: background tiles, trees, rocks, drops
// ========================================

export class WorldMap {
  constructor(config = {}) {
    this.width  = config.width  || 2400;
    this.height = config.height || 1800;
    this.trees  = [];
    this.rocks  = [];
    this.drops  = [];
    this._generate(config.seed || 1337, config.treeCount || 40, config.rockCount || 25);
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

      this.trees.push({ x, y, hp: 3, maxHp: 3, radius: 22, state: 'alive', hitFlash: 0 });
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
      this.rocks.push({
        x, y,
        rx: sz,
        ry: sz * 0.62,
        angle: rng() * Math.PI,
        shade: 35 + (rng() * 30 | 0)
      });
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────
  update(dt) {
    for (const tree of this.trees) {
      if (tree.hitFlash > 0) tree.hitFlash -= dt * 5;
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
    }
    this.updateTreeBurn(dt);
    for (const drop of this.drops) {
      if (!drop.collected) drop._t = ((drop._t || 0) + dt);
    }
    // Remove collected drops immediately (tiny perf)
    this.drops = this.drops.filter(d => !d.collected);
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

      if (tree.state === 'stump' || tree.state === 'burnt') {
        // Stump or burnt tree
        const color = tree.state === 'burnt' ? '#1a1a1a' : '#5a3010';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = tree.state === 'burnt' ? '#0a0a0a' : '#7a4520';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (tree.state === 'burning') {
        // Burning tree - red/orange canopy
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx + 5, sy + tree.radius * 0.6, tree.radius * 0.8, tree.radius * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trunk
        ctx.fillStyle = '#3a1a00';
        ctx.fillRect(sx - 5, sy - 4, 10, tree.radius + 10);
        // Burning canopy
        const burnProgress = 1 - (tree.burnDuration / tree.maxBurnDuration);
        ctx.fillStyle = `rgba(${Math.floor(255 - burnProgress * 100)},${Math.floor(100 + burnProgress * 50)},0,0.9)`;
        ctx.beginPath();
        ctx.arc(sx, sy - 10, tree.radius, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.fillStyle = `rgba(255,100,0,${0.4 * (1 - burnProgress)})`;
        ctx.beginPath();
        ctx.arc(sx, sy - 10, tree.radius + 8, 0, Math.PI * 2);
        ctx.fill();
        // Draw fire particles
        if (tree.fireParticles) {
          ctx.save();
          for (const p of tree.fireParticles) {
            ctx.globalAlpha = p.life / p.maxLife * 0.7;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx + (p.x - tree.x), sy + (p.y - tree.y), 4 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        // Alive tree
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(sx + 5, sy + tree.radius * 0.6, tree.radius * 0.8, tree.radius * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trunk
        ctx.fillStyle = '#5a3010';
        ctx.fillRect(sx - 5, sy - 4, 10, tree.radius + 10);
        // Hit flash
        const flash = tree.hitFlash || 0;
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,230,80,${flash * 0.65})`;
          ctx.beginPath();
          ctx.arc(sx, sy - 10, tree.radius + 4, 0, Math.PI * 2);
          ctx.fill();
        }
        // Canopy outer
        ctx.fillStyle = '#2a5a18';
        ctx.beginPath();
        ctx.arc(sx, sy - 10, tree.radius, 0, Math.PI * 2);
        ctx.fill();
        // Canopy highlight
        ctx.fillStyle = '#3a7a25';
        ctx.beginPath();
        ctx.arc(sx - 5, sy - 14, tree.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
        // Canopy edge
        ctx.strokeStyle = '#1a3a0e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy - 10, tree.radius, 0, Math.PI * 2);
        ctx.stroke();
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
      }
    }

    // Ground drops (XP orbs + items)
    const _itemColor = {
      wood: '#8B4513', stone: '#888888', stick: '#A0714F', charcoal: '#1a1a1a',
      burnt_wood: '#3a3a2a', goblin_fang: '#FFD700', orc_hide: '#8B2020', 
      bone: '#DDDDC8', crystal_shard: '#CC44FF', wooden_axe: '#9B6B47',
      stone_axe: '#7A8B9F'
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
