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
  private legacyRaw: string | null = null;
  private protectedBackends = new Set<number>();
  private readonly modes: StorageMode[] = ['local', 'idb', 'memory'];

  constructor(private readonly backends: [Backend, Backend, Backend]) {}

  get mode(): StorageMode { return this.modes[this.index]; }

  async read(key = SAVE_KEY): Promise<string | null> {
    if (this.selected) return this.backends[this.index].get(key);
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

  async protectV1(raw: string): Promise<void> {
    this.legacyRaw = raw;
    await this.ensureBackup();
  }

  private async ensureBackup(): Promise<void> {
    if (this.legacyRaw === null || this.protectedBackends.has(this.index)) return;
    const backend = this.backends[this.index];
    const key = `${SAVE_KEY}:backup:v1`;
    if (await backend.get(key) === null) await backend.set(key, this.legacyRaw);
    this.protectedBackends.add(this.index);
  }

  async write(raw: string, key = SAVE_KEY): Promise<void> {
    this.selected = true;
    for (;;) {
      // Backup errors must propagate: never overwrite an unprotected legacy save.
      if (key === SAVE_KEY) await this.ensureBackup();
      try {
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
  notice: 'corrupt' | 'future' | 'corruptBackupFailed' | 'migrationBackupFailed' | null;
  readonly: boolean;
}

export async function loadGame(storage: SaveStorage, now: number): Promise<LoadResult> {
  const raw = await storage.read();
  if (raw === null) return { state: newGame(now), notice: null, readonly: false };
  const decoded = deserialize(raw);
  if (decoded.kind === 'ok') {
    const original: unknown = JSON.parse(raw);
    if (typeof original === 'object' && original !== null &&
      'version' in original && original.version === 1) {
      try {
        await storage.protectV1(raw);
      } catch {
        return { state: decoded.state, notice: 'migrationBackupFailed', readonly: true };
      }
    }
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
