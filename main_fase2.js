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
import CharacterManager from './src/core/CharacterManager.js';
import CharacterSelectMenu from './src/core/CharacterSelectMenu.js';
import PauseMenu from './src/core/PauseMenu.js';
import PhysicsSystem from './src/core/PhysicsSystem.js';

// Canvas setup
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Initialize systems
// World selection
const worldManager = new WorldManager();
const worldSelectMenu = new WorldSelectMenu(worldManager);
const characterManager = new CharacterManager();
const characterSelectMenu = new CharacterSelectMenu(characterManager, worldManager);

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
let selectedWorldId = null;
let activeCharacterMeta = null;
const gameRules = { mode: 'survival' };

function setGameMode(mode) {
  gameRules.mode = mode;
  gameState.gameMode = mode;
  pauseMenu.currentGameMode = mode;
}

// Input state
const input = { w: false, a: false, s: false, d: false, mouseX: 400, mouseY: 300 };
let lastTime = performance.now();
let deltaTime = 0;
let selectedSlot = 0;
let castHudFlash = 0;
let castText = '';
let castTextTimer = 0;
let castColor = '#FFFFFF';
const FREE_CAST_ABILITIES = new Set(['basicAttack', 'fireball', 'waterbolt', 'airslash', 'lightningChain', 'earthSpike']);
const pauseMenu = new PauseMenu();
const physicsSystem = new PhysicsSystem({
  getWorldBounds: () => ({ width: WORLD_W, height: WORLD_H }),
  getStaticBodies: () => worldMap.getCollisionBodies(),
  getDynamicBodies: () => [player, ...entityManager.enemies.filter((enemy) => enemy && !enemy.dead)]
});

function returnToWorldSelection() {
  pauseMenu.close();
  inventoryUI.isOpen = false;
  inventoryUI.dragging = null;
  characterSelectMenu.close();
  worldSelectMenu.isOpen = true;
  gameStarted = false;
  selectedWorldId = null;
}

function handlePauseMenuAction(actionId) {
  if (actionId === 'resume') {
    pauseMenu.close();
    return;
  }
  if (actionId === 'mode_peaceful') {
    setGameMode('peaceful');
    entityManager.enemies = entityManager.enemies.filter((enemy) => enemy && enemy.passive);
    gameState.notify('Modo de juego: Peaceful', '#AEE7FF', 1.5);
    return;
  }
  if (actionId === 'mode_survival') {
    setGameMode('survival');
    gameState.notify('Modo de juego: Survival', '#FFD36A', 1.5);
    return;
  }
  if (actionId === 'mode_creative') {
    setGameMode('creative');
    entityManager.enemies = entityManager.enemies.filter((enemy) => enemy && enemy.passive);
    player.restore();
    gameState.playerStats.mana = gameState.playerStats.maxMana;
    gameState.notify('Modo de juego: Creative', '#C5FFB8', 1.5);
    return;
  }
  if (actionId === 'world_select') {
    returnToWorldSelection();
  }
}

function worldToMinimap(worldX, worldY, mapX, mapY, mapW, mapH) {
  return {
    x: mapX + (worldX / WORLD_W) * mapW,
    y: mapY + (worldY / WORLD_H) * mapH
  };
}

function getAbilityMarkerColor(effect) {
  if (!effect) return '#FFFFFF';
  if (effect.color) return effect.color;
  const ability = effect.ability || null;
  if (!ability) return '#FFFFFF';
  if (ability.projectileColor) return ability.projectileColor;
  if (ability.color) return ability.color;
  if (ability.element) return combatEngine.getElementColor(ability.element);
  return '#FFFFFF';
}

