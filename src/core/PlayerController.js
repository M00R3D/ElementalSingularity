// ========================================
// PlayerController - Player Management
// Handles: movement, collision, health, element
// ========================================

export class PlayerController {
  constructor(x = 400, y = 300) {
    // Position & Velocity
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 15;

    // Stats
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 150;

    // Equipment
    this.equippedElement = null; // Element ID string
    this.color = '#FF6347'; // Red by default

    // State
    this.isAlive = true;
    this.castPulse = 0;
    this.castColor = '#FFFFFF';
    // Knockback (separado del input, decae rápido)
    this.kbx = 0;
    this.kby = 0;
  }

  // ========== MOVEMENT ==========
  update(dt, input) {
    // Calculate velocity from input
    this.vx = 0;
    this.vy = 0;

    if (input.w) this.vy -= this.speed;
    if (input.s) this.vy += this.speed;
    if (input.a) this.vx -= this.speed;
    if (input.d) this.vx += this.speed;

    // Update position (input + knockback externo)
    const kbDecay = 1 - Math.min(1, dt * 10);
    this.kbx *= kbDecay;
    this.kby *= kbDecay;
    this.x += (this.vx + this.kbx) * dt;
    this.y += (this.vy + this.kby) * dt;

    // Clamp to canvas bounds
    const canvasWidth = 800;
    const canvasHeight = 600;

    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

    // Decay cast pulse effect.
    this.castPulse = Math.max(0, this.castPulse - dt * 2.8);
  }

  // ========== DRAWING ==========
  draw(ctx) {
    if (!this.isAlive) return;

    // Draw player circle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Cast feedback ring.
    if (this.castPulse > 0) {
      ctx.save();
      ctx.globalAlpha = this.castPulse;
      ctx.strokeStyle = this.castColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8 + (1 - this.castPulse) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw health bar above player
    this.drawHealthBar(ctx);
  }

  drawHealthBar(ctx) {
    const barWidth = 40;
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 12;

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
