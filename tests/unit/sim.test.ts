import { describe, expect, it } from 'vitest';
import { canApply, harvest, plant, till } from '../../src/sim/actions';
import { isRipe, progressOf, remainingMs, stageOf } from '../../src/sim/crops';
import { CROP_IDS, CROPS, QUESTS, START_GOLD, START_WHEAT_SEEDS, emptyInventory } from '../../src/sim/data';
import { buyExpansion, buySeed, sell } from '../../src/sim/economy';
import { createGrid, newGame } from '../../src/sim/grid';
import { applyQuestEvents, claimQuest } from '../../src/sim/quests';
import { rescue } from '../../src/sim/rescue';
import { deserialize, serialize } from '../../src/save/serialize';
import type { Cell, CropId, GameState, Result } from '../../src/sim/types';

const NOW = 1_000_000;

function stateOf(result: Result): GameState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function planted(cropId: CropId = 'wheat'): GameState {
  const fresh = newGame(NOW);
  const game: GameState = { ...fresh, season: 'summer', weather: 'sunny', seeds: { ...fresh.seeds, wheat: 5 } };
  return stateOf(plant(stateOf(till(game, '0,0')), '0,0', cropId, NOW));
}

function ready(game: GameState): GameState { return { ...game, cells: game.cells.map(c => c.kind === 'planted' ? { ...c, daysRemaining: 0 } : c) }; }

describe('Actions & Grid', () => {
  it('creates an initial 6x6 grid with expected initial conditions', () => {
    const game = newGame(NOW);
    expect(game.gridSize).toBe(6);
    expect(game.gold).toBe(START_GOLD);
    expect(game.seeds.wheat).toBe(0);
    expect(game.seeds.carrot).toBe(START_WHEAT_SEEDS);
    expect(game.seeds.tomato).toBe(0);
    expect(game.cells).toHaveLength(36);
    expect(game.cells.every(c => c.kind === 'untilled')).toBe(true);
    expect(new Set(game.cells.map(c => c.id)).size).toBe(36);
  });

  it('handles valid and invalid till actions without mutating state', () => {
    const game = newGame(NOW);
    const original = structuredClone(game);
    const result = till(game, '0,0');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cells.find(c => c.id === '0,0')?.kind).toBe('tilled');
    expect(result.events).toEqual([{ type: 'till', amount: 1 }]);
    expect(game).toEqual(original);
    expect(till(result.state, '0,0')).toEqual({ ok: false, reason: 'alreadyTilled' });
    expect(till(game, '10,10')).toEqual({ ok: false, reason: 'missingCell' });
  });

  it('handles plant actions and validates seed requirements', () => {
    const game = newGame(NOW);
    expect(plant(game, '0,0', 'carrot', NOW)).toEqual({ ok: false, reason: 'needTill' });
    const tilled = stateOf(till(game, '0,0'));
    expect(plant({ ...tilled, seeds: emptyInventory() }, '0,0', 'carrot', NOW))
      .toEqual({ ok: false, reason: 'noSeeds' });
    const result = plant(tilled, '0,0', 'carrot', NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.seeds.carrot).toBe(game.seeds.carrot - 1);
    expect(result.state.cells[0]).toMatchObject({
      id: '0,0', x: 0, y: 0, kind: 'planted', cropId: 'carrot', plantedAt: NOW
    });
    expect(plant(result.state, '0,0', 'carrot', NOW)).toEqual({ ok: false, reason: 'occupied' });
  });

  it('harvests only ripe crops and returns cell to tilled', () => {
    const game = planted('wheat');
    expect(harvest(newGame(NOW), '0,0', NOW)).toEqual({ ok: false, reason: 'notPlanted' });
    expect(harvest(game, '0,0', NOW + CROPS.wheat.growMs - 1))
      .toEqual({ ok: false, reason: 'notRipe' });
    const result = harvest(ready(game), '0,0', NOW + CROPS.wheat.growMs);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cells[0]).toMatchObject({ id: '0,0', x: 0, y: 0, kind: 'tilled' });
    expect(result.state.produce.wheat).toBe(1);
    expect(result.events).toEqual([{ type: 'harvest', cropId: 'wheat', amount: 1 }]);
  });

  it('canApply agrees with all action requirements', () => {
    const fresh = newGame(NOW);
    const tilled = stateOf(till(fresh, '0,0'));
    const plantWheat = stateOf(plant(tilled, '0,0', 'carrot', NOW));
    expect(canApply('till', fresh.cells[0], fresh, NOW)).toBe(true);
    expect(canApply('plant', fresh.cells[0], fresh, NOW, 'wheat')).toBe(false);
    expect(canApply('harvest', fresh.cells[0], fresh, NOW)).toBe(false);
    expect(canApply('till', tilled.cells[0], tilled, NOW)).toBe(false);
    expect(canApply('plant', tilled.cells[0], tilled, NOW, 'carrot')).toBe(true);
    expect(canApply('harvest', tilled.cells[0], tilled, NOW)).toBe(false);
    expect(canApply('till', plantWheat.cells[0], plantWheat, NOW)).toBe(false);
    expect(canApply('plant', plantWheat.cells[0], plantWheat, NOW, 'wheat')).toBe(false);
    expect(canApply('harvest', plantWheat.cells[0], plantWheat, NOW)).toBe(false);
    expect(canApply('harvest', plantWheat.cells[0], plantWheat, NOW + CROPS.wheat.growMs)).toBe(false);
  });
});

