// ========================================
// ELEMENTAL SINGULARITY - Fase 2 Integration
// Includes: Player, Combat, Elements, Hotbar
// ========================================

import { GAME_DATA } from './src/core/gameData.js';
import { gameState } from './src/core/GameState.js';
import EntityManager from './src/core/Entity.js';
import PlayerController from './src/core/PlayerController.js';
import CombatEngine from './src/core/CombatEngine.js';
import HotbarSystem from './src/core/HotbarSystem.js';
import Camera     from './src/core/Camera.js';
import WorldMap   from './src/core/WorldMap.js';
import InventoryUI from './src/core/InventoryUI.js';
import DayNightCycle from './src/core/DayNightCycle.js';
import WorldManager from './src/core/WorldManager.js';
import WorldSelectMenu from './src/core/WorldSelectMenu.js';
import CraftingSystem from './src/core/CraftingSystem.js';

// Canvas setup
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Initialize systems
// World selection
const worldManager = new WorldManager();
const worldSelectMenu = new WorldSelectMenu(worldManager);

// Time system
const dayNightCycle = new DayNightCycle(200); // 200 second cycle

// World dimensions (will change when world is selected)
let WORLD_W = GAME_DATA.world.width;
let WORLD_H = GAME_DATA.world.height;

// Initialize world and view systems
let camera    = new Camera(WORLD_W, WORLD_H, 800, 600);
let worldMap  = new WorldMap(GAME_DATA.world);

// Initialize game systems
let player        = new PlayerController(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H);
let entityManager = new EntityManager(GAME_DATA);
let combatEngine  = new CombatEngine(GAME_DATA, WORLD_W, WORLD_H);
const hotbarSystem = new HotbarSystem(GAME_DATA, gameState);
const inventoryUI  = new InventoryUI(GAME_DATA, gameState, player);
const craftingSystem = new CraftingSystem(GAME_DATA);

let gameStarted = false; // Set to true when world is selected

// Input state
const input = { w: false, a: false, s: false, d: false, mouseX: 400, mouseY: 300 };
let lastTime = performance.now();
let deltaTime = 0;
let selectedSlot = 0;
let castHudFlash = 0;
let castText = '';
let castTextTimer = 0;
let castColor = '#FFFFFF';
const FREE_CAST_ABILITIES = new Set(['basicAttack', 'fireball']);

// ========== INPUT SETUP ==========
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Inventory UI input handling
  if (inventoryUI.isOpen) {
    inventoryUI.handleKeyInput(key);
    if (key === 'i') {
      inventoryUI.toggle();
    }
    return;
  }

  // World select menu input
  if (worldSelectMenu.isOpen) {
    if (key === 'arrowup' || key === 'w') worldSelectMenu.handleKeyPress('arrowup');
    if (key === 'arrowdown' || key === 's') worldSelectMenu.handleKeyPress('arrowdown');
    if (key === 'enter') {
      worldSelectMenu.selectWorld();
      gameStarted = true;
    }
    return;
  }

  // Normal gameplay input
  if (key === 'w') input.w = true;
  if (key === 'a') input.a = true;
  if (key === 's') input.s = true;
  if (key === 'd') input.d = true;

  // Space spawns enemy at cursor position (world coords).
  if (key === ' ') {
    const wp = camera.toWorld(input.mouseX, input.mouseY);
    entityManager.spawnEnemy(wp.x, wp.y);
    return;
  }

  // I toggles inventory.
  if (key === 'i') {
    inventoryUI.toggle();
    return;
  }

  // C toggles crafting UI
  if (key === 'c') {
    // TODO: Add crafting UI toggle
    return;
  }

  // Hotbar slot selection (1-6)
  if (key >= '1' && key <= '6') {
    const slotId = parseInt(key) - 1;
    selectedSlot = slotId;
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w') input.w = false;
  if (key === 'a') input.a = false;
  if (key === 's') input.s = false;
  if (key === 'd') input.d = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  input.mouseX = e.clientX - rect.left;
  input.mouseY = e.clientY - rect.top;
  // Update inventory drag preview if active
  if (inventoryUI.isOpen) {
    inventoryUI.updateDrag(input.mouseX, input.mouseY);
  }
});

