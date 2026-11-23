import { useGame } from '../store/game';
import { DAY_MS } from '../sim/data';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';

export function Hud() {
  const gold = useGame(state => state.game.gold);
  const size = useGame(state => state.game.gridSize);
  const quests = useGame(state => state.game.quests);
  const now = useGame(state => state.now);
  const createdAt = useGame(state => state.game.createdAt);
  const mode = useGame(state => state.storageMode);
  const saveStatus = useGame(state => state.saveStatus);
  const setPanel = useGame(state => state.setPanel);
  const count = Object.values(quests).filter(quest => quest.status === 'complete').length;
  const phase = ((now - createdAt) % DAY_MS + DAY_MS) % DAY_MS / DAY_MS;
  const period = phase < 0.12 ? tr.dawn : phase < 0.48 ? tr.day : phase < 0.62 ? tr.dusk : tr.night;

  return (
    <header className="hud">
      <div className="brand panel">
        <span className="brand-mark" aria-hidden="true">🌿</span>
        <div><h1>{tr.title}</h1><span className="muted">{tr.field} {number(size)} × {number(size)}</span></div>
      </div>
      <div className="hud-right">
        <div className="gold panel"><span aria-hidden="true">◉</span><strong>{number(gold)}</strong><span>{tr.gold}</span></div>
        <nav className="nav panel" aria-label={tr.title}>
          <button onClick={() => setPanel('market')}>🧺 <span>{tr.market}</span></button>
          <button onClick={() => setPanel('quests')}>📜 <span>{tr.quests}</span>{count > 0 && <b className="badge">{number(count)}</b>}</button>
          <button onClick={() => setPanel('settings')} aria-label={tr.settings}>⚙</button>
          <button onClick={() => setPanel('pause')} aria-label={tr.pause}>Ⅱ</button>
        </nav>
      </div>
      <div className="world-status panel">
        <span>{phase < 0.5 ? '☀' : '☾'} {period}</span>
        <span className="muted">{mode === 'memory' ? tr.memory : mode === 'idb' ? tr.fallback : tr[saveStatus]}</span>
      </div>
    </header>
  );
}
