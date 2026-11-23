import { QUESTS } from '../sim/data';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';

export function Quests() {
  const quests = useGame(state => state.game.quests);
  const dispatch = useGame(state => state.dispatch);
  const allClaimed = QUESTS.every(quest => quests[quest.id].status === 'claimed');
  return (
    <div className="quest-list">
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
            <button className={progress.status === 'complete' ? 'primary' : ''} disabled={progress.status !== 'complete'} onClick={() => dispatch({ type: 'claim', questId: quest.id })}>
              {progress.status === 'claimed' ? tr.claimed : tr.claim}
            </button>
          </article>
        );
      })}
    </div>
  );
}
