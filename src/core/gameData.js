const ITEM_GRAPHICS = {
  wood: [
    { type: 'rect', x: 0, y: 0, w: 0.7, h: 0.24, color: '#8B4513', rotation: -0.35, radius: 0.25 },
    { type: 'line', x1: -0.2, y1: -0.08, x2: 0.22, y2: 0.08, color: '#b9783d', lineWidth: 0.05 }
  ],
  stone: [
    { type: 'poly', points: [[-0.22, 0.18], [-0.34, -0.02], [-0.1, -0.28], [0.24, -0.22], [0.32, 0.06], [0.08, 0.28]], color: '#888888', stroke: '#c8d0db', lineWidth: 0.035 }
  ],
  stick: [
    { type: 'rect', x: 0, y: 0, w: 0.78, h: 0.14, color: '#A0714F', rotation: -0.55, radius: 0.35 }
  ],
  charcoal: [
    { type: 'poly', points: [[-0.24, 0.18], [-0.3, -0.08], [-0.12, -0.26], [0.18, -0.2], [0.28, 0.06], [0.06, 0.26]], color: '#1a1a1a', stroke: '#5a5a5a', lineWidth: 0.03 }
  ],
  burnt_wood: [
    { type: 'rect', x: 0, y: 0, w: 0.72, h: 0.2, color: '#3a3a2a', rotation: -0.28, radius: 0.22 },
    { type: 'line', x1: -0.18, y1: -0.05, x2: 0.2, y2: 0.06, color: '#6a5a3f', lineWidth: 0.04 }
  ],
  goblin_fang: [
    { type: 'poly', points: [[-0.12, 0.24], [-0.18, -0.04], [0, -0.32], [0.18, -0.02], [0.12, 0.24]], color: '#FFD700', stroke: '#fff4bf', lineWidth: 0.03 }
  ],
  orc_hide: [
    { type: 'poly', points: [[-0.28, 0.16], [-0.3, -0.12], [-0.12, -0.3], [0.16, -0.24], [0.3, 0.04], [0.06, 0.3]], color: '#8B2020', stroke: '#d36464', lineWidth: 0.03 }
  ],
  bone: [
    { type: 'line', x1: -0.22, y1: 0.18, x2: 0.22, y2: -0.18, color: '#DDDDC8', lineWidth: 0.09 },
    { type: 'circle', x: -0.26, y: 0.22, r: 0.1, color: '#DDDDC8' },
    { type: 'circle', x: 0.26, y: -0.22, r: 0.1, color: '#DDDDC8' }
  ],
  crystal_shard: [
    { type: 'poly', points: [[0, -0.34], [0.22, -0.06], [0.1, 0.3], [-0.16, 0.18], [-0.24, -0.08]], color: '#CC44FF', stroke: '#f4b7ff', lineWidth: 0.03 }
  ],
  wooden_axe: [
    { type: 'rect', x: -0.04, y: 0.08, w: 0.14, h: 0.72, color: '#9B6B47', rotation: -0.45, radius: 0.25 },
    { type: 'poly', points: [[0.02, -0.24], [0.3, -0.12], [0.18, 0.04], [-0.06, -0.02]], color: '#d1b08f', stroke: '#f3e3cb', lineWidth: 0.03 }
  ],
  stone_axe: [
    { type: 'rect', x: -0.04, y: 0.08, w: 0.14, h: 0.72, color: '#7A8B9F', rotation: -0.45, radius: 0.25 },
    { type: 'poly', points: [[0.02, -0.26], [0.32, -0.14], [0.18, 0.06], [-0.08, -0.02]], color: '#c5d0dd', stroke: '#f2f7fb', lineWidth: 0.03 }
  ],
  elemental_orb_fire: [
    { type: 'circle', x: 0, y: 0, r: 0.26, color: '#FF6A3D', stroke: '#ffd1bf', lineWidth: 0.04 },
    { type: 'poly', points: [[0, -0.14], [0.1, 0.02], [0.02, 0.18], [-0.08, 0.02]], color: '#FFF1A8' }
  ],
  elemental_orb_water: [
    { type: 'circle', x: 0, y: 0, r: 0.26, color: '#4AA7FF', stroke: '#d1edff', lineWidth: 0.04 },
    { type: 'poly', points: [[0, -0.18], [0.1, 0.02], [0, 0.2], [-0.1, 0.02]], color: '#EAF9FF' }
  ],
  elemental_orb_air: [
    { type: 'circle', x: 0, y: 0, r: 0.26, color: '#8FD9FF', stroke: '#effbff', lineWidth: 0.04 },
    { type: 'line', x1: -0.16, y1: 0.02, x2: 0.12, y2: -0.08, color: '#ffffff', lineWidth: 0.04 },
    { type: 'line', x1: -0.12, y1: 0.12, x2: 0.16, y2: 0.02, color: '#ffffff', lineWidth: 0.04 }
  ],
  elemental_orb_earth: [
    { type: 'circle', x: 0, y: 0, r: 0.26, color: '#A47A5A', stroke: '#ebd8c8', lineWidth: 0.04 },
    { type: 'poly', points: [[-0.12, 0.08], [0, -0.12], [0.14, 0.02], [0.02, 0.18]], color: '#E8D6B0' }
  ],
  elemental_orb_lightning: [
    { type: 'circle', x: 0, y: 0, r: 0.26, color: '#FFE45E', stroke: '#fff8cc', lineWidth: 0.04 },
    { type: 'poly', points: [[-0.02, -0.18], [0.08, -0.02], [0, -0.02], [0.08, 0.18], [-0.1, 0.02], [-0.02, 0.02]], color: '#FFFCE0' }
  ]
};

