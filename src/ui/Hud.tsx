import { useGame } from '../store/game';
import { DAY_MS } from '../sim/data';
import { xpProgress } from '../sim/xp';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';
import { canAfford } from '../sim/inventory';

export function Hud() {
  const orderCount = useGame(s => s.game.orders.filter(slot => slot.order && canAfford(s.game, slot.order.items)).length);
  const gold = useGame(state => state.game.gold);
  const xp = useGame(state => state.game.xp);
  const size = useGame(state => state.game.gridSize);
  const quests = useGame(state => state.game.quests);
  const coopOwned = useGame(state => state.game.coop.owned);
  const now = useGame(state => state.now);
  const createdAt = useGame(state => state.game.createdAt);
  const mode = useGame(state => state.storageMode);
  const saveStatus = useGame(state => state.saveStatus);
  const setPanel = useGame(state => state.setPanel);
  const reduced = useGame(state => state.reducedMotion);
  const celebration = useGame(state => [...state.toasts].reverse().find(item => item.kind === 'level'));
  const count = Object.values(quests).filter(quest => quest.status === 'complete').length;
  const phase = ((now - createdAt) % DAY_MS + DAY_MS) % DAY_MS / DAY_MS;
  const period = phase < 0.12 ? tr.dawn : phase < 0.48 ? tr.day : phase < 0.62 ? tr.dusk : tr.night;
  const progress = xpProgress(xp);
  const label = `${tr.levelShort} ${number(progress.level)} · ${number(progress.current)}/${number(progress.required)} ${tr.xp}`;

  return (
    <header className="hud">
      <div className="brand panel">
        <span className="brand-mark" aria-hidden="true">🌿</span>
        <div><h1>{tr.title}</h1><span className="muted">{tr.field} {number(size)} × {number(size)}</span></div>
      </div>
      <div className="hud-right">
        <div className="gold panel"><span aria-hidden="true">◉</span><strong>{number(gold)}</strong><span>{tr.gold}</span></div>
        <div className="level-chip panel" title={label} aria-label={label}>
          <strong className="level-disc">{tr.levelShort} {number(progress.level)}</strong>
          <span className="xp-numbers">{number(progress.current)}/{number(progress.required)} {tr.xp}</span>
          <div className="xp-track" role="progressbar" aria-label={label}
            aria-valuenow={progress.current} aria-valuemin={0} aria-valuemax={progress.required}>
            <span style={{ width: `${progress.current / progress.required * 100}%` }} />
          </div>
          {celebration && !reduced && (
            <span key={celebration.id} className="level-sparkles" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map(index => <i key={index} />)}
            </span>
          )}
        </div>
        <nav className="nav panel" aria-label={tr.title}>
          <button onClick={() => setPanel('orders')} aria-label={`${tr.orders} · ${number(orderCount)}`}>📋 <span>{tr.orders}</span>{orderCount > 0 && <b className="badge">{number(orderCount)}</b>}</button>
          <button onClick={() => setPanel('daily')} aria-label={tr.daily}>🎁</button>
          <button onClick={() => setPanel('market')}>🧺 <span>{tr.market}</span></button>
          {coopOwned && <button onClick={() => setPanel('coop')} aria-label={tr.coop}>🐔</button>}
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
