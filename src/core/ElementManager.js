// ========================================
// ElementManager - Element System
// Handles: affinity, unlocks, ability grants
// ========================================

export class ElementManager {
  constructor(gameData) {
    this.gameData = gameData;
    this.unlockedElements = [];
    this.affinities = {};

    for (const element of gameData.elements) {
      this.affinities[element.id] = 0;
    }
  }

  addOrb(elementId, count = 1) {
    if (!this.affinities[elementId]) {
      this.affinities[elementId] = 0;
    }
    this.affinities[elementId] += count;

    if (this.affinities[elementId] >= 3 && !this.unlockedElements.includes(elementId)) {
      this.unlockElement(elementId);
      return true;
    }
    return false;
  }

  unlockElement(elementId) {
    if (!this.unlockedElements.includes(elementId)) {
      this.unlockedElements.push(elementId);
      console.log('Unlocked:', elementId);
      return true;
    }
    return false;
  }

  isUnlocked(elementId) {
    return this.unlockedElements.includes(elementId);
  }

  getUnlockedElements() {
    return this.unlockedElements.map(id => this.gameData.elements.find(e => e.id === id));
  }

  getAbilitiesForElement(elementId) {
    return this.gameData.abilities.filter(a => a.element === elementId);
  }

  getUnlockedAbilities() {
    const abilities = [];
    for (const elementId of this.unlockedElements) {
      abilities.push(...this.getAbilitiesForElement(elementId));
    }
    return abilities;
  }

  awardRandom() {
    const randomElement = this.gameData.elements[
      Math.floor(Math.random() * this.gameData.elements.length)
    ];
    this.addOrb(randomElement.id, 1);
    return randomElement.id;
  }

  getElementData(elementId) {
    return this.gameData.elements.find(e => e.id === elementId);
  }
}

export default ElementManager;
