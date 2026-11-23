import { useGame } from '../store/game';
import { tr } from '../i18n/tr';

export function PauseMenu() {
  return (
    <div className="pause-content">
      <span className="pause-art" aria-hidden="true">☕</span>
      <p>{tr.pauseText}</p>
      <button className="primary" onClick={() => useGame.getState().setPanel(null)}>{tr.resume}</button>
    </div>
  );
}
