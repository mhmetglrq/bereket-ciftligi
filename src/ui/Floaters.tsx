import { useGame } from '../store/game';

export function Floaters() {
  const floaters = useGame(state => state.floaters);
  const reduced = useGame(state => state.reducedMotion);
  return (
    <div className={`floaters ${reduced ? 'static' : ''}`} aria-live="polite">
      {floaters.slice(-5).map((item, index) => (
        <span key={item.id} style={{ bottom: `${index * 42}px` }} className="floater">{item.text}</span>
      ))}
    </div>
  );
}
