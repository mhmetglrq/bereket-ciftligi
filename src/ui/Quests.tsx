import { QUESTS } from '../sim/data';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';
import { useState } from 'react';

export function Quests() {
  const [tab, setTab] = useState<'daily' | 'permanent'>('daily');
  const daily = useGame(state => state.game.daily);
  const readonly = useGame(state => state.readonly || state.conflict);
  const quests = useGame(state => state.game.quests);
  const dispatch = useGame(state => state.dispatch);
  const allClaimed = QUESTS.every(quest => quests[quest.id].status === 'claimed');
  return (
    <div className="quest-list">
      <div className="button-row" role="group" aria-label={tr.quests}><button aria-pressed={tab === 'daily'} onClick={() => setTab('daily')}>{tr.dailyQuests}</button><button aria-pressed={tab === 'permanent'} onClick={() => setTab('permanent')}>{tr.permanent}</button></div>
      {tab === 'daily' ? <>
        <p className="muted">Her oyun günü sabah yenilenir</p>
        {daily.quests.map(q => <article className="quest-card" key={q.id}><div className="quest-body"><h3>{tr.dailyTasks[q.event]}</h3><p>{number(q.gold)} {tr.gold} · {number(q.xp)} {tr.xp}</p><progress value={q.count} max={q.target} aria-label={tr.dailyTasks[q.event]} /><span>{number(q.count)}/{number(q.target)}</span></div><button disabled={readonly || q.claimed || q.count < q.target} onClick={() => dispatch({ type: 'claimDailyQuest', questId: q.id })}>{q.claimed ? tr.claimed : tr.claim}</button></article>)}
      </> : <>
      <p className="muted">{tr.questIntro}</p>
      {allClaimed && <p className="success-message">✦ {tr.allQuests}</p>}
      {QUESTS.map(quest => {
        const progress = quests[quest.id];
        return (
          <article className={`quest-card ${progress.status}`} key={quest.id}>
            <span className="quest-icon" aria-hidden="true">{progress.status === 'claimed' ? '✓' : '✦'}</span>
            <div className="quest-body">
              <h3>{tr.questNames[quest.id]}</h3>
              <p>{tr.reward}: <strong>{number(quest.reward)} ◉</strong></p>
              <progress value={progress.count} max={quest.target} aria-label={tr.questNames[quest.id]} />
              <span className="muted">{number(progress.count)} / {number(quest.target)}</span>
            </div>
            <button className={progress.status === 'complete' ? 'primary' : ''} disabled={readonly || progress.status !== 'complete'} onClick={() => dispatch({ type: 'claim', questId: quest.id })}>
              {progress.status === 'claimed' ? tr.claimed : tr.claim}
            </button>
          </article>
        );
      })}
      </>}
    </div>
  );
}
