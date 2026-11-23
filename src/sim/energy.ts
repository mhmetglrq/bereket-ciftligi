import type { GameState, Result } from './types';
export const MAX_ENERGY = 270;
export const FOOD = { bread: { energy: 50, cost: 75 }, cake: { energy: 90, cost: 110 } } as const;
export function eat(state: GameState, id: keyof typeof FOOD): Result {
  if (state.goods[id] < 1) return { ok: false, reason: 'noProduce' };
  return { ok: true, state: { ...state, energy: Math.min(MAX_ENERGY, state.energy + FOOD[id].energy), goods: { ...state.goods, [id]: state.goods[id] - 1 } }, events: [] };
}
export function buyFood(state: GameState, id: keyof typeof FOOD): Result {
  if (state.gold < FOOD[id].cost) return { ok: false, reason: 'notEnoughGold' };
  return { ok: true, state: { ...state, gold: state.gold - FOOD[id].cost, goods: { ...state.goods, [id]: state.goods[id] + 1 } }, events: [] };
}
