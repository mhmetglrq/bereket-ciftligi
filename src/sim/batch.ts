import { applyAction } from './actions';
import type { CropId, GameEvent, GameState, Reason, Tool } from './types';
export function applyBatch(state: GameState, tool: Tool, cellIds: string[], now: number = state.savedAt, cropId: CropId = 'wheat'): { state: GameState; events: GameEvent[]; stoppedReason?: Reason } {
  const events: GameEvent[] = [];
  for (const cellId of new Set(cellIds)) {
    const cell = state.cells.find(c => c.id === cellId);
    if (!cell || (cell.kind === 'tree' && tool !== 'harvest')) continue;
    const result = applyAction(state, tool === 'plant' ? { type: tool, cellId, cropId } : { type: tool, cellId }, now);
    if (!result.ok) {
      if (result.reason === 'noSeeds' || result.reason === 'locked') return { state, events, stoppedReason: result.reason };
      continue;
    }
    state = result.state; events.push(...result.events);
  }
  return { state, events };
}