// Start drag on mousedown when clicking inventory items/abilities
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  if (inventoryUI.isOpen) {
    // If clicked on hotbar while inventory is open, start dragging that slot
    const hotbarSlot = hotbarSystem.getSlotAtMouse(clickX, clickY, canvas);
    if (hotbarSlot >= 0) {
      const slotData = gameState.hotbar[hotbarSlot] || {};
      const aid = slotData.abilityId || null;
      if (aid) {
        // start drag from hotbar
        if (typeof aid === 'string' && aid.startsWith('item:')) {
          const itemId = aid.split(':')[1];
          const have = gameState.inventory.items[itemId] || 0;
          const pick = (e.button === 2) ? 1 : Math.max(1, have);
          const actual = Math.min(have, pick);
          if (actual > 0) {
            gameState.inventory.items[itemId] = have - actual;
            if (gameState.inventory.items[itemId] <= 0) delete gameState.inventory.items[itemId];
            inventoryUI.dragging = { type: 'item', id: itemId, slot: hotbarSlot, from: 'hotbar', dragX: clickX, dragY: clickY, count: actual };
            e.preventDefault();
            return;
          }
        } else {
          // ability drag from hotbar
          inventoryUI.dragging = { type: 'hotbar', id: aid, slot: hotbarSlot, dragX: clickX, dragY: clickY };
          e.preventDefault();
          return;
        }
      }
    }

    const started = inventoryUI.startDrag(clickX, clickY, canvas.width, canvas.height, e.button);
    if (started) {
      e.preventDefault();
      return;
    }
  }
});

