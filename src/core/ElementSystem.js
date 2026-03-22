function sortedIds(values) {
  return [...new Set(values)].sort();
}

function matchesRule(ruleInputs, owned) {
  return ruleInputs.every((item) => owned.includes(item));
}

export class ElementSystem {
  constructor(data) {
    this.data = data;
    this.storageKey = 'elemental-singularity-meta';
    this.meta = this.loadMeta();
    this.resetRun();
  }

  loadMeta() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (stored) {
        return stored;
      }
    } catch (error) {
      // Ignore malformed save data.
    }

    return {
      unlockedElements: ['fire', 'air', 'electricity'],
      purchasedMetaUpgrades: []
    };
  }

  saveMeta() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.meta));
  }

  resetRun() {
    this.ownedElements = ['fire', 'air', 'electricity'];
    this.lastResolved = null;
  }

  getOwnedElements() {
    return [...this.ownedElements];
  }

  getUnlockedElements() {
    return [...this.meta.unlockedElements];
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
    const total = { damage: 0, maxHp: 0, critChance: 0 };
    for (const upgradeId of this.meta.purchasedMetaUpgrades) {
      const upgrade = this.data.metaUpgrades.find((item) => item.id === upgradeId);
      if (!upgrade) {
        continue;
      }

      for (const key of Object.keys(upgrade.modifiers)) {
        total[key] = (total[key] || 0) + upgrade.modifiers[key];
      }
    }

    return total;
  }

  getPassiveModifiers() {
    const owned = sortedIds(this.ownedElements);
    const modifiers = { damage: 0, attackSpeed: 0, critChance: 0, critDamage: 0, pierce: 0, bounce: 0, maxHp: 0, manaRegen: 0 };

    for (const synergy of this.data.passiveSynergies) {
      if (!matchesRule(synergy.requires, owned)) {
        continue;
      }

      for (const key of Object.keys(synergy.modifiers)) {
        modifiers[key] = (modifiers[key] || 0) + synergy.modifiers[key];
      }
    }

    return modifiers;
  }

  resolveProfile(elementId) {
    const owned = sortedIds(this.ownedElements);
    const mutations = this.data.mutations
      .filter((rule) => rule.inputs.includes(elementId) && matchesRule(rule.inputs, owned))
      .sort((left, right) => right.inputs.length - left.inputs.length);

    if (mutations.length > 0) {
      return this.decorateResolvedProfile(mutations[0].result, [elementId, ...mutations[0].inputs]);
    }

    const combos = this.data.combinations
      .filter((rule) => rule.inputs.includes(elementId) && matchesRule(rule.inputs, owned))
      .sort((left, right) => right.inputs.length - left.inputs.length);

    if (combos.length > 0) {
      return this.decorateResolvedProfile(combos[0].result, [elementId, ...combos[0].inputs]);
    }

    const element = this.data.elements[elementId];
    return this.decorateResolvedProfile({
      name: element.name,
      attackType: 'projectile',
      color: element.color,
      baseDamage: 16,
      modifiers: {},
      statuses: element.status ? [{ id: element.status, duration: 2, power: 2 }] : []
    }, [elementId]);
  }

  decorateResolvedProfile(profile, elementIds) {
    return {
      ...profile,
      elementIds: sortedIds(elementIds),
      passiveModifiers: this.getPassiveModifiers()
    };
  }

  getShopEntries(gameState) {
    const elementEntries = Object.values(this.data.elements)
      .filter((item) => !this.meta.unlockedElements.includes(item.id) && item.unlockCost)
      .map((item) => ({ kind: 'element', id: item.id, name: item.name, cost: item.unlockCost, category: item.category }));

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
    return this.gainElement(roll) ? roll : roll;
  }

  awardRunUpgrade(dataRunUpgrades, runUpgradeState) {
    const available = dataRunUpgrades.filter((item) => !runUpgradeState[item.id]);
    if (available.length === 0) {
      return null;
    }

    return available[Math.floor(Math.random() * available.length)];
  }
}
