import { useGame } from '../store/game';
import { DAILY_REWARDS, localDateKey, nextRewardDay } from '../sim/daily';
import { formatNumber } from '../sim/format';
import { tr } from '../i18n/tr';
export function DailyReward() {
  const game = useGame(s => s.game), now = useGame(s => s.now), dispatch = useGame(s => s.dispatch);
  const readonly = useGame(s => s.readonly || s.conflict);
  const claimed = game.daily.date > localDateKey(now) || !!game.daily.lastClaim && game.daily.lastClaim >= localDateKey(now);
  const day = claimed ? game.daily.streak : nextRewardDay(game, now);
  return <div className="feature-content"><p>{tr.dailyIntro}</p><div className="daily-calendar">
    {DAILY_REWARDS.map((gold, index) => <article key={index} className={`feature-card ${index + 1 === day ? 'today' : ''} ${index + 1 < day || claimed && index + 1 === day ? 'claimed' : ''}`}>
      <h3>{index + 1}. {tr.days}</h3>{index + 1 === day && <span className="reward-line">{tr.today}</span>}
      {index === 6 ? <><strong>🐔 {tr.chickenReward}</strong><small>{tr.chickenAlternative}</small></> : <><strong>{formatNumber(gold)} {tr.gold}</strong><small>{formatNumber((index + 1) * 2)} {tr.crops.wheat} {tr.seeds.toLocaleLowerCase('tr-TR')}</small></>}
      {(index + 1 < day || claimed && index + 1 === day) && <span>✓</span>}
    </article>)}
  </div><button className="primary" disabled={readonly || claimed} onClick={() => dispatch({ type: 'claimDaily' })}>{claimed ? tr.claimed : tr.claim}</button></div>;
}
