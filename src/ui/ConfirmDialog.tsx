import { Modal } from './Modal';
import { tr } from '../i18n/tr';
export function ConfirmDialog({ title, body, onConfirm, onClose }: { title: string; body: string; onConfirm: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><p>{body}</p><div className="button-row confirm-actions"><button onClick={onClose}>{tr.cancel}</button><button className="destructive" onClick={() => { onConfirm(); onClose(); }}>{tr.confirm}</button></div></Modal>;
}
