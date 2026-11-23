import type { StateCreator } from 'zustand';
import type { CropId, Tool, Layout } from '../../sim/types';
import type { Shipment } from '../../sim/shipping';
import type { StorageMode } from '../../save/storage';
import { tr } from '../../i18n/tr';
import type { Store } from '../game';

export type Panel = 'home' | 'shipping' | 'market' | 'quests' | 'settings' | 'pause' | 'field' | 'reset' | 'coop' | 'mill' | 'bakery' | 'orders' | 'daily' | null;
export type QueuedModal = { type: 'passOut'; penalty: number } | { type: 'shipment'; shipment: Shipment } | { type: 'intro' } | { type: 'daily' };
export function overnightQueue(penalty: number | null, shipment: Shipment, intro: boolean, daily: boolean): QueuedModal[] {
  return [...(penalty !== null ? [{ type: 'passOut' as const, penalty }] : []), ...(shipment.total > 0 ? [{ type: 'shipment' as const, shipment }] : []), ...(intro ? [{ type: 'intro' as const }] : []), ...(daily ? [{ type: 'daily' as const }] : [])];
}
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
  painting: boolean;
  paintedCell: string | null;
  editMode: boolean;
  isDragging: boolean;
  hidden: boolean;
  blurred: boolean;
  hoveredObject: string | null;
  selectedObject: string | null;
  layoutSnapshot: Layout | null;
  savedTool: Tool | null;
  modalQueue: QueuedModal[];
  closeQueuedModal: () => void;
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
  now: 0,
  phase: 'loading',
  panel: null,
  tool: null,
  seed: 'carrot',
  selected: null,
  painting: false,
  paintedCell: null,
  editMode: false, isDragging: false, hidden: false, blurred: false,
  hoveredObject: null, selectedObject: null, layoutSnapshot: null, savedTool: null, modalQueue: [],
  closeQueuedModal: () => {
    const current = get();
    const game = current.modalQueue[0]?.type === 'intro' ? { ...current.game, seenV4Intro: true } : current.game;
    set({ game, modalQueue: current.modalQueue.slice(1) });
    current.requestSave();
  },
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
  chooseTool: tool => { if (!get().editMode) set({ tool: get().tool === tool ? null : tool }); },
  notify: (text, duration = 3000, unlocks) => set(state => {
    const now = Date.now();
    return {
      toasts: [
        ...state.toasts.filter(item => item.expiresAt > now).slice(-3),
        {
          ...feedback(text, now, duration),
          ...(unlocks !== undefined ? { kind: 'level' as const, unlocks } : {})
        }
      ]
    };
  }),
  warn: now => {
    const state = get();
    if (state.panel !== null || state.conflict) return false;
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
