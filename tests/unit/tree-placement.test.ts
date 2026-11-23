import { describe, it, expect } from 'vitest';
import { plantTree } from '../../src/sim/trees';
import { canPlace, MAP } from '../../src/sim/layout';
import { newGame } from '../../src/sim/grid';
import { TREES } from '../../src/sim/data';
import { thresholdFor } from '../../src/sim/xp';
import type { GameState, Layout } from '../../src/sim/types';

function createBaseState(): GameState {
  return {
    ...newGame(0),
    gold: 500,
    xp: thresholdFor(TREES.apple.level)
  };
}

describe('plantTree', () => {
  it('places tree at exact spot when target position is completely free of objects', () => {
    const base = createBaseState();
    // Layout with no objects covering (0,0)
    base.layout = [];
    const result = plantTree(base, '0,0', 'apple', 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const treeObj = result.state.layout.find(o => o.id === 'tree:0,0');
    expect(treeObj).toBeDefined();
    expect(treeObj!.x).toBe(0);
    expect(treeObj!.y).toBe(0);
    expect(result.state.gold).toBe(base.gold - TREES.apple.cost);
  });

  it('places tree at the nearest free slot when target is covered by a plot (not defaulting to -3, -3)', () => {
    const base = createBaseState();
    // Default layout has plot-0 at x: 0..2, y: 0..2. Cell (0,0) is covered.
    const result = plantTree(base, '0,0', 'apple', 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const treeObj = result.state.layout.find(o => o.id === 'tree:0,0');
    expect(treeObj).toBeDefined();
    expect(canPlace(base.layout, treeObj!)).toBe(true);
    expect((treeObj!.x ** 2 + treeObj!.y ** 2)).toBe(1);
    // Distance from (0,0) to (-3,-3) is 18 (squared). The nearest free slot must be closer than (-3, -3)
    const distSq = (treeObj!.x - 0) ** 2 + (treeObj!.y - 0) ** 2;
    expect(distSq).toBeLessThan((-3) ** 2 + (-3) ** 2);
    expect(treeObj!.x !== -3 || treeObj!.y !== -3).toBe(true);
  });

  it('returns occupied and does not charge gold or change state when map is full', () => {
    const base = createBaseState();
    const fullLayout: Layout = [];
    let idCounter = 0;
    for (let y = MAP.min; y < MAP.max; y++) {
      for (let x = MAP.min; x < MAP.max; x++) {
        fullLayout.push({ id: `block-${idCounter++}`, x, y, width: 1, height: 1 });
      }
    }
    base.layout = fullLayout;
    const original = structuredClone(base);

    const result = plantTree(base, '0,0', 'apple', 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.reason).toBe('occupied');
    expect(base).toEqual(original);
  });
});
