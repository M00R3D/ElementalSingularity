const status = (id, duration, power) => ({ id, duration, power });

const inferUsageType = (abilityType) => {
  if (abilityType === 'dash' || abilityType === 'teleport') return 'unarmed';
  if (abilityType === 'projectile' || abilityType === 'burst' || abilityType === 'laser') return 'ranged';
  if (abilityType === 'buff' || abilityType === 'summon' || abilityType === 'aura' || abilityType === 'aoe' || abilityType === 'chaos') return 'magic';
  return 'magic';
};

const makeAbility = (elementId, branchId, slug, config) => ({
  id: `${elementId}-${slug}`,
  elementId,
  branchId,
  usageType: config.usageType || inferUsageType(config.type),
  scaling: 1,
  manaCost: 0,
  staminaCost: 0,
  cooldown: 0.5,
  damage: 12,
  description: '',
  statuses: [],
  icon: config.type,
  ...config
});

const elements = {
  fire: { id: 'fire', name: 'Fire', color: '#ff7a2f', accent: '#ffd1a3', epithet: 'Pyre' },
  water: { id: 'water', name: 'Water', color: '#43b4ff', accent: '#a6e2ff', epithet: 'Tide' },
  air: { id: 'air', name: 'Air', color: '#9bf3ff', accent: '#f0feff', epithet: 'Gale' },
  earth: { id: 'earth', name: 'Earth', color: '#9c7b4f', accent: '#d8c59a', epithet: 'Stone' },
  electricity: { id: 'electricity', name: 'Electricity', color: '#ffd84a', accent: '#fff2aa', epithet: 'Volt' },
  light: { id: 'light', name: 'Light', color: '#fff5ae', accent: '#ffffff', epithet: 'Prism' },
  darkness: { id: 'darkness', name: 'Darkness', color: '#7f69d9', accent: '#c7b8ff', epithet: 'Night' },
  ghost: { id: 'ghost', name: 'Ghost', color: '#b4ffe1', accent: '#f3fffb', epithet: 'Wraith' },
  puremana: { id: 'puremana', name: 'Pure Mana', color: '#ff78ff', accent: '#ffd7ff', epithet: 'Arcana' }
};

const elementBranches = {
  fire: [
    { id: 'inferno', name: 'Inferno', playstyle: 'burst' },
    { id: 'ash', name: 'Ash', playstyle: 'control' },
    { id: 'phoenix', name: 'Phoenix', playstyle: 'risk' }
  ],
  water: [
    { id: 'tide', name: 'Tide', playstyle: 'support' },
    { id: 'frost', name: 'Frost', playstyle: 'control' },
    { id: 'abyss', name: 'Abyss', playstyle: 'summons' }
  ],
  air: [
    { id: 'gale', name: 'Gale', playstyle: 'mobility' },
    { id: 'tempest', name: 'Tempest', playstyle: 'burst' },
    { id: 'echo', name: 'Echo', playstyle: 'chaos' }
  ],
  earth: [
    { id: 'quake', name: 'Quake', playstyle: 'control' },
    { id: 'bastion', name: 'Bastion', playstyle: 'support' },
    { id: 'wildroot', name: 'Wildroot', playstyle: 'summons' }
  ],
  electricity: [
    { id: 'arc', name: 'Arc', playstyle: 'burst' },
    { id: 'storm', name: 'Storm', playstyle: 'control' },
    { id: 'surge', name: 'Surge', playstyle: 'risk' }
  ],
  light: [
    { id: 'sun', name: 'Sun', playstyle: 'burst' },
    { id: 'halo', name: 'Halo', playstyle: 'support' },
    { id: 'mirror', name: 'Mirror', playstyle: 'control' }
  ],
  darkness: [
    { id: 'fang', name: 'Fang', playstyle: 'risk' },
    { id: 'veil', name: 'Veil', playstyle: 'control' },
    { id: 'hunger', name: 'Hunger', playstyle: 'summons' }
  ],
  ghost: [
    { id: 'haunt', name: 'Haunt', playstyle: 'control' },
    { id: 'phase', name: 'Phase', playstyle: 'mobility' },
    { id: 'seance', name: 'Seance', playstyle: 'chaos' }
  ],
  puremana: [
    { id: 'rune', name: 'Rune', playstyle: 'control' },
    { id: 'overflow', name: 'Overflow', playstyle: 'risk' },
    { id: 'weave', name: 'Weave', playstyle: 'support' }
  ]
};

