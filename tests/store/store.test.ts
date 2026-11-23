import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/sim/grid';
import { useGame } from '../../src/store/game';
import { SaveSchedule } from '../../src/store/autosave';
import { tr } from '../../src/i18n/tr';
import { applyAction } from '../../src/sim/actions';

vi.mock('../../src/audio/sfx', () => ({
  unlockAudio: vi.fn(), playSound: vi.fn(), setMuted: vi.fn()
}));

describe('store actions', () => {
  beforeEach(() => {
    useGame.setState({
      game: newGame(1000), phase: 'playing', panel: null, away: null,
      conflict: false, readonly: false, selected: null, tool: null,
      toasts: [], floaters: [], mayWrite: () => true, requestSave: vi.fn()
    });
  });

  it('uses the sim result and schedules saving after a successful action', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const before = useGame.getState().game;
    const expected = applyAction(before, { type: 'till', cellId: '0,0' }, 1000);
    useGame.getState().dispatch({ type: 'till', cellId: '0,0' });
    expect(expected.ok && useGame.getState().game).toEqual(expected.ok && expected.state);
    expect(useGame.getState().requestSave).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('shows a short warning without changing the game', () => {
    const before = useGame.getState().game;
    useGame.getState().dispatch({ type: 'plant', cellId: '0,0', cropId: 'wheat' });
    expect(useGame.getState().game).toBe(before);
    expect(useGame.getState().toasts.at(-1)?.text).toBe(tr.reasons.needTill);
    expect(useGame.getState().requestSave).not.toHaveBeenCalled();
  });

  it('blocks all changes when another tab owns the save', () => {
    const before = useGame.getState().game;
    useGame.setState({ conflict: true });
    useGame.getState().dispatch({ type: 'till', cellId: '0,0' });
    expect(useGame.getState().game).toBe(before);
    expect(useGame.getState().requestSave).not.toHaveBeenCalled();
  });

  it('keeps at most four toasts and leaves the scene clear', () => {
    for (let x = 0; x < 6; x++) {
      useGame.getState().dispatch({ type: 'till', cellId: `${x},0` });
    }
    expect(useGame.getState().floaters).toHaveLength(0);
    expect(useGame.getState().toasts).toHaveLength(4);
  });
});

describe('save schedule', () => {
  it('debounces actions for 500ms and periodically saves every 10s', () => {
    const schedule = new SaveSchedule(0);
    schedule.request(100);
    schedule.request(400);
    expect(schedule.shouldSave(899)).toBe(false);
    expect(schedule.shouldSave(900)).toBe(true);
    schedule.saved(900);
    expect(schedule.shouldSave(10899)).toBe(false);
    expect(schedule.shouldSave(10900)).toBe(true);
  });
});
