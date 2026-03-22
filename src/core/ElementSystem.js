function unique(values) {
  return [...new Set(values)];
}

function sortEntries(map) {
  return Object.entries(map).sort((left, right) => right[1] - left[1]);
}

export class ElementSystem {
  constructor(data) {
    this.data = data;
    this.storageKey = 'elemental-singularity-meta';
    this.meta = this.loadMeta();
    this.abilityMap = new Map(this.data.abilities.map((ability) => [ability.id, ability]));
    this.resetRun();
  }

  loadMeta() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (stored) {
        const validIds = Object.keys(this.data.elements || {});
        if (Array.isArray(stored.unlockedElements)) {
          stored.unlockedElements = stored.unlockedElements
            .map((id) => (typeof id === 'string' ? id.toLowerCase() : id))
            .filter((id) => validIds.includes(id));
        } else {
          stored.unlockedElements = [];
        }
        if (!Array.isArray(stored.purchasedMetaUpgrades)) stored.purchasedMetaUpgrades = [];
        return stored;
      }
    } catch (error) {
      // Ignore malformed local storage.
    }
    return {
      unlockedElements: ['fire', 'water', 'air', 'earth', 'electricity'],
      purchasedMetaUpgrades: []
    };
  }

  saveMeta() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.meta));
  }

  resetRun() {
    this.ownedElements = [...this.meta.unlockedElements.filter((id) => ['fire', 'water', 'air', 'earth', 'electricity'].includes(id))];
    if (this.ownedElements.length === 0) this.ownedElements = ['fire', 'water', 'air'];
  }

  getAbility(id) {
    return this.abilityMap.get(id) || null;
  }

  getAbilitiesByElement(elementId) {
    return this.data.abilities.filter((ability) => ability.elementId === elementId);
  }

  getAbilitiesByElementWithAffinity(elementId, affinity = 0) {
    const list = this.getAbilitiesByElement(elementId);
    const unlocked = Math.max(2, Math.min(list.length, 2 + Math.floor((affinity || 0) / 6)));
    return list.slice(0, unlocked);
  }

  getOwnedElements() {
    return [...this.ownedElements];
  }

  getUnlockedElements() {
    return [...this.meta.unlockedElements];
  }

  getOwnedAbilities() {
    return this.data.abilities.filter((ability) => this.ownedElements.includes(ability.elementId));
  }

  getStarterAbilityIds() {
    const starters = [];
    for (const elementId of this.getOwnedElements()) {
      starters.push(...this.getAbilitiesByElement(elementId).slice(0, 2).map((ability) => ability.id));
    }
    return unique(starters).slice(0, this.data.hotbarSlotCount);
  }

  gainElement(id) {
    if (!this.ownedElements.includes(id)) {
      this.ownedElements.push(id);
      return true;
    }
    return false;
  }

  unlockElement(id) {
    if (!this.meta.unlockedElements.includes(id)) {
      this.meta.unlockedElements.push(id);
      this.saveMeta();
      return true;
    }
    return false;
  }

  purchaseMetaUpgrade(id) {
    if (!this.meta.purchasedMetaUpgrades.includes(id)) {
      this.meta.purchasedMetaUpgrades.push(id);
      this.saveMeta();
      return true;
    }
    return false;
  }

  getMetaModifiers() {
    const total = { damage: 0, maxHp: 0, critChance: 0, manaRegen: 0 };
    for (const upgradeId of this.meta.purchasedMetaUpgrades) {
      const upgrade = this.data.metaUpgrades.find((item) => item.id === upgradeId);
      if (!upgrade) continue;
      for (const key of Object.keys(upgrade.modifiers)) {
        total[key] = (total[key] || 0) + upgrade.modifiers[key];
      }
    }
    return total;
  }

  getShopEntries() {
    const elementEntries = Object.values(this.data.elements)
      .filter((element) => !this.meta.unlockedElements.includes(element.id))
      .map((element) => ({ kind: 'element', id: element.id, name: element.name, cost: 2 }));
    const upgradeEntries = this.data.metaUpgrades
      .filter((item) => !this.meta.purchasedMetaUpgrades.includes(item.id))
      .map((item) => ({ kind: 'meta', id: item.id, name: item.name, cost: item.cost }));
    return [...elementEntries, ...upgradeEntries];
  }

  awardRandomElement() {
    const unlocked = this.getUnlockedElements();
    const missing = unlocked.filter((id) => !this.ownedElements.includes(id));
    const pool = missing.length > 0 ? missing : unlocked;
    const roll = pool[Math.floor(Math.random() * pool.length)];
    this.gainElement(roll);
    return roll;
  }

  awardRunUpgrade(dataRunUpgrades, runUpgradeState) {
    const available = dataRunUpgrades.filter((item) => !runUpgradeState[item.id]);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  getElementReaction(firstElementId, secondElementId) {
    if (!firstElementId || !secondElementId || firstElementId === secondElementId) return null;
    const sortedPair = [firstElementId, secondElementId].sort().join(':');
    return this.data.elementReactions.find((reaction) => reaction.pair.slice().sort().join(':') === sortedPair) || null;
  }

  analyzeBuild(hotbarSlots, runStats) {
    const equipped = hotbarSlots.map((slot) => (slot?.id ? this.getAbility(slot.id) : null)).filter(Boolean);
    const elementCounts = {};
    const branchCounts = {};
    const modifiers = { damage: 0, attackSpeed: 0, critChance: 0, critDamage: 0, moveSpeed: 0, manaRegen: 0, cooldownReduction: 0, maxHp: 0, damageReduction: 0, lifeSteal: 0, summonDamage: 0, aura: 0 };

    for (const ability of equipped) {
      elementCounts[ability.elementId] = (elementCounts[ability.elementId] || 0) + 1;
      branchCounts[ability.branchId] = (branchCounts[ability.branchId] || 0) + 1;
    }

    const activeSetBonuses = [];
    for (const [elementId, count] of Object.entries(elementCounts)) {
      if (count >= 7) {
        const bonus = this.data.elementalSetBonuses[elementId];
        if (!bonus) continue;
        activeSetBonuses.push({ elementId, ...bonus });
        for (const key of Object.keys(bonus.modifiers)) {
          modifiers[key] = (modifiers[key] || 0) + bonus.modifiers[key];
        }
      }
    }

    const equippedElements = unique(equipped.map((ability) => ability.elementId));
    const synergyLabels = [];
    for (const synergy of this.data.passiveSynergies) {
      if (!synergy.requires.every((elementId) => equippedElements.includes(elementId))) continue;
      synergyLabels.push(synergy.label);
      for (const key of Object.keys(synergy.modifiers)) {
        modifiers[key] = (modifiers[key] || 0) + synergy.modifiers[key];
      }
    }

    const sortedElements = sortEntries(elementCounts);
    const sortedBranches = sortEntries(branchCounts);
    const dominantElements = sortedElements.slice(0, 2).map(([elementId]) => elementId);
    const dominantBranchId = sortedBranches[0]?.[0] || equipped[0]?.branchId || 'wild';

    return {
      equipped,
      elementCounts,
      branchCounts,
      dominantElements,
      dominantBranchId,
      activeSetBonuses,
      synergyLabels,
      modifiers,
      buildName: this.generateBuildName(dominantElements, dominantBranchId, activeSetBonuses),
      usageSummary: {
        elements: { ...(runStats.elementUseCount || {}) },
        abilities: { ...(runStats.abilityUseCount || {}) }
      }
    };
  }

  generateBuildName(dominantElements, branchName, activeSetBonuses) {
    if (activeSetBonuses.length > 0) return activeSetBonuses[0].name;
    const first = dominantElements[0] ? this.data.elements[dominantElements[0]].epithet : 'Wanderer';
    const second = dominantElements[1] ? this.data.elements[dominantElements[1]].epithet : 'Circuit';
    const branchTitle = branchName ? branchName.charAt(0).toUpperCase() + branchName.slice(1) : 'Hybrid';
    return `${first} ${branchTitle} ${second}`;
  }
}