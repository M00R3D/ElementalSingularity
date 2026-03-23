export class GameStateManager {
  constructor() {
    this.playerStats = { hp: 100, maxHp: 100, mana: 50, maxMana: 50 };
    this.gameMode = 'survival';
    this.inventory = { items: {}, orbs: {}, materials: {} };
    this.unlockedElements = [];
    this.hotbar = [
      { slotId: 0, abilityId: 'basicAttack' },
      { slotId: 1, abilityId: null },
      { slotId: 2, abilityId: null },
      { slotId: 3, abilityId: null },
      { slotId: 4, abilityId: null },
      { slotId: 5, abilityId: null }
    ];
    this.cooldowns = {};
    this.notifications = [];
  }

  updateResources(dt) {
    if (this.playerStats.mana < this.playerStats.maxMana) {
      this.playerStats.mana += 5 * dt;
      if (this.playerStats.mana > this.playerStats.maxMana) {
        this.playerStats.mana = this.playerStats.maxMana;
      }
    }
  }

  updateCooldowns(dt) {
    for (const abilityId in this.cooldowns) {
      this.cooldowns[abilityId] -= dt;
      if (this.cooldowns[abilityId] <= 0) {
        delete this.cooldowns[abilityId];
      }
    }
  }

  getCooldown(abilityId) {
    return this.cooldowns[abilityId] || 0;
  }

  setCooldown(abilityId, duration) {
    this.cooldowns[abilityId] = Math.max(0, duration || 0);
  }

  updateNotifications(dt) {
    this.notifications = this.notifications.map(n => ({...n, elapsed: n.elapsed + dt})).filter(n => n.elapsed < n.duration);
  }

  equipAbility(slotId, abilityId) {
    if (slotId >= 0 && slotId < this.hotbar.length) {
      this.hotbar[slotId].abilityId = abilityId;
    }
  }

  notify(message, color = '#FFFFFF', duration = 2.0) {
    this.notifications.push({ message, color, duration, elapsed: 0 });
  }

  addItem(id, count = 1) {
    this.inventory.items[id] = (this.inventory.items[id] || 0) + count;
  }

  resetUnlockedElements() {
    this.unlockedElements = [];
  }

  unlockElement(elementId) {
    if (!elementId) return false;
    if (this.unlockedElements.includes(elementId)) return false;
    this.unlockedElements.push(elementId);
    return true;
  }

  hasElementUnlocked(elementId) {
    if (!elementId) return true;
    if (this.gameMode === 'creative') return true;
    return this.unlockedElements.includes(elementId);
  }

  canUseAbility(gameData, abilityId) {
    if (!abilityId || typeof abilityId !== 'string') return false;
    if (abilityId.startsWith('item:')) return true;
    if (this.gameMode === 'creative') return true;
    const ability = (gameData.abilities || []).find(a => a.id === abilityId);
    if (!ability) return false;
    return this.hasElementUnlocked(ability.element);
  }
}

export const gameState = new GameStateManager();
export default gameState;
