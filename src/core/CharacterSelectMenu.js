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
    this.isNaming = false;

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

    // Layout constants shared between draw() and handleClick()
    this._ly = {
      leftX: 50, topY: 92, slotBoxW: 188, slotH: 62, slotGap: 12,
      editBtnX: 246, editBtnW: 50, delBtnX: 300, delBtnW: 44, btnH: 22, btnY: 9,
      rightX: 380, rightY: 95, rightW: 370, rightH: 406
    };
  }

  open(worldId) {
    this.selectedWorldId = worldId || this.selectedWorldId;
    this.isOpen = true;
    this.mode = 'slots';
    this.editFieldIndex = 0;
    this.editingCharacter = null;
    this.isNaming = false;
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
    this.editingCharacter.name = (this.editingCharacter.name || `Adventurer ${this.selectedSlot + 1}`).trim();
    if (!this.editingCharacter.name) {
      this.editingCharacter.name = `Adventurer ${this.selectedSlot + 1}`;
    }
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
      if (key === 'escape') return { action: 'back_world' };
      if (key === 'enter') {
        const selected = this.characterManager.getSlot(this.selectedSlot);
        if (selected) return { action: 'start', slot: this.selectedSlot, character: selected };
        this._ensureEditingCharacter();
        this.mode = 'edit';
      }
      return null;
    }

    if (this.mode === 'edit') {
      if (this.isNaming) {
        if (key === 'enter' || key === 'escape') { this.isNaming = false; return null; }
        if (key === 'backspace') {
          this.editingCharacter.name = String(this.editingCharacter.name || '').slice(0, -1);
          return null;
        }
        if (key === ' ') {
          if ((this.editingCharacter.name || '').length < 18)
            this.editingCharacter.name = String(this.editingCharacter.name || '') + ' ';
          return null;
        }
        if (key.length === 1 && /^[a-z0-9_ -]$/i.test(key)) {
          if ((this.editingCharacter.name || '').length < 18)
            this.editingCharacter.name = String(this.editingCharacter.name || '') + key;
          return null;
        }
        return null;
      }

      if (key === 'escape') {
        this.mode = 'slots'; this.editFieldIndex = 0;
        this.editingCharacter = null; this.isNaming = false;
        return null;
      }
      if (key === 'arrowup' || key === 'w') { this.editFieldIndex = Math.max(0, this.editFieldIndex - 1); return null; }
      if (key === 'arrowdown' || key === 's') { this.editFieldIndex = Math.min(this.fieldDefs.length - 1, this.editFieldIndex + 1); return null; }
      if (key === 'arrowleft' || key === 'a') { this._cycleOption(this.fieldDefs[this.editFieldIndex], -1); return null; }
      if (key === 'arrowright' || key === 'd') { this._cycleOption(this.fieldDefs[this.editFieldIndex], 1); return null; }
      if (key === 'enter') {
        this._saveEditing(); this.isNaming = false;
        const selected = this.characterManager.getSlot(this.selectedSlot);
        if (selected) return { action: 'start', slot: this.selectedSlot, character: selected };
      }
      return null;
    }

    return null;
  }

  handleClick(x, y) {
    if (!this.isOpen) return null;
    const ly = this._ly;
    const slots = this._getSlots();

    if (this.mode === 'slots') {
      for (let i = 0; i < this.characterManager.maxSlots; i++) {
        const sy = ly.topY + i * (ly.slotH + ly.slotGap);
        const slot = slots[i];

        // Edit button (occupied slots only)
        if (slot &&
            x >= ly.editBtnX && x <= ly.editBtnX + ly.editBtnW &&
            y >= sy + ly.btnY && y <= sy + ly.btnY + ly.btnH) {
          this.selectedSlot = i;
          this._ensureEditingCharacter();
          this.mode = 'edit';
          return null;
        }

        // Delete button (occupied slots only)
        if (slot &&
            x >= ly.delBtnX && x <= ly.delBtnX + ly.delBtnW &&
            y >= sy + ly.btnY && y <= sy + ly.btnY + ly.btnH) {
          this.characterManager.deleteSlot(i);
          return { action: 'deleted' };
        }

        // Slot body → select; if empty → auto-create and enter edit
        if (x >= ly.leftX && x <= ly.leftX + ly.slotBoxW &&
            y >= sy && y <= sy + ly.slotH) {
          this.selectedSlot = i;
          if (!slot) {
            this._ensureEditingCharacter();
            this.mode = 'edit';
          }
          return null;
        }
      }

      const { rightX: rx, rightY: ry, rightW: rw, rightH: rh } = ly;

      // Play button
      const pbx = rx + rw / 2 - 68, pby = ry + rh - 42;
      if (x >= pbx && x <= pbx + 136 && y >= pby && y <= pby + 30) {
        const sel = this.characterManager.getSlot(this.selectedSlot);
        if (sel) return { action: 'start', slot: this.selectedSlot, character: sel };
        this._ensureEditingCharacter();
        this.mode = 'edit';
        return null;
      }

      // Back button
      const bbx = rx + rw / 2 - 50, bby = ry + rh - 80;
      if (x >= bbx && x <= bbx + 100 && y >= bby && y <= bby + 28) {
        return { action: 'back_world' };
      }

      return null;
    }

    if (this.mode === 'edit') {
      const { rightX: rx, rightY: ry, rightW: rw, rightH: rh } = ly;

      // Name input row click → activate typing
      if (x >= rx + 130 && x <= rx + rw - 10 && y >= ry + 32 && y <= ry + 56) {
        this.isNaming = true;
        if (!this.editingCharacter.name) this.editingCharacter.name = '';
        return null;
      }

      // Field rows — left arrow, right arrow, or select
      for (let i = 0; i < this.fieldDefs.length; i++) {
        const fy = ry + 72 + i * 28;
        if (y >= fy - 13 && y <= fy + 10) {
          this.isNaming = false;
          if (x >= rx + 10 && x <= rx + 32) {
            this.editFieldIndex = i;
            this._cycleOption(this.fieldDefs[i], -1);
            return null;
          }
          if (x >= rx + rw - 32 && x <= rx + rw - 10) {
            this.editFieldIndex = i;
            this._cycleOption(this.fieldDefs[i], 1);
            return null;
          }
          if (x >= rx + 10 && x <= rx + rw - 10) {
            this.editFieldIndex = i;
            return null;
          }
        }
      }

      // Save & Play
      if (x >= rx + 10 && x <= rx + 165 && y >= ry + rh - 42 && y <= ry + rh - 12) {
        this._saveEditing();
        this.mode = 'slots'; this.editingCharacter = null; this.isNaming = false;
        const sel = this.characterManager.getSlot(this.selectedSlot);
        if (sel) return { action: 'start', slot: this.selectedSlot, character: sel };
        return null;
      }

      // Save
      if (x >= rx + 173 && x <= rx + 263 && y >= ry + rh - 42 && y <= ry + rh - 12) {
        this._saveEditing();
        this.mode = 'slots'; this.editingCharacter = null; this.isNaming = false;
        return { action: 'saved' };
      }

      // Cancel
      if (x >= rx + 271 && x <= rx + 361 && y >= ry + rh - 42 && y <= ry + rh - 12) {
        this.mode = 'slots'; this.editFieldIndex = 0;
        this.editingCharacter = null; this.isNaming = false;
        return null;
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
    const ly = this._ly;
    const slots = this._getSlots();
    const worldName = this.worldManager.getWorldConfig(this.selectedWorldId)?.name || this.selectedWorldId;
    const { leftX, topY, slotBoxW, slotH, slotGap,
            editBtnX, editBtnW, delBtnX, delBtnW, btnH, btnY,
            rightX: rx, rightY: ry, rightW: rw, rightH: rh } = ly;

    ctx.fillStyle = 'rgba(5, 9, 16, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#99bbff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.mode === 'edit' ? 'CREATE / EDIT CHARACTER' : 'CHARACTER SELECT', canvas.width / 2, 42);
    ctx.fillStyle = '#8aa0bf';
    ctx.font = '12px Arial';
    ctx.fillText(`World: ${worldName}`, canvas.width / 2, 62);

    // ── Slot list ──────────────────────────────────────────────────────────
    ctx.textAlign = 'left';
    for (let i = 0; i < this.characterManager.maxSlots; i++) {
      const sy = topY + i * (slotH + slotGap);
      const selected = i === this.selectedSlot;
      const slot = slots[i];

      ctx.fillStyle = selected ? 'rgba(85, 140, 255, 0.22)' : 'rgba(18, 30, 44, 0.78)';
      ctx.fillRect(leftX, sy, slotBoxW, slotH);
      ctx.strokeStyle = selected ? '#66a3ff' : '#32465d';
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.strokeRect(leftX, sy, slotBoxW, slotH);

      ctx.fillStyle = '#d7e4ff';
      ctx.font = 'bold 13px Arial';
      ctx.fillText(`Slot ${i + 1}`, leftX + 10, sy + 20);

      if (slot) {
        ctx.fillStyle = '#b7d0ff';
        ctx.font = '11px Arial';
        ctx.fillText(`${slot.name}  ·  ${slot.starterElement}`, leftX + 10, sy + 37);
        ctx.fillStyle = '#7a9ac0';
        ctx.fillText(`${slot.faceType} · ${slot.eyeType} · sz${slot.size}`, leftX + 10, sy + 53);

        // Edit button
        ctx.fillStyle = 'rgba(55, 95, 200, 0.88)';
        ctx.fillRect(editBtnX, sy + btnY, editBtnW, btnH);
        ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 1;
        ctx.strokeRect(editBtnX, sy + btnY, editBtnW, btnH);
        ctx.fillStyle = '#d0e8ff'; ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Edit', editBtnX + editBtnW / 2, sy + btnY + 15);

        // Delete button
        ctx.fillStyle = 'rgba(170, 35, 35, 0.88)';
        ctx.fillRect(delBtnX, sy + btnY, delBtnW, btnH);
        ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 1;
        ctx.strokeRect(delBtnX, sy + btnY, delBtnW, btnH);
        ctx.fillStyle = '#ffd8d8'; ctx.font = 'bold 10px Arial';
        ctx.fillText('Del', delBtnX + delBtnW / 2, sy + btnY + 15);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = '#4a6680'; ctx.font = '11px Arial';
        ctx.fillText('— click to create —', leftX + 10, sy + 38);
      }
    }

    // ── Right panel ────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(14, 24, 37, 0.90)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#3a5570'; ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    const current = this.mode === 'edit'
      ? (this.editingCharacter || slots[this.selectedSlot] || this._getFallbackCharacter(this.selectedSlot))
      : (slots[this.selectedSlot] || this._getFallbackCharacter(this.selectedSlot));

    this.drawPreviewCharacter(ctx, rx + 62, ry + 82, current);

    if (this.mode === 'edit') {
      ctx.fillStyle = '#bfe0ff'; ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Editing: Slot ${this.selectedSlot + 1}`, rx + rw / 2, ry + 17);

      // Name input box (clickable)
      const nbx = rx + 130, nby = ry + 32, nbw = rw - 140, nbh = 24;
      ctx.fillStyle = this.isNaming ? 'rgba(55, 100, 220, 0.30)' : 'rgba(20, 35, 55, 0.80)';
      ctx.fillRect(nbx, nby, nbw, nbh);
      ctx.strokeStyle = this.isNaming ? '#66aaff' : '#44606e';
      ctx.lineWidth = this.isNaming ? 2 : 1;
      ctx.strokeRect(nbx, nby, nbw, nbh);
      ctx.fillStyle = '#7ab0cc'; ctx.font = '10px Arial'; ctx.textAlign = 'left';
      ctx.fillText('Name  ▶', nbx + 6, nby + 16);
      ctx.fillStyle = '#ddf0ff'; ctx.font = this.isNaming ? 'bold 11px Arial' : '11px Arial';
      ctx.fillText(String(current.name || '') + (this.isNaming ? '|' : ''), nbx + 58, nby + 16);

      // Field rows with < > arrows
      for (let i = 0; i < this.fieldDefs.length; i++) {
        const field = this.fieldDefs[i];
        const fy = ry + 72 + i * 28;
        const isSel = i === this.editFieldIndex;
        if (isSel) {
          ctx.fillStyle = 'rgba(80, 140, 255, 0.16)';
          ctx.fillRect(rx + 10, fy - 13, rw - 20, 22);
        }
        ctx.fillStyle = isSel ? '#66aaff' : '#3a5a88';
        ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
        ctx.fillText('<', rx + 22, fy);
        ctx.fillText('>', rx + rw - 22, fy);
        ctx.fillStyle = isSel ? '#cce5ff' : '#9fb6d3';
        ctx.font = isSel ? 'bold 11px Arial' : '11px Arial'; ctx.textAlign = 'left';
        ctx.fillText(`${field.label}:`, rx + 40, fy);
        const val = String(current[field.key]);
        if (field.key === 'color' || field.key === 'hairColor') {
          ctx.fillStyle = val;
          ctx.fillRect(rx + 148, fy - 9, 13, 12);
          ctx.strokeStyle = '#33445e'; ctx.lineWidth = 1;
          ctx.strokeRect(rx + 148, fy - 9, 13, 12);
          ctx.fillStyle = isSel ? '#cce5ff' : '#9fb6d3';
          ctx.font = isSel ? 'bold 10px Arial' : '10px Arial';
          ctx.fillText(val, rx + 165, fy);
        } else {
          ctx.fillStyle = isSel ? '#e8f6ff' : '#b8d4f0';
          ctx.fillText(val, rx + 148, fy);
        }
      }

      // Hint
      ctx.fillStyle = '#4a6a8a'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('Click < > to change  ·  Click name to type  ·  Arrows/WASD to navigate', rx + rw / 2, ry + rh - 54);

      // Buttons
      ctx.fillStyle = 'rgba(38, 155, 76, 0.90)';
      ctx.fillRect(rx + 10, ry + rh - 42, 155, 30);
      ctx.strokeStyle = '#44dd88'; ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 10, ry + rh - 42, 155, 30);
      ctx.fillStyle = '#c8ffdd'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText('▶ Save & Play', rx + 10 + 78, ry + rh - 22);

      ctx.fillStyle = 'rgba(44, 88, 180, 0.90)';
      ctx.fillRect(rx + 173, ry + rh - 42, 90, 30);
      ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 173, ry + rh - 42, 90, 30);
      ctx.fillStyle = '#c8e0ff';
      ctx.fillText('Save', rx + 173 + 45, ry + rh - 22);

      ctx.fillStyle = 'rgba(80, 55, 55, 0.90)';
      ctx.fillRect(rx + 271, ry + rh - 42, 90, 30);
      ctx.strokeStyle = '#886666'; ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 271, ry + rh - 42, 90, 30);
      ctx.fillStyle = '#ffc8c8';
      ctx.fillText('Cancel', rx + 271 + 45, ry + rh - 22);

    } else {
      ctx.fillStyle = '#d7e4ff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
      ctx.fillText('Character Preview', rx + rw / 2, ry + 17);
      ctx.textAlign = 'left'; ctx.fillStyle = '#9fb6d3'; ctx.font = '11px Arial';
      ctx.fillText(`Name: ${current.name || '—'}`, rx + 130, ry + 40);
      ctx.fillText(`Face: ${current.faceType}`, rx + 130, ry + 58);
      ctx.fillText(`Size: ${current.size}`, rx + 130, ry + 76);
      ctx.fillText(`Accessory: ${current.accessory}`, rx + 130, ry + 94);
      ctx.fillText(`Hair: ${current.hairStyle}`, rx + 130, ry + 112);
      ctx.fillText(`Eyes: ${current.eyeType}`, rx + 130, ry + 130);
      ctx.fillText(`Starter: ${current.starterElement}`, rx + 130, ry + 148);

      // Back button
      const bbx = rx + rw / 2 - 50, bby = ry + rh - 80;
      ctx.fillStyle = 'rgba(36, 54, 80, 0.88)';
      ctx.fillRect(bbx, bby, 100, 28);
      ctx.strokeStyle = '#446688'; ctx.lineWidth = 1.5;
      ctx.strokeRect(bbx, bby, 100, 28);
      ctx.fillStyle = '#88a8c8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText('← Back', bbx + 50, bby + 18);

      // Play button
      const pbx = rx + rw / 2 - 68, pby = ry + rh - 42;
      const hasChar = !!slots[this.selectedSlot];
      ctx.fillStyle = hasChar ? 'rgba(38, 155, 76, 0.90)' : 'rgba(55, 80, 55, 0.55)';
      ctx.fillRect(pbx, pby, 136, 30);
      ctx.strokeStyle = hasChar ? '#44dd88' : '#446644'; ctx.lineWidth = 1.5;
      ctx.strokeRect(pbx, pby, 136, 30);
      ctx.fillStyle = hasChar ? '#c8ffdd' : '#88aa88';
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillText(hasChar ? '▶ Play' : 'Select a character', pbx + 68, pby + 20);
    }

    ctx.textAlign = 'left';
  }
}

export default CharacterSelectMenu;
