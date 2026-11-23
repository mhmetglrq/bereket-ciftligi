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
import { CoopPanel } from './ui/CoopPanel';
import { Quests } from './ui/Quests';
import { Settings, ResetConfirmation } from './ui/Settings';
import { AwaySummary } from './ui/AwaySummary';
import { TitleScreen } from './ui/TitleScreen';
import { PauseMenu } from './ui/PauseMenu';
import { FieldList } from './ui/FieldList';
import { Toasts } from './ui/Toasts';
import { TabConflict } from './ui/TabConflict';
import { Modal } from './ui/Modal';
import { tr } from './i18n/tr';
import { BuildingPanel } from './ui/BuildingPanel';
import { OrderBoard } from './ui/OrderBoard';
import { DailyReward } from './ui/DailyReward';

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

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = (event: MediaQueryListEvent): void =>
      useGame.setState({ reducedMotion: event.matches });
    const pause = (): void => {
      const state = useGame.getState();
      if (state.phase === 'playing' && !state.panel && !state.away) state.setPanel('pause');
    };
    const visibility = (): void => {
      if (document.visibilityState === 'hidden') pause();
    };
    query.addEventListener('change', change);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      query.removeEventListener('change', change);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
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
      {phase === 'playing' && !conflict && (
        away ? (
          <Modal key="away" title={tr.away} onClose={() => useGame.setState({ away: null })}>
            <AwaySummary />
          </Modal>
        ) : panel ? (
          <Modal key={panel} title={title} onClose={close}>
            {(panel === 'mill' || panel === 'bakery') && <BuildingPanel id={panel} />}
            {panel === 'orders' && <OrderBoard />}
            {panel === 'daily' && <DailyReward />}
            {panel === 'market' && <Market />}
            {panel === 'coop' && <CoopPanel />}
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
