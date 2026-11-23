import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/save/migrate';
import { isGameState, isLegacyGameState } from '../../src/save/schema';
import { emptyInventory, QUESTS } from '../../src/sim/data';
import type { LegacyGameState } from '../../src/save/schema';
import type { GameState } from '../../src/sim/types';

describe('Migration v1 -> v4', () => {
  const now = 1_700_000_000_000;

  const validLegacyCells: LegacyGameState['cells'] = Array.from({ length: 36 }, (_, i) => ({
    id: `${i % 6},${Math.floor(i / 6)}`,
    x: i % 6,
    y: Math.floor(i / 6),
    kind: 'untilled' as const
  }));
  validLegacyCells[0] = {
    id: '0,0',
    x: 0,
    y: 0,
    kind: 'planted',
    cropId: 'wheat',
    plantedAt: now - 5000
  };

  const legacyFixture: LegacyGameState = {
    version: 1,
    createdAt: now - 60_000,
    savedAt: now,
    gridSize: 6,
    gold: 150,
    seeds: { wheat: 3, carrot: 2, tomato: 1 },
    produce: { wheat: 10, carrot: 5, tomato: 0 },
    cells: validLegacyCells,
    quests: {
      wheat10: { count: 10, status: 'claimed' },
      sell10: { count: 7, status: 'active' },
      harvest25: { count: 15, status: 'active' }
    }
  };

  it('validates a correct legacy v1 save with isLegacyGameState', () => {
    expect(isLegacyGameState(legacyFixture)).toBe(true);
  });

  it('migrates a v1 fixture keeping gold, cells, inventory and quests, and adding v2 defaults', () => {
    const result = migrate(legacyFixture);
    expect(result.kind).toBe('ok');

    if (result.kind !== 'ok') return;
    const { state } = result;

    // Checks v2 schema validity
    expect(isGameState(state)).toBe(true);
    expect(state.version).toBe(4);

    // Retains player progress
    expect(state.gold).toBe(150);
    expect(state.createdAt).toBe(legacyFixture.createdAt);
    expect(state.savedAt).toBe(legacyFixture.savedAt);
    expect(state.gridSize).toBe(6);
    expect(state.cells.map(c => c.id)).toEqual(legacyFixture.cells.map(c => c.id));
    expect(state.cells[0].daysRemaining).toBe(4);
    expect(state.minute).toBe(360);

    // Inventories kept and expanded with new crops defaulting to 0
    expect(state.seeds).toEqual({
      ...emptyInventory(),
      wheat: 3,
      carrot: 2,
      tomato: 1
    });
    expect(state.produce).toEqual({
      ...emptyInventory(),
      wheat: 10,
      carrot: 5,
      tomato: 0
    });

    // New v2 properties initialized to defaults
    expect(state.xp).toBe(0);
    expect(state.eggs).toBe(0);
    expect(state.coop).toEqual({
      owned: false,
      chickens: [],
      pendingEggs: 0
    });

    // Legacy quests preserved and new v2 quests initialized as active with count 0
    expect(state.quests.wheat10).toEqual({ count: 10, status: 'claimed' });
    expect(state.quests.sell10).toEqual({ count: 7, status: 'active' });
    expect(state.quests.harvest25).toEqual({ count: 15, status: 'active' });
    expect(state.quests.water5).toEqual({ count: 0, status: 'active' });
    expect(state.quests.eggs3).toEqual({ count: 0, status: 'active' });
    expect(state.quests.corn1).toEqual({ count: 0, status: 'active' });

    for (const q of QUESTS) {
      expect(state.quests[q.id]).toBeDefined();
    }
  });

  it('is idempotent: migrating an already v2 save changes nothing', () => {
    const v1Result = migrate(legacyFixture);
    expect(v1Result.kind).toBe('ok');
    if (v1Result.kind !== 'ok') return;

    const v2State = v1Result.state;
    const secondResult = migrate(v2State);
    expect(secondResult.kind).toBe('ok');
    if (secondResult.kind !== 'ok') return;

    expect(secondResult.state).toEqual(v2State);
  });

  it('rejects future versions with kind future', () => {
    const futureSave = { ...legacyFixture, version: 5 };
    const result = migrate(futureSave);
    expect(result.kind).toBe('future');
  });

  it('returns corrupt for invalid legacy or corrupted save objects', () => {
    expect(migrate(null).kind).toBe('corrupt');
    expect(migrate('corrupt string').kind).toBe('corrupt');
    expect(migrate({ version: 1, gold: -50 }).kind).toBe('corrupt');

    // Corrupt cells in v1
    const invalidCells = { ...legacyFixture, cells: [{ id: '0,0' }] };
    expect(migrate(invalidCells).kind).toBe('corrupt');
  });
});
