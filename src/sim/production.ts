import { BUILDINGS, RECIPES } from './data';
import { consume, getStock, setStock } from './inventory';
import { levelOf } from './xp';
import type { BuildingId, GameState, ItemId, RecipeId, Result } from './types';
const success = (state: GameState): Result => ({ ok: true, state, events: [{ type: 'production', amount: 1 }] });
export function advance(state: GameState, now: number): GameState {
  now = Math.max(state.savedAt, now);
  let buildings = state.buildings;
  for (const id of ['mill', 'bakery'] as const) {
    const building = buildings[id];
    const finished = building.queue.filter(job => job.endsAt <= now);
    if (!finished.length) continue;
    const readyOutput = { ...building.readyOutput };
    for (const job of finished) readyOutput[job.recipeId] = (readyOutput[job.recipeId] ?? 0) + 1;
    buildings = { ...buildings, [id]: { ...building, readyOutput, queue: building.queue.filter(job => job.endsAt > now) } };
  }
  return buildings === state.buildings ? state : { ...state, buildings };
}
export function buyBuilding(state: GameState, id: BuildingId): Result {
  if (state.buildings[id].owned) return { ok: false, reason: 'alreadyOwned' };
  if (levelOf(state.xp) < BUILDINGS[id].level) return { ok: false, reason: 'locked' };
  if (state.gold < BUILDINGS[id].cost) return { ok: false, reason: 'notEnoughGold' };
  return success({ ...state, gold: state.gold - BUILDINGS[id].cost, buildings: { ...state.buildings, [id]: { ...state.buildings[id], owned: true } } });
}
export function queue(state: GameState, id: BuildingId, recipeId: RecipeId, now: number): Result {
  state = advance(state, now);
  const building = state.buildings[id];
  if (!building.owned || RECIPES[recipeId].building !== id) return { ok: false, reason: 'locked' };
  if (building.queue.length >= 3) return { ok: false, reason: 'queueFull' };
  const paid = consume(state, RECIPES[recipeId].inputs);
  if (!paid) return { ok: false, reason: 'missingIngredients' };
  const startAt = Math.max(now, state.savedAt, building.queue.at(-1)?.endsAt ?? now);
  const baseId = `${id}:${startAt}:${recipeId}`;
  let jobId = baseId;
  let suffix = 0;
  while (building.queue.some(job => job.id === jobId)) jobId = `${baseId}:${++suffix}`;
  const job = { id: jobId, recipeId, startAt, endsAt: startAt + RECIPES[recipeId].ms };
  return success({ ...paid, buildings: { ...paid.buildings, [id]: { ...building, queue: [...building.queue, job] } } });
}
export function cancel(state: GameState, id: BuildingId, jobId: string, now: number): Result {
  state = advance(state, now);
  const building = state.buildings[id];
  const index = building.queue.findIndex(job => job.id === jobId);
  const job = building.queue[index];
  if (!job) return { ok: false, reason: 'nothingReady' };
  if (Math.max(now, state.savedAt) >= job.startAt) return { ok: false, reason: 'jobStarted' };
  for (const [item, qty] of Object.entries(RECIPES[job.recipeId].inputs)) state = setStock(state, item as ItemId, getStock(state, item as ItemId) + qty);
  const duration = job.endsAt - job.startAt;
  return success({ ...state, buildings: { ...state.buildings, [id]: { ...building, queue: building.queue.filter(j => j.id !== jobId).map((j, i) => i >= index ? { ...j, startAt: j.startAt - duration, endsAt: j.endsAt - duration } : j) } } });
}
export function collect(state: GameState, id: BuildingId, now: number): Result {
  state = advance(state, now);
  const building = state.buildings[id];
  if (!Object.values(building.readyOutput).some(qty => qty > 0)) return { ok: false, reason: 'nothingReady' };
  for (const [item, qty] of Object.entries(building.readyOutput)) state = setStock(state, item as ItemId, getStock(state, item as ItemId) + qty);
  return success({ ...state, buildings: { ...state.buildings, [id]: { ...building, readyOutput: {} } } });
}
