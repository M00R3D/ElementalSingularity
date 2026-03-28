// ========================================
// Hair Shape Editor – State Management
// ========================================

import { STYLE_PRESETS, cloneShapes } from './presets.js';

export class EditorState {
  constructor() {
    this.hair1Style = "anime_straight";
    this.hair2Style = "none";
    this.previewSize = 15;
    this.previewFaceType = "friendly";
    this.previewEyeType = "round";
    this.previewBodyColor = "#ff7a59";
    this.previewHairColor = "#4b2e20";
    this.previewAccessory = "none";
    this.previewBackShell = false;

    this.hairBehindFace = [];
    this.hair1 = [];
    this.hair2 = [];

    this.selectedLayer = "hair1";
    this.selectedIndex = -1;
    this.selectedIndices = [];
    this.drag = null;
  }

  currentShapes() {
    return this[this.selectedLayer];
  }

  selectedShape() {
    const list = this.currentShapes();
    if (!list) return null;
    if (this.selectedIndex < 0 || this.selectedIndex >= list.length) return null;
    return list[this.selectedIndex] || null;
  }

  clearSelection() {
    this.selectedIndex = -1;
    this.selectedIndices = [];
  }

  setAllShapeColors(color) {
    const nextColor = color || '#4b2e20';
    for (const layer of [this.hairBehindFace, this.hair1, this.hair2]) {
      for (const shape of layer) {
        if (!shape) continue;
        shape.color = nextColor;
      }
    }
  }

  /** Returns the character meta object matching in-game format */
  getCharacterMeta() {
    return {
      name: 'Preview',
      faceType: this.previewFaceType,
      eyeType: this.previewEyeType,
      size: this.previewSize,
      color: this.previewBodyColor,
      hairStyle: this.hair1Style,
      hairStyle2: this.hair2Style,
      hairColor: this.previewHairColor,
      accessory: this.previewAccessory
    };
  }

  applyPresetForStyle(styleValue, targetSelectId) {
    let preset = STYLE_PRESETS[styleValue];
    const hasExplicitPreset = !!preset;
    if (!preset) {
      preset = {
        version: 1,
        hair1Style: styleValue,
        hair2Style: targetSelectId === 'hair2Style' ? styleValue : this.hair2Style,
        hairBehindFace: [],
        hair1: [],
        hair2: []
      };
    }

    if (targetSelectId === "hair1Style") {
      this.hair1Style = styleValue;
      this.hairBehindFace = cloneShapes(preset.hairBehindFace);
      this.hair1 = cloneShapes(preset.hair1);
      // Always refresh hair2 when style 1 changes to avoid stale overlap from previous presets.
      this.hair2Style = hasExplicitPreset ? String(preset.hair2Style || 'none') : 'none';
      this.hair2 = cloneShapes(preset.hair2);
    } else if (targetSelectId === "hair2Style") {
      this.hair2Style = styleValue;
      // Explicit preset may provide front shapes (fancy/special). Otherwise clear to procedural fringe.
      this.hair2 = cloneShapes(preset.hair2);
    } else {
      return null;
    }

    this.selectedLayer = targetSelectId === "hair2Style" ? "hair2" : "hair1";
    this.clearSelection();

    const hasAnyPresetShapes =
      (Array.isArray(preset.hairBehindFace) && preset.hairBehindFace.length > 0) ||
      (Array.isArray(preset.hair1) && preset.hair1.length > 0) ||
      (Array.isArray(preset.hair2) && preset.hair2.length > 0);
    if (hasAnyPresetShapes) {
      this.previewBackShell = false;
    }

    this.setAllShapeColors(this.previewHairColor);

    return preset;
  }

  exportJSON() {
    return {
      version: 1,
      hair1Style: this.hair1Style,
      hair2Style: this.hair2Style,
      hairBehindFace: this.hairBehindFace,
      hair1: this.hair1,
      hair2: this.hair2
    };
  }

  importJSON(data) {
    this.hair1Style = String(data.hair1Style || "anime_straight");
    this.hair2Style = String(data.hair2Style || "none");
    this.hairBehindFace = cloneShapes(data.hairBehindFace);
    this.hair1 = cloneShapes(data.hair1);
    this.hair2 = cloneShapes(data.hair2);
    this.setAllShapeColors(this.previewHairColor);
    this.clearSelection();
  }
}
