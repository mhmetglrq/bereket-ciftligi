import { describe, it, expect } from 'vitest';
import { levelOf, thresholdFor, isUnlocked, unlocksBetween, xpFor } from '../../src/sim/xp';
import { buySeed, plant, applyAction } from '../../src/sim/actions';
import { newGame } from '../../src/sim/grid';
import type { GameState } from '../../src/sim/types';

describe('XP and Level progression', () => {
  const now = 1_000_000;

  it('calculates levels according to thresholds (0, 50, 150, 300, 500, +250/lvl)', () => {
    expect(thresholdFor(1)).toBe(0);
    expect(thresholdFor(2)).toBe(50);
    expect(thresholdFor(3)).toBe(150);
    expect(thresholdFor(4)).toBe(300);
    expect(thresholdFor(5)).toBe(500);
    expect(thresholdFor(6)).toBe(750);

    expect(levelOf(0)).toBe(1);
    expect(levelOf(49)).toBe(1);
    expect(levelOf(50)).toBe(2);
    expect(levelOf(149)).toBe(2);
    expect(levelOf(150)).toBe(3);
    expect(levelOf(299)).toBe(3);
    expect(levelOf(300)).toBe(4);
    expect(levelOf(499)).toBe(4);
    expect(levelOf(500)).toBe(5);
    expect(levelOf(749)).toBe(5);
    expect(levelOf(750)).toBe(6);
  });

  it('locks corn until level 3 and strawberry until level 5', () => {
    // Level 1: wheat, carrot, tomato unlocked; corn & strawberry locked
    expect(isUnlocked('wheat', 0)).toBe(true);
    expect(isUnlocked('carrot', 0)).toBe(true);
    expect(isUnlocked('tomato', 0)).toBe(true);
    expect(isUnlocked('corn', 0)).toBe(false);
    expect(isUnlocked('strawberry', 0)).toBe(false);

    // Level 2 (50 XP): corn still locked
    expect(isUnlocked('corn', 50)).toBe(false);

    // Level 3 (150 XP): corn unlocked, strawberry locked
    expect(isUnlocked('corn', 150)).toBe(true);
    expect(isUnlocked('strawberry', 150)).toBe(false);

    // Level 5 (500 XP): strawberry unlocked
    expect(isUnlocked('strawberry', 500)).toBe(true);
  });

  it('rejects buying or planting locked seeds with reason locked', () => {
    const state = newGame(now); // XP = 0 (Level 1)
    const richState: GameState = { ...state, gold: 1000 };

    const buyCornRes = buySeed(richState, 'corn', 1);
    expect(buyCornRes.ok).toBe(false);
    if (!buyCornRes.ok) expect(buyCornRes.reason).toBe('locked');

    const buyStrawberryRes = buySeed(richState, 'strawberry', 1);
    expect(buyStrawberryRes.ok).toBe(false);
    if (!buyStrawberryRes.ok) expect(buyStrawberryRes.reason).toBe('locked');

    // Trying to plant locked crop directly
    const tilled = applyAction(richState, { type: 'till', cellId: '0,0' }, now);
    if (!tilled.ok) throw new Error();
    const stateWithSeeds: GameState = {
      ...tilled.state,
      seeds: { ...tilled.state.seeds, corn: 1 }
    };
    const plantCornRes = plant(stateWithSeeds, '0,0', 'corn', now);
    expect(plantCornRes.ok).toBe(false);
    if (!plantCornRes.ok) expect(plantCornRes.reason).toBe('locked');
  });

  it('detects multiple unlocks when crossing levels at once', () => {
    // Jump from Level 2 (50 XP) to Level 5 (500 XP)
    const unlocks = unlocksBetween(50, 500);
    expect(unlocks).toContain('corn');
    expect(unlocks).toContain('strawberry');
  });

  it('awards correct XP for game events: harvest (+5), sell (+1), collectEgg (+3)', () => {
    expect(xpFor([{ type: 'harvest', cropId: 'wheat', amount: 2 }])).toBe(10);
    expect(xpFor([{ type: 'sell', amount: 5 }])).toBe(5);
    expect(xpFor([{ type: 'collectEgg', amount: 3 }])).toBe(9);
    expect(xpFor([{ type: 'water', amount: 1 }])).toBe(0);
  });
});