function collectMinimapAbilityMarkers() {
  const markers = [];

  for (const projectile of combatEngine.projectiles) {
    if (!projectile || projectile.life <= 0) continue;
    markers.push({
      x: projectile.x,
      y: projectile.y,
      color: getAbilityMarkerColor(projectile),
      radius: 2.2
    });
  }

  for (const slash of combatEngine.slashes) {
    if (!slash || slash.life <= 0) continue;
    markers.push({
      x: slash.x + Math.cos(slash.angle || 0) * (slash.depth || 0) * 0.5,
      y: slash.y + Math.sin(slash.angle || 0) * (slash.depth || 0) * 0.5,
      color: getAbilityMarkerColor(slash),
      radius: 2.5
    });
  }

  for (const beam of combatEngine.lightningBeams) {
    if (!beam || beam.life <= 0) continue;
    markers.push({
      x: beam.x2,
      y: beam.y2,
      color: beam.color || '#FFE45E',
      radius: 2.4
    });
  }

  return markers;
}

function drawMinimap() {
  const mapW = 152;
  const mapH = 112;
  const mapX = canvas.width - mapW - 12;
  const mapY = canvas.height - mapH - 12;
  const backgroundStep = 4;

  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 15, 0.92)';
  ctx.fillRect(mapX, mapY, mapW, mapH);

  for (let y = 0; y < mapH; y += backgroundStep) {
    for (let x = 0; x < mapW; x += backgroundStep) {
      const worldX = ((x + backgroundStep * 0.5) / mapW) * WORLD_W;
      const worldY = ((y + backgroundStep * 0.5) / mapH) * WORLD_H;
      ctx.fillStyle = worldMap.getMinimapBackgroundColor(worldX, worldY);
      ctx.fillRect(mapX + x, mapY + y, backgroundStep + 0.2, backgroundStep + 0.2);
    }
  }

  const ambientAlpha = dayNightCycle.isNight
    ? 0.18 + dayNightCycle.glowIntensity * 0.22
    : 0.04;
  ctx.fillStyle = `rgba(10, 20, 36, ${ambientAlpha})`;
  ctx.fillRect(mapX, mapY, mapW, mapH);

  for (const tree of worldMap.trees) {
    if (!tree || tree.state === 'burnt') continue;
    const point = worldToMinimap(tree.x, tree.y, mapX, mapY, mapW, mapH);
    ctx.fillStyle = tree.state === 'burning' ? '#FF8C42' : tree.state === 'stump' ? '#7B5536' : '#4FAE43';
    ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
  }

  for (const rock of worldMap.rocks) {
    if (!rock) continue;
    const point = worldToMinimap(rock.x, rock.y, mapX, mapY, mapW, mapH);
    ctx.fillStyle = '#B7C2D0';
    ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
  }

  for (const enemy of entityManager.enemies) {
    if (!enemy || enemy.dead) continue;
    const point = worldToMinimap(enemy.x, enemy.y, mapX, mapY, mapW, mapH);
    ctx.fillStyle = enemy.passive ? '#E8DFA7' : (enemy.color || '#FF6B6B');
    ctx.beginPath();
    ctx.arc(point.x, point.y, enemy.passive ? 1.6 : 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const marker of collectMinimapAbilityMarkers()) {
    const point = worldToMinimap(marker.x, marker.y, mapX, mapY, mapW, mapH);
    ctx.fillStyle = marker.color;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(point.x, point.y, marker.radius || 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const viewportX = mapX + (camera.x / WORLD_W) * mapW;
  const viewportY = mapY + (camera.y / WORLD_H) * mapH;
  const viewportW = (camera.viewWidth / WORLD_W) * mapW;
  const viewportH = (camera.viewHeight / WORLD_H) * mapH;
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.75)';
  ctx.lineWidth = 1;
  ctx.strokeRect(viewportX, viewportY, viewportW, viewportH);

  const playerPoint = worldToMinimap(player.x, player.y, mapX, mapY, mapW, mapH);
  ctx.fillStyle = '#66FF88';
  ctx.beginPath();
  ctx.arc(playerPoint.x, playerPoint.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 255, 235, 0.9)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(160, 200, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mapX, mapY, mapW, mapH);
  ctx.fillStyle = '#DCEBFF';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('MINIMAPA', mapX + 8, mapY + 12);
  ctx.restore();
}

function drawAnimatedHudBar(x, y, width, height, value, leftColor, rightColor, label, valueText) {
  const safe = Math.max(0, Math.min(1, value || 0));
  const t = performance.now() * 0.004;
  const pulse = 0.78 + Math.sin(t + y * 0.05) * 0.12;

  const fillWidth = Math.max(0, width * safe);
  if (fillWidth > 0.5) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, leftColor);
    gradient.addColorStop(1, rightColor);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = pulse;
    ctx.fillRect(x, y, fillWidth, height);
    ctx.globalAlpha = 1;
  }

  const shineX = x + (Math.sin(t * 1.4 + y * 0.03) * 0.5 + 0.5) * Math.max(1, fillWidth - 12);
  if (fillWidth > 10) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.fillRect(shineX, y + 1, 10, Math.max(2, height - 2));
  }

  ctx.fillStyle = '#E8F1FF';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6, y + height - 5);
  ctx.textAlign = 'right';
  ctx.fillText(valueText, x + width - 6, y + height - 5);
  ctx.textAlign = 'left';
}

