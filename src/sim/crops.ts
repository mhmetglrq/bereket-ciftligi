import { CROPS } from './data';
import type { Cell } from './types';

export function progressOf(cell: Cell, now: number): number {
  if (cell.kind !== 'planted') return 0;
  return Math.max(0, Math.min(1, (now - cell.plantedAt) / CROPS[cell.cropId].growMs));
}

export function stageOf(cell: Cell, now: number): 0 | 1 | 2 | 3 {
  return Math.min(3, Math.floor(progressOf(cell, now) * 4)) as 0 | 1 | 2 | 3;
}

export function isRipe(cell: Cell, now: number): boolean {
  return cell.kind === 'planted' && progressOf(cell, now) === 1;
}

export function remainingMs(cell: Cell, now: number): number {
  return cell.kind === 'planted'
    ? Math.max(0, CROPS[cell.cropId].growMs - Math.max(0, now - cell.plantedAt))
    : 0;
}
