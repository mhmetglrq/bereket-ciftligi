import { CROP_IDS, MAX_CHICKENS, QUESTS } from '../sim/data';
import type { GameState } from '../sim/types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const natural = (value: unknown): value is number =>
  finite(value) && Number.isSafeInteger(value) && value >= 0;

type LegacyInventory = Record<'wheat' | 'carrot' | 'tomato', number>;
export type LegacyGameState = Omit<GameState, 'version' | 'xp' | 'eggs' | 'coop' | 'seeds' | 'produce'> & {
  version: 1;
  seeds: LegacyInventory;
  produce: LegacyInventory;
};

function validate(value: unknown, legacy: boolean): boolean {
  const ids = legacy ? ['wheat', 'carrot', 'tomato'] : CROP_IDS;
  const inventory = (item: unknown): boolean =>
    record(item) && ids.every(id => natural(item[id]));
  if (
    !record(value) || value.version !== (legacy ? 1 : 2) ||
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
  return validate(value, false);
}

export function isLegacyGameState(value: unknown): value is LegacyGameState {
  return validate(value, true);
}

export function versionOf(value: unknown): number | null {
  return record(value) && natural(value.version) ? value.version : null;
}
