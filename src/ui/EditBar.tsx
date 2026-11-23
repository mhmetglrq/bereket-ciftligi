import { useGame } from '../store/game';
export function EditBar() {
  const commit = useGame(s => s.commitEdit), cancel = useGame(s => s.cancelEdit);
  return <header className="edit-bar panel"><strong>Çiftliği düzenle</strong><p>Sürükleyerek taşı · Dokunmatikte uzun bas</p><button className="primary" onClick={commit}>Bitti</button><button onClick={cancel}>Vazgeç</button></header>;
}
