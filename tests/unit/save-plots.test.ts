import { describe, it, expect } from 'vitest';
import { migrate } from '../../src/save/migrate';
import { canPlace, MAP } from '../../src/sim/layout';
import { createGrid, newGame } from '../../src/sim/grid';
import { isGameState } from '../../src/save/schema';
import type { GameState, Layout } from '../../src/sim/types';

function createValidV4State(): GameState {
  return { ...newGame(1000), gridSize: 8, cells: createGrid(8), savedAt: 2000 };
}

describe('save loading and migration of plots', () => {
  it('loads a v4 save with a missing plot as kind: "ok" with the plot filled in', () => {
    const state = createValidV4State();
    // Remove plot-0 from the layout
    state.layout = state.layout.filter(o => o.id !== 'plot-0');
    expect(state.layout.some(o => o.id === 'plot-0')).toBe(false);

    expect(isGameState(state)).toBe(true);
    const original = structuredClone(state);
    const result = migrate(state);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;

    expect(result.state.layout.some(o => o.id === 'plot-0')).toBe(true);
    expect(result.state.layout.filter(o => o.id !== 'plot-0')).toEqual(original.layout);
    expect(isGameState(result.state)).toBe(true);
    expect(state).toEqual(original);
  });

  it('loads a v4 save as kind: "ok" even when a plot cannot be placed due to full map', () => {
    const state = createValidV4State();
    // Keep required buildings and fill every remaining square, leaving no room for plots.
    const fullLayout: Layout = state.layout.filter(o => !o.id.startsWith('plot-'));
    let idCounter = 0;
    for (let y = MAP.min; y < MAP.max; y++) {
      for (let x = MAP.min; x < MAP.max; x++) {
        const block = { id: `block-${idCounter++}`, x, y, width: 1, height: 1 };
        if (canPlace(fullLayout, block)) fullLayout.push(block);
      }
    }
    state.layout = fullLayout;

    expect(isGameState(state)).toBe(true);
    const original = structuredClone(state);
    const result = migrate(state);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.state).toEqual(original);
    expect(isGameState(result.state)).toBe(true);
    expect(state).toEqual(original);
  });
});