const abilities = [
  makeAbility('fire', 'inferno', 'cinder-bolt', { name: 'Cinder Bolt', type: 'projectile', cooldown: 0.24, damage: 16, scaling: 1.12, manaCost: 2, staminaCost: 1, speed: 650, size: 1, statuses: [status('burn', 2.3, 3)], description: 'Fast projectile that starts burn chains.' }),
  makeAbility('fire', 'inferno', 'sunspike', { name: 'Sunspike', type: 'laser', cooldown: 1.15, damage: 26, scaling: 1.25, manaCost: 8, staminaCost: 2, range: 340, size: 1.1, statuses: [status('burn', 1.8, 2)], description: 'Focused burst line for elites.' }),
  makeAbility('fire', 'ash', 'ashbind', { name: 'Ashbind', type: 'aoe', cooldown: 2.4, damage: 20, scaling: 1.06, manaCost: 10, staminaCost: 4, radius: 94, statuses: [status('ash', 3.5, 2)], description: 'Lingering control field that slows targets.' }),
  makeAbility('fire', 'ash', 'smoke-step', { name: 'Smoke Step', type: 'dash', cooldown: 1.9, damage: 10, scaling: 0.6, manaCost: 3, staminaCost: 9, dashDistance: 170, statuses: [status('burn', 1.2, 1)], description: 'Mobility trail that scorches through packs.' }),
  makeAbility('fire', 'phoenix', 'ember-veil', { name: 'Ember Veil', type: 'buff', cooldown: 5.2, damage: 0, scaling: 0, manaCost: 14, staminaCost: 6, duration: 5, selfDamage: 6, buffModifiers: { damage: 0.24, critChance: 0.08, aura: 0.25 }, description: 'Trade life for a volatile damage veil.' }),
  makeAbility('fire', 'phoenix', 'phoenix-idol', { name: 'Phoenix Idol', type: 'summon', cooldown: 6.2, damage: 15, scaling: 1.18, manaCost: 18, staminaCost: 6, radius: 15, duration: 8, statuses: [status('burn', 2.1, 2)], description: 'Orbiting idol that spits embers.' }),
  makeAbility('fire', 'phoenix', 'cataclysm-draw', { name: 'Cataclysm Draw', type: 'chaos', cooldown: 7.4, damage: 28, scaling: 1.4, manaCost: 22, staminaCost: 9, radius: 110, chaosOptions: ['laser', 'burst', 'aoe'], statuses: [status('burn', 3, 3)], description: 'Random infernal finisher with huge payoff.' }),
  makeAbility('water', 'tide', 'pressure-lance', { name: 'Pressure Lance', type: 'laser', cooldown: 0.62, damage: 18, scaling: 1.08, manaCost: 4, staminaCost: 1, range: 300, size: 1, statuses: [status('soak', 3, 2)], description: 'High-pressure line that primes reactions.' }),
  makeAbility('water', 'tide', 'deluge-fan', { name: 'Deluge Fan', type: 'burst', cooldown: 0.86, damage: 9, scaling: 0.9, manaCost: 5, staminaCost: 2, speed: 480, projectileCount: 6, spread: 0.6, statuses: [status('soak', 2.6, 1)], description: 'Supportive spread that drenches groups.' }),
  makeAbility('water', 'frost', 'undertow-well', { name: 'Undertow Well', type: 'aoe', cooldown: 2.3, damage: 16, scaling: 1.02, manaCost: 9, staminaCost: 3, radius: 106, statuses: [status('slow', 3.2, 2)], description: 'Control zone that drags enemies inward.' }),
  makeAbility('water', 'frost', 'mist-gate', { name: 'Mist Gate', type: 'teleport', cooldown: 2, damage: 8, scaling: 0.5, manaCost: 5, staminaCost: 7, dashDistance: 180, statuses: [status('soak', 1.8, 1)], description: 'Short blink that leaves a wet burst.' }),
  makeAbility('water', 'abyss', 'koi-mirror', { name: 'Koi Mirror', type: 'summon', cooldown: 5.8, damage: 13, scaling: 1.08, manaCost: 16, staminaCost: 5, duration: 9, radius: 14, statuses: [status('soak', 2.5, 2)], description: 'Watery familiar that repeats pokes.' }),
  makeAbility('water', 'abyss', 'abyssal-hymn', { name: 'Abyssal Hymn', type: 'aura', cooldown: 6, damage: 10, scaling: 1, manaCost: 18, staminaCost: 6, duration: 7, radius: 118, statuses: [status('slow', 2.2, 1)], description: 'Support aura that stabilizes and chills.' }),
  makeAbility('water', 'abyss', 'glass-ocean', { name: 'Glass Ocean', type: 'buff', cooldown: 6.7, damage: 0, scaling: 0, manaCost: 20, staminaCost: 4, duration: 6, buffModifiers: { manaRegen: 4, cooldownReduction: 0.08, aura: 0.2 }, description: 'Cooldown and mana support window.' }),
  makeAbility('air', 'gale', 'wind-needle', { name: 'Wind Needle', type: 'projectile', cooldown: 0.18, damage: 13, scaling: 1.02, manaCost: 1, staminaCost: 1, speed: 760, size: 0.8, statuses: [status('gust', 1.8, 1)], description: 'Very fast poke for mobile builds.' }),
  makeAbility('air', 'gale', 'updraft', { name: 'Updraft', type: 'dash', cooldown: 1.2, damage: 0, scaling: 0, manaCost: 2, staminaCost: 8, dashDistance: 220, description: 'Long evasive dash for repositioning.' }),
  makeAbility('air', 'tempest', 'squall-fan', { name: 'Squall Fan', type: 'burst', cooldown: 0.74, damage: 8, scaling: 0.85, manaCost: 4, staminaCost: 2, projectileCount: 7, spread: 0.68, speed: 560, statuses: [status('gust', 2.2, 1)], description: 'Wide burst that shreds weak packs.' }),
  makeAbility('air', 'tempest', 'cyclone-ring', { name: 'Cyclone Ring', type: 'aoe', cooldown: 2.1, damage: 14, scaling: 0.95, manaCost: 8, staminaCost: 3, radius: 116, statuses: [status('slow', 2.8, 1)], description: 'Control ring with sustained crowd pressure.' }),
  makeAbility('air', 'echo', 'echo-step', { name: 'Echo Step', type: 'teleport', cooldown: 1.7, damage: 0, scaling: 0, manaCost: 4, staminaCost: 5, dashDistance: 200, description: 'Blink that leaves a decoy burst.' }),
  makeAbility('air', 'echo', 'sky-choir', { name: 'Sky Choir', type: 'buff', cooldown: 5.5, damage: 0, scaling: 0, manaCost: 14, staminaCost: 4, duration: 5.5, buffModifiers: { moveSpeed: 0.18, attackSpeed: 0.2, aura: 0.18 }, description: 'High-tempo support chant.' }),
  makeAbility('air', 'echo', 'hurricane-edge', { name: 'Hurricane Edge', type: 'chaos', cooldown: 6.4, damage: 24, scaling: 1.22, manaCost: 18, staminaCost: 6, chaosOptions: ['projectile', 'burst', 'dash'], statuses: [status('gust', 3, 2)], description: 'Chaotic mobility finisher.' }),
  makeAbility('earth', 'quake', 'shard-hurl', { name: 'Shard Hurl', type: 'projectile', cooldown: 0.34, damage: 18, scaling: 1.14, manaCost: 2, staminaCost: 2, speed: 540, size: 1.2, statuses: [status('fracture', 2.8, 2)], description: 'Heavy poke with good stagger pressure.' }),
  makeAbility('earth', 'quake', 'fault-line', { name: 'Fault Line', type: 'laser', cooldown: 1.4, damage: 24, scaling: 1.22, manaCost: 8, staminaCost: 4, range: 280, size: 1.2, statuses: [status('fracture', 2.4, 2)], description: 'Ground-splitting burst line.' }),
  makeAbility('earth', 'bastion', 'bastion-heart', { name: 'Bastion Heart', type: 'buff', cooldown: 5, damage: 0, scaling: 0, manaCost: 12, staminaCost: 5, duration: 6, buffModifiers: { maxHp: 18, damageReduction: 0.14, aura: 0.14 }, description: 'Defensive support stance.' }),
  makeAbility('earth', 'bastion', 'crag-circle', { name: 'Crag Circle', type: 'aoe', cooldown: 2.5, damage: 18, scaling: 1, manaCost: 9, staminaCost: 4, radius: 100, statuses: [status('root', 2.4, 2)], description: 'Rooting control field.' }),
  makeAbility('earth', 'wildroot', 'geomorph', { name: 'Geomorph', type: 'dash', cooldown: 2.2, damage: 12, scaling: 0.7, manaCost: 3, staminaCost: 8, dashDistance: 150, statuses: [status('fracture', 1.6, 1)], description: 'Burrowing dash that breaks lines.' }),
  makeAbility('earth', 'wildroot', 'thorn-effigy', { name: 'Thorn Effigy', type: 'summon', cooldown: 5.7, damage: 14, scaling: 1.1, manaCost: 15, staminaCost: 5, duration: 9, radius: 16, statuses: [status('root', 2.4, 1)], description: 'Summoned idol for zoning.' }),
  makeAbility('earth', 'wildroot', 'avalanche-mouth', { name: 'Avalanche Mouth', type: 'burst', cooldown: 1.15, damage: 12, scaling: 0.94, manaCost: 7, staminaCost: 4, projectileCount: 5, spread: 0.44, speed: 420, size: 1.1, statuses: [status('fracture', 2.1, 2)], description: 'Wide stone burst with control weight.' }),
  makeAbility('electricity', 'arc', 'arc-dart', { name: 'Arc Dart', type: 'projectile', cooldown: 0.21, damage: 15, scaling: 1.06, manaCost: 2, staminaCost: 1, speed: 700, statuses: [status('shock', 2.4, 3)], description: 'Quick chain starter.' }),
  makeAbility('electricity', 'arc', 'fulgur-lance', { name: 'Fulgur Lance', type: 'laser', cooldown: 0.92, damage: 20, scaling: 1.16, manaCost: 6, staminaCost: 2, range: 320, statuses: [status('shock', 1.8, 2)], description: 'Burst line with reliable reach.' }),
  makeAbility('electricity', 'storm', 'storm-cage', { name: 'Storm Cage', type: 'aoe', cooldown: 2.2, damage: 17, scaling: 1, manaCost: 9, staminaCost: 3, radius: 92, statuses: [status('shock', 3, 2), status('slow', 2, 1)], description: 'Control field for reaction builds.' }),
  makeAbility('electricity', 'storm', 'fork-burst', { name: 'Fork Burst', type: 'burst', cooldown: 0.82, damage: 9, scaling: 0.88, manaCost: 5, staminaCost: 2, projectileCount: 4, spread: 0.28, speed: 570, statuses: [status('shock', 1.8, 2)], description: 'Short burst with chain pressure.' }),
  makeAbility('electricity', 'surge', 'blink-current', { name: 'Blink Current', type: 'teleport', cooldown: 1.6, damage: 10, scaling: 0.55, manaCost: 4, staminaCost: 6, dashDistance: 180, statuses: [status('shock', 1.4, 1)], description: 'Blink through targets with burst exit.' }),
  makeAbility('electricity', 'surge', 'overload-drive', { name: 'Overload Drive', type: 'buff', cooldown: 5.6, damage: 0, scaling: 0, manaCost: 15, staminaCost: 4, duration: 5, selfDamage: 4, buffModifiers: { attackSpeed: 0.28, critChance: 0.08, aura: 0.2 }, description: 'Risky self-overclock window.' }),
  makeAbility('electricity', 'surge', 'storm-idol', { name: 'Storm Idol', type: 'summon', cooldown: 5.9, damage: 15, scaling: 1.14, manaCost: 17, staminaCost: 5, duration: 8, radius: 14, statuses: [status('shock', 2.2, 2)], description: 'Totem-style summon that arcs targets.' }),
  makeAbility('light', 'sun', 'prism-ray', { name: 'Prism Ray', type: 'laser', cooldown: 0.78, damage: 20, scaling: 1.1, manaCost: 5, staminaCost: 1, range: 330, statuses: [status('radiance', 2.6, 2)], description: 'Clean burst beam with crit support.' }),
  makeAbility('light', 'sun', 'halo-burst', { name: 'Halo Burst', type: 'burst', cooldown: 0.86, damage: 9, scaling: 0.86, manaCost: 5, staminaCost: 2, projectileCount: 6, spread: 0.55, speed: 520, statuses: [status('radiance', 2, 1)], description: 'Wide holy burst for wave clear.' }),
  makeAbility('light', 'halo', 'sanctuary', { name: 'Sanctuary', type: 'aura', cooldown: 6.2, damage: 9, scaling: 0.92, manaCost: 18, staminaCost: 5, duration: 7, radius: 120, statuses: [status('radiance', 2.2, 1)], description: 'Support aura that brightens the arena.' }),
  makeAbility('light', 'halo', 'dawn-ward', { name: 'Dawn Ward', type: 'buff', cooldown: 5.4, damage: 0, scaling: 0, manaCost: 14, staminaCost: 3, duration: 5.5, buffModifiers: { critChance: 0.1, critDamage: 0.18, aura: 0.16 }, description: 'Group-like support buff for crit builds.' }),
  makeAbility('light', 'mirror', 'flashstep', { name: 'Flashstep', type: 'teleport', cooldown: 1.5, damage: 8, scaling: 0.5, manaCost: 4, staminaCost: 5, dashDistance: 190, statuses: [status('radiance', 1.2, 1)], description: 'Fast blink with bright exit splash.' }),
  makeAbility('light', 'mirror', 'mirror-sigil', { name: 'Mirror Sigil', type: 'summon', cooldown: 5.8, damage: 13, scaling: 1.02, manaCost: 16, staminaCost: 4, duration: 8, radius: 13, statuses: [status('radiance', 2.4, 1)], description: 'Refraction summon for precise follow-up.' }),
  makeAbility('light', 'mirror', 'judgement-flare', { name: 'Judgement Flare', type: 'aoe', cooldown: 2.6, damage: 18, scaling: 1.06, manaCost: 11, staminaCost: 4, radius: 98, statuses: [status('radiance', 2.8, 2)], description: 'Controlled detonation that rewards setup.' }),
  makeAbility('darkness', 'fang', 'shade-bolt', { name: 'Shade Bolt', type: 'projectile', cooldown: 0.25, damage: 15, scaling: 1.08, manaCost: 2, staminaCost: 1, speed: 630, statuses: [status('gloom', 2.8, 2)], description: 'Reliable poke for predatory setups.' }),
  makeAbility('darkness', 'fang', 'eclipse-lance', { name: 'Eclipse Lance', type: 'laser', cooldown: 1.18, damage: 24, scaling: 1.24, manaCost: 8, staminaCost: 2, range: 320, statuses: [status('gloom', 2.1, 2)], description: 'Heavy single-line darkness burst.' }),
  makeAbility('darkness', 'veil', 'dusk-well', { name: 'Dusk Well', type: 'aoe', cooldown: 2.35, damage: 17, scaling: 1.02, manaCost: 9, staminaCost: 4, radius: 94, statuses: [status('gloom', 3, 2), status('slow', 2.4, 1)], description: 'Visibility-denial control field.' }),
  makeAbility('darkness', 'veil', 'night-glide', { name: 'Night Glide', type: 'dash', cooldown: 1.5, damage: 9, scaling: 0.52, manaCost: 3, staminaCost: 7, dashDistance: 185, statuses: [status('gloom', 1.8, 1)], description: 'Aggressive dash for melee darkness lines.' }),
  makeAbility('darkness', 'hunger', 'blood-price', { name: 'Blood Price', type: 'buff', cooldown: 5.8, damage: 0, scaling: 0, manaCost: 10, staminaCost: 4, duration: 5, selfDamage: 10, buffModifiers: { damage: 0.3, lifeSteal: 0.1, aura: 0.22 }, description: 'High-risk power spike with sustain.' }),
  makeAbility('darkness', 'hunger', 'umbral-maw', { name: 'Umbral Maw', type: 'summon', cooldown: 6.1, damage: 16, scaling: 1.16, manaCost: 18, staminaCost: 5, duration: 8, radius: 15, statuses: [status('gloom', 2.3, 2)], description: 'Hungry summon that helps finish targets.' }),
  makeAbility('darkness', 'hunger', 'ravening-fan', { name: 'Ravening Fan', type: 'burst', cooldown: 0.9, damage: 10, scaling: 0.9, manaCost: 6, staminaCost: 3, projectileCount: 5, spread: 0.48, speed: 500, statuses: [status('gloom', 2, 1)], description: 'Burst pattern for execution chains.' }),
  makeAbility('ghost', 'haunt', 'ecto-needle', { name: 'Ecto Needle', type: 'projectile', cooldown: 0.22, damage: 14, scaling: 1.04, manaCost: 2, staminaCost: 1, speed: 680, statuses: [status('haunt', 3, 2)], description: 'Piercing spirit poke with clean cadence.' }),
  makeAbility('ghost', 'haunt', 'haunt-circle', { name: 'Haunt Circle', type: 'aoe', cooldown: 2.2, damage: 15, scaling: 0.98, manaCost: 8, staminaCost: 3, radius: 102, statuses: [status('haunt', 3.4, 2)], description: 'Persistent haunting field.' }),
  makeAbility('ghost', 'phase', 'phase-slip', { name: 'Phase Slip', type: 'teleport', cooldown: 1.4, damage: 0, scaling: 0, manaCost: 3, staminaCost: 5, dashDistance: 210, description: 'Long blink that ignores pressure.' }),
  makeAbility('ghost', 'phase', 'polter-swarm', { name: 'Polter Swarm', type: 'burst', cooldown: 0.88, damage: 8, scaling: 0.84, manaCost: 5, staminaCost: 2, projectileCount: 6, spread: 0.62, speed: 510, statuses: [status('haunt', 2.5, 1)], description: 'Erratic spirit burst.' }),
  makeAbility('ghost', 'seance', 'soul-tether', { name: 'Soul Tether', type: 'aura', cooldown: 5.8, damage: 10, scaling: 0.96, manaCost: 17, staminaCost: 4, duration: 7, radius: 116, statuses: [status('haunt', 2.4, 1)], description: 'Aura that lets spirit builds snowball.' }),
  makeAbility('ghost', 'seance', 'revenant-hand', { name: 'Revenant Hand', type: 'summon', cooldown: 5.7, damage: 14, scaling: 1.08, manaCost: 16, staminaCost: 4, duration: 9, radius: 13, statuses: [status('haunt', 2.6, 2)], description: 'Ghost hand summon for sustained picks.' }),
  makeAbility('ghost', 'seance', 'roulette', { name: 'Seance Roulette', type: 'chaos', cooldown: 6.8, damage: 22, scaling: 1.2, manaCost: 19, staminaCost: 5, chaosOptions: ['projectile', 'teleport', 'summon'], statuses: [status('haunt', 3.5, 2)], description: 'Random spectral trick with high utility swing.' }),
  makeAbility('puremana', 'rune', 'mana-shard', { name: 'Mana Shard', type: 'projectile', cooldown: 0.2, damage: 13, scaling: 1.04, manaCost: 1, staminaCost: 0, speed: 720, statuses: [status('arcane', 2.8, 2)], description: 'Cheap arcane poke for any build.' }),
  makeAbility('puremana', 'rune', 'rune-field', { name: 'Rune Field', type: 'aoe', cooldown: 2, damage: 16, scaling: 0.98, manaCost: 8, staminaCost: 2, radius: 98, statuses: [status('arcane', 3, 2)], description: 'Flexible control zone.' }),
  makeAbility('puremana', 'overflow', 'cascade-beam', { name: 'Cascade Beam', type: 'laser', cooldown: 0.94, damage: 19, scaling: 1.12, manaCost: 6, staminaCost: 1, range: 340, statuses: [status('arcane', 2.2, 1)], description: 'Stable beam for hybrid builds.' }),
  makeAbility('puremana', 'overflow', 'overflow-engine', { name: 'Overflow Engine', type: 'buff', cooldown: 5.3, damage: 0, scaling: 0, manaCost: 12, staminaCost: 3, duration: 5, selfDamage: 0, buffModifiers: { damage: 0.16, manaRegen: 5, cooldownReduction: 0.12, aura: 0.18 }, description: 'Arcane output booster.' }),
  makeAbility('puremana', 'overflow', 'blink-rune', { name: 'Blink Rune', type: 'teleport', cooldown: 1.45, damage: 8, scaling: 0.44, manaCost: 3, staminaCost: 4, dashDistance: 175, statuses: [status('arcane', 1.5, 1)], description: 'Efficient blink with rune detonation.' }),
  makeAbility('puremana', 'weave', 'familiar-node', { name: 'Familiar Node', type: 'summon', cooldown: 5.6, damage: 13, scaling: 1.02, manaCost: 15, staminaCost: 3, duration: 9, radius: 13, statuses: [status('arcane', 2.1, 1)], description: 'Arcane node for sustained support.' }),
  makeAbility('puremana', 'weave', 'arc-nova', { name: 'Arc Nova', type: 'burst', cooldown: 0.92, damage: 8, scaling: 0.84, manaCost: 5, staminaCost: 1, projectileCount: 8, spread: 0.9, speed: 460, statuses: [status('arcane', 2.4, 1)], description: 'All-purpose burst for freeform builds.' })
];

