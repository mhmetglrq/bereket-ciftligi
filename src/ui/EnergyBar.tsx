import { useGame } from '../store/game';
export function EnergyBar() {
  const energy = useGame(s => s.game.energy);
  const color = energy > 135 ? 'var(--green)' : energy >= 54 ? 'var(--gold)' : 'var(--warn)';
  return <div className="energy-bar"><span>Enerji {energy}/270</span><div role="progressbar" aria-label="Enerji" aria-valuenow={energy} aria-valuemin={0} aria-valuemax={270}><span style={{ width: `${energy / 270 * 100}%`, background: color }} /></div></div>;
}
