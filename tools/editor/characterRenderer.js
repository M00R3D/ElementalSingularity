// ========================================
// Hair Shape Editor – Character Renderer
// Exact port of in-game rendering from
// CharacterSelectMenu (static preview)
// ========================================

// ---------- helpers ----------

function darkenColor(hex, amount) {
  const num = parseInt(String(hex || '#4b2e20').replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, Math.floor((num >> 16 & 255) * (1 - amount))));
  const g = Math.max(0, Math.min(255, Math.floor((num >> 8 & 255) * (1 - amount))));
  const b = Math.max(0, Math.min(255, Math.floor((num & 255) * (1 - amount))));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function shadeColor(hex, percent) {
  try {
    const c = hex.replace('#', '');
    const full = c.length === 3 ? c.split('').map(ch => ch + ch).join('') : c;
    const num = parseInt(full, 16);
    let r = (num >> 16) + Math.round(255 * percent);
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
    let b = (num & 0x0000FF) + Math.round(255 * percent);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  } catch (e) { return hex; }
}

// ---------- back shell ----------

function drawBackShell(ctx, x, y, radius) {
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

// ---------- front fringe ----------

function drawFrontFringe(ctx, x, y, radius, hairStyle) {
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
    ahoge:    { count: 2, width: 0.16, depth: 0.44, offset: 0.18 },
    twintails:{ count: 3, width: 0.15, depth: 0.48, offset: 0.2 },
    bangs:    { count: 4, width: 0.17, depth: 0.54, offset: 0.21 },
    straight: { count: 3, width: 0.16, depth: 0.52, offset: 0.2 },
    spiky:    { count: 5, width: 0.13, depth: 0.56, offset: 0.2 },
    wavy:     { count: 3, width: 0.2,  depth: 0.55, offset: 0.23 },
    curly:    { count: 4, width: 0.18, depth: 0.5,  offset: 0.2 },
    braid:    { count: 2, width: 0.17, depth: 0.52, offset: 0.25 },
    bob:      { count: 3, width: 0.22, depth: 0.47, offset: 0.22 },
    half_up:  { count: 2, width: 0.18, depth: 0.5,  offset: 0.2 },
    knight:   { count: 2, width: 0.2,  depth: 0.44, offset: 0.2 },
    maiden:   { count: 3, width: 0.18, depth: 0.52, offset: 0.22 },
    noble:    { count: 3, width: 0.2,  depth: 0.56, offset: 0.22 },
    warrior:  { count: 3, width: 0.16, depth: 0.53, offset: 0.2 },
    peasant:  { count: 3, width: 0.19, depth: 0.55, offset: 0.22 },
    poodle:   { count: 2, width: 0.22, depth: 0.42, offset: 0.2 },
    neon:     { count: 5, width: 0.12, depth: 0.5,  offset: 0.2 },
    worm:     { count: 4, width: 0.1,  depth: 0.56, offset: 0.18 },
    bubble:   { count: 3, width: 0.2,  depth: 0.45, offset: 0.22 },
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

// ---------- hair styles (back layer) ----------

function drawHairStyle(ctx, x, y, radius, hairStyle) {
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
    _drawFancyAnimeHair(ctx, x, y, radius);
  } else if (hairStyle === 'special_spiky') {
    _drawSpecialSpikyHair(ctx, x, y, radius);
  } else {
    // fallback
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.8, radius * 0.55, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- fancy_anime (complex shapes) ----------

function _drawFancyAnimeHair(ctx, x, y, radius) {
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
  for (const s of shapes) {
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
      ctx.fillStyle = baseColor; ctx.fill();
      ctx.strokeStyle = darkenColor(baseColor, -0.18);
      ctx.lineWidth = Math.max(1, radius * 0.02);
      ctx.stroke();
    } else if (s.t === 'r') {
      const w = s.w * radius, h = s.h * radius;
      const grad = ctx.createLinearGradient(-w*0.2, -h/2, w*0.2, h/2);
      grad.addColorStop(0, darkenColor(baseColor, 0.14));
      grad.addColorStop(0.6, baseColor);
      grad.addColorStop(1, darkenColor(baseColor, -0.08));
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
      ctx.fillStyle = darkenColor(baseColor, -0.16);
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.2);
      ctx.quadraticCurveTo(w * 0.22, -h * 0.18, w * 0.26, -h * 0.42);
      ctx.lineTo(w * 0.18, -h * 0.42);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = darkenColor(baseColor, 0.36);
      ctx.lineWidth = Math.max(1, radius * 0.008);
      ctx.beginPath();
      ctx.moveTo(-w * 0.18, h * 0.06);
      ctx.quadraticCurveTo(0, -h * 0.02, w * 0.12, -h * 0.24);
      ctx.stroke();
    } else if (s.t === 'l') {
      const w = s.w * radius, h = s.h * radius;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.quadraticCurveTo(w * 0.6, -h * 0.08, 0, h / 2);
      ctx.quadraticCurveTo(-w * 0.6, -h * 0.08, 0, -h / 2);
      ctx.closePath();
      ctx.fillStyle = baseColor; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = Math.max(1, radius * 0.006 * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 + 2);
      ctx.lineTo(0, h / 2 - 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- special_spiky (complex shapes) ----------

function _drawSpecialSpikyHair(ctx, x, y, radius) {
  const baseColor = ctx.fillStyle || '#4b2e20';
  const R = radius * 1.32;
  const baseY = y - radius * 0.18;

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
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2.8, b.r * R), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const spikes = [
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
  for (const s of spikes) {
    const px = x + s.x * R;
    const py = baseY + s.y * R;
    const rot = (s.rot || 0) * Math.PI / 180;
    const w = Math.max(2.5, s.w * R);
    const h = Math.max(2.5, s.h * R);
    ctx.save();
    ctx.translate(px, py);
    if (rot) ctx.rotate(rot);
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ---------- accessories ----------

function drawAccessory(ctx, x, y, radius, accessory) {
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
}

// ---------- face (eyes + mouth) ----------

function drawFace(ctx, x, y, radius, meta) {
  ctx.fillStyle = '#111111';
  const eyeOffset = Math.max(5, radius * 0.4);
  const eyeType = meta.eyeType || 'round';

  if (eyeType === 'sharp') {
    ctx.beginPath(); ctx.ellipse(x - eyeOffset, y - 4, 3.8, 1.7, -0.28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + eyeOffset, y - 4, 3.8, 1.7, 0.28, 0, Math.PI * 2); ctx.fill();
  } else if (eyeType === 'sleepy') {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - eyeOffset - 2, y - 4); ctx.lineTo(x - eyeOffset + 2, y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + eyeOffset - 2, y - 4); ctx.lineTo(x + eyeOffset + 2, y - 4); ctx.stroke();
  } else if (eyeType === 'big') {
    ctx.beginPath(); ctx.arc(x - eyeOffset, y - 4, 3.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOffset, y - 4, 3.3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(x - eyeOffset, y - 4, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOffset, y - 4, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const faceType = meta.faceType || 'friendly';
  if (faceType === 'serious') {
    ctx.moveTo(x - 6, y + 5);
    ctx.lineTo(x + 6, y + 5);
  } else if (faceType === 'grin') {
    ctx.arc(x, y + 3, 7, Math.PI * 0.12, Math.PI * 0.88);
  } else {
    ctx.arc(x, y + 3, 6, Math.PI * 0.1, Math.PI * 0.9);
  }
  ctx.stroke();
}

// ---------- ground shadow ----------

function drawShadow(ctx, x, y, radius) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 1.05, radius * 0.7, radius * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- limbs (hands and feet) ----------

function drawLimbs(ctx, x, y, radius, meta) {
  const bodyColor = meta.color || '#ff7a59';

  // feet (slightly darker)
  ctx.save();
  ctx.fillStyle = darkenColor(bodyColor, 0.12);
  const footY = y + radius * 0.85;
  ctx.beginPath();
  ctx.arc(x - radius * 0.28, footY, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + radius * 0.28, footY, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // hands
  ctx.save();
  ctx.fillStyle = bodyColor;
  const handY = y + radius * 0.2;
  ctx.beginPath();
  ctx.arc(x - radius * 0.72, handY, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + radius * 0.72, handY, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ========== MAIN EXPORT ==========

/**
 * Draw a complete character exactly like in-game.
 * x, y = character center in current canvas coordinate space
 * radius = character body radius (from meta.size clamped 10-24)
 * meta = { faceType, eyeType, size, color, hairStyle, hairStyle2, hairColor, accessory }
 */
export function drawCharacter(ctx, x, y, meta) {
  const radius = Math.max(10, Math.min(24, Number(meta.size) || 15));
  const hairStyle1 = meta.hairStyle || 'none';
  const hairStyle2 = meta.hairStyle2 || 'none';
  const hairColor = meta.hairColor || '#4b2e20';

  // 1. Shadow
  drawShadow(ctx, x, y, radius);

  // 2. Hair back layer
  if (hairStyle1 !== 'none') {
    ctx.save();
    ctx.fillStyle = hairColor;
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = Math.max(1.1, radius * 0.12);
    drawBackShell(ctx, x, y, radius);
    drawHairStyle(ctx, x, y, radius * 1.04, hairStyle1);
    ctx.restore();
  }

  // 3. Body
  ctx.fillStyle = meta.color || '#ff7a59';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 4. Limbs
  drawLimbs(ctx, x, y, radius, meta);

  // 5. Hair front fringe
  if (hairStyle2 !== 'none') {
    ctx.save();
    ctx.fillStyle = hairColor;
    ctx.strokeStyle = darkenColor(hairColor, 0.18);
    ctx.lineWidth = Math.max(1, radius * 0.06);
    drawFrontFringe(ctx, x, y, radius, hairStyle2);
    ctx.restore();
  }

  // 6. Accessories
  drawAccessory(ctx, x, y, radius, meta.accessory || 'none');

  // 7. Face
  drawFace(ctx, x, y, radius, meta);
}

/** Draw only the back shell (for optional overlay in editor) */
export { drawBackShell, drawFace, drawLimbs, drawShadow, drawAccessory, drawHairStyle, drawFrontFringe, shadeColor, darkenColor };
