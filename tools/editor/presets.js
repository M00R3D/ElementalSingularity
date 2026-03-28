// ========================================
// Hair Shape Editor – Presets & Style Data
// ========================================

export const HAIR_STYLES = [
  "none",
  "anime_ahoge", "anime_twintails", "anime_bangs", "anime_straight", "anime_spiky",
  "female_wavy", "female_curly", "female_braid", "female_bob", "female_half_up",
  "medieval_knight", "medieval_maiden", "medieval_noble", "medieval_warrior", "medieval_peasant",
  "ridiculous_poodle", "ridiculous_neon", "ridiculous_worm", "ridiculous_bubble", "ridiculous_afro",
  "fancy_anime",
  "special_spiky"
];

export const PRESET_FANCY_ANIME = {
  version: 1,
  hair1Style: 'fancy_anime',
  hair2Style: 'fancy_anime',
  hairBehindFace: [
    { type: 'circle', x: -0.24, y: -0.09, r: 0.6 },
    { type: 'circle', x: 0.25, y: -0.09, r: 0.6 },
    { type: 'circle', x: 0.00, y: -0.48, r: 0.46 },
    { type: 'anime2', x: -0.58, y: 0.26, w: 0.57, h: 0.66, rot: -27 },
    { type: 'anime2', x: 0.47, y: 0.24, w: 0.45, h: 0.33, rot: 101 },
    { type: 'anime2', x: 0.46, y: 0.36, w: 0.24, h: 0.66, rot: 141 }
  ],
  hair1: [
    { type: 'circle', x: -0.01, y: -0.63, r: 0.26 },
    { type: 'anime3', x: -0.53, y: 0.11, w: 0.52, h: 1.24, rot: 0 },
    { type: 'anime3', x: -0.67, y: 0.13, w: 0.56, h: 1.28, rot: 13 },
    { type: 'anime4', x: 0.57, y: 0.05, w: 0.40, h: 0.98, rot: -34 },
    { type: 'anime3', x: 0.72, y: 0.05, w: 0.56, h: 1.28, rot: -37 },
    { type: 'anime3', x: 0.96, y: 0.13, w: 0.89, h: 1.28, rot: -46 },
    { type: 'anime3', x: -0.29, y: -0.16, w: 0.18, h: 0.90, rot: 0 },
    { type: 'anime3', x: -0.28, y: -0.29, w: 1.56, h: 0.90, rot: 0 },
    { type: 'anime3', x: 0.63, y: -0.41, w: 1.56, h: 0.90, rot: -83 },
    { type: 'leaf', x: 0.37, y: -0.53, w: 0.54, h: 0.56 },
    { type: 'leaf', x: 0.57, y: -0.35, w: 0.54, h: 0.56 },
    { type: 'leaf', x: 0.61, y: 0.05, w: 0.54, h: 0.56 },
    { type: 'leaf', x: -0.37, y: -0.48, w: 0.54, h: 0.56 },
    { type: 'leaf', x: -0.57, y: -0.30, w: 0.54, h: 0.56 }
  ],
  hair2: [
    { type: 'anime3', x: -0.19, y: -0.32, w: 0.14, h: 0.70 },
    { type: 'anime3', x: 0.23, y: -0.32, w: 0.14, h: 0.70, rot: -13 }
  ]
};

export const PRESET_SPECIAL_SPIKY = {
  version: 1,
  hair1Style: "special_spiky",
  hair2Style: "special_spiky",
  hairBehindFace: [
    { type: "circle", x: 0, y: -0.38093333136806706, w: 0.35, h: 0.35, r: 0.5800000000000003, rot: 0, color: "#4b2e20" },
    { type: "circle", x: 0.4186529463352946, y: -0.1907310640806984, w: 0.35, h: 0.35, r: 0.5800000000000003, rot: 0, color: "#4b2e20" },
    { type: "circle", x: -0.36421592882384424, y: -0.1814528767314336, w: 0.35, h: 0.35, r: 0.5800000000000003, rot: 0, color: "#4b2e20" }
  ],
  hair1: [
    { type: "triangle", x: -0.009277932517015934, y: -1.0025700043809742, w: 0.16999999999999996, h: 0.16999999999999996, r: 0.2, rot: 0, color: "#4b2e20" },
    { type: "triangle", x: 0.2423678963637609, y: -0.960818288725407, w: 0.16999999999999996, h: 0.16999999999999996, r: 0.3, rot: 22, color: "#4b2e20" },
    { type: "triangle", x: 0.5311264746415971, y: -0.7845333024619355, w: 0.16999999999999996, h: 0.16999999999999996, r: 0.3, rot: 22, color: "#4b2e20" },
    { type: "triangle", x: 0.7874117794453797, y: -0.6546390618206014, w: 0.16999999999999996, h: 0.16999999999999996, r: 0.3, rot: 39, color: "#4b2e20" },
    { type: "triangle", x: -0.2632916577615537, y: -0.9515401332301733, w: 0.16999999999999996, h: 0.16999999999999996, r: 0.2, rot: -26, color: "#4b2e20" },
    { type: "triangle", x: -0.5173056378383403, y: -0.7706160532920694, w: 0.16999999999999996, h: 0.16999999999999996, r: 0.2, rot: -26, color: "#4b2e20" },
    { type: "triangle", x: -0.7898757377814076, y: -0.6360827189761029, w: 0.16999999999999996, h: 0.16999999999999996, r: 0.2, rot: -45, color: "#4b2e20" },
    { type: "triangle", x: -0.700500978795378, y: -0.7613379296508668, w: 0.18, h: 0.35, r: 0.2, rot: -37, color: "#4b2e20" },
    { type: "triangle", x: 0.7294715854550436, y: -0.7938114579571692, w: 0.18, h: 0.35, r: 0.2, rot: 30, color: "#4b2e20" }
  ],
  hair2: [
    { type: "triangle", x: -0.004639221090756845, y: -0.4974299637649948, w: 0.22, h: 0.5, r: 0.14, rot: 180, color: "#4b2e20" },
    { type: "triangle", x: 0.14958602287111278, y: -0.46495637175063015, w: 0.22, h: 0.5, r: 0.14, rot: 195, color: "#4b2e20" },
    { type: "triangle", x: -0.14154045177048424, y: -0.46031727807599776, w: 0.22, h: 0.5, r: 0.14, rot: 161, color: "#4b2e20" },
    { type: "triangle", x: -0.6321473173406525, y: 0.10565049381953816, w: 0.22, h: 0.5, r: 0.14, rot: 161, color: "#4b2e20" },
    { type: "triangle", x: 0.6354570957137592, y: 0.11956764742731094, w: 0.22, h: 0.5, r: 0.14, rot: 191, color: "#4b2e20" }
  ]
};

