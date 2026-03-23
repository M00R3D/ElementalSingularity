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

    // Ground shadow gets smaller as the player rises.
    const shadowScale = Math.max(0.58, 1 - this.z / 240);
    const shadowAlpha = Math.max(0.12, 0.26 - this.z / 1800);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(sx, syGround + this.radius * 0.65, this.radius * shadowScale, this.radius * 0.46 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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
    const drawRadius = this.radius * airScale;
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

    // Hair style
    const hairStyle = this.characterMeta.hairStyle || 'none';
    const hairColor = this.characterMeta.hairColor || '#4b2e20';
    if (hairStyle !== 'none') {
      ctx.fillStyle = hairColor;
      if (hairStyle === 'short') {
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.85, drawRadius * 0.55, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (hairStyle === 'spike') {
        ctx.beginPath();
        ctx.moveTo(sx - drawRadius * 0.65, sy - drawRadius * 0.35);
        ctx.lineTo(sx - drawRadius * 0.2, sy - drawRadius * 1.15);
        ctx.lineTo(sx + drawRadius * 0.1, sy - drawRadius * 0.45);
        ctx.lineTo(sx + drawRadius * 0.4, sy - drawRadius * 1.2);
        ctx.lineTo(sx + drawRadius * 0.7, sy - drawRadius * 0.35);
        ctx.closePath();
        ctx.fill();
      } else if (hairStyle === 'mohawk') {
        ctx.fillRect(sx - drawRadius * 0.12, sy - drawRadius * 1.25, drawRadius * 0.24, drawRadius * 0.95);
      } else if (hairStyle === 'long') {
        ctx.beginPath();
        ctx.arc(sx, sy - drawRadius * 0.45, drawRadius * 0.72, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(sx - drawRadius * 0.72, sy - drawRadius * 0.5, drawRadius * 0.22, drawRadius * 1.0);
        ctx.fillRect(sx + drawRadius * 0.5, sy - drawRadius * 0.5, drawRadius * 0.22, drawRadius * 1.0);
      }
    }

    // Accessory
    const accessory = this.characterMeta.accessory || 'none';
    if (accessory === 'bandana') {
      ctx.fillStyle = '#d13d3d';
      ctx.fillRect(sx - drawRadius * 0.78, sy - drawRadius * 0.62, drawRadius * 1.56, drawRadius * 0.23);
    } else if (accessory === 'glasses') {
      ctx.strokeStyle = '#101010';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(sx - 7.5, sy - 6.5, 5, 4.8);
      ctx.strokeRect(sx + 2.5, sy - 6.5, 5, 4.8);
      ctx.beginPath();
      ctx.moveTo(sx - 2.5, sy - 4.2);
      ctx.lineTo(sx + 2.5, sy - 4.2);
      ctx.stroke();
    } else if (accessory === 'earring') {
      ctx.strokeStyle = '#ffd56a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx + drawRadius * 0.95, sy - 1, 2.1 * airScale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (accessory === 'crown') {
      ctx.fillStyle = '#f2cb33';
      ctx.beginPath();
      ctx.moveTo(sx - drawRadius * 0.7, sy - drawRadius * 0.72);
      ctx.lineTo(sx - drawRadius * 0.35, sy - drawRadius * 1.2);
      ctx.lineTo(sx, sy - drawRadius * 0.74);
      ctx.lineTo(sx + drawRadius * 0.35, sy - drawRadius * 1.2);
      ctx.lineTo(sx + drawRadius * 0.7, sy - drawRadius * 0.72);
      ctx.closePath();
      ctx.fill();
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
