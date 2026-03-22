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
  mouseDown: false
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
  uiManager.renderHotbar();
  uiManager.renderMenu();
}

function syncUi() {
  uiManager.renderAbilityLibrary(quickEquip);
  uiManager.renderElementLibrary(quickEquip);
  uiManager.renderHotbar();
  uiManager.renderMenu();
  uiManager.renderSpawners(entityManager);
}

function setupInput() {
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
      uiManager.renderMenu();
    }
    if (key >= '1' && key <= '9') {
      gameState.setHotbarIndex(Number(key) - 1);
      uiManager.renderHotbar();
      uiManager.renderMenu();
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
  canvas.addEventListener('mousedown', () => {
    input.mouseDown = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  window.addEventListener('wheel', (event) => {
    gameState.scrollHotbar(event.deltaY > 0 ? 1 : -1);
    uiManager.renderHotbar();
    uiManager.renderMenu();
  }, { passive: true });
}

function bootstrap() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setupInput();
  uiManager.bind(entityManager.player);
  syncUi();
}

function update(dt) {
  gameState.time += dt;
  gameState.updateResources(dt);
  gameState.updateNotifications(dt);

  if (Math.random() < dt * 0.14) {
    const gained = elementSystem.awardRandomElement();
    gameState.notify(`Element Resonance: ${GAME_DATA.elements[gained].name}`, GAME_DATA.elements[gained].color, 1.6);
    uiManager.renderElementLibrary(quickEquip);
  }

  combatSystem.tryPlayerAttack(input);
  entityManager.update(dt, input, combatSystem);
  uiManager.renderSpawners(entityManager);
}

function draw() {
  entityManager.draw(ctx);
  uiManager.drawHUD(ctx, canvas, entityManager, combatSystem);
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (!gameState.isPaused) {
    update(dt);
  }
  draw();
  requestAnimationFrame(frame);
}

bootstrap();
requestAnimationFrame(frame);
