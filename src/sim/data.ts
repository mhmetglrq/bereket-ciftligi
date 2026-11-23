import type { CropId, Inventory } from './types';

export const CROP_IDS: CropId[] = ['wheat', 'carrot', 'tomato'];
export const CROPS = {
  wheat: { seedCost: 5, growMs: 30_000, salePrice: 8, icon: '🌾' },
  carrot: { seedCost: 10, growMs: 60_000, salePrice: 18, icon: '🥕' },
  tomato: { seedCost: 20, growMs: 120_000, salePrice: 40, icon: '🍅' }
} as const;
export const QUESTS = [
  { id: 'wheat10', event: 'harvest', cropId: 'wheat', target: 10, reward: 75 },
  { id: 'sell10', event: 'sell', cropId: null, target: 10, reward: 100 },
  { id: 'harvest25', event: 'harvest', cropId: null, target: 25, reward: 200 }
] as const;
export const EXPANSION_COST = 500;
export const START_GOLD = 50;
export const START_WHEAT_SEEDS = 5;
export const MAX_OFFLINE_MS = 7 * 24 * 60 * 60 * 1000;
export const OFFLINE_STEP_MS = 60_000;
export const DAY_MS = 240_000;
export const DRIVER_MS = 1_000;
export const AUTOSAVE_MS = 10_000;
export const SAVE_DEBOUNCE_MS = 500;
export const emptyInventory = (): Inventory => ({ wheat: 0, carrot: 0, tomato: 0 });
