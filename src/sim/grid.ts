import { QUESTS, START_GOLD, START_WHEAT_SEEDS, emptyInventory, featureDefaults } from './data';
import type { Cell, GameState } from './types';
import { refill } from './orders';
import { rollDailyQuests } from './daily';

export function createGrid(size: 6 | 8): Cell[] {
  return Array.from({ length: size * size }, (_, index) => {
    const x = index % size;
    const y = Math.floor(index / size);
    return { id: `${x},${y}`, x, y, kind: 'untilled' };
  });
}

export function expandedCells(cells: Cell[]): Cell[] {
  return [...cells, ...createGrid(8).filter(cell => cell.x >= 6 || cell.y >= 6)];
}

export function newGame(now: number): GameState {
  return rollDailyQuests(refill({
    version: 3,
    ...featureDefaults(),
    createdAt: now,
    savedAt: now,
    gridSize: 6,
    gold: START_GOLD,
    xp: 0,
    eggs: 0,
    coop: { owned: false, chickens: [], pendingEggs: 0 },
    seeds: { ...emptyInventory(), wheat: START_WHEAT_SEEDS },
    produce: emptyInventory(),
    cells: createGrid(6),
    quests: Object.fromEntries(
      QUESTS.map(quest => [quest.id, { count: 0, status: 'active' as const }])
    )
  }, now), now);
}
