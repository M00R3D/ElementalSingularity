import { GAME_DATA } from './src/data/gameData.js';
import { ElementSystem } from './src/core/ElementSystem.js';
import { GameStateManager } from './src/core/GameStateManager.js';
import { EntityManager } from './src/core/EntityManager.js';
import { CombatSystem } from './src/core/CombatSystem.js';
import { UIManager } from './src/core/UIManager.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  mouseX: 0,
  mouseY: 0,
  primaryHeld: false
};

const elementSystem = new ElementSystem(GAME_DATA);
const gameState = new GameStateManager(GAME_DATA, elementSystem);
const entityManager = new EntityManager(GAME_DATA, gameState);
const combatSystem = new CombatSystem(GAME_DATA, gameState, elementSystem, entityManager);
const uiManager = new UIManager(GAME_DATA, gameState, elementSystem);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  entityManager.resize(canvas.width, canvas.height);
}

function quickEquip(payload) {
  gameState.equipHotbar(gameState.hotbarIndex, payload);
  uiManager.renderHotbar(combatSystem);
  uiManager.renderMenu(combatSystem);
}

function syncUi() {
  uiManager.renderAbilityLibrary(combatSystem, quickEquip);
  uiManager.renderElementLibrary();
  uiManager.renderHotbar(combatSystem);
  uiManager.renderMenu(combatSystem);
  uiManager.renderSpawners(entityManager);
  uiManager.renderDeathSummary();
}

function restartRun() {
  elementSystem.resetRun();
  gameState.reset();
  entityManager.resetWorld();
  syncUi();
}

function setupInput() {
  const slotKeyMap = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') input.up = true;
    if (key === 's' || key === 'arrowdown') input.down = true;
    if (key === 'a' || key === 'arrowleft') input.left = true;
    if (key === 'd' || key === 'arrowright') input.right = true;
    if (event.key === 'Enter') {
      gameState.togglePause();
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      gameState.toggleMenu();
      uiManager.renderMenu(combatSystem);
    }
    const mappedIndex = slotKeyMap.indexOf(key);
    if (mappedIndex >= 0) {
      gameState.setHotbarIndex(mappedIndex);
      uiManager.renderHotbar(combatSystem);
      uiManager.renderMenu(combatSystem);
    }
    if (gameState.isDead && key === 'r') {
      restartRun();
    }
  });

  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') input.up = false;
    if (key === 's' || key === 'arrowdown') input.down = false;
    if (key === 'a' || key === 'arrowleft') input.left = false;
    if (key === 'd' || key === 'arrowright') input.right = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    input.mouseX = event.clientX;
    input.mouseY = event.clientY;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) input.primaryHeld = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.primaryHeld = false;
  });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  window.addEventListener('wheel', (event) => {
    gameState.scrollHotbar(event.deltaY > 0 ? 1 : -1);
    uiManager.renderHotbar(combatSystem);
    uiManager.renderMenu(combatSystem);
  }, { passive: true });
}

function bootstrap() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setupInput();
  uiManager.bind(entityManager.player, restartRun);
  syncUi();
}

let elementGainTimer = 0;
function update(dt) {
  gameState.time += dt;
  gameState.updateResources(dt);
  gameState.updateNotifications(dt);
  gameState.updateCooldowns(dt);

  elementGainTimer += dt;
  if (elementGainTimer >= 8) {
    elementGainTimer = 0;
    const gained = elementSystem.awardRandomElement();
    const gainedElement = gained ? GAME_DATA.elements[gained] : null;
    if (gainedElement) {
      gameState.notify(`Element Resonance: ${gainedElement.name}`, gainedElement.color, 1.6);
    }
    gameState.recomputeBuildState();
    uiManager.renderElementLibrary();
    uiManager.renderAbilityLibrary(combatSystem, quickEquip);
  }

  combatSystem.tryPlayerAttack(input);
  entityManager.update(dt, input, combatSystem);
  uiManager.renderSpawners(entityManager);
  if (gameState.isDead) {
    uiManager.renderDeathSummary();
  }
}

function draw() {
  entityManager.draw(ctx);
  uiManager.drawHUD(ctx, canvas, entityManager, combatSystem);
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!gameState.isPaused && !gameState.isDead) {
    update(dt);
  } else {
    gameState.updateNotifications(dt);
    gameState.updateResources(dt);
  }
  draw();
  requestAnimationFrame(frame);
}

bootstrap();
requestAnimationFrame(frame);
