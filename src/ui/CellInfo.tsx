import { isRipe, isWatered, remainingMs } from '../sim/crops';
import { CROPS } from '../sim/data';
import { isUnlocked } from '../sim/xp';
import type { Cell } from '../sim/types';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { duration, number } from '../i18n/format';
import { SeedPicker } from './SeedPicker';

export function cellLabel(cell: Cell, now: number): string {
  const position = `${tr.cell} ${number(cell.x + 1)}, ${number(cell.y + 1)}`;
  if (cell.kind !== 'planted') return `${position}: ${tr[cell.kind]}`;
  const water = isWatered(cell, now) && cell.water
    ? ` · ${tr.watered} · ${tr.waterRemaining} ${duration(cell.water.until - now)}` : '';
  return `${position}: ${tr.crops[cell.cropId]}, ${isRipe(cell, now) ? tr.ready : `${tr.growing} · ${duration(remainingMs(cell, now))}`}${water}`;
}

export function NextAction({ cell }: { cell: Cell }) {
  const now = useGame(state => state.now);
  const seed = useGame(state => state.seed);
  const seeds = useGame(state => state.game.seeds);
  const xp = useGame(state => state.game.xp);
  const readonly = useGame(state => state.readonly || state.conflict);
  const dispatch = useGame(state => state.dispatch);
  if (cell.kind === 'untilled') {
    return <button className="primary" disabled={readonly}
      onClick={() => dispatch({ type: 'till', cellId: cell.id })}>{tr.toolIcons.till} {tr.tools.till}</button>;
  }
  if (cell.kind === 'tilled') {
    return (
      <>
        <SeedPicker />
        <button className="primary" disabled={readonly || seeds[seed] === 0 || !isUnlocked(seed, xp)}
          onClick={() => dispatch({ type: 'plant', cellId: cell.id, cropId: seed })}>
          {tr.toolIcons.plant} {tr.crops[seed]} · {tr.tools.plant}
        </button>
      </>
    );
  }
  const ripe = isRipe(cell, now);
  const watered = isWatered(cell, now);
  return (
    <>
      <button className="primary" disabled={readonly || !ripe}
        onClick={() => dispatch({ type: 'harvest', cellId: cell.id })}>
        {ripe ? `${tr.toolIcons.harvest} ${tr.tools.harvest}` :
          `${tr.growing} · ${duration(remainingMs(cell, now))}`}
      </button>
      {!ripe && (
        <>
          <button disabled={readonly || watered} title={tr.waterHint}
            onClick={() => dispatch({ type: 'water', cellId: cell.id })}>
            {tr.toolIcons.water} {watered ? tr.watered : tr.tools.water}
          </button>
          {watered && cell.kind === 'planted' && cell.water && <small>{tr.watered} · {tr.waterRemaining} {duration(cell.water.until - now)}</small>}
        </>
      )}
    </>
  );
}

export function CellInfo() {
  const cell = useGame(state => state.game.cells.find(item => item.id === state.selected));
  const now = useGame(state => state.now);
  const tool = useGame(state => state.tool);
  const shake = useGame(state => state.shake);
  const reduced = useGame(state => state.reducedMotion);
  if (!cell) return (
    <aside className="welcome-note panel">
      <span aria-hidden="true">🌱</span>
      <div><strong>{tr.subtitle}</strong><p>{tr.selectHint}</p></div>
    </aside>
  );
  return (
    <aside key={shake} className={`cell-info panel ${shake && !reduced ? 'shake' : ''}`}>
      <div className="cell-heading">
        <span className="cell-illustration" aria-hidden="true">{cell.kind === 'planted' ? CROPS[cell.cropId].icon : '🌱'}</span>
        <div><span className="small-label">{tr.cell} {number(cell.x + 1)}, {number(cell.y + 1)}</span>
          <h3>{cell.kind === 'planted' ? tr.crops[cell.cropId] : tr[cell.kind]}</h3>
        </div>
        <button className="icon-button" aria-label={tr.close} onClick={() => useGame.setState({ selected: null })}>×</button>
      </div>
      {cell.kind === 'planted' && <p className="muted">{isRipe(cell, now) ? `✦ ${tr.ready}` : `${tr.growing} · ${duration(remainingMs(cell, now))}`}</p>}
      {isWatered(cell, now) && cell.kind === 'planted' && cell.water && (
        <p className="water-info">💧 {tr.watered} · {tr.waterRemaining} {duration(cell.water.until - now)}</p>
      )}
      {!tool && <NextAction cell={cell} />}
    </aside>
  );
}
