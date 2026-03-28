// ========================================
// Hair Shape Editor – Shape Renderer
// Editable shape drawing with all primitives
// ========================================

import { shadeColor } from './characterRenderer.js';

/**
 * Draw a single editable shape in world space.
 * The shape's (x, y) are in normalized coordinates (units of characterRadius).
 * characterRadius = the in-game character radius in world units.
 * cx, cy = character center in world coordinates.
 */
export function drawShape(ctx, shape, characterRadius, cx, cy, selected, options = null) {
  if (!shape) return;
  const opts = options || {};
  const scale = Number(opts.scale) || 1;
  const offsetX = Number(opts.offsetX) || 0;
  const offsetY = Number(opts.offsetY) || 0;
  const colorOverride = opts.colorOverride || null;
  const R = characterRadius; // shorthand
  const RS = R * scale;
  const px = cx + offsetX + shape.x * RS;
  const py = cy + offsetY + shape.y * RS;
  const rot = (shape.rot || 0) * Math.PI / 180;
  const baseColor = colorOverride || shape.color || "#4b2e20";

  ctx.save();
  ctx.translate(px, py);
  if (rot) ctx.rotate(rot);
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = selected ? "#ffe29a" : "rgba(10,16,26,0.9)";
  ctx.lineWidth = selected ? 2.4 / 1 : 1.2 / 1; // will be scaled by camera

  if (shape.type === "circle") {
    const r = Math.max(1, shape.r * RS);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shape.type === "rect") {
    const w = Math.max(2, shape.w * RS);
    const h = Math.max(2, shape.h * RS);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  } else if (shape.type === "triangle") {
    const w = Math.max(2, shape.w * RS);
    const h = Math.max(2, shape.h * RS);
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (shape.type === "spiral") {
    const maxRadius = Math.max(3, shape.w * RS);
    const stretch = Math.max(0.35, shape.h / Math.max(0.01, shape.w));
    const turns = Math.max(1.1, (shape.r || 0.2) * 12);
    const end = Math.PI * 2 * turns;
    const steps = Math.max(44, Math.floor(turns * 36));
    const strandWidth = Math.max(1.2, RS * (0.008 + (shape.r || 0.2) * 0.045));

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = strandWidth;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * end;
      const progress = i / steps;
      const rad = progress * maxRadius;
      const spx = Math.cos(t) * rad;
      const spy = Math.sin(t) * rad * stretch;
      if (i === 0) ctx.moveTo(spx, spy);
      else ctx.lineTo(spx, spy);
    }
    ctx.stroke();
    if (selected) {
      ctx.strokeStyle = "#ffe29a";
      ctx.lineWidth = strandWidth + 1.4;
      ctx.stroke();
    }
  } else if (shape.type === "spike") {
    const w = Math.max(2, shape.w * RS);
    const h = Math.max(2, shape.h * RS);
    const sharpness = Math.max(0.05, Math.min(1, Number(shape.r) || 0.9));
    const tipHalf = Math.max(1.5, w * (0.03 + (1 - sharpness) * 0.2));
    const neckHalf = Math.max(tipHalf + 1, w * 0.14);
    const baseY = h * 0.5;

    ctx.beginPath();
    ctx.moveTo(-tipHalf, -h / 2);
    ctx.lineTo(tipHalf, -h / 2);
    ctx.lineTo(neckHalf, -h * 0.18);
    ctx.lineTo(w * 0.5, baseY);
    ctx.lineTo(0, h * 0.32);
    ctx.lineTo(-w * 0.5, baseY);
    ctx.lineTo(-neckHalf, -h * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (shape.type === "crescent") {
    const outerR = Math.max(3, shape.w * RS);
    const innerR = Math.max(1, outerR * Math.max(0.18, 1 - (shape.r || 0.3)));
    const offset = (shape.r || 0.28) * outerR * 0.6;

    ctx.beginPath();
    ctx.arc(-outerR * 0.12, 0, outerR, 0, Math.PI * 2);
    ctx.arc(-outerR * 0.12 + offset, 0, innerR, 0, Math.PI * 2, true);
    try { ctx.fill('evenodd'); } catch (e) { ctx.fill(); }
    ctx.stroke();
  } else if (shape.type === "leaf") {
    const w = Math.max(2, shape.w * RS);
    const h = Math.max(2, shape.h * RS);

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.quadraticCurveTo(w * 0.6, -h * 0.08, 0, h / 2);
    ctx.quadraticCurveTo(-w * 0.6, -h * 0.08, 0, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = Math.max(1, RS * 0.006 * (shape.r || 0.2));
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 2);
    ctx.lineTo(0, h / 2 - 2);
    ctx.stroke();
    ctx.strokeStyle = selected ? "#ffe29a" : "rgba(10,16,26,0.9)";
    ctx.lineWidth = selected ? 2.4 : 1.2;
  } else if (shape.type === "curly") {
    const maxAmp = Math.max(2, shape.w * RS * 0.45);
    const length = Math.max(6, shape.h * RS);
    const turns = Math.max(2, Math.floor((shape.r || 0.36) * 8));
    const steps = Math.max(28, turns * 18);
    const strandWidth = Math.max(1, RS * 0.012 + (shape.r || 0.36) * 0.8);

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = strandWidth;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const spx = Math.sin(t * Math.PI * 2 * turns) * (maxAmp * (0.5 + 0.5 * (1 - t)));
      const spy = -length / 2 + t * length;
      if (i === 0) ctx.moveTo(spx, spy);
      else ctx.lineTo(spx, spy);
    }
    ctx.stroke();

    const tipX = Math.sin(1 * Math.PI * 2 * turns) * (maxAmp * 0.3);
    const tipY = -length / 2 + length;
    const curlR = Math.max(3, RS * 0.03 + (shape.r || 0.36) * 6);
    ctx.beginPath();
    ctx.arc(tipX, tipY, curlR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shape.type === "anime1") {
    const w = Math.max(6, shape.w * RS);
    const h = Math.max(12, shape.h * RS);
    const taper = Math.max(0.08, 1 - (shape.r || 0.28) * 0.6);

    ctx.beginPath();
    ctx.moveTo(-w * 0.45, h * 0.5);
    ctx.bezierCurveTo(-w * 0.6, h * 0.15, -w * 0.1, -h * 0.05, w * 0.05, -h * 0.45);
    ctx.bezierCurveTo(w * 0.2, -h * 0.6, w * 0.45, -h * 0.7, w * 0.7 * taper, -h * 0.85);
    ctx.lineTo(w * 0.58 * taper, -h * 0.85 + 4);
    ctx.bezierCurveTo(w * 0.35 * taper, -h * 0.6, w * 0.05 * taper, -h * 0.4, -w * 0.25 * taper, h * 0.25);
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.strokeStyle = selected ? '#fff0b8' : 'rgba(6,8,12,0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = shadeColor(baseColor, -0.18);
    ctx.beginPath();
    ctx.moveTo(w * 0.05, -h * 0.45);
    ctx.quadraticCurveTo(w * 0.22, -h * 0.25, w * 0.12, -h * 0.05);
    ctx.lineTo(w * 0.02, h * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-w * 0.2, h * 0.2); ctx.quadraticCurveTo(0, h * 0.05, w * 0.08, -h * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w * 0.05, h * 0.05); ctx.quadraticCurveTo(w * 0.08, -h * 0.05, w * 0.18, -h * 0.45); ctx.stroke();
  } else if (shape.type === "anime2") {
    const baseW = Math.max(6, shape.w * RS);
    const h = Math.max(12, shape.h * RS);
    const spikes = 3;
    const pts = [];
    pts.push({ x: -baseW * 0.5, y: h * 0.5 });
    for (let i = 0; i <= spikes; i++) {
      const t = i / spikes;
      const xp = -baseW * 0.5 + t * baseW;
      const yp = h * 0.5 - Math.pow(t, 1.2) * h * 1.05;
      pts.push({ x: xp, y: yp });
    }
    pts.push({ x: baseW * 0.5, y: h * 0.5 });

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.strokeStyle = selected ? '#fff4b0' : '#111316';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.strokeStyle = shadeColor(baseColor, -0.32);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(-baseW * 0.12, h * 0.1);
    ctx.lineTo(baseW * 0.08, -h * 0.05);
    ctx.moveTo(-baseW * 0.02, h * 0.25);
    ctx.lineTo(baseW * 0.18, -h * 0.2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[1].x, pts[1].y);
    for (let i = 2; i < pts.length - 1; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  } else if (shape.type === "anime3") {
    const w = Math.max(6, shape.w * RS);
    const h = Math.max(20, shape.h * RS);
    const base = baseColor;
    const grad = ctx.createLinearGradient(-w * 0.2, -h / 2, w * 0.2, h / 2);
    grad.addColorStop(0, shadeColor(base, 0.14));
    grad.addColorStop(0.6, base);
    grad.addColorStop(1, shadeColor(base, -0.08));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, h * 0.5);
    ctx.quadraticCurveTo(-w * 0.2, h * 0.1, 0, -h * 0.4);
    ctx.quadraticCurveTo(w * 0.12, -h * 0.6, w * 0.28, -h * 0.7);
    ctx.quadraticCurveTo(w * 0.02, -h * 0.5, -w * 0.18, -h * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.0; ctx.stroke();
  } else if (shape.type === "anime4") {
    const w = Math.max(8, shape.w * RS);
    const h = Math.max(24, shape.h * RS);
    const base = baseColor;

    ctx.beginPath();
    ctx.moveTo(-w * 0.45, h * 0.45);
    ctx.bezierCurveTo(-w * 0.35, h * 0.1, -w * 0.05, -h * 0.05, w * 0.08, -h * 0.5);
    ctx.bezierCurveTo(w * 0.18, -h * 0.65, w * 0.42, -h * 0.78, w * 0.6, -h * 0.9);
    ctx.lineTo(w * 0.48, -h * 0.9 + 6);
    ctx.bezierCurveTo(w * 0.28, -h * 0.6, w * 0.06, -h * 0.3, -w * 0.2, h * 0.25);
    ctx.closePath();
    ctx.fillStyle = base; ctx.fill();

    ctx.fillStyle = shadeColor(base, -0.16);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.2);
    ctx.quadraticCurveTo(w * 0.22, -h * 0.18, w * 0.26, -h * 0.42);
    ctx.lineTo(w * 0.18, -h * 0.42);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = shadeColor(base, 0.36);
    ctx.lineWidth = Math.max(1, RS * 0.008);
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, h * 0.06);
    ctx.quadraticCurveTo(0, -h * 0.02, w * 0.12, -h * 0.24);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      ctx.beginPath();
      ctx.moveTo(-w * 0.35 * (1 - t), h * 0.35 * (1 - t));
      ctx.quadraticCurveTo(-w * 0.05 * (1 - t), -h * 0.03, w * 0.08 * t, -h * (0.25 + 0.18 * t));
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Hit-test a point against a shape.
 * wx, wy = point in normalized coords (relative to character center, in units of characterRadius)
 */
export function hitTestShape(shape, wx, wy) {
  if (!shape) return false;
  const dx = wx - shape.x;
  const dy = wy - shape.y;
  if (shape.type === "circle") {
    const r = shape.r || 0.2;
    return dx * dx + dy * dy <= r * r;
  } else if (shape.type === "spiral") {
    const rw = shape.w || 0.26;
    const rh = Math.max(0.12, (shape.h || 0.42) * 0.75);
    return (dx * dx) / (rw * rw) + (dy * dy) / (rh * rh) <= 1;
  } else {
    const w = (shape.w || 0.2) * 0.5;
    const h = (shape.h || 0.2) * 0.5;
    return Math.abs(dx) <= w && Math.abs(dy) <= h;
  }
}

/**
 * Hit-test all layers and return { layer, index } or null.
 * wx, wy in normalized (characterRadius-unit) coordinates.
 */
export function hitTestLayers(state, wx, wy) {
  const layers = ["hair2", "hair1", "hairBehindFace"];
  for (const layer of layers) {
    const list = state[layer];
    for (let i = list.length - 1; i >= 0; i--) {
      if (hitTestShape(list[i], wx, wy)) {
        return { layer, index: i };
      }
    }
  }
  return null;
}
