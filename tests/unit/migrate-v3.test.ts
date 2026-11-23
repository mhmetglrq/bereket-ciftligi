import { describe, it, expect } from 'vitest';
import { QUESTS } from '../../src/sim/data';
import { migrate } from '../../src/save/migrate';
import { SaveStorage, memoryBackend } from '../../src/save/storage';

function createV1Save(): Record<string, unknown> {
  const cells = [];
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      cells.push({ id: `${x},${y}`, x, y, kind: 'untilled' });
    }
  }
  return {
    version: 1,
    createdAt: 1000,
    savedAt: 1000,
    gridSize: 6,
    gold: 350,
    seeds: { wheat: 5, carrot: 2, tomato: 1 },
    produce: { wheat: 10, carrot: 0, tomato: 0 },
    cells,
    quests: {
      wheat10: { count: 5, status: 'active' },
      sell10: { count: 0, status: 'active' },
      harvest25: { count: 0, status: 'active' }
    }
  };
}

function createV2Save(): Record<string, unknown> {
  const cells = [];
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      cells.push({ id: `${x},${y}`, x, y, kind: 'untilled' });
    }
  }
  return {
    version: 2,
    createdAt: 1000,
    savedAt: 1000,
    gridSize: 6,
    gold: 450,
    xp: 60,
    eggs: 4,
    coop: { owned: true, chickens: [{ id: 'ch1', fedAt: null }], pendingEggs: 0 },
    seeds: { wheat: 10, carrot: 5, tomato: 5, corn: 0, strawberry: 0 },
    produce: { wheat: 20, carrot: 0, tomato: 0, corn: 0, strawberry: 0 },
    cells,
    quests: {
      ...Object.fromEntries(QUESTS.map(quest => [quest.id, { count: 0, status: 'active' }])),
      wheat10: { count: 10, status: 'complete' }
    }
  };
}

describe('migrate & save storage', () => {
  it('migrates v1 and v2 saves to v3 preserving player progress', () => {
    const v1 = createV1Save();
    const res1 = migrate(v1);
    expect(res1.kind).toBe('ok');
    if (res1.kind === 'ok') {
      expect(res1.state.version).toBe(3);
      expect(res1.state.gold).toBe(350);
      expect(res1.state.produce.wheat).toBe(10);
      expect(res1.state.buildings.mill.owned).toBe(false);
      expect(res1.state.orders).toHaveLength(3);
    }

    const v2 = createV2Save();
    const res2 = migrate(v2);
    expect(res2.kind).toBe('ok');
    if (res2.kind === 'ok') {
      expect(res2.state.version).toBe(3);
      expect(res2.state.gold).toBe(450);
      expect(res2.state.xp).toBe(60);
      expect(res2.state.eggs).toBe(4);
      expect(res2.state.coop.owned).toBe(true);
    }
  });

  it('running migration twice gives the same result (idempotent)', () => {
    const v2 = createV2Save();
    const first = migrate(v2);
    expect(first.kind).toBe('ok');
    if (first.kind === 'ok') {
      const second = migrate(first.state);
      expect(second.kind).toBe('ok');
      if (second.kind === 'ok') {
        expect(second.state).toEqual(first.state);
      }
    }
  });

  it('rejects future version and corrupt save', () => {
    const future = { ...createV2Save(), version: 4 };
    expect(migrate(future).kind).toBe('future');

    const corrupt = { version: 3, broken: true };
    expect(migrate(corrupt).kind).toBe('corrupt');
  });

  it('keeps backup until the first successful v3 save', async () => {
    const backend = memoryBackend();
    const storage = new SaveStorage([backend, memoryBackend(), memoryBackend()]);

    const rawV2 = JSON.stringify(createV2Save());
    await storage.protectLegacy(rawV2, 2);

    // Backup is created
    expect(await backend.get('bereket-ciftligi:save:v1:backup:pre-v3')).toBe(rawV2);

    // After migration finishes, pre-v3 backup is cleaned up
    await storage.finishMigration();
    expect(await backend.get('bereket-ciftligi:save:v1:backup:pre-v3')).toBeNull();
  });
});
