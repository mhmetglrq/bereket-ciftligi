import { CROP_IDS, MAX_CHICKENS, QUESTS, RECIPES, GOODS } from '../sim/data';
import { ITEM_IDS } from '../sim/inventory';
import type { GameState } from '../sim/types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const natural = (value: unknown): value is number =>
  finite(value) && Number.isSafeInteger(value) && value >= 0;

type LegacyInventory = Record<'wheat' | 'carrot' | 'tomato', number>;
export type V2GameState = Omit<GameState, 'version' | 'goods' | 'buildings' | 'orders' | 'daily'> & { version: 2 };
export type LegacyGameState = Omit<V2GameState, 'version' | 'xp' | 'eggs' | 'coop' | 'seeds' | 'produce'> & {
  version: 1;
  seeds: LegacyInventory;
  produce: LegacyInventory;
};

function validate(value: unknown, legacy: boolean, version = legacy ? 1 : 2): boolean {
  const ids = legacy ? ['wheat', 'carrot', 'tomato'] : CROP_IDS;
  const inventory = (item: unknown): boolean =>
    record(item) && ids.every(id => natural(item[id]));
  if (
    !record(value) || value.version !== version ||
    !finite(value.createdAt) || !finite(value.savedAt) ||
    (value.gridSize !== 6 && value.gridSize !== 8) ||
    !natural(value.gold) || !inventory(value.seeds) || !inventory(value.produce) ||
    !Array.isArray(value.cells) || value.cells.length !== value.gridSize * value.gridSize ||
    !record(value.quests)
  ) return false;

  if (!legacy) {
    if (!natural(value.xp) || !natural(value.eggs) || !record(value.coop)) return false;
    const coop = value.coop;
    if (
      typeof coop.owned !== 'boolean' || !natural(coop.pendingEggs) ||
      !Array.isArray(coop.chickens) || coop.chickens.length > MAX_CHICKENS ||
      (!coop.owned && (coop.chickens.length > 0 || coop.pendingEggs > 0))
    ) return false;
    const chickenIds = new Set<string>();
    for (const chicken of coop.chickens) {
      if (
        !record(chicken) || typeof chicken.id !== 'string' || chicken.id.length === 0 ||
        chickenIds.has(chicken.id) ||
        (chicken.fedAt !== null && !finite(chicken.fedAt))
      ) return false;
      chickenIds.add(chicken.id);
    }
  }

  const seen = new Set<string>();
  for (const cell of value.cells) {
    if (
      !record(cell) || !natural(cell.x) || cell.x >= value.gridSize ||
      !natural(cell.y) || cell.y >= value.gridSize ||
      typeof cell.id !== 'string' || cell.id !== `${cell.x},${cell.y}` || seen.has(cell.id)
    ) return false;
    seen.add(cell.id);
    if (cell.kind === 'planted') {
      if (typeof cell.cropId !== 'string' || !ids.includes(cell.cropId) || !finite(cell.plantedAt)) {
        return false;
      }
      if (cell.water !== undefined) {
        if (
          legacy || !record(cell.water) || !finite(cell.water.at) || !finite(cell.water.until) ||
          cell.water.until <= cell.water.at || cell.water.at < cell.plantedAt
        ) return false;
      }
    } else if (cell.kind === 'tree' && version === 3) {
      if (!['apple', 'cherry'].includes(String(cell.treeId)) || !finite(cell.plantedAt) || !finite(cell.ripeAt) || cell.ripeAt < cell.plantedAt || typeof cell.harvested !== 'boolean' || cell.water !== undefined) return false;
    } else if (cell.kind !== 'untilled' && cell.kind !== 'tilled') {
      return false;
    } else if (cell.water !== undefined) {
      return false;
    }
  }

  const quests = value.quests;
  return QUESTS.filter(quest => !legacy || ['wheat10', 'sell10', 'harvest25'].includes(quest.id))
    .every(quest => {
      const progress = quests[quest.id];
      if (!record(progress) || !natural(progress.count) || progress.count > quest.target) return false;
      if (progress.status === 'active') return progress.count < quest.target;
      return (progress.status === 'complete' || progress.status === 'claimed') &&
        progress.count === quest.target;
    });
}

export function isGameState(value: unknown): value is GameState {
  if (!validate(value, false, 3) || !record(value)) return false;
  if (!record(value.goods) || !Object.keys(GOODS).every(id => natural((value.goods as Record<string, unknown>)[id]))) return false;
  if (!record(value.buildings)) return false;
  for (const id of ['mill', 'bakery'] as const) {
    const building = value.buildings[id];
    if (!record(building) || typeof building.owned !== 'boolean' || !Array.isArray(building.queue) || building.queue.length > 3 || !record(building.readyOutput)) return false;
    if (!building.owned && (building.queue.length || Object.values(building.readyOutput).some(qty => qty !== 0))) return false;
    if (!Object.entries(building.readyOutput).every(([item, qty]) => item in RECIPES && RECIPES[item as keyof typeof RECIPES].building === id && natural(qty))) return false;
    let end = -Infinity;
    const seen = new Set<string>();
    for (const job of building.queue) {
      if (!record(job) || typeof job.id !== 'string' || seen.has(job.id) || typeof job.recipeId !== 'string' || !(job.recipeId in RECIPES) || RECIPES[job.recipeId as keyof typeof RECIPES].building !== id || !finite(job.startAt) || !finite(job.endsAt) || job.startAt < end || job.endsAt - job.startAt !== RECIPES[job.recipeId as keyof typeof RECIPES].ms) return false;
      end = job.endsAt; seen.add(job.id);
    }
  }
  if (!Array.isArray(value.orders) || value.orders.length !== 3) return false;
  for (const slot of value.orders) {
    if (!record(slot) || !finite(slot.refillAt) || !natural(slot.generation)) return false;
    if (slot.order !== null) {
      const order = slot.order;
      if (!record(order) || typeof order.id !== 'string' || !natural(order.gold) || !natural(order.xp) || !record(order.items)) return false;
      const entries = Object.entries(order.items);
      if (entries.length < 1 || entries.length > 3 || !entries.every(([id, qty]) => ITEM_IDS.includes(id as typeof ITEM_IDS[number]) && natural(qty) && qty > 0)) return false;
    }
  }
  const daily = value.daily;
  const date = (v: unknown): boolean => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const parsed = new Date(`${v}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
  };
  if (!record(daily) || (daily.lastClaim !== null && !date(daily.lastClaim)) || !natural(daily.streak) || daily.streak > 7 || (daily.date !== '' && !date(daily.date)) || !Array.isArray(daily.quests) || (daily.date === '' ? daily.quests.length !== 0 : daily.quests.length !== 3)) return false;
  if ((daily.lastClaim === null) !== (daily.streak === 0)) return false;
  if (new Set(daily.quests.map(q => record(q) ? q.id : null)).size !== daily.quests.length) return false;
  return daily.quests.every(q => record(q) && typeof q.id === 'string' && ['till', 'plant', 'harvest', 'water', 'sell', 'collectEgg'].includes(String(q.event)) && natural(q.target) && q.target > 0 && natural(q.count) && q.count <= q.target && typeof q.claimed === 'boolean' && (!q.claimed || q.count === q.target) && natural(q.gold) && natural(q.xp));
}

export function isV2GameState(value: unknown): value is V2GameState { return validate(value, false); }

export function isLegacyGameState(value: unknown): value is LegacyGameState {
  return validate(value, true);
}

export function versionOf(value: unknown): number | null {
  return record(value) && natural(value.version) ? value.version : null;
}
