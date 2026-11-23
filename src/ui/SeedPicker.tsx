import { CROP_IDS, CROPS } from '../sim/data';
import { isUnlocked } from '../sim/xp';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';
import { inSeason } from '../sim/seasons';

export function SeedPicker() {
  const seed = useGame(state => state.seed);
  const season = useGame(state => state.game.season);
  const seeds = useGame(state => state.game.seeds);
  const xp = useGame(state => state.game.xp);
  const unlocks = useGame(state => [...state.toasts].reverse().find(item => item.kind === 'level')?.unlocks);
  const empty = CROP_IDS.every(id => seeds[id] === 0);
  return (
    <div className="seed-picker">
      <span className="small-label">{tr.seedChoice}</span>
      <div className="seed-options" role="group" aria-label={tr.seedChoice}>
        {CROP_IDS.filter(id => inSeason(id, season)).map(id => {
          const locked = !isUnlocked(id, xp);
          return (
            <button key={id} aria-pressed={seed === id}
              className={unlocks?.includes(id) ? 'seed-unlocked' : ''}
              disabled={locked || seeds[id] === 0}
              title={locked ? `${tr.level} ${CROPS[id].level}` : tr.crops[id]}
              onClick={() => useGame.setState({ seed: id })}>
              <span aria-hidden="true">{CROPS[id].icon}</span>
              {tr.crops[id]} <strong>{number(seeds[id])}</strong>
              {locked && <span className="locked-badge">🔒 {tr.level} {CROPS[id].level}</span>}
            </button>
          );
        })}
        <button className="seed-market" onClick={() => useGame.getState().setPanel('market')}>
          {tr.goMarket}
        </button>
      </div>
      {empty && <p className="empty compact">{tr.emptySeeds}</p>}
    </div>
  );
}
