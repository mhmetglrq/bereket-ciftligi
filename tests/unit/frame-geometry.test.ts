import { describe, it, expect } from 'vitest';
import { buildFrameGeometry } from '../../src/scene/frameGeometry';

describe('buildFrameGeometry', () => {
  it('creates geometry with matching position and lineDistance count', () => {
    const geom = buildFrameGeometry(2, 2);
    const pos = geom.getAttribute('position');
    const dist = geom.getAttribute('lineDistance');

    expect(pos).toBeDefined();
    expect(dist).toBeDefined();
    expect(pos.count).toBe(dist.count);
    expect(pos.count).toBe(8); // 4 line segments = 8 vertices
  });

  it('sets each segment distances to [0, length]', () => {
    const width = 3;
    const height = 5;
    const geom = buildFrameGeometry(width, height);
    const dist = geom.getAttribute('lineDistance');

    expect(dist.getX(0)).toBe(0);
    expect(dist.getX(1)).toBe(width);

    expect(dist.getX(2)).toBe(0);
    expect(dist.getX(3)).toBe(height);

    expect(dist.getX(4)).toBe(0);
    expect(dist.getX(5)).toBe(width);

    expect(dist.getX(6)).toBe(0);
    expect(dist.getX(7)).toBe(height);
  });

  it('does not produce undefined or NaN attributes', () => {
    const geom = buildFrameGeometry(4, 2);
    const pos = geom.getAttribute('position');
    const dist = geom.getAttribute('lineDistance');

    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
      expect(Number.isFinite(dist.getX(i))).toBe(true);
    }
  });
});
