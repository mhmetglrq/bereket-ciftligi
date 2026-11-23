import { describe, expect, it } from 'vitest';
import { applyAction, canApply, harvest, plant, till } from '../../src/sim/actions';
import { CROPS, MAX_OFFLINE_MS, QUESTS, emptyInventory } from '../../src/sim/data';
import { buyExpansion, buySeed, sell } from '../../src/sim/economy';
import { isRipe, stageOf } from '../../src/sim/crops';
import { newGame } from '../../src/sim/grid';
import { advanceOffline } from '../../src/sim/offline';
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
  const game = newGame(NOW);
  return stateOf(plant(stateOf(till(game, '0,0')), '0,0', cropId, NOW));
}

describe('grid and actions', () => {
  it('starts with the approved economy and 36 stable cells', () => {
    const game = newGame(NOW);
    expect(game.gold).toBe(50);
    expect(game.seeds.wheat).toBe(5);
    expect(game.cells).toHaveLength(36);
    expect(game.cells.every(cell => cell.kind === 'untilled')).toBe(true);
    expect(new Set(game.cells.map(cell => cell.id)).size).toBe(36);
  });

  it('rejects invalid changes without mutating input', () => {
    const game = newGame(NOW);
    const original = structuredClone(game);
    expect(plant(game, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'needTill' });
    expect(till(game, '9,9')).toEqual({ ok: false, reason: 'missingCell' });
    expect(harvest(game, '0,0', NOW)).toEqual({ ok: false, reason: 'notPlanted' });
    expect(game).toEqual(original);
    const tilled = stateOf(till(game, '0,0'));
    expect(till(tilled, '0,0')).toEqual({ ok: false, reason: 'alreadyTilled' });
    expect(plant({ ...tilled, seeds: emptyInventory() }, '0,0', 'wheat', NOW))
      .toEqual({ ok: false, reason: 'noSeeds' });
  });

  it('plants, grows, harvests and returns to tilled', () => {
    const game = planted();
    expect(game.seeds.wheat).toBe(4);
    expect(plant(game, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'occupied' });
    expect(harvest(game, '0,0', NOW + 29_999)).toEqual({ ok: false, reason: 'notRipe' });
    const result = stateOf(harvest(game, '0,0', NOW + 30_000));
    expect(result.cells[0]).toEqual({ id: '0,0', x: 0, y: 0, kind: 'tilled' });
    expect(result.produce.wheat).toBe(1);
  });

  it('canApply agrees with each action', () => {
    for (const game of [newGame(NOW), stateOf(till(newGame(NOW), '0,0')), planted()]) {
      const cell = game.cells[0];
      expect(canApply('till', cell, game, NOW)).toBe(till(game, cell.id).ok);
      expect(canApply('plant', cell, game, NOW, 'wheat'))
        .toBe(plant(game, cell.id, 'wheat', NOW).ok);
      expect(canApply('harvest', cell, game, NOW + 30_000))
        .toBe(harvest(game, cell.id, NOW + 30_000).ok);
    }
  });
});

describe('growth', () => {
  for (const cropId of ['wheat', 'carrot', 'tomato'] as CropId[]) {
    it(`uses timestamp stages for ${cropId}`, () => {
      const cell: Cell = { id: '0,0', x: 0, y: 0, kind: 'planted', cropId, plantedAt: NOW };
      [0, 0.25, 0.5, 0.75, 1].forEach((fraction, index) => {
        const time = NOW + CROPS[cropId].growMs * fraction;
        expect(stageOf(cell, time)).toBe(Math.min(3, index));
        expect(isRipe(cell, time)).toBe(fraction === 1);
      });
      expect(stageOf(cell, NOW - 100)).toBe(0);
    });
  }
});

describe('economy', () => {
  it('sells one and all, and rejects absent produce', () => {
    const game = { ...newGame(NOW), produce: { wheat: 4, carrot: 0, tomato: 0 } };
    const one = stateOf(sell(game, 'wheat', 1));
    expect(one.gold).toBe(58);
    expect(one.produce.wheat).toBe(3);
    const all = stateOf(sell(one, 'wheat', 'all'));
    expect(all.gold).toBe(82);
    expect(all.produce.wheat).toBe(0);
    expect(sell(all, 'wheat', 'all')).toEqual({ ok: false, reason: 'noProduce' });
    expect(sell(game, 'wheat', -1)).toEqual({ ok: false, reason: 'invalidAmount' });
  });

  it('buys one or five seeds at the configured cost', () => {
    const one = stateOf(buySeed(newGame(NOW), 'carrot', 1));
    expect(one.gold).toBe(40);
    expect(one.seeds.carrot).toBe(1);
    const five = stateOf(buySeed(newGame(NOW), 'wheat', 5));
    expect(five.gold).toBe(25);
    expect(five.seeds.wheat).toBe(10);
    expect(buySeed(newGame(NOW), 'tomato', 5)).toEqual({ ok: false, reason: 'notEnoughGold' });
    expect(buySeed(newGame(NOW), 'wheat', 2)).toEqual({ ok: false, reason: 'invalidAmount' });
  });

  it('expands without moving or changing existing cells', () => {
    expect(buyExpansion(newGame(NOW))).toEqual({ ok: false, reason: 'notEnoughGold' });
    const before = { ...planted(), gold: 1000 };
    const after = stateOf(buyExpansion(before));
    expect(after.cells).toHaveLength(64);
    expect(after.cells.slice(0, 36)).toEqual(before.cells);
    expect(after.cells.slice(36)).toHaveLength(28);
    expect(after.cells.slice(36).every(cell => cell.kind === 'untilled' && (cell.x >= 6 || cell.y >= 6))).toBe(true);
    expect(new Set(after.cells.map(cell => cell.id)).size).toBe(64);
    expect(buyExpansion(after)).toEqual({ ok: false, reason: 'alreadyExpanded' });
  });
});

