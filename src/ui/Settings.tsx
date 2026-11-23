import { setMuted } from '../audio/sfx';
import { newGame } from '../sim/grid';
import { getStorage, useGame } from '../store/game';
import { tr } from '../i18n/tr';

export function Settings() {
  const muted = useGame(state => state.muted);
  const reduced = useGame(state => state.reducedMotion);
  const mode = useGame(state => state.storageMode);
  return (
    <div className="settings-content">
      <label className="setting-row">
        <span>{tr.sound}</span>
        <input type="checkbox" checked={!muted} onChange={event => {
          const value = !event.target.checked;
          useGame.setState({ muted: value });
          setMuted(value);
        }} />
      </label>
      <label className="setting-row">
        <span>{tr.reducedMotion}</span>
        <input type="checkbox" checked={reduced} onChange={event => useGame.setState({ reducedMotion: event.target.checked })} />
      </label>
      <p className="muted">{tr.saveHint}</p>
      {mode !== 'local' && <p role="status">{mode === 'idb' ? tr.fallback : tr.memory}</p>}
      <p className="muted">{tr.keyHint}</p>
      <button className="danger" disabled={!useGame.getState().mayWrite()} onClick={() => useGame.getState().setPanel('reset')}>{tr.reset}</button>
    </div>
  );
}

export function ResetConfirmation() {
  const confirm = async (): Promise<void> => {
    const current = useGame.getState();
    if (!current.mayWrite()) return;
    // Update state first. Any in-flight fallback write can only be followed by
    // this newer state through the autosave revision mechanism.
    const now = Date.now();
    useGame.setState({
      game: newGame(now),
      now,
      selected: null,
      tool: null,
      panel: null,
      away: null,
      floaters: [],
      ripeIds: [],
      sceneEpoch: current.sceneEpoch + 1
    });
    current.requestSave();
    try {
      if (useGame.getState().mayWrite()) await getStorage().remove();
    } catch {
      // The next save replaces the old value even if remove is unavailable.
    }
    useGame.getState().requestSave();
    useGame.getState().notify(tr.resetDone);
  };
  return (
    <div className="settings-content">
      <p>{tr.resetText}</p>
      <div className="button-row">
        <button onClick={() => useGame.getState().setPanel('settings')}>{tr.cancel}</button>
        <button className="danger" onClick={() => { void confirm(); }}>{tr.resetConfirm}</button>
      </div>
    </div>
  );
}
