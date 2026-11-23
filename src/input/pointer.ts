export interface Point { x: number; y: number }
export interface GestureCallbacks {
  tap: (point: Point) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (ratio: number) => void;
  paintStart?: (point: Point) => boolean;
  paint?: (point: Point) => void;
  paintEnd?: (tap: boolean, cancelled: boolean) => void;
}
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export class PointerGestures {
  mode: 'IDLE' | 'PAINTING' | 'PANNING' = 'IDLE';
  private points = new Map<number, Point>();
  private origin: Point | null = null;
  private blocked = false;
  private maxDistance = 0;

  constructor(private readonly callbacks: GestureCallbacks) {}

  down(id: number, point: Point): void {
    if (this.points.size === 0) {
      this.origin = point;
      this.blocked = false;
      this.maxDistance = 0;
      this.mode = this.callbacks.paintStart?.(point) ? 'PAINTING' : 'IDLE';
    } else {
      if (this.mode === 'PAINTING') this.callbacks.paintEnd?.(false, true);
      this.mode = 'PANNING';
      this.blocked = true;
    }
    this.points.set(id, point);
  }

  move(id: number, point: Point): void {
    const previous = this.points.get(id);
    if (!previous) return;
    const oldPoints = [...this.points.values()];
    this.points.set(id, point);
    const newPoints = [...this.points.values()];
    if (this.points.size > 1) {
      this.blocked = true;
      const before = distance(oldPoints[0], oldPoints[1]);
      const after = distance(newPoints[0], newPoints[1]);
      if (before > 0 && after > 0) this.callbacks.zoom(after / before);
      this.callbacks.pan((point.x - previous.x) / 2, (point.y - previous.y) / 2);
      return;
    }
    if (this.mode === 'PAINTING') {
      if (this.origin) this.maxDistance = Math.max(this.maxDistance, distance(this.origin, point));
      this.callbacks.paint?.(point);
      return;
    }
    if (this.origin) {
      this.maxDistance = Math.max(this.maxDistance, distance(this.origin, point));
    }
    if (this.maxDistance >= 6) {
      this.mode = 'PANNING';
      const firstPan = !this.blocked;
      this.blocked = true;
      const start = firstPan && this.origin ? this.origin : previous;
      this.callbacks.pan(point.x - start.x, point.y - start.y);
    }
  }

  up(id: number, point: Point): void {
    if (!this.points.has(id)) return;
    if (this.origin) {
      this.maxDistance = Math.max(this.maxDistance, distance(this.origin, point));
    }
    const painting = this.mode === 'PAINTING';
    if (painting) { this.callbacks.paint?.(point); this.callbacks.paintEnd?.(this.maxDistance < 6, false); }
    const tap = !painting && this.points.size === 1 && !this.blocked && this.maxDistance < 6;
    this.points.delete(id);
    if (tap) this.callbacks.tap(point);
    if (this.points.size === 0) { this.origin = null; this.mode = 'IDLE'; }
  }

  cancel(): void {
    if (this.mode === 'PAINTING') this.callbacks.paintEnd?.(false, true);
    this.mode = 'IDLE';
    this.points.clear();
    this.origin = null;
    this.blocked = true;
  }
}

export function interpolateCells(from: Point, to: Point): string[] {
  const cells: string[] = [];
  let x = from.x, y = from.y;
  const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
  let error = dx - dy;
  for (;;) {
    cells.push(`${x},${y}`);
    if (x === to.x && y === to.y) break;
    const twice = error * 2;
    if (twice > -dy) { error -= dy; x += sx; }
    if (twice < dx) { error += dx; y += sy; }
  }
  return cells;
}
