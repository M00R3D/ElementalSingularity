export const GAME_DATA = {
  map: {
    gridSize: 56,
    backgroundColor: '#060912',
    accentColor: '#122034'
  },
  elements: {
    fire: { id: 'fire', name: 'Fire', color: '#ff7a2f', category: 'natural', status: 'burn' },
    air: { id: 'air', name: 'Air', color: '#8ee7ff', category: 'natural', status: 'gust' },
    electricity: { id: 'electricity', name: 'Electricity', color: '#ffd84a', category: 'technological', status: 'shock' },
    spore: { id: 'spore', name: 'Spore', color: '#9cff7a', category: 'biological', status: 'infection', unlockCost: 2 },
    void: { id: 'void', name: 'Void', color: '#9b7bff', category: 'cosmic', status: 'fracture', unlockCost: 3 },
    steel: { id: 'steel', name: 'Steel', color: '#9fb4c9', category: 'technological', status: 'shred', unlockCost: 2 },
    thought: { id: 'thought', name: 'Thought', color: '#ff8bd0', category: 'conceptual', status: 'daze', unlockCost: 3 }
  },
  combinations: [
    {
      id: 'explosion',
      inputs: ['air', 'fire'],
      result: {
        name: 'Explosion',
        attackType: 'aoe',
        color: '#ffb347',
        baseDamage: 30,
        radius: 86,
        modifiers: { size: 1.35, critChance: 0.04 },
        statuses: [{ id: 'burn', duration: 2.4, power: 4 }]
      }
    },
    {
      id: 'storm',
      inputs: ['air', 'electricity'],
      result: {
        name: 'Storm',
        attackType: 'projectile',
        color: '#7df2ff',
        baseDamage: 20,
        chainCount: 2,
        modifiers: { bounce: 1, attackSpeed: 0.16 },
        statuses: [{ id: 'shock', duration: 2.2, power: 3 }]
      }
    },
    {
      id: 'plasma',
      inputs: ['electricity', 'fire'],
      result: {
        name: 'Plasma Lance',
        attackType: 'projectile',
        color: '#ff5370',
        baseDamage: 26,
        modifiers: { pierce: 2, critChance: 0.08, size: 1.1 },
        statuses: [{ id: 'burn', duration: 1.6, power: 3 }, { id: 'shock', duration: 1.4, power: 2 }]
      }
    },
    {
      id: 'blightflame',
      inputs: ['fire', 'spore'],
      result: {
        name: 'Blightflame',
        attackType: 'projectile',
        color: '#c2ff5c',
        baseDamage: 24,
        modifiers: { size: 1.15 },
        statuses: [{ id: 'burn', duration: 2.8, power: 3 }, { id: 'infection', duration: 4, power: 2 }]
      }
    },
    {
      id: 'gravityWell',
      inputs: ['air', 'void'],
      result: {
        name: 'Gravity Well',
        attackType: 'aura',
        color: '#9c8cff',
        baseDamage: 10,
        radius: 92,
        modifiers: { size: 1.5 },
        statuses: [{ id: 'fracture', duration: 3.2, power: 2 }]
      }
    }
  ],
  mutations: [
    {
      id: 'singularity',
      inputs: ['air', 'electricity', 'fire'],
      result: {
        name: 'Tempest Singularity',
        attackType: 'summon',
        color: '#fff08d',
        baseDamage: 22,
        radius: 110,
        modifiers: { pierce: 2, bounce: 1, attackSpeed: 0.22, size: 1.6 },
        statuses: [{ id: 'burn', duration: 2.5, power: 3 }, { id: 'shock', duration: 2.5, power: 3 }]
      }
    },
    {
      id: 'necroforge',
      inputs: ['fire', 'spore', 'steel'],
      result: {
        name: 'Necroforge Swarm',
        attackType: 'summon',
        color: '#ffc66d',
        baseDamage: 24,
        modifiers: { attackSpeed: 0.18, size: 1.4 },
        statuses: [{ id: 'infection', duration: 4.2, power: 3 }, { id: 'shred', duration: 3.4, power: 2 }]
      }
    }
  ],
  passiveSynergies: [
    { requires: ['fire', 'electricity'], modifiers: { critChance: 0.05 } },
    { requires: ['air', 'electricity'], modifiers: { attackSpeed: 0.12 } },
    { requires: ['spore', 'void'], modifiers: { damage: 0.12 } },
    { requires: ['steel', 'fire'], modifiers: { pierce: 1 } },
    { requires: ['thought', 'void'], modifiers: { critDamage: 0.35 } }
  ],
  abilities: [
    { id: 'ember-lance', name: 'Ember Lance', attackType: 'projectile', color: '#ff8146', baseDamage: 16, cooldown: 0.34, manaCost: 3, staminaCost: 2, tags: ['fire'], modifiers: { pierce: 0 } },
    { id: 'pulse-nova', name: 'Pulse Nova', attackType: 'aoe', color: '#74d0ff', baseDamage: 28, cooldown: 1.1, manaCost: 10, staminaCost: 5, tags: ['air'], modifiers: { size: 1.3 } },
    { id: 'ion-aura', name: 'Ion Aura', attackType: 'aura', color: '#fff26f', baseDamage: 8, cooldown: 2.2, manaCost: 14, staminaCost: 0, tags: ['electricity'], modifiers: { size: 1.2 } },
    { id: 'drone-seed', name: 'Drone Seed', attackType: 'summon', color: '#c8ff77', baseDamage: 14, cooldown: 2.8, manaCost: 12, staminaCost: 4, tags: ['spore'], modifiers: { attackSpeed: 0.12 } },
    { id: 'rail-burst', name: 'Rail Burst', attackType: 'projectile', color: '#bac8d6', baseDamage: 22, cooldown: 0.8, manaCost: 5, staminaCost: 6, tags: ['steel'], modifiers: { pierce: 2 } }
  ],
  enemyTypes: {
    basic: {
      id: 'basic', hp: 36, speed: 80, radius: 13, xp: 18, damage: 8,
      resistances: {}, weaknesses: { fire: 0.2 }, color: '#91a9be'
    },
    fast: {
      id: 'fast', hp: 24, speed: 150, radius: 10, xp: 22, damage: 6,
      resistances: { air: 0.15 }, weaknesses: { steel: 0.25 }, color: '#69d2b0'
    },
    tank: {
      id: 'tank', hp: 92, speed: 48, radius: 18, xp: 35, damage: 14,
      resistances: { fire: 0.25, electricity: 0.1 }, weaknesses: { air: 0.2 }, color: '#c7a06a'
    },
    ranged: {
      id: 'ranged', hp: 28, speed: 74, radius: 12, xp: 26, damage: 8,
      resistances: { electricity: 0.2 }, weaknesses: { void: 0.25 }, color: '#d697ff', projectileCooldown: 2.3
    },
    boss: {
      id: 'boss', hp: 620, speed: 62, radius: 34, xp: 220, damage: 18,
      resistances: { fire: 0.2, air: 0.2, electricity: 0.2 }, weaknesses: { void: 0.35, thought: 0.25 }, color: '#ff5e7f', projectileCooldown: 1.8
    }
  },
  spawners: [
    { id: 'west-gate', mode: 'edge', edge: 'left', offset: 0.24, interval: 2.6, hp: 120 },
    { id: 'east-gate', mode: 'edge', edge: 'right', offset: 0.56, interval: 2.8, hp: 120 },
    { id: 'north-gate', mode: 'edge', edge: 'top', offset: 0.48, interval: 3.2, hp: 140 }
  ],
  runUpgrades: [
    { id: 'ferocity', name: 'Ferocity', modifiers: { damage: 0.14 } },
    { id: 'tempo', name: 'Tempo', modifiers: { attackSpeed: 0.16 } },
    { id: 'overcharge', name: 'Overcharge', modifiers: { critChance: 0.08 } },
    { id: 'reactor', name: 'Reactor', modifiers: { manaRegen: 2 } },
    { id: 'afterimage', name: 'Afterimage', modifiers: { bounce: 1 } }
  ],
  metaUpgrades: [
    { id: 'legacy-power', name: 'Legacy Power', cost: 3, modifiers: { damage: 0.08 } },
    { id: 'legacy-vigor', name: 'Legacy Vigor', cost: 3, modifiers: { maxHp: 14 } },
    { id: 'legacy-focus', name: 'Legacy Focus', cost: 3, modifiers: { critChance: 0.04 } }
  ],
  chainReactions: [
    { incoming: 'shock', existing: 'burn', burstColor: '#fff08d', radius: 54, bonusDamage: 12, label: 'Overload' },
    { incoming: 'burn', existing: 'infection', burstColor: '#b4ff70', radius: 64, bonusDamage: 10, label: 'Toxic Bloom' },
    { incoming: 'fracture', existing: 'shock', burstColor: '#c6a8ff', radius: 70, bonusDamage: 14, label: 'Void Arc' }
  ]
};