const elementalSetBonuses = {
  fire: { name: 'Infernal Avatar', auraColor: '#ff7a2f', modifiers: { damage: 0.18, critChance: 0.06, aura: 0.35 } },
  water: { name: 'Deep Current', auraColor: '#43b4ff', modifiers: { manaRegen: 4, cooldownReduction: 0.08, aura: 0.32 } },
  air: { name: 'Sky Breaker', auraColor: '#9bf3ff', modifiers: { moveSpeed: 0.22, attackSpeed: 0.14, aura: 0.32 } },
  earth: { name: 'Living Bastion', auraColor: '#9c7b4f', modifiers: { maxHp: 20, damageReduction: 0.16, aura: 0.28 } },
  electricity: { name: 'Storm Core', auraColor: '#ffd84a', modifiers: { attackSpeed: 0.18, critChance: 0.1, aura: 0.34 } },
  light: { name: 'Solar Choir', auraColor: '#fff5ae', modifiers: { critDamage: 0.22, cooldownReduction: 0.06, aura: 0.3 } },
  darkness: { name: 'Void Predator', auraColor: '#7f69d9', modifiers: { damage: 0.16, lifeSteal: 0.1, aura: 0.34 } },
  ghost: { name: 'Phantom Court', auraColor: '#b4ffe1', modifiers: { moveSpeed: 0.14, summonDamage: 0.18, aura: 0.34 } },
  puremana: { name: 'Arcane Crown', auraColor: '#ff78ff', modifiers: { manaRegen: 6, damage: 0.12, cooldownReduction: 0.1, aura: 0.34 } }
};