describe('quests', () => {
  it('counts events rather than inventory and awards once', () => {
    const game = { ...newGame(NOW), produce: { wheat: 100, carrot: 0, tomato: 0 } };
    expect(applyQuestEvents(game, []).quests.wheat10.count).toBe(0);
    const complete = applyQuestEvents(game, [{ type: 'harvest', cropId: 'wheat', amount: 10 }]);
    expect(complete.quests.wheat10.status).toBe('complete');
    const loaded = deserialize(serialize(complete));
    expect(loaded.kind).toBe('ok');
    if (loaded.kind !== 'ok') return;
    expect(loaded.state.quests.wheat10.status).toBe('complete');
    const claimed = stateOf(claimQuest(loaded.state, 'wheat10'));
    expect(claimed.gold).toBe(game.gold + QUESTS[0].reward);
    expect(claimQuest(claimed, 'wheat10')).toEqual({ ok: false, reason: 'questNotReady' });
  });

  it('dispatch applies event progress to harvest and sell', () => {
    const harvested = stateOf(applyAction(planted(), { type: 'harvest', cellId: '0,0' }, NOW + 30_000));
    expect(harvested.quests.wheat10.count).toBe(1);
    const sold = stateOf(applyAction(harvested, { type: 'sell', cropId: 'wheat', amount: 'all' }, NOW + 30_000));
    expect(sold.quests.sell10.count).toBe(1);
    expect(sold.quests.wheat10.count).toBe(1);
  });
});

describe('offline', () => {
  it('does nothing for zero elapsed', () => {
    const game = planted();
    expect(advanceOffline(game, NOW)).toEqual({ state: game, summary: null });
  });
  it('counts newly ripened crops separately', () => {
    const game = newGame(NOW);
    game.cells = game.cells.map((cell, index) => index < 3
      ? { ...cell, kind: 'planted', cropId: (['wheat', 'carrot', 'tomato'] as CropId[])[index], plantedAt: NOW }
      : cell);
    const result = advanceOffline(game, NOW + 60_000);
    expect(result.summary?.ripened).toEqual({ wheat: 1, carrot: 1, tomato: 0 });
    expect(result.state.quests).toEqual(game.quests);
  });
  it('caps at seven days and rebases plantedAt', () => {
    const result = advanceOffline(planted(), NOW + MAX_OFFLINE_MS + 9000);
    expect(result.summary?.appliedMs).toBe(MAX_OFFLINE_MS);
    expect(result.summary?.capped).toBe(true);
    const cell = result.state.cells[0];
    expect(cell.kind === 'planted' && cell.plantedAt).toBe(NOW + 9000);
  });
  it('preserves progress and inventory on clock rollback without summary', () => {
    const game = { ...planted(), savedAt: NOW + 10_000 };
    const result = advanceOffline(game, NOW - 5000);
    expect(result.summary).toBeNull();
    const before = game.cells[0];
    const after = result.state.cells[0];
    expect(stageOf(after, NOW - 5000)).toBe(stageOf(before, game.savedAt));
    expect(result.state.seeds).toEqual(game.seeds);
  });
});

describe('rescue', () => {
  it('gifts only when soft locked', () => {
    const stuck = { ...newGame(NOW), gold: 0, seeds: emptyInventory() };
    expect(rescue(stuck).state.seeds.wheat).toBe(5);
    expect(rescue(stuck).gifted).toBe(true);
    expect(rescue(newGame(NOW)).gifted).toBe(false);
    expect(rescue({ ...stuck, gold: 5 }).gifted).toBe(false);
    expect(rescue({ ...stuck, produce: { wheat: 1, carrot: 0, tomato: 0 } }).gifted).toBe(false);
    expect(rescue({ ...stuck, cells: planted().cells }).gifted).toBe(false);
  });
});
