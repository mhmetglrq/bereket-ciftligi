import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Box3, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useGame } from '../store/game';
import { canPlace } from '../sim/layout';
import type { LayoutObject } from '../sim/types';
import { buildFrameGeometry } from './frameGeometry';

function PlacementFrame({ width, height, valid }: { width: number; height: number; valid: boolean }) {
  const geometry = useMemo(() => buildFrameGeometry(width, height), [width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry}>
    {valid ? <lineBasicMaterial color="#315c3d" /> : <lineDashedMaterial color="#8a332b" dashSize={0.15} gapSize={0.1} />}
  </lineSegments>;
}

export function EditLayer() {
  const edit = useGame(s => s.editMode), layout = useGame(s => s.game.layout);
  const { camera, gl } = useThree();
  const [ghost, setGhost] = useState<LayoutObject | null>(null);
  const ghostRef = useRef<LayoutObject | null>(null);
  useEffect(() => {
    if (!edit) { setGhost(null); return; }
    const canvas = gl.domElement, ray = new Raycaster(), plane = new Plane(new Vector3(0, 1, 0), 0), hit = new Vector3(), ndc = new Vector2();
    const box = new Box3(), objectHit = new Vector3();
    let timer: ReturnType<typeof setTimeout> | undefined, dragging: LayoutObject | null = null, start: { x: number; y: number } | null = null, pointer: number | null = null, offset = { x: 0, y: 0 };
    const point = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.z } : null;
    };
    const reset = () => {
      clearTimeout(timer);
      if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
      dragging = null; start = null; pointer = null; ghostRef.current = null; setGhost(null);
      useGame.setState({ isDragging: false });
    };
    const down = (e: PointerEvent) => {
      if (pointer !== null || e.button !== 0) return;
      const p = point(e); if (!p) return;
      const s = useGame.getState();
      // The footprint under the pointer wins: a tall neighbour's bounding box
      // (a tree behind the shipping box) used to steal the grab.
      let object: LayoutObject | undefined = s.game.layout.find(c =>
        p.x >= c.x - 0.5 && p.x < c.x + c.width - 0.5 && p.y >= c.y - 0.5 && p.y < c.y + c.height - 0.5 && !c.id.startsWith('plot-'))
        ?? s.game.layout.find(c =>
          p.x >= c.x - 0.5 && p.x < c.x + c.width - 0.5 && p.y >= c.y - 0.5 && p.y < c.y + c.height - 0.5);
      let closest = object ? -1 : Infinity;
      for (const candidate of object ? [] : s.game.layout) {
        box.min.set(candidate.x - 0.5, 0, candidate.y - 0.5);
        box.max.set(candidate.x + candidate.width - 0.5, candidate.id.startsWith('plot-') ? 0.15 : candidate.id === 'shipping' ? 0.8 : 2.5, candidate.y + candidate.height - 0.5);
        if (ray.ray.intersectBox(box, objectHit)) {
          const distance = ray.ray.origin.distanceToSquared(objectHit);
          if (distance < closest) { closest = distance; object = candidate; }
        }
      }
      if (!object) return;
      const target = object;
      e.stopImmediatePropagation(); e.preventDefault(); pointer = e.pointerId;
      start = { x: e.clientX, y: e.clientY }; offset = { x: p.x - object.x, y: p.y - object.y };
      useGame.setState({ selectedObject: object.id }); canvas.setPointerCapture(e.pointerId);
      const begin = () => { dragging = target; ghostRef.current = target; setGhost(target); useGame.setState({ isDragging: true }); };
      if (e.pointerType === 'touch') timer = setTimeout(begin, 400); else begin();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      e.stopImmediatePropagation();
      if (!dragging) { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) reset(); return; }
      const p = point(e); if (!p) return;
      const g = { ...dragging, x: Math.round(p.x - offset.x), y: Math.round(p.y - offset.y) };
      ghostRef.current = g; setGhost(g);
    };
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      e.stopImmediatePropagation();
      const g = ghostRef.current;
      if (dragging && g) {
        const s = useGame.getState();
        if (canPlace(s.game.layout, g)) s.moveObject(g.id, g.x, g.y); else s.notify('Buraya yerleştirilemez');
      }
      reset(); if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', down, true); canvas.addEventListener('pointermove', move, true); canvas.addEventListener('pointerup', up, true); canvas.addEventListener('pointercancel', reset, true);
    return () => { reset(); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', down, true); canvas.removeEventListener('pointermove', move, true); canvas.removeEventListener('pointerup', up, true); canvas.removeEventListener('pointercancel', reset, true); };
  }, [edit, camera, gl]);
  if (!edit || !ghost) return null;
  const valid = canPlace(layout, ghost);
  return <group position={[ghost.x + (ghost.width - 1) / 2, 0.15, ghost.y + (ghost.height - 1) / 2]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[ghost.width, ghost.height]} /><meshBasicMaterial color={valid ? '#315c3d' : '#8a332b'} transparent opacity={0.55} depthWrite={false} /></mesh>
    <PlacementFrame width={ghost.width} height={ghost.height} valid={valid} />
    <Html center><span className={`edit-ghost ${valid ? 'valid' : 'invalid'}`}>{valid ? '✓' : '✕'}</span></Html>
  </group>;
}
