import { describe, expect, it, vi } from 'vitest';
import { PointerGestures } from '../../src/input/pointer';

function setup() {
  const callbacks = { tap: vi.fn(), pan: vi.fn(), zoom: vi.fn() };
  return { callbacks, gestures: new PointerGestures(callbacks) };
}

describe('pointer gestures', () => {
  it('selects only a one-pointer tap strictly below 6px', () => {
    const { callbacks, gestures } = setup();
    gestures.down(1, { x: 0, y: 0 });
    gestures.move(1, { x: 5, y: 0 });
    gestures.up(1, { x: 5, y: 0 });
    expect(callbacks.tap).toHaveBeenCalledOnce();
    expect(callbacks.pan).not.toHaveBeenCalled();
  });
  it('does not apply a tool on pan, including a returned pointer', () => {
    const { callbacks, gestures } = setup();
    gestures.down(1, { x: 0, y: 0 });
    gestures.move(1, { x: 8, y: 0 });
    gestures.move(1, { x: 0, y: 0 });
    gestures.up(1, { x: 0, y: 0 });
    expect(callbacks.tap).not.toHaveBeenCalled();
    expect(callbacks.pan).toHaveBeenCalled();
  });
  it('never treats pinch or the remaining pointer as a tap', () => {
    const { callbacks, gestures } = setup();
    gestures.down(1, { x: 0, y: 0 });
    gestures.down(2, { x: 20, y: 0 });
    gestures.move(2, { x: 40, y: 0 });
    gestures.up(2, { x: 40, y: 0 });
    gestures.up(1, { x: 0, y: 0 });
    expect(callbacks.zoom).toHaveBeenCalledWith(2);
    expect(callbacks.tap).not.toHaveBeenCalled();
  });
  it('cancels interrupted touches', () => {
    const { callbacks, gestures } = setup();
    gestures.down(1, { x: 0, y: 0 });
    gestures.cancel();
    gestures.up(1, { x: 0, y: 0 });
    expect(callbacks.tap).not.toHaveBeenCalled();
  });
});
