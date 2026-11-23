import type { CropId, Season, GameState } from './types';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES: Record<Season, string> = { spring: 'İlkbahar', summer: 'Yaz', autumn: 'Sonbahar', winter: 'Kış' };
const seasons: Record<CropId, Season[]> = { carrot: ['spring'], strawberry: ['spring'], wheat: ['summer', 'autumn'], tomato: ['summer'], corn: ['summer', 'autumn'], pumpkin: ['autumn'] };
export const inSeason = (id: CropId, season: Season): boolean => seasons[id].includes(season);
export const dayKey = (s: Pick<GameState, 'year' | 'season' | 'day'>): string => `${s.year}:${SEASONS.indexOf(s.season)}:${s.day}`;
