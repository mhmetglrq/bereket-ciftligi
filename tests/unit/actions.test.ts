import { describe, expect, it } from 'vitest';
import { applyAction, canApply, harvest, plant, till } from '../../src/sim/actions';
import { CROPS, emptyInventory } from '../../src/sim/data';
import { newGame } from '../../src/sim/grid';
import type { Cell, CropId, GameState, Result } from '../../src/sim/types';

const NOW = 1_000_000;

function stateOf(result: Result): GameState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function planted(cropId: CropId = 'wheat'): GameState {
  const game = newGame(NOW);
  return stateOf(plant(stateOf(till(game, '0,0')), '0,0', cropId, NOW));
}

describe('sim actions', () => {
  it('tills an untilled cell and rejects already tilled or missing cell', () => {
    const game = newGame(NOW);
    const tilledResult = till(game, '0,0');
    expect(tilledResult.ok).toBe(true);
    if (!tilledResult.ok) return;

    expect(tilledResult.state.cells.find(c => c.id === '0,0')?.kind).toBe('tilled');
    expect(tilledResult.events).toEqual([{ type: 'till', amount: 1 }]);

    // already tilled
    const secondTill = till(tilledResult.state, '0,0');
    expect(secondTill).toEqual({ ok: false, reason: 'alreadyTilled' });

    // missing cell
    expect(till(game, '99,99')).toEqual({ ok: false, reason: 'missingCell' });
  });

  it('plants seed on tilled cell and checks seeds inventory', () => {
    const game = newGame(NOW);
    // Plant on untilled fails with needTill
    expect(plant(game, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'needTill' });

    const tilled = stateOf(till(game, '0,0'));
    // Plant when no seeds
    const noSeedsState = { ...tilled, seeds: emptyInventory() };
    expect(plant(noSeedsState, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'noSeeds' });

    // Valid plant
    const plantResult = plant(tilled, '0,0', 'wheat', NOW);
    expect(plantResult.ok).toBe(true);
    if (!plantResult.ok) return;
    expect(plantResult.state.seeds.wheat).toBe(game.seeds.wheat - 1);
    expect(plantResult.state.cells[0]).toEqual({
      id: '0,0',
      x: 0,
      y: 0,
      kind: 'planted',
      cropId: 'wheat',
      plantedAt: NOW
    });
    expect(plantResult.events).toEqual([{ type: 'plant', cropId: 'wheat', amount: 1 }]);

    // Occupied
    expect(plant(plantResult.state, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'occupied' });
  });

  it('harvests ripe crop returning cell to tilled and increments produce', () => {
    const game = planted('wheat');
    // Not planted
    expect(harvest(newGame(NOW), '0,0', NOW)).toEqual({ ok: false, reason: 'notPlanted' });

    // Not ripe before growMs
    const beforeRipe = NOW + CROPS.wheat.growMs - 1;
    expect(harvest(game, '0,0', beforeRipe)).toEqual({ ok: false, reason: 'notRipe' });

    // Ripe at growMs
    const ripeTime = NOW + CROPS.wheat.growMs;
    const harvestResult = harvest(game, '0,0', ripeTime);
    expect(harvestResult.ok).toBe(true);
    if (!harvestResult.ok) return;

    expect(harvestResult.state.cells[0]).toEqual({
      id: '0,0',
      x: 0,
      y: 0,
      kind: 'tilled'
    });
    expect(harvestResult.state.produce.wheat).toBe(1);
    expect(harvestResult.events).toEqual([{ type: 'harvest', cropId: 'wheat', amount: 1 }]);
  });

  it('canApply agrees with each action', () => {
    const fresh = newGame(NOW);
    const tilled = stateOf(till(fresh, '0,0'));
    const plantWheat = stateOf(plant(tilled, '0,0', 'wheat', NOW));

    const cellFresh = fresh.cells[0];
    expect(canApply('till', cellFresh, fresh, NOW)).toBe(true);
    expect(canApply('plant', cellFresh, fresh, NOW, 'wheat')).toBe(false);
    expect(canApply('harvest', cellFresh, fresh, NOW)).toBe(false);

    const cellTilled = tilled.cells[0];
    expect(canApply('till', cellTilled, tilled, NOW)).toBe(false);
    expect(canApply('plant', cellTilled, tilled, NOW, 'wheat')).toBe(true);
    expect(canApply('harvest', cellTilled, tilled, NOW)).toBe(false);

    const cellPlanted = plantWheat.cells[0];
    expect(canApply('till', cellPlanted, plantWheat, NOW)).toBe(false);
    expect(canApply('plant', cellPlanted, plantWheat, NOW, 'wheat')).toBe(false);
    expect(canApply('harvest', cellPlanted, plantWheat, NOW)).toBe(false);
    expect(canApply('harvest', cellPlanted, plantWheat, NOW + CROPS.wheat.growMs)).toBe(true);
  });

  it('applyAction dispatches all action types and appends rescue gift if triggered', () => {
    const game = newGame(NOW);
    const res = applyAction(game, { type: 'till', cellId: '0,0' }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.savedAt).toBe(NOW);

    // Soft-locked triggers rescue event on applyAction
    const brokeState: GameState = {
      ...game,
      gold: 0,
      seeds: emptyInventory(),
      produce: emptyInventory(),
      cells: game.cells.map(c => ({ ...c, kind: 'untilled' }))
    };
    // Tilling when broke triggers rescue
    const rescueRes = applyAction(brokeState, { type: 'till', cellId: '0,0' }, NOW);
    expect(rescueRes.ok).toBe(true);
    if (!rescueRes.ok) return;
    expect(rescueRes.events.some(e => e.type === 'rescue')).toBe(true);
    expect(rescueRes.state.seeds.wheat).toBe(5);
  });
});
