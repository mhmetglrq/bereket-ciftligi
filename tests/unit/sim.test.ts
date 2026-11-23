import { describe, expect, it } from 'vitest';
import { applyAction, canApply, harvest, plant, till } from '../../src/sim/actions';
import { isRipe, progressOf, remainingMs, stageOf } from '../../src/sim/crops';
import { CROP_IDS, CROPS, MAX_OFFLINE_MS, QUESTS, START_GOLD, START_WHEAT_SEEDS, emptyInventory } from '../../src/sim/data';
import { buyExpansion, buySeed, sell } from '../../src/sim/economy';
import { createGrid, expandedCells, newGame } from '../../src/sim/grid';
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

describe('Actions & Grid', () => {
  it('creates an initial 6x6 grid with expected initial conditions', () => {
    const game = newGame(NOW);
    expect(game.gridSize).toBe(6);
    expect(game.gold).toBe(START_GOLD);
    expect(game.seeds.wheat).toBe(START_WHEAT_SEEDS);
    expect(game.seeds.carrot).toBe(0);
    expect(game.seeds.tomato).toBe(0);
    expect(game.cells).toHaveLength(36);
    expect(game.cells.every(c => c.kind === 'untilled')).toBe(true);
    expect(new Set(game.cells.map(c => c.id)).size).toBe(36);
  });

  it('handles valid and invalid till actions without mutating state', () => {
    const game = newGame(NOW);
    const original = structuredClone(game);

    const tillRes = till(game, '0,0');
    expect(tillRes.ok).toBe(true);
    if (!tillRes.ok) return;
    expect(tillRes.state.cells.find(c => c.id === '0,0')?.kind).toBe('tilled');
    expect(tillRes.events).toEqual([{ type: 'till', amount: 1 }]);
    expect(game).toEqual(original);

    // cannot till already tilled cell
    expect(till(tillRes.state, '0,0')).toEqual({ ok: false, reason: 'alreadyTilled' });
    // missing cell
    expect(till(game, '10,10')).toEqual({ ok: false, reason: 'missingCell' });
  });

  it('handles plant actions and validates seed requirements', () => {
    const game = newGame(NOW);
    // Plant on untilled cell
    expect(plant(game, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'needTill' });

    const tilled = stateOf(till(game, '0,0'));
    // Plant with no seeds
    const noSeedsState: GameState = { ...tilled, seeds: emptyInventory() };
    expect(plant(noSeedsState, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'noSeeds' });

    // Valid plant
    const plantedRes = plant(tilled, '0,0', 'wheat', NOW);
    expect(plantedRes.ok).toBe(true);
    if (!plantedRes.ok) return;
    expect(plantedRes.state.seeds.wheat).toBe(game.seeds.wheat - 1);
    expect(plantedRes.state.cells[0]).toEqual({
      id: '0,0',
      x: 0,
      y: 0,
      kind: 'planted',
      cropId: 'wheat',
      plantedAt: NOW
    });

    // Cannot plant on occupied cell
    expect(plant(plantedRes.state, '0,0', 'wheat', NOW)).toEqual({ ok: false, reason: 'occupied' });
  });

  it('harvests only ripe crops and returns cell to tilled', () => {
    const game = planted('wheat');
    // Cannot harvest untilled or unplanted
    expect(harvest(newGame(NOW), '0,0', NOW)).toEqual({ ok: false, reason: 'notPlanted' });

    // Before ripe
    const beforeRipe = NOW + CROPS.wheat.growMs - 1;
    expect(harvest(game, '0,0', beforeRipe)).toEqual({ ok: false, reason: 'notRipe' });

    // At ripe
    const atRipe = NOW + CROPS.wheat.growMs;
    const harvested = harvest(game, '0,0', atRipe);
    expect(harvested.ok).toBe(true);
    if (!harvested.ok) return;

    expect(harvested.state.cells[0]).toEqual({
      id: '0,0',
      x: 0,
      y: 0,
      kind: 'tilled'
    });
    expect(harvested.state.produce.wheat).toBe(1);
    expect(harvested.events).toEqual([{ type: 'harvest', cropId: 'wheat', amount: 1 }]);
  });

  it('canApply agrees with all action requirements', () => {
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

      expect(progressOf(cell, NOW + growMs * 0.25)).toBe(0.25);
      expect(stageOf(cell, NOW + growMs * 0.25)).toBe(1);
      expect(isRipe(cell, NOW + growMs * 0.25)).toBe(false);

      expect(progressOf(cell, NOW + growMs * 0.5)).toBe(0.5);
      expect(stageOf(cell, NOW + growMs * 0.5)).toBe(2);
      expect(isRipe(cell, NOW + growMs * 0.5)).toBe(false);

      expect(progressOf(cell, NOW + growMs * 0.75)).toBe(0.75);
      expect(stageOf(cell, NOW + growMs * 0.75)).toBe(3);
      expect(isRipe(cell, NOW + growMs * 0.75)).toBe(false);

      expect(progressOf(cell, NOW + growMs)).toBe(1);
      expect(stageOf(cell, NOW + growMs)).toBe(3);
      expect(isRipe(cell, NOW + growMs)).toBe(true);
      expect(remainingMs(cell, NOW + growMs)).toBe(0);
    });
  }

  it('progress clamps gracefully with time prior to plantedAt or beyond maturity', () => {
    const cell: Cell = { id: '0,0', x: 0, y: 0, kind: 'planted', cropId: 'wheat', plantedAt: NOW };
    expect(progressOf(cell, NOW - 5000)).toBe(0);
    expect(stageOf(cell, NOW - 5000)).toBe(0);
    expect(progressOf(cell, NOW + 100_000)).toBe(1);
    expect(isRipe(cell, NOW + 100_000)).toBe(true);
  });
});

