export interface Point { x: number; y: number }
export interface GestureCallbacks {
  tap: (point: Point) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (ratio: number) => void;
}
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export class PointerGestures {
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
    } else {
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
    if (this.origin) {
      this.maxDistance = Math.max(this.maxDistance, distance(this.origin, point));
    }
    if (this.maxDistance >= 8) {
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
    const tap = this.points.size === 1 && !this.blocked && this.maxDistance < 8;
    this.points.delete(id);
    if (tap) this.callbacks.tap(point);
    if (this.points.size === 0) this.origin = null;
  }

  cancel(): void {
    this.points.clear();
    this.origin = null;
    this.blocked = true;
  }
}
