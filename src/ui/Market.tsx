import { CROP_IDS, CROPS, COOP_COST, EXPANSION_COST, BUILDINGS, TREES } from '../sim/data';
import { isUnlocked, levelOf } from '../sim/xp';
import { inSeason } from '../sim/seasons';
import { FOOD } from '../sim/energy';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';

export function Market() {
  const game = useGame(state => state.game);
  const dispatch = useGame(state => state.dispatch);
  const readonly = useGame(state => state.readonly || state.conflict);
  const selected = useGame(state => state.selected);
  const cell = game.cells.find(c => c.id === selected);
  return (
    <div className="market-content">
      {readonly && <p className="empty">{tr.readonly}</p>}
      <section><h3>{tr.buildings}</h3><div className="recipe-grid">{(['mill', 'bakery'] as const).map(id => <article className="feature-card" key={id}>
        <h4>{tr[id]}</h4><p>{number(BUILDINGS[id].cost)} {tr.gold} · {tr.level} {BUILDINGS[id].level}</p>
        {game.buildings[id].owned ? <><strong>{tr.owned}</strong><button onClick={() => useGame.getState().setPanel(id)}>{tr.production}</button></> : <button className="primary" disabled={readonly || game.gold < BUILDINGS[id].cost || levelOf(game.xp) < BUILDINGS[id].level} onClick={() => dispatch({ type: 'buyBuilding', buildingId: id })}>{tr.buyItem}</button>}
      </article>)}</div></section>
      <section><h3>{tr.trees}</h3><div className="recipe-grid">{(['apple', 'cherry'] as const).map(id => <article className="feature-card" key={id}>
        <h4>{tr.treeNames[id]}</h4><p>{number(TREES[id].cost)} {tr.gold} · {tr.level} {TREES[id].level}</p>
        <button disabled={readonly || !cell || (cell.kind !== 'tilled' && cell.kind !== 'untilled') || game.gold < TREES[id].cost || levelOf(game.xp) < TREES[id].level} onClick={() => { if (cell) dispatch({ type: 'plantTree', treeId: id, cellId: cell.id }); }}>{tr.plantTree}</button>
        {(!cell || cell.kind === 'tree' || cell.kind === 'planted') && <small>{tr.selectEmpty}</small>}
      </article>)}</div></section>
      <section><h3>Enerji veren yiyecekler</h3><div className="recipe-grid">{(['bread', 'cake'] as const).map(id => <article className="feature-card" key={id}><h4>{tr.items[id]}</h4><p>+{FOOD[id].energy} enerji · {FOOD[id].cost} altın</p><p>Ambar: {game.goods[id]}</p><button disabled={readonly || game.gold < FOOD[id].cost} onClick={() => dispatch({ type: 'buyFood', itemId: id })}>Satın al</button><button disabled={readonly || !game.goods[id] || game.energy === 270} onClick={() => useGame.getState().eat(id)}>Ye</button></article>)}</div></section>
      <section>
        <h3>{tr.buy}</h3>{game.season === 'winter' && <p className="empty">Kışın tarlaya ekin ekilmez</p>}
        <div className="crop-cards">
          {CROP_IDS.filter(id => inSeason(id, game.season)).map(id => {
            const locked = !isUnlocked(id, game.xp);
            return (
              <article className={`crop-card ${locked ? 'locked' : ''}`} key={id}>
                {locked && <span className="locked-badge">🔒 {tr.level} {CROPS[id].level}</span>}
                <span className={`crop-art ${id}`} aria-hidden="true">{CROPS[id].icon}</span>
                <div className="crop-title"><h4>{tr.crops[id]}</h4><span>{tr.seeds}: {number(game.seeds[id])}</span></div>
                <p className="muted">{tr.growTime}: {CROPS[id].days} gün · {tr.price}: {number(CROPS[id].salePrice)} ◉</p>
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
