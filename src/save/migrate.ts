import { emptyInventory, QUESTS } from '../sim/data';
import { isGameState, isLegacyGameState, versionOf } from './schema';
import type { GameState } from '../sim/types';

export type DecodeResult =
  | { kind: 'ok'; state: GameState }
  | { kind: 'future' }
  | { kind: 'corrupt' };

export function migrate(value: unknown): DecodeResult {
  const version = versionOf(value);
  if (version !== null && version > 2) return { kind: 'future' };
  if (version === 1) {
    if (!isLegacyGameState(value)) return { kind: 'corrupt' };
    const candidate: GameState = {
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
    return isGameState(candidate) ? { kind: 'ok', state: candidate } : { kind: 'corrupt' };
  }
  return isGameState(value) ? { kind: 'ok', state: value } : { kind: 'corrupt' };
}
