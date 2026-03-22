// ========================================
// InventoryUI - On-canvas Inventory Panel
// Opened/closed with the I key
// With tabs for Items, Abilities, and Hotbar
// ========================================

export class InventoryUI {
  constructor(gameData, gameState, player) {
    this.gameData   = gameData;
    this.gameState  = gameState;
    this.player     = player;
    this.isOpen     = false;
    this.tab        = 'items'; // 'items', 'abilities', 'hotbar'
    this.scrollPos  = 0;
    this.selectedAbility = null;
    this.selectedItem = null;
    this.selectedHotbarSlot = null;
  }

  toggle() { this.isOpen = !this.isOpen; }

  handleKeyInput(key) {
    if (!this.isOpen) return;
    if (key === 'q') this.tab = 'items';
    if (key === 'w') this.tab = 'abilities';
    if (key === 'e') this.tab = 'hotbar';
    if (key === 'arrowup') this.scrollPos = Math.max(0, this.scrollPos - 20);
    if (key === 'arrowdown') this.scrollPos = Math.min(200, this.scrollPos + 20);
  }

  draw(ctx, canvas) {
    if (!this.isOpen) return;

    const panelW = 500;
    const panelH = 450;
    const px = Math.floor((canvas.width - panelW) / 2);
    const py = Math.floor((canvas.height - panelH) / 2);

    // Panel background
    ctx.fillStyle = 'rgba(6, 10, 20, 0.95)';
    ctx.strokeStyle = 'rgba(80, 130, 255, 0.50)';
    ctx.lineWidth = 2;
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeRect(px, py, panelW, panelH);

    // Title and tabs
    ctx.fillStyle = '#99BBFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('INVENTORY', px + panelW / 2, py + 22);

    ctx.font = '10px Arial';
    ctx.fillStyle = '#667788';
    ctx.fillText('[I] Close | [Q] Items | [W] Abilities | [E] Hotbar | [↑↓] Scroll', px + panelW / 2, py + 36);

    // Tab buttons
    const tabs = ['items', 'abilities', 'hotbar'];
    const tabX = [px + 30, px + 150, px + 280];
    const tabW = 100, tabH = 20;
    for (let i = 0; i < tabs.length; i++) {
      const active = this.tab === tabs[i];
      ctx.fillStyle = active ? 'rgba(80, 130, 255, 0.3)' : 'rgba(20, 30, 50, 0.6)';
      ctx.strokeStyle = active ? '#5599FF' : '#334455';
      ctx.lineWidth = active ? 2 : 1;
      ctx.fillRect(tabX[i], py + 44, tabW, tabH);
      ctx.strokeRect(tabX[i], py + 44, tabW, tabH);
      ctx.fillStyle = active ? '#AAFFCC' : '#99BBFF';
      ctx.textAlign = 'center';
      ctx.fillText(tabs[i].toUpperCase(), tabX[i] + tabW / 2, py + 57);
    }

    // Content area
    const contentX = px + 12;
    const contentY = py + 75;
    const contentW = panelW - 24;
    const contentH = panelH - 95;

    // Draw tab content
    if (this.tab === 'items') {
      this.drawItemsTab(ctx, contentX, contentY, contentW, contentH);
    } else if (this.tab === 'abilities') {
      this.drawAbilitiesTab(ctx, contentX, contentY, contentW, contentH);
    } else if (this.tab === 'hotbar') {
      this.drawHotbarTab(ctx, contentX, contentY, contentW, contentH);
    }

    ctx.textAlign = 'left';
  }

  drawItemsTab(ctx, x, y, w, h) {
    // Draw XP bar at top
    const p = this.player;
    if (p) {
      const barH = 30;
      ctx.fillStyle = '#0a1020';
      ctx.strokeStyle = '#1e2e44';
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, w, barH);
      ctx.strokeRect(x, y, w, barH);

      ctx.fillStyle = '#AAFFCC';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      const prev = p._xpTable ? (p._xpTable[p.level - 1] || 0) : 0;
      const next = p.xpToNext || 50;
      ctx.fillText(`Level ${p.level} XP: ${(p.xp || 0) - prev}/${next - prev}`, x + 8, y + 12);

      ctx.fillStyle = '#00DD77';
      const barW = (w - 4) * (p.xpProgress || 0);
      ctx.fillRect(x + 2, y + 18, barW, 8);
      ctx.strokeStyle = '#1a3a2a';
      ctx.strokeRect(x + 2, y + 18, w - 4, 8);

      y += barH + 8;
      h -= barH + 8;
    }

