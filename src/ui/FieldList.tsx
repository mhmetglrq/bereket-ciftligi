import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { cellLabel, NextAction } from './CellInfo';
import { isRipe } from '../sim/crops';
import { CROPS } from '../sim/data';

export function FieldList() {
  const game = useGame(state => state.game);
  const now = useGame(state => state.now);
  const selected = useGame(state => state.selected);
  const cell = game.cells.find(item => item.id === selected);
  return (
    <div className="field-content">
      <p className="muted">{tr.fieldHelp}</p>
      <div className="accessible-field" style={{ gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))` }}>
        {game.cells.map(item => (
          <button key={item.id} aria-label={cellLabel(item, now)} aria-pressed={item.id === selected} onClick={() => useGame.setState({ selected: item.id })}>
            <span aria-hidden="true">{item.kind === 'tree' ? (item.treeId === 'apple' ? '🍎' : '🍒') : item.kind === 'planted' ? CROPS[item.cropId].icon : item.kind === 'tilled' ? '▤' : '·'}{isRipe(item, now) || item.kind === 'tree' && now >= item.ripeAt ? '✦' : ''}</span>
          </button>
        ))}
      </div>
      {cell && <div className="field-selected"><h3>{cellLabel(cell, now)}</h3><NextAction cell={cell} /></div>}
    </div>
  );
}
