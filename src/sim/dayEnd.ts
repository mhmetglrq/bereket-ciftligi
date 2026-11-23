import { CROPS } from './data';
import { SEASONS, inSeason } from './seasons';
import { morningWeather } from './weather';
import { settleShipping } from './shipping';
import { refill } from './orders';
import { rollDailyQuests } from './daily';
import type { GameState } from './types';
import { applyQuestEvents } from './quests';
import { xpFor } from './xp';
export function endDay(state: GameState, passedOut = false) {
  const penalty = passedOut ? Math.min(Math.floor(state.gold * 0.1), 1000) : 0;
  const shipped = settleShipping({ ...state, gold: state.gold - penalty });
  const nextSeason = state.day === 28 ? SEASONS[(SEASONS.indexOf(state.season) + 1) % 4] : state.season;
  const sold = Object.values(shipped.shipment.items).reduce((sum, qty) => sum + qty, 0);
  const rewarded = applyQuestEvents(shipped.state, sold ? [{ type: 'sell', amount: sold }] : []);
  let next: GameState = { ...rewarded, xp: rewarded.xp + xpFor(sold ? [{ type: 'sell', amount: sold }] : []), day: state.day === 28 ? 1 : state.day + 1, season: nextSeason,
    year: state.year + (state.day === 28 && state.season === 'winter' ? 1 : 0), minute: 360, energy: passedOut ? 135 : 270,
    cells: state.cells.map(c => {
      if (c.kind === 'planted') return { ...c, water: undefined, wateredToday: false, dead: c.dead || (nextSeason !== state.season && !inSeason(c.cropId, nextSeason)), daysRemaining: Math.max(0, (c.daysRemaining ?? CROPS[c.cropId].days) - (!c.dead && c.wateredToday ? 1 : 0)) };
      if (c.kind === 'tree') {
        const ageDays = (c.ageDays ?? 0) + 1;
        return { ...c, ageDays, fruitReady: ageDays >= 28 && nextSeason === (c.treeId === 'cherry' ? 'spring' : 'autumn'), wateredToday: false };
      }
      return { ...c, wateredToday: false };
    }),
    coop: { ...state.coop, pendingEggs: state.coop.pendingEggs + state.coop.chickens.filter(c => c.fedAt !== null).length, chickens: state.coop.chickens.map(c => ({ ...c, fedAt: null })) },
    orders: state.orders.map(o => ({ order: null, refillAt: 0, generation: o.generation + 1 }))
  };
  next = morningWeather(rollDailyQuests(refill(next, next.elapsedMinutes), next.elapsedMinutes));
  return { state: next, penalty, shipment: shipped.shipment };
}
