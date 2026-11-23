import { CROP_IDS, CROPS } from '../sim/data';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { duration, number } from '../i18n/format';

export function AwaySummary() {
  const away = useGame(state => state.away);
  if (!away) return null;
  const total = CROP_IDS.reduce((sum, id) => sum + away.ripened[id], 0);
  return (
    <div className="away-content" role="status" aria-live="polite">
      <div className="away-art" aria-hidden="true">☀ 🌾</div>
      <p>{tr.awayText}</p>
      <p className="muted">{tr.elapsed}: {duration(away.elapsedMs)}</p>
      {total === 0 && away.eggs === 0 && <p className="empty">{tr.awayNone}</p>}
      <div className="away-counts">
        {CROP_IDS.filter(id => away.ripened[id] > 0).map(id => (
          <div key={id}><span>{CROPS[id].icon}</span><strong>{number(away.ripened[id])}</strong><span>{tr.crops[id]} · {tr.awayRipe}</span></div>
        ))}
        {away.eggs > 0 && <div><span aria-hidden="true">🥚</span><strong>{number(away.eggs)} {tr.eggs}</strong></div>}
        {away.hungry > 0 && <div className="hungry-tile"><span aria-hidden="true">🐔</span><strong>{number(away.hungry)} {tr.hungryChickens}</strong></div>}
      </div>
      {away.capped && <p>{tr.awayCap}</p>}
      <button className="primary" onClick={() => useGame.setState({ away: null })}>{tr.done}</button>
    </div>
  );
}
