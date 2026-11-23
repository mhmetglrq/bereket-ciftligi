import { CROPS } from './data';
import type { Cell, Water } from './types';

export function waterOverlap(water: Water, now: number): number {
  return Math.max(0, Math.min(now, water.until) - water.at);
}

export function effectiveElapsed(cell: Cell, now: number): number {
  if (cell.kind !== 'planted') return 0;
  const bonus = cell.water ? waterOverlap(cell.water, now) * 0.5 : 0;
  return Math.max(0, Math.min(CROPS[cell.cropId].growMs, now - cell.plantedAt + bonus));
}

export function progressOf(cell: Cell, now: number): number {
  return cell.kind === 'planted' ? effectiveElapsed(cell, now) / CROPS[cell.cropId].growMs : 0;
}

export function stageOf(cell: Cell, now: number): 0 | 1 | 2 | 3 {
  return Math.min(3, Math.floor(progressOf(cell, now) * 4)) as 0 | 1 | 2 | 3;
}

export function isRipe(cell: Cell, now: number): boolean {
  return cell.kind === 'planted' && progressOf(cell, now) === 1;
}

export function isWatered(cell: Cell, now: number): boolean {
  return cell.kind === 'planted' && Boolean(
    cell.water && now >= cell.water.at && now < cell.water.until
  );
}

export function remainingMs(cell: Cell, now: number): number {
  if (cell.kind !== 'planted') return 0;
  const remaining = CROPS[cell.cropId].growMs - effectiveElapsed(cell, now);
  if (!isWatered(cell, now) || !cell.water) return remaining;
  const boostedTime = Math.min(cell.water.until - now, remaining / 1.5);
  return Math.max(0, remaining - boostedTime * 0.5);
}
