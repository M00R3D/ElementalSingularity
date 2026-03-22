export class GameStateManager {
  constructor(data, elementSystem) {
    this.data = data;
    this.elementSystem = elementSystem;
    this.reset();
  }

  reset() {
    this.isPaused = false;
    this.isMenuOpen = false;
    this.isDead = false;
    this.menuTab = 'shop';
    this.time = 0;
    this.wave = 1;
    this.bossSpawned = false;
    this.hotbarIndex = 0;
    this.hotbarSlots = new Array(this.data.hotbarSlotCount).fill(null);
    this.notifications = [];
    this.runUpgrades = {};
    this.damageFlash = 0;
    this.deathFade = 0;
    this.deathSummary = null;
    this.abilityCooldowns = {};
    this.activeBuffs = [];
    this.lastCast = null;
    this.runStats = {
      kills: 0,
      enemyKills: {},
      elementUseCount: {},
      abilityUseCount: {},
      branchUseCount: {},
      reactionsTriggered: [],
      usedAbilities: new Set(),
      usedElements: new Set(),
      consumedOrbs: 0,
      craftedItems: 0
    };
    this.visualState = {
      distortion: 0,
      auraPulse: 0,
      elementEnergy: Object.fromEntries(Object.keys(this.data.elements).map((id) => [id, 0]))
    };
    this.playerStats = {
      hp: 100,
      maxHp: 100,
      mp: 70,
      maxMp: 70,
      stamina: 80,
      maxStamina: 80,
      level: 1,
      xp: 0,
      xpToNext: 100,
      elementPoints: 0
    };

    this.affinity = Object.fromEntries(Object.keys(this.data.elements).map((id) => [id, 0]));
    this.inventory = {
      orbs: {},
      materials: {},
      items: [],
      playerInfusions: []
    };
    this.equipment = {
      usageType: 'magic',
      itemId: null
    };

    this.seedHotbar();
    this.applyMetaBonuses();
    this.recomputeBuildState();
  }

  getOrbKey(elementId, rarity) {
    return `${elementId}:${rarity}`;
  }

  getOrbCount(elementId, rarity) {
    return this.inventory.orbs[this.getOrbKey(elementId, rarity)] || 0;
  }

  addOrb(elementId, rarity = 'common', amount = 1) {
    if (!this.data.elements[elementId] || !this.data.orbRarities[rarity]) return false;
    const key = this.getOrbKey(elementId, rarity);
    this.inventory.orbs[key] = (this.inventory.orbs[key] || 0) + amount;
    return true;
  }

  consumeOrb(elementId, rarity = 'common') {
    const key = this.getOrbKey(elementId, rarity);
    if (!this.inventory.orbs[key]) return false;
    this.spendOrb(elementId, rarity, 1);
    const gain = this.data.orbRarities[rarity]?.affinityGain || 1;
    this.affinity[elementId] = (this.affinity[elementId] || 0) + gain;
    this.runStats.consumedOrbs += 1;
    this.notify(`${this.data.elements[elementId].name} affinity +${gain}`, this.data.elements[elementId].color, 1.3);
    return true;
  }

  spendOrb(elementId, rarity = 'common', amount = 1) {
    const key = this.getOrbKey(elementId, rarity);
    if ((this.inventory.orbs[key] || 0) < amount) return false;
    this.inventory.orbs[key] -= amount;
    if (this.inventory.orbs[key] <= 0) delete this.inventory.orbs[key];
    return true;
  }

  addMaterial(materialId, amount = 1) {
    if (!this.data.materials[materialId]) return false;
    this.inventory.materials[materialId] = (this.inventory.materials[materialId] || 0) + amount;
    return true;
  }

  canCraftRecipe(recipe) {
    return recipe.ingredients.every((ingredient) => {
      if (ingredient.kind === 'material') return (this.inventory.materials[ingredient.id] || 0) >= ingredient.count;
      if (ingredient.kind === 'orb') return this.getOrbCount(ingredient.id, ingredient.rarity || 'common') >= ingredient.count;
      return false;
    });
  }

  craftRecipe(recipeId) {
    const recipe = this.data.craftingRecipes.find((item) => item.id === recipeId);
    if (!recipe || !this.canCraftRecipe(recipe)) return null;
    recipe.ingredients.forEach((ingredient) => {
      if (ingredient.kind === 'material') this.inventory.materials[ingredient.id] -= ingredient.count;
      if (ingredient.kind === 'orb') {
        this.spendOrb(ingredient.id, ingredient.rarity || 'common', ingredient.count);
      }
    });
    const item = { id: `${recipe.id}-${Math.floor(Math.random() * 1e6)}`, baseId: recipe.id, name: recipe.name, itemType: recipe.itemType, infusions: [] };
    this.inventory.items.push(item);
    this.runStats.craftedItems += 1;
    this.notify(`Crafted ${item.name}`, '#9fffd0', 1.5);
    return item;
  }

  setUsageType(usageType) {
    const valid = ['unarmed', 'melee', 'ranged', 'magic', 'tool'];
    this.equipment.usageType = valid.includes(usageType) ? usageType : 'magic';
  }

  equipItem(itemId) {
    const item = this.inventory.items.find((entry) => entry.id === itemId) || null;
    this.equipment.itemId = item?.id || null;
    if (item?.itemType) this.setUsageType(item.itemType);
  }

  applyOrbInfusion(targetKind, targetId, elementId, rarity = 'common') {
    if (!this.consumeOrb(elementId, rarity)) return false;
    if (targetKind === 'player') {
      this.inventory.playerInfusions.push({ elementId, rarity, time: this.time });
      this.notify(`Player infused with ${this.data.elements[elementId].name}`, this.data.elements[elementId].color, 1.4);
      return true;
    }
    const item = this.inventory.items.find((entry) => entry.id === targetId);
    if (!item) return false;
    item.infusions.push({ elementId, rarity, time: this.time });
    this.notify(`${item.name} infused: ${this.data.elements[elementId].name}`, this.data.elements[elementId].color, 1.4);
    return true;
  }

  getCombatInfusions() {
    const result = [...this.inventory.playerInfusions.slice(-2)];
    const item = this.inventory.items.find((entry) => entry.id === this.equipment.itemId);
    if (item) result.push(...item.infusions.slice(-2));
    return result.slice(-4);
  }

  getAffinityBonus(elementId) {
    const affinity = this.affinity[elementId] || 0;
    return {
      damage: Math.min(0.3, affinity * 0.006),
      aura: Math.min(0.45, affinity * 0.008),
      unlockTier: Math.floor(affinity / 10)
    };
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
    const starters = this.elementSystem.getStarterAbilityIds();
    starters.forEach((abilityId, index) => {
      this.hotbarSlots[index] = { kind: 'ability', id: abilityId };
    });
  }

  recomputeBuildState() {
    this.buildState = this.elementSystem.analyzeBuild(this.hotbarSlots, this.runStats);
  }

  togglePause() {
    if (this.isDead) return;
    this.isPaused = !this.isPaused;
  }

  toggleMenu() {
    if (this.isDead) return;
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
    this.hotbarSlots[index] = slotItem?.kind === 'ability' ? slotItem : null;
    this.recomputeBuildState();
  }

  clearHotbar(index) {
    this.hotbarSlots[index] = null;
    this.recomputeBuildState();
  }

  getSelectedSlot() {
    return this.hotbarSlots[this.hotbarIndex];
  }

  getSelectedAbilityId() {
    return this.getSelectedSlot()?.id || null;
  }

  getEquippedAbilityIds() {
    return this.hotbarSlots.filter(Boolean).map((slot) => slot.id);
  }

  getPlayerModifiers() {
    const total = {
      damage: this.buildState?.modifiers?.damage || 0,
      attackSpeed: this.buildState?.modifiers?.attackSpeed || 0,
      critChance: this.buildState?.modifiers?.critChance || 0,
      critDamage: this.buildState?.modifiers?.critDamage || 0,
      moveSpeed: this.buildState?.modifiers?.moveSpeed || 0,
      manaRegen: this.buildState?.modifiers?.manaRegen || 0,
      cooldownReduction: this.buildState?.modifiers?.cooldownReduction || 0,
      damageReduction: this.buildState?.modifiers?.damageReduction || 0,
      lifeSteal: this.buildState?.modifiers?.lifeSteal || 0,
      summonDamage: this.buildState?.modifiers?.summonDamage || 0,
      aura: this.buildState?.modifiers?.aura || 0,
      maxHp: this.buildState?.modifiers?.maxHp || 0
    };

    let highestAffinityAura = 0;
    for (const elementId of Object.keys(this.affinity)) {
      const affinityBonus = this.getAffinityBonus(elementId);
      total.damage += affinityBonus.damage;
      highestAffinityAura = Math.max(highestAffinityAura, affinityBonus.aura);
    }
    total.aura += highestAffinityAura;

    for (const buff of this.activeBuffs) {
      for (const key of Object.keys(buff.modifiers || {})) {
        total[key] = (total[key] || 0) + buff.modifiers[key];
      }
    }
    return total;
  }

  notify(text, color = '#fff08d', lifetime = 1.5) {
    this.notifications.push({ text, color, lifetime, age: 0 });
  }

  updateNotifications(dt) {
    for (let index = this.notifications.length - 1; index >= 0; index -= 1) {
      const item = this.notifications[index];
      item.age += dt;
      if (item.age >= item.lifetime) this.notifications.splice(index, 1);
    }
  }

  updateCooldowns(dt) {
    for (const key of Object.keys(this.abilityCooldowns)) {
      this.abilityCooldowns[key] = Math.max(0, this.abilityCooldowns[key] - dt);
    }
  }

  getAbilityCooldown(abilityId) {
    return this.abilityCooldowns[abilityId] || 0;
  }

  setAbilityCooldown(abilityId, duration) {
    this.abilityCooldowns[abilityId] = duration;
  }

  addBuff(buff) {
    this.activeBuffs.push({ ...buff, remaining: buff.duration });
  }

  updateBuffs(dt) {
    for (let index = this.activeBuffs.length - 1; index >= 0; index -= 1) {
      this.activeBuffs[index].remaining -= dt;
      if (this.activeBuffs[index].remaining <= 0) this.activeBuffs.splice(index, 1);
    }
  }

  updateVisualState(dt) {
    this.visualState.distortion = Math.max(0, this.visualState.distortion - dt * 1.2);
    this.visualState.auraPulse = Math.max(0, this.visualState.auraPulse - dt * 1.8);
    for (const key of Object.keys(this.visualState.elementEnergy)) {
      this.visualState.elementEnergy[key] = Math.max(0, this.visualState.elementEnergy[key] - dt * 0.16);
    }
  }

  updateResources(dt) {
    const modifiers = this.getPlayerModifiers();
    this.playerStats.mp = Math.min(this.playerStats.maxMp, this.playerStats.mp + (8 + (this.runUpgrades.circuit ? 2 : 0) + (modifiers.manaRegen || 0)) * dt);
    this.playerStats.stamina = Math.min(this.playerStats.maxStamina, this.playerStats.stamina + 16 * dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.5);
    this.updateBuffs(dt);
    this.updateVisualState(dt);
    if (this.isDead) this.deathFade = Math.min(1, this.deathFade + dt * 0.6);
  }

  spendResource(key, amount) {
    if (this.playerStats[key] < amount) return false;
    this.playerStats[key] -= amount;
    return true;
  }

  refundResource(key, amount) {
    const maxKey = `max${key[0].toUpperCase()}${key.slice(1)}`;
    this.playerStats[key] = Math.min(this.playerStats[maxKey], this.playerStats[key] + amount);
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
    stats.maxMp += 4;
    stats.mp = stats.maxMp;
    stats.maxStamina += 2;
    this.notify(`Level ${stats.level}  +1 Element Point`, '#ffdc76', 2.1);
    if (stats.level % 2 === 0) {
      const upgrade = this.elementSystem.awardRunUpgrade(this.data.runUpgrades, this.runUpgrades);
      if (upgrade) {
        this.runUpgrades[upgrade.id] = true;
        this.notify(`Run Upgrade: ${upgrade.name}`, '#9fffd0', 2.2);
      }
    }
  }

  spendElementPoint(cost) {
    if (this.playerStats.elementPoints < cost) return false;
    this.playerStats.elementPoints -= cost;
    return true;
  }

  recordAbilityUse(ability, reactionLabel = null) {
    this.runStats.usedAbilities.add(ability.name);
    this.runStats.usedElements.add(ability.elementId);
    this.runStats.abilityUseCount[ability.id] = (this.runStats.abilityUseCount[ability.id] || 0) + 1;
    this.runStats.elementUseCount[ability.elementId] = (this.runStats.elementUseCount[ability.elementId] || 0) + 1;
    this.runStats.branchUseCount[ability.branchId] = (this.runStats.branchUseCount[ability.branchId] || 0) + 1;
    if (reactionLabel) this.runStats.reactionsTriggered.push(reactionLabel);
    this.lastCast = { abilityId: ability.id, elementId: ability.elementId, branchId: ability.branchId, time: this.time };
    this.visualState.distortion = Math.min(1, this.visualState.distortion + 0.12 + (ability.type === 'chaos' ? 0.18 : 0));
    this.visualState.auraPulse = Math.min(1, this.visualState.auraPulse + 0.28);
    this.visualState.elementEnergy[ability.elementId] = Math.min(1, (this.visualState.elementEnergy[ability.elementId] || 0) + 0.34);
    this.recomputeBuildState();
  }

  recordKill(enemyType) {
    this.runStats.kills += 1;
    this.runStats.enemyKills[enemyType] = (this.runStats.enemyKills[enemyType] || 0) + 1;
  }

  damagePlayer(amount) {
    if (this.isDead) return;
    const reduction = Math.max(0, Math.min(0.7, this.getPlayerModifiers().damageReduction || 0));
    this.playerStats.hp = Math.max(0, this.playerStats.hp - amount * (1 - reduction));
    this.damageFlash = 1;
    if (this.playerStats.hp <= 0) this.triggerDeath();
  }

  triggerDeath() {
    if (this.isDead) return;
    this.isDead = true;
    this.isPaused = true;
    this.isMenuOpen = false;
    this.deathFade = 0;
    this.deathSummary = {
      timeSurvived: this.time,
      levelReached: this.playerStats.level,
      enemiesKilled: this.runStats.kills,
      buildName: this.buildState.buildName,
      mainElements: this.buildState.dominantElements,
      activeSetBonuses: this.buildState.activeSetBonuses.map((item) => item.name),
      abilitiesUsed: [...this.runStats.usedAbilities],
      elementsUsed: [...this.runStats.usedElements],
      buildAbilities: this.hotbarSlots.filter(Boolean).map((slot) => this.elementSystem.getAbility(slot.id)).filter(Boolean).map((ability) => ({ id: ability.id, name: ability.name, elementId: ability.elementId })),
      reactions: this.runStats.reactionsTriggered.slice(-6),
      synergyLabels: this.buildState.synergyLabels
    };
    this.notify('Run Lost', '#ff7a9a', 2.6);
  }
}