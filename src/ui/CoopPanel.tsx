import { CHICKEN_COST, EGG_MS, MAX_CHICKENS } from '../sim/data';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';

export function CoopPanel() {
  const coop = useGame(state => state.game.coop);
  const wheat = useGame(state => state.game.produce.wheat);
  const gold = useGame(state => state.game.gold);
  const now = useGame(state => state.now);
  const readonly = useGame(state => state.readonly || state.conflict);
  const dispatch = useGame(state => state.dispatch);
  const hungry = coop.chickens.filter(chicken => chicken.fedAt === null).length;
  const feedCount = Math.min(wheat, hungry);
  const buy = () => dispatch({ type: 'buyChicken' });

  return (
    <div className="coop-content">
      <p className="muted">{tr.coopHint}</p>
      {readonly && <p className="empty">{tr.readonly}</p>}
      {!coop.owned ? <p className="empty">{tr.reasons.needCoop}</p> : (
        <>
          {coop.chickens.length === 0 && (
            <div className="coop-empty">
              <span aria-hidden="true">🐔</span>
              <h3>{tr.coopEmpty}</h3>
              <button className="primary" disabled={readonly || gold < CHICKEN_COST} onClick={buy}>
                {tr.chickenBuy} · {number(CHICKEN_COST)} ◉
              </button>
              {gold < CHICKEN_COST && <small>{tr.noGold}</small>}
            </div>
          )}
          <div className="chicken-slots">
            {Array.from({ length: MAX_CHICKENS }, (_, index) => {
              const chicken = coop.chickens[index];
              const elapsed = chicken?.fedAt === null || !chicken ? 0 :
                Math.max(0, Math.min(EGG_MS, now - chicken.fedAt));
              return (
                <article className="chicken-slot" key={chicken?.id ?? `empty-${index}`}>
                  <span className="chicken-art" aria-hidden="true">{chicken ? '🐔' : '＋'}</span>
                  {!chicken ? (
                    <>
                      <strong>{tr.slotEmpty}</strong>
                      <button disabled={readonly || gold < CHICKEN_COST} onClick={buy}>
                        {tr.chickenBuy} · {number(CHICKEN_COST)} ◉
                      </button>
                      {gold < CHICKEN_COST && <small>{tr.noGold}</small>}
                    </>
                  ) : chicken.fedAt === null ? (
                    <>
                      <span className="status-chip hungry">{tr.hungry}</span>
                      <button disabled={readonly || wheat === 0}
                        onClick={() => dispatch({ type: 'feed', chickenId: chicken.id })}>
                        {tr.feed} · 1 {tr.crops.wheat.toLocaleLowerCase('tr-TR')}
                      </button>
                      {wheat === 0 && <small>{tr.noWheat}</small>}
                    </>
                  ) : (
                    <>
                      <span className="chicken-timer" role="progressbar"
                        aria-label={tr.laying} aria-valuemin={0} aria-valuemax={60}
                        aria-valuenow={Math.floor(elapsed / 1000)}
                        style={{ background: `conic-gradient(var(--green) ${elapsed / EGG_MS * 360}deg, var(--xp-track) 0deg)` }}>
                        <span>🥚</span>
                      </span>
                      <span className="status-chip">
                        {tr.laying} · {number(Math.ceil((EGG_MS - elapsed) / 1000))} {tr.seconds}
                      </span>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          <p className="muted">🌾 {tr.inventory}: {number(wheat)} {tr.crops.wheat.toLocaleLowerCase('tr-TR')}</p>
          <div className="coop-actions">
            <button className="primary" disabled={readonly || feedCount === 0}
              onClick={() => dispatch({ type: 'feedAll' })}>
              {tr.feedAll} ({number(feedCount)} {tr.crops.wheat.toLocaleLowerCase('tr-TR')})
            </button>
            {feedCount === 0 && <small>{hungry === 0 ? tr.noHungry : tr.noWheat}</small>}
            <button className="primary" disabled={readonly || coop.pendingEggs === 0}
              onClick={() => dispatch({ type: 'collectEgg' })}>
              {tr.collect} ({number(coop.pendingEggs)})
            </button>
            {coop.pendingEggs === 0 && <small>{tr.noEggs}</small>}
          </div>
        </>
      )}
    </div>
  );
}
