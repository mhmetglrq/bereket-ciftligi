import { CROPS } from './data';
import type { Cell } from './types';

export function effectiveElapsed(cell: Cell, now: number): number {
  if (cell.kind !== 'planted') return 0;
  return cell.dead ? 0 : Math.max(0, CROPS[cell.cropId].days - remainingMs(cell, now));
}

export function progressOf(cell: Cell, now: number): number {
  return cell.kind === 'planted' && !cell.dead ? Math.max(0, 1 - remainingMs(cell, now) / (cell.growthDays ?? CROPS[cell.cropId].days)) : 0;
}

export function stageOf(cell: Cell, now: number): 0 | 1 | 2 | 3 {
  return Math.min(3, Math.floor(progressOf(cell, now) * 4)) as 0 | 1 | 2 | 3;
}

export function isRipe(cell: Cell, now: number): boolean {
  return cell.kind === 'planted' && !cell.dead && remainingMs(cell, now) === 0;
}

export function isWatered(cell: Cell, now: number): boolean {
  return Boolean(cell.wateredToday);
}

export function remainingMs(cell: Cell, now: number): number {
  if (cell.kind !== 'planted') return 0;
  return cell.daysRemaining ?? CROPS[cell.cropId].days;
}
