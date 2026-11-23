import type { StateCreator } from 'zustand';
import type { CropId, Tool } from '../../sim/types';
import type { AwayReport } from '../../sim/offline';
import type { StorageMode } from '../../save/storage';
import type { Store } from '../game';

export type Panel = 'market' | 'quests' | 'settings' | 'pause' | 'field' | 'reset' | null;
export interface Feedback { id: number; text: string; expiresAt: number }
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
  notify: (text: string) => void;
}

let feedbackId = 0;
export function feedback(text: string, now: number): Feedback {
  return { id: ++feedbackId, text, expiresAt: now + 3800 };
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
  setPanel: panel => set({ panel }),
  chooseTool: tool => set({ tool: get().tool === tool ? null : tool }),
  notify: text => set(state => ({
    toasts: [...state.toasts.slice(-3), feedback(text, Date.now())]
  }))
});
