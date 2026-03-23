// ========================================
// CharacterManager - Character Slot Persistence
// Handles 5 save slots in LocalStorage
// ========================================

const STORAGE_KEY = 'elemental_singularity_characters_v1';
const MAX_SLOTS = 5;

export class CharacterManager {
  constructor() {
    this.maxSlots = MAX_SLOTS;
    this.slots = this._loadSlots();
  }

  _defaultCharacter(slotIndex = 0) {
    return {
      id: `slot-${slotIndex + 1}-${Date.now()}`,
      name: `Adventurer ${slotIndex + 1}`,
      faceType: 'friendly',
      size: 15,
      color: '#ff7a59',
      accessory: 'none',
      hairStyle: 'short',
      hairColor: '#4b2e20',
      eyeType: 'round',
      starterElement: 'fire',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  _normalizeCharacter(raw, slotIndex = 0) {
    const base = this._defaultCharacter(slotIndex);
    if (!raw || typeof raw !== 'object') return base;
    return {
      ...base,
      ...raw,
      size: Math.max(10, Math.min(24, Number(raw.size) || base.size)),
      updatedAt: Date.now()
    };
  }

  _loadSlots() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Array(this.maxSlots).fill(null);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Array(this.maxSlots).fill(null);
      const slots = new Array(this.maxSlots).fill(null);
      for (let i = 0; i < this.maxSlots; i++) {
        slots[i] = parsed[i] ? this._normalizeCharacter(parsed[i], i) : null;
      }
      return slots;
    } catch (error) {
      return new Array(this.maxSlots).fill(null);
    }
  }

  _saveSlots() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.slots));
      return true;
    } catch (error) {
      return false;
    }
  }

  getSlots() {
    return this.slots.map((slot) => (slot ? { ...slot } : null));
  }

  getSlot(index) {
    if (index < 0 || index >= this.maxSlots) return null;
    const slot = this.slots[index];
    return slot ? { ...slot } : null;
  }

  createDefaultForSlot(index) {
    const character = this._defaultCharacter(index);
    this.slots[index] = character;
    this._saveSlots();
    return { ...character };
  }

  saveSlot(index, characterMeta) {
    if (index < 0 || index >= this.maxSlots) return false;
    const normalized = this._normalizeCharacter(characterMeta, index);
    normalized.updatedAt = Date.now();
    if (!normalized.createdAt) normalized.createdAt = Date.now();
    this.slots[index] = normalized;
    return this._saveSlots();
  }

  deleteSlot(index) {
    if (index < 0 || index >= this.maxSlots) return false;
    this.slots[index] = null;
    return this._saveSlots();
  }
}

export default CharacterManager;
