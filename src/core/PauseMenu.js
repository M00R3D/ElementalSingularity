const MAIN_OPTIONS = [
  { id: 'resume', label: 'Reanudar' },
  { id: 'game_mode', label: 'Modo de juego' },
  { id: 'world_select', label: 'Salir a seleccion de mundos' },
  { id: 'dev', label: 'Opciones de desarrollo' }
];

export class PauseMenu {
  constructor() {
    this.isOpen = false;
    this.section = 'main';
    this.selectedIndex = 0;
    this.showHitboxes = false;
    this.showEnemiesBar = false;
    this.showFpsBar = false;
    this.showModeBar = false;
    this.showCastBar = false;
    this.showNightBar = false;
    this.currentGameMode = 'survival';
    this.buttonRects = [];
  }

  getOptions() {
    if (this.section === 'game_mode') {
      return [
        { id: 'mode_peaceful', label: `Peaceful${this.currentGameMode === 'peaceful' ? '  [Activo]' : ''}` },
        { id: 'mode_survival', label: `Survival${this.currentGameMode === 'survival' ? '  [Activo]' : ''}` },
        { id: 'mode_creative', label: `Creative${this.currentGameMode === 'creative' ? '  [Activo]' : ''}` },
        { id: 'back', label: 'Volver' }
      ];
    }
    if (this.section === 'dev') {
      return [
        { id: 'toggle_hitboxes', label: `Ver hitbox: ${this.showHitboxes ? 'ON' : 'OFF'}` },
        { id: 'toggle_enemies_bar', label: `Barra Enemies: ${this.showEnemiesBar ? 'ON' : 'OFF'}` },
        { id: 'toggle_fps_bar', label: `Barra FPS: ${this.showFpsBar ? 'ON' : 'OFF'}` },
        { id: 'toggle_mode_bar', label: `Barra Mode: ${this.showModeBar ? 'ON' : 'OFF'}` },
        { id: 'toggle_cast_bar', label: `Barra Cast: ${this.showCastBar ? 'ON' : 'OFF'}` },
        { id: 'toggle_night_bar', label: `Barra Night: ${this.showNightBar ? 'ON' : 'OFF'}` },
        { id: 'back', label: 'Volver' }
      ];
    }
    return MAIN_OPTIONS;
  }

  open() {
    this.isOpen = true;
    this.section = 'main';
    this.selectedIndex = 0;
    this.buttonRects = [];
  }

  close() {
    this.isOpen = false;
    this.section = 'main';
    this.selectedIndex = 0;
    this.buttonRects = [];
  }

  navigate(direction) {
    const options = this.getOptions();
    if (!options.length) return;
    this.selectedIndex = (this.selectedIndex + direction + options.length) % options.length;
  }

  activate(actionId) {
    if (actionId === 'game_mode') {
      this.section = 'game_mode';
      this.selectedIndex = 0;
    } else if (actionId === 'dev') {
      this.section = 'dev';
      this.selectedIndex = 0;
    } else if (actionId === 'mode_peaceful') {
      this.currentGameMode = 'peaceful';
    } else if (actionId === 'mode_survival') {
      this.currentGameMode = 'survival';
    } else if (actionId === 'mode_creative') {
      this.currentGameMode = 'creative';
    } else if (actionId === 'toggle_hitboxes') {
      this.showHitboxes = !this.showHitboxes;
    } else if (actionId === 'toggle_enemies_bar') {
      this.showEnemiesBar = !this.showEnemiesBar;
    } else if (actionId === 'toggle_fps_bar') {
      this.showFpsBar = !this.showFpsBar;
    } else if (actionId === 'toggle_mode_bar') {
      this.showModeBar = !this.showModeBar;
    } else if (actionId === 'toggle_cast_bar') {
      this.showCastBar = !this.showCastBar;
    } else if (actionId === 'toggle_night_bar') {
      this.showNightBar = !this.showNightBar;
    } else if (actionId === 'back') {
      this.section = 'main';
      this.selectedIndex = 0;
    }
    return actionId;
  }

  handleKeyPress(key) {
    if (!this.isOpen) return null;
    if (key === 'arrowup' || key === 'w') {
      this.navigate(-1);
      return null;
    }
    if (key === 'arrowdown' || key === 's') {
      this.navigate(1);
      return null;
    }
    if (key === 'enter' || key === ' ') {
      const option = this.getOptions()[this.selectedIndex];
      return option ? this.activate(option.id) : null;
    }
    return null;
  }

  handleClick(x, y) {
    if (!this.isOpen) return null;
    for (let index = 0; index < this.buttonRects.length; index++) {
      const rect = this.buttonRects[index];
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        this.selectedIndex = index;
        return this.activate(rect.id);
      }
    }
    return null;
  }

  draw(ctx, canvas) {
    if (!this.isOpen) return;

    const options = this.getOptions();
    const panelW = 360;
    const panelH = this.section === 'dev' ? 560 : this.section === 'game_mode' ? 310 : 292;
    const panelX = Math.floor((canvas.width - panelW) / 2);
    const panelY = Math.floor((canvas.height - panelH) / 2);

    this.buttonRects = [];

    ctx.save();
    ctx.fillStyle = 'rgba(4, 8, 16, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(8, 14, 24, 0.96)';
    ctx.strokeStyle = 'rgba(110, 170, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = '#DCEAFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSA', panelX + panelW / 2, panelY + 36);

    ctx.fillStyle = '#8EA6C8';
    ctx.font = '12px Arial';
    ctx.fillText(
      this.section === 'dev'
        ? 'Opciones internas para depuracion visual'
        : this.section === 'game_mode'
          ? 'Cambia las reglas activas de esta partida'
        : 'ESC cierra, ENTER confirma, flechas navegan',
      panelX + panelW / 2,
      panelY + 58
    );

    const buttonW = panelW - 56;
    const buttonH = 42;
    const startY = panelY + 92;
    for (let index = 0; index < options.length; index++) {
      const option = options[index];
      const x = panelX + 28;
      const y = startY + index * 56;
      const selected = index === this.selectedIndex;
      this.buttonRects.push({ x, y, w: buttonW, h: buttonH, id: option.id });

      ctx.fillStyle = selected ? 'rgba(90, 150, 255, 0.26)' : 'rgba(18, 28, 44, 0.9)';
      ctx.strokeStyle = selected ? '#7EB6FF' : '#32445E';
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.fillRect(x, y, buttonW, buttonH);
      ctx.strokeRect(x, y, buttonW, buttonH);

      ctx.fillStyle = selected ? '#F2F7FF' : '#C3D4EB';
      ctx.font = selected ? 'bold 16px Arial' : '15px Arial';
      ctx.fillText(option.label, x + buttonW / 2, y + 26);
    }

    if (this.section === 'dev') {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8EA6C8';
      ctx.font = '12px Arial';
      ctx.fillText('Toggles visuales de HUD y hitboxes para depuracion.', panelX + 28, panelY + panelH - 30);
      } else if (this.section === 'game_mode') {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8EA6C8';
        ctx.font = '12px Arial';
        ctx.fillText('Peaceful: sin hostiles. Survival: normal. Creative: sin coste ni cooldown.', panelX + 28, panelY + panelH - 30);
    }

    ctx.restore();
  }
}

export default PauseMenu;