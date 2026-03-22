// ========================================
// CraftingSystem - Recipe Crafting
// Handles crafting recipes and UI
// ========================================

export class CraftingSystem {
  constructor(gameData) {
    this.gameData = gameData;
    this.recipes = [
      {
        id: 'wooden_axe',
        name: 'Wooden Axe',
        description: 'Basic tool for faster tree harvesting',
        ingredients: [
          { itemId: 'wood', amount: 5 },
          { itemId: 'stone', amount: 2 }
        ],
        result: { itemId: 'wooden_axe', amount: 1 },
        craftTime: 2.0 // seconds
      },
      {
        id: 'stick',
        name: 'Stick',
        description: 'Basic crafting material',
        ingredients: [
          { itemId: 'wood', amount: 2 }
        ],
        result: { itemId: 'stick', amount: 3 },
        craftTime: 1.0
      },
      {
        id: 'stone_axe',
        name: 'Stone Axe',
        description: 'Improved tool for even faster harvesting',
        ingredients: [
          { itemId: 'wood', amount: 3 },
          { itemId: 'stone', amount: 5 }
        ],
        result: { itemId: 'stone_axe', amount: 1 },
        craftTime: 3.0
      }
    ];
    this.isCrafting = false;
    this.currentRecipe = null;
    this.craftProgress = 0; // 0-1
  }

  getRecipes() {
    return this.recipes;
  }

  getRecipe(recipeId) {
    return this.recipes.find(r => r.id === recipeId);
  }

  canCraft(recipeId, inventory) {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return false;

    for (const ing of recipe.ingredients) {
      const count = inventory.items?.[ing.itemId] || 0;
      if (count < ing.amount) return false;
    }
    return true;
  }

  startCraft(recipeId, inventory) {
    if (!this.canCraft(recipeId, inventory)) {
      return false;
    }

    this.currentRecipe = this.getRecipe(recipeId);
    this.isCrafting = true;
    this.craftProgress = 0;
    return true;
  }

  update(dt, inventory) {
    if (!this.isCrafting || !this.currentRecipe) return;

    this.craftProgress += dt / this.currentRecipe.craftTime;

    if (this.craftProgress >= 1.0) {
      this.completeCraft(inventory);
    }
  }

  completeCraft(inventory) {
    if (!this.currentRecipe) return;

    // Remove ingredients
    for (const ing of this.currentRecipe.ingredients) {
      inventory.items[ing.itemId] = (inventory.items[ing.itemId] || 0) - ing.amount;
    }

    // Add result
    const result = this.currentRecipe.result;
    inventory.items[result.itemId] = (inventory.items[result.itemId] || 0) + result.amount;

    this.isCrafting = false;
    this.craftProgress = 0;
    this.currentRecipe = null;
  }

  cancelCraft() {
    this.isCrafting = false;
    this.craftProgress = 0;
    this.currentRecipe = null;
  }
}

export default CraftingSystem;
