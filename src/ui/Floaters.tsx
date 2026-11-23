import { useGame } from '../store/game';

export function Floaters() {
  const floaters = useGame(state => state.floaters);
  const reduced = useGame(state => state.reducedMotion);
  const blocked = useGame(state => state.panel !== null || state.away !== null || state.conflict);
  if (blocked) return null;
  return (
    <div className={`floaters ${reduced ? 'static' : ''}`} aria-live="polite">
      {floaters.slice(-5).map((item, index) => (
        <span key={`${item.id}:${item.expiresAt}`}
          style={{ bottom: `${index * 42}px`, animationDuration: `${item.duration}ms` }}
          className={`floater ${item.kind === 'warning' ? 'warning' : ''}`}>
          {item.text}
        </span>
      ))}
    </div>
  );
}
