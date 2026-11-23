import { isRipe } from './crops';
import { CROPS } from './data';
import { buyExpansion, buySeed, sell, sellEgg } from './economy';
import { buyChicken, buyCoop, collectEgg, feed, feedAll } from './coop';
import { applyQuestEvents, claimQuest } from './quests';
import { rescue } from './rescue';
import { isUnlocked, xpFor } from './xp';
import { inSeason } from './seasons';
import { eat, buyFood } from './energy';
import { sellItem } from './economy';
import * as production from './production';
import * as orders from './orders';
import * as daily from './daily';
import { plantTree, harvestTree, removeTree } from './trees';
import type { Action, Cell, CropId, GameState, Result, Tool } from './types';

export { buyExpansion, buySeed, sell, sellEgg, claimQuest };

function replace(state: GameState, cell: Cell): GameState {
  return { ...state, cells: state.cells.map(item => item.id === cell.id ? cell : item) };
}

export function till(state: GameState, cellId: string): Result {
  const cell = state.cells.find(item => item.id === cellId);
  if (!cell) return { ok: false, reason: 'missingCell' };
  if (cell.kind === 'tree') return { ok: false, reason: 'treeOccupied' };
  if (cell.dead) return { ok: true, state: replace(state, { id: cell.id, x: cell.x, y: cell.y, kind: 'untilled' }), events: [] };
  if (cell.kind !== 'untilled') return { ok: false, reason: 'alreadyTilled' };
  if (state.energy < 2) return { ok: false, reason: 'noEnergy' };
  return {
    ok: true,
    state: { ...replace(state, { ...cell, kind: 'tilled', wateredToday: state.weather === 'rain' }), energy: state.energy - 2 },
    events: [{ type: 'till', amount: 1 }]
  };
}

export function plant(state: GameState, cellId: string, cropId: CropId, now: number): Result {
  if (!isUnlocked(cropId, state.xp)) return { ok: false, reason: 'locked' };
  if (state.season === 'winter') return { ok: false, reason: 'winter' };
  if (!inSeason(cropId, state.season)) return { ok: false, reason: 'wrongSeason' };
  const cell = state.cells.find(item => item.id === cellId);
  if (!cell) return { ok: false, reason: 'missingCell' };
  if (cell.kind === 'untilled') return { ok: false, reason: 'needTill' };
  if (cell.kind === 'tree') return { ok: false, reason: 'treeOccupied' };
  if (cell.kind === 'planted') return { ok: false, reason: 'occupied' };
  if (state.seeds[cropId] < 1) return { ok: false, reason: 'noSeeds' };
  return {
    ok: true,
    state: {
      ...replace(state, { ...cell, kind: 'planted', cropId, plantedAt: now, daysRemaining: CROPS[cropId].days, growthDays: CROPS[cropId].days, wateredToday: cell.wateredToday || state.weather === 'rain' }),
      seeds: { ...state.seeds, [cropId]: state.seeds[cropId] - 1 }
    },
    events: [{ type: 'plant', cropId, amount: 1 }]
  };
}

export function harvest(state: GameState, cellId: string, now: number): Result {
  const cell = state.cells.find(item => item.id === cellId);
  if (cell?.kind === 'tree') return harvestTree(state, cellId, now);
  if (!cell) return { ok: false, reason: 'missingCell' };
  if (cell.kind !== 'planted') return { ok: false, reason: 'notPlanted' };
  if (!isRipe(cell, now)) return { ok: false, reason: 'notRipe' };
  return {
    ok: true,
    state: {
      ...replace(state, CROPS[cell.cropId].regrow ? { ...cell, daysRemaining: CROPS[cell.cropId].regrow, growthDays: CROPS[cell.cropId].regrow } : { id: cell.id, x: cell.x, y: cell.y, kind: 'tilled', wateredToday: cell.wateredToday }),
      produce: { ...state.produce, [cell.cropId]: state.produce[cell.cropId] + 1 }
    },
    events: [{ type: 'harvest', cropId: cell.cropId, amount: 1 }]
  };
}

export function water(state: GameState, cellId: string, now: number): Result {
  const cell = state.cells.find(item => item.id === cellId);
  if (cell?.wateredToday) return { ok: false, reason: 'alreadyWatered' };
  if (cell?.kind === 'tree') return { ok: false, reason: 'treeOccupied' };
  if (!cell || (cell.kind !== 'planted' && cell.kind !== 'tilled') || cell.dead) {
    return { ok: false, reason: 'notApplicable' };
  }
  if (state.energy < 2) return { ok: false, reason: 'noEnergy' };
  return {
    ok: true,
    state: { ...replace(state, { ...cell, wateredToday: true }), energy: state.energy - 2 },
    events: [{ type: 'water', amount: 1 }]
  };
}

export function applyAction(state: GameState, action: Action, now: number): Result {
  now = state.elapsedMinutes;
  state = daily.rollDailyQuests(orders.refill(production.advance(state, now), now), now);
  let result: Result;
  switch (action.type) {
    case 'eat': result = eat(state, action.itemId); break;
    case 'buyFood': result = buyFood(state, action.itemId); break;
    case 'buyBuilding': result = production.buyBuilding(state, action.buildingId); break;
    case 'queueProduction': result = production.queue(state, action.buildingId, action.recipeId, now); break;
    case 'cancelProduction': result = production.cancel(state, action.buildingId, action.jobId, now); break;
    case 'collectProduction': result = production.collect(state, action.buildingId, now); break;
    case 'plantTree': result = plantTree(state, action.cellId, action.treeId, now); break;
    case 'removeTree': result = removeTree(state, action.cellId); break;
    case 'sellItem': result = sellItem(state, action.itemId, action.amount); break;
    case 'deliverOrder': result = orders.deliver(state, action.slot, now); break;
    case 'rejectOrder': result = orders.reject(state, action.slot, now); break;
    case 'claimDaily': return { ok: false, reason: 'notApplicable' };
    case 'claimDailyQuest': result = daily.claimQuest(state, action.questId, now); break;
    case 'till': result = till(state, action.cellId); break;
    case 'plant': result = plant(state, action.cellId, action.cropId, now); break;
    case 'harvest': result = harvest(state, action.cellId, now); break;
    case 'water': result = water(state, action.cellId, now); break;
    case 'sell': result = sell(state, action.cropId, action.amount); break;
    case 'sellEgg': result = sellEgg(state, action.amount); break;
    case 'buySeed': result = buySeed(state, action.cropId, action.amount); break;
    case 'expand': result = buyExpansion(state); break;
    case 'claim': result = claimQuest(state, action.questId); break;
    case 'buyCoop': result = buyCoop(state); break;
    case 'buyChicken': result = buyChicken(state); break;
    case 'feed': result = feed(state, action.chickenId, now); break;
    case 'feedAll': result = feedAll(state, now); break;
    case 'collectEgg': result = collectEgg(state, now); break;
  }
  if (!result.ok) return result;
  const checked = rescue(daily.track(applyQuestEvents({
    ...result.state,
    xp: result.state.xp + xpFor(result.events)
  }, result.events), result.events, now));
  return {
    ok: true,
    state: checked.state,
    events: checked.gifted ? [...result.events, { type: 'rescue', amount: 5 }] : result.events
  };
}

export function canApply(
  tool: Tool, cell: Cell, state: GameState, now: number, cropId: CropId = 'wheat'
): boolean {
  switch (tool) {
    case 'till': return till(state, cell.id).ok;
    case 'plant': return plant(state, cell.id, cropId, now).ok;
    case 'harvest': return harvest(state, cell.id, now).ok;
    case 'water': return water(state, cell.id, now).ok;
  }
}
