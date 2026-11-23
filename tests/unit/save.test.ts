import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/sim/grid';
import { migrate } from '../../src/save/migrate';
import { deserialize, serialize } from '../../src/save/serialize';
import { loadGame, memoryBackend, SAVE_KEY, SaveStorage, type Backend } from '../../src/save/storage';
import { Ownership } from '../../src/save/tabLock';

const NOW = 1_000_000;
const failingBackend = (): Backend => ({
  get: () => { throw new Error('backend get error'); },
  set: () => { throw new Error('backend set error'); },
  remove: () => { throw new Error('backend remove error'); }
});

describe('Save System: Serialization & Schema', () => {
  it('round-trips game state with deep equality', () => {
    const initial = newGame(NOW);
    const deserialized = deserialize(serialize(initial));
    expect(deserialized.kind).toBe('ok');
    if (deserialized.kind === 'ok') expect(deserialized.state).toEqual(initial);
  });

  it('migrates valid schema fixtures and detects future or corrupt versions', () => {
    const validFixture = newGame(NOW);
    expect(migrate(validFixture)).toEqual({ kind: 'ok', state: validFixture });
    expect(migrate({ version: 4, gold: 100 })).toEqual({ kind: 'future' });
    expect(migrate({ version: 99 })).toEqual({ kind: 'future' });
    expect(migrate({ version: 0 })).toEqual({ kind: 'corrupt' });
    expect(migrate({ version: -1 })).toEqual({ kind: 'corrupt' });
    expect(migrate({})).toEqual({ kind: 'corrupt' });
    expect(migrate(null)).toEqual({ kind: 'corrupt' });
    expect(migrate('invalid-string')).toEqual({ kind: 'corrupt' });
  });

  it('validates schema fields strictly (cells, quests, inventory, bounds)', () => {
    const valid = newGame(NOW);
    expect(deserialize(serialize({ ...valid, gold: -1 }))).toEqual({ kind: 'corrupt' });
    expect(deserialize(serialize({ ...valid, gridSize: 7 as unknown as 6 }))).toEqual({ kind: 'corrupt' });
    expect(deserialize(serialize({ ...valid, cells: valid.cells.slice(0, 35) }))).toEqual({ kind: 'corrupt' });
    const dupCells = [...valid.cells];
    dupCells[1] = { ...dupCells[0] };
    expect(deserialize(serialize({ ...valid, cells: dupCells }))).toEqual({ kind: 'corrupt' });
    expect(deserialize(serialize({ ...valid, savedAt: NaN }))).toEqual({ kind: 'corrupt' });
    expect(deserialize(serialize({ ...valid, createdAt: Infinity }))).toEqual({ kind: 'corrupt' });
    expect(deserialize(serialize({ ...valid, seeds: { ...valid.seeds, wheat: -1 } }))).toEqual({ kind: 'corrupt' });
  });
});

describe('Save Storage & Fallback Mechanism', () => {
  it('handles corrupt saves by backing up corrupt copy and loading a fresh game', async () => {
    for (const raw of ['{ bad json', '{"version":1}', '{"version":1,"cells":[]}']) {
      const local = memoryBackend();
      await local.set(SAVE_KEY, raw);
      const storage = new SaveStorage([local, memoryBackend(), memoryBackend()]);
      const result = await loadGame(storage, NOW);
      expect(result.state).toEqual(newGame(NOW));
      expect(result.notice).toBe('corrupt');
      expect(result.readonly).toBe(false);
      expect(await local.get(`${SAVE_KEY}:corrupt:${NOW}`)).toBe(raw);
    }
  });

  it('handles future saves without overwriting and marks session readonly', async () => {
    const local = memoryBackend();
    const futureSave = '{"version":5,"feature":"space-farm"}';
    await local.set(SAVE_KEY, futureSave);
    const result = await loadGame(new SaveStorage([local, memoryBackend(), memoryBackend()]), NOW);
    expect(result.readonly).toBe(true);
    expect(result.notice).toBe('future');
    expect(await local.get(SAVE_KEY)).toBe(futureSave);
  });

  it('adheres to storage fallback order: local -> idb -> memory only on errors', async () => {
    let secondaryReads = 0;
    const secondary: Backend = {
      get: () => { secondaryReads++; return 'stale'; },
      set: () => undefined,
      remove: () => undefined
    };
    const storage1 = new SaveStorage([memoryBackend(), secondary, memoryBackend()]);
    expect(await storage1.read()).toBeNull();
    expect(secondaryReads).toBe(0);
    expect(storage1.mode).toBe('local');

    const idb = memoryBackend();
    await idb.set(SAVE_KEY, 'idb-saved-state');
    const storage2 = new SaveStorage([failingBackend(), idb, memoryBackend()]);
    expect(await storage2.read()).toBe('idb-saved-state');
    expect(storage2.mode).toBe('idb');

    const memory = memoryBackend();
    const storage3 = new SaveStorage([failingBackend(), failingBackend(), memory]);
    expect(await storage3.read()).toBeNull();
    expect(storage3.mode).toBe('memory');
    await storage3.write('in-memory-data');
    expect(await storage3.read()).toBe('in-memory-data');
  });
});

describe('Tab Ownership (Multi-tab guard)', () => {
  it('stops older writer when a second claim is made', () => {
    let tabALost = false;
    let tabBLost = false;
    const tabA = new Ownership({ id: 'tab-a', openedAt: 1000 }, () => { tabALost = true; });
    const tabB = new Ownership({ id: 'tab-b', openedAt: 2000 }, () => { tabBLost = true; });
    expect(tabA.owns).toBe(true);
    expect(tabB.owns).toBe(true);
    tabA.observe(tabB.claim);
    expect(tabA.owns).toBe(false);
    expect(tabALost).toBe(true);
    tabB.observe(tabA.claim);
    expect(tabB.owns).toBe(true);
    expect(tabBLost).toBe(false);
  });
});
