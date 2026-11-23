import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useGame } from '../store/game';
import { objectCenter } from '../sim/layout';
import { placeLabels, type Rect } from '../sim/labels';
import { tr } from '../i18n/tr';
export const objectName = (id: string): string => id === 'home' ? 'Ev · Uyu' : id === 'shipping' ? 'Nakliye kutusu' : id === 'coop' ? tr.coop : id === 'mill' || id === 'bakery' ? tr[id] : id.startsWith('tree:') ? 'Meyve ağacı' : 'Tarla parseli';
export function SceneLabels() {
  const { camera, gl } = useThree();
  const layer = useRef<HTMLDivElement>(null);
  const vector = useRef(new Vector3());
  const hovered = useGame(s => s.hoveredObject), selected = useGame(s => s.selectedObject);
  const ids = [...new Set([selected, hovered].filter((id): id is string => Boolean(id)))];
  useFrame(() => {
    const s = useGame.getState(), root = layer.current;
    if (!root) return;
    const rect = gl.domElement.getBoundingClientRect();
    const hud = document.querySelector('.hud, .edit-bar')?.getBoundingClientRect();
    const candidates = ids.filter(id => s.game.layout.some(o => o.id === id)).map(id => {
      const center = objectCenter(s.game.layout, id);
      vector.current.set(center[0], id.startsWith('plot') ? 0.7 : 3.2, center[2]).project(camera);
      return { id, selected: id === selected, width: 210, height: 44, x: rect.left + (vector.current.x + 1) * rect.width / 2 - 105, y: rect.top + (1 - vector.current.y) * rect.height / 2 - 52 };
    });
    const bounds = (points: Array<[number, number, number]>): Rect => {
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      for (const point of points) {
        vector.current.set(...point).project(camera);
        const x = rect.left + (vector.current.x + 1) * rect.width / 2, y = rect.top + (1 - vector.current.y) * rect.height / 2;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return { x: left, y: top, width: right - left, height: bottom - top };
    };
    const home = objectCenter(s.game.layout, 'home');
    const obstacles = [bounds([[-1, 0.15, -0.9], [8.5, 0.5, -0.9]]), bounds([
      [home[0] - 0.9, 0, home[2] - 0.7], [home[0] + 0.9, 0, home[2] + 0.7],
      [home[0] - 0.9, 1.7, home[2] - 0.7], [home[0] + 0.9, 1.7, home[2] + 0.7]
    ])];
    const placed = s.panel || s.modalQueue.length || s.phase !== 'playing' ? [] : placeLabels(candidates, { width: window.innerWidth, height: window.innerHeight }, { x: 0, y: 0, width: window.innerWidth, height: hud?.bottom ?? 0 }, obstacles);
    for (const child of Array.from(root.children)) {
      const el = child as HTMLDivElement, p = placed.find(p => p.id === el.dataset.id);
      el.style.display = p ? 'grid' : 'none';
      if (p) { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; el.style.width = `${p.width}px`; }
    }
  });
  return <Html calculatePosition={() => [0, 0]} portal={{ current: document.body }} zIndexRange={[9, 9]} style={{ pointerEvents: 'none' }}><div ref={layer} className="scene-labels">{ids.map(id => <div key={id} data-id={id} className="scene-label panel">{objectName(id)}</div>)}</div></Html>;
}
