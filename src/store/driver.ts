import { DRIVER_MS } from '../sim/data';
import { isRipe } from '../sim/crops';
import { advanceOffline } from '../sim/offline';
import { settleCoop } from '../sim/coop';
import { useGame } from './game';

export function startDriver(): () => void {
  let raf = 0;
  let lastFrame = performance.now();
  let lastWall = useGame.getState().now;

  const frame = (time: number): void => {
    const current = useGame.getState();
    const now = Date.now();
    if (time - lastFrame >= DRIVER_MS) {
      lastFrame = time;
      const baseline = Math.max(lastWall, current.game.savedAt);
      const game = now < baseline
        ? advanceOffline({ ...current.game, savedAt: baseline }, now).state
        : settleCoop(current.game, now);
      lastWall = now;
      useGame.setState({
        now,
        game,
        ripeIds: game.cells.filter(cell => isRipe(cell, now)).map(cell => cell.id)
      });
      if (game !== current.game && current.mayWrite()) {
        useGame.setState({ saveStatus: 'saving' });
        current.requestSave();
      }
    }
    const latest = useGame.getState();
    if (latest.toasts.some(item => item.expiresAt <= now) ||
      latest.floaters.some(item => item.expiresAt <= now)) {
      useGame.setState({
        toasts: latest.toasts.filter(item => item.expiresAt > now),
        floaters: latest.floaters.filter(item => item.expiresAt > now)
      });
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