describe('Crop Growth', () => {
  for (const cropId of CROP_IDS) {
    it(`evaluates stage at 0%, 25%, 50%, 75% and 100% of growth time for ${cropId}`, () => {
      const growMs = CROPS[cropId].growMs;
      const cell: Cell = { id: '0,0', x: 0, y: 0, kind: 'planted', cropId, plantedAt: NOW };
      expect(progressOf(cell, NOW)).toBe(0);
      expect(stageOf(cell, NOW)).toBe(0);
      expect(isRipe(cell, NOW)).toBe(false);
      expect(remainingMs(cell, NOW)).toBe(growMs);
      expect(progressOf({ ...cell, daysRemaining: growMs * 0.75 }, NOW)).toBe(0.25);
      expect(stageOf({ ...cell, daysRemaining: growMs * 0.75 }, NOW)).toBe(1);
      expect(isRipe(cell, NOW + growMs * 0.25)).toBe(false);
      expect(progressOf({ ...cell, daysRemaining: growMs * 0.5 }, NOW)).toBe(0.5);
      expect(stageOf({ ...cell, daysRemaining: growMs * 0.5 }, NOW)).toBe(2);
      expect(isRipe(cell, NOW + growMs * 0.5)).toBe(false);
      expect(progressOf({ ...cell, daysRemaining: growMs * 0.25 }, NOW)).toBe(0.75);
      expect(stageOf({ ...cell, daysRemaining: growMs * 0.25 }, NOW)).toBe(3);
      expect(isRipe(cell, NOW + growMs * 0.75)).toBe(false);
      expect(progressOf({ ...cell, daysRemaining: 0 }, NOW)).toBe(1);
      expect(stageOf({ ...cell, daysRemaining: 0 }, NOW)).toBe(3);
      expect(isRipe({ ...cell, daysRemaining: 0 }, NOW)).toBe(true);
      expect(remainingMs({ ...cell, daysRemaining: 0 }, NOW)).toBe(0);
    });
  }
  it('progress clamps gracefully with time prior to plantedAt or beyond maturity', () => {
    const cell: Cell = { id: '0,0', x: 0, y: 0, kind: 'planted', cropId: 'wheat', plantedAt: NOW };
    expect(progressOf(cell, NOW - 5000)).toBe(0);
    expect(stageOf(cell, NOW - 5000)).toBe(0);
    expect(progressOf(cell, NOW + 100_000)).toBe(0);
    expect(isRipe(cell, NOW + 100_000)).toBe(false);
  });
});

