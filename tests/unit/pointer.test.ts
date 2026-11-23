import { describe, it, expect, vi } from 'vitest';
import { PointerGestures, interpolateCells } from '../../src/input/pointer';

describe('pointer gestures & interpolation', () => {
  it('counts movement under 6px as a tap', () => {
    const tap = vi.fn();
    const gestures = new PointerGestures({
      tap,
      pan: vi.fn(),
      zoom: vi.fn()
    });

    gestures.down(1, { x: 10, y: 10 });
    gestures.move(1, { x: 12, y: 11 }); // < 6px
    gestures.up(1, { x: 12, y: 11 });

    expect(tap).toHaveBeenCalledWith({ x: 12, y: 11 });
  });

  it('starts PAINTING when paintStart returns true and suppresses pan', () => {
    const pan = vi.fn();
    const paint = vi.fn();
    const paintEnd = vi.fn();

    const gestures = new PointerGestures({
      tap: vi.fn(),
      pan,
      zoom: vi.fn(),
      paintStart: () => true,
      paint,
      paintEnd
    });

    gestures.down(1, { x: 10, y: 10 });
    expect(gestures.mode).toBe('PAINTING');

    // Move further than 6px
    gestures.move(1, { x: 50, y: 50 });
    expect(paint).toHaveBeenCalledWith({ x: 50, y: 50 });
    expect(pan).not.toHaveBeenCalled();

    gestures.up(1, { x: 50, y: 50 });
    expect(paintEnd).toHaveBeenCalledWith(false, false);
  });

  it('cancels PAINTING when a second finger touches down', () => {
    const paintEnd = vi.fn();
    const gestures = new PointerGestures({
      tap: vi.fn(),
      pan: vi.fn(),
      zoom: vi.fn(),
      paintStart: () => true,
      paintEnd
    });

    gestures.down(1, { x: 10, y: 10 });
    expect(gestures.mode).toBe('PAINTING');

    // Second finger down
    gestures.down(2, { x: 30, y: 30 });
    expect(paintEnd).toHaveBeenCalledWith(false, true);
    expect(gestures.mode).toBe('PANNING');
  });

  it('interpolates grid cells linearly between points so fast moves do not skip cells', () => {
    const cells = interpolateCells({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(cells).toEqual(['0,0', '1,0', '2,0', '3,0']);

    const diagonal = interpolateCells({ x: 0, y: 0 }, { x: 2, y: 2 });
    expect(diagonal).toContain('0,0');
    expect(diagonal).toContain('1,1');
    expect(diagonal).toContain('2,2');
  });
});
