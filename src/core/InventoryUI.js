// ========================================
// InventoryUI - On-canvas Inventory Panel
// Opened/closed with the I key
// ========================================

export class InventoryUI {
  constructor(gameData, gameState, player) {
    this.gameData   = gameData;
    this.gameState  = gameState;
    this.player     = player;
    this.isOpen     = false;
  }

  toggle() { this.isOpen = !this.isOpen; }

  draw(ctx, canvas) {
    if (!this.isOpen) return;

    const SLOT = 54, GAP = 6, COLS = 5, ROWS = 4, PAD = 16;
    const panelW = COLS * (SLOT + GAP) - GAP + PAD * 2;
    const panelH = ROWS * (SLOT + GAP) - GAP + PAD * 2 + 58;
    const px = Math.floor((canvas.width  - panelW) / 2);
    const py = Math.floor((canvas.height - panelH) / 2);

    // Panel background
    ctx.fillStyle   = 'rgba(6, 10, 20, 0.93)';
    ctx.strokeStyle = 'rgba(80, 130, 255, 0.50)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 10);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle   = '#99BBFF';
    ctx.font        = 'bold 14px Arial';
    ctx.textAlign   = 'center';
    ctx.fillText('INVENTORY', px + panelW / 2, py + 22);
    ctx.fillStyle   = '#445566';
    ctx.font        = '10px Arial';
    ctx.fillText('[I] Close  |  Right-click trees to harvest', px + panelW / 2, py + 36);

    // Build item look-up map
    const items   = Object.entries(this.gameState.inventory.items || {}).filter(([, c]) => c > 0);
    const itemMap = {};
    if (this.gameData.items) {
      for (const it of this.gameData.items) itemMap[it.id] = it;
    }

    // Draw slots
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sx = px + PAD + c * (SLOT + GAP);
        const sy = py + 46 + r * (SLOT + GAP);

        // Slot background
        ctx.fillStyle   = '#0a1020';
        ctx.strokeStyle = '#1e2e44';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(sx, sy, SLOT, SLOT, 4);
        ctx.fill();
        ctx.stroke();

        if (idx < items.length) {
          const [id, count] = items[idx];
          const def = itemMap[id];

          // Item colour block
          ctx.fillStyle   = def ? def.color : '#AAAAAA';
          ctx.strokeStyle = 'rgba(255,255,255,0.10)';
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.roundRect(sx + 7, sy + 7, SLOT - 14, SLOT - 22, 3);
          ctx.fill();
          ctx.stroke();

          // Item label
          ctx.fillStyle = '#8899AA';
          ctx.font      = '8px Arial';
          ctx.textAlign = 'center';
          const label = def ? (def.name.length > 9 ? def.name.slice(0, 8) + '.' : def.name) : id;
          ctx.fillText(label, sx + SLOT / 2, sy + SLOT - 10);

          // Count badge
          ctx.fillStyle = '#FFD700';
          ctx.font      = 'bold 11px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(count, sx + SLOT - 4, sy + SLOT - 3);

          idx++;
        }
      }
    }

    // XP / Level bar at the bottom of the panel
    const p = this.player;
    if (p) {
      const barY = py + panelH - 20;
      const barX = px + PAD;
      const barW = panelW - PAD * 2;
      const prev = p._xpTable ? (p._xpTable[p.level - 1] || 0) : 0;
      const next = p.xpToNext || 50;

      ctx.fillStyle = '#AAFFCC';
      ctx.font      = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Lv ${p.level || 1}   XP: ${(p.xp || 0) - prev} / ${next - prev}`, barX, barY - 3);

      ctx.fillStyle = '#0a1020';
      ctx.fillRect(barX, barY, barW, 10);
      ctx.fillStyle = '#00DD77';
      ctx.fillRect(barX, barY, barW * (p.xpProgress || 0), 10);
      ctx.strokeStyle = '#1a3a2a';
      ctx.lineWidth   = 1;
      ctx.strokeRect(barX, barY, barW, 10);
    }

    ctx.textAlign = 'left';
  }
}

export default InventoryUI;
