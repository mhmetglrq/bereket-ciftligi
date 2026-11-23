export const START_MINUTE = 360;
export const END_MINUTE = 1560;
export interface ClockUI { phase: string; paused?: boolean; panel?: string | null; editMode: boolean; hidden: boolean; blurred: boolean; modalQueue: readonly unknown[]; conflict?: boolean }
export const isClockRunning = (ui: ClockUI): boolean => ui.phase === 'playing' && !ui.paused && !ui.panel && !ui.editMode && !ui.hidden && !ui.blurred && !ui.conflict && ui.modalQueue.length === 0;
export const formatTime = (minute: number): string => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function advanceClock(accumulator: number, delta: number): { accumulator: number; minutes: number } {
  const total = accumulator + Math.max(0, Math.min(delta, 0.1));
  const steps = Math.floor((total + 1e-9) / 7);
  return { accumulator: Math.max(0, total - steps * 7), minutes: steps * 10 };
}
