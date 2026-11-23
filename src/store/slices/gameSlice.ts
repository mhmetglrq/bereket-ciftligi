import type { StateCreator } from 'zustand';
import { applyAction } from '../../sim/actions';
import { CROPS } from '../../sim/data';
import { newGame } from '../../sim/grid';
import type { Action, GameState } from '../../sim/types';
import { tr } from '../../i18n/tr';
import { number } from '../../i18n/format';
import { playSound, unlockAudio, type Sound } from '../../audio/sfx';
import type { Store } from '../game';
import { feedback } from './uiSlice';

export interface GameSlice {
  game: GameState;
  dispatch: (action: Action) => void;
  selectCell: (id: string) => void;
}

export const createGameSlice: StateCreator<Store, [], [], GameSlice> = (set, get) => ({
  game: newGame(Date.now()),
  dispatch: action => {
    const current = get();
    unlockAudio();
    if (current.conflict || current.readonly || !current.mayWrite()) {
      current.notify(tr.readonly);
      return;
    }
    const now = Date.now();
    const result = applyAction(current.game, action, now);
    if (!result.ok) {
      set(state => ({ shake: state.shake + 1 }));
      current.notify(tr.reasons[result.reason]);
      playSound('error', current.reducedMotion);
      return;
    }

    let text: string = tr.plowed;
    let sound: Sound = 'till';
    switch (action.type) {
      case 'plant': text = tr.planted; sound = 'plant'; break;
      case 'harvest': {
        const cropId = result.events[0]?.cropId;
        text = cropId ? `${tr.add}1 ${tr.crops[cropId]}` : tr.harvested;
        sound = 'harvest';
        break;
      }
      case 'sell':
        text = `${tr.add}${number(result.events[0].amount * CROPS[action.cropId].salePrice)} ${tr.gold}`;
        sound = 'coin';
        break;
      case 'buySeed': text = tr.purchased; sound = 'coin'; break;
      case 'expand': text = tr.expanded; sound = 'coin'; break;
      case 'claim':
        text = `${tr.add}${number(result.events[0].amount)} ${tr.gold}`;
        sound = 'coin';
        break;
    }
    set(state => ({
      game: result.state,
      now,
      floaters: [...state.floaters.slice(-4), feedback(text, now)],
      saveStatus: 'saving'
    }));
    if (result.events.some(event => event.type === 'rescue')) get().notify(tr.gift);
    playSound(sound, current.reducedMotion);
    get().requestSave();
  },
  selectCell: id => {
    const state = get();
    set({ selected: id });
    if (!state.tool || state.panel || state.phase !== 'playing') return;
    state.dispatch(state.tool === 'plant'
      ? { type: 'plant', cellId: id, cropId: state.seed }
      : { type: state.tool, cellId: id });
  }
});
