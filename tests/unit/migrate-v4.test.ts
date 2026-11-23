import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/save/migrate';
import { defaultLayout } from '../../src/sim/layout';
import { QUESTS } from '../../src/sim/data';
import { isGameState, isV3GameState, type V3GameState } from '../../src/save/schema';

describe('V4 Save Migration', () => {
  const sampleV3State = (): V3GameState => {
    const cells = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        cells.push({ id: `${x},${y}`, x, y, kind: 'untilled' as const });
      }
    }

    return {
      version: 3,
      createdAt: 100000,
      savedAt: 150000,
      gridSize: 6,
      gold: 500,
      xp: 250,
      eggs: 5,
      seeds: { wheat: 2, carrot: 3, tomato: 0, corn: 1, strawberry: 0, pumpkin: 0 },
      produce: { wheat: 10, carrot: 5, tomato: 0, corn: 0, strawberry: 0, pumpkin: 0 },
      goods: { flour: 1, bread: 2, cake: 0, apple: 3, cherry: 1 },
      coop: {
        owned: true,
        pendingEggs: 2,
        chickens: [{ id: 'chick-1', fedAt: 140000 }]
      },
      buildings: {
        mill: {
          owned: true,
          queue: [{ id: 'job-1', recipeId: 'flour', startAt: 130000, endsAt: 175000 }],
          readyOutput: { flour: 0 }
        },
        bakery: {
          owned: false,
          queue: [],
          readyOutput: { bread: 0, cake: 0 }
        }
      },
      orders: [
        { refillAt: 0, generation: 1, order: null },
        { refillAt: 0, generation: 1, order: null },
        { refillAt: 0, generation: 1, order: null }
      ],
      daily: {
        lastClaim: '2026-11-23',
        streak: 3,
        date: '',
        quests: []
      },
      cells,
      quests: {
        ...Object.fromEntries(QUESTS.map(quest => [quest.id, { count: 0, status: 'active' as const }])),
        wheat10: { count: 10, status: 'claimed' },
        sell10: { count: 5, status: 'active' },
        harvest25: { count: 15, status: 'active' }
      }
    };
  };

  it('migrates v3 save to v4 preserving inventory, gold, and advancing date to Spring 1, Year 1, 06:00', () => {
    const v3 = sampleV3State();
    expect(isV3GameState(v3)).toBe(true);
    const result = migrate(v3);

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      const state = result.state;
      expect(state.version).toBe(4);
      expect(state.day).toBe(1);
      expect(state.season).toBe('spring');
      expect(state.year).toBe(1);
      expect(state.minute).toBe(360);
      expect(state.energy).toBe(270);
      expect(state.gold).toBe(500);
      expect(state.xp).toBe(250);
      expect(state.seeds).toEqual(v3.seeds);
      expect(state.produce).toEqual(v3.produce);
      expect(state.goods).toEqual(v3.goods);
      expect(state.quests).toEqual(v3.quests);
      expect(state.daily.lastClaim).toBe(v3.daily.lastClaim);
      expect(state.daily.streak).toBe(v3.daily.streak);
      expect(isGameState(state)).toBe(true);
      expect(state.seenV4Intro).toBe(false);
      expect(state.layout).toBeDefined();
      expect(state.layout.length).toBeGreaterThanOrEqual(defaultLayout().length);
    }
  });

  it('converts planted crop with remaining time into integer growth days (e.g. 50% carrot -> 2 days)', () => {
    const v3 = sampleV3State();
    // Carrot total duration is 60,000ms. Planted 30,000ms ago at savedAt = 150000 -> 50% remaining
    v3.cells[0] = {
      id: '0,0',
      x: 0,
      y: 0,
      kind: 'planted',
      cropId: 'carrot',
      plantedAt: 120000
    };

    const result = migrate(v3);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      const cell = result.state.cells.find(c => c.id === '0,0');
      expect(cell?.kind).toBe('planted');
      if (cell?.kind === 'planted') {
        // Carrot growthDays = 3, 50% of 3 = 1.5 -> ceil = 2 days
        expect(cell.daysRemaining).toBe(2);
        expect(cell.growthDays).toBe(3);
        // Migration applies the first morning's weather, including rain watering.
        expect(cell.wateredToday).toBe(result.state.weather === 'rain');
      }
    }
  });

  it('converts completed production jobs directly to ready output', () => {
    const v3 = sampleV3State();
    // Mill job finished before savedAt (endsAt: 140000 <= savedAt: 150000)
    v3.buildings.mill.queue = [
      { id: 'job-finished', recipeId: 'flour', startAt: 95000, endsAt: 140000 }
    ];

    const result = migrate(v3);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      const mill = result.state.buildings.mill;
      expect(mill.readyOutput.flour).toBe(1);
      expect(mill.queue).toHaveLength(0);
    }
  });

  it('flags future version saves as future and invalid structures as corrupt', () => {
    expect(migrate({ version: 5 })).toEqual({ kind: 'future' });
    expect(migrate({ version: 3, corrupt: true })).toEqual({ kind: 'corrupt' });
    expect(migrate('not an object')).toEqual({ kind: 'corrupt' });
  });
});
