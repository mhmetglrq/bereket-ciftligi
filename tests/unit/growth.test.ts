import { describe, expect, it } from 'vitest';
import { isRipe, progressOf, remainingMs, stageOf } from '../../src/sim/crops';
import { CROP_IDS, CROPS } from '../../src/sim/data';
import type { Cell, CropId } from '../../src/sim/types';

const NOW = 1_000_000;

describe('growth logic', () => {
  for (const cropId of CROP_IDS) {
    describe(`crop: ${cropId}`, () => {
      const growMs = CROPS[cropId].growMs;
      const cell: Cell = {
        id: '0,0',
        x: 0,
        y: 0,
        kind: 'planted',
        cropId,
        plantedAt: NOW
      };

      it('reads growth days independently of the clock', () => {
        expect(progressOf(cell, NOW)).toBe(0);
        expect(progressOf({ ...cell, daysRemaining: growMs * 0.5 }, NOW)).toBe(0.5);
        expect(progressOf({ ...cell, daysRemaining: 0 }, NOW)).toBe(1);
        expect(progressOf(cell, NOW + growMs + 5000)).toBe(0);
        expect(progressOf(cell, NOW - 1000)).toBe(0);
      });

      it('evaluates stage at 0%, 25%, 50%, 75%, and 100%', () => {
        expect(stageOf(cell, NOW)).toBe(0);
        expect(stageOf({ ...cell, daysRemaining: growMs * 0.75 }, NOW)).toBe(1);
        expect(stageOf({ ...cell, daysRemaining: growMs * 0.5 }, NOW)).toBe(2);
        expect(stageOf({ ...cell, daysRemaining: growMs * 0.25 }, NOW)).toBe(3);
        expect(stageOf({ ...cell, daysRemaining: 0 }, NOW)).toBe(3);
      });

      it('detects ripeness only at 100% growth', () => {
        expect(isRipe(cell, NOW)).toBe(false);
        expect(isRipe(cell, NOW + growMs - 1)).toBe(false);
        expect(isRipe({ ...cell, daysRemaining: 0 }, NOW)).toBe(true);
        expect(isRipe(cell, NOW + growMs + 1000)).toBe(false);
      });

      it('calculates remaining growth days', () => {
        expect(remainingMs(cell, NOW)).toBe(growMs);
        expect(remainingMs({ ...cell, daysRemaining: Math.round(growMs * 0.6) }, NOW)).toBe(Math.round(growMs * 0.6));
        expect(remainingMs({ ...cell, daysRemaining: 0 }, NOW)).toBe(0);
        expect(remainingMs(cell, NOW + growMs + 1000)).toBe(growMs);
      });
    });
  }

  it('handles non-planted cell cleanly', () => {
    const untilledCell: Cell = { id: '0,0', x: 0, y: 0, kind: 'untilled' };
    expect(progressOf(untilledCell, NOW)).toBe(0);
    expect(stageOf(untilledCell, NOW)).toBe(0);
    expect(isRipe(untilledCell, NOW)).toBe(false);
    expect(remainingMs(untilledCell, NOW)).toBe(0);
  });
});
