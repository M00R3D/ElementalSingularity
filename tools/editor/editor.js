// ========================================
// Hair Shape Editor – Main Editor Logic
// ========================================

import { HAIR_STYLES, STYLE_PRESETS, PRESET_FANCY_ANIME, PRESET_SPECIAL_SPIKY } from './presets.js';
import { EditorState } from './state.js';
import { EditorCamera } from './camera.js';
import { drawAccessory, drawBackShell, drawFace, drawFrontFringe, drawHairStyle, drawShadow } from './characterRenderer.js';
import { drawShape, hitTestLayers } from './shapeRenderer.js';

export class HairShapeEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = new EditorState();
    this.camera = new EditorCamera();
    this.DPR = window.devicePixelRatio || 1;

    // Keep the same size units as in-game. Visual magnification is camera zoom only.
    this._baseWorldScale = 1;

    this.el = {};  // UI element references, set by wireUI()
    this._isPanning = false;
    this._panStart = null;
  }

  /** World-space character radius (same scale as in-game) */
  get characterRadius() {
    return Math.max(10, Math.min(24, Number(this.state.previewSize) || 15)) * this._baseWorldScale;
  }

  _styleTransform(style, layer) {
    if (style === 'special_spiky') {
      if (layer === 'hair2') {
        return { scale: 1.45, offsetX: 0, offsetY: -this.characterRadius * 0.12 };
      }
      return { scale: 1.32, offsetX: 0, offsetY: -this.characterRadius * 0.18 };
    }

    // In-game draws back hair style with radius * 1.04.
    if (style === 'fancy_anime' && layer !== 'hair2') {
      return { scale: 1.04, offsetX: 0, offsetY: 0 };
    }

    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  _hasCustomShapes() {
    return this.state.hairBehindFace.length > 0 || this.state.hair1.length > 0 || this.state.hair2.length > 0;
  }

  // ===== viewport =====

  updateViewport() {
    this.DPR = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(100, Math.round(rect.width * this.DPR));
    this.canvas.height = Math.max(100, Math.round(rect.height * this.DPR));
    this._cssW = rect.width;
    this._cssH = rect.height;
  }

  // ===== coordinate helpers =====

  /** Screen CSS pixel → world coordinate */
  screenToWorld(sx, sy) {
    return this.camera.screenToWorld(sx, sy, this._cssW, this._cssH);
  }

  /** World coordinate → normalized (character-radius units) */
  worldToNormalized(wx, wy) {
    const R = this.characterRadius;
    return { x: wx / R, y: wy / R };
  }

  /** Screen CSS pixel → normalized character coords */
  screenToNormalized(sx, sy) {
    const w = this.screenToWorld(sx, sy);
    return this.worldToNormalized(w.x, w.y);
  }

  // ===== draw =====

  draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const cssW = this._cssW;
    const cssH = this._cssH;
    const R = this.characterRadius;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Apply DPR scaling
    ctx.scale(this.DPR, this.DPR);

    // Draw background
    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, cssW, cssH);

    // Draw grid in screen space (before camera transform)
    this._drawGrid(ctx, cssW, cssH);

    // Apply camera transform (everything after this is in world space)
    ctx.save();
    this.camera.applyTransform(ctx, cssW, cssH);

    // Character center is at world origin (0, 0)
    const cx = 0, cy = 0;
    const meta = this.state.getCharacterMeta();

    // -- Guide circles (world space) --
    this._drawGuides(ctx, cx, cy, R);

    const hairColor = this.state.previewHairColor || '#4b2e20';
    const hasCustomShapes = this._hasCustomShapes();

    // 1. Ground shadow
    drawShadow(ctx, cx, cy, R);

    // 2. Hair back layers
    const drawBackShellNow = hasCustomShapes ? this.state.previewBackShell : (meta.hairStyle && meta.hairStyle !== 'none');
    if (drawBackShellNow) {
      ctx.save();
      ctx.fillStyle = hairColor;
      ctx.strokeStyle = hairColor;
      ctx.lineWidth = Math.max(1.1, R * 0.12);
      drawBackShell(ctx, cx, cy, R);
      ctx.restore();
    }

    if (hasCustomShapes) {
      const tBehind = this._styleTransform(this.state.hair1Style, 'hairBehindFace');
      const tHair1 = this._styleTransform(this.state.hair1Style, 'hair1');
      const tHair2 = this._styleTransform(this.state.hair2Style, 'hair2');

      // 3. Hair behind face (editable shapes)
      ctx.save();
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < this.state.hairBehindFace.length; i++) {
        const sel = this.state.selectedLayer === "hairBehindFace" && this.state.selectedIndex === i;
        drawShape(ctx, this.state.hairBehindFace[i], R, cx, cy, sel, { ...tBehind, colorOverride: hairColor });
      }
      ctx.restore();

      // 4. Hair layer 1 (editable shapes)
      ctx.save();
      ctx.globalAlpha = 0.93;
      for (let i = 0; i < this.state.hair1.length; i++) {
        const sel = this.state.selectedLayer === "hair1" && this.state.selectedIndex === i;
        drawShape(ctx, this.state.hair1[i], R, cx, cy, sel, { ...tHair1, colorOverride: hairColor });
      }
      ctx.restore();
    } else if (meta.hairStyle && meta.hairStyle !== 'none') {
      ctx.save();
      ctx.fillStyle = hairColor;
      ctx.strokeStyle = hairColor;
      ctx.lineWidth = Math.max(1.1, R * 0.12);
      drawHairStyle(ctx, cx, cy, R * 1.04, meta.hairStyle);
      ctx.restore();
    }

    // 5. Body circle
    ctx.fillStyle = meta.color || '#ff7a59';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // 6. Face and accessory
    drawFace(ctx, cx, cy, R, meta);
    drawAccessory(ctx, cx, cy, R, meta.accessory);

    // 7. Hair layer 2 / front fringe
    if (hasCustomShapes) {
      const tHair2 = this._styleTransform(this.state.hair2Style, 'hair2');
      ctx.save();
      ctx.globalAlpha = 0.88;
      for (let i = 0; i < this.state.hair2.length; i++) {
        const sel = this.state.selectedLayer === "hair2" && this.state.selectedIndex === i;
        drawShape(ctx, this.state.hair2[i], R, cx, cy, sel, { ...tHair2, colorOverride: hairColor });
      }
      ctx.restore();
    } else if (meta.hairStyle2 && meta.hairStyle2 !== 'none') {
      ctx.save();
      ctx.fillStyle = hairColor;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = Math.max(1, R * 0.06);
      drawFrontFringe(ctx, cx, cy, R, meta.hairStyle2);
      ctx.restore();
    }

    ctx.restore(); // end camera transform

    // -- HUD overlay (screen space) --
    ctx.fillStyle = "#9ec7ff";
    ctx.font = "12px Segoe UI";
    ctx.fillText(`Hair1: ${this.state.hair1Style}  |  Hair2: ${this.state.hair2Style}  |  Zoom: ${this.camera.zoom.toFixed(2)}x`, 12, cssH - 12);
  }

  _drawGrid(ctx, cssW, cssH) {
    // subtle grid
    const gridSpacing = 40 * this.camera.zoom;
    if (gridSpacing < 8) return; // too zoomed out

    const offsetX = (cssW / 2 - this.camera.x * this.camera.zoom) % gridSpacing;
    const offsetY = (cssH / 2 - this.camera.y * this.camera.zoom) % gridSpacing;

    ctx.strokeStyle = 'rgba(60, 80, 110, 0.15)';
    ctx.lineWidth = 0.5;

    for (let x = offsetX; x < cssW; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
      ctx.stroke();
    }
    for (let y = offsetY; y < cssH; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
    }

    // crosshair at origin
    const origin = this.camera.worldToScreen(0, 0, cssW, cssH);
    ctx.strokeStyle = 'rgba(100, 140, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, cssH);
    ctx.moveTo(0, origin.y); ctx.lineTo(cssW, origin.y);
    ctx.stroke();
  }

  _drawGuides(ctx, cx, cy, R) {
    // face radius guide (86% of body as in-game)
    const bodyR = R;
    const faceR = bodyR * 0.86;

    ctx.strokeStyle = 'rgba(100, 180, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // body circle
    ctx.beginPath();
    ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    ctx.stroke();

    // face circle
    ctx.beginPath();
    ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  // ===== shape operations =====

  addShape() {
    const type = this.el.shapeType.value;
    const color = this.el.shapeColor.value;
    const base = { type, x: 0, y: -0.65, w: 0.35, h: 0.35, r: 0.2, rot: 0, color };

    if (type === "spiral") { base.w = 0.26; base.h = 0.48; base.r = 0.28; }
    else if (type === "spike") { base.w = 0.2; base.h = 0.62; base.r = 0.86; }
    else if (type === "crescent") { base.w = 0.36; base.h = 0.36; base.r = 0.28; base.y = -0.6; }
    else if (type === "leaf") { base.w = 0.28; base.h = 0.56; base.r = 0.2; base.y = -0.6; }
    else if (type === "curly") { base.w = 0.18; base.h = 0.56; base.r = 0.36; base.y = -0.8; }
    else if (type === "anime1") { base.w = 0.22; base.h = 0.72; base.r = 0.28; base.y = -0.78; }
    else if (type === "anime2") { base.w = 0.24; base.h = 0.66; base.r = 0.92; base.y = -0.76; }
    else if (type === "anime3") { base.w = 0.18; base.h = 0.9; base.r = 0.16; base.y = -0.9; }
    else if (type === "anime4") { base.w = 0.26; base.h = 0.84; base.r = 0.36; base.y = -0.78; }

    if (this.state.selectedLayer === "hair2") {
      base.y = -0.85;
      if (type === "spiral") { base.w = 0.2; base.h = 0.42; base.r = 0.26; }
      else if (type === "spike") { base.w = 0.15; base.h = 0.54; base.r = 0.92; }
      else if (type === "anime1") { base.w = 0.16; base.h = 0.52; base.r = 0.22; base.y = -0.9; }
      else if (type === "anime2") { base.w = 0.14; base.h = 0.54; base.r = 0.96; base.y = -0.86; }
      else if (type === "anime3") { base.w = 0.14; base.h = 0.7; base.r = 0.12; base.y = -0.95; }
      else if (type === "anime4") { base.w = 0.18; base.h = 0.64; base.r = 0.28; base.y = -0.9; }
      else { base.w = 0.22; base.h = 0.5; base.r = 0.14; }
    }

    this.state.currentShapes().push(base);
    this.state.selectedIndex = this.state.currentShapes().length - 1;
    this.state.selectedIndices = [this.state.selectedIndex];
    this.syncPropsFromSelected();
    this.draw();
  }

  duplicateSelected() {
    const shape = this.state.selectedShape();
    if (!shape) return;
    const copy = JSON.parse(JSON.stringify(shape));
    copy.x += 0.08;
    this.state.currentShapes().push(copy);
    this.state.selectedIndex = this.state.currentShapes().length - 1;
    this.state.selectedIndices = [this.state.selectedIndex];
    this.syncPropsFromSelected();
    this.draw();
  }

  deleteSelected() {
    if (this.state.selectedIndex < 0) return;
    this.state.currentShapes().splice(this.state.selectedIndex, 1);
    this.state.selectedIndex = Math.min(this.state.selectedIndex, this.state.currentShapes().length - 1);
    this.state.selectedIndices = this.state.selectedIndex >= 0 ? [this.state.selectedIndex] : [];
    this.syncPropsFromSelected();
    this.draw();
  }

  clearLayer() {
    this.state[this.state.selectedLayer] = [];
    this.state.clearSelection();
    this.syncPropsFromSelected();
    this.draw();
  }

  clearAll() {
    this.state.hairBehindFace = [];
    this.state.hair1 = [];
    this.state.hair2 = [];
    this.state.clearSelection();
    this.syncPropsFromSelected();
    this.draw();
  }

  // ===== UI sync =====

  syncPropsFromSelected() {
    const s = this.state.selectedShape();
    const empty = !s;
    this.el.propX.value = empty ? "" : s.x;
    this.el.propY.value = empty ? "" : s.y;
    this.el.propW.value = empty ? "" : s.w;
    this.el.propH.value = empty ? "" : s.h;
    this.el.propR.value = empty ? "" : s.r;
    this.el.propRot.value = empty ? "" : (s.rot || 0);
    this.el.propGroupRot.value = empty ? "" : (s.rot || 0);
    this.el.propScaleX.value = 1;
    this.el.propScaleY.value = 1;
    this.el.propColor.value = empty ? "#4b2e20" : (s.color || "#4b2e20");
  }

  applyPropsToSelected() {
    const list = this.state.currentShapes();
    if (!list || !list.length) return;
    const indices = this.state.selectedIndices.length ? this.state.selectedIndices : (this.state.selectedIndex >= 0 ? [this.state.selectedIndex] : []);

    for (const idx of indices) {
      const s = list[idx];
      if (!s) continue;
      s.x = parseFloat(this.el.propX.value) || 0;
      s.y = parseFloat(this.el.propY.value) || 0;
      s.w = parseFloat(this.el.propW.value) || 0.2;
      s.h = parseFloat(this.el.propH.value) || 0.2;
      s.r = parseFloat(this.el.propR.value) || 0.2;
      s.rot = parseFloat(this.el.propRot.value) || 0;
      s.color = this.el.propColor.value || "#4b2e20";
    }
    this.draw();
  }

  applyGroupTransform() {
    const list = this.state.currentShapes();
    const indices = this.state.selectedIndices.length ? this.state.selectedIndices : (this.state.selectedIndex >= 0 ? [this.state.selectedIndex] : []);
    if (!indices.length) return;

    const angle = (parseFloat(this.el.propGroupRot.value) || 0) * Math.PI / 180;
    const sx = parseFloat(this.el.propScaleX.value) || 1;
    const sy = parseFloat(this.el.propScaleY.value) || 1;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (const idx of indices) {
      const s = list[idx];
      if (!s) continue;
      const nx = s.x * cos - s.y * sin;
      const ny = s.x * sin + s.y * cos;
      s.x = nx * sx;
      s.y = ny * sy;
      s.rot = (s.rot || 0) + parseFloat(this.el.propGroupRot.value) || 0;
      if (s.type === 'circle') { s.r = (s.r || 0.2) * Math.max(sx, sy); }
      else { s.w = (s.w || 0.2) * sx; s.h = (s.h || 0.2) * sy; }
    }

    this.el.propGroupRot.value = 0;
    this.el.propScaleX.value = 1;
    this.el.propScaleY.value = 1;
    this.syncPropsFromSelected();
    this.draw();
  }

  setStatus(text, danger = false) {
    if (this.el.status) {
      this.el.status.textContent = text;
      this.el.status.style.color = danger ? "#ff9f9f" : "#9fcbff";
    }
  }

  exportJson() {
    const payload = this.state.exportJSON();
    this.el.io.value = JSON.stringify(payload, null, 2);
    this.setStatus("JSON exported. You can copy and send it.");
  }

  importJson() {
    try {
      const data = JSON.parse(this.el.io.value);
      this.state.importJSON(data);
      this.el.hair1Style.value = this.state.hair1Style;
      this.el.hair2Style.value = this.state.hair2Style;
      this.syncPropsFromSelected();
      this.draw();
      this.setStatus("JSON imported successfully.");
    } catch (error) {
      this.setStatus("Invalid JSON. Check format.", true);
    }
  }

  copyJson() {
    this.exportJson();
    navigator.clipboard.writeText(this.el.io.value)
      .then(() => this.setStatus("JSON copied to clipboard."))
      .catch(() => this.setStatus("Could not copy automatically. Copy manually.", true));
  }

  applyPreset(styleValue, targetSelectId) {
    const preset = this.state.applyPresetForStyle(styleValue, targetSelectId);
    if (!preset) return false;

    this.el.targetLayer.value = this.state.selectedLayer;
    this.el.previewBackShell.checked = this.state.previewBackShell;
    if (this.state.hair2Style) this.el.hair2Style.value = this.state.hair2Style;
    if (this.state.hair1Style) this.el.hair1Style.value = this.state.hair1Style;

    this.syncPropsFromSelected();
    try { this.el.io.value = JSON.stringify(preset, null, 2); } catch (e) { /* ignore */ }
    this.draw();
    this.setStatus(`Preset '${styleValue}' loaded in ${targetSelectId === "hair2Style" ? "Hair 2" : "Hair 1"}.`);
    return true;
  }

  // ===== events =====

  wireUI(elements) {
    this.el = elements;
    this._populateStyles();
    this.el.targetLayer.value = this.state.selectedLayer;

    // Character preview controls
    this.el.previewSize.addEventListener('input', () => {
      this.state.previewSize = Math.max(12, Math.min(21, Number(this.el.previewSize.value || 15)));
      this.draw();
    });
    this.el.previewFaceType.addEventListener('change', () => {
      this.state.previewFaceType = this.el.previewFaceType.value || 'friendly';
      this.draw();
    });
    this.el.previewEyeType.addEventListener('change', () => {
      this.state.previewEyeType = this.el.previewEyeType.value || 'round';
      this.draw();
    });
    this.el.previewBodyColor.addEventListener('input', () => {
      this.state.previewBodyColor = this.el.previewBodyColor.value || '#ff7a59';
      this.draw();
    });
    this.el.previewHairColor.addEventListener('input', () => {
      this.state.previewHairColor = this.el.previewHairColor.value || '#4b2e20';
      this.state.setAllShapeColors(this.state.previewHairColor);
      this.draw();
    });
    this.el.previewAccessory.addEventListener('change', () => {
      this.state.previewAccessory = this.el.previewAccessory.value || 'none';
      this.draw();
    });
    this.el.previewBackShell.addEventListener('change', () => {
      this.state.previewBackShell = !!this.el.previewBackShell.checked;
      this.draw();
    });

    // Style selects
    this.el.hair1Style.addEventListener("change", () => {
      this.state.hair1Style = this.el.hair1Style.value;
      this.applyPreset(this.state.hair1Style, "hair1Style");
    });
    this.el.hair2Style.addEventListener("change", () => {
      this.state.hair2Style = this.el.hair2Style.value;
      this.applyPreset(this.state.hair2Style, "hair2Style");
    });
    this.el.targetLayer.addEventListener("change", () => {
      this.state.selectedLayer = this.el.targetLayer.value;
      this.state.selectedIndex = Math.min(this.state.selectedIndex, this.state.currentShapes().length - 1);
      this.state.selectedIndices = this.state.selectedIndex >= 0 ? [this.state.selectedIndex] : [];
      this.syncPropsFromSelected();
      this.draw();
    });

    // Buttons
    this.el.btnAdd.addEventListener("click", () => this.addShape());
    this.el.btnDuplicate.addEventListener("click", () => this.duplicateSelected());
    this.el.btnDelete.addEventListener("click", () => this.deleteSelected());
    this.el.btnClearLayer.addEventListener("click", () => this.clearLayer());
    this.el.btnClearAll.addEventListener("click", () => this.clearAll());
    this.el.btnExport.addEventListener("click", () => this.exportJson());
    this.el.btnImport.addEventListener("click", () => this.importJson());
    this.el.btnCopy.addEventListener("click", () => this.copyJson());
    this.el.btnInsertFancy.addEventListener("click", () => {
      try {
        this.el.io.value = JSON.stringify(PRESET_FANCY_ANIME, null, 2);
        this.importJson();
        this.setStatus('Preset fancy_anime inserted and imported.');
      } catch (e) { this.setStatus('Could not insert preset.', true); }
    });
    this.el.btnInsertSpiky.addEventListener("click", () => {
      try {
        this.el.io.value = JSON.stringify(PRESET_SPECIAL_SPIKY, null, 2);
        this.importJson();
        this.setStatus('Preset special_spiky inserted and imported.');
      } catch (e) { this.setStatus('Could not insert preset.', true); }
    });
    this.el.btnApplyTransform.addEventListener('click', () => this.applyGroupTransform());
    this.el.btnClearSelection.addEventListener('click', () => {
      this.state.clearSelection();
      this.syncPropsFromSelected();
      this.draw();
    });
    this.el.btnResetCamera.addEventListener('click', () => {
      this.camera.reset();
      this.draw();
    });

    // Property inputs
    [this.el.propX, this.el.propY, this.el.propW, this.el.propH, this.el.propR, this.el.propRot, this.el.propColor].forEach(n => {
      n.addEventListener("input", () => this.applyPropsToSelected());
    });

    // Canvas pointer events
    this.canvas.addEventListener("pointerdown", (ev) => this._onPointerDown(ev));
    this.canvas.addEventListener("pointermove", (ev) => this._onPointerMove(ev));
    this.canvas.addEventListener("pointerup", () => this._onPointerUp());
    this.canvas.addEventListener("pointerleave", () => this._onPointerUp());

    // Wheel zoom (zoom at cursor position)
    this.canvas.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
      this.camera.zoomAt(mx, my, factor, this._cssW, this._cssH);
      this.draw();
    }, { passive: false });

    // Keyboard
    window.addEventListener("keydown", (ev) => this._onKeyDown(ev));

    // Resize
    window.addEventListener('resize', () => { this.updateViewport(); this.draw(); });
    setInterval(() => {
      if ((window.devicePixelRatio || 1) !== this.DPR) { this.updateViewport(); this.draw(); }
    }, 1000);

    // Initial load
    if (STYLE_PRESETS[this.el.hair1Style.value]) this.applyPreset(this.el.hair1Style.value, 'hair1Style');
    if (STYLE_PRESETS[this.el.hair2Style.value]) this.applyPreset(this.el.hair2Style.value, 'hair2Style');
  }

  _populateStyles() {
    this.el.hair1Style.innerHTML = '';
    this.el.hair2Style.innerHTML = '';
    for (const s of HAIR_STYLES) {
      const o1 = document.createElement("option");
      o1.value = s; o1.textContent = s;
      const o2 = document.createElement("option");
      o2.value = s; o2.textContent = s;
      this.el.hair1Style.appendChild(o1);
      this.el.hair2Style.appendChild(o2);
    }
    this.el.hair1Style.value = this.state.hair1Style;
    this.el.hair2Style.value = this.state.hair2Style;
    this.el.previewSize.value = String(this.state.previewSize);
    this.el.previewFaceType.value = this.state.previewFaceType;
    this.el.previewEyeType.value = this.state.previewEyeType;
    this.el.previewBodyColor.value = this.state.previewBodyColor;
    this.el.previewHairColor.value = this.state.previewHairColor;
    this.el.previewAccessory.value = this.state.previewAccessory;
    this.el.previewBackShell.checked = !!this.state.previewBackShell;
  }

  _onPointerDown(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    // Middle-click or space+click: pan
    if (ev.button === 1 || (ev.button === 0 && ev.altKey)) {
      this._isPanning = true;
      this._panStart = { x: mx, y: my };
      return;
    }

    const norm = this.screenToNormalized(mx, my);
    const hit = hitTestLayers(this.state, norm.x, norm.y);

    if (hit) {
      this.state.selectedLayer = hit.layer;
      this.el.targetLayer.value = hit.layer;
      this.state.selectedIndices = [hit.index];
      this.state.selectedIndex = hit.index;
      this.syncPropsFromSelected();
      const shape = this.state.selectedShape();
      if (shape) {
        this.state.drag = { dx: norm.x - shape.x, dy: norm.y - shape.y };
      }
    } else {
      this.state.clearSelection();
      this.syncPropsFromSelected();
    }
    this.draw();
  }

  _onPointerMove(ev) {
    if (this._isPanning && this._panStart) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const dx = mx - this._panStart.x;
      const dy = my - this._panStart.y;
      this.camera.pan(dx, dy);
      this._panStart = { x: mx, y: my };
      this.draw();
      return;
    }

    if (!this.state.drag) return;
    const s = this.state.selectedShape();
    if (!s) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const norm = this.screenToNormalized(mx, my);
    s.x = norm.x - this.state.drag.dx;
    s.y = norm.y - this.state.drag.dy;
    this.syncPropsFromSelected();
    this.draw();
  }

  _onPointerUp() {
    this.state.drag = null;
    this._isPanning = false;
    this._panStart = null;
  }

  _onKeyDown(ev) {
    const s = this.state.selectedShape();
    if (!s) return;
    if (ev.key === "Delete") {
      this.deleteSelected();
      ev.preventDefault();
      return;
    }
    if (ev.key === "[") {
      s.rot = (s.rot || 0) - 5;
      this.syncPropsFromSelected();
      this.draw();
      ev.preventDefault();
    }
    if (ev.key === "]") {
      s.rot = (s.rot || 0) + 5;
      this.syncPropsFromSelected();
      this.draw();
      ev.preventDefault();
    }
  }

  // ===== boot =====

  boot() {
    this.updateViewport();
    this.draw();
    this.setStatus("Ready. Design behind-face, Hair 1, Hair 2 and export JSON. Scroll to zoom, Alt+drag to pan.");
  }
}
