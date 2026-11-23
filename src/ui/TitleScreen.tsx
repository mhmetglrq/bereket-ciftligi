import { unlockAudio } from '../audio/sfx';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';

export function TitleScreen() {
  const phase = useGame(state => state.phase);
  return (
    <div className="title-screen">
      <main className="title-card panel">
        <div className="title-emblem" aria-hidden="true">🌾</div>
        <p className="eyebrow">{tr.eyebrow}</p>
        <h1>{tr.title}</h1>
        <h2>{tr.subtitle}</h2>
        <p>{tr.intro}</p>
        <button className="primary start-button" disabled={phase === 'loading'} onClick={() => {
          unlockAudio();
          useGame.setState({ phase: 'playing' });
        }}>{phase === 'loading' ? tr.loading : tr.start}</button>
        <small>{tr.saveHint}</small>
      </main>
    </div>
  );
}
