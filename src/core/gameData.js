export const GAME_DATA = {
  world: {
    width:      2400,
    height:     1800,
    treeCount:  42,
    rockCount:  28,
    seed:       1337
  },
  items: [
    { id: 'wood',          name: 'Wood',         color: '#8B4513' },
    { id: 'stone',         name: 'Stone',        color: '#888888' },
    { id: 'stick',         name: 'Stick',        color: '#A0714F' },
    { id: 'charcoal',      name: 'Charcoal',     color: '#1a1a1a' },
    { id: 'burnt_wood',    name: 'Burnt Wood',   color: '#3a3a2a' },
    { id: 'goblin_fang',   name: 'Goblin Fang',  color: '#FFD700' },
    { id: 'orc_hide',      name: 'Orc Hide',     color: '#8B2020' },
    { id: 'bone',          name: 'Bone',         color: '#DDDDC8' },
    { id: 'crystal_shard', name: 'Crystal Shard',color: '#CC44FF' },
    { id: 'wooden_axe',    name: 'Wooden Axe',   color: '#9B6B47' },
    { id: 'stone_axe',     name: 'Stone Axe',    color: '#7A8B9F' }
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
      baseDamage: 18,     manaCost: 12,          cooldown: 0.8,    range: 140
    },
    {
      id: 'airslash',     name: 'Air Slash',     element: 'air',
      baseDamage: 22,     manaCost: 18,          cooldown: 1.2,    range: 130
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