function drawTopRightHudBars() {
  const showNight = !!pauseMenu.showNightBar;
  const showCast = !!pauseMenu.showCastBar;
  const rows = [
    { id: 'time' },
    ...(showNight ? [{ id: 'night' }] : []),
    ...(showCast ? [{ id: 'cast' }] : [])
  ];
  if (!rows.length) return;

  const panelW = 230;
  const panelH = 12 + rows.length * 28 + 10;
  const panelX = canvas.width - panelW - 6;
  const panelY = 10;

  ctx.save();
  ctx.fillStyle = 'rgba(4, 9, 16, 0.76)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(130, 175, 235, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  const timePercent = dayNightCycle.getTimePercentage();
  const timeLabel = dayNightCycle.getTimeString();
  const nightPercent = dayNightCycle.isNight ? dayNightCycle.glowIntensity : 0;
  const castPercent = Math.max(0, Math.min(1, castHudFlash * 2.4));

  let barY = panelY + 10;
  drawAnimatedHudBar(panelX + 10, barY, panelW - 20, 22, timePercent, '#6BC8FF', '#7F7BFF', 'TIME', timeLabel);
  barY += 28;

  if (showNight) {
    drawAnimatedHudBar(
      panelX + 10,
      barY,
      panelW - 20,
      22,
      nightPercent,
      '#4A78FF',
      '#8D7CFF',
      'NIGHT',
      `${Math.round(nightPercent * 100)}%`
    );
    barY += 28;
  }

  if (showCast) {
    drawAnimatedHudBar(panelX + 10, barY, panelW - 20, 22, castPercent, castColor, '#FFFFFF', 'CAST', castTextTimer > 0 ? 'ACTIVE' : 'READY');
  }

  ctx.restore();
}

function drawMainStatsHudBars() {
  const showEnemies = !!pauseMenu.showEnemiesBar;
  const showFps = !!pauseMenu.showFpsBar;
  const showMode = !!pauseMenu.showModeBar;

  const panelW = 246;
  const rowCount = 3 + (showEnemies ? 1 : 0) + (showFps ? 1 : 0) + (showMode ? 1 : 0);
  const panelH = 12 + rowCount * 28 + 10;
  const panelX = 24;
  const panelY = 10;

  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 0;
  const manaRatio = gameState.playerStats.maxMana > 0
    ? gameState.playerStats.mana / gameState.playerStats.maxMana
    : 0;
  const xpRatio = player.xpProgress || 0;
  const enemiesRatio = Math.min(1, entityManager.enemies.length / 40);
  const fpsValue = Math.round(1 / Math.max(0.0001, deltaTime));
  const fpsRatio = Math.max(0, Math.min(1, fpsValue / 60));
  const modeColor = gameRules.mode === 'creative'
    ? ['#9DFFB1', '#57D67A']
    : gameRules.mode === 'peaceful'
      ? ['#9EE8FF', '#56B6EA']
      : ['#FFD48A', '#FF9E57'];

  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 17, 0.78)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(130, 175, 235, 0.48)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  let barY = panelY + 10;

  drawAnimatedHudBar(
    panelX + 10,
    barY,
    panelW - 20,
    22,
    hpRatio,
    '#FF8F8F',
    '#FF5858',
    'HP',
    `${Math.ceil(player.hp)}/${player.maxHp}`
  );
  barY += 28;

  drawAnimatedHudBar(
    panelX + 10,
    barY,
    panelW - 20,
    22,
    manaRatio,
    '#71C7FF',
    '#4A7BFF',
    'MANA',
    `${gameState.playerStats.mana.toFixed(0)}/${gameState.playerStats.maxMana}`
  );
  barY += 28;

  drawAnimatedHudBar(
    panelX + 10,
    barY,
    panelW - 20,
    22,
    xpRatio,
    '#B6FF82',
    '#73D34E',
    'XP',
    `${player.xp}/${player.xpToNext}`
  );
  barY += 28;

  if (showEnemies) {
    drawAnimatedHudBar(
      panelX + 10,
      barY,
      panelW - 20,
      22,
      enemiesRatio,
      '#FFD27A',
      '#FF8C42',
      'ENEMIES',
      `${entityManager.enemies.length}`
    );
    barY += 28;
  }

  if (showFps) {
    drawAnimatedHudBar(
      panelX + 10,
      barY,
      panelW - 20,
      22,
      fpsRatio,
      '#D0E2FF',
      '#6FA4FF',
      'FPS',
      `${fpsValue}`
    );
    barY += 28;
  }

  if (showMode) {
    drawAnimatedHudBar(
      panelX + 10,
      barY,
      panelW - 20,
      16,
      1,
      modeColor[0],
      modeColor[1],
      'MODE',
      String(gameRules.mode || 'survival').toUpperCase()
    );
  }

  ctx.restore();
}

