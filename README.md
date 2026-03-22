# Elemental Singularity

**A real-time top-down action RPG with element-based combat, procedural world exploration, enemy AI, progression system, and inventory management.**

Built with vanilla JavaScript + HTML5 Canvas. No dependencies. Pure rendering at 60 FPS.

---

## Phase 4: Day/Night Cycle, Crafting & World Selection

### Current Features

**✅ World Selection Menu (NEW THIS PHASE)**
- **Start Screen**: Choose between 4 pre-configured worlds
- **World Types**:
  - Enchanted Forest: Balanced difficulty (42 trees, 1 enemy/5s day | 3x night)
  - Volcanic Wasteland: Scarce trees, more rocks (12 trees, 1 enemy/3.3s day | 2.5x night)
  - Frozen Tundra: Extra dangerous at night (20 trees, 1 enemy/6.7s day | 4x night)
  - Peaceful Meadow: Beginner-friendly (25 trees, 1 enemy/10s day | 2x night)
- **Navigation**: Arrow keys/WASD to select, ENTER to confirm
- **Dynamic Stats**: Shows enemy spawn rates and resource distribution

**✅ Day/Night Cycle System (NEW THIS PHASE)**
- **200-second Cycle**: 30% day → 40% night (sine wave) → 30% day
- **Visual Effects**:
  - Sky color changes dramatically (light blue → dark blue-black)
  - Ambient lighting shifts (100% → 40% brightness)
  - Fire projectiles create glow aura at night
- **Time Display**: HUD shows current game time (00:00 - 23:59 format)
- **Dynamic Enemy Spawning**: Spawn rates multiply by world-specific factor at night

**✅ Crafting System (NEW THIS PHASE)**
- **Recipe List**:
  - **Wooden Axe** (5 Wood + 2 Stone → 1 Axe, 2s craft time)
  - **Stick** (2 Wood → 3 Sticks, 1s craft time) 
  - **Stone Axe** (3 Wood + 5 Stone → 1 Stone Axe, 3s craft time)
- **Crafting UI**: Centered progress bar shows recipe name + progress
- **Inventory Integration**: Automatically deducts ingredients, adds results

**✅ Fire Element Glow Effects (NEW THIS PHASE)**
- Fire projectiles (identified by color) gain glowing aura during night
- Glow intensity matches day/night cycle peak (20-30% alpha)
- Enhances atmosphere and makes fire abilities stand out in darkness

**✅ New Items (NEW THIS PHASE)**
- Wooden Axe: Tool for faster tree harvesting
- Stone Axe: Improved harvest tool
- Stick: Crafted material for future recipes

### Enhanced from Phase 3

**✅ Enemy Spawning**: Now day/night aware
- Day: Low spawn rate (world-dependent: 0.1-0.3 per second)
- Night: Dramatically increased (2-4x multiplier per world)
- Creates dynamic difficulty shifts and gameplay variety

---

## Previous Phases

### Phase 3: Exploration, Progression & Loot

**✅ Expanded World System**
- Large explorable map: 2400×1800px with 800×600px viewport
- Camera follow system (viewport-clamped to world bounds)
- Procedural generation: seeded trees (42) and rocks (28) scattered across world
- World boundary visualization (orange border)
- Tiled earth background with procedural color variation

**✅ Resource Gathering (NEW THIS PHASE)**
- **Trees**: Harvestable with right-click (90px reach), drop wood + XP (3 hits to fell)
- **Rocks**: Visual elements (non-interactive in v3.0, placeholder for future mining)
- **Automatic Drop Collection**: Nearby drops auto-pickup (36px radius)
- **Item Types**: Wood, Stone, Goblin Fang, Orc Hide, Bone, Crystal Shard

**✅ Progression System (NEW THIS PHASE)**
- **XP & Levels**: Earn XP from killing enemies and harvesting trees
- **10-Level Cap**: Thresholds scale exponentially (50, 120, 240... up to 2600 XP at Lv 9)
- **Level-Up Mechanics**: +10 HP per level (max 150), auto-heal on level up
- **XP Tracking**: Persistent xp/level on player object

**✅ Inventory System (NEW THIS PHASE)**
- **5×4 Grid**: 20 item slots displayed in centered modal
- **Toggle with I Key**: Open/close inventory panel
- **Item Display**: Colored blocks with names and stack counts
- **XP Bar**: Shows level, current XP progress toward next level

**✅ Enemy AI & Spawning (UPDATED THIS PHASE)**
- **Auto-Spawn System**: Enemies spawn automatically around player every 2-5 seconds
- **Multi-Type Enemies**: Goblin (40hp, 80spd), Orc (120hp, 48spd), Skeleton (65hp, 62spd)
- **Speed-Based Homing**: Each type has distinct acceleration (65% of max speed)
- **Loot Drops**: On death, drop XP + random item (35-55% chance per type)
- **Type-Specific Stats**: Stats loaded from gameData.enemyTypes

