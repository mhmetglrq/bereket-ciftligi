import { useGame } from '../store/game';
import { CROPS } from '../sim/data';
import { tr } from '../i18n/tr';
import { useLayoutEffect } from 'react';

export function Toasts() {
  const toasts = useGame(state => state.toasts);
  const phase = useGame(state => state.phase);
  const editing = useGame(state => state.editMode);
  useLayoutEffect(() => {
    const hud = document.querySelector('.hud, .edit-bar');
    const update = (): void => {
      const parts = document.querySelectorAll('.hud, .hud .nav, .hud .world-status, .edit-bar');
      const bottom = Array.from(parts).reduce((max, part) => Math.max(max, part.getBoundingClientRect().bottom), 0);
      document.documentElement.style.setProperty('--hud-bottom', `${bottom}px`);
    };
    const observer = new ResizeObserver(update);
    if (hud) observer.observe(hud);
    window.addEventListener('resize', update); update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [phase, editing]);
  return (
    <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map(item => (
        <button className={`toast panel ${item.kind === 'level' ? 'level-toast' : ''}`} key={item.id} onClick={() => useGame.setState(state => ({ toasts: state.toasts.filter(t => t.id !== item.id) }))}>
          {item.kind === 'level' ? <strong>{item.text}</strong> : item.text}
          {item.unlocks?.map(id => (
            <p key={id}>{CROPS[id].icon} {tr.crops[id]} {tr.seedUnlocked}</p>
          ))}
        </button>
      ))}
    </div>
  );
}
