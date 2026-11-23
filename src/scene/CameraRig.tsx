import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { PointerGestures, interpolateCells, type Point } from '../input/pointer';
import { useGame } from '../store/game';
import { applyAction } from '../sim/actions';
import type { Reason } from '../sim/types';
import { tr } from '../i18n/tr';
import { cellPosition } from '../sim/layout';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function CameraRig() {
  const { camera, gl, size } = useThree();
  const target = useRef({ x: 2.5, z: 2.5, zoom: 58 });
  const current = useRef({ x: 2.5, z: 2.5, zoom: 58 });
  const viewport = useRef(size);
  viewport.current = size;

  useEffect(() => {
    const element = gl.domElement;
    const raycaster = new Raycaster();
    const plane = new Plane(new Vector3(0, 1, 0), -0.09);
    const hit = new Vector3();
    const ndc = new Vector2();
    const visited = new Set<string>();
    let lastCell: Point | null = null;
    let pending: Point | null = null;
    let stopped = false;
    let frame = 0;
    let initialReason: Reason | null = null;
    const cellAt = (point: Point): Point | null => {
      const rect = element.getBoundingClientRect();
      ndc.set(((point.x - rect.left) / rect.width) * 2 - 1, -((point.y - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      const s = useGame.getState();
      const cell = s.game.cells.find(c => { const p = cellPosition(c, s.game.layout); return Math.abs(p.x - hit.x) <= 0.5 && Math.abs(p.y - hit.z) <= 0.5; });
      return cell ? { x: cell.x, y: cell.y } : null;
    };
    const flush = (): void => {
      frame = 0;
      const point = pending; pending = null;
      if (!point || stopped) return;
      const cell = cellAt(point);
      if (!cell) return;
      const game = useGame.getState().game;
      const original = game.cells.find(c => c.x === cell.x && c.y === cell.y);
      if (!original) return;
      const position = cellPosition(original, game.layout);
      const ids = interpolateCells(lastCell ?? position, position).flatMap(worldId => {
        const [x, y] = worldId.split(',').map(Number);
        const target = game.cells.find(c => { const p = cellPosition(c, game.layout); return p.x === x && p.y === y; });
        if (!target || visited.has(target.id)) return [];
        visited.add(target.id); return [target.id];
      });
      lastCell = position;
      if (ids.length) stopped = !useGame.getState().paintCells(ids);
    };
    const gestures = new PointerGestures({
      paintStart: point => {
        const state = useGame.getState();
        if (!state.tool || state.phase !== 'playing' || state.panel || state.editMode || state.modalQueue.length || state.conflict) return false;
        const cell = cellAt(point);
        if (!cell || cell.x < 0 || cell.y < 0 || cell.x >= state.game.gridSize || cell.y >= state.game.gridSize) return false;
        visited.clear(); lastCell = null; stopped = false;
        const cellId = `${cell.x},${cell.y}`;
        const probe = applyAction(state.game, state.tool === 'plant' ? { type: 'plant', cellId, cropId: state.seed } : { type: state.tool, cellId }, state.now);
        initialReason = probe.ok ? null : probe.reason;
        useGame.setState({ painting: true, paintedCell: initialReason ? null : cellId, selected: cellId });
        element.style.cursor = 'crosshair';
        pending = point; frame = requestAnimationFrame(flush);
        return true;
      },
      paint: point => { pending = point; if (!frame) frame = requestAnimationFrame(flush); },
      paintEnd: (tap, cancelled) => {
        if (frame) cancelAnimationFrame(frame);
        if (cancelled) { pending = null; frame = 0; stopped = true; }
        else {
          flush();
          if (tap && initialReason && initialReason !== 'noSeeds' && initialReason !== 'locked') useGame.getState().notify(tr.reasons[initialReason]);
          if (tap && !initialReason && !stopped) {
            const tool = useGame.getState().tool;
            useGame.getState().notify(tool === 'till' ? tr.plowed : tool === 'plant' ? tr.planted : tool === 'water' ? tr.watered : tr.harvested);
          }
        }
        useGame.setState({ painting: false });
        element.style.cursor = '';
      },
      tap: point => {
        const state = useGame.getState();
        if (state.phase !== 'playing' || state.editMode || state.modalQueue.length || state.panel || state.conflict) return;
        const rect = element.getBoundingClientRect();
        raycaster.setFromCamera(new Vector2(
          ((point.x - rect.left) / rect.width) * 2 - 1,
          -((point.y - rect.top) / rect.height) * 2 + 1
        ), camera);
        if (!raycaster.ray.intersectPlane(plane, hit)) return;
        const cell = cellAt(point);
        if (cell) state.selectCell(`${cell.x},${cell.y}`);
      },
      pan: (dx, dy) => {
        const zoom = current.current.zoom;
        target.current.x += (-dx * 0.707 - dy * 0.866) / zoom;
        target.current.z += (dx * 0.707 - dy * 0.866) / zoom;
      },
      zoom: ratio => {
        target.current.zoom = clamp(target.current.zoom * ratio, 28, 115);
      }
    });
    const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });
    const down = (event: PointerEvent): void => {
      if (useGame.getState().editMode || useGame.getState().isDragging || useGame.getState().modalQueue.length) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      element.setPointerCapture(event.pointerId);
      gestures.down(event.pointerId, point(event));
    };
    const move = (event: PointerEvent): void => {
      const s = useGame.getState();
      if (s.isDragging || s.editMode) return;
      if (!s.painting) {
        const p = cellAt(point(event));
        const cell = p && s.game.cells.find(c => c.x === p.x && c.y === p.y);
        if (cell) {
          const id = cell.kind === 'tree' ? `tree:${cell.id}` : `plot-${Math.floor(cell.y / 2) * 4 + Math.floor(cell.x / 2)}`;
          if (s.hoveredObject !== id) useGame.setState({ hoveredObject: id });
        } else if (s.hoveredObject?.startsWith('plot-') || s.hoveredObject?.startsWith('tree:')) useGame.setState({ hoveredObject: null });
      }
      gestures.move(event.pointerId, point(event));
    };
    const up = (event: PointerEvent): void => {
      gestures.up(event.pointerId, point(event));
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const cancel = (): void => gestures.cancel();
    const wheel = (event: WheelEvent): void => {
      if (useGame.getState().isDragging) return;
      event.preventDefault();
      gestures.cancel();
      target.current.zoom = clamp(target.current.zoom * Math.exp(-event.deltaY * 0.001), 28, 115);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', cancel);
    element.addEventListener('lostpointercapture', cancel);
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      useGame.setState({ painting: false });
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', cancel);
      element.removeEventListener('lostpointercapture', cancel);
      element.removeEventListener('wheel', wheel);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const state = useGame.getState();
    if (state.painting || state.isDragging) return;
    const center = (state.game.gridSize - 1) / 2;
    target.current.x = clamp(target.current.x, center - 3.5, center + 3.5);
    target.current.z = clamp(target.current.z, center - 3.5, center + 3.5);
    const factor = state.reducedMotion ? 1 : 1 - Math.exp(-delta * 10);
    const fit = Math.min(viewport.current.width / 15, viewport.current.height / 11);
    const zoom = target.current.zoom * Math.min(1, fit / 58);
    current.current.x += (target.current.x - current.current.x) * factor;
    current.current.z += (target.current.z - current.current.z) * factor;
    current.current.zoom += (zoom - current.current.zoom) * factor;
    camera.position.set(current.current.x + 12, 13, current.current.z + 12);
    camera.lookAt(current.current.x, 0, current.current.z);
    if (camera instanceof OrthographicCamera) {
      camera.zoom = current.current.zoom;
      camera.updateProjectionMatrix();
    }
  });

  const gridSize = useGame(state => state.game.gridSize);
  useEffect(() => {
    const center = (gridSize - 1) / 2;
    target.current.x = center;
    target.current.z = center;
  }, [gridSize]);
  return null;
}
