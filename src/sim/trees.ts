import { TREES } from './data';
import { getStock, setStock } from './inventory';
import { levelOf } from './xp';
import type { Cell, GameState, Result, TreeId } from './types';
export const ripeAt = (cell: Extract<Cell, { kind: 'tree' }>): number => cell.ripeAt;
export function plantTree(state: GameState, cellId: string, treeId: TreeId, now: number): Result {
  const cell = state.cells.find(c => c.id === cellId);
  if (!cell) return { ok: false, reason: 'missingCell' };
  if (cell.kind === 'planted' || cell.kind === 'tree') return { ok: false, reason: 'occupied' };
  if (levelOf(state.xp) < TREES[treeId].level) return { ok: false, reason: 'locked' };
  if (state.gold < TREES[treeId].cost) return { ok: false, reason: 'notEnoughGold' };
  return { ok: true, state: { ...state, gold: state.gold - TREES[treeId].cost, cells: state.cells.map(c => c.id === cellId ? { ...cell, kind: 'tree', treeId, plantedAt: now, ripeAt: now + TREES[treeId].growMs, harvested: false } : c) }, events: [{ type: 'tree', amount: 1 }] };
}
export function harvestTree(state: GameState, cellId: string, now: number): Result {
  const cell = state.cells.find(c => c.id === cellId);
  if (!cell || cell.kind !== 'tree') return { ok: false, reason: 'notPlanted' };
  if (now < cell.ripeAt) return { ok: false, reason: 'notRipe' };
  state = setStock(state, cell.treeId, getStock(state, cell.treeId) + 1);
  return { ok: true, state: { ...state, cells: state.cells.map(c => c.id === cellId ? { ...cell, harvested: true, ripeAt: now + TREES[cell.treeId].regrowMs } : c) }, events: [{ type: 'harvest', amount: 1 }] };
}
export function removeTree(state: GameState, cellId: string): Result {
  const cell = state.cells.find(c => c.id === cellId);
  if (!cell || cell.kind !== 'tree') return { ok: false, reason: 'notApplicable' };
  return { ok: true, state: { ...state, cells: state.cells.map(c => c.id === cellId ? { id: c.id, x: c.x, y: c.y, kind: 'untilled' } : c) }, events: [] };
}
