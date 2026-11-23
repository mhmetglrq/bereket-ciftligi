import { useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D, Shape } from 'three';
import { isWatered } from '../sim/crops';
import { useGame } from '../store/game';
import { palette } from './palette';
import { cellPosition } from '../sim/layout';

export function WaterMarks() {
  const layout = useGame(state => state.game.layout);
  const cells = useGame(state => state.game.cells);
  const now = useGame(state => state.now);
  const ref = useRef<InstancedMesh>(null);
  const shape = useMemo(() => {
    const drop = new Shape();
    drop.moveTo(0, 0.12);
    drop.bezierCurveTo(-0.03, 0.05, -0.10, -0.01, -0.08, -0.06);
    drop.bezierCurveTo(-0.06, -0.14, 0.06, -0.14, 0.08, -0.06);
    drop.bezierCurveTo(0.10, -0.01, 0.03, 0.05, 0, 0.12);
    return drop;
  }, []);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new Object3D();
    let count = 0;
    cells.forEach(cell => {
      if (!isWatered(cell, now)) return;
      const p = cellPosition(cell, layout);
      object.position.set(p.x + 0.32, 0.10, p.y - 0.31);
      object.rotation.set(-Math.PI / 2, 0, 0);
      object.updateMatrix();
      ref.current?.setMatrixAt(count++, object.matrix);
    });
    ref.current.count = count;
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [cells, now, layout]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 64]}>
      <shapeGeometry args={[shape, 8]} />
      <meshBasicMaterial color={palette.waterDecal}
        polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </instancedMesh>
  );
}
