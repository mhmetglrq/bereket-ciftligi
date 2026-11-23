import { isGameState, versionOf } from './schema';
import type { GameState } from '../sim/types';

export type DecodeResult =
  | { kind: 'ok'; state: GameState }
  | { kind: 'future' }
  | { kind: 'corrupt' };

// Version 1 is the first shipped schema. Unversioned saves are deliberately
// rejected; future migrations belong here, with an explicit fixture per version.
export function migrate(value: unknown): DecodeResult {
  const version = versionOf(value);
  if (version !== null && version > 1) return { kind: 'future' };
  return isGameState(value) ? { kind: 'ok', state: value } : { kind: 'corrupt' };
}
