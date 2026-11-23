import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { CROP_IDS } from '../sim/data';
import { isRipe, stageOf } from '../sim/crops';
import { useGame } from '../store/game';
import type { Assets } from './assets';
import { Batch, type Instance } from './Tiles';
import { palette } from './palette';
import { cellPosition } from '../sim/layout';

function RipeMarkers({ items }: { items: Instance[] }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const state = useGame.getState();
    ref.current.position.y = state.reducedMotion || state.panel === 'pause'
      ? 0 : Math.sin(clock.elapsedTime * 2.4) * 0.045;
  });
  return (
    <group ref={ref}>
      {items.map(item => (
        <mesh key={`${item.x},${item.z}`} position={[item.x, 0.98, item.z]}>
          <octahedronGeometry args={[0.075, 0]} />
          <meshBasicMaterial color={palette.sparkle} />
        </mesh>
      ))}
    </group>
  );
}

export function Crops({ assets }: { assets: Assets }) {
  const layout = useGame(state => state.game.layout);
  const cells = useGame(state => state.game.cells);
  const now = useGame(state => state.now);
  const groups = new Map<string, Instance[]>();
  const ripe: Instance[] = [];

  CROP_IDS.forEach(id => {
    for (let stage = 0; stage < 4; stage++) groups.set(`crop.${id}.stage${stage}`, []);
  });
  cells.forEach(original => {
    const cell = { ...original, ...cellPosition(original, layout) };
    if (cell.kind !== 'planted') return;
    const stage = stageOf(cell, now);
    const instances = groups.get(`crop.${cell.cropId}.stage${stage}`)!;
    const height = [0.16, 0.24, 0.34, 0.43][stage];
    const offsets = stage === 0 ? [-0.19, 0.19] : [-0.23, 0, 0.23];
    offsets.forEach((offset, index) => {
      instances.push({
        x: cell.x + offset,
        y: height,
        z: cell.y + (index % 2 === 0 ? -0.16 : 0.16),
        rotation: cell.cropId === 'carrot' && stage === 3 ? Math.PI : index * 0.7,
        color: cell.dead ? '#6b5740' : cell.cropId === 'pumpkin' && stage === 3 ? '#c26720' : undefined
      });
    });
    if (isRipe(cell, now)) ripe.push({ x: cell.x, y: 1, z: cell.y });
  });

  return (
    <>
      {[...groups].map(([assetId, items]) => (
        <Batch key={assetId} assetId={assetId} items={items} assets={assets} />
      ))}
      <RipeMarkers items={ripe} />
    </>
  );
}
