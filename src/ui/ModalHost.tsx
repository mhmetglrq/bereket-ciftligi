import { useGame } from '../store/game';
import { Modal } from './Modal';
import { PassOut } from './PassOut';
import { ShipmentSummary } from './ShipmentSummary';
import { V4Intro } from './V4Intro';
import { DailyReward } from './DailyReward';
export function ModalHost() {
  const modal = useGame(s => s.modalQueue[0]), close = useGame(s => s.closeQueuedModal);
  if (!modal) return null;
  const title = modal.type === 'passOut' ? 'Bayıldın' : modal.type === 'shipment' ? 'Dünkü satışlar' : modal.type === 'intro' ? 'Çiftlikte yeni bir dönem' : 'Günlük ödül';
  return <Modal title={title} onClose={close}>
    {modal.type === 'passOut' && <PassOut penalty={modal.penalty} />}
    {modal.type === 'shipment' && <ShipmentSummary shipment={modal.shipment} />}
    {modal.type === 'intro' && <V4Intro />}
    {modal.type === 'daily' && <DailyReward />}
    <button className="primary" onClick={close}>Devam et</button>
  </Modal>;
}
