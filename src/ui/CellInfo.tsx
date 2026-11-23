import { isRipe, remainingMs } from '../sim/crops';
import { CROPS } from '../sim/data';
import type { Cell } from '../sim/types';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { duration, number } from '../i18n/format';
import { SeedPicker } from './SeedPicker';

export function cellLabel(cell: Cell, now: number): string {
  const position = `${tr.cell} ${number(cell.x + 1)}, ${number(cell.y + 1)}`;
  if (cell.kind !== 'planted') return `${position}: ${tr[cell.kind]}`;
  return `${position}: ${tr.crops[cell.cropId]}, ${isRipe(cell, now) ? tr.ready : `${tr.growing} · ${duration(remainingMs(cell, now))}`}`;
}

export function NextAction({ cell }: { cell: Cell }) {
  const now = useGame(state => state.now);
  const seed = useGame(state => state.seed);
  const seeds = useGame(state => state.game.seeds);
  const dispatch = useGame(state => state.dispatch);
  if (cell.kind === 'untilled') {
    return <button className="primary" onClick={() => dispatch({ type: 'till', cellId: cell.id })}>{tr.toolIcons.till} {tr.tools.till}</button>;
  }
  if (cell.kind === 'tilled') {
    return (
      <>
        <SeedPicker />
        <button className="primary" disabled={seeds[seed] === 0} onClick={() => dispatch({ type: 'plant', cellId: cell.id, cropId: seed })}>
          {tr.toolIcons.plant} {tr.crops[seed]} · {tr.tools.plant}
        </button>
      </>
    );
  }
  return (
    <button className="primary" disabled={!isRipe(cell, now)} onClick={() => dispatch({ type: 'harvest', cellId: cell.id })}>
      {isRipe(cell, now) ? `${tr.toolIcons.harvest} ${tr.tools.harvest}` : `${tr.growing} · ${duration(remainingMs(cell, now))}`}
    </button>
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
      {!tool && <NextAction cell={cell} />}
    </aside>
  );
}