function getStarterOrbItemId(elementId) {
  const safe = String(elementId || 'fire').toLowerCase();
  return `elemental_orb_${safe}`;
}

function isElementalOrbItem(itemId) {
  return typeof itemId === 'string' && itemId.startsWith('elemental_orb_');
}

function tryConsumeSelectedOrb(slotId) {
  const slot = gameState.hotbar[slotId];
  const slotValue = slot && slot.abilityId;
  if (!slotValue || typeof slotValue !== 'string' || !slotValue.startsWith('item:')) return false;
  const itemId = slotValue.split(':')[1];
  if (!isElementalOrbItem(itemId)) return false;
  const count = gameState.inventory.items[itemId] || 0;
  if (count <= 0) {
    gameState.equipAbility(slotId, null);
    return false;
  }

  const elementId = itemId.replace('elemental_orb_', '');
  gameState.inventory.items[itemId] = count - 1;
  if (gameState.inventory.items[itemId] <= 0) {
    delete gameState.inventory.items[itemId];
    gameState.equipAbility(slotId, null);
  }

  if (gameState.unlockElement(elementId)) {
    gameState.notify(`Elemento desbloqueado: ${elementId}`, '#AAFFCC', 1.3);
  } else {
    gameState.notify(`Ya tienes desbloqueado ${elementId}`, '#D5E6FF', 1.0);
  }
  return true;
}

function canUseAbilityId(abilityId, notify = true) {
  const ability = GAME_DATA.abilities.find((a) => a.id === abilityId);
  if (!ability) return false;
  if (!gameState.hasElementUnlocked(ability.element)) {
    if (notify) {
      gameState.notify(`Elemento bloqueado: ${ability.element}. Usa su orbe para desbloquearlo.`, '#FF9999', 1.4);
    }
    return false;
  }
  return true;
}

function spawnInitialPassiveMobs() {
  const cfg = worldManager.getCurrentWorldConfig();
  const spawnX = cfg.spawnX || WORLD_W / 2;
  const spawnY = cfg.spawnY || WORLD_H / 2;
  for (let i = 0; i < 10; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 220;
    entityManager.spawnEnemy(
      Math.max(30, Math.min(spawnX + Math.cos(ang) * dist, WORLD_W - 30)),
      Math.max(30, Math.min(spawnY + Math.sin(ang) * dist, WORLD_H - 30)),
      'cow'
    );
  }
  for (let i = 0; i < 4; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 160;
    entityManager.spawnEnemy(
      Math.max(30, Math.min(spawnX + Math.cos(ang) * dist, WORLD_W - 30)),
      Math.max(30, Math.min(spawnY + Math.sin(ang) * dist, WORLD_H - 30)),
      'chicken'
    );
  }
}

