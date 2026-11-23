import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, type StoreApi } from 'zustand';
import { createUISlice, WARNING_ID, type UISlice } from '../../src/store/slices/uiSlice';
import type { Store } from '../../src/store/game';

describe('UI Feedback & Toast constraints', () => {
  let store: StoreApi<Store>;

  beforeEach(() => {
    store = createStore<Store>()((set, get, api) => ({
      ...createUISlice(set, get, api),
      game: {} as any,
      dispatch: () => {},
      selectCell: () => {},
      mayWrite: () => true,
      requestSave: () => {}
    }));
  });

  it('enforces maximum 3 toasts using plain FIFO eviction', () => {
    const notify = store.getState().notify;

    notify('Toast 1');
    notify('Toast 2');
    notify('Toast 3');

    let toasts = store.getState().toasts;
    expect(toasts.length).toBe(3);
    expect(toasts.map(t => t.text)).toEqual(['Toast 1', 'Toast 2', 'Toast 3']);

    // Adding 4th toast evicts the oldest (Toast 1)
    notify('Toast 4');
    toasts = store.getState().toasts;
    expect(toasts.length).toBe(3);
    expect(toasts.map(t => t.text)).toEqual(['Toast 2', 'Toast 3', 'Toast 4']);

    // Adding 5th toast evicts Toast 2
    notify('Toast 5');
    toasts = store.getState().toasts;
    expect(toasts.length).toBe(3);
    expect(toasts.map(t => t.text)).toEqual(['Toast 3', 'Toast 4', 'Toast 5']);
  });

  it('deduplicates warning, sets 1200 ms TTL and fixed WARNING_ID', () => {
    const now = 1_000_000;
    const warn = store.getState().warn;

    // First warning
    const firstTriggered = warn(now);
    expect(firstTriggered).toBe(true);

    let floaters = store.getState().floaters;
    const warningFloater = floaters.find(f => f.id === WARNING_ID);
    expect(warningFloater).toBeDefined();
    expect(warningFloater?.duration).toBe(1200);
    expect(warningFloater?.expiresAt).toBe(now + 1200);
    expect(store.getState().shake).toBe(1);

    // Repeated warning before TTL expires
    const secondTriggered = warn(now + 500);
    expect(secondTriggered).toBe(false); // Repeated warning returns false to prevent SFX re-trigger
    floaters = store.getState().floaters;
    const updatedFloater = floaters.find(f => f.id === WARNING_ID);
    expect(updatedFloater?.expiresAt).toBe(now + 500 + 1200); // Refreshes TTL
    expect(store.getState().shake).toBe(1); // Shake counter unchanged on repeated within TTL
  });

  it('suppresses warning when a panel is open', () => {
    const now = 1_000_000;
    store.getState().setPanel('market');

    const triggered = store.getState().warn(now);
    expect(triggered).toBe(false);
    expect(store.getState().floaters.filter(f => f.id === WARNING_ID).length).toBe(0);
  });

  it('clears warning floater when panel opens', () => {
    const now = 1_000_000;
    store.getState().warn(now);
    expect(store.getState().floaters.some(f => f.id === WARNING_ID)).toBe(true);

    store.getState().setPanel('coop');
    expect(store.getState().floaters.some(f => f.id === WARNING_ID)).toBe(false);
  });
});
