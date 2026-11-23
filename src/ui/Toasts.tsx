import { useGame } from '../store/game';

export function Toasts() {
  const toasts = useGame(state => state.toasts);
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map(item => <div className="toast panel" key={item.id}>{item.text}</div>)}
    </div>
  );
}