const passiveSynergies = [
  { requires: ['fire', 'air'], label: 'Wildfire Draft', modifiers: { damage: 0.08, attackSpeed: 0.08 } },
  { requires: ['water', 'electricity'], label: 'Conductive Flood', modifiers: { critChance: 0.08, damage: 0.06 } },
  { requires: ['earth', 'water'], label: 'Bloom Bastion', modifiers: { maxHp: 10, manaRegen: 2 } },
  { requires: ['light', 'darkness'], label: 'Penumbra', modifiers: { critDamage: 0.18 } },
  { requires: ['ghost', 'darkness'], label: 'Grave Veil', modifiers: { summonDamage: 0.12, moveSpeed: 0.08 } },
  { requires: ['puremana', 'light'], label: 'Prism Script', modifiers: { cooldownReduction: 0.06 } },
  { requires: ['puremana', 'ghost'], label: 'Eidolon Circuit', modifiers: { manaRegen: 3, aura: 0.1 } }
];

const elementReactions = [
  { pair: ['air', 'fire'], label: 'Emberstorm', color: '#ffbf66', bonusDamage: 8, radius: 60, extraStatus: status('burn', 2.4, 2) },
  { pair: ['electricity', 'water'], label: 'Current Break', color: '#9ae7ff', bonusDamage: 10, radius: 68, extraStatus: status('shock', 2, 2) },
  { pair: ['air', 'earth'], label: 'Dust Spiral', color: '#d1bf93', bonusDamage: 7, radius: 58, extraStatus: status('slow', 2.4, 1) },
  { pair: ['darkness', 'light'], label: 'Penumbra Tear', color: '#dccbff', bonusDamage: 12, radius: 72, extraStatus: status('gloom', 2.2, 2) },
  { pair: ['darkness', 'ghost'], label: 'Grave Echo', color: '#b9ffe8', bonusDamage: 9, radius: 62, extraStatus: status('haunt', 3, 2) },
  { pair: ['light', 'puremana'], label: 'Prism Cascade', color: '#ffd7ff', bonusDamage: 9, radius: 64, extraStatus: status('arcane', 2.6, 2) }
];

