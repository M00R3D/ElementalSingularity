export function drawGraphicLayers(ctx, layers = [], x, y, size = 24, options = {}) {
  if (!ctx || !Array.isArray(layers) || layers.length === 0) return;

  const rotation = options.rotation || 0;
  const alpha = options.alpha === undefined ? 1 : options.alpha;

  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.globalAlpha *= alpha;

  for (const layer of layers) {
    if (!layer || !layer.type) continue;
    const color = layer.color || '#FFFFFF';
    const stroke = layer.stroke || null;
    const lineWidth = (layer.lineWidth || 0.06) * size;
    ctx.fillStyle = color;
    ctx.strokeStyle = stroke || color;
    ctx.lineWidth = lineWidth;

    if (layer.type === 'rect') {
      const w = (layer.w || 0.2) * size;
      const h = (layer.h || 0.2) * size;
      const px = (layer.x || 0) * size - w / 2;
      const py = (layer.y || 0) * size - h / 2;
      ctx.save();
      if (layer.rotation) ctx.rotate(layer.rotation);
      if (layer.radius) {
        const radius = Math.max(0, Math.min(w, h) * layer.radius);
        ctx.beginPath();
        ctx.roundRect(px, py, w, h, radius);
        ctx.fill();
        if (stroke) ctx.stroke();
      } else {
        ctx.fillRect(px, py, w, h);
        if (stroke) ctx.strokeRect(px, py, w, h);
      }
      ctx.restore();
    } else if (layer.type === 'circle') {
      const radius = (layer.r || 0.15) * size;
      ctx.beginPath();
      ctx.arc((layer.x || 0) * size, (layer.y || 0) * size, radius, 0, Math.PI * 2);
      ctx.fill();
      if (stroke) ctx.stroke();
    } else if (layer.type === 'ellipse') {
      const rx = (layer.rx || 0.2) * size;
      const ry = (layer.ry || 0.14) * size;
      ctx.beginPath();
      ctx.ellipse((layer.x || 0) * size, (layer.y || 0) * size, rx, ry, layer.rotation || 0, 0, Math.PI * 2);
      ctx.fill();
      if (stroke) ctx.stroke();
    } else if (layer.type === 'line') {
      ctx.beginPath();
      ctx.moveTo((layer.x1 || 0) * size, (layer.y1 || 0) * size);
      ctx.lineTo((layer.x2 || 0) * size, (layer.y2 || 0) * size);
      ctx.stroke();
    } else if (layer.type === 'poly') {
      const points = layer.points || [];
      if (points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(points[0][0] * size, points[0][1] * size);
      for (let index = 1; index < points.length; index++) {
        ctx.lineTo(points[index][0] * size, points[index][1] * size);
      }
      ctx.closePath();
      ctx.fill();
      if (stroke) ctx.stroke();
    }
  }

  ctx.restore();
}

export function getItemDefinition(gameData, itemId) {
  return (gameData.items || []).find((item) => item.id === itemId) || null;
}

export function getItemGraphic(gameData, itemId) {
  return getItemDefinition(gameData, itemId)?.graphic || [];
}