export const GAME_DATA = {
  world: {
    width:      2400,
    height:     1800,
    treeCount:  42,
    rockCount:  28,
    seed:       1337
  },
  items: [
    { id: 'wood',          name: 'Wood',         color: '#8B4513', graphic: ITEM_GRAPHICS.wood },
    { id: 'stone',         name: 'Stone',        color: '#888888', graphic: ITEM_GRAPHICS.stone },
    { id: 'stick',         name: 'Stick',        color: '#A0714F', graphic: ITEM_GRAPHICS.stick },
    { id: 'charcoal',      name: 'Charcoal',     color: '#1a1a1a', graphic: ITEM_GRAPHICS.charcoal },
    { id: 'burnt_wood',    name: 'Burnt Wood',   color: '#3a3a2a', graphic: ITEM_GRAPHICS.burnt_wood },
    { id: 'goblin_fang',   name: 'Goblin Fang',  color: '#FFD700', graphic: ITEM_GRAPHICS.goblin_fang },
    { id: 'orc_hide',      name: 'Orc Hide',     color: '#8B2020', graphic: ITEM_GRAPHICS.orc_hide },
    { id: 'bone',          name: 'Bone',         color: '#DDDDC8', graphic: ITEM_GRAPHICS.bone },
    { id: 'crystal_shard', name: 'Crystal Shard',color: '#CC44FF', graphic: ITEM_GRAPHICS.crystal_shard },
    { id: 'wooden_axe',    name: 'Wooden Axe',   color: '#9B6B47', graphic: ITEM_GRAPHICS.wooden_axe },
    { id: 'stone_axe',     name: 'Stone Axe',    color: '#7A8B9F', graphic: ITEM_GRAPHICS.stone_axe },
    { id: 'elemental_orb_fire', name: 'Fire Orb', color: '#FF6A3D', graphic: ITEM_GRAPHICS.elemental_orb_fire },
    { id: 'elemental_orb_water', name: 'Water Orb', color: '#4AA7FF', graphic: ITEM_GRAPHICS.elemental_orb_water },
    { id: 'elemental_orb_air', name: 'Air Orb', color: '#8FD9FF', graphic: ITEM_GRAPHICS.elemental_orb_air },
    { id: 'elemental_orb_earth', name: 'Earth Orb', color: '#A47A5A', graphic: ITEM_GRAPHICS.elemental_orb_earth },
    { id: 'elemental_orb_lightning', name: 'Lightning Orb', color: '#FFE45E', graphic: ITEM_GRAPHICS.elemental_orb_lightning }
  ],
  elements: [
    { id: 'fire', name: 'Fire', nameColor: '#FF4500', accentColor: '#FF6347', epithet: 'The Burning' },
    { id: 'water', name: 'Water', nameColor: '#1E90FF', accentColor: '#00BFFF', epithet: 'The Flowing' },
    { id: 'air', name: 'Air', nameColor: '#87CEEB', accentColor: '#B0E0E6', epithet: 'The Wandering' },
    { id: 'earth', name: 'Earth', nameColor: '#8B4513', accentColor: '#A0826D', epithet: 'The Grounded' },
    { id: 'lightning', name: 'Lightning', nameColor: '#FFD700', accentColor: '#FFFF00', epithet: 'The Swift' },
    { id: 'ice', name: 'Ice', nameColor: '#00CED1', accentColor: '#40E0D0', epithet: 'The Freezing' },
    { id: 'nature', name: 'Nature', nameColor: '#228B22', accentColor: '#32CD32', epithet: 'The Growing' },
    { id: 'light', name: 'Light', nameColor: '#FFFACD', accentColor: '#FFFFE0', epithet: 'The Radiant' }
  ],
  abilities: [
    // ── TUNING ZONE ──────────────────────────────────────────────────────────
    // baseDamage      : raw damage per hit
    // manaCost        : mana spent per cast (0 = free)
    // cooldown        : seconds between casts
    //
    // SLASH abilities (basicAttack style):
    //   slash       : true → medio-óvalo instantáneo frente al jugador
    //   slashDepth  : extensión hacia delante (px)
    //   slashWidth  : ancho perpendicular del óvalo (px)
    //   slashLife   : segundos que dura la animación
    //
    // PROJECTILE abilities (fireball style):
    //   projectile      : true → proyectil que viaja
    //   projectileSpeed : px/s
    //   projectileRadius: radio colisión/dibujo (px)
    //   projectileLife  : segundos antes de expirar
    //   projectileColor : color del proyectil y float
    //   burnDuration    : segundos que dura el burn al impactar
    //   burnDps         : daño por tick (cada 0.4 s)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'basicAttack',  name: 'Basic Attack',  element: null,
      baseDamage: 14,     manaCost: 0,           cooldown: 0.25,
      slash: true,        slashDepth: 72,        slashWidth: 52,  slashLife: 0.15
    },
    {
      id: 'fireball',       name: 'Fireball',       element: 'fire',
      baseDamage: 22,       manaCost: 8,            cooldown: 0.4,
      projectile: true,     projectileSpeed: 420,   projectileRadius: 7,
      projectileLife: 1.8,  projectileColor: '#FF5500',
      burnDuration: 3.0,    burnDps: 4
    },
    {
      id: 'waterbolt',    name: 'Water Bolt',    element: 'water',
      baseDamage: 16,     manaCost: 14,          cooldown: 1.1,
      projectile: true,   projectileSpeed: 320,  projectileRadius: 8,
      projectileLife: 1.6, projectileColor: '#4aa7ff',
      parabolic: true,
      arcHeight: 95,
      waterPuddleDuration: 4.5,
      waterPuddleRadius: 30,
      slipperyDuration: 1.8,
      slipFriction: 0.92,
      extinguishRadius: 34
    },
    {
      id: 'airslash',     name: 'Air Slash',     element: 'air',
      baseDamage: 22,     manaCost: 18,          cooldown: 1.2,    range: 170,
      gustRadius: 120,
      leafStripRadius: 140,
      launchDuration: 1.15,
      launchUpward: 320,
      launchForce: 250,
      spinSpeed: 14,
      fallDamage: 18
    },
    {
      id: 'lightningChain', name: 'Lightning Chain', element: 'lightning',
      baseDamage: 34,       manaCost: 32,            cooldown: 7.5,
      range: 230,
      chainLightning: true,
      chainCount: 4,
      chainRadius: 170,
      paralyzeDuration: 1.2,
      projectileColor: '#FFE45E'
    },
    {
      id: 'earthSpike',   name: 'Earth Spike',   element: 'earth',
      baseDamage: 28,     manaCost: 22,          cooldown: 2.2,
      earthSpike: true,
      spikeRadius: 115,
      spikeKnockback: 200,
      spikeStunDuration: 0.6
    },
  ],
  materials: [
    { id: 'wood', name: 'Wood', rarity: 'common', color: '#8B4513' },
    { id: 'stone', name: 'Stone', rarity: 'common', color: '#808080' },
    { id: 'metal', name: 'Metal', rarity: 'uncommon', color: '#C0C0C0' },
    { id: 'crystal', name: 'Crystal', rarity: 'rare', color: '#FF00FF' }
  ],
  enemyTypes: [
    { id: 'goblin',   name: 'Goblin',   baseHp:  40, attackDamage:  6, speed:  80, radius: 12, color: '#3aab3a', xpValue: 10, lootItem: 'goblin_fang', lootChance: 0.35 },
    { id: 'orc',      name: 'Orc',      baseHp: 120, attackDamage: 15, speed:  48, radius: 19, color: '#8B0000', xpValue: 35, lootItem: 'orc_hide',    lootChance: 0.50 },
    { id: 'skeleton', name: 'Skeleton', baseHp:  65, attackDamage: 10, speed:  62, radius: 13, color: '#DDDDC8', xpValue: 22, lootItem: 'bone',         lootChance: 0.55 }
    ,{ id: 'cow',      name: 'Cow',      baseHp:  30, attackDamage: 0,  speed:  28, radius: 14, color: '#BEA56A', xpValue: 1,  lootItem: null,        lootChance: 0 }
    ,{ id: 'chicken',  name: 'Chicken',  baseHp:  12, attackDamage: 0,  speed:  46, radius: 8,  color: '#FFF1A8', xpValue: 0,  lootItem: null,        lootChance: 0 }
  ]
};

export default GAME_DATA;
