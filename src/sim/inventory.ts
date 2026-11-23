import { CROP_IDS, CROPS, EGG_PRICE, GOODS } from './data';
import type { CropId, GameState, GoodId, ItemId } from './types';
export type { ItemId } from './types';
export const ITEM_IDS: ItemId[] = [...CROP_IDS, 'eggs', 'flour', 'bread', 'cake', 'apple', 'cherry'];
export const itemPrice = (id: ItemId): number => id === 'eggs' ? EGG_PRICE : CROP_IDS.includes(id as CropId) ? CROPS[id as CropId].salePrice : GOODS[id as GoodId];
export const getStock = (state: GameState, id: ItemId): number => id === 'eggs' ? state.eggs : CROP_IDS.includes(id as CropId) ? state.produce[id as CropId] : state.goods[id as GoodId];
export function setStock(state: GameState, id: ItemId, count: number): GameState {
  if (id === 'eggs') return { ...state, eggs: count };
  return CROP_IDS.includes(id as CropId) ? { ...state, produce: { ...state.produce, [id]: count } } : { ...state, goods: { ...state.goods, [id]: count } };
}
export const canAfford = (state: GameState, items: Partial<Record<ItemId, number>>): boolean =>
  Object.entries(items).every(([id, qty]) => Number.isSafeInteger(qty) && qty > 0 && getStock(state, id as ItemId) >= qty);
export function consume(state: GameState, items: Partial<Record<ItemId, number>>): GameState | null {
  if (!canAfford(state, items)) return null;
  for (const [id, qty] of Object.entries(items)) state = setStock(state, id as ItemId, getStock(state, id as ItemId) - qty);
  return state;
}
