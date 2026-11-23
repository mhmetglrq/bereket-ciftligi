import { isRipe, isWatered, remainingMs } from '../sim/crops';
import { CROPS } from '../sim/data';
import type { Cell } from '../sim/types';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { SeedPicker } from './SeedPicker';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export function cellLabel(cell: Cell, minute: number): string {
  const position = `Hücre ${cell.x + 1}, ${cell.y + 1}`;
  if (cell.kind === 'tree') return `${position}: ${tr.treeNames[cell.treeId]} · ${cell.fruitReady ? tr.ready : `Yaş: ${cell.ageDays ?? 0}/28 gün`}`;
  if (cell.dead) return `${position}: Solmuş ekin`;
  if (cell.kind !== 'planted') return `${position}: ${tr[cell.kind]}`;
  return `${position}: ${tr.crops[cell.cropId]} · ${isRipe(cell, minute) ? tr.ready : `${remainingMs(cell, minute)} büyüme günü kaldı`}${cell.wateredToday ? ' · Bugün sulandı' : ''}`;
}
export function NextAction({ cell }: { cell: Cell }) {
  const [removing, setRemoving] = useState(false);
  const game = useGame(s => s.game), seed = useGame(s => s.seed), dispatch = useGame(s => s.dispatch);
  const readonly = useGame(s => s.readonly || s.conflict || s.editMode);
  if (cell.dead || cell.kind === 'untilled') return <button className="primary" disabled={readonly} onClick={() => dispatch({ type: 'till', cellId: cell.id })}>{cell.dead ? 'Solmuş ekini temizle' : tr.tools.till}</button>;
  if (cell.kind === 'tree') return <>
    <p>{cell.fruitReady ? tr.ready : `Yaş: ${cell.ageDays ?? 0}/28 gün · Mevsiminde her sabah 1 meyve`}</p>
    <button className="primary" disabled={readonly || !cell.fruitReady} onClick={() => dispatch({ type: 'harvest', cellId: cell.id })}>{tr.tools.harvest}</button>
    <button disabled={readonly} onClick={() => setRemoving(true)}>{tr.removeTree}</button>
    {removing && <ConfirmDialog title={tr.removeTreeTitle} body={tr.removeTreeBody} onClose={() => setRemoving(false)} onConfirm={() => dispatch({ type: 'removeTree', cellId: cell.id })} />}
  </>;
  if (cell.kind === 'tilled') return <><SeedPicker /><button className="primary" disabled={readonly || !game.seeds[seed]} onClick={() => dispatch({ type: 'plant', cellId: cell.id, cropId: seed })}>{tr.crops[seed]} ek</button><button disabled={readonly} onClick={() => dispatch({ type: 'water', cellId: cell.id })}>{cell.wateredToday ? 'Bugün sulandı' : tr.tools.water}</button></>;
  return <><button className="primary" disabled={readonly || !isRipe(cell, game.elapsedMinutes)} onClick={() => dispatch({ type: 'harvest', cellId: cell.id })}>{tr.tools.harvest}</button><button disabled={readonly} onClick={() => dispatch({ type: 'water', cellId: cell.id })}>{cell.wateredToday ? 'Bugün sulandı' : tr.tools.water}</button></>;
}
export function CellInfo() {
  const cell = useGame(s => s.game.cells.find(c => c.id === s.selected)), now = useGame(s => s.now), tool = useGame(s => s.tool);
  if (tool && cell?.kind !== 'tree' && !cell?.dead) return null;
  if (!cell) return <aside className="welcome-note panel"><span aria-hidden="true">🌱</span><div><strong>{tr.subtitle}</strong><p>{tr.selectHint}</p></div></aside>;
  return <aside className="cell-info panel"><div className="cell-heading"><span className="cell-illustration" aria-hidden="true">{cell.kind === 'planted' ? CROPS[cell.cropId].icon : '🌱'}</span><h3>{cellLabel(cell, now)}</h3><button className="icon-button" aria-label={tr.close} onClick={() => useGame.setState({ selected: null })}>×</button></div>{(!tool || cell.kind === 'tree' || cell.dead) && <NextAction key={cell.id} cell={cell} />}</aside>;
}