const orbRarities = {
  common: { id: 'common', weight: 1, dropChance: 0.28, affinityGain: 1, instability: 0 },
  rare: { id: 'rare', weight: 0.34, dropChance: 0.1, affinityGain: 3, instability: 0.08 },
  legendary: { id: 'legendary', weight: 0.08, dropChance: 0.025, affinityGain: 8, instability: 0.16 }
};

const orbDefinitions = Object.fromEntries(Object.values(elements).map((element) => [
  element.id,
  {
    id: `${element.id}-orb`,
    elementId: element.id,
    name: `${element.name} Orb`,
    color: element.color,
    accent: element.accent,
    instabilityBase: 0.03
  }
]));

const materials = {
  wood: { id: 'wood', name: 'Wood', color: '#8b5e36' },
  stone: { id: 'stone', name: 'Stone', color: '#8d96a4' },
  metal: { id: 'metal', name: 'Metal', color: '#b5c2d3' },
  crystal: { id: 'crystal', name: 'Crystal', color: '#8de7ff' }
};

const craftingRecipes = [
  {
    id: 'stone-hammer',
    name: 'Stone Hammer',
    itemType: 'tool',
    ingredients: [{ kind: 'material', id: 'wood', count: 2 }, { kind: 'material', id: 'stone', count: 3 }]
  },
  {
    id: 'iron-spear',
    name: 'Iron Spear',
    itemType: 'melee',
    ingredients: [{ kind: 'material', id: 'metal', count: 2 }, { kind: 'material', id: 'wood', count: 1 }]
  },
  {
    id: 'arc-rig',
    name: 'Arc Rig',
    itemType: 'ranged',
    ingredients: [{ kind: 'material', id: 'metal', count: 2 }, { kind: 'material', id: 'crystal', count: 1 }]
  }
];

