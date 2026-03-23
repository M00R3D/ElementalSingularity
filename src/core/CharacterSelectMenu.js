// ========================================
// CharacterSelectMenu - Character Slots + Creator UI
// 5 slots, per-slot metadata editing
// ========================================

export class CharacterSelectMenu {
  constructor(characterManager, worldManager) {
    this.characterManager = characterManager;
    this.worldManager = worldManager;
    this.isOpen = false;
    this.selectedSlot = 0;
    this.selectedWorldId = 'forest';

    this.mode = 'slots'; // 'slots' | 'edit'
    this.editFieldIndex = 0;
    this.editingCharacter = null;

    this.faceOptions = ['friendly', 'serious', 'grin'];
    this.sizeOptions = [12, 14, 15, 17, 19, 21];
    this.colorOptions = ['#ff7a59', '#4db6ff', '#7fd67f', '#ffd166', '#c68cff', '#f08a9a'];
    this.accessoryOptions = ['none', 'bandana', 'glasses', 'earring', 'crown'];
    this.hairStyleOptions = ['none', 'short', 'spike', 'mohawk', 'long'];
    this.hairColorOptions = ['#2a1a12', '#4b2e20', '#7a4f2f', '#d8c18a', '#e86b3d', '#2d3a8a'];
    this.eyeTypeOptions = ['round', 'sharp', 'sleepy', 'big'];
    this.starterElementOptions = ['fire', 'water', 'earth', 'air', 'lightning'];

    this.fieldDefs = [
      { key: 'faceType', label: 'Face', options: this.faceOptions },
      { key: 'size', label: 'Size', options: this.sizeOptions },
      { key: 'color', label: 'Body Color', options: this.colorOptions },
      { key: 'accessory', label: 'Accessory', options: this.accessoryOptions },
      { key: 'hairStyle', label: 'Hair', options: this.hairStyleOptions },
      { key: 'hairColor', label: 'Hair Color', options: this.hairColorOptions },
      { key: 'eyeType', label: 'Eye Type', options: this.eyeTypeOptions },
      { key: 'starterElement', label: 'Starter Element', options: this.starterElementOptions }
    ];
  }

  open(worldId) {
    this.selectedWorldId = worldId || this.selectedWorldId;
    this.isOpen = true;
    this.mode = 'slots';
    this.editFieldIndex = 0;
    this.editingCharacter = null;
  }

  close() {
    this.isOpen = false;
  }

  _getSlots() {
    return this.characterManager.getSlots();
  }

  _getFallbackCharacter(slotIndex) {
    return {
      name: `Adventurer ${slotIndex + 1}`,
      faceType: 'friendly',
      size: 15,
      color: '#ff7a59',
      accessory: 'none',
      hairStyle: 'short',
      hairColor: '#4b2e20',
      eyeType: 'round',
      starterElement: 'fire'
    };
  }

