import { describe, it, expect } from 'vitest';
import { defaultLayout, ensurePlotsForCells, nearestFreeSlot, plotIdForCell, MAP } from '../../src/sim/layout';
import type { Layout } from '../../src/sim/types';

describe('plotIdForCell', () => {
  it('identifies plot-0 for cell (0,0)', () => {
    const layout = defaultLayout();
    expect(plotIdForCell({ x: 0, y: 0 }, layout)).toBe('plot-0');
  });

  it('identifies plot-15 for cell (7,7)', () => {
    const layout = defaultLayout();
    expect(plotIdForCell({ x: 7, y: 7 }, layout)).toBe('plot-15');
  });

  it('returns null for negative coordinates (-1, 0) not in layout', () => {
    const layout = defaultLayout();
    expect(plotIdForCell({ x: -1, y: 0 }, layout)).toBeNull();
  });

  it('returns null when plot is removed from layout', () => {
    const layout = defaultLayout().filter(o => o.id !== 'plot-0');
    expect(plotIdForCell({ x: 0, y: 0 }, layout)).toBeNull();
  });
});

describe('ensurePlotsForCells', () => {
  it('adds a missing plot', () => {
    const layoutWithoutPlot0 = defaultLayout().filter(o => o.id !== 'plot-0');
    expect(layoutWithoutPlot0.some(o => o.id === 'plot-0')).toBe(false);

    const updated = ensurePlotsForCells(layoutWithoutPlot0, [{ x: 0, y: 0 }]);
    expect(updated.some(o => o.id === 'plot-0')).toBe(true);
    const added = updated.find(o => o.id === 'plot-0')!;
    expect(added.width).toBe(2);
    expect(added.height).toBe(2);
  });

  it('a second call gives the same result (idempotent)', () => {
    const initial = defaultLayout().filter(o => o.id !== 'plot-0');
    const firstCall = ensurePlotsForCells(initial, [{ x: 0, y: 0 }]);
    const secondCall = ensurePlotsForCells(firstCall, [{ x: 0, y: 0 }]);
    expect(secondCall).toEqual(firstCall);
  });

  it('existing object positions stay exactly the same', () => {
    const initial = defaultLayout().filter(o => o.id !== 'plot-5');
    const originalPositions = new Map(initial.map(o => [o.id, { x: o.x, y: o.y }]));

    const updated = ensurePlotsForCells(initial, [{ x: 2, y: 2 }]);
    for (const [id, pos] of originalPositions.entries()) {
      const current = updated.find(o => o.id === id);
      expect(current).toBeDefined();
      expect(current!.x).toBe(pos.x);
      expect(current!.y).toBe(pos.y);
    }
  });

  it('on a full map it adds nothing and does not crash', () => {
    // Fill the entire available space
    const fullLayout: Layout = [];
    let idCounter = 0;
    for (let y = MAP.min; y < MAP.max; y++) {
      for (let x = MAP.min; x < MAP.max; x++) {
        fullLayout.push({ id: `block-${idCounter++}`, x, y, width: 1, height: 1 });
      }
    }

    const updated = ensurePlotsForCells(fullLayout, [{ x: 12, y: 12 }]);
    expect(updated.length).toBe(fullLayout.length);
  });
});

describe('nearestFreeSlot', () => {
  it('finds the exact spot if free', () => {
    const layout: Layout = [];
    const slot = nearestFreeSlot(layout, { x: 0, y: 0 }, 1, 1);
    expect(slot).toEqual({ x: 0, y: 0 });
  });

  it('breaks ties by y, then x', () => {
    // Occupy (0, 0), candidates at distance 1 are (0, -1), (-1, 0), (1, 0), (0, 1)
    // Smallest y is -1 with x=0
    const layout: Layout = [{ id: 'center', x: 0, y: 0, width: 1, height: 1 }];
    const slot = nearestFreeSlot(layout, { x: 0, y: 0 }, 1, 1);
    expect(slot).toEqual({ x: 0, y: -1 });
  });
});
