import type { Shipment } from '../sim/shipping';
import type { ItemId } from '../sim/types';
import { itemPrice } from '../sim/inventory';
import { tr } from '../i18n/tr';
export function ShipmentSummary({ shipment }: { shipment: Shipment }) {
  return <div className="feature-content">{Object.entries(shipment.items).filter(([, n]) => n > 0).map(([id, n]) => <p key={id}>{tr.items[id as ItemId]} × {n} · {itemPrice(id as ItemId) * n} ◉</p>)}<strong>Toplam: {shipment.total} altın</strong></div>;
}
