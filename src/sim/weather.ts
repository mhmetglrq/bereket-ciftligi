import { hashString, mulberry32 } from './rng';
import { dayKey } from './seasons';
import type { GameState, Season } from './types';
export const weatherFor = (seed: string | number, season: Season): GameState['weather'] => season !== 'winter' && mulberry32(hashString(String(seed)))() < 0.2 ? 'rain' : 'sunny';
export function morningWeather(state: GameState): GameState {
  const weather = weatherFor(`${state.createdAt}:${dayKey(state)}`, state.season);
  return { ...state, weather, cells: state.cells.map(c => ({ ...c, wateredToday: weather === 'rain' && (c.kind === 'planted' || c.kind === 'tilled') })) };
}
