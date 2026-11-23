import { MAX_CHICKENS } from './data';
import { dayKey } from './seasons';
import { hashString, mulberry32 } from './rng';
import type { DailyQuest, GameEvent, GameState, Result } from './types';
export function localDateKey(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const ordinal = (key: string): number => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
export function nextRewardDay(state: GameState, now: number): number {
  const daily = state.daily;
  return daily.lastClaim && ordinal(localDateKey(now)) - ordinal(daily.lastClaim) <= 1 ? daily.streak % 7 + 1 : 1;
}
export const DAILY_REWARDS = [25, 40, 60, 80, 100, 125, 150] as const;
export function rollDailyQuests(state: GameState, now: number): GameState {
  const date = dayKey(state);
  if (state.daily.date === date) return state;
  const rng = mulberry32(hashString(date));
  const pool: DailyQuest['event'][] = ['till', 'plant', 'harvest', 'water', 'sell'];
  const quests: DailyQuest[] = Array.from({ length: 3 }, (_, i) => {
    const event = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const target = 3 + Math.floor(rng() * 6);
    return { id: `${date}:${i}`, event, target, count: 0, claimed: false, gold: target * 8, xp: target * 3 };
  });
  return { ...state, daily: { ...state.daily, date, quests } };
}
export function claimDaily(state: GameState, now: number): Result {
  const date = localDateKey(now);
  if (state.daily.lastClaim && state.daily.lastClaim >= date) return { ok: false, reason: 'dailyClaimed' };
  const streak = nextRewardDay(state, now);
  const chicken = streak === 7 && state.coop.owned && state.coop.chickens.length < MAX_CHICKENS;
  return { ok: true, state: {
    ...state, gold: state.gold + (chicken ? 0 : DAILY_REWARDS[streak - 1]),
    seeds: { ...state.seeds, wheat: state.seeds.wheat + (streak === 7 ? 0 : streak * 2) },
    coop: chicken ? { ...state.coop, chickens: [...state.coop.chickens, { id: `daily:${date}`, fedAt: null }] } : state.coop,
    daily: { ...state.daily, lastClaim: date, streak }
  }, events: [{ type: 'daily', amount: 1 }] };
}
export function track(state: GameState, events: GameEvent[], now: number): GameState {
  state = rollDailyQuests(state, now);
  if (state.daily.date !== dayKey(state)) return state;
  return { ...state, daily: { ...state.daily, quests: state.daily.quests.map(q => q.claimed ? q : { ...q, count: Math.min(q.target, q.count + events.filter(e => e.type === q.event).reduce((n, e) => n + e.amount, 0)) }) } };
}
export function claimQuest(state: GameState, id: string, now: number): Result {
  state = rollDailyQuests(state, now);
  const quest = state.daily.quests.find(q => q.id === id);
  if (state.daily.date !== dayKey(state) || !quest || quest.claimed || quest.count < quest.target) return { ok: false, reason: 'questNotReady' };
  return { ok: true, state: { ...state, gold: state.gold + quest.gold, xp: state.xp + quest.xp, daily: { ...state.daily, quests: state.daily.quests.map(q => q.id === id ? { ...q, claimed: true } : q) } }, events: [{ type: 'daily', amount: 1 }] };
}
