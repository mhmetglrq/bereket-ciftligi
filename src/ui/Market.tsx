import { CROP_IDS, CROPS, EXPANSION_COST } from '../sim/data';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { duration, number } from '../i18n/format';

export function Market() {
  const game = useGame(state => state.game);
  const dispatch = useGame(state => state.dispatch);
  const empty = CROP_IDS.every(id => game.produce[id] === 0);
  return (
    <div className="market-content">
      <section>
        <h3>{tr.buy}</h3>
        <div className="crop-cards">
          {CROP_IDS.map(id => (
            <article className="crop-card" key={id}>
              <span className={`crop-art ${id}`} aria-hidden="true">{CROPS[id].icon}</span>
              <div className="crop-title"><h4>{tr.crops[id]}</h4><span>{tr.seeds}: {number(game.seeds[id])}</span></div>
              <p className="muted">{tr.growTime}: {duration(CROPS[id].growMs)} · {tr.price}: {number(CROPS[id].salePrice)} ◉</p>
              <div className="button-row">
                <button disabled={game.gold < CROPS[id].seedCost} onClick={() => dispatch({ type: 'buySeed', cropId: id, amount: 1 })}>
                  {tr.buyOne}<small>{number(CROPS[id].seedCost)} ◉</small>
                </button>
                <button disabled={game.gold < CROPS[id].seedCost * 5} onClick={() => dispatch({ type: 'buySeed', cropId: id, amount: 5 })}>
                  {tr.buyFive}<small>{number(CROPS[id].seedCost * 5)} ◉</small>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h3>{tr.sell} <span className="muted">· {tr.inventory}</span></h3>
        {empty && <p className="empty">{tr.emptyInventory}</p>}
        {CROP_IDS.map(id => (
          <div className="inventory-row" key={id}>
            <span>{CROPS[id].icon} {tr.crops[id]} <b>× {number(game.produce[id])}</b></span>
            <div className="button-row">
              <button disabled={game.produce[id] === 0} onClick={() => dispatch({ type: 'sell', cropId: id, amount: 1 })}>{tr.sellOne}</button>
              <button disabled={game.produce[id] === 0} onClick={() => dispatch({ type: 'sell', cropId: id, amount: 'all' })}>{tr.sellAll}</button>
            </div>
          </div>
        ))}
      </section>
      <section className="expansion-card">
        <div><h3>{tr.expansion}</h3><p>{tr.expansionText}</p></div>
        {game.gridSize === 8 ? <strong>✓ {tr.expanded}</strong> : (
          <>
            <button className="primary" disabled={game.gold < EXPANSION_COST} onClick={() => dispatch({ type: 'expand' })}>
              {tr.expand} · {number(EXPANSION_COST)} ◉
            </button>
            {game.gold < EXPANSION_COST && <small>{tr.missing}: {number(EXPANSION_COST - game.gold)} ◉</small>}
          </>
        )}
      </section>
    </div>
  );
}
