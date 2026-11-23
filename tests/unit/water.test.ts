import { describe, it, expect } from 'vitest';
import { water, applyAction } from '../../src/sim/actions';
import { isRipe, isWatered, remainingMs } from '../../src/sim/crops';
import { endDay } from '../../src/sim/dayEnd';
import { newGame } from '../../src/sim/grid';
import type { GameState, Result } from '../../src/sim/types';
const stateOf = (r: Result): GameState => { if (!r.ok) throw new Error(r.reason); return r.state; };
function planted(): GameState {
  const game = { ...newGame(1000), weather: 'sunny' as const };
  return stateOf(applyAction(stateOf(applyAction(game, { type: 'till', cellId: '0,0' }, 0)), { type: 'plant', cellId: '0,0', cropId: 'carrot' }, 0));
}
describe('Watering mechanics', () => {
  it('rejects untilled or missing cells and permits tilled soil', () => {
    const game = { ...newGame(1000), weather: 'sunny' as const };
    expect(water(game, '0,0', 0).ok).toBe(false);
    expect(water(game, 'missing', 0).ok).toBe(false);
    const tilled = stateOf(applyAction(game, { type: 'till', cellId: '0,0' }, 0));
    expect(water(tilled, '0,0', 0).ok).toBe(true);
  });
  it('keeps the watering mark throughout the same game day', () => {
    const state = stateOf(water(planted(), '0,0', 0));
    expect(isWatered(state.cells[0], 0)).toBe(true);
    expect(isWatered(state.cells[0], 100000)).toBe(true);
    expect(state.energy).toBe(266);
  });
  it('grows only at night when watered', () => {
    const game = planted();
    expect(endDay(game).state.cells[0].daysRemaining).toBe(3);
    expect(endDay(stateOf(water(game, '0,0', 0))).state.cells[0].daysRemaining).toBe(2);
  });
  it('does not allow stacking while already watered', () => {
    const once = stateOf(water(planted(), '0,0', 0));
    expect(water(once, '0,0', 10)).toEqual({ ok: false, reason: 'alreadyWatered' });
    expect(once.energy).toBe(266);
  });
  it('does not ripen crops from elapsed wall time', () => {
    const game = planted();
    expect(isRipe(game.cells[0], 999999999)).toBe(false);
    expect(remainingMs(game.cells[0], 999999999)).toBe(3);
  });
  it('allows watering again on the next dry day', () => {
    const once = stateOf(water(planted(), '0,0', 0));
    const morning = endDay(once).state;
    const dry = { ...morning, weather: 'sunny' as const, cells: morning.cells.map(c => ({ ...c, wateredToday: false })) };
    expect(water(dry, '0,0', 0).ok).toBe(true);
  });
  it('clamps watered growth at maturity', () => {
    let state = planted();
    for (let i = 0; i < 5; i++) state = endDay({ ...state, cells: state.cells.map(c => ({ ...c, wateredToday: true })) }).state;
    expect(isRipe(state.cells[0], 0)).toBe(true);
    expect(remainingMs(state.cells[0], 0)).toBe(0);
  });
});
