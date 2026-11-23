import type { StateCreator } from 'zustand';
import { applyAction } from '../../sim/actions';
import { CROP_IDS, CROPS, EGG_PRICE } from '../../sim/data';
import { inSeason } from '../../sim/seasons';
import { newGame } from '../../sim/grid';
import { isRipe } from '../../sim/crops';
import { levelOf, unlocksBetween } from '../../sim/xp';
import type { Action, GameState, ItemId } from '../../sim/types';
import { endDay } from '../../sim/dayEnd';
import { shipPut, shipTake } from '../../sim/shipping';
import { moveObject } from '../../sim/layout';
import { claimDaily, localDateKey } from '../../sim/daily';
import { overnightQueue } from './uiSlice';
import { tr } from '../../i18n/tr';
import { number } from '../../i18n/format';
import { playSound, unlockAudio, type Sound } from '../../audio/sfx';
import type { Store } from '../game';
import { applyBatch } from '../../sim/batch';

export interface GameSlice {
  game: GameState;
  dispatch: (action: Action) => void;
  selectCell: (id: string) => void;
  paintCells: (ids: string[]) => boolean;
  sleep: (passedOut?: boolean) => void;
  eat: (id: 'bread' | 'cake') => void;
  shipPut: (id: ItemId, amount?: number) => void;
  shipTake: (id: ItemId, amount?: number) => void;
  enterEdit: () => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  moveObject: (id: string, x: number, y: number) => void;
}

