export interface Rect { x: number; y: number; width: number; height: number }
export interface LabelCandidate extends Rect { id: string; selected?: boolean }
const intersects = (a: Rect, b: Rect): boolean => a.x < b.x + b.width + 6 && a.x + a.width + 6 > b.x && a.y < b.y + b.height + 6 && a.y + a.height + 6 > b.y;
export function placeLabels(candidates: LabelCandidate[], viewport: { width: number; height: number }, hud: Rect, obstacles: Rect[] = []): LabelCandidate[] {
  const placed: LabelCandidate[] = [];
  for (const c of [...candidates].sort((a, b) => Number(Boolean(b.selected)) - Number(Boolean(a.selected)))) {
    const width = Math.min(c.width, viewport.width - 16);
    const label = { ...c, width, x: Math.max(8, Math.min(c.x, viewport.width - width - 8)), y: Math.max(8, Math.min(c.y, viewport.height - c.height - 8)) };
    if (intersects(label, hud)) label.y = hud.y + hud.height + 8;
    if (label.y + label.height > viewport.height - 8 || [...placed, ...obstacles].some(p => intersects(label, p))) continue;
    placed.push(label);
  }
  return placed;
}
