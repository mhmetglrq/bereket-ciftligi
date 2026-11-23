import { getStock, itemPrice, setStock } from './inventory';
import type { GameState, ItemId } from './types';
export interface Shipment { items: Partial<Record<ItemId, number>>; total: number }
export function shipPut(state: GameState, id: ItemId, amount = 1): GameState {
  if (!Number.isSafeInteger(amount) || amount <= 0 || getStock(state, id) < amount) return state;
  return { ...setStock(state, id, getStock(state, id) - amount), shipping: { ...state.shipping, [id]: (state.shipping[id] ?? 0) + amount } };
}
export function shipTake(state: GameState, id: ItemId, amount = 1): GameState {
  if (!Number.isSafeInteger(amount) || amount <= 0 || (state.shipping[id] ?? 0) < amount) return state;
  return { ...setStock(state, id, getStock(state, id) + amount), shipping: { ...state.shipping, [id]: (state.shipping[id] ?? 0) - amount } };
}
export function settleShipping(state: GameState): { state: GameState; shipment: Shipment } {
  const total = Object.entries(state.shipping).reduce((sum, [id, n]) => sum + itemPrice(id as ItemId) * n, 0);
  return { state: { ...state, gold: state.gold + total, shipping: {} }, shipment: { items: { ...state.shipping }, total } };
}