const alchemyEffects = {
  fire: { status: status('burn', 2.2, 1), bonusDamage: 2 },
  water: { status: status('slow', 1.8, 1), bonusDamage: 1 },
  air: { moveSpeed: 0.03, bonusDamage: 1 },
  earth: { damageReduction: 0.02, bonusDamage: 2 },
  electricity: { chainCount: 1, bonusDamage: 1 },
  light: { critChance: 0.03, bonusDamage: 1 },
  darkness: { lifeSteal: 0.02, bonusDamage: 1 },
  ghost: { pierce: 1, bonusDamage: 0 },
  puremana: { cooldownReduction: 0.03, bonusDamage: 1 }
};

const alchemyCombos = [
  { pair: ['fire', 'air'], status: status('burn', 2.8, 2), bonusDamage: 4 },
  { pair: ['water', 'electricity'], status: status('shock', 2.2, 2), bonusDamage: 4 },
  { pair: ['light', 'darkness'], status: status('gloom', 2.2, 2), bonusDamage: 5 }
];

const machineStructures = [
  { id: 'west-turret', name: 'West Turret', machineType: 'turret', xRatio: 0.18, yRatio: 0.28 },
  { id: 'north-generator', name: 'North Generator', machineType: 'generator', xRatio: 0.55, yRatio: 0.16 }
];