describe('Economy & Expansion', () => {
  it('sells 1 and sells all produce correctly', () => {
    const game: GameState = { ...newGame(NOW), produce: { ...emptyInventory(), wheat: 4 } };
    const one = stateOf(sell(game, 'wheat', 1));
    expect(one.gold).toBe(50 + CROPS.wheat.salePrice);
    expect(one.produce.wheat).toBe(3);
    expect(one.savedAt).toBe(game.savedAt);
    const all = stateOf(sell(one, 'wheat', 'all'));
    expect(all.gold).toBe(50 + 4 * CROPS.wheat.salePrice);
    expect(all.produce.wheat).toBe(0);
    expect(sell(all, 'wheat', 'all')).toEqual({ ok: false, reason: 'noProduce' });
    expect(sell(all, 'wheat', 1)).toEqual({ ok: false, reason: 'noProduce' });
    expect(sell(game, 'wheat', 0)).toEqual({ ok: false, reason: 'noProduce' });
    expect(sell(game, 'wheat', -2)).toEqual({ ok: false, reason: 'invalidAmount' });
    expect(sell(game, 'wheat', 1.5)).toEqual({ ok: false, reason: 'invalidAmount' });
  });

  it('buys 1 or 5 seeds and validates amount and funds', () => {
    const game = newGame(NOW);
    const buy1 = stateOf(buySeed(game, 'carrot', 1));
    expect(buy1.gold).toBe(50 - CROPS.carrot.seedCost);
    expect(buy1.seeds.carrot).toBe(6);
    const buy5 = stateOf(buySeed({ ...game, season: 'summer' }, 'wheat', 5));
    expect(buy5.gold).toBe(50 - 5 * CROPS.wheat.seedCost);
    expect(buy5.seeds.wheat).toBe(5);
    expect(buySeed({ ...game, season: 'summer' }, 'wheat', 2)).toEqual({ ok: false, reason: 'invalidAmount' });
    expect(buySeed({ ...game, season: 'summer' }, 'wheat', 10)).toEqual({ ok: false, reason: 'invalidAmount' });
    expect(buySeed({ ...game, season: 'summer' }, 'tomato', 5)).toEqual({ ok: false, reason: 'notEnoughGold' });
  });

  it('expands grid to 8x8, keeps existing cell states, and prevents double expansion', () => {
    const fresh = newGame(NOW);
    expect(buyExpansion(fresh)).toEqual({ ok: false, reason: 'notEnoughGold' });
    const wealthy = { ...planted('wheat'), gold: 1000 };
    const expanded = stateOf(buyExpansion(wealthy));
    expect(expanded.gridSize).toBe(8);
    expect(expanded.gold).toBe(500);
    expect(expanded.cells).toHaveLength(64);
    expect(expanded.cells.slice(0, 36)).toEqual(wealthy.cells);
    const addedCells = expanded.cells.slice(36);
    expect(addedCells).toHaveLength(28);
    expect(addedCells.every(c => c.kind === 'untilled')).toBe(true);
    expect(addedCells.every(c => c.x >= 6 || c.y >= 6)).toBe(true);
    expect(new Set(expanded.cells.map(c => c.id)).size).toBe(64);
    expect(buyExpansion(expanded)).toEqual({ ok: false, reason: 'alreadyExpanded' });
  });
});

describe('Quests', () => {
  it('counts only events that happen after game starts, never existing inventory', () => {
    const game: GameState = {
      ...newGame(NOW), produce: { ...emptyInventory(), wheat: 100, carrot: 100, tomato: 100 }
    };
    const checked = applyQuestEvents(game, []);
    expect(checked.quests.wheat10.count).toBe(0);
    expect(checked.quests.wheat10.status).toBe('active');
    const partial = applyQuestEvents(checked, [{ type: 'harvest', cropId: 'wheat', amount: 5 }]);
    expect(partial.quests.wheat10.count).toBe(5);
    expect(partial.quests.wheat10.status).toBe('active');
    const complete = applyQuestEvents(partial, [{ type: 'harvest', cropId: 'wheat', amount: 5 }]);
    expect(complete.quests.wheat10.count).toBe(10);
    expect(complete.quests.wheat10.status).toBe('complete');
  });

  it('allows claiming completed quest once, and completed-but-unclaimed survives save round trip', () => {
    const game = newGame(NOW);
    const complete = applyQuestEvents(game, [{ type: 'harvest', cropId: 'wheat', amount: 10 }]);
    expect(complete.quests.wheat10.status).toBe('complete');
    const roundTripped = deserialize(serialize(complete));
    expect(roundTripped.kind).toBe('ok');
    if (roundTripped.kind !== 'ok') return;
    expect(roundTripped.state.quests.wheat10.status).toBe('complete');
    const claimed = claimQuest(roundTripped.state, 'wheat10');
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(claimed.state.gold).toBe(game.gold + QUESTS[0].reward);
    expect(claimed.state.quests.wheat10.status).toBe('claimed');
    expect(claimQuest(claimed.state, 'wheat10')).toEqual({ ok: false, reason: 'questNotReady' });
  });
});


describe('Soft-lock Rescue', () => {
  it('gifts 5 wheat seeds when soft locked (0 seeds, 0 produce, 0 planted cells, < 5 gold)', () => {
    const stuck: GameState = {
      ...newGame(NOW), gold: 4, seeds: emptyInventory(),
      produce: emptyInventory(), cells: createGrid(6)
    };
    const result = rescue(stuck);
    expect(result.gifted).toBe(true);
    expect(result.state.seeds.wheat).toBe(5);
  });

  it('does NOT gift when player is not soft-locked', () => {
    const fresh = newGame(NOW);
    expect(rescue(fresh).gifted).toBe(false);
    expect(rescue({ ...fresh, gold: 10, seeds: emptyInventory() }).gifted).toBe(false);
    expect(rescue({
      ...fresh, gold: 0, seeds: emptyInventory(), produce: { ...emptyInventory(), wheat: 1 }
    }).gifted).toBe(false);
    expect(rescue({ ...fresh, gold: 0, seeds: emptyInventory(), cells: planted().cells }).gifted).toBe(false);
  });
});
