import { CROP_IDS, TREES } from './data';
import { consume, itemPrice } from './inventory';
import { hashString, mulberry32 } from './rng';
import { isUnlocked, levelOf } from './xp';
import type { GameState, ItemId, Order, Result } from './types';
import { inSeason, dayKey } from './seasons';
export function unlockedItems(state: GameState): ItemId[] {
  const items: ItemId[] = CROP_IDS.filter(id => isUnlocked(id, state.xp) && (inSeason(id, state.season) || state.produce[id] > 0));
  if (!items.length) items.push('carrot');
  if (state.coop.owned) items.push('eggs');
  if (state.buildings.mill.owned) items.push('flour');
  if (state.buildings.mill.owned && state.buildings.bakery.owned) {
    items.push('bread');
    if (state.coop.owned) items.push('cake');
  }
  for (const id of ['apple', 'cherry'] as const) if (levelOf(state.xp) >= TREES[id].level) items.push(id);
  return items;
}
export function generate(state: GameState, slot: number, generation: number): Order {
  const id = `${state.createdAt}:${dayKey(state)}:${slot}:${generation}`;
  const rng = mulberry32(hashString(id));
  const pool = unlockedItems(state);
  const count = Math.min(pool.length, 1 + Math.floor(rng() * 3));
  const items: Partial<Record<ItemId, number>> = {};
  let value = 0;
  for (let i = 0; i < count; i++) {
    const item = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const qty = 1 + Math.floor(rng() * Math.min(6, levelOf(state.xp) + 2));
    items[item] = qty; value += qty * itemPrice(item);
  }
  return { id, items, gold: Math.round(value * 1.25), xp: Math.max(10, Math.round(value / 4)) };
}
export function refill(state: GameState, now: number): GameState {
  let changed = false;
  const orders = state.orders.map((slot, i) => {
    if (slot.order || state.elapsedMinutes < slot.refillAt) return slot;
    changed = true;
    return { ...slot, order: generate(state, i, slot.generation) };
  });
  return changed ? { ...state, orders } : state;
}
function finish(state: GameState, index: number, now: number): GameState {
  return { ...state, orders: state.orders.map((slot, i) => i === index ? { order: null, generation: slot.generation + 1, refillAt: state.elapsedMinutes + 1560 - state.minute } : slot) };
}
export function deliver(state: GameState, index: number, now: number): Result {
  const order = state.orders[index]?.order;
  if (!order) return { ok: false, reason: 'nothingReady' };
  const paid = consume(state, order.items);
  if (!paid) return { ok: false, reason: 'missingIngredients' };
  return { ok: true, state: finish({ ...paid, gold: paid.gold + order.gold, xp: paid.xp + order.xp }, index, now), events: [{ type: 'order', amount: 1 }] };
}
export function reject(state: GameState, index: number, now: number): Result {
  if (!state.orders[index]?.order) return { ok: false, reason: 'nothingReady' };
  return { ok: true, state: finish(state, index, now), events: [] };
}
