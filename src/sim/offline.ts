import { CROP_IDS, MAX_OFFLINE_MS, OFFLINE_STEP_MS, emptyInventory } from './data';
import { isRipe } from './crops';
import type { GameState, Inventory } from './types';

export interface AwayReport {
  elapsedMs: number;
  appliedMs: number;
  capped: boolean;
  ripened: Inventory;
}

export function advanceOffline(
  state: GameState,
  now: number
): { state: GameState; summary: AwayReport | null } {
  const delta = now - state.savedAt;
  const appliedMs = Math.max(0, Math.min(MAX_OFFLINE_MS, delta));
  // The correction handles both capped absences and a backwards system clock.
  const correction = delta - appliedMs;
  const cells = state.cells.map(cell => cell.kind === 'planted'
    ? { ...cell, plantedAt: cell.plantedAt + correction }
    : cell);
  const ripened = emptyInventory();

  // Growth is analytic: there are no per-minute side effects to simulate.
  // The bounded step count documents the offline simulation horizon.
  const steps = Math.ceil(appliedMs / OFFLINE_STEP_MS);
  if (steps > 0) {
    for (let index = 0; index < cells.length; index++) {
      const before = state.cells[index];
      const after = cells[index];
      if (
        after.kind === 'planted' &&
        !isRipe(before, state.savedAt) &&
        isRipe(after, now)
      ) {
        ripened[after.cropId]++;
      }
    }
  }
  return {
    state: { ...state, cells, savedAt: now },
    summary: delta > 0
      ? {
          elapsedMs: delta,
          appliedMs,
          capped: delta > MAX_OFFLINE_MS,
          ripened: Object.fromEntries(CROP_IDS.map(id => [id, ripened[id]])) as Inventory
        }
      : null
  };
}
