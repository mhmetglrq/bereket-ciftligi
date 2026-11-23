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
type Position = { x: number; y: number };
function plotForCell(cell: Position): LayoutObject {
  const x = Math.floor(cell.x / 2) * 2, y = Math.floor(cell.y / 2) * 2;
  const id = x >= 0 && x < 8 && y >= 0 && y < 8
    ? `plot-${y / 2 * 4 + x / 2}` : `plot-${x},${y}`;
  return { id, x, y, width: 2, height: 2 };
}
export function plotIdForCell(cell: Position, layout: Layout): string | null {
  const { id } = plotForCell(cell);
  return layout.some(o => o.id === id) ? id : null;
}
export function nearestFreeSlot(layout: Layout, target: Position, width: number, height: number): Position | null {
  let nearest: Position | null = null, distance = Infinity;
  for (let y = MAP.min; y + height <= MAP.max; y++) {
    for (let x = MAP.min; x + width <= MAP.max; x++) {
      const squared = (x - target.x) ** 2 + (y - target.y) ** 2;
      const candidate = { id: '', x, y, width, height };
      if (squared < distance && !layout.some(object => overlaps(object, candidate))) {
        nearest = { x, y }; distance = squared;
      }
    }
  }
  return nearest;
}
export function ensurePlotsForCells(layout: Layout, cells: readonly Position[]): Layout {
  let result = layout;
  const seen = new Set(layout.map(o => o.id));
  for (const cell of cells) {
    const plot = plotForCell(cell);
    if (seen.has(plot.id)) continue;
    seen.add(plot.id);
    const position = nearestFreeSlot(result, plot, plot.width, plot.height);
    if (position) result = [...result, { ...plot, ...position }];
  }
  return result;
}
export function cellPosition(cell: Cell, layout: Layout): { x: number; y: number } {
  const tree = layout.find(o => o.id === `tree:${cell.id}`);
  if (tree) return { x: tree.x, y: tree.y };
  const plot = plotForCell(cell);
  const placed = layout.find(o => o.id === plot.id);
  return placed ? { x: placed.x + cell.x - plot.x, y: placed.y + cell.y - plot.y } : cell;
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
