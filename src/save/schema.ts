import { CROP_IDS, QUESTS } from '../sim/data';
import type { GameState } from '../sim/types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const natural = (value: unknown): value is number =>
  finite(value) && Number.isSafeInteger(value) && value >= 0;
const inventory = (value: unknown): boolean =>
  record(value) && CROP_IDS.every(id => natural(value[id]));

export function isGameState(value: unknown): value is GameState {
  if (
    !record(value) ||
    value.version !== 1 ||
    !finite(value.createdAt) ||
    !finite(value.savedAt) ||
    (value.gridSize !== 6 && value.gridSize !== 8) ||
    !natural(value.gold) ||
    !inventory(value.seeds) ||
    !inventory(value.produce) ||
    !Array.isArray(value.cells) ||
    value.cells.length !== value.gridSize * value.gridSize ||
    !record(value.quests)
  ) return false;

  const size = value.gridSize;
  const seen = new Set<string>();
  for (const cell of value.cells) {
    if (
      !record(cell) ||
      !natural(cell.x) || cell.x >= size ||
      !natural(cell.y) || cell.y >= size ||
      cell.id !== `${cell.x},${cell.y}` ||
      typeof cell.id !== 'string' ||
      seen.has(cell.id)
    ) return false;
    seen.add(cell.id);
    if (cell.kind === 'planted') {
      if (
        !CROP_IDS.includes(cell.cropId as typeof CROP_IDS[number]) ||
        !finite(cell.plantedAt)
      ) return false;
    } else if (cell.kind !== 'untilled' && cell.kind !== 'tilled') {
      return false;
    }
  }

  const quests = value.quests;
  return QUESTS.every(quest => {
    const progress = quests[quest.id];
    if (!record(progress) || !natural(progress.count) || progress.count > quest.target) {
      return false;
    }
    if (progress.status === 'active') return progress.count < quest.target;
    return (progress.status === 'complete' || progress.status === 'claimed') &&
      progress.count === quest.target;
  });
}

export function versionOf(value: unknown): number | null {
  return record(value) && natural(value.version) ? value.version : null;
}
