import { useGame } from '../store/game';
import { CROPS } from '../sim/data';
import { tr } from '../i18n/tr';

export function Toasts() {
  const toasts = useGame(state => state.toasts);
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map(item => (
        <div className={`toast panel ${item.kind === 'level' ? 'level-toast' : ''}`} key={item.id}>
          {item.kind === 'level' ? <strong>{item.text}</strong> : item.text}
          {item.unlocks?.map(id => (
            <p key={id}>{CROPS[id].icon} {tr.crops[id]} {tr.seedUnlocked}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
