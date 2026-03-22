// ========================================
// WorldManager - Multiple Worlds
// Define different world configurations
// ========================================

export const WORLD_CONFIGS = {
  forest: {
    id: 'forest',
    name: 'Enchanted Forest',
    width: 2400,
    height: 1800,
    seed: 1337,
    treeCount: 42,
    rockCount: 28,
    backgroundColor: '#1a3a1a',
    description: 'Dense forest with abundant trees',
    spawnX: 1200,
    spawnY: 900,
    baseEnemySpawnsPerSecond: 0.2, // 1 enemy every 5 seconds during day
    nightEnemyMultiplier: 3.0 // 3x more spawns at night
  },
  volcanic: {
    id: 'volcanic',
    name: 'Volcanic Wasteland',
    width: 2400,
    height: 1800,
    seed: 2048,
    treeCount: 12,
    rockCount: 55,
    backgroundColor: '#3a2a1a',
    description: 'Harsh volcanic terrain with rare trees',
    spawnX: 1200,
    spawnY: 900,
    baseEnemySpawnsPerSecond: 0.3,
    nightEnemyMultiplier: 2.5
  },
  tundra: {
    id: 'tundra',
    name: 'Frozen Tundra',
    width: 2400,
    height: 1800,
    seed: 3357,
    treeCount: 20,
    rockCount: 40,
    backgroundColor: '#1a2a3a',
    description: 'Frozen wasteland, dangerous at night',
    spawnX: 1200,
    spawnY: 900,
    baseEnemySpawnsPerSecond: 0.15,
    nightEnemyMultiplier: 4.0 // Extra dangerous at night
  },
  meadow: {
    id: 'meadow',
    name: 'Peaceful Meadow',
    width: 2400,
    height: 1800,
    seed: 4456,
    treeCount: 25,
    rockCount: 15,
    backgroundColor: '#2a3a1a',
    description: 'Calm meadow, fewer enemies',
    spawnX: 1200,
    spawnY: 900,
    baseEnemySpawnsPerSecond: 0.1,
    nightEnemyMultiplier: 2.0
  }
};

export class WorldManager {
  constructor() {
    this.currentWorldId = 'forest';
    this.worlds = WORLD_CONFIGS;
  }

  getWorldConfig(worldId) {
    return this.worlds[worldId] || this.worlds.forest;
  }

  getCurrentWorldConfig() {
    return this.worlds[this.currentWorldId];
  }

  setCurrentWorld(worldId) {
    if (this.worlds[worldId]) {
      this.currentWorldId = worldId;
      return true;
    }
    return false;
  }

  getWorldList() {
    return Object.values(this.worlds);
  }

  getEnemySpawnRate(dayNightCycle) {
    const config = this.getCurrentWorldConfig();
    const baseRate = config.baseEnemySpawnsPerSecond;
    
    if (dayNightCycle.isNight) {
      return baseRate * config.nightEnemyMultiplier;
    }
    return baseRate;
  }
}

export default WorldManager;
