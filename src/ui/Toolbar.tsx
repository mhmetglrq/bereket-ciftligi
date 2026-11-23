import type { Tool } from '../sim/types';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { SeedPicker } from './SeedPicker';

export function Toolbar() {
  const tool = useGame(state => state.tool);
  const choose = useGame(state => state.chooseTool);
  return (
    <footer className="toolbar-wrap">
      {tool === 'plant' && <div className="panel seed-panel"><SeedPicker /></div>}
      <div className="toolbar panel">
        <div role="group" aria-label={tr.toolbar} className="tools">
          {(['till', 'plant', 'harvest'] as Tool[]).map((item, index) => (
            <button key={item} aria-pressed={tool === item} onClick={() => choose(item)}>
              <span className="tool-icon" aria-hidden="true">{tr.toolIcons[item]}</span>
              <span>{tr.tools[item]}</span>
              <kbd aria-hidden="true">{index + 1}</kbd>
            </button>
          ))}
        </div>
        <button className="field-list-button" onClick={() => useGame.getState().setPanel('field')}>
          ▦ <span>{tr.fieldList}</span>
        </button>
      </div>
      <p className="control-hint">{tr.controlHint}</p>
    </footer>
  );
}
