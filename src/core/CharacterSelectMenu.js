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
    this.accessoryOptions = ['none', 'bandana', 'glasses', 'earring', 'crown', 'headphones', 'mask'];
    // 20 hair styles grouped by category
    this.hairStyleOptions = [
      'none',
      // Anime (5)
      'anime_ahoge', 'anime_twintails', 'anime_bangs', 'anime_straight', 'anime_spiky',
      // Female (5)
      'female_wavy', 'female_curly', 'female_braid', 'female_bob', 'female_half_up',
      // Medieval (5)
      'medieval_knight', 'medieval_maiden', 'medieval_noble', 'medieval_warrior', 'medieval_peasant',
      // Ridiculous (5)
      'ridiculous_poodle', 'ridiculous_neon', 'ridiculous_worm', 'ridiculous_bubble', 'ridiculous_afro',
      // Custom
      'fancy_anime',
      'special_spiky'
    ];
    this.hairColorOptions = ['#2a1a12', '#4b2e20', '#7a4f2f', '#d8c18a', '#e86b3d', '#2d3a8a', '#ff69b4', '#00ff00', '#ff0080', '#ffff00'];
    this.eyeTypeOptions = ['round', 'sharp', 'sleepy', 'big'];
    this.starterElementOptions = ['fire', 'water', 'earth', 'air', 'lightning'];

    this.fieldDefs = [
      { key: 'faceType', label: 'Face', options: this.faceOptions },
      { key: 'size', label: 'Size', options: this.sizeOptions },
      { key: 'color', label: 'Body Color', options: this.colorOptions },
      { key: 'accessory', label: 'Accessory', options: this.accessoryOptions },
      { key: 'hairStyle', label: 'Hair Layer 1', options: this.hairStyleOptions },
      { key: 'hairStyle2', label: 'Hair Layer 2', options: this.hairStyleOptions },
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
      hairStyle: 'anime_straight',
      hairStyle2: 'none',
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
    const hairStyle1 = meta.hairStyle || 'none';
    const hairStyle2 = meta.hairStyle2 || 'none';
    const hairColor = meta.hairColor || '#4b2e20';

    if (hairStyle1 !== 'none') {
      ctx.save();
      ctx.fillStyle = hairColor;
      ctx.strokeStyle = hairColor;
      ctx.lineWidth = Math.max(1.1, radius * 0.12);
      this._drawPreviewBackShell(ctx, x, y, radius);
      this._drawPreviewHair(ctx, x, y, radius * 1.04, hairStyle1);
      ctx.restore();
    }

    ctx.fillStyle = meta.color || '#ff7a59';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (hairStyle2 !== 'none') {
      ctx.save();
      ctx.fillStyle = hairColor;
      ctx.strokeStyle = this._darkenPreviewColor(hairColor, 0.18);
      ctx.lineWidth = Math.max(1, radius * 0.06);
      this._drawPreviewFrontFringe(ctx, x, y, radius, hairStyle2);
      ctx.restore();
    }

    // Draw accessories
    const accessory = meta.accessory || 'none';
    if (accessory === 'bandana') {
      ctx.save();
      ctx.fillStyle = '#d13d3d';
      ctx.fillRect(x - radius * 0.75, y - radius * 0.55, radius * 1.5, radius * 0.3);
      ctx.restore();
    } else if (accessory === 'headphones') {
      ctx.save();
      const bandY = y - radius * 0.86;
      const earY = y - radius * 0.24;
      ctx.strokeStyle = '#39475e';
      ctx.lineWidth = Math.max(2, radius * 0.18);
      ctx.beginPath();
      ctx.arc(x, bandY, radius * 0.92, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.fillStyle = '#53a4ff';
      ctx.fillRect(x - radius * 1.02, earY, radius * 0.34, radius * 0.62);
      ctx.fillRect(x + radius * 0.68, earY, radius * 0.34, radius * 0.62);
      ctx.restore();
    } else if (accessory === 'mask') {
      ctx.save();
      ctx.fillStyle = 'rgba(35, 45, 70, 0.94)';
      ctx.beginPath();
      ctx.roundRect(x - radius * 0.54, y - radius * 0.02, radius * 1.08, radius * 0.56, radius * 0.14);
      ctx.fill();
      ctx.strokeStyle = '#8fb5ff';
      ctx.lineWidth = Math.max(1, radius * 0.06);
      ctx.stroke();
      ctx.restore();
    }

    // Face
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
  }

  _darkenPreviewColor(hex, amount) {
    const num = parseInt(String(hex || '#4b2e20').replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, Math.floor((num >> 16 & 255) * (1 - amount))));
    const g = Math.max(0, Math.min(255, Math.floor((num >> 8 & 255) * (1 - amount))));
    const b = Math.max(0, Math.min(255, Math.floor((num & 255) * (1 - amount))));
    return '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  _drawPreviewBackShell(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.ellipse(x, y - radius * 0.42, radius * 1.05, radius * 0.96, 0, Math.PI * 0.86, Math.PI * 2.14);
    ctx.fill();
    ctx.fillRect(x - radius * 0.9, y - radius * 0.38, radius * 0.28, radius * 0.9);
    ctx.fillRect(x + radius * 0.62, y - radius * 0.38, radius * 0.28, radius * 0.9);
    for (let i = 0; i < 3; i++) {
      const spread = i - 1;
      const strandX = x + spread * radius * 0.36;
      const strandTop = y + radius * 0.42;
      const strandLen = radius * (0.62 + Math.abs(spread) * 0.18);
      const strandW = radius * 0.22;
      ctx.beginPath();
      ctx.moveTo(strandX - strandW * 0.45, strandTop);
      ctx.quadraticCurveTo(strandX - strandW * 0.3, strandTop + strandLen * 0.55, strandX, strandTop + strandLen);
      ctx.quadraticCurveTo(strandX + strandW * 0.3, strandTop + strandLen * 0.55, strandX + strandW * 0.45, strandTop);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawPreviewFrontFringe(ctx, x, y, radius, hairStyle) {
    if (hairStyle === 'special_spiky') {
      const R = radius * 1.45;
      const baseY = y - radius * 0.12;
      const spikes = [
        { x: -0.004639221090756845, y: -0.4974299637649948, w: 0.22, h: 0.5, rot: 180 },
        { x: 0.14958602287111278, y: -0.46495637175063015, w: 0.22, h: 0.5, rot: 195 },
        { x: -0.14154045177048424, y: -0.46031727807599776, w: 0.22, h: 0.5, rot: 161 },
        { x: -0.6321473173406525, y: 0.10565049381953816, w: 0.22, h: 0.5, rot: 161 },
        { x: 0.6354570957137592, y: 0.11956764742731094, w: 0.22, h: 0.5, rot: 191 }
      ];
      for (const s of spikes) {
        const px = x + s.x * R;
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
      afro:     { count: 3, width: 0.22, depth: 0.46, offset: 0.2 },
      fancy_anime: { count: 2, width: 0.14, depth: 0.7, offset: 0.22 }
    };
    const profile = profileMap[style] || { count: 3, width: 0.18, depth: 0.52, offset: 0.22 };
    const topY = y - radius * 0.96;
    for (let i = 0; i < profile.count; i++) {
      const spread = profile.count === 1 ? 0 : (i / (profile.count - 1)) * 2 - 1;
      const strandX = x + spread * radius * profile.offset;
      const strandW = radius * profile.width;
      const length = radius * profile.depth * (0.94 + Math.abs(spread) * 0.12);
      ctx.beginPath();
      ctx.moveTo(strandX - strandW * 0.5, topY);
      ctx.quadraticCurveTo(strandX - strandW * 0.34, topY + length * 0.56, strandX, topY + length);
      ctx.quadraticCurveTo(strandX + strandW * 0.34, topY + length * 0.56, strandX + strandW * 0.5, topY);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawPreviewHair(ctx, x, y, radius, hairStyle) {
    // Simplified hair rendering for preview - shows all 20 styles
    if (hairStyle === 'short') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.82, radius * 0.52, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - radius * 1.1, radius * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 'anime_ahoge') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.84, radius * 0.66, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 1.0);
      ctx.lineTo(x + radius * 0.22, y - radius * 2.0);
      ctx.stroke();
    } else if (hairStyle === 'anime_twintails') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.78, radius * 0.58, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const tailBaseX = x + side * radius * 0.78;
        const baseY = y - radius * 0.52;
        ctx.fillRect(tailBaseX - radius * 0.18, baseY, radius * 0.36, radius * 1.02);
        ctx.beginPath();
        ctx.arc(tailBaseX, baseY + radius * 1.08, radius * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hairStyle === 'anime_bangs') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.75, radius * 0.62, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * radius * 0.28;
        ctx.fillRect(x + offset - radius * 0.1, y - radius * 0.2, radius * 0.2, radius * 0.65);
      }
    } else if (hairStyle === 'anime_straight') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.65, radius * 0.65, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        ctx.fillRect(x + side * radius * 0.65 - radius * 0.16, y - radius * 0.4, radius * 0.32, radius * 1.0);
      }
    } else if (hairStyle === 'anime_spiky') {
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.72, y - radius * 0.42);
      ctx.lineTo(x - radius * 0.48, y - radius * 1.72);
      ctx.lineTo(x - radius * 0.16, y - radius * 0.54);
      ctx.lineTo(x + radius * 0.06, y - radius * 1.92);
      ctx.lineTo(x + radius * 0.28, y - radius * 0.56);
      ctx.lineTo(x + radius * 0.52, y - radius * 1.78);
      ctx.lineTo(x + radius * 0.78, y - radius * 0.42);
      ctx.closePath();
      ctx.fill();
    } else if (hairStyle === 'female_wavy') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.6, radius * 0.72, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const waveX = x + side * radius * 0.65;
          const waveY = y - radius * 0.3 + i * radius * 0.35;
          ctx.beginPath();
          ctx.arc(waveX, waveY, radius * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (hairStyle === 'female_curly') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.75, radius * 0.72, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const cx = x + Math.cos(angle) * radius * 0.68;
        const cy = y - radius * 0.45 + Math.sin(angle) * radius * 0.45;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hairStyle === 'female_braid') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.7, radius * 0.58, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        for (let j = 0; j < 3; j++) {
          ctx.fillRect(x + side * radius * 0.35 - radius * 0.12, y - radius * 0.4 + j * radius * 0.35, radius * 0.24, radius * 0.28);
        }
      }
    } else if (hairStyle === 'female_bob') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.65, radius * 0.62, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - radius * 0.7, y - radius * 0.4, radius * 0.35, radius * 0.65);
      ctx.fillRect(x + radius * 0.35, y - radius * 0.4, radius * 0.35, radius * 0.65);
    } else if (hairStyle === 'female_half_up') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.75, radius * 0.68, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - radius * 1.05, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        ctx.fillRect(x + side * radius * 0.5 - radius * 0.14, y - radius * 0.35, radius * 0.28, radius * 0.85);
      }
    } else if (hairStyle === 'medieval_knight') {
      ctx.fillRect(x - radius * 0.65, y - radius * 1.2, radius * 1.3, radius * 0.75);
    } else if (hairStyle === 'medieval_maiden') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.75, radius * 0.7, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - radius * 1.15, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        ctx.fillRect(x + side * radius * 0.68, y - radius * 0.3, radius * 0.22, radius * 1.1);
      }
    } else if (hairStyle === 'medieval_noble') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.8, radius * 0.82, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 'medieval_warrior') {
      ctx.fillRect(x - radius * 0.15, y - radius * 1.35, radius * 0.3, radius * 1.0);
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        ctx.fillRect(x + side * radius * 0.55, y - radius * 0.45, radius * 0.22, radius * 0.95);
      }
    } else if (hairStyle === 'medieval_peasant') {
      ctx.fillRect(x - radius * 0.58, y - radius * 0.45, radius * 1.16, radius * 1.05);
    } else if (hairStyle === 'ridiculous_poodle') {
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const cx = x + Math.cos(angle) * radius * 0.72;
        const cy = y - radius * 0.55 + Math.sin(angle) * radius * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hairStyle === 'ridiculous_neon') {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const startX = x + Math.cos(angle) * radius * 0.3;
        const startY = y - radius * 0.5 + Math.sin(angle) * radius * 0.2;
        const endX = x + Math.cos(angle) * radius * 1.0;
        const endY = y - radius * 0.8 + Math.sin(angle) * radius * 0.35;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = Math.max(2, radius * 0.25);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    } else if (hairStyle === 'ridiculous_worm') {
      for (let i = 0; i < 3; i++) {
        const startX = x - radius * 0.35 + i * radius * 0.35;
        ctx.beginPath();
        ctx.moveTo(startX, y - radius * 0.5);
        for (let j = 0; j < 4; j++) {
          ctx.lineTo(startX, y - radius * 0.5 + j * radius * 0.35);
        }
        ctx.lineWidth = Math.max(2, radius * 0.22);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    } else if (hairStyle === 'ridiculous_bubble') {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const cx = x + Math.cos(angle) * radius * 0.65;
        const cy = y - radius * 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hairStyle === 'ridiculous_afro') {
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.5, radius * 0.9, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const cx = x + Math.cos(angle) * radius * 0.85;
        const cy = y - radius * 0.35 + Math.sin(angle) * radius * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hairStyle === 'fancy_anime') {
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
        const px = x + s.x * radius;
        const py = y + s.y * radius;
        const rot = (s.rot || 0) * Math.PI / 180;
        ctx.save();
        ctx.translate(px, py);
        if (rot) ctx.rotate(rot);
        if (s.t === 'c') {
          ctx.beginPath();
          ctx.arc(0, 0, s.r * radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.t === 's') {
          const baseW = Math.max(6, s.w * radius);
          const h = Math.max(12, s.h * radius);
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

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
          ctx.closePath();
          ctx.fillStyle = baseColor;
          ctx.fill();
          ctx.strokeStyle = this._darkenPreviewColor(baseColor, -0.18);
          ctx.lineWidth = Math.max(1, radius * 0.02);
          ctx.stroke();
        } else if (s.t === 'r') {
          const w = s.w * radius, h = s.h * radius;
          const grad = ctx.createLinearGradient(-w*0.2, -h/2, w*0.2, h/2);
          grad.addColorStop(0, this._darkenPreviewColor(baseColor, 0.14));
          grad.addColorStop(0.6, baseColor);
          grad.addColorStop(1, this._darkenPreviewColor(baseColor, -0.08));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(-w * 0.4, h * 0.5);
          ctx.quadraticCurveTo(-w * 0.2, h * 0.1, 0, -h * 0.4);
          ctx.quadraticCurveTo(w * 0.12, -h * 0.6, w * 0.28, -h * 0.7);
          ctx.quadraticCurveTo(w * 0.02, -h * 0.5, -w * 0.18, -h * 0.2);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.0; ctx.stroke();
        } else if (s.t === 'a') {
          const w = s.w * radius, h = s.h * radius;
          ctx.beginPath();
          ctx.moveTo(-w * 0.45, h * 0.45);
          ctx.bezierCurveTo(-w * 0.35, h * 0.1, -w * 0.05, -h * 0.05, w * 0.08, -h * 0.5);
          ctx.bezierCurveTo(w * 0.18, -h * 0.65, w * 0.42, -h * 0.78, w * 0.6, -h * 0.9);
          ctx.lineTo(w * 0.48, -h * 0.85);
          ctx.bezierCurveTo(w * 0.28, -h * 0.6, w * 0.06, -h * 0.3, -w * 0.2, h * 0.25);
          ctx.closePath();
          ctx.fillStyle = baseColor; ctx.fill();
          ctx.fillStyle = this._darkenPreviewColor(baseColor, -0.16);
          ctx.beginPath(); ctx.moveTo(0, -h * 0.2); ctx.quadraticCurveTo(w * 0.22, -h * 0.18, w * 0.26, -h * 0.42); ctx.lineTo(w * 0.18, -h * 0.42); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = this._darkenPreviewColor(baseColor, 0.36); ctx.lineWidth = Math.max(1, radius * 0.008); ctx.beginPath(); ctx.moveTo(-w * 0.18, h * 0.06); ctx.quadraticCurveTo(0, -h * 0.02, w * 0.12, -h * 0.24); ctx.stroke();
        } else if (s.t === 'l') {
          const w = s.w * radius, h = s.h * radius;
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.quadraticCurveTo(w * 0.6, -h * 0.08, 0, h / 2);
          ctx.quadraticCurveTo(-w * 0.6, -h * 0.08, 0, -h / 2);
          ctx.closePath(); ctx.fillStyle = baseColor; ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = Math.max(1, radius * 0.006 * 0.2); ctx.beginPath(); ctx.moveTo(0, -h / 2 + 2); ctx.lineTo(0, h / 2 - 2); ctx.stroke();
        }
        ctx.restore();
      }
    } else if (hairStyle === 'special_spiky') {
      // Layer 1 only: behind circles + top spikes. Front spikes are drawn by _drawPreviewFrontFringe.
      const baseColor = ctx.fillStyle || '#4b2e20';
      const R = radius * 1.32;
      const baseY = y - radius * 0.18;

      // behind face circles
      const behind = [
        { x: 0, y: -0.38093333136806706, r: 0.5800000000000003 },
        { x: 0.4186529463352946, y: -0.1907310640806984, r: 0.5800000000000003 },
        { x: -0.36421592882384424, y: -0.1814528767314336, r: 0.5800000000000003 }
      ];
      for (const b of behind) {
        const px = x + b.x * R;
        const py = baseY + b.y * R;
        ctx.save();
        ctx.fillStyle = baseColor;
        ctx.beginPath(); ctx.arc(px, py, Math.max(2.8, b.r * R), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // hair1 triangles (spikes)
      const h1 = [
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
      for (const s of h1) {
        const px = x + s.x * R;
        const py = baseY + s.y * R;
        const rot = (s.rot || 0) * Math.PI / 180;
        const w = Math.max(2.5, s.w * R);
        const h = Math.max(2.5, s.h * R);
        ctx.save(); ctx.translate(px, py); if (rot) ctx.rotate(rot);
        ctx.fillStyle = baseColor; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(-w / 2, h / 2); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

    } else {
      // Default fallback
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.8, radius * 0.55, Math.PI, Math.PI * 2);
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
