export class GameStateManager {
  constructor() {
    this.playerStats = { hp: 100, maxHp: 100, mana: 50, maxMana: 50 };
    this.inventory = { items: {}, orbs: {}, materials: {} };
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
}

export const gameState = new GameStateManager();
export default gameState;
