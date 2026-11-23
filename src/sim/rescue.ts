import { CROP_IDS, CROPS, START_WHEAT_SEEDS } from './data';
import type { GameState } from './types';

export function rescue(state: GameState): { state: GameState; gifted: boolean } {
  const stuck =
    state.gold < CROPS.wheat.seedCost &&
    CROP_IDS.every(id => state.seeds[id] === 0 && state.produce[id] === 0) &&
    state.cells.every(cell => cell.kind !== 'planted');
  return stuck
    ? {
        state: {
          ...state,
          seeds: { ...state.seeds, wheat: START_WHEAT_SEEDS }
        },
        gifted: true
      }
    : { state, gifted: false };
}
