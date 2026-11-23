import { describe, it, expect } from 'vitest';
import { water, applyAction } from '../../src/sim/actions';
import { isRipe, isWatered, progressOf, remainingMs } from '../../src/sim/crops';
import { CROPS } from '../../src/sim/data';
import { newGame } from '../../src/sim/grid';
import type { GameState } from '../../src/sim/types';

describe('Watering mechanics', () => {
  const now = 1_000_000;

  function createGameWithPlantedWheat(): { state: GameState; cellId: string } {
    const game = newGame(now);
    const cellId = '0,0';
    // Till and plant wheat
    const tilled = applyAction(game, { type: 'till', cellId }, now);
    if (!tilled.ok) throw new Error('Till failed');
    const planted = applyAction(tilled.state, { type: 'plant', cellId, cropId: 'wheat' }, now);
    if (!planted.ok) throw new Error('Plant failed');
    return { state: planted.state, cellId };
  }

  it('rejects watering on untilled, tilled, or empty cell', () => {
    const game = newGame(now);
    expect(water(game, '0,0', now).ok).toBe(false);
    expect(water(game, 'missing', now).ok).toBe(false);

    const tilled = applyAction(game, { type: 'till', cellId: '0,0' }, now);
    if (!tilled.ok) throw new Error();
    expect(water(tilled.state, '0,0', now).ok).toBe(false);
  });

  it('calculates duration for one stageMs / 1.5 wall time', () => {
    const { state, cellId } = createGameWithPlantedWheat();
    const wheat = CROPS.wheat;
    const stageMs = wheat.growMs / 4; // 30,000 / 4 = 7,500 ms
    const expectedWaterDuration = stageMs / 1.5; // 5,000 ms

    const result = water(state, cellId, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cell = result.state.cells.find(c => c.id === cellId);
    expect(cell?.kind).toBe('planted');
    if (cell?.kind !== 'planted') return;

    expect(cell.water).toBeDefined();
    expect(cell.water?.at).toBe(now);
    expect(cell.water?.until).toBe(now + expectedWaterDuration);
    expect(isWatered(cell, now)).toBe(true);
    expect(isWatered(cell, now + expectedWaterDuration - 1)).toBe(true);
    expect(isWatered(cell, now + expectedWaterDuration)).toBe(false);
  });

  it('bonus lasts one full stage even when watering happens 1 s before stage boundary', () => {
    const { state, cellId } = createGameWithPlantedWheat();
    const wheat = CROPS.wheat;
    const stageMs = wheat.growMs / 4; // 7,500 ms
    const waterTime = now + stageMs - 1000; // 6,500 ms after planting (1s before stage 1)

    const result = water(state, cellId, waterTime);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const cell = result.state.cells.find(c => c.id === cellId);
    if (cell?.kind !== 'planted' || !cell.water) throw new Error();

    const expectedDuration = stageMs / 1.5; // 5,000 ms
    expect(cell.water.until - cell.water.at).toBeCloseTo(expectedDuration, 5);
    expect(cell.water.until).toBe(waterTime + expectedDuration);
  });

  it('does not allow stacking while already watered', () => {
    const { state, cellId } = createGameWithPlantedWheat();
    const wateredOnce = water(state, cellId, now);
    expect(wateredOnce.ok).toBe(true);
    if (!wateredOnce.ok) return;

    const wateredAgain = water(wateredOnce.state, cellId, now + 1000);
    expect(wateredAgain.ok).toBe(false);
    if (!wateredAgain.ok) {
      expect(wateredAgain.reason).toBe('notApplicable');
    }
  });

  it('rejects watering when crop is already ripe', () => {
    const { state, cellId } = createGameWithPlantedWheat();
    const ripeTime = now + CROPS.wheat.growMs;
    const cell = state.cells.find(c => c.id === cellId);
    if (!cell) throw new Error();

    expect(isRipe(cell, ripeTime)).toBe(true);
    const res = water(state, cellId, ripeTime);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('notApplicable');
    }
  });

  it('folds expired bonus into plantedAt when watered again after expiring', () => {
    const { state, cellId } = createGameWithPlantedWheat();
    const stageMs = CROPS.wheat.growMs / 4;
    const boostDuration = stageMs / 1.5; // 5000 ms

    const firstWater = water(state, cellId, now);
    if (!firstWater.ok) throw new Error();

    const secondWaterTime = now + boostDuration + 500; // expired by 500 ms
    const secondWater = water(firstWater.state, cellId, secondWaterTime);
    expect(secondWater.ok).toBe(true);
    if (!secondWater.ok) return;

    const cell = secondWater.state.cells.find(c => c.id === cellId);
    if (cell?.kind !== 'planted' || !cell.water) throw new Error();

    // Planted at should be shifted back by (boostDuration * 0.5) = 2500 ms
    expect(cell.plantedAt).toBe(now - boostDuration * 0.5);
    expect(cell.water.at).toBe(secondWaterTime);
  });

  it('clamps growth at 100% (ripe) and remainingMs reaches 0', () => {
    const { state, cellId } = createGameWithPlantedWheat();
    const watered = water(state, cellId, now);
    if (!watered.ok) throw new Error();

    const cell = watered.state.cells.find(c => c.id === cellId)!;
    const longTimeAfter = now + CROPS.wheat.growMs * 2;

    expect(progressOf(cell, longTimeAfter)).toBe(1);
    expect(isRipe(cell, longTimeAfter)).toBe(true);
    expect(remainingMs(cell, longTimeAfter)).toBe(0);
  });
});
