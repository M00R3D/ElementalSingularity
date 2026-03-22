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

// Canvas setup
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Initialize systems
// World dimensions
const WORLD_W = GAME_DATA.world.width;
const WORLD_H = GAME_DATA.world.height;

// Initialize world and view systems
const camera    = new Camera(WORLD_W, WORLD_H, 800, 600);
const worldMap  = new WorldMap(GAME_DATA.world);

// Initialize game systems
const player        = new PlayerController(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H);
const entityManager = new EntityManager(GAME_DATA);
const combatEngine  = new CombatEngine(GAME_DATA, WORLD_W, WORLD_H);
const hotbarSystem = new HotbarSystem(GAME_DATA, gameState);
const inventoryUI  = new InventoryUI(GAME_DATA, gameState, player);

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
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
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
  const result = worldMap.harvestTreeAt(worldPos.x, worldPos.y, player.x, player.y, 95);
  if (result && result.fell) {
    gameState.notify('Tree felled: +Wood +XP', '#AAFF99', 0.9);
  }
});

// ========== UPDATE FUNCTION ==========
function update(dt) {
  gameState.updateResources(dt);
  gameState.updateNotifications(dt);
  gameState.updateCooldowns(dt);

  player.update(dt, input);
  camera.follow(player);
  worldMap.update(dt);
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

  combatEngine.updateProjectiles(dt, entityManager.enemies);
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

  // Draw HUD
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`HP: ${Math.ceil(player.hp)}/${player.maxHp}`, 10, 20);
  ctx.fillText(`Mana: ${gameState.playerStats.mana.toFixed(0)}/${gameState.playerStats.maxMana}`, 10, 40);
  ctx.fillText(`Enemies: ${entityManager.enemies.length}`, 10, 60);
  ctx.fillText(`Lv: ${player.level}  XP: ${player.xp}/${player.xpToNext}`, 10, 80);
  ctx.fillText(`Items: ${Object.keys(gameState.inventory.items).length}`, 10, 100);
  ctx.fillText(`FPS: ${Math.round(1 / Math.max(0.0001, deltaTime))}`, 10, 120);

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
  ctx.fillText(`Selected: Slot ${selectedSlot + 1}`, canvas.width - 200, 20);

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
