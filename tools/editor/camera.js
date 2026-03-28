// ========================================
// Hair Shape Editor – Camera / Viewport
// Zoom & pan without affecting shape coords
// ========================================

export class EditorCamera {
  constructor() {
    this.x = 0;           // world-space center X
    this.y = 0;           // world-space center Y
    this.defaultZoom = 8;
    this.zoom = this.defaultZoom;        // visual zoom
    this._minZoom = 0.15;
    this._maxZoom = 12;
  }

  /** Apply camera transform to canvas context.
   *  After this, draw everything in world coordinates.
   *  characterRadius is the base radius in world units (from character size).
   */
  applyTransform(ctx, canvasW, canvasH) {
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  /** Convert screen pixel → world coordinate */
  screenToWorld(sx, sy, canvasW, canvasH) {
    return {
      x: (sx - canvasW / 2) / this.zoom + this.x,
      y: (sy - canvasH / 2) / this.zoom + this.y
    };
  }

  /** Convert world coordinate → screen pixel */
  worldToScreen(wx, wy, canvasW, canvasH) {
    return {
      x: (wx - this.x) * this.zoom + canvasW / 2,
      y: (wy - this.y) * this.zoom + canvasH / 2
    };
  }

  /** Zoom centered on a screen-space point */
  zoomAt(screenX, screenY, factor, canvasW, canvasH) {
    const before = this.screenToWorld(screenX, screenY, canvasW, canvasH);
    this.zoom *= factor;
    this.zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this.zoom));
    const after = this.screenToWorld(screenX, screenY, canvasW, canvasH);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }

  /** Pan by delta in screen pixels */
  pan(dsx, dsy) {
    this.x -= dsx / this.zoom;
    this.y -= dsy / this.zoom;
  }

  /** Reset to default view */
  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = this.defaultZoom;
  }
}