function applyWorldConfig(worldId) {
  const cfg = worldManager.getWorldConfig(worldId);
  WORLD_W = cfg.width || GAME_DATA.world.width;
  WORLD_H = cfg.height || GAME_DATA.world.height;

  worldMap = new WorldMap(cfg);
  camera = new Camera(WORLD_W, WORLD_H, canvas.width, canvas.height);

  player.worldWidth = WORLD_W;
  player.worldHeight = WORLD_H;
  player.x = cfg.spawnX || WORLD_W / 2;
  player.y = cfg.spawnY || WORLD_H / 2;
  player.kbx = 0;
  player.kby = 0;

  entityManager.width = WORLD_W;
  entityManager.height = WORLD_H;
  entityManager.enemies = [];
  entityManager.particles = [];
  combatEngine.projectiles = [];
  combatEngine.slashes = [];
  combatEngine.particles = [];
  combatEngine.damageFloats = [];
}

function applyStarterElement(starterElement) {
  const orbItemId = getStarterOrbItemId(starterElement || 'fire');
  for (const key of Object.keys(gameState.inventory.items || {})) {
    if (isElementalOrbItem(key)) {
      delete gameState.inventory.items[key];
    }
  }
  gameState.resetUnlockedElements();
  for (let i = 0; i < gameState.hotbar.length; i++) {
    gameState.equipAbility(i, null);
  }
  gameState.equipAbility(0, 'basicAttack');
  gameState.equipAbility(1, `item:${orbItemId}`);
  gameState.addItem(orbItemId, 1);
}

function startGameWithSelection(worldId, characterMeta) {
  applyWorldConfig(worldId);
  activeCharacterMeta = characterMeta || null;
  if (activeCharacterMeta) {
    player.applyCharacterMetadata(activeCharacterMeta);
    applyStarterElement(activeCharacterMeta.starterElement || 'fire');
  } else {
    applyStarterElement('fire');
  }
  player.restore();
  selectedSlot = 0;
  spawnInitialPassiveMobs();
  setGameMode(gameRules.mode);
  gameStarted = true;
}

