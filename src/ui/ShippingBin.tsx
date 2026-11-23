import { useGame } from '../store/game';
import { ITEM_IDS, getStock, itemPrice } from '../sim/inventory';
import { tr } from '../i18n/tr';
export function ShippingBin() {
  const game = useGame(s => s.game), put = useGame(s => s.shipPut), take = useGame(s => s.shipTake);
  const readonly = useGame(s => !s.mayWrite());
  return <div className="feature-content"><p>Ürünlerini kutuya koy. Satış geliri sabah ödenir.</p>
    {!Object.values(game.shipping).some(n => n > 0) && <p className="empty">Kutu boş</p>}
    {ITEM_IDS.filter(id => getStock(game, id) || game.shipping[id]).map(id => <article className="feature-card" key={id}><strong>{tr.items[id]} · {itemPrice(id)} ◉</strong><p>Ambar: {getStock(game, id)} · Kutu: {game.shipping[id] ?? 0}</p><div className="button-row"><button disabled={readonly || !getStock(game, id)} onClick={() => put(id)}>1 koy</button><button disabled={readonly || !getStock(game, id)} onClick={() => put(id, getStock(game, id))}>Tümünü koy</button><button disabled={readonly || !game.shipping[id]} onClick={() => take(id)}>1 geri al</button></div></article>)}
  </div>;
}
