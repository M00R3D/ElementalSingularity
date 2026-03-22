export class GameStateManager {
  constructor(data, elementSystem) {
    this.data = data;
    this.elementSystem = elementSystem;
    this.reset();
  }

  reset() {
    this.isPaused = false;
    this.isMenuOpen = false;
    this.menuTab = 'shop';
    this.time = 0;
    this.wave = 1;
    this.bossSpawned = false;
    this.hotbarIndex = 0;
    this.hotbarSlots = new Array(9).fill(null);
    this.notifications = [];
    this.runUpgrades = {};
    this.damageFlash = 0;
    this.playerStats = {
      hp: 100,
      maxHp: 100,
      mp: 60,
      maxMp: 60,
      stamina: 70,
      maxStamina: 70,
      level: 1,
      xp: 0,
      xpToNext: 100,
      elementPoints: 0
    };

    this.seedHotbar();
    this.applyMetaBonuses();
  }

  applyMetaBonuses() {
    const meta = this.elementSystem.getMetaModifiers();
    this.playerStats.maxHp += meta.maxHp || 0;
    this.playerStats.hp = this.playerStats.maxHp;
  }

  applyPurchasedMetaUpgrade(modifiers) {
    if (modifiers.maxHp) {
      this.playerStats.maxHp += modifiers.maxHp;
      this.playerStats.hp += modifiers.maxHp;
    }
  }

  seedHotbar() {
    const starters = this.data.abilities.slice(0, 4);
    starters.forEach((ability, index) => {
      this.hotbarSlots[index] = { kind: 'ability', id: ability.id };
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.isPaused = this.isMenuOpen;
  }

  setMenuTab(tab) {
    this.menuTab = tab;
  }

  setHotbarIndex(index) {
    this.hotbarIndex = (index + this.hotbarSlots.length) % this.hotbarSlots.length;
  }

  scrollHotbar(delta) {
    this.setHotbarIndex(this.hotbarIndex + delta);
  }

  equipHotbar(index, slotItem) {
    this.hotbarSlots[index] = slotItem;
  }

  getSelectedSlot() {
    return this.hotbarSlots[this.hotbarIndex];
  }

  notify(text, color = '#fff08d', lifetime = 1.5) {
    this.notifications.push({ text, color, lifetime, age: 0 });
  }

  updateNotifications(dt) {
    for (let index = this.notifications.length - 1; index >= 0; index -= 1) {
      const item = this.notifications[index];
      item.age += dt;
      if (item.age >= item.lifetime) {
        this.notifications.splice(index, 1);
      }
    }
  }

  updateResources(dt) {
    this.playerStats.mp = Math.min(this.playerStats.maxMp, this.playerStats.mp + (8 + (this.runUpgrades.reactor ? 2 : 0)) * dt);
    this.playerStats.stamina = Math.min(this.playerStats.maxStamina, this.playerStats.stamina + 15 * dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.5);
  }

  spendResource(key, amount) {
    if (this.playerStats[key] < amount) {
      return false;
    }

    this.playerStats[key] -= amount;
    return true;
  }

  addXp(amount) {
    this.playerStats.xp += amount;
    while (this.playerStats.xp >= this.playerStats.xpToNext) {
      this.playerStats.xp -= this.playerStats.xpToNext;
      this.levelUp();
    }
  }

  levelUp() {
    const stats = this.playerStats;
    stats.level += 1;
    stats.elementPoints += 1;
    stats.xpToNext = Math.floor(90 + stats.level * stats.level * 22);
    stats.maxHp += 6;
    stats.hp = Math.min(stats.maxHp, stats.hp + 18);
    stats.maxMp += 3;
    stats.mp = stats.maxMp;
    stats.maxStamina += 2;
    this.notify(`Level ${stats.level}  +1 Element Point`, '#ffdc76', 2.2);

    if (stats.level % 2 === 0) {
      const upgrade = this.elementSystem.awardRunUpgrade(this.data.runUpgrades, this.runUpgrades);
      if (upgrade) {
        this.runUpgrades[upgrade.id] = true;
        this.notify(`Run Upgrade: ${upgrade.name}`, '#9fffd0', 2.2);
      }
    }
  }

  spendElementPoint(cost) {
    if (this.playerStats.elementPoints < cost) {
      return false;
    }

    this.playerStats.elementPoints -= cost;
    return true;
  }

  damagePlayer(amount) {
    this.playerStats.hp = Math.max(0, this.playerStats.hp - amount);
    this.damageFlash = 1;
  }
}