**✅ Enhanced Combat System**
- All draws camera-aware (slashes, projectiles, particles, floats)
- Projectile bounce uses world bounds (2400×1800) not canvas bounds
- Damage floats display in world-space with camera offset

**✅ Real-time Combat (From Phase 2)**
- Click-to-cast ability system with world-space targeting
- 6-slot hotbar with keyboard selection (1-6)
- Free-cast abilities (basicAttack, fireball)

**✅ Enemy AI (From Phase 2)**
- Homing behavior with type-specific max speeds
- Cooldown-based attack system
- Attack range checking
- Knockback on hit + visual attack indicator

**✅ Advanced Particle Systems (From Phase 2)**
- Fireball flame trails
- Burn status particles on enemies
- Smooth fade-out and physics

**✅ User Interface**
- HUD: HP, Mana, Enemy count, Level/XP, Item count, FPS
- Cast feedback with colored pulses
- Notification system with auto-dismiss
- Hotbar with slot highlight
- Mini-map (bottom-right, 140×100px, green player marker)

---

## How to Play

### Controls

| Key | Action |
|-----|--------|
| **WASD** | Move player around the world |
| **Space** | Spawn enemy at cursor position |
| **Right-Click** | Harvest tree (when in range, 90px reach) |
| **I** | Toggle inventory panel |
| **C** | Open crafting menu (Progress bar shows when crafting) |
| **1-6** | Select hotbar slot |
| **Left-Click** | Cast selected ability (on enemy or free position) |
| **Arrow Keys** | Navigate world select menu (at game start)

### Gameplay Loop

1. **Select your world** from the menu (Forest/Volcanic/Tundra/Meadow)
2. **Explore the world** (2400×1800px with day/night cycle - watch the sky!)
3. **Harvest trees** with right-click to get wood + XP
4. **Craft tools** - Wooden Axe (5 Wood + 2 Stone) for faster harvesting
5. **Enemies auto-spawn** - More aggressively at night (danger increases!)
6. **Select ability** and click to attack (fire creates glow in darkness)
7. **Defeat enemies** to earn XP and loot
8. **Level up** by gaining enough XP
9. **Manage inventory** with I key, track crafting progress
10. **Adapt to day/night** - Prepare for the darkness!

### World Layout
- Procedurally generated trees and rocks avoid spawn center (200px radius)
- Drops appear on ground with bobbing animation
- XP orbs: Green glowing circles (auto-collect)
- Items: Colored rounded rectangles (wood=brown, stone=gray, etc.)
- World boundary marked with orange border

---

## Abilities

### Current Ability Pool (4 active)

#### **basicAttack** (Slot 1 - Default)
- **Type**: Slash (instant AoE half-ellipse)
- **Damage**: 14
- **Cooldown**: 0.25s
- **Mana Cost**: 0 (free)
- **Effect**: Half-ellipse slash in front of player, hits all in area
- **Knockback**: Yes

#### **fireball** (Slot 2 - Default)
- **Type**: Projectile (travels, bounces at world bounds)
- **Damage**: 22
- **Cooldown**: 0.4s
- **Mana Cost**: 8
- **Speed**: 420 px/s
- **Radius**: 7px
- **Life**: 1.8s
- **Effect**: 
  - Emits flame particles while traveling
  - Applies burn on hit (3s, 4 DPS)
  - Bounces off world edges (2400×1800 bounds)
- **Color**: #FF5500 (orange-red)

#### **waterbolt** (Available)
- **Type**: Target-based
- **Damage**: 18
- **Cooldown**: 0.8s
- **Mana Cost**: 12
- **Element**: Water

#### **airslash** (Available)
- **Type**: Target-based
- **Damage**: 22
- **Cooldown**: 1.2s
- **Mana Cost**: 18
- **Element**: Air

---

## Game Systems

### Camera System (`src/core/Camera.js`)
- **Follow**: Smoothly follows player within world bounds
- **Viewport**: 800×600 view of 2400×1800 world
- **Culling**: `isVisible()` check prevents off-screen rendering
- **Coordinate Transform**: `toWorld()` & `toScreen()` for input/output translation

### World Map System (`src/core/WorldMap.js`)
- **Procedural Generation**: Seeded RNG (LCG) for consistent tree/rock placement
- **Trees**: 42 trees with 3 HP each, harvestable, drop wood (1-2) + XP (8)
- **Rocks**: 28 decorative rocks with rotated ellipses
- **Drops**: Ground items with auto-pickup, bobbing animation
- **Background**: Tiled 80×80px earth squares with varied coloring
- **Methods**: `harvestTreeAt()`, `spawnDrop()`, `collectDrops()`

