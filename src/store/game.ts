import { create } from 'zustand';
import { createGameSlice, type GameSlice } from './slices/gameSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';
import { browserStorage, loadGame, type SaveStorage } from '../save/storage';
import { createTabLock } from '../save/tabLock';
import { overnightQueue } from './slices/uiSlice';
import { localDateKey } from '../sim/daily';
import { rescue } from '../sim/rescue';
import { isRipe } from '../sim/crops';
import { tr } from '../i18n/tr';

export interface Services {
  mayWrite: () => boolean;
  requestSave: () => void;
}
export type Store = GameSlice & UISlice & Services;

export const useGame = create<Store>()((...args) => ({
  ...createGameSlice(...args),
  ...createUISlice(...args),
  mayWrite: () => false,
  requestSave: () => undefined
}));

let storage: SaveStorage | null = null;
let lock: ReturnType<typeof createTabLock> | null = null;

export function getStorage(): SaveStorage {
  if (!storage) throw new Error('Storage has not initialized');
  return storage;
}

let initialization: Promise<void> | null = null;
export function initializeGame(): Promise<void> {
  initialization ??= initialize();
  return initialization;
}

async function initialize(): Promise<void> {
  lock = createTabLock(() => useGame.setState({ conflict: true, panel: null }));
  useGame.setState({
    mayWrite: () => Boolean(lock?.owns()) &&
      !useGame.getState().readonly && !useGame.getState().conflict
  });
  storage = browserStorage();
  const now = Date.now();
  const loaded = await loadGame(storage, now);
  const checked = rescue(loaded.state);
  useGame.setState({
    game: checked.state,
    now: checked.state.elapsedMinutes,
    modalQueue: overnightQueue(null, { items: {}, total: 0 }, !checked.state.seenV4Intro, checked.state.daily.lastClaim !== localDateKey(now)),
    readonly: loaded.readonly,
    storageMode: storage.mode,
    phase: 'title',
    ripeIds: checked.state.cells.filter(cell => isRipe(cell, checked.state.elapsedMinutes)).map(cell => cell.id)
  });
  if (loaded.notice) useGame.getState().notify(tr[loaded.notice]);
  if (checked.gifted) useGame.getState().notify(tr.gift);
}
