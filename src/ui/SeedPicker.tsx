import { CROP_IDS, CROPS } from '../sim/data';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';

export function SeedPicker() {
  const seed = useGame(state => state.seed);
  const seeds = useGame(state => state.game.seeds);
  const empty = CROP_IDS.every(id => seeds[id] === 0);
  return (
    <div className="seed-picker">
      <span className="small-label">{tr.seedChoice}</span>
      <div className="seed-options" role="group" aria-label={tr.seedChoice}>
        {CROP_IDS.map(id => (
          <button
            key={id}
            aria-pressed={seed === id}
            disabled={seeds[id] === 0}
            onClick={() => useGame.setState({ seed: id })}
          >
            <span aria-hidden="true">{CROPS[id].icon}</span>
            {tr.crops[id]} <strong>{number(seeds[id])}</strong>
          </button>
        ))}
        <button className="seed-market" onClick={() => useGame.getState().setPanel('market')}>
          {tr.goMarket}
        </button>
      </div>
      {empty && <p className="empty compact">{tr.emptySeeds}</p>}
    </div>
  );
}
