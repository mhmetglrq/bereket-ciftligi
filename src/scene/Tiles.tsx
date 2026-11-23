import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { useGame } from '../store/game';
import type { Assets } from './assets';

export interface Instance {
  x: number;
  y: number;
  z: number;
  scale?: number;
  rotation?: number;
}

export function Batch({ assetId, items, assets }: {
  assetId: string;
  items: Instance[];
  assets: Assets;
}) {
  const ref = useRef<InstancedMesh>(null);
  const asset = assets.get(assetId);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new Object3D();
    items.forEach((item, index) => {
      object.position.set(item.x, item.y, item.z);
      object.rotation.set(0, item.rotation ?? 0, 0);
      object.scale.setScalar(item.scale ?? 1);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[asset.geometry, asset.material, Math.max(1, items.length)]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}

export function Tiles({ assets }: { assets: Assets }) {
  const cells = useGame(state => state.game.cells);
  const grass: Instance[] = [];
  const soil: Instance[] = [];
  const furrows: Instance[] = [];
  cells.forEach(cell => {
    const target = cell.kind === 'untilled' ? grass : soil;
    target.push({ x: cell.x, y: 0, z: cell.y });
    if (cell.kind !== 'untilled') {
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
