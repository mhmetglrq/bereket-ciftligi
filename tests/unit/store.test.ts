import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/sim/grid';
import { useGame } from '../../src/store/game';
import { SaveSchedule } from '../../src/store/autosave';
import { tr } from '../../src/i18n/tr';
import { applyAction } from '../../src/sim/actions';

vi.mock('../../src/audio/sfx', () => ({
  unlockAudio: vi.fn(), playSound: vi.fn(), setMuted: vi.fn()
}));

describe('Zustand Game Store Actions', () => {
  beforeEach(() => {
    useGame.setState({
      game: newGame(1000), phase: 'playing', panel: null, away: null,
      conflict: false, readonly: false, selected: null, tool: null,
      toasts: [], floaters: [], mayWrite: () => true, requestSave: vi.fn()
    });
  });

  it('dispatches actions through sim and requests debounced save on success', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const before = useGame.getState().game;
    const simResult = applyAction(before, { type: 'till', cellId: '0,0' }, 1000);
    useGame.getState().dispatch({ type: 'till', cellId: '0,0' });
    expect(simResult.ok).toBe(true);
    if (simResult.ok) expect(useGame.getState().game).toEqual(simResult.state);
    expect(useGame.getState().requestSave).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('shows a short warning on failure and does not schedule save', () => {
    const before = useGame.getState().game;
    useGame.getState().dispatch({ type: 'plant', cellId: '0,0', cropId: 'wheat' });
    expect(useGame.getState().game).toBe(before);
    expect(useGame.getState().toasts.at(-1)?.text).toBe(tr.reasons.needTill);
    expect(useGame.getState().requestSave).not.toHaveBeenCalled();
  });

  it('blocks actions and writes when tab has conflict or is readonly', () => {
    const before = useGame.getState().game;
    useGame.setState({ conflict: true });
    useGame.getState().dispatch({ type: 'till', cellId: '0,0' });
    expect(useGame.getState().game).toBe(before);
    expect(useGame.getState().requestSave).not.toHaveBeenCalled();
    useGame.setState({ conflict: false, readonly: true });
    useGame.getState().dispatch({ type: 'till', cellId: '0,0' });
    expect(useGame.getState().game).toBe(before);
    expect(useGame.getState().requestSave).not.toHaveBeenCalled();
  });

  it('limits floating harvest/event notifications to at most 5', () => {
    for (let x = 0; x < 6; x++) {
      useGame.getState().dispatch({ type: 'till', cellId: `${x},0` });
    }
    expect(useGame.getState().floaters.length).toBeLessThanOrEqual(5);
  });
});

describe('Autosave Schedule', () => {
  it('debounces saves with 500ms delay and enforces periodic 10s saves', () => {
    const schedule = new SaveSchedule(0);
    schedule.request(100);
    expect(schedule.shouldSave(599)).toBe(false);
    expect(schedule.shouldSave(600)).toBe(true);
    schedule.request(400);
    expect(schedule.shouldSave(899)).toBe(false);
    expect(schedule.shouldSave(900)).toBe(true);
    schedule.saved(900);
    expect(schedule.shouldSave(901)).toBe(false);
    expect(schedule.shouldSave(10899)).toBe(false);
    expect(schedule.shouldSave(10900)).toBe(true);
  });
});