    // Item grid
    const items = Object.entries(this.gameState.inventory.items || {}).filter(([, c]) => c > 0);
    const itemMap = {};
    if (this.gameData.items) {
      for (const it of this.gameData.items) itemMap[it.id] = it;
    }

    const SLOT = 50, GAP = 6, COLS = 4;
    let idx = 0;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < COLS; col++) {
        const sx = x + col * (SLOT + GAP);
        const sy = y + row * (SLOT + GAP);

        if (sy + SLOT > y + h) break;

        ctx.fillStyle = '#0a1020';
        ctx.strokeStyle = '#1e2e44';
        ctx.lineWidth = 1;
        ctx.fillRect(sx, sy, SLOT, SLOT);
        ctx.strokeRect(sx, sy, SLOT, SLOT);

        if (idx < items.length) {
          const [id, count] = items[idx];
          const def = itemMap[id];
          ctx.fillStyle = def ? def.color : '#AAAAAA';
          ctx.fillRect(sx + 4, sy + 4, SLOT - 8, SLOT - 16);
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(count, sx + SLOT - 3, sy + SLOT - 3);
          idx++;
        }
      }
    }
  }

  drawAbilitiesTab(ctx, x, y, w, h) {
    // Draw abilities list with scrolling
    const abilities = this.gameData.abilities || [];
    const itemH = 28, padding = 4;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    let drawY = y - this.scrollPos;
    for (let i = 0; i < abilities.length; i++) {
      const ab = abilities[i];
      if (drawY + itemH < y) {
        drawY += itemH + padding;
        continue;
      }
      if (drawY > y + h) break;

      const isSelected = this.selectedAbility === ab.id;
      ctx.fillStyle = isSelected ? 'rgba(80, 130, 255, 0.2)' : 'rgba(20, 30, 50, 0.6)';
      ctx.strokeStyle = isSelected ? '#5599FF' : '#334455';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fillRect(x + 2, drawY, w - 4, itemH);
      ctx.strokeRect(x + 2, drawY, w - 4, itemH);

      ctx.fillStyle = isSelected ? '#AAFFCC' : '#99BBFF';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(ab.name, x + 10, drawY + 17);

      ctx.fillStyle = '#667788';
      ctx.font = '8px Arial';
      ctx.fillText(`Damage: ${ab.baseDamage} | Cooldown: ${ab.cooldown}s`, x + 10, drawY + 24);

      drawY += itemH + padding;
    }

    ctx.restore();
  }

  drawHotbarTab(ctx, x, y, w, h) {
    ctx.fillStyle = '#667788';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Select ability or item, then click hotbar slot to assign:', x, y + 12);

    // Draw hotbar slots
    const slotH = 40, slotW = 60, slotGap = 8;
    const hotbarY = y + 30;
    for (let i = 0; i < 6; i++) {
      const slotX = x + i * (slotW + slotGap);
      const isSelected = this.selectedHotbarSlot === i;

      ctx.fillStyle = isSelected ? 'rgba(80, 130, 255, 0.3)' : 'rgba(20, 30, 50, 0.6)';
      ctx.strokeStyle = isSelected ? '#5599FF' : '#334455';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fillRect(slotX, hotbarY, slotW, slotH);
      ctx.strokeRect(slotX, hotbarY, slotW, slotH);

      ctx.fillStyle = '#99BBFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`[${i + 1}]`, slotX + slotW / 2, hotbarY + slotH - 8);

      // Show current ability
      const slot = this.gameState.hotbar[i];
      if (slot && slot.abilityId) {
        ctx.fillStyle = '#AAFFCC';
        ctx.font = '9px Arial';
        ctx.fillText(slot.abilityId.slice(0, 8), slotX + slotW / 2, hotbarY + 18);
      }
    }

    // Instructions
    ctx.fillStyle = '#445566';
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Selected: ' + (this.selectedAbility || this.selectedItem || 'nothing'), x, hotbarY + 60);
  }
}

export default InventoryUI;
