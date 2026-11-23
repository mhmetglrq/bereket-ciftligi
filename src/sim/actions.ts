import { isRipe } from './crops';
import { buyExpansion, buySeed, sell } from './economy';
import { applyQuestEvents, claimQuest } from './quests';
import { rescue } from './rescue';
import type { Action, Cell, CropId, GameState, Result, Tool } from './types';

export { buyExpansion, buySeed, sell, claimQuest };

function replace(state: GameState, cell: Cell): GameState {
  return { ...state, cells: state.cells.map(item => item.id === cell.id ? cell : item) };
}

export function till(state: GameState, cellId: string): Result {
  const cell = state.cells.find(item => item.id === cellId);
  if (!cell) return { ok: false, reason: 'missingCell' };
  if (cell.kind !== 'untilled') return { ok: false, reason: 'alreadyTilled' };
  return {
    ok: true,
    state: replace(state, { ...cell, kind: 'tilled' }),
    events: [{ type: 'till', amount: 1 }]
  };
}

export function plant(
  state: GameState,
  cellId: string,
  cropId: CropId,
  now: number
): Result {
  const cell = state.cells.find(item => item.id === cellId);
  if (!cell) return { ok: false, reason: 'missingCell' };
  if (cell.kind === 'untilled') return { ok: false, reason: 'needTill' };
  if (cell.kind === 'planted') return { ok: false, reason: 'occupied' };
  if (state.seeds[cropId] < 1) return { ok: false, reason: 'noSeeds' };
  return {
    ok: true,
    state: {
      ...replace(state, { ...cell, kind: 'planted', cropId, plantedAt: now }),
      seeds: { ...state.seeds, [cropId]: state.seeds[cropId] - 1 }
    },
    events: [{ type: 'plant', cropId, amount: 1 }]
  };
}

export function harvest(state: GameState, cellId: string, now: number): Result {
  const cell = state.cells.find(item => item.id === cellId);
  if (!cell) return { ok: false, reason: 'missingCell' };
  if (cell.kind !== 'planted') return { ok: false, reason: 'notPlanted' };
  if (!isRipe(cell, now)) return { ok: false, reason: 'notRipe' };
  return {
    ok: true,
    state: {
      ...replace(state, { id: cell.id, x: cell.x, y: cell.y, kind: 'tilled' }),
      produce: { ...state.produce, [cell.cropId]: state.produce[cell.cropId] + 1 }
    },
    events: [{ type: 'harvest', cropId: cell.cropId, amount: 1 }]
  };
}

export function applyAction(state: GameState, action: Action, now: number): Result {
  let result: Result;
  switch (action.type) {
    case 'till': result = till(state, action.cellId); break;
    case 'plant': result = plant(state, action.cellId, action.cropId, now); break;
    case 'harvest': result = harvest(state, action.cellId, now); break;
    case 'sell': result = sell(state, action.cropId, action.amount); break;
    case 'buySeed': result = buySeed(state, action.cropId, action.amount); break;
    case 'expand': result = buyExpansion(state); break;
    case 'claim': result = claimQuest(state, action.questId); break;
  }
  if (!result.ok) return result;
  const checked = rescue(applyQuestEvents(result.state, result.events));
  return {
    ok: true,
    state: { ...checked.state, savedAt: now },
    events: checked.gifted
      ? [...result.events, { type: 'rescue', amount: 5 }]
      : result.events
  };
}

export function canApply(
  tool: Tool,
  cell: Cell,
  state: GameState,
  now: number,
  cropId: CropId = 'wheat'
): boolean {
  switch (tool) {
    case 'till': return till(state, cell.id).ok;
    case 'plant': return plant(state, cell.id, cropId, now).ok;
    case 'harvest': return harvest(state, cell.id, now).ok;
  }
}
