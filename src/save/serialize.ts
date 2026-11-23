import type { GameState } from '../sim/types';
import { migrate, type DecodeResult } from './migrate';

export const serialize = (state: GameState): string => JSON.stringify(state);

export function deserialize(raw: string): DecodeResult {
  try {
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return { kind: 'corrupt' };
  }
}
