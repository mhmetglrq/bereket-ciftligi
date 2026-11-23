import type { Cell, GameState, Layout, LayoutObject } from './types';
export const MAP = { min: -3, max: 10 };
export const PLOTS = Array.from({ length: 16 }, (_, i) => ({ id: `plot-${i}`, x: (i % 4) * 2, y: Math.floor(i / 4) * 2, width: 2, height: 2 }));
export const defaultLayout = (): Layout => [
  { id: 'home', x: 4, y: -3, width: 2, height: 2 },
  { id: 'mill', x: -2, y: -3, width: 2, height: 2 },
  { id: 'bakery', x: 1, y: -3, width: 2, height: 2 },
  { id: 'coop', x: 8, y: 2, width: 2, height: 3 },
  { id: 'shipping', x: 8, y: 0, width: 1, height: 1 }, ...PLOTS.map(p => ({ ...p }))
];
export const overlaps = (a: LayoutObject, b: LayoutObject): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function canPlace(layout: Layout, candidate: LayoutObject): boolean {
  return Number.isInteger(candidate.x) && Number.isInteger(candidate.y) && candidate.x >= MAP.min && candidate.y >= MAP.min && candidate.x + candidate.width <= MAP.max && candidate.y + candidate.height <= MAP.max && !layout.some(o => o.id !== candidate.id && overlaps(o, candidate));
}
export function cellPosition(cell: Cell, layout: Layout): { x: number; y: number } {
  const tree = layout.find(o => o.id === `tree:${cell.id}`);
  if (tree) return { x: tree.x, y: tree.y };
  const plot = PLOTS.find(p => cell.x >= p.x && cell.x < p.x + p.width && cell.y >= p.y && cell.y < p.y + p.height);
  const placed = layout.find(o => o.id === plot?.id);
  return plot && placed ? { x: placed.x + cell.x - plot.x, y: placed.y + cell.y - plot.y } : cell;
}
export function moveObject(state: GameState, id: string, x: number, y: number): GameState {
  const object = state.layout.find(o => o.id === id);
  if (!object || !canPlace(state.layout, { ...object, x, y })) return state;
  return { ...state, layout: state.layout.map(o => o.id === id ? { ...o, x, y } : o) };
}
export const objectCenter = (layout: Layout, id: string): [number, number, number] => {
  const o = layout.find(p => p.id === id)!;
  return [o.x + (o.width - 1) / 2, 0, o.y + (o.height - 1) / 2];
};