// End drag on mouseup and apply to hotbar if dropped there
canvas.addEventListener('mouseup', (e) => {
  const rect = canvas.getBoundingClientRect();
  const upX = e.clientX - rect.left;
  const upY = e.clientY - rect.top;
  if (inventoryUI.isOpen) {
    const result = inventoryUI.endDrag(upX, upY);
    if (result) {
      const slot = hotbarSystem.getSlotAtMouse(upX, upY, canvas);
      // Dropped onto a hotbar slot
      if (slot >= 0) {
        if (result.type === 'ability') {
          hotbarSystem.equipAbility(slot, result.id);
          gameState.notify(`Asignada habilidad ${result.id} al slot ${slot + 1}`, '#AAFFCC', 1.2);
        } else if (result.type === 'item') {
          // If dragged from another hotbar slot, swap; otherwise assign reference and restore picked count to inventory
          if (result.from === 'hotbar' && result.slot !== undefined) {
            const src = result.slot;
            const srcVal = gameState.hotbar[src] && gameState.hotbar[src].abilityId;
            const dstVal = gameState.hotbar[slot] && gameState.hotbar[slot].abilityId;
            gameState.hotbar[slot].abilityId = srcVal;
            gameState.hotbar[src].abilityId = dstVal || null;
            // restore picked items back to inventory (hotbar move shouldn't consume)
            if (result.count) {
              gameState.inventory.items[result.id] = (gameState.inventory.items[result.id] || 0) + result.count;
            }
            gameState.notify(`Hotbar: moved slot ${src + 1} → ${slot + 1}`, '#AAFFCC', 1.2);
          } else {
            hotbarSystem.equipAbility(slot, `item:${result.id}`);
            // restore picked items into inventory (assignment doesn't consume items)
            if (result.count) {
              gameState.inventory.items[result.id] = (gameState.inventory.items[result.id] || 0) + result.count;
            }
            gameState.notify(`Asignado objeto ${result.id} al slot ${slot + 1}`, '#AAFFCC', 1.2);
          }
        } else if (result.type === 'hotbar') {
          // Move/swap from source hotbar slot to target slot
          const src = result.slot;
          const srcVal = gameState.hotbar[src] && gameState.hotbar[src].abilityId;
          const dstVal = gameState.hotbar[slot] && gameState.hotbar[slot].abilityId;
          gameState.hotbar[slot].abilityId = srcVal;
          gameState.hotbar[src].abilityId = dstVal || null;
          gameState.notify(`Hotbar: moved slot ${src + 1} → ${slot + 1}`, '#AAFFCC', 1.2);
        }
      } else {
        // Dropped NOT on hotbar slot. If dropped inside inventory panel -> unassign
        const panelW = 500, panelH = 450;
        const px = Math.floor((canvas.width - panelW) / 2);
        const py = Math.floor((canvas.height - panelH) / 2);
        const insidePanel = (upX >= px && upX <= px + panelW && upY >= py && upY <= py + panelH);

        if (result.type === 'hotbar') {
          const src = result.slot;
          if (insidePanel) {
            // Remove assignment back to inventory / abilities
            gameState.equipAbility(src, null);
            gameState.notify(`Quitado del slot ${src + 1}`, '#FFD0AA', 1.0);
          } else {
            // Dropped outside: drop into world (if item, decrement inventory)
            const srcVal = gameState.hotbar[src] && gameState.hotbar[src].abilityId;
            if (srcVal && typeof srcVal === 'string' && srcVal.startsWith('item:')) {
              const itemId = srcVal.split(':')[1];
              // remove one from inventory and spawn drop
              if ((gameState.inventory.items[itemId] || 0) > 0) {
                gameState.inventory.items[itemId] -= 1;
                if (gameState.inventory.items[itemId] <= 0) delete gameState.inventory.items[itemId];
                const wp = camera.toWorld(upX, upY);
                worldMap.spawnDrop(wp.x, wp.y, itemId, 1);
                gameState.notify(`Has soltado ${itemId}`, '#FFCC88', 1.0);
              }
            }
            // Clear hotbar slot
            gameState.equipAbility(src, null);
          }
        }

        // If dragging an item (picked from inventory/hotbar) and released inside panel, merge back into inventory
        if (result.type === 'item') {
          if (insidePanel) {
            gameState.inventory.items[result.id] = (gameState.inventory.items[result.id] || 0) + (result.count || 0);
            gameState.notify(`Colocado ${result.id} x${result.count || 0} en inventario`, '#AAFFCC', 1.0);
          } else {
            // Dropped outside world -> spawn drop
            const wp = camera.toWorld(upX, upY);
            const dropCount = (result.count || 1);
            worldMap.spawnDrop(wp.x, wp.y, result.id, dropCount);
            gameState.notify(`Has soltado ${result.id} x${dropCount}`, '#FFCC88', 1.0);
          }
        }
      }
    }
  }
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Route clicks to inventory when open
  if (inventoryUI.isOpen) {
    // Let panel handle tab clicks first
    inventoryUI.handleClick(clickX, clickY, canvas.width, canvas.height);

    // If nothing is being dragged, start a pick on click (left/right)
    if (!inventoryUI.dragging) {
      const started = inventoryUI.startDrag(clickX, clickY, canvas.width, canvas.height, e.button);
      if (started) {
        return; // picked up item/ability
      }
      return;
    }

    // If we already have something picked (click-to-pick), clicking again will drop it at cursor
    if (inventoryUI.dragging) {
      const result = inventoryUI.endDrag(clickX, clickY);
      if (result) {
        // Reuse same drop logic as mouseup
        const slot = hotbarSystem.getSlotAtMouse(clickX, clickY, canvas);
        if (slot >= 0) {
          if (result.type === 'ability') {
            hotbarSystem.equipAbility(slot, result.id);
            gameState.notify(`Asignada habilidad ${result.id} al slot ${slot + 1}`, '#AAFFCC', 1.2);
          } else if (result.type === 'item') {
            if (result.from === 'hotbar' && result.slot !== undefined) {
              const src = result.slot;
              const srcVal = gameState.hotbar[src] && gameState.hotbar[src].abilityId;
              const dstVal = gameState.hotbar[slot] && gameState.hotbar[slot].abilityId;
              gameState.hotbar[slot].abilityId = srcVal;
              gameState.hotbar[src].abilityId = dstVal || null;
              gameState.notify(`Hotbar: moved slot ${src + 1} → ${slot + 1}`, '#AAFFCC', 1.2);
            } else {
              // assign from inventory: pick was already removed from inventory
              const cnt = result.count || 1;
              gameState.hotbar[slot].abilityId = `item:${result.id}:${cnt}`;
              gameState.notify(`Asignado objeto ${result.id} x${cnt} al slot ${slot + 1}`, '#AAFFCC', 1.2);
            }
          } else if (result.type === 'hotbar') {
            const src = result.slot;
            const srcVal = gameState.hotbar[src] && gameState.hotbar[src].abilityId;
            const dstVal = gameState.hotbar[slot] && gameState.hotbar[slot].abilityId;
            gameState.hotbar[slot].abilityId = srcVal;
            gameState.hotbar[src].abilityId = dstVal || null;
            gameState.notify(`Hotbar: moved slot ${src + 1} → ${slot + 1}`, '#AAFFCC', 1.2);
          }
        } else {
          // dropped outside hotbar
          const panelW = 500, panelH = 450;
          const px = Math.floor((canvas.width - panelW) / 2);
          const py = Math.floor((canvas.height - panelH) / 2);
          const insidePanel = (clickX >= px && clickX <= px + panelW && clickY >= py && clickY <= py + panelH);

          if (result.type === 'hotbar') {
            const src = result.slot;
            if (insidePanel) {
              gameState.equipAbility(src, null);
              gameState.notify(`Quitado del slot ${src + 1}`, '#FFD0AA', 1.0);
            } else {
              const srcVal = gameState.hotbar[src] && gameState.hotbar[src].abilityId;
              if (srcVal && typeof srcVal === 'string' && srcVal.startsWith('item:')) {
                const parts = srcVal.split(':');
                const itemId = parts[1];
                const cnt = parts[2] ? parseInt(parts[2], 10) : 1;
                const wp = camera.toWorld(clickX, clickY);
                worldMap.spawnDrop(wp.x, wp.y, itemId, cnt);
                gameState.notify(`Has soltado ${itemId} x${cnt}`, '#FFCC88', 1.0);
              }
              gameState.equipAbility(src, null);
            }
          }

          if (result.type === 'item') {
            if (insidePanel) {
              // dropped back into inventory
              gameState.inventory.items[result.id] = (gameState.inventory.items[result.id] || 0) + (result.count || 0);
              gameState.notify(`Colocado ${result.id} x${result.count || 0} en inventario`, '#AAFFCC', 1.0);
            } else {
              const wp = camera.toWorld(clickX, clickY);
              const dropCount = (result.count || 1);
              worldMap.spawnDrop(wp.x, wp.y, result.id, dropCount);
              gameState.notify(`Has soltado ${result.id} x${dropCount}`, '#FFCC88', 1.0);
            }
            // if it came from hotbar, clear that hotbar slot
            if (result.from === 'hotbar' && result.slot !== undefined) {
              gameState.equipAbility(result.slot, null);
            }
          }
        }
      }
      return;
    }
  }

  const worldPos = camera.toWorld(clickX, clickY);
  const worldX = worldPos.x;
  const worldY = worldPos.y;

  // Check if clicked on hotbar
  const slotClicked = hotbarSystem.getSlotAtMouse(clickX, clickY, canvas);
  if (slotClicked >= 0) {
    selectedSlot = slotClicked;
    return;
  }

  // Try to attack enemy at click position
  const abilityId = gameState.hotbar[selectedSlot].abilityId;
  let attacked = false;
  if (abilityId) {
    for (const enemy of entityManager.enemies) {
      const dist = Math.sqrt(
        Math.pow(enemy.x - worldX, 2) + Math.pow(enemy.y - worldY, 2)
      );
      if (dist < 40) {
        const castSuccess = combatEngine.executeAbility(
          abilityId,
          { playerStats: gameState.playerStats, x: player.x, y: player.y },
          enemy,
          gameState
        );
        if (castSuccess) {
          const ability = GAME_DATA.abilities.find((a) => a.id === abilityId);
          castColor = ability && ability.element
            ? (GAME_DATA.elements.find((e) => e.id === ability.element)?.nameColor || '#FFFFFF')
            : '#FFFFFF';
          castText = ability ? `Cast: ${ability.name}` : `Cast: ${abilityId}`;
          castTextTimer = 0.8;
          castHudFlash = 0.35;
          player.triggerCastFeedback(castColor);
          attacked = true;
        }
        break;
      }
    }
  }

  if (!attacked) {
    // Some abilities can be cast without an enemy target.
    if (abilityId && FREE_CAST_ABILITIES.has(abilityId)) {
      const castSuccess = combatEngine.executeAbility(
        abilityId,
        { playerStats: gameState.playerStats, x: player.x, y: player.y },
        { x: worldX, y: worldY, vx: 0, vy: 0 },
        gameState
      );

      if (castSuccess) {
        const ability = GAME_DATA.abilities.find((a) => a.id === abilityId);
        castColor = ability && ability.element
          ? (GAME_DATA.elements.find((e) => e.id === ability.element)?.nameColor || '#FFFFFF')
          : '#FFFFFF';
        castText = ability ? `Cast: ${ability.name}` : `Cast: ${abilityId}`;
        castTextTimer = 0.8;
        castHudFlash = 0.35;
        player.triggerCastFeedback(castColor);
      }

      // Feedback / effect: basic attack should hit trees within player's attack reach
      if (abilityId === 'basicAttack') {
        // find nearest alive tree within player reach (95)
        const playerReach = 95;
        const nearTree = worldMap.trees.find(t =>
          t.state === 'alive' && Math.hypot(t.x - player.x, t.y - player.y) <= playerReach + (t.radius || 0)
        );
        if (nearTree) {
          // Allow basic attack to fell trees when in reach (no click-on-tree required)
          const result = worldMap.harvestTreeAt(nearTree.x, nearTree.y, player.x, player.y, playerReach, true);
          if (result) {
            if (result.fell) {
              gameState.notify('Árbol talado: +Madera +XP', '#AAFF99', 0.9);
            } else if (result.reason === 'needs_axe') {
              gameState.notify('Necesitas un hacha para talar árboles!', '#FF9999', 0.9);
            } else {
              gameState.notify('Árbol dañado...', '#FFFFAA', 0.6);
            }
          }
        }
      }
    } else {
      gameState.notify('No enemy targeted', '#FF9999', 0.7);
    }
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const worldPos = camera.toWorld(clickX, clickY);
  
  // Check if player has axe
  const hasWoodenAxe = (gameState.inventory.items['wooden_axe'] || 0) > 0;
  const hasStoneAxe = (gameState.inventory.items['stone_axe'] || 0) > 0;
  const hasAxe = hasWoodenAxe || hasStoneAxe;
  
  const result = worldMap.harvestTreeAt(worldPos.x, worldPos.y, player.x, player.y, 95, hasAxe);
  
  if (result) {
    if (result.reason === 'needs_axe') {
      gameState.notify('Necesitas un hacha para talar árboles!', '#FF9999', 0.9);
    } else if (result.fell) {
      gameState.notify('Árbol talado: +Madera +XP', '#AAFF99', 0.9);
    } else {
      gameState.notify('Árbol dañado...', '#FFFFAA', 0.6);
    }
  }
});

// ========== UPDATE FUNCTION ==========
function update(dt) {
  if (!gameStarted) return;

  // Update day/night cycle
  dayNightCycle.update(dt);

  // Update crafting
  craftingSystem.update(dt, gameState.inventory);

  gameState.updateResources(dt);
  gameState.updateNotifications(dt);
  gameState.updateCooldowns(dt);

  player.update(dt, input);
  camera.follow(player);
  worldMap.update(dt);
  
  // Update entity spawning based on day/night
  const spawnRate = worldManager.getEnemySpawnRate(dayNightCycle);
  entityManager._spawnTimer += dt;
  const spawnInterval = 1 / spawnRate; // Convert rate to interval
  if (entityManager._spawnTimer >= spawnInterval && entityManager.enemies.length < entityManager.maxEnemies) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 350 + Math.random() * 150;
    const spawnX = player.x + Math.cos(angle) * distance;
    const spawnY = player.y + Math.sin(angle) * distance;
    const typeId = ['goblin', 'skeleton', 'orc'][Math.floor(Math.random() * 3)];
    entityManager.spawnEnemy(spawnX, spawnY, typeId);
    entityManager._spawnTimer = 0;
  }
  
  entityManager.update(dt, input, player, worldMap);

  // Auto-pickup nearby drops
  const drops = worldMap.collectDrops(player, 36);
  for (const d of drops) {
    if (d.type === 'xp') {
      player.gainXP(d.value || 0);
    } else {
      gameState.addItem(d.type, d.value || 1);
      gameState.notify(`Picked up: ${d.type} x${d.value || 1}`, '#DDEEFF', 0.5);
    }
  }

  combatEngine.updateProjectiles(dt, entityManager.enemies, worldMap);
  combatEngine.updateSlashes(dt, entityManager.enemies);
  combatEngine.updateParticles(dt);
  combatEngine.updateFloats(dt);
  castHudFlash = Math.max(0, castHudFlash - dt * 1.5);
  castTextTimer = Math.max(0, castTextTimer - dt);

  // Sync player position for combat
  entityManager.player.x = player.x;
  entityManager.player.y = player.y;

  // Element unlocks are no longer passive. They should come from gameplay rewards.
}

