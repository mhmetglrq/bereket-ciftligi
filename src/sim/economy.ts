import { CROPS, EGG_PRICE, EXPANSION_COST } from './data';
import { expandedCells } from './grid';
import { isUnlocked } from './xp';
import type { CropId, GameState, Result } from './types';
import type { ItemId } from './types';
import { getStock, setStock, itemPrice } from './inventory';
import { inSeason } from './seasons';
import { ensurePlotsForCells } from './layout';

export function sellItem(state: GameState, id: ItemId, amount: number | 'all'): Result {
  const count = amount === 'all' ? getStock(state, id) : amount;
  if (!Number.isSafeInteger(count) || count < 1 || count > getStock(state, id)) return { ok: false, reason: 'noProduce' };
  return { ok: true, state: { ...setStock(state, id, getStock(state, id) - count), gold: state.gold + count * itemPrice(id) }, events: [{ type: 'sell', amount: count }] };
}

export function sell(state: GameState, cropId: CropId, amount: number | 'all'): Result {
  const count = amount === 'all' ? state.produce[cropId] : amount;
  if (!Number.isSafeInteger(count) || count < 1) {
    return { ok: false, reason: count === 0 ? 'noProduce' : 'invalidAmount' };
  }
  if (state.produce[cropId] < count) return { ok: false, reason: 'noProduce' };
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold + count * CROPS[cropId].salePrice,
      produce: { ...state.produce, [cropId]: state.produce[cropId] - count }
    },
    events: [{ type: 'sell', cropId, amount: count }]
  };
}

export function sellEgg(state: GameState, amount: number | 'all'): Result {
  const count = amount === 'all' ? state.eggs : amount;
  if (!Number.isSafeInteger(count) || count < 1) {
    return { ok: false, reason: count === 0 ? 'noEggs' : 'invalidAmount' };
  }
  if (state.eggs < count) return { ok: false, reason: 'noEggs' };
  return {
    ok: true,
    state: { ...state, gold: state.gold + count * EGG_PRICE, eggs: state.eggs - count },
    events: [{ type: 'sell', amount: count }]
  };
}

export function buySeed(state: GameState, cropId: CropId, amount: number): Result {
  if (!isUnlocked(cropId, state.xp)) return { ok: false, reason: 'locked' };
  if (state.season === 'winter') return { ok: false, reason: 'winter' };
  if (!inSeason(cropId, state.season)) return { ok: false, reason: 'wrongSeason' };
  if (amount !== 1 && amount !== 5) return { ok: false, reason: 'invalidAmount' };
  const cost = CROPS[cropId].seedCost * amount;
  if (state.gold < cost) return { ok: false, reason: 'notEnoughGold' };
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold - cost,
      seeds: { ...state.seeds, [cropId]: state.seeds[cropId] + amount }
    },
    events: [{ type: 'buySeed', cropId, amount }]
  };
}

export function buyExpansion(state: GameState): Result {
  if (state.gridSize === 8) return { ok: false, reason: 'alreadyExpanded' };
  if (state.gold < EXPANSION_COST) return { ok: false, reason: 'notEnoughGold' };
  const cells = expandedCells(state.cells);
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold - EXPANSION_COST,
      gridSize: 8,
      cells,
      layout: ensurePlotsForCells(state.layout, cells)
    },
    events: [{ type: 'expand', amount: 28 }]
  };
}