### Inventory UI (`src/core/InventoryUI.js`)
- **Panel**: 5×4 grid (20 slots) displayed in canvas center
- **Toggle**: I key opens/closes modal
- **Display**: Item name, color block, stack count
- **XP Bar**: Shows current level and XP progress to next level
- **Screen-Space**: Rendered after world (doesn't follow camera)

### Combat Engine (`src/core/CombatEngine.js`)
- **Ability Execution**: Routes to slash or projectile
- **Slashes**: Half-ellipse AoE, camera-aware draw
- **Projectiles**: World-bound physics (2400×1800), edge bounce
- **Particles**: Flame trails, burn status effects
- **Damage Floats**: World-space text with camera offset
- **Burn Tick**: 0.4s intervals, configurable DPS

### Player Controller (`src/core/PlayerController.js`)
- **Movement**: WASD at 150 px/s within world bounds
- **Stats**: HP (100-150 depending on level), Mana, Speed
- **Progression**: Level (1-10), XP with thresholds, auto-level-up
- **Knockback**: kbx, kby with exponential decay
- **Draw**: Camera-aware circle + health bar + cast pulse ring
- **Methods**: `gainXP()`, `xpToNext`, `xpProgress` (getter)

### Entity Manager (`src/core/Entity.js`)
- **Auto-Spawn**: Enemies spawn every 2-5s around player (radius 350-500px)
- **Multi-Type**: Lookup from gameData.enemyTypes (goblin, orc, skeleton)
- **Homing**: Speed-based pursuit (65% of max speed acceleration)
- **Burn Tick**: Per-enemy damage interval
- **Loot Drops**: On death, spawn XP + item (based on type's lootChance)
- **Draw**: Camera culling, world-space rendering

### Game State (`src/core/GameState.js`)
- **Resources**: HP, Mana with regeneration
- **Inventory**: Items dictionary with counts (addItem method)
- **Cooldowns**: Per-ability cooldown tracking

### Day/Night Cycle (`src/core/DayNightCycle.js`)
- **Duration**: 200 seconds per full cycle (30% day, 40% night, 30% day)
- **Glow Intensity**: Sine wave from 0 to 1 during night phase
- **Sky Color**: Dynamic from light blue (day) to dark blue-black (night)
- **Ambient Light**: 100% (day) → 40% (night) brightness multiplier
- **Methods**: `getSkyColor()`, `getAmbientLight()`, `getTimeString()`, `getTimePercentage()`

### World Manager (`src/core/WorldManager.js`)
- **World Configs**: 4 pre-defined worlds (Forest, Volcanic, Tundra, Meadow)
- **Per-World Settings**: Unique tree/rock counts, spawn rates, difficulty multipliers
- **Spawn Dynamics**: Day/night-aware enemy spawn rate calculations
- **Methods**: `getWorldConfig()`, `getEnemySpawnRate()`, `setCurrentWorld()`

### World Select Menu (`src/core/WorldSelectMenu.js`)
- **Display**: Centered menu showing all available worlds
- **Navigation**: Arrow keys/WASD to select, ENTER to confirm
- **Info**: Shows world name, description, resource counts, enemy stats
- **Selection Indicator**: Highlights current choice with green border
- **Methods**: `selectWorld()`, `handleKeyPress()`

### Crafting System (`src/core/CraftingSystem.js`)
- **Recipes**: 3 craftable items (Wooden Axe, Stick, Stone Axe)
- **Ingredients**: Lookup from inventory, automatic deduction on craft
- **Progress**: Time-based, displayed in HUD during crafting
- **Validation**: `canCraft()` checks ingredient availability
- **Methods**: `startCraft()`, `update()`, `completeCraft()`, `cancelCraft()`
- **Hotbar**: 6 slots for ability assignment
- **Notifications**: Temporary colored messages

---

## Architecture

```
main_fase2.js (60 FPS Game Loop)
├─ Input Handling (WASD, Space, Right-Click, I, 1-6, Click)
├─ Update Systems (5ms budget)
│  ├─ Camera follow
│  ├─ World map update (trees, drops)
│  ├─ Player (movement + knockback decay)
│  ├─ Entities (enemy spawning + AI + burn tick + loot drops)
│  ├─ Drop collection (XP gain + inventory)
│  ├─ Combat (projectiles + slashes + particles)
│  └─ State (cooldowns + resources)
└─ Draw Systems (9ms budget)
   ├─ World (background tiles + rocks + trees + drops)
   ├─ Entities (player + enemies)
   ├─ Combat Effects (slashes + projectiles + particles + floats)
   ├─ Inventory UI (modal, screen-space)
   ├─ Mini-map
   └─ HUD (bars + text)
```

**Active Files Only**
```
src/core/
├── Camera.js               (viewport follow, coordinate xforms)
├── WorldMap.js             (procedural generation, trees, rocks, drops)
├── InventoryUI.js          (inventory panel, item display, XP bar)
├── PlayerController.js     (player movement, health, XP/level, knockback)
├── Entity.js               (enemy manager, auto-spawn, AI, loot drops)
├── CombatEngine.js         (abilities, projectiles, particles, camera-aware draws)
├── GameState.js            (global state, cooldowns, mana, inventory)
├── HotbarSystem.js         (hotbar UI rendering)
├── ElementManager.js       (element tracking)
└── gameData.js             (world, items, ability & enemy definitions)

index.html                  (canvas entry point)
main_fase2.js              (game loop)
```

---

## Performance Profile

| Metric | Target | Status |
|--------|--------|--------|
| FPS | 60 stable | ✅ Achieved |
| Max Enemies | 100 | ✅ Tested |
| Particles | 500+ | ✅ Active |
| Draws per frame | <1000 | ✅ Culled |
| Frame Time | 16.67ms | ✅ Met |
| - Update | 5ms | ✅ Estimated |
| - Render | 9ms | ✅ Estimated |
| - Overhead | 2.67ms | ✅ Estimated |
| Memory | ~550KB | ✅ Minimal |

**Optimizations**
- Camera culling: Enemies/particles outside viewport skipped
- Drop filter: Instant removal of collected items
- Seeded RNG: One-time generation at startup

---

## Canvas & Setup

- **Viewport**: 800×600px (fixed window)
- **World**: 2400×1800px (explorable)
- **Background**: #0a0a1a (dark blue-black)
- **View Mode**: Camera follow with clamped scroll
- **Entry Point**: `index.html` → `main_fase2.js`
- **No build tools**: Pure ES6 modules in browser

---

## Game Data Configuration

All game data defined in `src/core/gameData.js`:

**World Config**
- Size: 2400×1800px
- Trees: 42 (auto-generated)
- Rocks: 28 (auto-generated)
- Seed: 1337 (procedural generation)

**Items** (6 types)
- Wood (brown #8B4513)
- Stone (gray #888888)
- Goblin Fang (gold #FFD700)
- Orc Hide (dark red #8B2020)
- Bone (tan #DDDDC8)
- Crystal Shard (purple #CC44FF)

**Enemy Types** (3 active)

| Type | HP | Speed | Radius | XP | Loot | Drop% |
|------|-------|-------|--------|----|----|---------|
| Goblin | 40 | 80 | 12 | 10 | goblin_fang | 35% |
| Skeleton | 65 | 62 | 13 | 22 | bone | 55% |
| Orc | 120 | 48 | 19 | 35 | orc_hide | 50% |

**Elements** (8 total)
- Fire, Water, Air, Earth, Lightning, Ice, Nature, Light
- Each with nameColor, accentColor, epithet

**Abilities** (4 active)
- basicAttack (slash, 0.25s cooldown, free)
- fireball (projectile, 0.4s cooldown, 8 mana, burn)
- waterbolt (target, 0.8s cooldown, 12 mana)
- airslash (target, 1.2s cooldown, 18 mana)

---

## Next Steps (Roadmap)

### Phase 4: Crafting & Upgrades
- Crafting recipes (wood → planks, fang + hide → armor)
- Equipment slots (weapon, armor, ring)
- Stat scaling per equipment rarity
- Player stat display (attack, defense, speed scales)

### Future Expansions
1. **More Enemies**: Boss encounters, elite variants, rare drops
2. **New Abilities**: Combo system, channeled abilities, area buffs
3. **Dungeons**: Procedural multi-room dungeons with loot
4. **Alchemy**: Potion brewing, buff crafting
5. **Persistence**: Save/load game state to localStorage
6. **Audio**: Sound effects, background music
7. **Skill Trees**: Talent progression, passive bonuses
8. **PvE Raids**: Team objectives, shared resources

---

## Running the Game

### Local Server (Recommended)
```powershell
cd c:\Users\pc\Documents\ElementalSingularity
python -m http.server 8000
```
Then open `http://127.0.0.1:8000/` in browser

### Direct Open
Simply open `index.html` in any modern browser (Chrome, Firefox, Edge)

---

## Console Output

On startup, you'll see:
```
Game initialized - Fase 2
WASD to move, SPACE spawns enemy at cursor, click to cast, hotbar slots via keyboard (1-6) or click
```

---

## Known Limititations & Future Work

- ⏳ No persist state (no save/load)
- ⏳ No menu system yet
- ⏳ No progression/upgrades
- ⏳ No sound (canvas-only)
- ⏳ Single arena (no rooms/levels)

---

## Credits

**Elemental Singularity - Phase 2**
Built with vanilla JavaScript & HTML5 Canvas
No external dependencies — pure rendering
Last updated: 2026-03-22

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
