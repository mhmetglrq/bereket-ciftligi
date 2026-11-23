import { emptyInventory, QUESTS, featureDefaults, CROPS, RECIPES } from '../sim/data';
import { defaultLayout } from '../sim/layout';
import { canPlace } from '../sim/layout';
import { rollDailyQuests } from '../sim/daily';
import { refill } from '../sim/orders';
import { morningWeather } from '../sim/weather';
import { isGameState, isV3GameState, isLegacyGameState, isV2GameState, versionOf, type V2GameState, type V3GameState } from './schema';
import type { GameState } from '../sim/types';

export type DecodeResult =
  | { kind: 'ok'; state: GameState }
  | { kind: 'future' }
  | { kind: 'corrupt' };

export function migrate(value: unknown): DecodeResult {
  const version = versionOf(value);
  if (version !== null && version > 4) return { kind: 'future' };
  if (version === 1) {
    if (!isLegacyGameState(value)) return { kind: 'corrupt' };
    const candidate: V2GameState = {
      ...value,
      version: 2,
      xp: 0,
      eggs: 0,
      coop: { owned: false, chickens: [], pendingEggs: 0 },
      seeds: { ...emptyInventory(), ...value.seeds },
      produce: { ...emptyInventory(), ...value.produce },
      quests: {
        ...Object.fromEntries(QUESTS.map(quest => [
          quest.id, { count: 0, status: 'active' as const }
        ])),
        ...value.quests
      }
    };
    return isV2GameState(candidate) ? migrate(candidate) : { kind: 'corrupt' };
  }
  if (version === 2) {
    if (!isV2GameState(value)) return { kind: 'corrupt' };
    const candidate: V3GameState = { ...value, ...featureDefaults(), version: 3 };
    return migrate(candidate);
  }
  if (version === 3) {
    if (!isV3GameState(value)) return { kind: 'corrupt' };
    const oldDurations = { wheat: 30000, carrot: 60000, tomato: 120000, corn: 180000, strawberry: 300000, pumpkin: 1 };
    const oldJobs = { flour: 45000, bread: 60000, cake: 90000 };
    const state: GameState = { ...value, version: 4, day: 1, season: 'spring', year: 1, minute: 360, elapsedMinutes: 0, energy: 270, weather: 'sunny', shipping: {}, layout: defaultLayout(), seenV4Intro: false,
      seeds: { ...emptyInventory(), ...value.seeds }, produce: { ...emptyInventory(), ...value.produce },
      cells: value.cells.map(c => {
        if (c.kind === 'planted') {
          const duration = oldDurations[c.cropId];
          const bonus = c.water ? Math.max(0, Math.min(value.savedAt, c.water.until) - c.water.at) * 0.5 : 0;
          const ratio = Math.max(0, Math.min(1, (duration - Math.max(0, value.savedAt - c.plantedAt + bonus)) / duration));
          return { ...c, plantedAt: 0, water: undefined, wateredToday: false, growthDays: CROPS[c.cropId].days, daysRemaining: Math.ceil(ratio * CROPS[c.cropId].days) };
        }
        if (c.kind === 'tree') return { ...c, plantedAt: 0, ripeAt: 28, ageDays: Math.min(28, Math.floor(Math.max(0, value.savedAt - c.plantedAt) / (c.treeId === 'apple' ? 240000 : 360000) * 28)), fruitReady: value.savedAt >= c.ripeAt && c.treeId === 'cherry' };
        return c;
      }),
      buildings: { mill: convert('mill'), bakery: convert('bakery') },
      orders: value.orders.map(o => ({ ...o, refillAt: 0 })),
      coop: { ...value.coop, chickens: value.coop.chickens.map(c => ({ ...c, fedAt: c.fedAt === null ? null : 0 })) }
    };
    function convert(id: 'mill' | 'bakery') {
      const building = value as V3GameState;
      const b = building.buildings[id];
      const readyOutput = { ...b.readyOutput };
      const queue = b.queue.flatMap(j => {
        if (j.endsAt <= building.savedAt) { readyOutput[j.recipeId] = (readyOutput[j.recipeId] ?? 0) + 1; return []; }
        const minutes = RECIPES[j.recipeId].ms;
        const endsAt = Math.max(0, Math.ceil((j.endsAt - building.savedAt) / oldJobs[j.recipeId] * minutes));
        return [{ ...j, startAt: Math.max(0, endsAt - minutes), endsAt }];
      });
      return { ...b, queue, readyOutput };
    }
    for (const cell of state.cells) {
      if (cell.kind !== 'tree') continue;
      let placed = false;
      for (let y = -3; y < 10 && !placed; y++) for (let x = -3; x < 10 && !placed; x++) {
        const object = { id: `tree:${cell.id}`, x, y, width: 1, height: 1 };
        if (canPlace(state.layout, object)) { state.layout.push(object); placed = true; }
      }
    }
    if (state.daily.quests.length) state.daily = { ...state.daily, date: '1:0:1' };
    return { kind: 'ok', state: morningWeather(refill(state.daily.quests.length ? state : rollDailyQuests(state, 0), 0)) };
  }
  return isGameState(value) ? { kind: 'ok', state: value } : { kind: 'corrupt' };
}
