import { MAX_OFFLINE_MS, emptyInventory } from './data';
import { isRipe } from './crops';
import { settleCoop } from './coop';
import type { GameState, Inventory } from './types';

export interface AwayReport {
  elapsedMs: number;
  appliedMs: number;
  capped: boolean;
  ripened: Inventory;
  eggs: number;
  hungry: number;
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
  } : cell);
  const shifted: GameState = {
    ...state,
    cells,
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
  const settled = appliedMs > 0 ? settleCoop(shifted, now) : shifted;
  const ripened = emptyInventory();
  if (appliedMs > 0) {
    cells.forEach((cell, index) => {
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
      hungry: settled.coop.chickens.filter(chicken => chicken.fedAt === null).length
    } : null
  };
}
