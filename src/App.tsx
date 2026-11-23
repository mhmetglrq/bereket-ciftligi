import { useEffect } from 'react';
import { initializeGame, useGame } from './store/game';
import { startDriver } from './store/driver';
import { startAutosave } from './store/autosave';
import { bindKeys } from './input/keys';
import { FarmScene } from './scene/FarmScene';
import { Hud } from './ui/Hud';
import { Toolbar } from './ui/Toolbar';
import { CellInfo } from './ui/CellInfo';
import { Market } from './ui/Market';
import { Quests } from './ui/Quests';
import { Settings, ResetConfirmation } from './ui/Settings';
import { AwaySummary } from './ui/AwaySummary';
import { TitleScreen } from './ui/TitleScreen';
import { PauseMenu } from './ui/PauseMenu';
import { FieldList } from './ui/FieldList';
import { Toasts } from './ui/Toasts';
import { Floaters } from './ui/Floaters';
import { TabConflict } from './ui/TabConflict';
import { Modal } from './ui/Modal';
import { tr } from './i18n/tr';

export default function App() {
  const phase = useGame(state => state.phase);
  const panel = useGame(state => state.panel);
  const away = useGame(state => state.away);
  const reduced = useGame(state => state.reducedMotion);
  const conflict = useGame(state => state.conflict);

  useEffect(() => {
    let disposed = false;
    let cleanups: Array<() => void> = [];
    void initializeGame().then(() => {
      if (!disposed) cleanups = [startDriver(), startAutosave(), bindKeys()];
    });
    return () => {
      disposed = true;
      cleanups.forEach(cleanup => cleanup());
    };
  }, []);

  const close = (): void => useGame.getState().setPanel(null);
  const title = panel === 'pause' ? tr.pauseTitle
    : panel === 'reset' ? tr.resetTitle
    : panel === 'field' ? tr.fieldList
    : panel ? tr[panel] : '';

  return (
    <div className={`app ${reduced ? 'reduced-motion' : ''}`}>
      <div id="game-content">
        <FarmScene />
        {phase !== 'playing' ? <TitleScreen /> : (
          <div className="overlay">
            <Hud />
            <CellInfo />
            <Toolbar />
          </div>
        )}
      </div>
      <TabConflict />
      <Toasts />
      <Floaters />
      {phase === 'playing' && !conflict && (
        away ? (
          <Modal key="away" title={tr.away} onClose={() => useGame.setState({ away: null })}>
            <AwaySummary />
          </Modal>
        ) : panel ? (
          <Modal key={panel} title={title} onClose={close}>
            {panel === 'market' && <Market />}
            {panel === 'quests' && <Quests />}
            {panel === 'settings' && <Settings />}
            {panel === 'reset' && <ResetConfirmation />}
            {panel === 'pause' && <PauseMenu />}
            {panel === 'field' && <FieldList />}
          </Modal>
        ) : null
      )}
    </div>
  );
}