const enemyTypes = {
  emberling: { id: 'emberling', name: 'Emberling', elementId: 'fire', role: 'rusher', hp: 34, speed: 104, radius: 12, xp: 18, damage: 8, color: '#ff8651' },
  tidewisp: { id: 'tidewisp', name: 'Tidewisp', elementId: 'water', role: 'kite', hp: 30, speed: 88, radius: 12, xp: 20, damage: 7, color: '#59c3ff', projectileCooldown: 2.4 },
  galeclaw: { id: 'galeclaw', name: 'Galeclaw', elementId: 'air', role: 'dart', hp: 24, speed: 150, radius: 10, xp: 22, damage: 6, color: '#b5fbff' },
  shardmaw: { id: 'shardmaw', name: 'Shardmaw', elementId: 'earth', role: 'tank', hp: 76, speed: 58, radius: 18, xp: 34, damage: 13, color: '#b18d64' },
  voltshard: { id: 'voltshard', name: 'Voltshard', elementId: 'electricity', role: 'caster', hp: 26, speed: 86, radius: 12, xp: 24, damage: 8, color: '#ffe16e', projectileCooldown: 2 },
  prismling: { id: 'prismling', name: 'Prismling', elementId: 'light', role: 'support', hp: 32, speed: 82, radius: 13, xp: 24, damage: 7, color: '#fff5bb', projectileCooldown: 2.8 },
  shadefang: { id: 'shadefang', name: 'Shadefang', elementId: 'darkness', role: 'ambush', hp: 29, speed: 132, radius: 11, xp: 26, damage: 9, color: '#9378ff' },
  revenant: { id: 'revenant', name: 'Revenant', elementId: 'ghost', role: 'phase', hp: 30, speed: 100, radius: 12, xp: 25, damage: 8, color: '#c6ffea', projectileCooldown: 2.5 },
  manadrone: { id: 'manadrone', name: 'Manadrone', elementId: 'puremana', role: 'caster', hp: 28, speed: 96, radius: 12, xp: 25, damage: 8, color: '#ff97ff', projectileCooldown: 2.1 },
  elementalist: { id: 'elementalist', name: 'Elementalist', role: 'elementalist', hp: 48, speed: 82, radius: 14, xp: 38, damage: 10, color: '#ffffff', projectileCooldown: 1.7, dynamicElement: true },
  boss: { id: 'boss', name: 'Singularity Warden', elementId: 'puremana', role: 'boss', hp: 860, speed: 68, radius: 34, xp: 260, damage: 18, color: '#ff6a9a', projectileCooldown: 1.6 }
};

