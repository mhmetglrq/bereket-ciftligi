import type { StateCreator } from 'zustand';
import { applyAction } from '../../sim/actions';
import { CROPS, EGG_PRICE } from '../../sim/data';
import { newGame } from '../../sim/grid';
import { isRipe } from '../../sim/crops';
import { levelOf, unlocksBetween } from '../../sim/xp';
import type { Action, GameState } from '../../sim/types';
import { tr } from '../../i18n/tr';
import { number } from '../../i18n/format';
import { playSound, unlockAudio, type Sound } from '../../audio/sfx';
import type { Store } from '../game';
import { feedback, WARNING_ID } from './uiSlice';

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
      if (current.warn(now)) playSound('error', current.reducedMotion);
      return;
    }

    let text: string = tr.plowed;
    let sound: Sound | null = 'till';
    switch (action.type) {
      case 'plant': text = tr.planted; sound = 'plant'; break;
      case 'harvest': {
        const cropId = result.events[0]?.cropId;
        text = cropId ? `${tr.add}1 ${tr.crops[cropId]}` : tr.harvested;
        sound = 'harvest';
        break;
      }
      case 'water': text = tr.watered; sound = null; break;
      case 'sell':
        text = `${tr.add}${number(result.events[0].amount * CROPS[action.cropId].salePrice)} ${tr.gold}`;
        sound = 'coin';
        break;
      case 'sellEgg':
        text = `${tr.add}${number(result.events[0].amount * EGG_PRICE)} ${tr.gold}`;
        sound = 'coin';
        break;
      case 'buySeed': text = tr.purchased; sound = 'coin'; break;
      case 'buyCoop': text = tr.coopBought; sound = 'coin'; break;
      case 'buyChicken': text = tr.chickenBought; sound = 'coin'; break;
      case 'feed':
      case 'feedAll': text = tr.fed; sound = null; break;
      case 'collectEgg':
        text = `${tr.add}${number(result.events[0].amount)} ${tr.eggs}`;
        sound = 'harvest';
        break;
      case 'expand': text = tr.expanded; sound = 'coin'; break;
      case 'claim':
        text = `${tr.add}${number(result.events[0].amount)} ${tr.gold}`;
        sound = 'coin';
        break;
    }
    set(state => ({
      game: result.state,
      now,
      ripeIds: result.state.cells.filter(cell => isRipe(cell, now)).map(cell => cell.id),
      floaters: state.panel || state.away ? [] : [
        ...state.floaters.filter(item => item.id !== WARNING_ID && item.expiresAt > now).slice(-4),
        feedback(text, now, action.type === 'water' ? 900 : 3000)
      ],
      saveStatus: 'saving'
    }));
    if (result.events.some(event => event.type === 'rescue')) get().notify(tr.gift);
    if (levelOf(result.state.xp) > levelOf(current.game.xp)) {
      get().notify(
        `${tr.level} ${number(levelOf(result.state.xp))}!`,
        5000,
        unlocksBetween(current.game.xp, result.state.xp)
      );
    }
    if (sound) playSound(sound, current.reducedMotion);
    get().requestSave();
  },
  selectCell: id => {
    const state = get();
    set({ selected: id });
    if (!state.tool || state.panel || state.away || state.phase !== 'playing') return;
    state.dispatch(state.tool === 'plant'
      ? { type: 'plant', cellId: id, cropId: state.seed }
      : { type: state.tool, cellId: id });
  }
});
