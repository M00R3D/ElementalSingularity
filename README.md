# Elemental Singularity

Elemental Singularity is a procedural roguelike arena prototype built with vanilla JavaScript and HTML5 Canvas. The current build now includes a sandbox-alchemy layer on top of the existing combat loop: physical element orbs, affinity growth, inventory, fixed-recipe crafting, alchemy infusions, and orb-powered machine structures.

## Current Systems

- `GameStateManager`: run state, resources, leveling, hotbar selection, cooldown tracking, notifications, death summary
- `EntityManager`: pooled entities, player/enemy updates, spawners, particles, summons, transient combat effects, orb entities, machine structures, procedural drawing
- `CombatSystem`: ability execution, crits, statuses, chain effects, enemy attacks, boss phases, usage-type compatibility, machine-turret attacks, infusion packet modifiers
- `ElementSystem`: element ownership, combinations, mutations, passive synergies, shop unlocks, meta progression
- `UIManager`: HUD, hotbar, shop/equip/inventory/crafting/alchemy/machines menus, procedural element and ability icons, death overlay, run summary

## Gameplay Features

- Nine playable elements with data-driven ability sets and usage types
- Physical orb drops (`common`, `rare`, `legendary`) from enemies, bosses, and spawners
- Orb pickup and storage in inventory, with three usage paths: consume, craft ingredient, machine socket core
- Affinity progression per element that boosts power and amplifies player aura/visual distortion
- Ability gating by affinity and filtering by element/usage type in the archive UI
- Base elements, combos, and mutations resolved through the element system
- Projectile, burst, AoE, dash, teleport, aura, summon, and laser abilities
- Basic, fast, tank, ranged, and boss enemies with resistances and weaknesses
- Destructible spawners that control encounter pressure
- Fixed-recipe crafting for base items (tool, melee, ranged)
- Separate alchemy infusion system for player/items with multi-element combos
- Machine core system (turret/generator) driven by socketed orbs
- XP, leveling, HP, MP, stamina, element points, and run upgrades
- Meta progression for persistent unlocks between runs
- Death fade, run summary, and restart flow
- Canvas-only procedural visuals with no sprite assets

## Quick Sandbox Loop

1. Fight waves and destroy spawners to collect element orbs and materials.
2. Open menu (`Tab`) and consume selected orbs to raise per-element affinity.
3. Equip ability loadouts by element and `usageType` (unarmed/melee/ranged/magic/tool).
4. Craft base gear from fixed recipes, then infuse player or items via alchemy.
5. Socket orb cores into machines for automated pressure (turrets) or sustain (generators).

## Current Scope

- The sandbox-alchemy layer is integrated into existing managers and preserves the current combat loop.
- Crafting is fixed-recipe and intentionally simple (base item generation only).
- Alchemy supports single and paired element infusions through data-defined effects and combos.
- Machine interactions are currently lightweight and focused on core socket behavior.

## Controls

- `WASD` or arrow keys: move
- `LMB`: primary ability
- `RMB`: secondary ability
- `Q`: area ability
- `E`: mobility ability
- `Space`: special ability
- `Mouse wheel` or `1-9`: cycle/select hotbar slot
- `Tab`: open or close menu
- `Enter`: pause
- `R`: restart after death
- In menu:
	- `Equip`: assign abilities, choose usage mode, filter by element/type
	- `Inventory`: consume orbs for affinity
	- `Crafting`: craft base items from materials
	- `Alchemy`: infuse player/items with element orbs
	- `Machines`: review machine systems (socketing is available from machine panel)

## Data-Driven Structure

- `src/data/gameData.js`: elements, abilities, orb rarities/definitions, materials, crafting recipes, alchemy effects/combos, enemies, spawners, and machine structures
- `src/core/GameStateManager.js`: run state and progression rules
- `src/core/EntityManager.js`: active world objects, pooled entities, orb pickups, and machine behavior
- `src/core/CombatSystem.js`: ability logic, damage resolution, infusions, and machine turret attacks
- `src/core/ElementSystem.js`: unlocks, synergies, and persistent element state
- `src/core/UIManager.js`: DOM and Canvas UI rendering

## Run

Open `index.html` directly in a browser, or serve the folder locally.

Example local server:

```powershell
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## Changelog (2026-03-22)

- Fix: Guarded UI element lookups in `src/core/UIManager.js` to skip unknown element IDs (prevents crashes when stale or malformed IDs are present in storage).
- Fix: Sanitized persisted element IDs in `src/core/ElementSystem.js` (loadMeta) so only valid element IDs are used from localStorage.
- Feature: Added sandbox-alchemy foundation (physical orbs, affinity system, inventory, crafting, alchemy infusion, machine cores).
- Feature: Reworked ability metadata to include `usageType` and added compatibility-based combat resolution.
- Note: After updating, reload the page to pick up the fixes and new systems; if you still see UI/runtime errors, share the stack trace.
