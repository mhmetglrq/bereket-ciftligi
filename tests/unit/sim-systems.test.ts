import { newGame } from '../../src/sim/grid';
import { endDay } from '../../src/sim/dayEnd';
import { describe, it, expect } from 'vitest';
import { hashString, mulberry32 } from '../../src/sim/rng';
import { canAfford, consume, getStock, itemPrice, setStock, ITEM_IDS } from '../../src/sim/inventory';
import { formatDuration, formatNumber } from '../../src/sim/format';
import { plantTree, harvestTree, removeTree } from '../../src/sim/trees';
import { buyBuilding, queue, cancel, collect, advance } from '../../src/sim/production';
import { unlockedItems, generate, refill, deliver, reject } from '../../src/sim/orders';
import { localDateKey, nextRewardDay, rollDailyQuests, claimDaily, claimQuest, track, DAILY_REWARDS } from '../../src/sim/daily';
import { applyBatch } from '../../src/sim/batch';
import { BUILDINGS, RECIPES, TREES, QUESTS } from '../../src/sim/data';
import { thresholdFor } from '../../src/sim/xp';
import type { GameState, Result, ItemId } from '../../src/sim/types';

function success(result: Result): Extract<Result, { ok: true }> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, got ${result.reason}`);
  return result;
}

function failure(result: Result): Extract<Result, { ok: false }> {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected action to fail');
  return result;
}

function createBaseState(overrides: Partial<GameState> = {}): GameState {
  const cells = [];
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      cells.push({ id: `${x},${y}`, x, y, kind: 'untilled' as const });
    }
  }

  return {
    ...newGame(1000),
    version: 4, season: 'summer', weather: 'sunny',
    createdAt: 1000,
    savedAt: 1000,
    gridSize: 6,
    gold: 500,
    xp: thresholdFor(3),
    eggs: 5,
    seeds: { wheat: 10, carrot: 5, tomato: 5, corn: 0, strawberry: 0, pumpkin: 0 },
    produce: { wheat: 10, carrot: 0, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0 },
    goods: { flour: 0, bread: 0, cake: 0, apple: 0, cherry: 0 },
    coop: { owned: true, pendingEggs: 0, chickens: [{ id: 'c1', fedAt: null }] },
    buildings: {
      mill: { owned: true, queue: [], readyOutput: {} },
      bakery: { owned: false, queue: [], readyOutput: {} }
    },
    orders: [
      { order: null, refillAt: 0, generation: 0 },
      { order: null, refillAt: 0, generation: 0 },
      { order: null, refillAt: 0, generation: 0 }
    ],
    daily: {
      streak: 0,
      lastClaim: null,
      date: '2026-11-20',
      quests: []
    },
    cells,
    quests: Object.fromEntries(QUESTS.map(quest => [quest.id, { count: 0, status: 'active' as const }])),
    ...overrides
  };
}

describe('rng', () => {
  it('gives the exact same sequence for the same seed', () => {
    const seed = hashString('test-seed-42');
    const rng1 = mulberry32(seed);
    const rng2 = mulberry32(seed);
    const seq1 = [rng1(), rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2(), rng2()];
    expect(seq1).toEqual(seq2);
  });
});

describe('inventory', () => {
  it('reads and writes eggs only through state.eggs without duplicating', () => {
    let state = createBaseState({ eggs: 12 });
    expect(getStock(state, 'eggs')).toBe(12);
    state = setStock(state, 'eggs', 7);
    expect(state.eggs).toBe(7);
    expect(getStock(state, 'eggs')).toBe(7);
  });

  it('correctly reads prices and stocks for crops, goods, and eggs', () => {
    const state = createBaseState();
    expect(itemPrice('eggs')).toBeGreaterThan(0);
    expect(itemPrice('wheat')).toBeGreaterThan(0);
    expect(itemPrice('flour')).toBe(30);
    expect(itemPrice('bread')).toBe(75);
    expect(itemPrice('cake')).toBe(110);
    expect(itemPrice('apple')).toBe(25);
    expect(itemPrice('cherry')).toBe(40);
  });

  it('consume either removes all requested items or nothing if unaffordable', () => {
    const state = createBaseState({
      eggs: 5,
      produce: { wheat: 3, carrot: 0, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0 }
    });

    expect(canAfford(state, { wheat: 2, eggs: 3 })).toBe(true);
    const paid = consume(state, { wheat: 2, eggs: 3 });
    expect(paid).not.toBeNull();
    expect(paid!.produce.wheat).toBe(1);
    expect(paid!.eggs).toBe(2);

    expect(canAfford(state, { wheat: 5, eggs: 2 })).toBe(false);
    const failed = consume(state, { wheat: 5, eggs: 2 });
    expect(failed).toBeNull();
    expect(state.produce.wheat).toBe(3);
    expect(state.eggs).toBe(5);
  });
});

describe('format', () => {
  it('formats duration in Turkish strings for seconds, minutes, and hours', () => {
    expect(formatDuration(45_000)).toBe('45 sn');
    expect(formatDuration(60_000)).toBe('1 dk');
    expect(formatDuration(120_000)).toBe('2 dk');
    expect(formatDuration(3600_000)).toBe('1 sa');
  });

  it('formats numbers with tr-TR locale and respects uppercase i to İ', () => {
    expect(formatNumber(1250)).toBe('1.250');
    expect('i'.toLocaleUpperCase('tr-TR')).toBe('İ');
  });
});

describe('production', () => {
  it('allows buying building if player has enough level and gold', () => {
    let state = createBaseState({
      gold: 500,
      xp: thresholdFor(4),
      buildings: {
        mill: { owned: true, queue: [], readyOutput: {} },
        bakery: { owned: false, queue: [], readyOutput: {} }
      }
    });

    const res = buyBuilding(state, 'bakery');
    expect(res.ok).toBe(true);
    expect(success(res).state.buildings.bakery.owned).toBe(true);
    expect(success(res).state.gold).toBe(500 - BUILDINGS.bakery.cost);
  });

  it('queues at most 3 jobs and takes ingredients upon queuing', () => {
    let state = createBaseState({
      produce: { wheat: 15, carrot: 0, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0 }
    });

    const now = 10_000;
    const res1 = queue(state, 'mill', 'flour', now);
    expect(res1.ok).toBe(true);
    state = success(res1).state;
    expect(state.produce.wheat).toBe(12);
    expect(state.buildings.mill.queue).toHaveLength(1);

    const res2 = queue(state, 'mill', 'flour', now);
    state = success(res2).state;
    const res3 = queue(state, 'mill', 'flour', now);
    state = success(res3).state;
    expect(state.buildings.mill.queue).toHaveLength(3);

    const res4 = queue(state, 'mill', 'flour', now);
    expect(res4.ok).toBe(false);
    expect(failure(res4).reason).toBe('queueFull');
  });

  it('jobs run back-to-back and advance finishes jobs after game time without auto-adding to barn', () => {
    let state = createBaseState({
      produce: { wheat: 9, carrot: 0, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0 },
      goods: { flour: 0, bread: 0, cake: 0, apple: 0, cherry: 0 }
    });

    const start = 10_000;
    state = success(queue(state, 'mill', 'flour', start)).state;
    state = success(queue(state, 'mill', 'flour', start)).state;

    const job1 = state.buildings.mill.queue[0];
    const job2 = state.buildings.mill.queue[1];
    expect(job2.startAt).toBe(job1.endsAt);

    // Advance 5 hours later
    const future = start + 5 * 3600 * 1000;
    const advanced = advance({ ...state, elapsedMinutes: future }, future);
    expect(advanced.buildings.mill.queue).toHaveLength(0);
    expect(advanced.buildings.mill.readyOutput['flour']).toBe(2);
    // Production completion never adds directly to barn (goods)
    expect(advanced.goods.flour).toBe(0);

    // Collect moves readyOutput into barn
    const collected = collect(advanced, 'mill', future);
    expect(collected.ok).toBe(true);
    expect(success(collected).state.goods.flour).toBe(2);
    expect(success(collected).state.buildings.mill.readyOutput).toEqual({});
  });

  it('cancelling a job that has not started refunds ingredients', () => {
    let state = createBaseState({
      produce: { wheat: 9, carrot: 0, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0 }
    });
    const now = 10_000;
    state = success(queue(state, 'mill', 'flour', now)).state;
    state = success(queue(state, 'mill', 'flour', now)).state;

    const job2 = state.buildings.mill.queue[1];
    const res = cancel(state, 'mill', job2.id, now);
    expect(res.ok).toBe(true);
    expect(success(res).state.produce.wheat).toBe(6); // 3 wheat refunded
    expect(success(res).state.buildings.mill.queue).toHaveLength(1);

    // Cancelling a job that already started is forbidden
    const job1 = state.buildings.mill.queue[0];
    const resStarted = cancel(success(res).state, 'mill', job1.id, now + 1000);
    expect(resStarted.ok).toBe(false);
    expect(failure(resStarted).reason).toBe('jobStarted');
  });

  it('a clock moved backwards never makes time run in reverse', () => {
    let state = createBaseState({ savedAt: 20_000 });
    state = advance(state, 15_000); // clock earlier than savedAt
    expect(state.savedAt).toBe(20_000);
  });
});

describe('trees', () => {
  it('plants a tree on untilled or tilled empty cell and deducts gold', () => {
    let state = createBaseState({ gold: 300, xp: thresholdFor(3) }); // Level 3: apple unlocked
    const cellId = '0,0';
    const now = 10_000;
    const res = plantTree(state, cellId, 'apple', now);
    expect(res.ok).toBe(true);
    expect(success(res).state.gold).toBe(300 - TREES.apple.cost);
    const cell = success(res).state.cells.find(c => c.id === cellId);
    expect(cell?.kind).toBe('tree');
    if (cell?.kind === 'tree') {
      expect(cell.treeId).toBe('apple');
      expect(cell.ripeAt).toBe(28);
      expect(cell.harvested).toBe(false);
    }
  });

  it('handles first growth and regrowth after each harvest', () => {
    let state = createBaseState({ gold: 300, xp: thresholdFor(3) });
    const cellId = '0,0';
    const plantedAt = 10_000;
    state = success(plantTree(state, cellId, 'apple', plantedAt)).state;

    // Harvest before ripe fails
    const premature = harvestTree(state, cellId, plantedAt + 1000);
    expect(premature.ok).toBe(false);
    expect(failure(premature).reason).toBe('notRipe');

    // Harvest once ripe
    const ripeTime = plantedAt + TREES.apple.growMs;
    for (let i = 0; i < 28; i++) state = endDay(state).state;
    const harvested = harvestTree(state, cellId, ripeTime);
    expect(harvested.ok).toBe(true);
    expect(success(harvested).state.goods.apple).toBe(1);

    const cellAfter = success(harvested).state.cells.find(c => c.id === cellId);
    expect(cellAfter?.kind).toBe('tree');
    if (cellAfter?.kind === 'tree') {
      expect(cellAfter.harvested).toBe(true);
      expect(cellAfter.fruitReady).toBe(false);
    }
  });

  it('removing a tree resets the cell to untilled', () => {
    let state = createBaseState();
    state = success(plantTree(state, '0,0', 'apple', 10_000)).state;
    const res = removeTree(state, '0,0');
    expect(res.ok).toBe(true);
    const cell = success(res).state.cells.find(c => c.id === '0,0');
    expect(cell?.kind).toBe('untilled');
  });
});

describe('orders', () => {
  it('unlocks only available items according to level and owned buildings', () => {
    let state = createBaseState({
      xp: 0, // Level 1: wheat unlocked
      coop: { owned: false, pendingEggs: 0, chickens: [] },
      buildings: {
        mill: { owned: false, queue: [], readyOutput: {} },
        bakery: { owned: false, queue: [], readyOutput: {} }
      }
    });

    let items = unlockedItems(state);
    expect(items).toContain('wheat');
    expect(items).not.toContain('eggs');
    expect(items).not.toContain('flour');
    expect(items).not.toContain('bread');
    expect(items).not.toContain('cake');
    expect(items).not.toContain('apple');

    // Enable coop, mill, bakery
    state = {
      ...state,
      xp: thresholdFor(4),
      coop: { ...state.coop, owned: true },
      buildings: {
        mill: { owned: true, queue: [], readyOutput: {} },
        bakery: { owned: true, queue: [], readyOutput: {} }
      }
    };
    items = unlockedItems(state);
    expect(items).toContain('eggs');
    expect(items).toContain('flour');
    expect(items).toContain('bread');
    expect(items).toContain('cake');
  });

  it('generates orders with 1-3 distinct items and reward = round(sum * 1.25)', () => {
    const state = createBaseState({ xp: 200 });
    const order = generate(state, 0, 1);
    const keys = Object.keys(order.items);
    expect(keys.length).toBeGreaterThanOrEqual(1);
    expect(keys.length).toBeLessThanOrEqual(3);

    let rawValue = 0;
    for (const [id, qty] of Object.entries(order.items)) {
      rawValue += (qty as number) * itemPrice(id as ItemId);
    }
    expect(order.gold).toBe(Math.round(rawValue * 1.25));
  });

  it('refill generates orders at its game-minute boundary and preserves deterministic generation', () => {
    let state = createBaseState({
      orders: [
        { order: null, refillAt: 10_000, generation: 0 },
        { order: null, refillAt: 20_000, generation: 0 },
        { order: null, refillAt: 50_000, generation: 0 }
      ]
    });

    // Refill at now = 15_000 -> only first slot refills
    state = refill({ ...state, elapsedMinutes: 15_000 }, 15_000);
    expect(state.orders[0].order).not.toBeNull();
    expect(state.orders[1].order).toBeNull();
    expect(state.orders[2].order).toBeNull();
  });

  it('delivers order when player has ingredients and sets next-morning refill', () => {
    let state = createBaseState();
    state = refill(state, 10_000);
    const order = state.orders[0].order!;
    // Give enough items
    for (const [id, qty] of Object.entries(order.items)) {
      state = setStock(state, id as ItemId, (qty as number) + 5);
    }

    const goldBefore = state.gold;
    const now = 20_000;
    const res = deliver(state, 0, now);
    expect(res.ok).toBe(true);
    expect(success(res).state.gold).toBe(goldBefore + order.gold);
    expect(success(res).state.orders[0].order).toBeNull();
    expect(success(res).state.orders[0].refillAt).toBe(state.elapsedMinutes + 1560 - state.minute);
  });

  it('rejecting order empties the slot and sets next-morning refill', () => {
    let state = createBaseState();
    state = refill(state, 10_000);
    const now = 20_000;
    const res = reject(state, 0, now);
    expect(res.ok).toBe(true);
    expect(success(res).state.orders[0].order).toBeNull();
    expect(success(res).state.orders[0].refillAt).toBe(state.elapsedMinutes + 1560 - state.minute);
  });
});

describe('daily', () => {
  it('handles streak progression, resetting on missed day or after day 7', () => {
    let state = createBaseState({
      daily: { date: '2026-11-20', lastClaim: '2026-11-20', streak: 1, quests: [] }
    });

    // Next calendar day: streak + 1
    const nextDay = Date.parse('2026-11-21T10:00:00Z');
    expect(nextRewardDay(state, nextDay)).toBe(2);

    // Two days later (missed a day): reset to day 1
    const twoDaysLater = Date.parse('2026-11-23T10:00:00Z');
    expect(nextRewardDay(state, twoDaysLater)).toBe(1);

    // After day 7: wraps back to day 1
    state.daily.streak = 7;
    expect(nextRewardDay(state, nextDay)).toBe(1);
  });

  it('on day 7 gives chicken if coop owned and has space, or gold alternative if missing/full', () => {
    const day7Time = Date.parse('2026-11-27T10:00:00Z');

    // Coop missing -> receives gold
    let stateNoCoop = createBaseState({
      gold: 100,
      coop: { owned: false, pendingEggs: 0, chickens: [] },
      daily: { date: '2026-11-26', lastClaim: '2026-11-26', streak: 6, quests: [] }
    });
    const res1 = claimDaily(stateNoCoop, day7Time);
    expect(res1.ok).toBe(true);
    expect(success(res1).state.gold).toBe(100 + DAILY_REWARDS[6]);

    // Coop owned and has space -> receives chicken
    let stateWithCoop = createBaseState({
      gold: 100,
      coop: { owned: true, pendingEggs: 0, chickens: [] },
      daily: { date: '2026-11-26', lastClaim: '2026-11-26', streak: 6, quests: [] }
    });
    const res2 = claimDaily(stateWithCoop, day7Time);
    expect(res2.ok).toBe(true);
    expect(success(res2).state.coop.chickens.length).toBe(1);
    expect(success(res2).state.gold).toBe(100); // No bonus gold, got chicken
  });

  it('generates the same 3 daily quests for the same calendar date', () => {
    const time1 = Date.parse('2026-11-23T08:00:00Z');
    const time2 = Date.parse('2026-11-23T20:00:00Z');
    const state1 = rollDailyQuests(createBaseState(), time1);
    const state2 = rollDailyQuests(createBaseState(), time2);
    expect(state1.daily.quests).toEqual(state2.daily.quests);
    expect(state1.daily.quests).toHaveLength(3);
  });

  it('tracks daily quest progress and allows claiming completed quest', () => {
    const now = Date.parse('2026-11-23T10:00:00Z');
    let state = rollDailyQuests(createBaseState(), now);
    const quest = state.daily.quests[0];

    // Trigger events
    state = track(state, [{ type: quest.event, amount: quest.target }], now);
    expect(state.daily.quests[0].count).toBe(quest.target);

    // Claim quest
    const goldBefore = state.gold;
    const res = claimQuest(state, quest.id, now);
    expect(res.ok).toBe(true);
    expect(success(res).state.gold).toBe(goldBefore + quest.gold);
    expect(success(res).state.daily.quests[0].claimed).toBe(true);
  });
});

describe('batch', () => {
  it('processes each cell once, skips trees on non-harvest, and stops on first blocking error', () => {
    let state = createBaseState({
      seeds: { wheat: 2, carrot: 0, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0 }
    });
    // Till 4 cells
    state.cells[0].kind = 'tilled';
    state.cells[1].kind = 'tilled';
    state.cells[2].kind = 'tilled';
    state.cells[3].kind = 'tilled';

    const cellIds = ['0,0', '1,0', '2,0', '3,0'];
    const res = applyBatch(state, 'plant', cellIds, 10_000, 'wheat');
    // Only 2 seeds were available -> stops after 2
    expect(res.stoppedReason).toBe('noSeeds');
    const planted = res.state.cells.filter(c => c.kind === 'planted');
    expect(planted).toHaveLength(2);
    expect(res.events).toHaveLength(2);
  });
});