describe('Economy & Expansion', () => {
  it('sells 1 and sells all produce correctly', () => {
    const game: GameState = {
      ...newGame(NOW),
      produce: { wheat: 4, carrot: 0, tomato: 0 }
    };

    const one = stateOf(sell(game, 'wheat', 1));
    expect(one.gold).toBe(50 + CROPS.wheat.salePrice);
    expect(one.produce.wheat).toBe(3);
    expect(one.savedAt).toBe(game.savedAt);

    const all = stateOf(sell(one, 'wheat', 'all'));
    expect(all.gold).toBe(50 + 4 * CROPS.wheat.salePrice);
    expect(all.produce.wheat).toBe(0);

    // cannot sell when zero produce
    expect(sell(all, 'wheat', 'all')).toEqual({ ok: false, reason: 'noProduce' });
    expect(sell(all, 'wheat', 1)).toEqual({ ok: false, reason: 'noProduce' });
    // invalid amount
    expect(sell(game, 'wheat', 0)).toEqual({ ok: false, reason: 'noProduce' });
    expect(sell(game, 'wheat', -2)).toEqual({ ok: false, reason: 'invalidAmount' });
    expect(sell(game, 'wheat', 1.5)).toEqual({ ok: false, reason: 'invalidAmount' });
  });

  it('buys 1 or 5 seeds and validates amount and funds', () => {
    const game = newGame(NOW); // 50 gold
    const buy1 = stateOf(buySeed(game, 'carrot', 1));
    expect(buy1.gold).toBe(50 - CROPS.carrot.seedCost);
    expect(buy1.seeds.carrot).toBe(1);

    const buy5 = stateOf(buySeed(game, 'wheat', 5));
    expect(buy5.gold).toBe(50 - 5 * CROPS.wheat.seedCost);
    expect(buy5.seeds.wheat).toBe(5 + 5);

    // Invalid amounts
    expect(buySeed(game, 'wheat', 2)).toEqual({ ok: false, reason: 'invalidAmount' });
    expect(buySeed(game, 'wheat', 10)).toEqual({ ok: false, reason: 'invalidAmount' });

    // Not enough gold (5 tomato seeds = 100 gold > 50)
    expect(buySeed(game, 'tomato', 5)).toEqual({ ok: false, reason: 'notEnoughGold' });
  });

  it('expands grid to 8x8, keeps existing cell states, and prevents double expansion', () => {
    const fresh = newGame(NOW);
    expect(buyExpansion(fresh)).toEqual({ ok: false, reason: 'notEnoughGold' });

    const wealthy = { ...planted('wheat'), gold: 1000 };
    const expanded = stateOf(buyExpansion(wealthy));

    expect(expanded.gridSize).toBe(8);
    expect(expanded.gold).toBe(500);
    expect(expanded.cells).toHaveLength(64);

    // First 36 cells preserve exact state, positions and ids
    expect(expanded.cells.slice(0, 36)).toEqual(wealthy.cells);

    // The remaining 28 cells are all untilled and have coordinates in x>=6 or y>=6
    const addedCells = expanded.cells.slice(36);
    expect(addedCells).toHaveLength(28);
    expect(addedCells.every(c => c.kind === 'untilled')).toBe(true);
    expect(addedCells.every(c => c.x >= 6 || c.y >= 6)).toBe(true);
    expect(new Set(expanded.cells.map(c => c.id)).size).toBe(64);

    // Double expansion rejected
    expect(buyExpansion(expanded)).toEqual({ ok: false, reason: 'alreadyExpanded' });
  });
});

