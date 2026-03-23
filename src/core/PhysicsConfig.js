export const COLLISION_SETTINGS = {
  resolutionIterations: 2
};

export const COLLISION_DEBUG_COLORS = {
  player: '#66FFB2',
  enemy: '#FF7A7A',
  tree: '#9EFF66',
  rock: '#C8D2E2',
  default: '#FFD966'
};

export const PLAYER_HITBOX_TEMPLATE = [
  { x: 0, y: 0.18, z: 0, radius: 0.72, height: 0.9 },
  { x: 0, y: -0.36, z: 0.72, radius: 0.42, height: 0.48 }
];

export const ENEMY_HITBOX_TEMPLATES = {
  default: [
    { x: 0, y: 0.16, z: 0, radius: 0.7, height: 0.82 },
    { x: 0, y: -0.34, z: 0.58, radius: 0.42, height: 0.46 }
  ],
  cow: [
    { x: 0, y: 0.22, z: 0, radius: 0.72, height: 0.72 },
    { x: -0.38, y: -0.08, z: 0.18, radius: 0.46, height: 0.42 },
    { x: 0.38, y: -0.08, z: 0.18, radius: 0.46, height: 0.42 }
  ],
  chicken: [
    { x: 0, y: 0.08, z: 0, radius: 0.76, height: 0.62 }
  ],
  orc: [
    { x: 0, y: 0.18, z: 0, radius: 0.74, height: 0.94 },
    { x: 0, y: -0.42, z: 0.68, radius: 0.46, height: 0.54 }
  ],
  skeleton: [
    { x: 0, y: 0.08, z: 0, radius: 0.68, height: 0.86 },
    { x: 0, y: -0.38, z: 0.64, radius: 0.38, height: 0.52 }
  ]
};

export const WORLD_HITBOX_TEMPLATES = {
  tree: [
    { x: 0, y: 12, z: 0, radius: 9, height: 28 }
  ],
  stump: [
    { x: 0, y: 8, z: 0, radius: 6.5, height: 14 }
  ],
  rock: [
    { x: 0, y: 0, z: 0, radius: 0.7, height: 18 }
  ]
};

export function buildHitboxProfile(template, scale = 1) {
  return {
    hitboxOffsets: template.map((entry) => ({
      x: (entry.x || 0) * scale,
      y: (entry.y || 0) * scale
    })),
    hitboxRadii: template.map((entry) => (entry.radius || 0) * scale),
    hitboxZOffsets: template.map((entry) => (entry.z || 0) * scale),
    hitboxHeights: template.map((entry) => (entry.height || 0) * scale)
  };
}