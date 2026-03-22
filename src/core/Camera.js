// ========================================
// Camera - Viewport System
// Follows a target within world bounds
// ========================================

export class Camera {
  constructor(worldWidth, worldHeight, viewWidth = 800, viewHeight = 600) {
    this.worldWidth  = worldWidth;
    this.worldHeight = worldHeight;
    this.viewWidth   = viewWidth;
    this.viewHeight  = viewHeight;
    this.x = 0;
    this.y = 0;
  }

  /** Center the camera on a world-space target. */
  follow(target) {
    this.x = target.x - this.viewWidth  / 2;
    this.y = target.y - this.viewHeight / 2;
    this.x = Math.max(0, Math.min(this.worldWidth  - this.viewWidth,  this.x));
    this.y = Math.max(0, Math.min(this.worldHeight - this.viewHeight, this.y));
  }

  /** Screen → World coordinate. */
  toWorld(screenX, screenY) {
    return { x: screenX + this.x, y: screenY + this.y };
  }

  /** World → Screen coordinate. */
  toScreen(worldX, worldY) {
    return { x: worldX - this.x, y: worldY - this.y };
  }

  /** True if a world-space circle is (even partially) inside the viewport. */
  isVisible(worldX, worldY, radius = 0) {
    return (
      worldX + radius > this.x &&
      worldX - radius < this.x + this.viewWidth &&
      worldY + radius > this.y &&
      worldY - radius < this.y + this.viewHeight
    );
  }
}

export default Camera;
