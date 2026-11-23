import { DRIVER_MS } from '../sim/data';
import { isRipe } from '../sim/crops';
import { advanceOffline } from '../sim/offline';
import { useGame } from './game';

export function startDriver(): () => void {
  let raf = 0;
  let lastFrame = performance.now();
  let lastWall = useGame.getState().now;

  const frame = (time: number): void => {
    const current = useGame.getState();
    if (time - lastFrame >= DRIVER_MS && current.panel !== 'pause') {
      lastFrame = time;
      const now = Date.now();
      const game = now < lastWall
        ? advanceOffline({ ...current.game, savedAt: lastWall }, now).state
        : current.game;
      lastWall = now;
      useGame.setState({
        now,
        game,
        ripeIds: game.cells.filter(cell => isRipe(cell, now)).map(cell => cell.id),
        toasts: current.toasts.filter(item => item.expiresAt > now),
        floaters: current.floaters.filter(item => item.expiresAt > now)
      });
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
