# Elemental Singularity

Procedural roguelike arena prototype built with vanilla JavaScript and HTML5 Canvas.

## Current Systems

- `GameStateManager`: run state, hotbar, pause/menu, progression, notifications
- `EntityManager`: pooled entities, enemy AI, spawners, procedural rendering
- `CombatSystem`: attacks, crits, statuses, chain reactions, boss attacks
- `ElementSystem`: data-driven element categories, combos, mutations, passives, unlocks
- `UIManager`: HUD, shop, hotbar, libraries, presets, menu overlay

## Features

- Base, combo, and mutation elements
- Projectile, AoE, aura, and summon attacks
- Basic, fast, tank, ranged, and boss enemies
- Destructible spawners
- Object pooling for enemies, projectiles, particles, summons, damage texts
- Meta progression and run upgrades
- Canvas-only procedural rendering

## Run

Open `index.html` in a browser, or serve the folder locally.
