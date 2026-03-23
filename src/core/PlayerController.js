// ========================================
// PlayerController - Player Management
// Handles: movement, collision, health, element
// ========================================

export class PlayerController {
  constructor(x = 1200, y = 900, worldWidth = 2400, worldHeight = 1800) {
    // Position & Velocity
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 15;

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

    // Decay cast pulse effect.
    this.castPulse = Math.max(0, this.castPulse - dt * 2.8);
    // advance limb animation phase based on movement speed
    const moveSpeed = Math.hypot(this.vx, this.vy);
    this.limbPhase += dt * (1 + moveSpeed / 80) * 6;
  }

  // ========== DRAWING ==========
  draw(ctx, camera = null) {
    if (!this.isAlive) return;
    const sx = this.x - (camera ? camera.x : 0);
    const sy = this.y - (camera ? camera.y : 0);

    // Body with slight squash/stretch deformation based on movement and cast
    const deform = 1 + Math.sin(this.limbPhase) * 0.03 + this.castPulse * 0.12;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1 + (Math.sin(this.limbPhase) * 0.02), 1 - (Math.abs(Math.sin(this.limbPhase)) * 0.03) + this.castPulse * 0.06);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Cast feedback ring
    if (this.castPulse > 0) {
      ctx.save();
      ctx.globalAlpha = this.castPulse;
      ctx.strokeStyle = this.castColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius + 8 + (1 - this.castPulse) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw limbs: larger and closer to body for a chunkier look
    const phase = this.limbPhase || 0;
    const swing = Math.sin(phase) * 4;
    const offset = this.radius + 4; // bring limbs closer
    const limbSize = 6; // slightly larger
    ctx.fillStyle = this.castColor || '#FFFFFF';
    // left arm
    ctx.beginPath(); ctx.arc(sx - offset + swing, sy - offset - swing * 0.5, limbSize, 0, Math.PI * 2); ctx.fill();
    // right arm
    ctx.beginPath(); ctx.arc(sx + offset - swing, sy - offset + swing * 0.5, limbSize, 0, Math.PI * 2); ctx.fill();
    // left leg
    ctx.beginPath(); ctx.arc(sx - offset + swing * 0.5, sy + offset - swing, limbSize, 0, Math.PI * 2); ctx.fill();
    // right leg
    ctx.beginPath(); ctx.arc(sx + offset - swing * 0.5, sy + offset + swing, limbSize, 0, Math.PI * 2); ctx.fill();

    // Hair style
    const hairStyle = this.characterMeta.hairStyle || 'none';
    const hairColor = this.characterMeta.hairColor || '#4b2e20';
    if (hairStyle !== 'none') {
      ctx.fillStyle = hairColor;
      if (hairStyle === 'short') {
        ctx.beginPath();
        ctx.arc(sx, sy - this.radius * 0.85, this.radius * 0.55, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (hairStyle === 'spike') {
        ctx.beginPath();
        ctx.moveTo(sx - this.radius * 0.65, sy - this.radius * 0.35);
        ctx.lineTo(sx - this.radius * 0.2, sy - this.radius * 1.15);
        ctx.lineTo(sx + this.radius * 0.1, sy - this.radius * 0.45);
        ctx.lineTo(sx + this.radius * 0.4, sy - this.radius * 1.2);
        ctx.lineTo(sx + this.radius * 0.7, sy - this.radius * 0.35);
        ctx.closePath();
        ctx.fill();
      } else if (hairStyle === 'mohawk') {
        ctx.fillRect(sx - this.radius * 0.12, sy - this.radius * 1.25, this.radius * 0.24, this.radius * 0.95);
      } else if (hairStyle === 'long') {
        ctx.beginPath();
        ctx.arc(sx, sy - this.radius * 0.45, this.radius * 0.72, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(sx - this.radius * 0.72, sy - this.radius * 0.5, this.radius * 0.22, this.radius * 1.0);
        ctx.fillRect(sx + this.radius * 0.5, sy - this.radius * 0.5, this.radius * 0.22, this.radius * 1.0);
      }
    }

    // Accessory
    const accessory = this.characterMeta.accessory || 'none';
    if (accessory === 'bandana') {
      ctx.fillStyle = '#d13d3d';
      ctx.fillRect(sx - this.radius * 0.78, sy - this.radius * 0.62, this.radius * 1.56, this.radius * 0.23);
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
      ctx.arc(sx + this.radius * 0.95, sy - 1, 2.1, 0, Math.PI * 2);
      ctx.stroke();
    } else if (accessory === 'crown') {
      ctx.fillStyle = '#f2cb33';
      ctx.beginPath();
      ctx.moveTo(sx - this.radius * 0.7, sy - this.radius * 0.72);
      ctx.lineTo(sx - this.radius * 0.35, sy - this.radius * 1.2);
      ctx.lineTo(sx, sy - this.radius * 0.74);
      ctx.lineTo(sx + this.radius * 0.35, sy - this.radius * 1.2);
      ctx.lineTo(sx + this.radius * 0.7, sy - this.radius * 0.72);
      ctx.closePath();
      ctx.fill();
    }

    // Face: eyes and mouth reflecting state
    const faceY = sy - 2;
    const eyeType = this.characterMeta.eyeType || 'round';
    const eyeOffset = Math.max(5, this.radius * 0.4);
    const eyeSize = Math.max(1.8, this.radius * 0.14);
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

    this.drawHealthBar(ctx, sx, sy);
  }

  drawHealthBar(ctx, sx, sy) {
    const barWidth = 40;
    const barHeight = 5;
    const barX = sx - barWidth / 2;
    const barY = sy - this.radius - 12;

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
    this.xp += amount;
    while (this.level < 10 && this.xp >= this._xpTable[this.level]) {
      this.level++;
      this.maxHp = Math.min(150, this.maxHp + 10);
      this.hp    = this.maxHp;
    }
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

    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (this.radius + other.radius);
  }
}

export default PlayerController;
