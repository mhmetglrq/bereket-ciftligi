import { CROP_IDS, CROPS } from './data';
import type { CropId, GameEvent } from './types';

const THRESHOLDS = [0, 50, 150, 300, 500] as const;

export function thresholdFor(level: number): number {
  return level <= 5 ? THRESHOLDS[Math.max(0, level - 1)] : 500 + (level - 5) * 250;
}

export function levelOf(xp: number): number {
  if (xp >= 500) return 5 + Math.floor((xp - 500) / 250);
  for (let level = 4; level >= 1; level--) {
    if (xp >= thresholdFor(level)) return level;
  }
  return 1;
}

export function xpProgress(xp: number): { level: number; current: number; required: number } {
  const level = levelOf(xp);
  const base = thresholdFor(level);
  return { level, current: xp - base, required: thresholdFor(level + 1) - base };
}

export function isUnlocked(cropId: CropId, xp: number): boolean {
  return levelOf(xp) >= CROPS[cropId].level;
}

export function unlocksBetween(before: number, after: number): CropId[] {
  const previous = levelOf(before);
  const next = levelOf(after);
  return CROP_IDS.filter(id => CROPS[id].level > previous && CROPS[id].level <= next);
}

export function xpFor(events: GameEvent[]): number {
  return events.reduce((sum, event) => sum + event.amount * (
    event.type === 'harvest' ? 5 :
    event.type === 'sell' ? 1 :
    event.type === 'collectEgg' ? 3 : 0
  ), 0);
}
