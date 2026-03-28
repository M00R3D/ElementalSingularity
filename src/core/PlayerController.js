// ========================================
// PlayerController - Player Management
// Handles: movement, collision, health, element
// ========================================

import { buildHitboxProfile, PLAYER_HITBOX_TEMPLATE } from './PhysicsConfig.js';
import { drawGraphicLayers } from './GraphicRenderer.js';

export class PlayerController {
  constructor(x = 1200, y = 900, worldWidth = 2400, worldHeight = 1800) {
    // Position & Velocity
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 15;
    this.collisionKind = 'player';

    // World bounds
    this.worldWidth  = worldWidth;
    this.worldHeight = worldHeight;

    // Stats
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 150;

    // Progression
    this.level = 1;
    this.xp    = 0;
    // Total XP needed to reach each level threshold (index = level number)
    this._xpTable = [0, 50, 120, 240, 420, 660, 980, 1400, 1950, 2600, 9999];

    // Equipment
    this.equippedElement = null;
    this.color = '#FF6347';
    this.characterMeta = {
      faceType: 'friendly',
      size: 15,
      color: '#FF6347',
      accessory: 'none',
      hairStyle: 'short',
      hairStyle2: 'none',
      hairColor: '#4b2e20',
      eyeType: 'round',
      starterElement: 'fire'
    };

    // State
    this.isAlive   = true;
    this.castPulse = 0;
    this.castColor = '#FFFFFF';
    // Knockback
    this.kbx = 0;
    this.kby = 0;
    this.slipVx = 0;
    this.slipVy = 0;
    this.slipperyTime = 0;
    this.slipFriction = 0.9;
    this.stunTime = 0;
    this.limbPhase = 0; // for hands/feet animation
    this.z = 0;
    this.vz = 0;
    this.jumpGravity = 980;
    this.jumpStrength = 460;
    this.isJumping = false;
    this.actionTime = 0;
    this.heldItemGraphic = null;
    this.heldItemColor = '#FFFFFF';
    this.levelUpDisplayTime = 0;
    this.levelUpText = '';
    this.levelUpParticles = [];
    this.orbUnlockTime = 0;
    this.orbUnlockColor = '#FFFFFF';
    this.orbUnlockParticles = [];

    this.updateHitboxDefinitions();
  }

  applyCharacterMetadata(meta = {}) {
    const next = {
      ...this.characterMeta,
      ...meta
    };
    // Ensure all character customization fields have valid values
    next.hairStyle = meta.hairStyle || next.hairStyle || 'anime_straight';
    next.hairStyle2 = meta.hairStyle2 !== undefined ? meta.hairStyle2 : (next.hairStyle2 || 'none');
    next.accessory = meta.accessory || next.accessory || 'none';
    next.hairColor = meta.hairColor || next.hairColor || '#4b2e20';
    next.faceType = meta.faceType || next.faceType || 'friendly';
    next.eyeType = meta.eyeType || next.eyeType || 'round';
    next.color = meta.color || next.color || '#ff7a59';
    next.size = meta.size !== undefined ? meta.size : (next.size || 15);
    
    this.characterMeta = next;
    this.radius = Math.max(10, Math.min(24, Number(next.size) || 15));
    this.color = next.color || this.color;
    this.equippedElement = next.starterElement || this.equippedElement;
    this.updateHitboxDefinitions();
  }

  updateHitboxDefinitions() {
    const profile = buildHitboxProfile(PLAYER_HITBOX_TEMPLATE, this.radius);
    this.hitboxOffsets = profile.hitboxOffsets;
    this.hitboxRadii = profile.hitboxRadii;
    this.hitboxZOffsets = profile.hitboxZOffsets;
    this.hitboxHeights = profile.hitboxHeights;
  }

  getHitboxes() {
    const offsets = this.hitboxOffsets || [];
    const radii = this.hitboxRadii || [];
    const zOffsets = this.hitboxZOffsets || [];
    const heights = this.hitboxHeights || [];
    return offsets.map((offset, index) => ({
      x: this.x + (offset.x || 0),
      y: this.y + (offset.y || 0),
      z: this.z + (zOffsets[index] || 0),
      radius: radii[index] || this.radius,
      height: heights[index] || this.radius
    }));
  }