describe('Quests', () => {
  it('counts only events that happen after game starts, never existing inventory', () => {
    const game: GameState = {
      ...newGame(NOW),
      produce: { wheat: 100, carrot: 100, tomato: 100 }
    };
    // No events applied yet
    const checked = applyQuestEvents(game, []);
    expect(checked.quests.wheat10.count).toBe(0);
    expect(checked.quests.wheat10.status).toBe('active');

    // Apply 5 wheat harvests
    const partial = applyQuestEvents(checked, [{ type: 'harvest', cropId: 'wheat', amount: 5 }]);
    expect(partial.quests.wheat10.count).toBe(5);
    expect(partial.quests.wheat10.status).toBe('active');

    // 5 more wheat harvests complete the quest
    const complete = applyQuestEvents(partial, [{ type: 'harvest', cropId: 'wheat', amount: 5 }]);
    expect(complete.quests.wheat10.count).toBe(10);
    expect(complete.quests.wheat10.status).toBe('complete');
  });

  it('allows claiming completed quest once, and completed-but-unclaimed survives save round trip', () => {
    const game = newGame(NOW);
    const complete = applyQuestEvents(game, [{ type: 'harvest', cropId: 'wheat', amount: 10 }]);
    expect(complete.quests.wheat10.status).toBe('complete');

    // Round trip through save serialization
    const roundTripped = deserialize(serialize(complete));
    expect(roundTripped.kind).toBe('ok');
    if (roundTripped.kind !== 'ok') return;
    expect(roundTripped.state.quests.wheat10.status).toBe('complete');

    // Claim reward
    const claimedRes = claimQuest(roundTripped.state, 'wheat10');
    expect(claimedRes.ok).toBe(true);
    if (!claimedRes.ok) return;

    expect(claimedRes.state.gold).toBe(game.gold + QUESTS[0].reward);
    expect(claimedRes.state.quests.wheat10.status).toBe('claimed');

    // Claiming again fails
    expect(claimQuest(claimedRes.state, 'wheat10')).toEqual({ ok: false, reason: 'questNotReady' });
  });
});

describe('Offline Progress', () => {
  it('returns no summary and unchanged state when 0s away', () => {
    const game = planted('wheat');
    const res = advanceOffline(game, NOW);
    expect(res.state).toEqual(game);
    expect(res.summary).toBeNull();
  });

  it('calculates ripened crops accurately during normal away time', () => {
    const game = newGame(NOW);
    game.cells = game.cells.map((cell, index) => {
      if (index === 0) return { ...cell, kind: 'planted', cropId: 'wheat', plantedAt: NOW };
      if (index === 1) return { ...cell, kind: 'planted', cropId: 'carrot', plantedAt: NOW };
      if (index === 2) return { ...cell, kind: 'planted', cropId: 'tomato', plantedAt: NOW };
      return cell;
    });

    // 60 seconds later: wheat (30s) and carrot (60s) ripen, tomato (120s) not yet
    const res = advanceOffline(game, NOW + 60_000);
    expect(res.summary).toEqual({
      elapsedMs: 60_000,
      appliedMs: 60_000,
      capped: false,
      ripened: { wheat: 1, carrot: 1, tomato: 0 }
    });
    expect(isRipe(res.state.cells[0], NOW + 60_000)).toBe(true);
    expect(isRipe(res.state.cells[1], NOW + 60_000)).toBe(true);
    expect(isRipe(res.state.cells[2], NOW + 60_000)).toBe(false);
  });

  it('clamps and rebases plantedAt when away for more than 7 days', () => {
    const game = planted('wheat');
    const extraMs = 25_000;
    const res = advanceOffline(game, NOW + MAX_OFFLINE_MS + extraMs);

    expect(res.summary?.appliedMs).toBe(MAX_OFFLINE_MS);
    expect(res.summary?.capped).toBe(true);
    const cell = res.state.cells[0];
    expect(cell.kind).toBe('planted');
    if (cell.kind === 'planted') {
      // plantedAt should be shifted forward by extraMs (correction = delta - appliedMs)
      expect(cell.plantedAt).toBe(NOW + extraMs);
    }
  });

  it('handles negative elapsed time gracefully without summary or loss of progress', () => {
    const game = { ...planted('wheat'), savedAt: NOW + 10_000 };
    const res = advanceOffline(game, NOW - 5_000);
    expect(res.summary).toBeNull();
    expect(res.state.savedAt).toBe(NOW - 5_000);
    expect(res.state.seeds).toEqual(game.seeds);
  });
});

describe('Soft-lock Rescue', () => {
  it('gifts 5 wheat seeds when soft locked (0 seeds, 0 produce, 0 planted cells, < 5 gold)', () => {
    const stuck: GameState = {
      ...newGame(NOW),
      gold: 4,
      seeds: emptyInventory(),
      produce: emptyInventory(),
      cells: createGrid(6)
    };

    const res = rescue(stuck);
    expect(res.gifted).toBe(true);
    expect(res.state.seeds.wheat).toBe(5);
  });

  it('does NOT gift when player is not soft-locked', () => {
    const fresh = newGame(NOW);
    expect(rescue(fresh).gifted).toBe(false);

    // Player has 5 gold (can buy wheat seed)
    const hasGold = { ...fresh, gold: 5, seeds: emptyInventory() };
    expect(rescue(hasGold).gifted).toBe(false);

    // Player has produce to sell
    const hasProduce = { ...fresh, gold: 0, seeds: emptyInventory(), produce: { wheat: 1, carrot: 0, tomato: 0 } };
    expect(rescue(hasProduce).gifted).toBe(false);

    // Player has growing plants in field
    const hasPlant = { ...fresh, gold: 0, seeds: emptyInventory(), cells: planted().cells };
    expect(rescue(hasPlant).gifted).toBe(false);
  });
});