  _buildDraftCharacter(slotIndex) {
    return {
      ...this._getFallbackCharacter(slotIndex),
      id: `slot-${slotIndex + 1}-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  _ensureEditingCharacter() {
    if (this.editingCharacter) return;
    const existing = this.characterManager.getSlot(this.selectedSlot);
    this.editingCharacter = existing || this._buildDraftCharacter(this.selectedSlot);
  }

  _cycleOption(field, direction) {
    if (!this.editingCharacter || !field || !field.options || field.options.length === 0) return;
    const current = this.editingCharacter[field.key];
    const options = field.options;
    let index = options.indexOf(current);
    if (index < 0) index = 0;
    index += direction;
    if (index < 0) index = options.length - 1;
    if (index >= options.length) index = 0;
    this.editingCharacter[field.key] = options[index];
  }

  _saveEditing() {
    if (!this.editingCharacter) return false;
    this.editingCharacter.name = this.editingCharacter.name || `Adventurer ${this.selectedSlot + 1}`;
    return this.characterManager.saveSlot(this.selectedSlot, this.editingCharacter);
  }

  handleKeyPress(key) {
    if (!this.isOpen) return null;

    if (this.mode === 'slots') {
      if (key === 'arrowup' || key === 'w') {
        this.selectedSlot = Math.max(0, this.selectedSlot - 1);
        return null;
      }
      if (key === 'arrowdown' || key === 's') {
        this.selectedSlot = Math.min(this.characterManager.maxSlots - 1, this.selectedSlot + 1);
        return null;
      }
      if (key === 'c') {
        this._ensureEditingCharacter();
        this.mode = 'edit';
        return null;
      }
      if (key === 'delete' || key === 'backspace') {
        this.characterManager.deleteSlot(this.selectedSlot);
        return { action: 'deleted' };
      }
      if (key === 'escape') {
        return { action: 'back_world' };
      }
      if (key === 'enter') {
        const selected = this.characterManager.getSlot(this.selectedSlot);
        if (!selected) {
          this._ensureEditingCharacter();
          this.mode = 'edit';
          return null;
        }
        return { action: 'start', slot: this.selectedSlot, character: selected };
      }
      return null;
    }

    if (this.mode === 'edit') {
      if (key === 'escape') {
        this.mode = 'slots';
        this.editFieldIndex = 0;
        this.editingCharacter = null;
        return null;
      }
      if (key === 'arrowup' || key === 'w') {
        this.editFieldIndex = Math.max(0, this.editFieldIndex - 1);
        return null;
      }
      if (key === 'arrowdown' || key === 's') {
        this.editFieldIndex = Math.min(this.fieldDefs.length - 1, this.editFieldIndex + 1);
        return null;
      }
      if (key === 'arrowleft' || key === 'a') {
        this._cycleOption(this.fieldDefs[this.editFieldIndex], -1);
        return null;
      }
      if (key === 'arrowright' || key === 'd') {
        this._cycleOption(this.fieldDefs[this.editFieldIndex], 1);
        return null;
      }
      if (key === 'p') {
        this._saveEditing();
        return { action: 'saved' };
      }
      if (key === 'enter') {
        this._saveEditing();
        const selected = this.characterManager.getSlot(this.selectedSlot);
        return { action: 'start', slot: this.selectedSlot, character: selected };
      }
      return null;
    }

    return null;
  }

  drawPreviewCharacter(ctx, x, y, meta) {
    const radius = Math.max(10, Math.min(24, Number(meta.size) || 15));

    ctx.fillStyle = meta.color || '#ff7a59';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if ((meta.hairStyle || 'none') !== 'none') {
      ctx.fillStyle = meta.hairColor || '#4b2e20';
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.82, radius * 0.55, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#111111';
    const eyeOffset = Math.max(5, radius * 0.4);
    if ((meta.eyeType || 'round') === 'sharp') {
      ctx.beginPath(); ctx.ellipse(x - eyeOffset, y - 4, 3.8, 1.7, -0.28, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + eyeOffset, y - 4, 3.8, 1.7, 0.28, 0, Math.PI * 2); ctx.fill();
    } else if ((meta.eyeType || 'round') === 'sleepy') {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - eyeOffset - 2, y - 4); ctx.lineTo(x - eyeOffset + 2, y - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + eyeOffset - 2, y - 4); ctx.lineTo(x + eyeOffset + 2, y - 4); ctx.stroke();
    } else if ((meta.eyeType || 'round') === 'big') {
      ctx.beginPath(); ctx.arc(x - eyeOffset, y - 4, 3.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + eyeOffset, y - 4, 3.3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x - eyeOffset, y - 4, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + eyeOffset, y - 4, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if ((meta.faceType || 'friendly') === 'serious') {
      ctx.moveTo(x - 6, y + 5);
      ctx.lineTo(x + 6, y + 5);
    } else if ((meta.faceType || 'friendly') === 'grin') {
      ctx.arc(x, y + 3, 7, Math.PI * 0.12, Math.PI * 0.88);
    } else {
      ctx.arc(x, y + 3, 6, Math.PI * 0.1, Math.PI * 0.9);
    }
    ctx.stroke();

    const accessory = meta.accessory || 'none';
    if (accessory === 'bandana') {
      ctx.fillStyle = '#d13d3d';
      ctx.fillRect(x - radius * 0.75, y - radius * 0.62, radius * 1.5, radius * 0.22);
    } else if (accessory === 'crown') {
      ctx.fillStyle = '#f2cb33';
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.68, y - radius * 0.72);
      ctx.lineTo(x - radius * 0.3, y - radius * 1.2);
      ctx.lineTo(x, y - radius * 0.72);
      ctx.lineTo(x + radius * 0.3, y - radius * 1.2);
      ctx.lineTo(x + radius * 0.68, y - radius * 0.72);
      ctx.closePath();
      ctx.fill();
    }
  }

  draw(ctx, canvas) {
    if (!this.isOpen) return;

    const slots = this._getSlots();
    const worldName = this.worldManager.getWorldConfig(this.selectedWorldId)?.name || this.selectedWorldId;

    ctx.fillStyle = 'rgba(5, 9, 16, 0.90)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#99bbff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CHARACTER SELECT', canvas.width / 2, 46);

    ctx.fillStyle = '#8aa0bf';
    ctx.font = '12px Arial';
    ctx.fillText(`World: ${worldName}`, canvas.width / 2, 66);

    const leftX = 50;
    const topY = 95;
    const slotW = 290;
    const slotH = 62;
    const slotGap = 12;

    ctx.textAlign = 'left';
    for (let i = 0; i < this.characterManager.maxSlots; i++) {
      const y = topY + i * (slotH + slotGap);
      const selected = i === this.selectedSlot;
      const slot = slots[i];

      ctx.fillStyle = selected ? 'rgba(85, 140, 255, 0.22)' : 'rgba(18, 30, 44, 0.78)';
      ctx.fillRect(leftX, y, slotW, slotH);

      ctx.strokeStyle = selected ? '#66a3ff' : '#32465d';
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.strokeRect(leftX, y, slotW, slotH);

      ctx.fillStyle = '#d7e4ff';
      ctx.font = 'bold 13px Arial';
      ctx.fillText(`Slot ${i + 1}`, leftX + 10, y + 20);

      if (slot) {
        ctx.fillStyle = '#b7d0ff';
        ctx.font = '12px Arial';
        ctx.fillText(`${slot.name} | ${slot.starterElement}`, leftX + 10, y + 39);
        ctx.fillStyle = '#89a4c3';
        ctx.fillText(`Face:${slot.faceType} Eyes:${slot.eyeType} Size:${slot.size}`, leftX + 10, y + 54);
      } else {
        ctx.fillStyle = '#7f91a8';
        ctx.font = '12px Arial';
        ctx.fillText('Empty slot', leftX + 10, y + 41);
      }
    }

    const rightX = 380;
    const rightY = 98;
    const rightW = 370;
    const rightH = 380;
    ctx.fillStyle = 'rgba(14, 24, 37, 0.88)';
    ctx.fillRect(rightX, rightY, rightW, rightH);
    ctx.strokeStyle = '#3a5570';
    ctx.lineWidth = 2;
    ctx.strokeRect(rightX, rightY, rightW, rightH);

    const current = this.mode === 'edit'
      ? (this.editingCharacter || slots[this.selectedSlot] || this.characterManager.createDefaultForSlot(this.selectedSlot))
      : (slots[this.selectedSlot] || this._getFallbackCharacter(this.selectedSlot));

    this.drawPreviewCharacter(ctx, rightX + 75, rightY + 80, current);

    ctx.fillStyle = '#d7e4ff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(this.mode === 'edit' ? 'Editing Character' : 'Character Preview', rightX + 140, rightY + 28);

    if (this.mode === 'edit') {
      ctx.font = '12px Arial';
      for (let i = 0; i < this.fieldDefs.length; i++) {
        const field = this.fieldDefs[i];
        const y = rightY + 62 + i * 30;
        const selected = i === this.editFieldIndex;
        if (selected) {
          ctx.fillStyle = 'rgba(96, 156, 255, 0.18)';
          ctx.fillRect(rightX + 138, y - 15, rightW - 156, 22);
        }
        ctx.fillStyle = selected ? '#bfe0ff' : '#9fb6d3';
        ctx.fillText(`${field.label}: ${String(current[field.key])}`, rightX + 144, y);
      }
    } else {
      ctx.fillStyle = '#9fb6d3';
      ctx.font = '12px Arial';
      ctx.fillText(`Face: ${current.faceType}`, rightX + 144, rightY + 72);
      ctx.fillText(`Size: ${current.size}`, rightX + 144, rightY + 92);
      ctx.fillText(`Color: ${current.color}`, rightX + 144, rightY + 112);
      ctx.fillText(`Accessory: ${current.accessory}`, rightX + 144, rightY + 132);
      ctx.fillText(`Hair: ${current.hairStyle} (${current.hairColor})`, rightX + 144, rightY + 152);
      ctx.fillText(`Eyes: ${current.eyeType}`, rightX + 144, rightY + 172);
      ctx.fillText(`Starter Element: ${current.starterElement}`, rightX + 144, rightY + 192);
    }

    ctx.fillStyle = '#8aa0bf';
    ctx.font = '11px Arial';
    if (this.mode === 'slots') {
      ctx.fillText('W/S or Up/Down: select slot', rightX + 16, rightY + rightH - 58);
      ctx.fillText('ENTER: play with slot | C: create/edit | DEL: delete | ESC: back', rightX + 16, rightY + rightH - 40);
    } else {
      ctx.fillText('W/S: field  A/D: change value', rightX + 16, rightY + rightH - 58);
      ctx.fillText('P: save  ENTER: save and play  ESC: cancel edit', rightX + 16, rightY + rightH - 40);
    }

    ctx.textAlign = 'left';
  }
}

export default CharacterSelectMenu;
