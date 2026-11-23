import { CROP_IDS, CROPS, COOP_COST, EGG_PRICE, EXPANSION_COST } from '../sim/data';
import { isUnlocked } from '../sim/xp';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { duration, number } from '../i18n/format';

export function Market() {
  const game = useGame(state => state.game);
  const dispatch = useGame(state => state.dispatch);
  const readonly = useGame(state => state.readonly || state.conflict);
  const empty = CROP_IDS.every(id => game.produce[id] === 0) && game.eggs === 0;
  return (
    <div className="market-content">
      {readonly && <p className="empty">{tr.readonly}</p>}
      <section>
        <h3>{tr.buy}</h3>
        <div className="crop-cards">
          {CROP_IDS.map(id => {
            const locked = !isUnlocked(id, game.xp);
            return (
              <article className={`crop-card ${locked ? 'locked' : ''}`} key={id}>
                {locked && <span className="locked-badge">🔒 {tr.level} {CROPS[id].level}</span>}
                <span className={`crop-art ${id}`} aria-hidden="true">{CROPS[id].icon}</span>
                <div className="crop-title"><h4>{tr.crops[id]}</h4><span>{tr.seeds}: {number(game.seeds[id])}</span></div>
                <p className="muted">{tr.growTime}: {duration(CROPS[id].growMs)} · {tr.price}: {number(CROPS[id].salePrice)} ◉</p>
                <div className="button-row">
                  {([1, 5] as const).map(amount => (
                    <button key={amount}
                      disabled={readonly || locked || game.gold < CROPS[id].seedCost * amount}
                      onClick={() => dispatch({ type: 'buySeed', cropId: id, amount })}>
                      {amount === 1 ? tr.buyOne : tr.buyFive}
                      <small>{number(CROPS[id].seedCost * amount)} ◉</small>
                    </button>
                  ))}
                </div>
                {locked ? <small>{tr.level} {CROPS[id].level}</small> :
                  game.gold < CROPS[id].seedCost && <small>{tr.noGold}</small>}
              </article>
            );
          })}
        </div>
      </section>
      <section className="expansion-card">
        <h3>🐔 {tr.coop}</h3>
        <p>{tr.coopHint}</p>
        {game.coop.owned ? (
          <>
            <strong>{tr.coopOwned}</strong>
            <button onClick={() => useGame.getState().setPanel('coop')}>{tr.coop}</button>
          </>
        ) : (
          <>
            <button className="primary" disabled={readonly || game.gold < COOP_COST}
              onClick={() => dispatch({ type: 'buyCoop' })}>
              {tr.coopBuy} · {number(COOP_COST)} ◉
            </button>
            {game.gold < COOP_COST && <small>{tr.noGold}</small>}
          </>
        )}
      </section>
      <section>
        <h3>{tr.sell} <span className="muted">· {tr.inventory}</span></h3>
        {empty && <p className="empty">{tr.emptyInventory}</p>}
        {CROP_IDS.map(id => (
          <div className="inventory-row" key={id}>
            <span>{CROPS[id].icon} {tr.crops[id]} <b>× {number(game.produce[id])}</b></span>
            <div className="button-row">
              <button disabled={readonly || game.produce[id] === 0}
                onClick={() => dispatch({ type: 'sell', cropId: id, amount: 1 })}>{tr.sellOne}</button>
              <button disabled={readonly || game.produce[id] === 0}
                onClick={() => dispatch({ type: 'sell', cropId: id, amount: 'all' })}>{tr.sellAll}</button>
            </div>
          </div>
        ))}
      </section>
      <section>
        <h3>{tr.eggTitle}</h3>
        <div className="inventory-row">
          <span>🥚 {number(game.eggs)} {tr.eggs} · {number(EGG_PRICE)} ◉</span>
          <div className="button-row">
            <button disabled={readonly || game.eggs === 0}
              onClick={() => dispatch({ type: 'sellEgg', amount: 1 })}>{tr.sellOne}</button>
            <button disabled={readonly || game.eggs === 0}
              onClick={() => dispatch({ type: 'sellEgg', amount: 'all' })}>{tr.sellAll}</button>
          </div>
        </div>
      </section>
      <section className="expansion-card">
        <div><h3>{tr.expansion}</h3><p>{tr.expansionText}</p></div>
        {game.gridSize === 8 ? <strong>✓ {tr.expanded}</strong> : (
          <>
            <button className="primary" disabled={readonly || game.gold < EXPANSION_COST}
              onClick={() => dispatch({ type: 'expand' })}>
              {tr.expand} · {number(EXPANSION_COST)} ◉
            </button>
            {game.gold < EXPANSION_COST && <small>{tr.missing}: {number(EXPANSION_COST - game.gold)} ◉</small>}
          </>
        )}
      </section>
    </div>
  );
}
