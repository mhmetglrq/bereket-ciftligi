import { useLayoutEffect, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import { useGame } from '../store/game';
import { isWatered } from '../sim/crops';
import type { Assets } from './assets';
import { palette } from './palette';
import { cellPosition } from '../sim/layout';

export interface Instance {
  x: number;
  y: number;
  z: number;
  scale?: number;
  rotation?: number;
  color?: string;
}

export function Batch({ assetId, items, assets, castShadow = true }: {
  assetId: string;
  items: Instance[];
  assets: Assets;
  castShadow?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const asset = assets.get(assetId);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new Object3D();
    const color = new Color();
    items.forEach((item, index) => {
      object.position.set(item.x, item.y, item.z);
      object.rotation.set(0, item.rotation ?? 0, 0);
      object.scale.setScalar(item.scale ?? 1);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      if (item.color) mesh.setColorAt(index, color.set(item.color));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref}
      args={[asset.geometry, asset.material, Math.max(1, items.length)]}
      castShadow={castShadow} receiveShadow dispose={null} />
  );
}

export function Tiles({ assets }: { assets: Assets }) {
  const layout = useGame(state => state.game.layout);
  const cells = useGame(state => state.game.cells);
  const now = useGame(state => state.now);
  const grass: Instance[] = [];
  const soil: Instance[] = [];
  const furrows: Instance[] = [];
  cells.forEach(original => {
    const position = cellPosition(original, layout);
    const cell = { ...original, x: position.x, y: position.y };
    if (cell.kind === 'untilled' || cell.kind === 'tree') {
      grass.push({ x: cell.x, y: 0, z: cell.y });
    } else {
      soil.push({
        x: cell.x, y: 0, z: cell.y,
        color: isWatered(cell, now) ? palette.soilWatered : palette.tilled
      });
      for (const offset of [-0.26, 0, 0.26]) {
        furrows.push({ x: cell.x, y: 0.077, z: cell.y + offset });
      }
    }
  });
  return (
    <>
      <Batch assetId="tile.untilled" items={grass} assets={assets} />
      <Batch assetId="tile.tilled" items={soil} assets={assets} />
      <Batch assetId="tile.furrow" items={furrows} assets={assets} />
    </>
  );
}
