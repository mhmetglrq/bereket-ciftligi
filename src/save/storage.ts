import { get, set, del } from 'idb-keyval';
import { newGame } from '../sim/grid';
import type { GameState } from '../sim/types';
import { deserialize, serialize } from './serialize';

export const SAVE_KEY = 'bereket-ciftligi:save:v1';

export interface Backend {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
  remove(key: string): void | Promise<void>;
}
export type StorageMode = 'local' | 'idb' | 'memory';

export function memoryBackend(): Backend {
  const values = new Map<string, string>();
  return {
    get: key => values.get(key) ?? null,
    set: (key, value) => { values.set(key, value); },
    remove: key => { values.delete(key); }
  };
}

export class SaveStorage {
  private index = 0;
  private selected = false;
  private readonly modes: StorageMode[] = ['local', 'idb', 'memory'];

  constructor(private readonly backends: [Backend, Backend, Backend]) {}

  get mode(): StorageMode { return this.modes[this.index]; }

  async read(key = SAVE_KEY): Promise<string | null> {
    if (this.selected) return this.backends[this.index].get(key);
    // A successful null is definitive: do not consult another backend.
    for (; this.index < this.backends.length - 1; this.index++) {
      try {
        const result = await this.backends[this.index].get(key);
        this.selected = true;
        return result;
      } catch {
        // Only a storage exception permits trying the next backend.
      }
    }
    this.selected = true;
    return this.backends[this.index].get(key);
  }

  async write(raw: string, key = SAVE_KEY): Promise<void> {
    this.selected = true;
    for (;;) {
      try {
        // localStorage's write happens synchronously, including on pagehide.
        await this.backends[this.index].set(key, raw);
        return;
      } catch (error) {
        if (this.index === this.backends.length - 1) throw error;
        this.index++;
      }
    }
  }

  async remove(key = SAVE_KEY): Promise<void> {
    await this.backends[this.index].remove(key);
  }
}

export function browserStorage(): SaveStorage {
  return new SaveStorage([
    {
      get: key => window.localStorage.getItem(key),
      set: (key, value) => window.localStorage.setItem(key, value),
      remove: key => window.localStorage.removeItem(key)
    },
    {
      get: async key => (await get<string>(key)) ?? null,
      set: (key, value) => set(key, value),
      remove: key => del(key)
    },
    memoryBackend()
  ]);
}

export interface LoadResult {
  state: GameState;
  notice: 'corrupt' | 'future' | 'corruptBackupFailed' | null;
  readonly: boolean;
}

export async function loadGame(storage: SaveStorage, now: number): Promise<LoadResult> {
  const raw = await storage.read();
  if (raw === null) return { state: newGame(now), notice: null, readonly: false };
  const decoded = deserialize(raw);
  if (decoded.kind === 'ok') {
    return { state: decoded.state, notice: null, readonly: false };
  }
  if (decoded.kind === 'future') {
    return { state: newGame(now), notice: 'future', readonly: true };
  }
  try {
    await storage.write(raw, `${SAVE_KEY}:corrupt:${now}`);
    return { state: newGame(now), notice: 'corrupt', readonly: false };
  } catch {
    return { state: newGame(now), notice: 'corruptBackupFailed', readonly: true };
  }
}

export function saveGame(storage: SaveStorage, state: GameState, now: number): Promise<void> {
  return storage.write(serialize({ ...state, savedAt: now }));
}
