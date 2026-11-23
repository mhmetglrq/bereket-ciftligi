import { describe, it, expect } from 'vitest';
import { buyCoop, buyChicken, feed, feedAll, collectEgg, settleCoop } from '../../src/sim/coop';
import { endDay } from '../../src/sim/dayEnd';
import { applyAction } from '../../src/sim/actions';
import { COOP_COST, CHICKEN_COST, MAX_CHICKENS, EGG_PRICE } from '../../src/sim/data';
import { newGame } from '../../src/sim/grid';
import type { GameState } from '../../src/sim/types';

describe('Coop & Chicken simulation', () => {
  const now = 1_000_000;

  function gameWithCoop(gold = 1000, wheat = 5): GameState {
    const state = newGame(now);
    return {
      ...state,
      gold,
      produce: { ...state.produce, wheat }
    };
  }

  it('buys coop for 120 gold, allows only 1 coop', () => {
    const state = gameWithCoop(200);
    const bought = buyCoop(state);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;

    expect(bought.state.gold).toBe(200 - COOP_COST);
    expect(bought.state.coop.owned).toBe(true);

    // Cannot buy another coop
    const secondCoop = buyCoop(bought.state);
    expect(secondCoop.ok).toBe(false);
    if (!secondCoop.ok) {
      expect(secondCoop.reason).toBe('alreadyOwned');
    }
  });

  it('fails buying coop or chickens without enough gold or without coop', () => {
    const stateNoGold = gameWithCoop(50);
    expect(buyCoop(stateNoGold).ok).toBe(false);

    // Cannot buy chicken without coop
    expect(buyChicken(stateNoGold).ok).toBe(false);
    const noCoopRes = buyChicken(stateNoGold);
    if (!noCoopRes.ok) expect(noCoopRes.reason).toBe('needCoop');

    // With coop but not enough gold
    const withCoop = { ...stateNoGold, coop: { owned: true, chickens: [], pendingEggs: 0 }, gold: 20 };
    const noGoldChicken = buyChicken(withCoop);
    expect(noGoldChicken.ok).toBe(false);
    if (!noGoldChicken.ok) expect(noGoldChicken.reason).toBe('notEnoughGold');
  });

  it('enforces maximum 3 chickens', () => {
    let state: GameState = {
      ...gameWithCoop(500),
      coop: { owned: true, chickens: [], pendingEggs: 0 }
    };

    for (let i = 0; i < MAX_CHICKENS; i++) {
      const res = buyChicken(state);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      state = res.state;
    }
    expect(state.coop.chickens.length).toBe(3);

    // 4th chicken must fail
    const fourth = buyChicken(state);
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) {
      expect(fourth.reason).toBe('coopFull');
    }
  });

  it('feeding 1 chicken uses 1 wheat; cannot feed if already fed or 0 wheat', () => {
    let state: GameState = {
      ...gameWithCoop(500, 1),
      coop: {
        owned: true,
        chickens: [{ id: 'chicken-1', fedAt: null }],
        pendingEggs: 0
      }
    };

    const fed = feed(state, 'chicken-1', now);
    expect(fed.ok).toBe(true);
    if (!fed.ok) return;

    expect(fed.state.produce.wheat).toBe(0);
    expect(fed.state.coop.chickens[0].fedAt).toBe(now);

    // Feeding already fed chicken fails
    const fedAgain = feed(fed.state, 'chicken-1', now + 1000);
    expect(fedAgain.ok).toBe(false);
    if (!fedAgain.ok) expect(fedAgain.reason).toBe('alreadyFed');

    // Feeding with 0 wheat fails
    const unfedChickenState = {
      ...fed.state,
      coop: {
        ...fed.state.coop,
        chickens: [{ id: 'chicken-2', fedAt: null }]
      }
    };
    const noWheatRes = feed(unfedChickenState, 'chicken-2', now);
    expect(noWheatRes.ok).toBe(false);
    if (!noWheatRes.ok) expect(noWheatRes.reason).toBe('noWheat');
  });

  it('a fed chicken lays 1 egg at day end and becomes hungry again', () => {
    const state: GameState = {
      ...gameWithCoop(500, 2),
      coop: {
        owned: true,
        chickens: [{ id: 'chicken-1', fedAt: now }],
        pendingEggs: 0
      }
    };

    // Before 60s
    const before60s = settleCoop(state, now + 10000);
    expect(before60s.coop.pendingEggs).toBe(0);
    expect(before60s.coop.chickens[0].fedAt).toBe(now);

    // At 60s
    const at60s = endDay(state).state;
    expect(at60s.coop.pendingEggs).toBe(1);
    expect(at60s.coop.chickens[0].fedAt).toBeNull(); // Hungry again
  });

  it('feedAll is limited by wheat available and feeds only hungry chickens', () => {
    const state: GameState = {
      ...gameWithCoop(500, 2), // only 2 wheat
      coop: {
        owned: true,
        chickens: [
          { id: 'chicken-1', fedAt: null },
          { id: 'chicken-2', fedAt: null },
          { id: 'chicken-3', fedAt: null }
        ],
        pendingEggs: 0
      }
    };

    const res = feedAll(state, now);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.state.produce.wheat).toBe(0);
    const fedCount = res.state.coop.chickens.filter(c => c.fedAt === now).length;
    const unfedCount = res.state.coop.chickens.filter(c => c.fedAt === null).length;
    expect(fedCount).toBe(2);
    expect(unfedCount).toBe(1);
  });

  it('collects eggs and sells eggs for 12 gold', () => {
    const state: GameState = {
      ...gameWithCoop(100, 0),
      eggs: 1,
      coop: {
        owned: true,
        chickens: [{ id: 'chicken-1', fedAt: null }],
        pendingEggs: 2
      }
    };

    const collected = collectEgg(state, now);
    expect(collected.ok).toBe(true);
    if (!collected.ok) return;

    expect(collected.state.eggs).toBe(3);
    expect(collected.state.coop.pendingEggs).toBe(0);

    // Selling collected eggs
    const sold = applyAction(collected.state, { type: 'sellEgg', amount: 3 }, now);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;

    expect(sold.state.eggs).toBe(0);
    expect(sold.state.gold).toBe(100 + 3 * EGG_PRICE);
  });
});
