import { useGame } from '../store/game';
import { canAfford, getStock } from '../sim/inventory';
import { formatDuration, formatNumber } from '../sim/format';
import type { ItemId } from '../sim/types';
import { tr } from '../i18n/tr';
export function OrderBoard() {
  const game = useGame(s => s.game), now = useGame(s => s.now), dispatch = useGame(s => s.dispatch);
  const readonly = useGame(s => s.readonly || s.conflict);
  return <div className="order-grid">{game.orders.map((slot, index) => <article className="feature-card" key={index}>
    {slot.order ? <>
      {Object.entries(slot.order.items).map(([id, qty]) => <p className={getStock(game, id as ItemId) < qty ? 'shortage' : ''} key={id}>{tr.items[id as ItemId]} · {formatNumber(getStock(game, id as ItemId))}/{formatNumber(qty)}</p>)}
      <strong className="reward-line">{formatNumber(slot.order.gold)} {tr.gold} · {formatNumber(slot.order.xp)} {tr.xp}</strong>
      <button className="primary" disabled={readonly || !canAfford(game, slot.order.items)} onClick={() => dispatch({ type: 'deliverOrder', slot: index })}>{tr.deliver}</button>
      <button disabled={readonly} onClick={() => dispatch({ type: 'rejectOrder', slot: index })}>{tr.reject}</button>
    </> : <p className="muted">{tr.newOrder} {formatDuration(slot.refillAt - now)} {tr.within}</p>}
  </article>)}</div>;
}
