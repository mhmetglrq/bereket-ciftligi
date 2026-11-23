import type { CropId, Inventory, GameState, ItemId, RecipeId } from './types';

export const GOODS = { flour: 30, bread: 75, cake: 110, apple: 25, cherry: 40 } as const;
export const BUILDINGS = { mill: { cost: 200, level: 2 }, bakery: { cost: 350, level: 4 } } as const;
export const TREES = { apple: { cost: 150, level: 3, growMs: 28, regrowMs: 1 }, cherry: { cost: 250, level: 6, growMs: 28, regrowMs: 1 } } as const;
export const RECIPES: Record<RecipeId, { building: 'mill' | 'bakery'; inputs: Partial<Record<ItemId, number>>; ms: number }> = {
  flour: { building: 'mill', inputs: { wheat: 3 }, ms: 120 },
  bread: { building: 'bakery', inputs: { flour: 2 }, ms: 180 },
  cake: { building: 'bakery', inputs: { flour: 1, eggs: 2 }, ms: 240 }
};
export function featureDefaults(): Pick<GameState, 'goods' | 'buildings' | 'orders' | 'daily'> {
  return {
    goods: { flour: 0, bread: 0, cake: 0, apple: 0, cherry: 0 },
    buildings: { mill: { owned: false, queue: [], readyOutput: {} }, bakery: { owned: false, queue: [], readyOutput: {} } },
    orders: Array.from({ length: 3 }, () => ({ order: null, refillAt: 0, generation: 0 })),
    daily: { lastClaim: null, streak: 0, date: '', quests: [] }
  };
}

export const CROP_IDS: CropId[] = ['wheat', 'carrot', 'tomato', 'corn', 'strawberry', 'pumpkin'];
export const CROPS = {
  wheat: { seedCost: 10, growMs: 4, salePrice: 25, icon: '🌾', level: 1, days: 4, regrow: 0 },
  carrot: { seedCost: 15, growMs: 3, salePrice: 35, icon: '🥕', level: 1, days: 3, regrow: 0 },
  tomato: { seedCost: 50, growMs: 11, salePrice: 60, icon: '🍅', level: 1, days: 11, regrow: 4 },
  corn: { seedCost: 150, growMs: 14, salePrice: 50, icon: '🌽', level: 3, days: 14, regrow: 4 },
  strawberry: { seedCost: 100, growMs: 8, salePrice: 120, icon: '🍓', level: 5, days: 8, regrow: 4 },
  pumpkin: { seedCost: 100, growMs: 13, salePrice: 320, icon: '🎃', level: 4, days: 13, regrow: 0 }
} as const;
export const QUESTS = [
  { id: 'wheat10', event: 'harvest', cropId: 'wheat', target: 10, reward: 75 },
  { id: 'sell10', event: 'sell', cropId: null, target: 10, reward: 100 },
  { id: 'harvest25', event: 'harvest', cropId: null, target: 25, reward: 200 },
  { id: 'water5', event: 'water', cropId: null, target: 5, reward: 50 },
  { id: 'eggs3', event: 'collectEgg', cropId: null, target: 3, reward: 80 },
  { id: 'corn1', event: 'harvest', cropId: 'corn', target: 1, reward: 120 }
] as const;
export const EXPANSION_COST = 500;
export const COOP_COST = 120;
export const CHICKEN_COST = 40;
export const MAX_CHICKENS = 3;
export const EGG_PRICE = 12;
export const START_GOLD = 50;
export const START_WHEAT_SEEDS = 5;
export const AUTOSAVE_MS = 10_000;
export const SAVE_DEBOUNCE_MS = 500;
export const emptyInventory = (): Inventory => ({
  wheat: 0, carrot: 0, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0
});
