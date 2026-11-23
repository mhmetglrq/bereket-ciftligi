import { CHICKEN_COST, COOP_COST, MAX_CHICKENS } from './data';
import type { GameState, Result } from './types';

export function settleCoop(state: GameState, now: number): GameState {
  return state;
}

export function buyCoop(state: GameState): Result {
  if (state.coop.owned) return { ok: false, reason: 'alreadyOwned' };
  if (state.gold < COOP_COST) return { ok: false, reason: 'notEnoughGold' };
  return {
    ok: true,
    state: { ...state, gold: state.gold - COOP_COST, coop: { ...state.coop, owned: true } },
    events: [{ type: 'buyCoop', amount: 1 }]
  };
}

export function buyChicken(state: GameState): Result {
  if (!state.coop.owned) return { ok: false, reason: 'needCoop' };
  if (state.coop.chickens.length >= MAX_CHICKENS) return { ok: false, reason: 'coopFull' };
  if (state.gold < CHICKEN_COST) return { ok: false, reason: 'notEnoughGold' };
  let index = 1;
  while (state.coop.chickens.some(chicken => chicken.id === `chicken-${index}`)) index++;
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold - CHICKEN_COST,
      coop: {
        ...state.coop,
        chickens: [...state.coop.chickens, { id: `chicken-${index}`, fedAt: null }]
      }
    },
    events: [{ type: 'buyChicken', amount: 1 }]
  };
}

export function feed(state: GameState, chickenId: string, now: number): Result {
  state = settleCoop(state, now);
  if (!state.coop.owned) return { ok: false, reason: 'needCoop' };
  const chicken = state.coop.chickens.find(item => item.id === chickenId);
  if (!chicken) return { ok: false, reason: 'missingChicken' };
  if (chicken.fedAt !== null) return { ok: false, reason: 'alreadyFed' };
  if (state.produce.wheat < 1) return { ok: false, reason: 'noWheat' };
  return {
    ok: true,
    state: {
      ...state,
      produce: { ...state.produce, wheat: state.produce.wheat - 1 },
      coop: {
        ...state.coop,
        chickens: state.coop.chickens.map(item =>
          item.id === chickenId ? { ...item, fedAt: now } : item)
      }
    },
    events: [{ type: 'feed', amount: 1 }]
  };
}

export function feedAll(state: GameState, now: number): Result {
  state = settleCoop(state, now);
  if (!state.coop.owned) return { ok: false, reason: 'needCoop' };
  if (!state.coop.chickens.some(chicken => chicken.fedAt === null)) {
    return { ok: false, reason: 'alreadyFed' };
  }
  if (state.produce.wheat < 1) return { ok: false, reason: 'noWheat' };
  let remaining = state.produce.wheat;
  const chickens = state.coop.chickens.map(chicken => {
    if (chicken.fedAt !== null || remaining === 0) return chicken;
    remaining--;
    return { ...chicken, fedAt: now };
  });
  return {
    ok: true,
    state: {
      ...state,
      produce: { ...state.produce, wheat: remaining },
      coop: { ...state.coop, chickens }
    },
    events: [{ type: 'feed', amount: state.produce.wheat - remaining }]
  };
}

export function collectEgg(state: GameState, now: number): Result {
  state = settleCoop(state, now);
  if (!state.coop.owned) return { ok: false, reason: 'needCoop' };
  const amount = state.coop.pendingEggs;
  if (amount === 0) return { ok: false, reason: 'noEggs' };
  return {
    ok: true,
    state: {
      ...state,
      eggs: state.eggs + amount,
      coop: { ...state.coop, pendingEggs: 0 }
    },
    events: [{ type: 'collectEgg', amount }]
  };
}