// ========== DRAW FUNCTION ==========
function draw() {
  // Draw world select menu if open
  if (worldSelectMenu.isOpen) {
    worldSelectMenu.draw(ctx, canvas);
    return;
  }

  if (!gameStarted) return;

  // Apply day/night sky overlay
  ctx.fillStyle = dayNightCycle.getSkyColor();
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw world background + world objects
  worldMap.drawBackground(ctx, camera);
  worldMap.drawObjects(ctx, camera);

  // Draw entities
  entityManager.draw(ctx, camera);
  player.draw(ctx, camera);

  // Draw combat effects
  combatEngine.drawSlashes(ctx, camera);
  combatEngine.drawProjectiles(ctx, camera);
  combatEngine.drawParticles(ctx, camera);
  combatEngine.drawFloats(ctx, camera);

  // Draw glow effect for fire projectiles at night
  if (dayNightCycle.isNight && dayNightCycle.glowIntensity > 0.1) {
    ctx.save();
    ctx.globalAlpha = dayNightCycle.glowIntensity * 0.3;
    for (const proj of combatEngine.projectiles) {
      if (proj.color && proj.color.includes('FF55')) { // Fire-colored projectiles
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x - camera.x, proj.y - camera.y, proj.radius + 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Draw HUD
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`HP: ${Math.ceil(player.hp)}/${player.maxHp}`, 10, 20);
  ctx.fillText(`Mana: ${gameState.playerStats.mana.toFixed(0)}/${gameState.playerStats.maxMana}`, 10, 40);
  ctx.fillText(`Enemies: ${entityManager.enemies.length}`, 10, 60);
  ctx.fillText(`Lv: ${player.level}  XP: ${player.xp}/${player.xpToNext}`, 10, 80);
  ctx.fillText(`Items: ${Object.keys(gameState.inventory.items).length}`, 10, 100);
  ctx.fillText(`FPS: ${Math.round(1 / Math.max(0.0001, deltaTime))}`, 10, 120);

  // Day/Night info
  const timeStr = dayNightCycle.getTimeString();
  const dayNightText = dayNightCycle.isNight ? '🌙 NIGHT' : '☀️  DAY';
  ctx.fillStyle = dayNightCycle.isNight ? '#4488FF' : '#FFAA44';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`${dayNightText}  ${timeStr}`, canvas.width - 140, 20);

  // Crafting status
  if (craftingSystem.isCrafting && craftingSystem.currentRecipe) {
    const craftX = canvas.width / 2 - 80;
    const craftY = 40;
    const recipe = craftingSystem.currentRecipe;
    ctx.fillStyle = 'rgba(60, 80, 120, 0.7)';
    ctx.fillRect(craftX, craftY, 160, 50);
    ctx.strokeStyle = '#5599FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(craftX, craftY, 160, 50);
    ctx.fillStyle = '#AAFFCC';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Crafting:', craftX + 80, craftY + 16);
    ctx.fillText(recipe.name, craftX + 80, craftY + 28);
    ctx.fillStyle = '#5599FF';
    const barW = 140;
    ctx.fillRect(craftX + 10, craftY + 34, barW, 8);
    ctx.fillStyle = '#AAFFCC';
    ctx.fillRect(craftX + 10, craftY + 34, barW * craftingSystem.craftProgress, 8);
    ctx.textAlign = 'left';
  }

  // Cast feedback in HUD
  if (castHudFlash > 0) {
    const panelX = canvas.width - 260;
    const panelY = 40;
    const panelW = 240;
    const panelH = 28;
    ctx.save();
    ctx.globalAlpha = castHudFlash;
    ctx.fillStyle = castColor;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.globalAlpha = Math.min(1, castHudFlash + 0.45);
    ctx.fillStyle = '#0b1020';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(castText || 'Cast', panelX + 8, panelY + 18);
    ctx.restore();
  }

  if (castTextTimer > 0) {
    ctx.fillStyle = castColor;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(castText, canvas.width - 250, 90);
  }

  // Draw notifications
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  gameState.notifications.forEach((notif, index) => {
    ctx.fillStyle = notif.color;
    ctx.globalAlpha = 1 - (notif.elapsed / notif.duration);
    ctx.fillText(notif.message, 10, 140 + index * 20);
    ctx.globalAlpha = 1;
  });

  // Draw hotbar
  hotbarSystem.draw(ctx, canvas, selectedSlot);

  // Draw selected slot indicator
  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Selected: Slot ${selectedSlot + 1}`, canvas.width - 20, 20);

  // Inventory panel (screen-space)
  inventoryUI.draw(ctx, canvas);

  // Mini map
  const mapW = 140;
  const mapH = 100;
  const mapX = canvas.width - mapW - 12;
  const mapY = canvas.height - mapH - 12;
  ctx.fillStyle = 'rgba(5, 10, 15, 0.85)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = 'rgba(160, 200, 255, 0.45)';
  ctx.strokeRect(mapX, mapY, mapW, mapH);
  const px = mapX + (player.x / WORLD_W) * mapW;
  const py = mapY + (player.y / WORLD_H) * mapH;
  ctx.fillStyle = '#66FF88';
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
}

// ========== GAME LOOP ==========
function gameLoop(currentTime) {
  deltaTime = (currentTime - lastTime) / 1000;
  if (deltaTime > 0.1) deltaTime = 0.1;
  lastTime = currentTime;

  update(deltaTime);
  draw();

  requestAnimationFrame(gameLoop);
}

// ========== INIT ==========
function init() {
  console.log('Game initialized - Fase 3');
  console.log('WASD move, I inventory, right-click trees to harvest, SPACE spawns enemy at cursor, click to cast');
  gameState.equipAbility(0, 'basicAttack');
  gameState.equipAbility(1, 'fireball');
  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
