// ========================================
// HotbarSystem - Ability Hotbar Management
// Handles: hotbar UI, ability selection, execution
// ========================================

export class HotbarSystem {
  constructor(gameData, gameState) {
    this.gameData = gameData;
    this.gameState = gameState;
    this.slotSize = 50;
    this.slotGap = 8;
    this.bottomOffset = 18;
  }

  // ========== DRAW HOTBAR ==========
  draw(ctx, canvas, selectedSlot = 0) {
    const totalWidth = (this.slotSize + this.slotGap) * 6 - this.slotGap;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height - this.slotSize - this.bottomOffset;

    for (let i = 0; i < 6; i++) {
      this.drawSlot(ctx, startX + i * (this.slotSize + this.slotGap), startY, i, i === selectedSlot);
    }
  }

  drawSlot(ctx, x, y, slotId, isSelected = false) {
    const slotData = this.gameState.hotbar[slotId];
    const abilityId = slotData.abilityId;
    let ability = null;
    let itemId = null;
    if (abilityId) {
      if (typeof abilityId === 'string' && abilityId.startsWith('item:')) {
        const parts = abilityId.split(':');
        itemId = parts[1];
        // optional count encoded as item:id:count
        const cnt = parts[2] ? parseInt(parts[2], 10) : undefined;
        if (!isNaN(cnt)) {
          // attach displayCount for drawing
          slotData.__displayCount = cnt;
        } else {
          slotData.__displayCount = undefined;
        }
      } else {
        ability = this.gameData.abilities.find(a => a.id === abilityId);
      }
    }

    // Slot background
    ctx.fillStyle = isSelected
      ? 'rgba(28, 44, 74, 0.95)'
      : (ability ? '#1a2332' : '#0a0e18');
    ctx.fillRect(x, y, this.slotSize, this.slotSize);

    // Slot border
    ctx.strokeStyle = isSelected ? '#FFD700' : (ability ? '#4488FF' : '#333333');
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(x, y, this.slotSize, this.slotSize);

    if (isSelected) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
      ctx.fillRect(x, y, this.slotSize, this.slotSize);
    }

    if (ability) {
      // Ability name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ability.name.substring(0, 8), x + this.slotSize / 2, y + 15);

      // Ability damage
      ctx.font = '9px Arial';
      ctx.fillStyle = ability.element ? this.getElementColor(ability.element) : '#CCCCCC';
      ctx.fillText('Dmg: ' + ability.baseDamage, x + this.slotSize / 2, y + 28);

      // Mana cost
      ctx.fillStyle = '#4488FF';
      ctx.fillText('Mana: ' + ability.manaCost, x + this.slotSize / 2, y + 38);

      // Cooldown indicator
      const cooldown = this.gameState.getCooldown(ability.id);
      if (cooldown > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, this.slotSize, this.slotSize);

        ctx.fillStyle = '#FF4444';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cooldown.toFixed(1), x + this.slotSize / 2, y + this.slotSize / 2 + 5);
      }
    }

    if (itemId) {
      // Prefer encoded count on hotbar slot, fallback to inventory count
      const encoded = slotData.__displayCount;
      const count = (typeof encoded === 'number') ? encoded : (this.gameState.inventory.items[itemId] || 0);
      const itemDef = (this.gameData.items || []).find(i => i.id === itemId) || null;
      ctx.fillStyle = itemDef ? itemDef.color : '#CCCCCC';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((itemDef ? itemDef.name : itemId).substring(0, 8), x + this.slotSize / 2, y + 18);
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px Arial';
      ctx.fillText('x' + count, x + this.slotSize / 2, y + 34);
    }

    // Slot number (key hint)
    ctx.fillStyle = '#666666';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[' + (slotId + 1) + ']', x + this.slotSize / 2, y + this.slotSize - 4);

    ctx.textAlign = 'left';
  }

  // ========== CLICK DETECTION ==========
  getSlotAtMouse(mouseX, mouseY, canvas) {
    const totalWidth = (this.slotSize + this.slotGap) * 6 - this.slotGap;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height - this.slotSize - this.bottomOffset;

    for (let i = 0; i < 6; i++) {
      const slotX = startX + i * (this.slotSize + this.slotGap);
      const slotY = startY;

      if (
        mouseX >= slotX && mouseX <= slotX + this.slotSize &&
        mouseY >= slotY && mouseY <= slotY + this.slotSize
      ) {
        return i;
      }
    }
    return -1;
  }

  // ========== KEYBOARD INPUT ==========
  handleKeyPress(key) {
    const keyNum = parseInt(key);
    if (keyNum >= 1 && keyNum <= 6) {
      return keyNum - 1; // Convert to 0-indexed slot
    }
    return -1;
  }

  // ========== ABILITY INFO ==========
  getAbilityAtSlot(slotId) {
    const slotData = this.gameState.hotbar[slotId];
    return slotData.abilityId ? 
      this.gameData.abilities.find(a => a.id === slotData.abilityId) : 
      null;
  }

  equipAbility(slotId, abilityId) {
    this.gameState.equipAbility(slotId, abilityId);
  }

  // ========== HELPERS ==========
  getElementColor(elementId) {
    const element = this.gameData.elements.find(e => e.id === elementId);
    return element ? element.nameColor : '#CCCCCC';
  }

  getStats() {
    return {
      equippedCount: this.gameState.hotbar.filter(s => s.abilityId).length,
      totalSlots: 6
    };
  }
}

export default HotbarSystem;