export const createGameSlice: StateCreator<Store, [], [], GameSlice> = (set, get) => ({
  game: newGame(Date.now()),
  sleep: (passedOut = false) => {
    const s = get();
    if (!s.mayWrite() || s.editMode) return;
    const result = endDay(s.game, passedOut);
    const seed = inSeason(s.seed, result.state.season) ? s.seed : CROP_IDS.find(id => inSeason(id, result.state.season) && result.state.seeds[id] > 0) ?? CROP_IDS.find(id => inSeason(id, result.state.season)) ?? s.seed;
    set({ game: result.state, seed, now: result.state.elapsedMinutes, panel: null, selected: null, selectedObject: null, ripeIds: result.state.cells.filter(c => isRipe(c, 0)).map(c => c.id), modalQueue: overnightQueue(passedOut ? result.penalty : null, result.shipment, !result.state.seenV4Intro, result.state.daily.lastClaim !== localDateKey(Date.now())) });
    s.requestSave();
  },
  eat: id => get().dispatch({ type: 'eat', itemId: id }),
  shipPut: (id, amount = 1) => { const s = get(); if (!s.mayWrite() || s.editMode) return; set({ game: shipPut(s.game, id, amount) }); s.requestSave(); },
  shipTake: (id, amount = 1) => { const s = get(); if (!s.mayWrite() || s.editMode) return; set({ game: shipTake(s.game, id, amount) }); s.requestSave(); },
  enterEdit: () => { const s = get(); if (!s.mayWrite() || s.panel || s.modalQueue.length) return; set({ editMode: true, layoutSnapshot: s.game.layout.map(o => ({ ...o })), savedTool: s.tool, tool: null, selected: null }); },
  commitEdit: () => { const s = get(); set({ editMode: false, isDragging: false, layoutSnapshot: null, tool: s.savedTool, savedTool: null, selectedObject: null }); s.requestSave(); },
  cancelEdit: () => { const s = get(); set({ game: { ...s.game, layout: s.layoutSnapshot ?? s.game.layout }, editMode: false, isDragging: false, layoutSnapshot: null, tool: s.savedTool, savedTool: null, selectedObject: null }); s.requestSave(); },
  moveObject: (id, x, y) => { const s = get(); if (!s.editMode || !s.mayWrite()) return; set({ game: moveObject(s.game, id, x, y) }); },
  paintCells: ids => {
    const current = get();
    if (!current.tool || current.editMode || current.modalQueue.length || current.panel || current.phase !== 'playing' || !current.mayWrite()) return false;
    const now = current.game.elapsedMinutes;
    const result = applyBatch(current.game, current.tool, ids, now, current.seed);
    const changedCell = result.state.cells.filter((cell, index) => cell !== current.game.cells[index]).at(-1);
    set({ game: result.state, now, selected: changedCell?.id ?? current.selected, paintedCell: changedCell?.id ?? current.paintedCell, saveStatus: 'saving', ripeIds: result.state.cells.filter(cell => isRipe(cell, now)).map(cell => cell.id) });
    if (result.events.length) {
      unlockAudio();
      if (current.tool !== 'water') playSound(current.tool === 'harvest' ? 'harvest' : current.tool === 'plant' ? 'plant' : 'till', current.reducedMotion);
    }
    if (result.state !== current.game) current.requestSave();
    if (levelOf(result.state.xp) > levelOf(current.game.xp)) current.notify(`${tr.level} ${number(levelOf(result.state.xp))}!`);
    if (result.stoppedReason) current.notify(tr.reasons[result.stoppedReason]);
    return !result.stoppedReason;
  },
  dispatch: action => {
    const current = get();
    unlockAudio();
    if (current.editMode || current.phase !== 'playing') return;
    if (current.conflict || current.readonly || !current.mayWrite()) {
      current.notify(tr.readonly);
      return;
    }
    const now = current.game.elapsedMinutes;
    const result = action.type === 'claimDaily' ? claimDaily(current.game, Date.now()) : applyAction(current.game, action, now);
    if (!result.ok) {
      current.notify(tr.reasons[result.reason]);
      playSound('error', current.reducedMotion);
      return;
    }

    let text: string = tr.plowed;
    let sound: Sound | null = 'till';
    switch (action.type) {
      case 'eat': text = 'Enerji yenilendi'; sound = null; break;
      case 'buyFood': text = tr.purchaseDone; sound = 'coin'; break;
      case 'buyBuilding': case 'plantTree': text = tr.purchaseDone; sound = 'coin'; break;
      case 'queueProduction': text = tr.queued; sound = null; break;
      case 'cancelProduction': text = tr.jobCancelled; sound = null; break;
      case 'removeTree': text = tr.treeRemoved; sound = null; break;
      case 'collectProduction': text = tr.collected; sound = 'harvest'; break;
      case 'rejectOrder': text = tr.orderRejected; sound = null; break;
      case 'deliverOrder': case 'sellItem':
        text = `${tr.add}${number(result.state.gold - current.game.gold)} ${tr.gold}`; sound = 'coin'; break;
      case 'claimDaily': case 'claimDailyQuest': text = tr.rewardReceived; sound = 'coin'; break;
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
    set({
      game: result.state,
      now,
      ripeIds: result.state.cells.filter(cell => isRipe(cell, now)).map(cell => cell.id),
      floaters: [],
      saveStatus: 'saving'
    });
    get().notify(text);
    if (result.events.some(event => event.type === 'rescue')) get().notify(tr.gift);
    if (levelOf(result.state.xp) > levelOf(current.game.xp)) {
      get().notify(
        `${tr.level} ${number(levelOf(result.state.xp))}!`,
        3000,
        unlocksBetween(current.game.xp, result.state.xp)
      );
    }
    if (sound) playSound(sound, current.reducedMotion);
    get().requestSave();
  },
  selectCell: id => {
    const state = get();
    const cell = state.game.cells.find(c => c.id === id);
    set({ selected: id, selectedObject: cell ? cell.kind === 'tree' ? `tree:${id}` : `plot-${Math.floor(cell.y / 2) * 4 + Math.floor(cell.x / 2)}` : null });
    if (!state.tool || state.editMode || state.modalQueue.length || state.panel || state.phase !== 'playing') return;
    state.dispatch(state.tool === 'plant'
      ? { type: 'plant', cellId: id, cropId: state.seed }
      : { type: state.tool, cellId: id });
  }
});
