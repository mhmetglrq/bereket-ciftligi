import type { StateCreator } from 'zustand';
import type { CropId, Tool } from '../../sim/types';
import type { AwayReport } from '../../sim/offline';
import type { StorageMode } from '../../save/storage';
import { tr } from '../../i18n/tr';
import type { Store } from '../game';

export type Panel = 'market' | 'quests' | 'settings' | 'pause' | 'field' | 'reset' | 'coop' | null;
export interface Feedback {
  id: number;
  text: string;
  expiresAt: number;
  duration: number;
  kind?: 'warning' | 'level';
  unlocks?: CropId[];
}
export interface UISlice {
  now: number;
  phase: 'loading' | 'title' | 'playing';
  panel: Panel;
  tool: Tool | null;
  seed: CropId;
  selected: string | null;
  away: AwayReport | null;
  toasts: Feedback[];
  floaters: Feedback[];
  shake: number;
  muted: boolean;
  reducedMotion: boolean;
  conflict: boolean;
  readonly: boolean;
  storageMode: StorageMode;
  saveStatus: 'saved' | 'saving';
  sceneEpoch: number;
  ripeIds: string[];
  setPanel: (panel: Panel) => void;
  chooseTool: (tool: Tool | null) => void;
  notify: (text: string, duration?: number, unlocks?: CropId[]) => void;
  warn: (now: number) => boolean;
}

let feedbackId = 0;
export const WARNING_ID = -1;
export function feedback(text: string, now: number, duration = 3000): Feedback {
  return { id: ++feedbackId, text, expiresAt: now + duration, duration };
}

export const createUISlice: StateCreator<Store, [], [], UISlice> = (set, get) => ({
  now: Date.now(),
  phase: 'loading',
  panel: null,
  tool: null,
  seed: 'wheat',
  selected: null,
  away: null,
  toasts: [],
  floaters: [],
  shake: 0,
  muted: false,
  reducedMotion: typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  conflict: false,
  readonly: false,
  storageMode: 'local',
  saveStatus: 'saved',
  sceneEpoch: 0,
  ripeIds: [],
  setPanel: panel => set(state => ({
    panel,
    floaters: panel ? state.floaters.filter(item => item.id !== WARNING_ID) : state.floaters
  })),
  chooseTool: tool => set({ tool: get().tool === tool ? null : tool }),
  notify: (text, duration = 3000, unlocks) => set(state => {
    const now = Date.now();
    return {
      toasts: [
        ...state.toasts.filter(item => item.expiresAt > now).slice(-2),
        {
          ...feedback(text, now, duration),
          ...(unlocks !== undefined ? { kind: 'level' as const, unlocks } : {})
        }
      ]
    };
  }),
  warn: now => {
    const state = get();
    if (state.panel !== null || state.away || state.conflict) return false;
    const repeated = state.floaters.some(item => item.id === WARNING_ID && item.expiresAt > now);
    set({
      shake: repeated ? state.shake : state.shake + 1,
      floaters: [
        ...state.floaters.filter(item => item.id !== WARNING_ID && item.expiresAt > now).slice(-4),
        {
          id: WARNING_ID,
          text: tr.invalid,
          duration: 1200,
          expiresAt: now + 1200,
          kind: 'warning'
        }
      ]
    });
    return !repeated;
  }
});
