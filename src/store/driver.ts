import { advanceClock, isClockRunning } from '../sim/time';
import { isRipe } from '../sim/crops';
import { advance } from '../sim/production';
import { useGame } from './game';
let accumulator = 0;
let frameAccumulator = 0;
const FIXED_STEP = 1 / 60;
export function stepDriver(delta: number): void {
  const s = useGame.getState();
  if (isClockRunning(s) && s.mayWrite()) {
    frameAccumulator += Math.max(0, Math.min(delta, 0.1));
    let minutes = 0;
    while (frameAccumulator + 1e-9 >= FIXED_STEP) {
      const tick = advanceClock(accumulator, FIXED_STEP);
      accumulator = tick.accumulator;
      minutes += tick.minutes;
      frameAccumulator = Math.max(0, frameAccumulator - FIXED_STEP);
    }
    if (minutes) {
      const minute = Math.min(1560, s.game.minute + minutes);
      const game = advance({ ...s.game, minute, elapsedMinutes: s.game.elapsedMinutes + minutes }, 0);
      useGame.setState({ game, now: game.elapsedMinutes, ripeIds: game.cells.filter(c => isRipe(c, 0)).map(c => c.id) });
      if (minute === 1440) s.notify('Geç oldu, eve dön!');
      if (minute === 1560) { accumulator = 0; useGame.getState().sleep(true); }
      s.requestSave();
    }
  }
  const wall = Date.now(), latest = useGame.getState();
  if (latest.toasts.some(t => t.expiresAt <= wall) || latest.floaters.some(t => t.expiresAt <= wall)) useGame.setState({ toasts: latest.toasts.filter(t => t.expiresAt > wall), floaters: latest.floaters.filter(t => t.expiresAt > wall) });
}
export function startDriver(): () => void {
  accumulator = 0;
  frameAccumulator = 0;
  const visibility = () => useGame.setState({ hidden: document.hidden });
  const blur = () => useGame.setState({ blurred: true });
  const focus = () => useGame.setState({ blurred: false });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  visibility();
  return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus); };
}
