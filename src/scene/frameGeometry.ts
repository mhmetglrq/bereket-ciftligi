import { BufferGeometry, Float32BufferAttribute } from 'three';

export function buildFrameGeometry(width: number, height: number): BufferGeometry {
  const x = width / 2, z = height / 2;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -x, 0.01, -z, x, 0.01, -z,
    x, 0.01, -z, x, 0.01, z,
    x, 0.01, z, -x, 0.01, z,
    -x, 0.01, z, -x, 0.01, -z
  ], 3));
  geometry.setAttribute('lineDistance', new Float32BufferAttribute([
    0, width, 0, height, 0, width, 0, height
  ], 1));
  return geometry;
}
