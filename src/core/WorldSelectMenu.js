// ========================================
// WorldSelectMenu - World Selection UI
// Displays available worlds with descriptions
// ========================================

export class WorldSelectMenu {
  constructor(worldManager) {
    this.worldManager = worldManager;
    this.isOpen = true; // Shown at start
    this.selectedIndex = 0;
    this.worlds = worldManager.getWorldList();
  }

  handleKeyPress(key) {
    if (key === 'arrowup' || key === 'w') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    } else if (key === 'arrowdown' || key === 's') {
      this.selectedIndex = Math.min(this.worlds.length - 1, this.selectedIndex + 1);
    } else if (key === 'enter') {
      return this.selectWorld();
    }
  }

  selectWorld() {
    const selected = this.worlds[this.selectedIndex];
    this.worldManager.setCurrentWorld(selected.id);
    this.isOpen = false;
    return selected.id;
  }

  draw(ctx, canvas) {
    if (!this.isOpen) return;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(6, 10, 20, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#99BBFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT YOUR WORLD', canvas.width / 2, 60);

    // Instructions
    ctx.fillStyle = '#667788';
    ctx.font = '12px Arial';
    ctx.fillText('Use Arrow Keys or W/S to navigate, Press ENTER to select', canvas.width / 2, 90);

    // World boxes
    const boxWidth = 280;
    const boxHeight = 110;
    const boxGap = 30;
    const totalHeight = this.worlds.length * (boxHeight + boxGap);
    const startY = (canvas.height - totalHeight) / 2 + 40;

    for (let i = 0; i < this.worlds.length; i++) {
      const world = this.worlds[i];
      const y = startY + i * (boxHeight + boxGap);
      const x = (canvas.width - boxWidth) / 2;

      const isSelected = i === this.selectedIndex;

      // Box background
      ctx.fillStyle = isSelected ? 'rgba(80, 130, 255, 0.2)' : 'rgba(20, 30, 50, 0.6)';
      ctx.fillRect(x, y, boxWidth, boxHeight);

      // Box border
      ctx.strokeStyle = isSelected ? '#5599FF' : '#334455';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, boxWidth, boxHeight);

      // World name
      ctx.fillStyle = isSelected ? '#AAFFCC' : '#99BBFF';
      ctx.font = isSelected ? 'bold 16px Arial' : '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(world.name, x + 15, y + 25);

      // Description
      ctx.fillStyle = '#889999';
      ctx.font = '11px Arial';
      ctx.fillText(world.description, x + 15, y + 45);

      // Stats
      ctx.fillStyle = '#667788';
      ctx.font = '10px Arial';
      ctx.fillText(`Trees: ${world.treeCount} | Rocks: ${world.rockCount}`, x + 15, y + 65);
      ctx.fillText(`Enemy Danger: Day=${world.baseEnemySpawnsPerSecond.toFixed(1)}/s Night=${(world.baseEnemySpawnsPerSecond * world.nightEnemyMultiplier).toFixed(1)}/s`, x + 15, y + 80);

      // Selection indicator
      if (isSelected) {
        ctx.fillStyle = '#AAFFCC';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('► SELECT', x + boxWidth - 15, y + 25);
      }
    }
  }
}

export default WorldSelectMenu;