export const GAME_DATA = {
  map: {
    gridSize: 56,
    backgroundColor: '#060912',
    accentColor: '#122034'
  },
  hotbarSlotCount: 12,
  elements,
  elementBranches,
  abilities,
  elementalSetBonuses,
  passiveSynergies,
  elementReactions,
  orbRarities,
  orbDefinitions,
  materials,
  craftingRecipes,
  alchemyEffects,
  alchemyCombos,
  machineStructures,
  enemyTypes,
  spawners: [
    { id: 'west-gate', mode: 'edge', edge: 'left', offset: 0.22, interval: 2.5, hp: 130 },
    { id: 'east-gate', mode: 'edge', edge: 'right', offset: 0.58, interval: 2.7, hp: 130 },
    { id: 'north-gate', mode: 'edge', edge: 'top', offset: 0.48, interval: 3.1, hp: 150 }
  ],
  runUpgrades: [
    { id: 'ferocity', name: 'Ferocity', modifiers: { damage: 0.12 } },
    { id: 'tempo', name: 'Tempo', modifiers: { attackSpeed: 0.14 } },
    { id: 'overcharge', name: 'Overcharge', modifiers: { critChance: 0.08 } },
    { id: 'circuit', name: 'Circuit', modifiers: { manaRegen: 2 } },
    { id: 'strider', name: 'Strider', modifiers: { moveSpeed: 0.12 } }
  ],
  metaUpgrades: [
    { id: 'legacy-power', name: 'Legacy Power', cost: 3, modifiers: { damage: 0.08 } },
    { id: 'legacy-vigor', name: 'Legacy Vigor', cost: 3, modifiers: { maxHp: 14 } },
    { id: 'legacy-focus', name: 'Legacy Focus', cost: 3, modifiers: { critChance: 0.04 } },
    { id: 'legacy-drive', name: 'Legacy Drive', cost: 3, modifiers: { manaRegen: 2 } }
  ]
};