  // ========== MOVEMENT ==========
  update(dt, input) {
    this.stunTime = Math.max(0, (this.stunTime || 0) - dt);
    this.slipperyTime = Math.max(0, (this.slipperyTime || 0) - dt);

    // Calculate velocity from input
    this.vx = 0;
    this.vy = 0;

    if (this.stunTime <= 0) {
      if (input.w) this.vy -= this.speed;
      if (input.s) this.vy += this.speed;
      if (input.a) this.vx -= this.speed;
      if (input.d) this.vx += this.speed;
    }

    // Update position (input + knockback externo)
    const isSlippery = this.slipperyTime > 0;
    const kbDecay = 1 - Math.min(1, dt * (isSlippery ? 3.2 : 10));
    this.kbx *= kbDecay;
    this.kby *= kbDecay;

    const slipDecay = Math.max(0, 1 - (isSlippery ? (1 - (this.slipFriction || 0.9)) : 0.35) * dt * 60);
    this.slipVx *= slipDecay;
    this.slipVy *= slipDecay;

    this.x += (this.vx + this.kbx + this.slipVx) * dt;
    this.y += (this.vy + this.kby + this.slipVy) * dt;

    // Clamp to world bounds
    this.x = Math.max(this.radius, Math.min(this.worldWidth  - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(this.worldHeight - this.radius, this.y));

    // Jump physics on the Z axis.
    if (this.isJumping || this.z > 0) {
      this.vz -= this.jumpGravity * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        this.isJumping = false;
      }
    }

    // Decay cast pulse effect.
    this.castPulse = Math.max(0, this.castPulse - dt * 2.8);
    this.actionTime = Math.max(0, this.actionTime - dt * 2.6);
    this.levelUpDisplayTime = Math.max(0, this.levelUpDisplayTime - dt);
    this.orbUnlockTime = Math.max(0, this.orbUnlockTime - dt);

    this.levelUpParticles = this.levelUpParticles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 28 * dt;
      return particle.life > 0;
    });

    this.orbUnlockParticles = this.orbUnlockParticles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      return particle.life > 0;
    });

    // advance limb animation phase based on movement speed
    const moveSpeed = Math.hypot(this.vx, this.vy);
    this.limbPhase += dt * (1 + moveSpeed / 80) * 6;
  }

  syncHeldItem(slotValue, gameData) {
    if (!slotValue || typeof slotValue !== 'string' || !slotValue.startsWith('item:')) {
      this.heldItemGraphic = null;
      return;
    }
    const itemId = slotValue.split(':')[1];
    const itemDef = (gameData.items || []).find((item) => item.id === itemId) || null;
    this.heldItemGraphic = itemDef?.graphic || null;
    this.heldItemColor = itemDef?.color || '#FFFFFF';
  }

  triggerLevelUp(level) {
    this.levelUpDisplayTime = 2.1;
    this.levelUpText = `LEVEL ${level}`;
    for (let index = 0; index < 34; index++) {
      const angle = (Math.PI * 2 * index) / 34 + Math.random() * 0.28;
      const speed = 36 + Math.random() * 120;
      this.levelUpParticles.push({
        x: this.x,
        y: this.y - this.radius * 0.7,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 24,
        life: 0.85 + Math.random() * 0.7,
        maxLife: 1.4,
        size: 2 + Math.random() * 4,
        color: index % 2 === 0 ? '#FFE45E' : '#A8FF8A'
      });
    }
  }

  triggerElementUnlock(color = '#FFFFFF') {
    this.orbUnlockTime = 1.35;
    this.orbUnlockColor = color;
    this.actionTime = Math.max(this.actionTime, 0.9);
    for (let index = 0; index < 28; index++) {
      const angle = (Math.PI * 2 * index) / 28 + Math.random() * 0.22;
      const speed = 24 + Math.random() * 96;
      this.orbUnlockParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.8,
        size: 2 + Math.random() * 3.5,
        color
      });
    }
  }

  drawCelebrationOverlay(ctx, canvas) {
    if (this.levelUpDisplayTime <= 0) return;
    const t = Math.max(0, Math.min(1, this.levelUpDisplayTime / 2.1));
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.5);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Arial';
    ctx.fillStyle = '#FFF3A8';
    ctx.fillText('LEVEL UP!', canvas.width / 2, 92);
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#AAFFCC';
    ctx.fillText(this.levelUpText, canvas.width / 2, 120);
    ctx.restore();
  }

  drawHairWithStrands(ctx, sx, sy, drawRadius, hairStyle, hairColor, walkBlend, limbPhase, handAction, hairStyle2, hairColor2, layerRole = 'back') {
    if (hairStyle === 'none' && hairStyle2 === 'none') return;
    const swayIntensity = walkBlend * 0.8 * (1 - handAction * 0.5);
    const baseAngleOffset = Math.sin(limbPhase * 1.2) * 0.3 * swayIntensity;

    if (layerRole === 'back') {
      if (!hairStyle || hairStyle === 'none') return;
      ctx.save();
      ctx.fillStyle = hairColor;
      ctx.strokeStyle = hairColor;
      ctx.lineWidth = Math.max(1.2, drawRadius * 0.14);
      // Base shell keeps layer 1 wrapping the head from behind.
      this._drawHairBackShell(ctx, sx, sy, drawRadius, swayIntensity, limbPhase);
      this._drawHairStyle(ctx, sx, sy, drawRadius * 1.06, hairStyle, swayIntensity, limbPhase, baseAngleOffset);
      ctx.restore();
      return;
    }

    if (!hairStyle2 || hairStyle2 === 'none') return;
    ctx.save();
    const color2 = hairColor2 || hairColor;
    ctx.fillStyle = this._darkenColor(color2, 0.08);
    ctx.strokeStyle = this._darkenColor(color2, 0.18);
    ctx.lineWidth = Math.max(1, drawRadius * 0.08);
    this._drawHairFrontFringe(ctx, sx, sy, drawRadius, hairStyle2, swayIntensity * 0.85, limbPhase);
    ctx.restore();
  }

  _darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, Math.floor((num >> 16 & 255) * (1 - amount))));
    const g = Math.max(0, Math.min(255, Math.floor((num >> 8 & 255) * (1 - amount))));
    const b = Math.max(0, Math.min(255, Math.floor((num & 255) * (1 - amount))));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  _drawHairBackShell(ctx, sx, sy, drawRadius, swayIntensity, limbPhase) {
    const sideSway = Math.sin(limbPhase * 1.15) * drawRadius * 0.06 * swayIntensity;
    ctx.beginPath();
    ctx.ellipse(sx, sy - drawRadius * 0.42, drawRadius * 1.05, drawRadius * 0.96, 0, Math.PI * 0.86, Math.PI * 2.14);
    ctx.fill();
    ctx.fillRect(sx - drawRadius * 0.9 + sideSway, sy - drawRadius * 0.38, drawRadius * 0.28, drawRadius * 0.9);
    ctx.fillRect(sx + drawRadius * 0.62 + sideSway, sy - drawRadius * 0.38, drawRadius * 0.28, drawRadius * 0.9);
    // Rear strands hanging below the body silhouette.
    for (let i = 0; i < 3; i++) {
      const spread = i - 1;
      const sway = Math.sin(limbPhase * 1.1 + i * 0.7) * drawRadius * 0.09 * swayIntensity;
      const strandX = sx + spread * drawRadius * 0.36 + sway;
      const strandTop = sy + drawRadius * 0.42;
      const strandLen = drawRadius * (0.62 + Math.abs(spread) * 0.18);
      const strandW = drawRadius * 0.22;
      ctx.beginPath();
      ctx.moveTo(strandX - strandW * 0.45, strandTop);
      ctx.quadraticCurveTo(strandX - strandW * 0.3, strandTop + strandLen * 0.55, strandX, strandTop + strandLen);
      ctx.quadraticCurveTo(strandX + strandW * 0.3, strandTop + strandLen * 0.55, strandX + strandW * 0.45, strandTop);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawHairFrontFringe(ctx, sx, sy, drawRadius, hairStyle, swayIntensity, limbPhase) {
    if (hairStyle === 'special_spiky') {
      const R = drawRadius * 1.45;
      const baseY = sy - drawRadius * 0.12;
      const spikes = [
        { x: -0.004639221090756845, y: -0.4974299637649948, w: 0.22, h: 0.5, rot: 180 },
        { x: 0.14958602287111278, y: -0.46495637175063015, w: 0.22, h: 0.5, rot: 195 },
        { x: -0.14154045177048424, y: -0.46031727807599776, w: 0.22, h: 0.5, rot: 161 },
        { x: -0.6321473173406525, y: 0.10565049381953816, w: 0.22, h: 0.5, rot: 161 },
        { x: 0.6354570957137592, y: 0.11956764742731094, w: 0.22, h: 0.5, rot: 191 }
      ];
      for (let i = 0; i < spikes.length; i++) {
        const s = spikes[i];
        const sway = Math.sin(limbPhase * 1.3 + i * 0.45) * R * 0.06 * swayIntensity;
        const px = sx + s.x * R + sway;
        const py = baseY + s.y * R;
        const rot = (s.rot || 0) * Math.PI / 180;
        const w = Math.max(2.6, s.w * R);
        const h = Math.max(4, s.h * R);
        ctx.save();
        ctx.translate(px, py);
        if (rot) ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, h * 0.5);
        ctx.lineTo(0, -h * 0.5);
        ctx.lineTo(w * 0.5, h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    const style = String(hairStyle || 'none').replace(/^(anime_|female_|medieval_|ridiculous_)/, '');
    const profileMap = {
      ahoge: { count: 2, width: 0.16, depth: 0.44, offset: 0.18 },
      twintails: { count: 3, width: 0.15, depth: 0.48, offset: 0.2 },
      bangs: { count: 4, width: 0.17, depth: 0.54, offset: 0.21 },
      straight: { count: 3, width: 0.16, depth: 0.52, offset: 0.2 },
      spiky: { count: 5, width: 0.13, depth: 0.56, offset: 0.2 },
      wavy: { count: 3, width: 0.2, depth: 0.55, offset: 0.23 },
      curly: { count: 4, width: 0.18, depth: 0.5, offset: 0.2 },
      braid: { count: 2, width: 0.17, depth: 0.52, offset: 0.25 },
      bob: { count: 3, width: 0.22, depth: 0.47, offset: 0.22 },
      half_up: { count: 2, width: 0.18, depth: 0.5, offset: 0.2 },
      knight: { count: 2, width: 0.2, depth: 0.44, offset: 0.2 },
      maiden: { count: 3, width: 0.18, depth: 0.52, offset: 0.22 },
      noble: { count: 3, width: 0.2, depth: 0.56, offset: 0.22 },
      warrior: { count: 3, width: 0.16, depth: 0.53, offset: 0.2 },
      peasant: { count: 3, width: 0.19, depth: 0.55, offset: 0.22 },
      poodle: { count: 2, width: 0.22, depth: 0.42, offset: 0.2 },
      neon: { count: 5, width: 0.12, depth: 0.5, offset: 0.2 },
      worm: { count: 4, width: 0.1, depth: 0.56, offset: 0.18 },
      bubble: { count: 3, width: 0.2, depth: 0.45, offset: 0.22 },
      afro: { count: 3, width: 0.22, depth: 0.46, offset: 0.2 },
      fancy_anime: { count: 2, width: 0.14, depth: 0.7, offset: 0.22 }
    };
    const profile = profileMap[style] || { count: 3, width: 0.18, depth: 0.52, offset: 0.22 };
    const topY = sy - drawRadius * 0.96;
    for (let i = 0; i < profile.count; i++) {
      const spread = profile.count === 1 ? 0 : (i / (profile.count - 1)) * 2 - 1;
      const sway = Math.sin(limbPhase * 1.35 + i * 0.6) * drawRadius * 0.11 * swayIntensity;
      const strandX = sx + spread * drawRadius * profile.offset + sway;
      const strandW = drawRadius * profile.width;
      const length = drawRadius * profile.depth * (0.94 + Math.abs(spread) * 0.12);
      ctx.beginPath();
      ctx.moveTo(strandX - strandW * 0.5, topY);
      ctx.quadraticCurveTo(strandX - strandW * 0.34, topY + length * 0.56, strandX, topY + length);
      ctx.quadraticCurveTo(strandX + strandW * 0.34, topY + length * 0.56, strandX + strandW * 0.5, topY);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawHairStyle(ctx, sx, sy, drawRadius, hairStyle, swayIntensity, limbPhase, baseAngleOffset) {
    const strandCount = 2;

    // Base hair shape by style
    if (hairStyle === 'short') {
      // Compact dome shape
      ctx.beginPath();
      ctx.arc(sx, sy - drawRadius * 0.82, drawRadius * 0.52, Math.PI, Math.PI * 2);
      ctx.fill();
      // Add a small front tuft
      ctx.beginPath();
      ctx.arc(sx, sy - drawRadius * 1.1, drawRadius * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle.startsWith('anime_')) {
      const substyle = hairStyle.replace('anime_', '');
      if (substyle === 'ahoge') {
        // Exaggerated anime ahoge with long sweeping strand
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.84, drawRadius * 0.66, Math.PI, Math.PI * 2);
        ctx.fill();
        const swayX = Math.sin(limbPhase * 1.6) * drawRadius * 0.42 * swayIntensity;
        // Long prominent ahoge strand
        ctx.beginPath();
        ctx.moveTo(sx + swayX * 0.4, sy - drawRadius * 1.0);
        ctx.quadraticCurveTo(sx + swayX * 0.9, sy - drawRadius * 1.85, sx + swayX * 1.35, sy - drawRadius * 2.05);
        ctx.lineWidth = Math.max(2.6, drawRadius * 0.22);
        ctx.lineCap = 'round';
        ctx.stroke();
      } else if (substyle === 'twintails') {
        // Exaggerated twin tails with bigger and longer volumes
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.78, drawRadius * 0.58, Math.PI, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const tailBaseX = sx + side * drawRadius * 0.78;
          const baseY = sy - drawRadius * 0.52;
          const sway = Math.sin(limbPhase + i * Math.PI) * drawRadius * 0.5 * swayIntensity;
          ctx.fillRect(tailBaseX + sway - drawRadius * 0.18, baseY, drawRadius * 0.36, drawRadius * 1.02);
          // Add pom-pom at end
          ctx.beginPath();
          ctx.arc(tailBaseX + sway, baseY + drawRadius * 1.08, drawRadius * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (substyle === 'bangs') {
        // Rounded top with heavy front bangs
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.75, drawRadius * 0.62, Math.PI, Math.PI * 2);
        ctx.fill();
        // Three prominent swaying bangs
        for (let i = 0; i < 3; i++) {
          const offset = (i - 1) * drawRadius * 0.28;
          const sway = Math.sin(limbPhase + i * 0.8) * drawRadius * 0.2 * swayIntensity;
          ctx.fillRect(sx + offset + sway - drawRadius * 0.1, sy - drawRadius * 0.2, drawRadius * 0.2, drawRadius * 0.65);
        }
      } else if (substyle === 'straight') {
        // Long straight hair down the sides
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.65, drawRadius * 0.65, Math.PI, Math.PI * 2);
        ctx.fill();
        // Two long side strands
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const strandX = sx + side * drawRadius * 0.65;
          const sway = Math.sin(limbPhase + i * 1.3) * drawRadius * 0.12 * swayIntensity;
          ctx.fillRect(strandX + sway - drawRadius * 0.16, sy - drawRadius * 0.4, drawRadius * 0.32, drawRadius * 1.2);
        }
      } else if (substyle === 'spiky') {
        // Extra long, sharp anime spikes.
        ctx.beginPath();
        ctx.moveTo(sx - drawRadius * 0.72, sy - drawRadius * 0.42);
        ctx.lineTo(sx - drawRadius * 0.48, sy - drawRadius * 1.72);
        ctx.lineTo(sx - drawRadius * 0.16, sy - drawRadius * 0.54);
        ctx.lineTo(sx + drawRadius * 0.06, sy - drawRadius * 1.92);
        ctx.lineTo(sx + drawRadius * 0.28, sy - drawRadius * 0.56);
        ctx.lineTo(sx + drawRadius * 0.52, sy - drawRadius * 1.78);
        ctx.lineTo(sx + drawRadius * 0.78, sy - drawRadius * 0.42);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          const sway = Math.sin(limbPhase * 1.55 + i * 0.52) * drawRadius * 0.2 * swayIntensity;
          const x = sx - drawRadius * 0.44 + i * drawRadius * 0.23;
          ctx.beginPath();
          ctx.moveTo(x, sy - drawRadius * 1.16);
          ctx.lineTo(x + sway, sy - drawRadius * 1.48);
          ctx.lineTo(x + drawRadius * 0.08, sy - drawRadius * 1.14);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (hairStyle.startsWith('female_')) {
      const substyle = hairStyle.replace('female_', '');
      if (substyle === 'wavy') {
        // Tall dome with animated side waves
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.62, drawRadius * 0.72, Math.PI, Math.PI * 2);
        ctx.fill();
        // Three animated wave sections on each side
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 3; i++) {
            const waveX = sx + side * drawRadius * 0.65 + Math.sin(limbPhase + i * 0.4) * drawRadius * 0.22 * swayIntensity;
            const waveY = sy - drawRadius * 0.3 + i * drawRadius * 0.35;
            ctx.beginPath();
            ctx.arc(waveX, waveY, drawRadius * 0.28, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (substyle === 'curly') {
        // Large volume curly hair with bouncy curls
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.75, drawRadius * 0.72, Math.PI, Math.PI * 2);
        ctx.fill();
        // 8 bouncy curls around the head
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const bounce = Math.sin(limbPhase * 1.6 + i) * drawRadius * 0.25 * swayIntensity;
          const cx = sx + Math.cos(angle) * drawRadius * 0.68 + bounce * 0.4;
          const cy = sy - drawRadius * 0.45 + Math.sin(angle) * drawRadius * 0.45 + bounce;
          ctx.beginPath();
          ctx.arc(cx, cy, drawRadius * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (substyle === 'braid') {
        // Rounded top with duo braids down the back
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.7, drawRadius * 0.58, Math.PI, Math.PI * 2);
        ctx.fill();
        // Two braids on sides
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const braidX = sx + side * drawRadius * 0.35;
          const sway = Math.sin(limbPhase + i * Math.PI) * drawRadius * 0.16 * swayIntensity;
          for (let j = 0; j < 4; j++) {
            ctx.fillRect(braidX + sway * 0.5 - drawRadius * 0.12, sy - drawRadius * 0.4 + j * drawRadius * 0.35, drawRadius * 0.24, drawRadius * 0.28);
          }
        }
      } else if (substyle === 'bob') {
        // Short and cute bob style
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.65, drawRadius * 0.62, Math.PI, Math.PI * 2);
        ctx.fill();
        // Two side flaps
        ctx.fillRect(sx - drawRadius * 0.7, sy - drawRadius * 0.4, drawRadius * 0.35, drawRadius * 0.65);
        ctx.fillRect(sx + drawRadius * 0.35, sy - drawRadius * 0.4, drawRadius * 0.35, drawRadius * 0.65);
      } else if (substyle === 'half_up') {
        // Half up bun with long loose strands
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.75, drawRadius * 0.68, Math.PI, Math.PI * 2);
        ctx.fill();
        // Bun at top
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 1.05, drawRadius * 0.28, 0, Math.PI * 2);
        ctx.fill();
        // Two long loose strands
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const sway = Math.sin(limbPhase + i) * drawRadius * 0.18 * swayIntensity;
          ctx.fillRect(sx + side * drawRadius * 0.5 + sway - drawRadius * 0.14, sy - drawRadius * 0.35, drawRadius * 0.28, drawRadius * 0.85);
        }
      }
    } else if (hairStyle.startsWith('medieval_')) {
      const substyle = hairStyle.replace('medieval_', '');
      if (substyle === 'knight') {
        // Helmet-like hair
        ctx.fillRect(sx - drawRadius * 0.65, sy - drawRadius * 1.2, drawRadius * 1.3, drawRadius * 0.75);
        // Face coverage
        ctx.fillRect(sx - drawRadius * 0.5, sy - drawRadius * 0.6, drawRadius * 1.0, drawRadius * 0.35);
      } else if (substyle === 'maiden') {
        // Maiden bun style with loose sides
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.75, drawRadius * 0.7, Math.PI, Math.PI * 2);
        ctx.fill();
        // Rear bun
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 1.15, drawRadius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Long loose side strands
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const sway = Math.sin(limbPhase + i * Math.PI) * drawRadius * 0.2 * swayIntensity;
          ctx.fillRect(sx + side * drawRadius * 0.68 + sway, sy - drawRadius * 0.3, drawRadius * 0.22, drawRadius * 1.1);
        }
      } else if (substyle === 'noble') {
        // Large flowing noble locks
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.8, drawRadius * 0.82, Math.PI, Math.PI * 2);
        ctx.fill();
        // Side ringlets
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          ctx.beginPath();
          ctx.arc(sx + side * drawRadius * 0.75, sy - drawRadius * 0.2, drawRadius * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (substyle === 'warrior') {
        // Warrior braided style with multiple braids
        // Central braid
        ctx.fillRect(sx - drawRadius * 0.15, sy - drawRadius * 1.35, drawRadius * 0.3, drawRadius * 1.0);
        // Two side braids
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const sway = Math.sin(limbPhase + i) * drawRadius * 0.12 * swayIntensity;
          ctx.fillRect(sx + side * drawRadius * 0.55 + sway, sy - drawRadius * 0.45, drawRadius * 0.22, drawRadius * 0.95);
        }
      } else if (substyle === 'peasant') {
        // Simple long peasant hair
        const sway = Math.sin(limbPhase) * drawRadius * 0.15 * swayIntensity;
        ctx.fillRect(sx - drawRadius * 0.58 + sway, sy - drawRadius * 0.45, drawRadius * 1.16, drawRadius * 1.05);
      }
    } else if (hairStyle.startsWith('ridiculous_')) {
      const substyle = hairStyle.replace('ridiculous_', '');
      if (substyle === 'poodle') {
        // Giant poodle pom-poms
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5;
          const bounce = Math.sin(limbPhase * 1.8 + i) * drawRadius * 0.35 * swayIntensity;
          const cx = sx + Math.cos(angle) * drawRadius * 0.72 + bounce * 0.3;
          const cy = sy - drawRadius * 0.55 + Math.sin(angle) * drawRadius * 0.5 + bounce;
          ctx.beginPath();
          ctx.arc(cx, cy, drawRadius * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (substyle === 'neon') {
        // Wild neon spikes in all directions
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const sway = Math.sin(limbPhase * 2.2 + i * 0.6) * drawRadius * 0.4 * swayIntensity;
          const startX = sx + Math.cos(angle) * drawRadius * 0.3;
          const startY = sy - drawRadius * 0.5 + Math.sin(angle) * drawRadius * 0.2;
          const endX = sx + Math.cos(angle) * drawRadius * 1.0 + sway;
          const endY = sy - drawRadius * 0.8 + Math.sin(angle) * drawRadius * 0.35 + sway;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.lineWidth = Math.max(2.5, drawRadius * 0.25);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      } else if (substyle === 'worm') {
        // Wiggling worm-like strands
        for (let i = 0; i < 3; i++) {
          const startX = sx - drawRadius * 0.35 + i * drawRadius * 0.35;
          ctx.beginPath();
          ctx.moveTo(startX, sy - drawRadius * 0.5);
          for (let j = 0; j < 5; j++) {
            const wave = Math.sin(limbPhase * 1.8 + i + j * 0.6) * drawRadius * 0.25 * swayIntensity;
            ctx.lineTo(startX + wave, sy - drawRadius * 0.5 + j * drawRadius * 0.35);
          }
          ctx.lineWidth = Math.max(2, drawRadius * 0.22);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      } else if (substyle === 'bubble') {
        // Giant bouncy bubbles
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          const bounce = Math.sin(limbPhase * 2.0 + i) * drawRadius * 0.4 * swayIntensity;
          const cx = sx + Math.cos(angle) * drawRadius * 0.65 + bounce * 0.25;
          const cy = sy - drawRadius * 0.8 + bounce;
          ctx.beginPath();
          ctx.arc(cx, cy, drawRadius * 0.32, 0, Math.PI * 2);
          ctx.fill();
          // Bubble outline
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(1, drawRadius * 0.08);
          ctx.stroke();
        }
      } else if (substyle === 'afro') {
        // Giant afro with bouncy curls
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.5, drawRadius * 0.9, Math.PI, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 * i) / 10;
          const bounce = Math.sin(limbPhase * 1.7 + i) * drawRadius * 0.2 * swayIntensity;
          const cx = sx + Math.cos(angle) * drawRadius * 0.85 + bounce * 0.3;
          const cy = sy - drawRadius * 0.35 + Math.sin(angle) * drawRadius * 0.5 + bounce;
          ctx.beginPath();
          ctx.arc(cx, cy, drawRadius * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (hairStyle === 'fancy_anime') {
      // Use a shading helper local to this method to emulate editor shadeColor
      const shadeColor = (hex, percent) => {
        try {
          const c = hex.replace('#','');
          const full = c.length === 3 ? c.split('').map(ch => ch+ch).join('') : c;
          const num = parseInt(full, 16);
          let r = (num >> 16) + Math.round(255 * percent);
          let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
          let b = (num & 0x0000FF) + Math.round(255 * percent);
          r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
          return `rgb(${r},${g},${b})`;
        } catch (e) { return hex; }
      };

      const baseColor = ctx.fillStyle || '#4b2e20';
      const shapes = [
        {t:'c',x:-0.24,y:-0.09,r:0.6},
        {t:'c',x:0.25,y:-0.09,r:0.6},
        {t:'c',x:0,y:-0.48,r:0.46},
        {t:'s',x:-0.58,y:0.26,w:0.57,h:0.66,rot:-27},
        {t:'s',x:0.47,y:0.24,w:0.45,h:0.33,rot:101},
        {t:'s',x:0.46,y:0.36,w:0.24,h:0.66,rot:141},
        {t:'c',x:-0.01,y:-0.63,r:0.26},
        {t:'r',x:-0.53,y:0.11,w:0.52,h:1.24,rot:0},
        {t:'r',x:-0.67,y:0.13,w:0.56,h:1.28,rot:13},
        {t:'a',x:0.57,y:0.05,w:0.4,h:0.98,rot:-34},
        {t:'r',x:0.72,y:0.05,w:0.56,h:1.28,rot:-37},
        {t:'r',x:0.96,y:0.13,w:0.89,h:1.28,rot:-46},
        {t:'r',x:-0.29,y:-0.16,w:0.18,h:0.9,rot:0},
        {t:'r',x:-0.28,y:-0.29,w:1.56,h:0.9,rot:0},
        {t:'r',x:0.63,y:-0.41,w:1.56,h:0.9,rot:-83},
        {t:'l',x:0.37,y:-0.53,w:0.54,h:0.56},
        {t:'l',x:0.57,y:-0.35,w:0.54,h:0.56},
        {t:'l',x:0.61,y:0.05,w:0.54,h:0.56},
        {t:'l',x:-0.37,y:-0.48,w:0.54,h:0.56},
        {t:'l',x:-0.57,y:-0.30,w:0.54,h:0.56}
      ];
      for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        const sway = Math.sin(limbPhase * 1.1 + i * 0.4) * drawRadius * 0.03 * swayIntensity;
        const px = sx + s.x * drawRadius + sway;
        const py = sy + s.y * drawRadius;
        const rot = (s.rot || 0) * Math.PI / 180;
        ctx.save();
        ctx.translate(px, py);
        if (rot) ctx.rotate(rot);
        if (s.t === 'c') {
          ctx.beginPath();
          ctx.arc(0, 0, s.r * drawRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.t === 's') {
          const baseW = Math.max(6, s.w * drawRadius);
          const h = Math.max(12, s.h * drawRadius);
          const spikes = 3;
          const pts = [];
          pts.push({ x: -baseW * 0.5, y: h * 0.5 });
          for (let j = 0; j <= spikes; j++) {
            const t = j / spikes;
            const xpt = -baseW * 0.5 + t * baseW;
            const ypt = h * 0.5 - Math.pow(t, 1.2) * h * 1.05;
            pts.push({ x: xpt, y: ypt });
          }
          pts.push({ x: baseW * 0.5, y: h * 0.5 });
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y); ctx.closePath();
          ctx.fillStyle = baseColor; ctx.fill();
          ctx.strokeStyle = shadeColor(baseColor, -0.18); ctx.lineWidth = Math.max(1, drawRadius * 0.008); ctx.stroke();
          // internal bold cuts
          ctx.strokeStyle = shadeColor(baseColor, -0.32); ctx.lineWidth = Math.max(2, drawRadius * 0.02);
          ctx.beginPath(); ctx.moveTo(-baseW * 0.12, h * 0.1); ctx.lineTo(baseW * 0.08, -h * 0.05); ctx.moveTo(-baseW * 0.02, h * 0.25); ctx.lineTo(baseW * 0.18, -h * 0.2); ctx.stroke();
        } else if (s.t === 'r') {
          const w = s.w * drawRadius, h = s.h * drawRadius;
          const grad = ctx.createLinearGradient(-w*0.2, -h/2, w*0.2, h/2);
          grad.addColorStop(0, shadeColor(baseColor, 0.14));
          grad.addColorStop(0.6, baseColor);
          grad.addColorStop(1, shadeColor(baseColor, -0.08));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(-w * 0.4, h * 0.5);
          ctx.quadraticCurveTo(-w * 0.2, h * 0.1, 0, -h * 0.4);
          ctx.quadraticCurveTo(w * 0.12, -h * 0.6, w * 0.28, -h * 0.7);
          ctx.quadraticCurveTo(w * 0.02, -h * 0.5, -w * 0.18, -h * 0.2);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = Math.max(1, drawRadius * 0.006); ctx.stroke();
        } else if (s.t === 'a') {
          const w = s.w * drawRadius, h = s.h * drawRadius;
          ctx.beginPath(); ctx.moveTo(-w * 0.45, h * 0.45);
          ctx.bezierCurveTo(-w * 0.35, h * 0.1, -w * 0.05, -h * 0.05, w * 0.08, -h * 0.5);
          ctx.bezierCurveTo(w * 0.18, -h * 0.65, w * 0.42, -h * 0.78, w * 0.6, -h * 0.9);
          ctx.lineTo(w * 0.48, -h * 0.85);
          ctx.bezierCurveTo(w * 0.28, -h * 0.6, w * 0.06, -h * 0.3, -w * 0.2, h * 0.25);
          ctx.closePath(); ctx.fillStyle = baseColor; ctx.fill();
          ctx.fillStyle = shadeColor(baseColor, -0.16); ctx.beginPath(); ctx.moveTo(0, -h * 0.2); ctx.quadraticCurveTo(w * 0.22, -h * 0.18, w * 0.26, -h * 0.42); ctx.lineTo(w * 0.18, -h * 0.42); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = shadeColor(baseColor, 0.36); ctx.lineWidth = Math.max(1, drawRadius * 0.006); ctx.beginPath(); ctx.moveTo(-w * 0.18, h * 0.06); ctx.quadraticCurveTo(0, -h * 0.02, w * 0.12, -h * 0.24); ctx.stroke();
        } else if (s.t === 'l') {
          const w = s.w * drawRadius, h = s.h * drawRadius;
          ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.quadraticCurveTo(w * 0.6, -h * 0.08, 0, h / 2); ctx.quadraticCurveTo(-w * 0.6, -h * 0.08, 0, -h / 2); ctx.closePath(); ctx.fillStyle = baseColor; ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = Math.max(1, drawRadius * 0.006); ctx.beginPath(); ctx.moveTo(0, -h / 2 + 2); ctx.lineTo(0, h / 2 - 2); ctx.stroke();
        }
        ctx.restore();
      }
    } else if (hairStyle === 'special_spiky') {
      // Layer 1 only: behind circles + top spikes.
      const R = drawRadius * 1.32;
      const baseY = sy - drawRadius * 0.16;
      const behind = [
        { x: 0, y: -0.38093333136806706, r: 0.5800000000000003 },
        { x: 0.4186529463352946, y: -0.1907310640806984, r: 0.5800000000000003 },
        { x: -0.36421592882384424, y: -0.1814528767314336, r: 0.5800000000000003 }
      ];
      for (let i = 0; i < behind.length; i++) {
        const b = behind[i];
        const sway = Math.sin(limbPhase * 1.15 + i * 0.6) * R * 0.08 * swayIntensity;
        const px = sx + b.x * R + sway;
        const py = baseY + b.y * R;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2.8, b.r * R), 0, Math.PI * 2);
        ctx.fill();
      }

      const spikes = [
        { x: -0.009277932517015934, y: -1.0025700043809742, w: 0.17, h: 0.17, rot: 0 },
        { x: 0.2423678963637609, y: -0.960818288725407, w: 0.17, h: 0.17, rot: 22 },
        { x: 0.5311264746415971, y: -0.7845333024619355, w: 0.17, h: 0.17, rot: 22 },
        { x: 0.7874117794453797, y: -0.6546390618206014, w: 0.17, h: 0.17, rot: 39 },
        { x: -0.2632916577615537, y: -0.9515401332301733, w: 0.17, h: 0.17, rot: -26 },
        { x: -0.5173056378383403, y: -0.7706160532920694, w: 0.17, h: 0.17, rot: -26 },
        { x: -0.7898757377814076, y: -0.6360827189761029, w: 0.17, h: 0.17, rot: -45 },
        { x: -0.700500978795378, y: -0.7613379296508668, w: 0.18, h: 0.35, rot: -37 },
        { x: 0.7294715854550436, y: -0.7938114579571692, w: 0.18, h: 0.35, rot: 30 }
      ];
      for (let i = 0; i < spikes.length; i++) {
        const s = spikes[i];
        const sway = Math.sin(limbPhase * 1.2 + i * 0.55) * R * 0.08 * swayIntensity;
        const px = sx + s.x * R + sway;
        const py = baseY + s.y * R;
        const rot = (s.rot || 0) * Math.PI / 180;
        const w = Math.max(2.5, s.w * R);
        const h = Math.max(2.5, s.h * R);
        ctx.save();
        ctx.translate(px, py);
        if (rot) ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(-w * 0.5, h * 0.5);
        ctx.lineTo(w * 0.5, h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ========== DRAWING ==========
  draw(ctx, camera = null) {
    if (!this.isAlive) return;
    const sx = this.x - (camera ? camera.x : 0);
    const syGround = this.y - (camera ? camera.y : 0);
    const sy = syGround - this.z;
    const airScale = 1 + Math.min(0.34, this.z / 260);
    const walkBlend = Math.min(1, Math.hypot(this.vx, this.vy) / 90);
    const footSwing = Math.sin(this.limbPhase) * 4.8 * walkBlend;
    const footSpread = Math.cos(this.limbPhase) * 1.8 * walkBlend;
    const handAction = Math.max(this.castPulse, this.actionTime, this.orbUnlockTime * 0.85);
    const handSwing = Math.sin(this.limbPhase * 1.45) * 4.6 * handAction;
    const handLift = handAction * (4 + Math.sin(this.limbPhase * 1.2) * 2);

    const drawRadius = this.radius * airScale;
    const hairStyle = this.characterMeta.hairStyle || 'none';
    const hairStyle2 = this.characterMeta.hairStyle2 || 'none';
    const hairColor = this.characterMeta.hairColor || '#4b2e20';

    // Ground shadow gets smaller as the player rises.
    const shadowScale = Math.max(0.58, 1 - this.z / 240);
    const shadowAlpha = Math.max(0.12, 0.26 - this.z / 1800);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(sx, syGround + this.radius * 0.65, this.radius * shadowScale, this.radius * 0.46 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hair layer 1 is rendered behind the body for more volume and readability.
    this.drawHairWithStrands(ctx, sx, sy, drawRadius, hairStyle, hairColor, walkBlend, this.limbPhase, handAction, hairStyle2, hairColor, 'back');

    // Body with slight squash/stretch deformation based on movement and cast
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(
      airScale * (1 + (Math.sin(this.limbPhase) * 0.02)),
      airScale * (1 - (Math.abs(Math.sin(this.limbPhase)) * 0.03) + this.castPulse * 0.06)
    );
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    if (this.orbUnlockTime > 0) {
      ctx.globalAlpha = 0.2 + this.orbUnlockTime * 0.28;
      ctx.fillStyle = this.orbUnlockColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * (1.15 + handAction * 0.25), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Cast feedback ring
    if (this.castPulse > 0) {
      ctx.save();
      ctx.globalAlpha = this.castPulse;
      ctx.strokeStyle = this.castColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, (this.radius * airScale) + 8 + (1 - this.castPulse) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw limbs: feet move with walking, hands animate when using abilities or items.
    const offset = drawRadius + 4;
    const limbSize = Math.max(4, 6 * airScale);
    ctx.fillStyle = this.castColor || '#FFFFFF';
    const leftHandX = sx - offset * 0.82 - handSwing * 0.45;
    const leftHandY = sy - offset * 0.7 - handLift;
    const rightHandX = sx + offset * 0.82 + handSwing * 0.55;
    const rightHandY = sy - offset * 0.62 - handLift * 0.92;
    const leftFootX = sx - offset * 0.46 - footSwing * 0.6;
    const leftFootY = sy + offset - footSpread;
    const rightFootX = sx + offset * 0.46 + footSwing * 0.6;
    const rightFootY = sy + offset + footSpread;
    ctx.beginPath(); ctx.arc(leftHandX, leftHandY, limbSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rightHandX, rightHandY, limbSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(leftFootX, leftFootY, limbSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rightFootX, rightFootY, limbSize, 0, Math.PI * 2); ctx.fill();

    if (this.heldItemGraphic) {
      drawGraphicLayers(
        ctx,
        this.heldItemGraphic,
        rightHandX + limbSize * 0.85,
        rightHandY + limbSize * 0.1,
        drawRadius * 0.95,
        { rotation: 0.45 - handAction * 0.5 }
      );
    }

    // Hair layer 2 is rendered as front fringe/flecos.
    this.drawHairWithStrands(ctx, sx, sy, drawRadius, hairStyle, hairColor, walkBlend, this.limbPhase, handAction, hairStyle2, hairColor, 'front');

    // Accessory
    const accessory = this.characterMeta.accessory || 'none';
    if (accessory === 'bandana') {
      ctx.save();
      ctx.fillStyle = '#d13d3d';
      ctx.fillRect(sx - drawRadius * 0.75, sy - drawRadius * 0.55, drawRadius * 1.5, drawRadius * 0.3);
      ctx.restore();
    } else if (accessory === 'glasses') {
      ctx.save();
      const glassFrameColor = '#101010';
      const glassWidth = drawRadius * 0.35;
      const glassHeight = drawRadius * 0.25;
      const glassGap = drawRadius * 0.1;
      
      // Left lens - filled circle
      ctx.fillStyle = '#e8f4f8';
      ctx.beginPath();
      ctx.arc(sx - glassWidth - glassGap * 0.5, sy - drawRadius * 0.3, glassWidth * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Right lens - filled circle
      ctx.beginPath();
      ctx.arc(sx + glassWidth + glassGap * 0.5, sy - drawRadius * 0.3, glassWidth * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Frame border
      ctx.strokeStyle = glassFrameColor;
      ctx.lineWidth = Math.max(2, drawRadius * 0.08);
      ctx.beginPath();
      ctx.arc(sx - glassWidth - glassGap * 0.5, sy - drawRadius * 0.3, glassWidth * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx + glassWidth + glassGap * 0.5, sy - drawRadius * 0.3, glassWidth * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Bridge
      ctx.lineWidth = Math.max(2, drawRadius * 0.06);
      ctx.beginPath();
      ctx.moveTo(sx - glassGap * 0.5, sy - drawRadius * 0.3);
      ctx.lineTo(sx + glassGap * 0.5, sy - drawRadius * 0.3);
      ctx.stroke();
      ctx.restore();
    } else if (accessory === 'earring') {
      ctx.save();
      const earringX = sx + drawRadius * 0.7;
      const earringY = sy - drawRadius * 0.1;
      const earringSize = drawRadius * 0.2;
      
      // Golden circle earring
      ctx.fillStyle = '#ffd56a';
      ctx.beginPath();
      ctx.arc(earringX, earringY, earringSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Border for depth
      ctx.strokeStyle = '#d4a74a';
      ctx.lineWidth = Math.max(1.5, drawRadius * 0.06);
      ctx.beginPath();
      ctx.arc(earringX, earringY, earringSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (accessory === 'crown') {
      ctx.save();
      ctx.fillStyle = '#f2cb33';
      ctx.beginPath();
      ctx.moveTo(sx - drawRadius * 0.7, sy - drawRadius * 0.7);
      ctx.lineTo(sx - drawRadius * 0.35, sy - drawRadius * 1.25);
      ctx.lineTo(sx, sy - drawRadius * 0.75);
      ctx.lineTo(sx + drawRadius * 0.35, sy - drawRadius * 1.25);
      ctx.lineTo(sx + drawRadius * 0.7, sy - drawRadius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c9a022';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else if (accessory === 'headphones') {
      ctx.save();
      const bandY = sy - drawRadius * 0.86;
      const earY = sy - drawRadius * 0.24;
      ctx.strokeStyle = '#39475e';
      ctx.lineWidth = Math.max(2, drawRadius * 0.18);
      ctx.beginPath();
      ctx.arc(sx, bandY, drawRadius * 0.92, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.fillStyle = '#53a4ff';
      ctx.fillRect(sx - drawRadius * 1.02, earY, drawRadius * 0.34, drawRadius * 0.62);
      ctx.fillRect(sx + drawRadius * 0.68, earY, drawRadius * 0.34, drawRadius * 0.62);
      ctx.restore();
    } else if (accessory === 'mask') {
      ctx.save();
      ctx.fillStyle = 'rgba(35, 45, 70, 0.94)';
      ctx.beginPath();
      ctx.roundRect(sx - drawRadius * 0.54, sy - drawRadius * 0.02, drawRadius * 1.08, drawRadius * 0.56, drawRadius * 0.14);
      ctx.fill();
      ctx.strokeStyle = '#8fb5ff';
      ctx.lineWidth = Math.max(1, drawRadius * 0.06);
      ctx.stroke();
      ctx.restore();
    }

    // Face: eyes and mouth reflecting state
    const faceY = sy - 2;
    const eyeType = this.characterMeta.eyeType || 'round';
    const eyeOffset = Math.max(5, drawRadius * 0.4);
    const eyeSize = Math.max(1.8, drawRadius * 0.14);
    // Expression: hurt if low hp, focused if casting
    const hurt = (this.hp / this.maxHp) < 0.4;
    ctx.fillStyle = '#000000';
    // eyes
    if (eyeType === 'sharp') {
      ctx.beginPath(); ctx.ellipse(sx - eyeOffset, faceY - 2.5, eyeSize + 1.2, eyeSize - 0.6, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + eyeOffset, faceY - 2.5, eyeSize + 1.2, eyeSize - 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (eyeType === 'sleepy') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(sx - eyeOffset - 2, faceY - 2.5); ctx.lineTo(sx - eyeOffset + 2, faceY - 2.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + eyeOffset - 2, faceY - 2.5); ctx.lineTo(sx + eyeOffset + 2, faceY - 2.5); ctx.stroke();
    } else if (eyeType === 'big') {
      ctx.beginPath(); ctx.arc(sx - eyeOffset, faceY - 2, eyeSize + 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + eyeOffset, faceY - 2, eyeSize + 1.1, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(sx - eyeOffset, faceY - 2, eyeSize, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + eyeOffset, faceY - 2, eyeSize, 0, Math.PI * 2); ctx.fill();
    }

    // mouth
    ctx.beginPath();
    if (hurt) {
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.arc(sx, faceY + 4, 6, Math.PI * 0.1, Math.PI * 0.9, true);
    } else if (this.castPulse > 0.3) {
      ctx.fillStyle = '#000000'; ctx.fillRect(sx - 6, faceY + 2, 12, 3);
    } else {
      const faceType = this.characterMeta.faceType || 'friendly';
      ctx.strokeStyle = '#000000';
      if (faceType === 'serious') {
        ctx.lineWidth = 1.8;
        ctx.moveTo(sx - 5, faceY + 4);
        ctx.lineTo(sx + 5, faceY + 4);
      } else if (faceType === 'grin') {
        ctx.lineWidth = 1.8;
        ctx.arc(sx, faceY + 2.5, 7, Math.PI * 0.1, Math.PI * 0.9);
      } else {
        ctx.lineWidth = 1.5;
        ctx.arc(sx, faceY + 2, 6, Math.PI * 0.1, Math.PI * 0.9);
      }
    }
    ctx.stroke();

    for (const particle of this.levelUpParticles) {
      const alpha = Math.max(0, particle.life / (particle.maxLife || 1));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x - (camera ? camera.x : 0), particle.y - (camera ? camera.y : 0) - this.z * 0.15, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const particle of this.orbUnlockParticles) {
      const alpha = Math.max(0, particle.life / 1.5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x - (camera ? camera.x : 0), particle.y - (camera ? camera.y : 0) - this.z * 0.2, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawHealthBar(ctx, sx, sy, drawRadius);
  }

  drawHealthBar(ctx, sx, sy, drawRadius = this.radius) {
    const barWidth = 40;
    const barHeight = 5;
    const barX = sx - barWidth / 2;
    const barY = sy - drawRadius - 12;

    // Background (gray)
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health (red to green)
    const healthPercent = this.hp / this.maxHp;
    const healthColor = healthPercent > 0.5 
      ? '#00FF00' // Green
      : healthPercent > 0.25 
      ? '#FFFF00' // Yellow
      : '#FF0000'; // Red

    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  // ========== HEALTH ==========
  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
  }

  heal(amount) {
    this.hp += amount;
    if (this.hp > this.maxHp) {
      this.hp = this.maxHp;
    }
  }

  restore() {
    this.hp = this.maxHp;
    this.isAlive = true;
  }

  // ========== POSITION ==========
  getPosition() {
    return { x: this.x, y: this.y };
  }

  distanceTo(x, y) {
    const dx = this.x - x;
    const dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  jump() {
    if (!this.isAlive) return false;
    if (this.stunTime > 0) return false;
    if (this.isJumping || this.z > 1) return false;
    this.isJumping = true;
    this.vz = this.jumpStrength;
    return true;
  }

  get isAirborne() {
    return this.z > 8;
  }

  // ========== EQUIPMENT ==========
  equipElement(elementId, elementData) {
    this.equippedElement = elementId;
    if (elementData) {
      this.color = elementData.nameColor || '#FF6347';
    }
  }

  getEquippedElement() {
    return this.equippedElement;
  }

  triggerCastFeedback(color = '#FFFFFF') {
    this.castColor = color;
    this.castPulse = 1;
    this.actionTime = Math.max(this.actionTime, 0.72);
  }

  applyKnockback(fromX, fromY, force = 260) {
    const angle = Math.atan2(this.y - fromY, this.x - fromX);
    this.kbx = Math.cos(angle) * force;
    this.kby = Math.sin(angle) * force;
  }

  applySlippery(duration = 1.2, dirX = 0, dirY = 0, force = 130, friction = 0.9) {
    this.slipperyTime = Math.max(this.slipperyTime || 0, duration);
    this.slipFriction = Math.max(0.82, Math.min(0.98, friction || 0.9));
    const mag = Math.hypot(dirX, dirY) || 1;
    this.slipVx += (dirX / mag) * force;
    this.slipVy += (dirY / mag) * force;
  }

  applyParalyze(duration = 0.8) {
    this.stunTime = Math.max(this.stunTime || 0, duration);
    this.vx = 0;
    this.vy = 0;
  }

  // ========== PROGRESSION ==========
  gainXP(amount) {
    const reachedLevels = [];
    this.xp += amount;
    while (this.level < 10 && this.xp >= this._xpTable[this.level]) {
      this.level++;
      this.maxHp = Math.min(150, this.maxHp + 10);
      this.hp    = this.maxHp;
      reachedLevels.push(this.level);
      this.triggerLevelUp(this.level);
    }
    return reachedLevels;
  }

  get xpToNext() {
    return this._xpTable[Math.min(this.level, 10)];
  }

  get xpProgress() {
    if (this.level >= 10) return 1;
    const prev = this._xpTable[this.level - 1] || 0;
    const next = this._xpTable[this.level];
    return Math.max(0, Math.min(1, (this.xp - prev) / (next - prev)));
  }

  // ========== COLLISION ==========
  collidingWith(other) {
    if (!this.isAlive) return false;
    const selfHitboxes = this.getHitboxes();
    const otherHitboxes = typeof other.getHitboxes === 'function'
      ? other.getHitboxes()
      : [{ x: other.x, y: other.y, z: other.z || 0, radius: other.radius, height: other.height || other.radius || 0 }];

    for (const selfHitbox of selfHitboxes) {
      for (const otherHitbox of otherHitboxes) {
        const dx = selfHitbox.x - otherHitbox.x;
        const dy = selfHitbox.y - otherHitbox.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const selfBottom = selfHitbox.z || 0;
        const selfTop = selfBottom + (selfHitbox.height || 0);
        const otherBottom = otherHitbox.z || 0;
        const otherTop = otherBottom + (otherHitbox.height || 0);
        const overlapZ = Math.min(selfTop, otherTop) > Math.max(selfBottom, otherBottom);
        if (distance < (selfHitbox.radius + otherHitbox.radius) && overlapZ) {
          return true;
        }
      }
    }

    return false;
  }
}

export default PlayerController;
