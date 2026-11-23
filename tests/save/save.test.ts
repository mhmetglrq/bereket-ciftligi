import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/sim/grid';
import { migrate } from '../../src/save/migrate';
import { deserialize, serialize } from '../../src/save/serialize';
import { loadGame, memoryBackend, SAVE_KEY, SaveStorage, type Backend } from '../../src/save/storage';
import { Ownership } from '../../src/save/tabLock';

const NOW = 1_000_000;
const broken = (): Backend => ({
  get: () => { throw new Error('unavailable'); },
  set: () => { throw new Error('unavailable'); },
  remove: () => { throw new Error('unavailable'); }
});

describe('schema and serialization', () => {
  it('round trips deeply equal and accepts a v1 fixture', () => {
    const fixture = newGame(NOW);
    expect(deserialize(serialize(fixture))).toEqual({ kind: 'ok', state: fixture });
    expect(migrate(JSON.parse(JSON.stringify(fixture)))).toEqual({ kind: 'ok', state: fixture });
  });
  it('rejects malformed cells, quests, inventories and non-finite values', () => {
    for (const value of [
      { ...newGame(NOW), gold: -1 },
      { ...newGame(NOW), cells: [] },
      { ...newGame(NOW), quests: {} },
      { ...newGame(NOW), seeds: { wheat: '5', carrot: 0, tomato: 0 } },
      { ...newGame(NOW), savedAt: Infinity }
    ]) {
      expect(deserialize(JSON.stringify(value)).kind).toBe('corrupt');
    }
    const duplicated = newGame(NOW);
    duplicated.cells[1] = duplicated.cells[0];
    expect(deserialize(serialize(duplicated)).kind).toBe('corrupt');
  });
  it('does not invent migrations for unknown or unversioned schemas', () => {
    expect(migrate({ version: 0 }).kind).toBe('corrupt');
    expect(migrate({}).kind).toBe('corrupt');
    expect(migrate({ version: 2 }).kind).toBe('future');
  });
});

describe('save recovery and storage selection', () => {
  for (const raw of ['garbage', '{"version":1', '{"version":1,"gold":50}']) {
    it(`backs up corrupt input ${raw}`, async () => {
      const local = memoryBackend();
      await local.set(SAVE_KEY, raw);
      const storage = new SaveStorage([local, memoryBackend(), memoryBackend()]);
      const result = await loadGame(storage, NOW);
      expect(result.state).toEqual(newGame(NOW));
      expect(result.notice).toBe('corrupt');
      expect(await local.get(`${SAVE_KEY}:corrupt:${NOW}`)).toBe(raw);
    });
  }
  it('preserves a future save and marks the session read-only', async () => {
    const local = memoryBackend();
    const raw = '{"version":42,"futureData":true}';
    await local.set(SAVE_KEY, raw);
    const result = await loadGame(new SaveStorage([local, memoryBackend(), memoryBackend()]), NOW);
    expect(result.readonly).toBe(true);
    expect(result.notice).toBe('future');
    expect(await local.get(SAVE_KEY)).toBe(raw);
  });
  it('never reads the second backend after a successful null', async () => {
    let reads = 0;
    const second: Backend = {
      get: () => { reads++; return 'stale'; },
      set: () => undefined,
      remove: () => undefined
    };
    const storage = new SaveStorage([memoryBackend(), second, memoryBackend()]);
    expect(await storage.read()).toBeNull();
    expect(reads).toBe(0);
    expect(storage.mode).toBe('local');
  });
  it('falls back local → idb → memory only on exceptions', async () => {
    const idb = memoryBackend();
    await idb.set(SAVE_KEY, 'idb');
    const storage = new SaveStorage([broken(), idb, memoryBackend()]);
    expect(await storage.read()).toBe('idb');
    expect(storage.mode).toBe('idb');
    const memory = memoryBackend();
    const last = new SaveStorage([broken(), broken(), memory]);
    expect(await last.read()).toBeNull();
    expect(last.mode).toBe('memory');
    await last.write('memory');
    expect(await last.read()).toBe('memory');
  });
  it('moves to fallback on write failure without reading fallback', async () => {
    let fallbackReads = 0;
    const fallback = memoryBackend();
    const storage = new SaveStorage([
      { ...memoryBackend(), set: () => { throw new Error('quota'); } },
      { ...fallback, get: key => { fallbackReads++; return fallback.get(key); } },
      memoryBackend()
    ]);
    await storage.read();
    await storage.write('new');
    expect(storage.mode).toBe('idb');
    expect(fallbackReads).toBe(0);
    expect(await fallback.get(SAVE_KEY)).toBe('new');
  });
});

describe('tab ownership', () => {
  it('a second claim permanently stops the first writer', () => {
    let stopped = 0;
    const first = new Ownership({ id: 'a', openedAt: 100 }, () => stopped++);
    const second = new Ownership({ id: 'b', openedAt: 101 }, () => undefined);
    first.observe(second.claim);
    expect(first.owns).toBe(false);
    expect(second.owns).toBe(true);
    expect(stopped).toBe(1);
    first.observe({ id: 'old', openedAt: 99 });
    expect(first.owns).toBe(false);
    expect(stopped).toBe(1);
  });
});