export const STYLE_PRESETS = {
  fancy_anime: PRESET_FANCY_ANIME,
  special_spiky: PRESET_SPECIAL_SPIKY
};

export function generateDefaultPreset(styleValue) {
  const preset = { version: 1, hair1Style: styleValue, hair2Style: styleValue, hairBehindFace: [], hair1: [], hair2: [] };

  if (!styleValue || styleValue === 'none') {
    preset.hair2Style = 'none';
    return preset;
  }

  if (styleValue.startsWith('anime_') || styleValue.startsWith('fancy') || styleValue.startsWith('special')) {
    preset.hairBehindFace.push({ type: 'circle', x: -0.18, y: -0.15, r: 0.48 });
    preset.hairBehindFace.push({ type: 'circle', x: 0.22, y: -0.15, r: 0.48 });
    preset.hair1.push({ type: 'anime3', x: -0.45, y: 0.05, w: 0.42, h: 1.0, rot: -8 });
    preset.hair1.push({ type: 'anime3', x: 0.50, y: 0.02, w: 0.42, h: 1.05, rot: 6 });
    preset.hair2.push({ type: 'anime3', x: -0.12, y: -0.28, w: 0.14, h: 0.6 });
    preset.hair2.push({ type: 'anime3', x: 0.16, y: -0.28, w: 0.14, h: 0.6 });
    return preset;
  }

  if (styleValue.startsWith('female_')) {
    preset.hairBehindFace.push({ type: 'circle', x: 0, y: -0.36, r: 0.46 });
    preset.hair1.push({ type: 'leaf', x: -0.38, y: -0.22, w: 0.46, h: 0.7 });
    preset.hair1.push({ type: 'leaf', x: 0.42, y: -0.18, w: 0.46, h: 0.7 });
    preset.hair2.push({ type: 'anime3', x: -0.12, y: -0.34, w: 0.12, h: 0.5 });
    return preset;
  }

  if (styleValue.startsWith('medieval_')) {
    preset.hairBehindFace.push({ type: 'circle', x: 0, y: -0.42, r: 0.5 });
    preset.hair1.push({ type: 'triangle', x: -0.26, y: -0.86, w: 0.22, h: 0.36, rot: -20 });
    preset.hair1.push({ type: 'triangle', x: 0.32, y: -0.82, w: 0.22, h: 0.36, rot: 18 });
    preset.hair2.push({ type: 'rect', x: 0, y: -0.34, w: 0.18, h: 0.34 });
    return preset;
  }

  if (styleValue.startsWith('ridiculous_')) {
    preset.hairBehindFace.push({ type: 'circle', x: -0.36, y: -0.2, r: 0.42 });
    preset.hairBehindFace.push({ type: 'circle', x: 0.38, y: -0.18, r: 0.42 });
    preset.hair1.push({ type: 'circle', x: -0.08, y: -0.9, r: 0.22 });
    preset.hair1.push({ type: 'circle', x: 0.42, y: -0.7, r: 0.18 });
    preset.hair1.push({ type: 'circle', x: -0.62, y: -0.72, r: 0.16 });
    return preset;
  }

  preset.hairBehindFace.push({ type: 'circle', x: 0, y: -0.38, r: 0.44 });
  preset.hair1.push({ type: 'anime3', x: -0.36, y: 0.0, w: 0.38, h: 0.9 });
  preset.hair1.push({ type: 'anime3', x: 0.36, y: 0.0, w: 0.38, h: 0.9 });
  return preset;
}

export function cloneShapes(list) {
  return Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : [];
}
