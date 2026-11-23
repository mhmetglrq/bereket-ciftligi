import { MAX_OFFLINE_MS, emptyInventory } from './data';
import { isRipe } from './crops';
import { settleCoop } from './coop';
import type { GameState, Inventory } from './types';
import { advance } from './production';
import { refill } from './orders';
import { rollDailyQuests } from './daily';
import type { BuildingId, GoodId, TreeId } from './types';

export interface AwayReport {
  elapsedMs: number;
  appliedMs: number;
  capped: boolean;
  ripened: Inventory;
  eggs: number;
  hungry: number;
  production: Partial<Record<BuildingId, Partial<Record<GoodId, number>>>>;
  trees: Partial<Record<TreeId, number>>;
}

export function advanceOffline(
  state: GameState, now: number
): { state: GameState; summary: AwayReport | null } {
  const delta = now - state.savedAt;
  const appliedMs = Math.max(0, Math.min(MAX_OFFLINE_MS, delta));
  const correction = delta - appliedMs;
  const cells = state.cells.map(cell => cell.kind === 'planted' ? {
    ...cell,
    plantedAt: cell.plantedAt + correction,
    ...(cell.water ? {
      water: {
        at: cell.water.at + correction,
        until: cell.water.until + correction
      }
    } : {})
  } : cell.kind === 'tree' ? { ...cell, plantedAt: cell.plantedAt + correction, ripeAt: cell.ripeAt + correction } : cell);
  const shifted: GameState = {
    ...state,
    cells,
    buildings: Object.fromEntries(Object.entries(state.buildings).map(([id, b]) => [id, { ...b, queue: b.queue.map(job => ({ ...job, startAt: job.startAt + correction, endsAt: job.endsAt + correction })) }])) as GameState['buildings'],
    coop: {
      ...state.coop,
      chickens: state.coop.chickens.map(chicken => ({
        ...chicken,
        fedAt: chicken.fedAt === null ? null : chicken.fedAt + correction
      }))
    },
    savedAt: now
  };
  // With a backwards clock, preserve all progress without producing new eggs.
  const settled = rollDailyQuests(refill(appliedMs > 0 ? advance(settleCoop(shifted, now), now) : shifted, now), now);
  const production: AwayReport['production'] = {};
  const trees: AwayReport['trees'] = {};
  for (const id of ['mill', 'bakery'] as const) {
    const output: Partial<Record<GoodId, number>> = {};
    for (const item of ['flour', 'bread', 'cake'] as const) {
      const gained = (settled.buildings[id].readyOutput[item] ?? 0) - (state.buildings[id].readyOutput[item] ?? 0);
      if (gained > 0) output[item] = gained;
    }
    if (Object.keys(output).length) production[id] = output;
  }
  const ripened = emptyInventory();
  if (appliedMs > 0) {
    cells.forEach((cell, index) => {
      const previous = state.cells[index];
      if (cell.kind === 'tree' && previous.kind === 'tree' && previous.ripeAt > state.savedAt && cell.ripeAt <= now) trees[cell.treeId] = (trees[cell.treeId] ?? 0) + 1;
      if (cell.kind === 'planted' &&
        !isRipe(state.cells[index], state.savedAt) && isRipe(cell, now)) {
        ripened[cell.cropId]++;
      }
    });
  }
  return {
    state: settled,
    summary: delta > 0 ? {
      elapsedMs: delta,
      appliedMs,
      capped: delta > MAX_OFFLINE_MS,
      ripened,
      eggs: settled.coop.pendingEggs - state.coop.pendingEggs,
      hungry: settled.coop.chickens.filter(chicken => chicken.fedAt === null).length,
      production,
      trees
    } : null
  };
}
