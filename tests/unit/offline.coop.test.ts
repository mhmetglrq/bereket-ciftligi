import { describe, it, expect } from 'vitest';
import { advanceOffline } from '../../src/sim/offline';
import { MAX_OFFLINE_MS } from '../../src/sim/data';
import { newGame } from '../../src/sim/grid';
import type { GameState } from '../../src/sim/types';

describe('Offline progress with Coop and Watering', () => {
  const now = 1_000_000_000;

  it('3 fed chickens + 10 minutes away produces 3 eggs and leaves 3 hungry chickens', () => {
    const savedAt = now;
    const tenMinutesLater = savedAt + 10 * 60 * 1000;

    const base = newGame(savedAt);
    const state: GameState = {
      ...base,
      savedAt,
      coop: {
        owned: true,
        pendingEggs: 0,
        chickens: [
          { id: 'chicken-1', fedAt: savedAt },
          { id: 'chicken-2', fedAt: savedAt },
          { id: 'chicken-3', fedAt: savedAt }
        ]
      }
    };

    const result = advanceOffline(state, tenMinutesLater);
    expect(result.summary).not.toBeNull();
    expect(result.summary?.eggs).toBe(3);
    expect(result.summary?.hungry).toBe(3);

    expect(result.state.coop.pendingEggs).toBe(3);
    for (const chicken of result.state.coop.chickens) {
      expect(chicken.fedAt).toBeNull();
    }
  });

  it('gives 0 eggs when clock moves backwards', () => {
    const savedAt = now;
    const backwardsTime = savedAt - 10_000;

    const base = newGame(savedAt);
    const state: GameState = {
      ...base,
      savedAt,
      coop: {
        owned: true,
        pendingEggs: 1,
        chickens: [
          { id: 'chicken-1', fedAt: savedAt - 30_000 }
        ]
      }
    };

    const result = advanceOffline(state, backwardsTime);
    expect(result.state.coop.pendingEggs).toBe(1); // No new eggs produced
    expect(result.summary).toBeNull();
  });

  it('applies clock correction shift to fedAt and water timestamps when offline time is capped', () => {
    const savedAt = now;
    const hugeDelta = MAX_OFFLINE_MS + 24 * 60 * 60 * 1000; // 1 day past 7-day cap
    const resumeTime = savedAt + hugeDelta;

    const base = newGame(savedAt);
    const plantedAt = savedAt - 1000;
    const waterAt = savedAt;
    const waterUntil = savedAt + 5000;
    const fedAt = savedAt;

    const state: GameState = {
      ...base,
      savedAt,
      cells: base.cells.map((cell, idx) => idx === 0 ? {
        id: cell.id,
        x: cell.x,
        y: cell.y,
        kind: 'planted',
        cropId: 'wheat',
        plantedAt,
        water: { at: waterAt, until: waterUntil }
      } : cell),
      coop: {
        owned: true,
        pendingEggs: 0,
        chickens: [{ id: 'chicken-1', fedAt }]
      }
    };

    const result = advanceOffline(state, resumeTime);
    expect(result.summary?.capped).toBe(true);

    const correction = hugeDelta - MAX_OFFLINE_MS;
    const cell = result.state.cells[0];
    if (cell.kind !== 'planted' || !cell.water) throw new Error();

    expect(cell.plantedAt).toBe(plantedAt + correction);
    expect(cell.water.at).toBe(waterAt + correction);
    expect(cell.water.until).toBe(waterUntil + correction);
  });
});