// ========== INPUT SETUP ==========
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Character select menu input
  if (characterSelectMenu.isOpen) {
    const result = characterSelectMenu.handleKeyPress(key);
    if (result) {
      if (result.action === 'start') {
        characterSelectMenu.close();
        startGameWithSelection(selectedWorldId || worldManager.currentWorldId, result.character);
      } else if (result.action === 'back_world') {
        characterSelectMenu.close();
        worldSelectMenu.isOpen = true;
      }
    }
    return;
  }

  // Inventory UI input handling
  if (inventoryUI.isOpen) {
    if (key === 'escape') {
      inventoryUI.toggle();
      pauseMenu.open();
      return;
    }
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
      selectedWorldId = worldSelectMenu.selectWorld();
      worldSelectMenu.isOpen = false;
      characterSelectMenu.open(selectedWorldId);
    }
    return;
  }

  if (key === 'escape') {
    if (pauseMenu.isOpen) {
      if (pauseMenu.section === 'dev') {
        pauseMenu.activate('back');
      } else {
        pauseMenu.close();
      }
    } else {
      pauseMenu.open();
      inventoryUI.isOpen = false;
      inventoryUI.dragging = null;
    }
    return;
  }

  if (pauseMenu.isOpen) {
    const action = pauseMenu.handleKeyPress(key);
    if (action) handlePauseMenuAction(action);
    return;
  }

  // Normal gameplay input
  if (key === 'w') input.w = true;
  if (key === 'a') input.a = true;
  if (key === 's') input.s = true;
  if (key === 'd') input.d = true;

  // Space makes the player jump.
  if (key === ' ') {
    player.jump();
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
  if (worldSelectMenu.isOpen || characterSelectMenu.isOpen || pauseMenu.isOpen) return;
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
  if (worldSelectMenu.isOpen || characterSelectMenu.isOpen || pauseMenu.isOpen) return;
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
  if (worldSelectMenu.isOpen || characterSelectMenu.isOpen || pauseMenu.isOpen) return;
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
          if (canUseAbilityId(result.id, true)) {
            hotbarSystem.equipAbility(slot, result.id);
            gameState.notify(`Asignada habilidad ${result.id} al slot ${slot + 1}`, '#AAFFCC', 1.2);
          }
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

  // Character select menu click handling
  if (characterSelectMenu.isOpen) {
    const result = characterSelectMenu.handleClick(clickX, clickY);
    if (result) {
      if (result.action === 'start') {
        characterSelectMenu.close();
        startGameWithSelection(selectedWorldId || worldManager.currentWorldId, result.character);
      } else if (result.action === 'back_world') {
        characterSelectMenu.close();
        worldSelectMenu.isOpen = true;
      }
    }
    return;
  }

  if (worldSelectMenu.isOpen) return;

  if (pauseMenu.isOpen) {
    const action = pauseMenu.handleClick(clickX, clickY);
    if (action) handlePauseMenuAction(action);
    return;
  }

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
            if (canUseAbilityId(result.id, true)) {
              hotbarSystem.equipAbility(slot, result.id);
              gameState.notify(`Asignada habilidad ${result.id} al slot ${slot + 1}`, '#AAFFCC', 1.2);
            }
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
  const slotValue = gameState.hotbar[selectedSlot].abilityId;
  if (tryConsumeSelectedOrb(selectedSlot)) {
    return;
  }
  const abilityId = (slotValue && typeof slotValue === 'string' && !slotValue.startsWith('item:'))
    ? slotValue
    : null;

  if (abilityId && !canUseAbilityId(abilityId, true)) {
    return;
  }

  let attacked = false;
  if (abilityId) {
    for (const enemy of entityManager.enemies) {
      const dist = Math.sqrt(
        Math.pow(enemy.x - worldX, 2) + Math.pow(enemy.y - worldY, 2)
      );
      if (dist < 40) {
        const castSuccess = combatEngine.executeAbility(
          abilityId,
          { playerStats: gameState.playerStats, x: player.x, y: player.y, z: player.z || 0, vz: player.vz || 0 },
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
        { playerStats: gameState.playerStats, x: player.x, y: player.y, z: player.z || 0, vz: player.vz || 0 },
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
  if (worldSelectMenu.isOpen || characterSelectMenu.isOpen) return;
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
  if (pauseMenu.isOpen) return;

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
  
  // EntityManager handles spawning (day passive animals, night hostile groups)
  
  entityManager.update(dt, input, player, worldMap, dayNightCycle, gameRules);
  combatEngine.setCombatContext(entityManager.enemies, player, worldMap);
  worldMap.applyPuddleEffects(player, entityManager.enemies, dt);
  physicsSystem.resolveWorldCollisions();

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

  if (characterSelectMenu.isOpen) {
    characterSelectMenu.draw(ctx, canvas);
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

  if (pauseMenu.showHitboxes) {
    physicsSystem.drawHitboxOverlay(ctx, camera);
  }

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
  drawMainStatsHudBars();

  drawTopRightHudBars();

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

  // Draw notifications
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  gameState.notifications.forEach((notif, index) => {
    ctx.fillStyle = notif.color;
    ctx.globalAlpha = 1 - (notif.elapsed / notif.duration);
    ctx.fillText(notif.message, 10, 198 + index * 20);
    ctx.globalAlpha = 1;
  });

  // Draw hotbar
  hotbarSystem.draw(ctx, canvas, selectedSlot);

  // Selected slot HUD removed to avoid overlapping day/night indicator

  // Inventory panel (screen-space)
  inventoryUI.draw(ctx, canvas);

  drawMinimap();
  ctx.textAlign = 'left';

  if (pauseMenu.isOpen) {
    pauseMenu.draw(ctx, canvas);
  }
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
  console.log('WASD move, SPACE jump, ESC pause menu, I inventory, right-click trees to harvest, click to cast');
  console.log('Select world, then select/create character slot');
  setGameMode('survival');
  gameState.equipAbility(0, 'basicAttack');
  gameState.equipAbility(1, 'fireball');
  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
