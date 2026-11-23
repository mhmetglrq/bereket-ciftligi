import { useState } from 'react';
import { useGame } from '../store/game';
import { RECIPES } from '../sim/data';
import { canAfford, getStock } from '../sim/inventory';
import { formatDuration, formatNumber } from '../sim/format';
import type { BuildingId, ItemId, RecipeId } from '../sim/types';
import { tr } from '../i18n/tr';
import { ConfirmDialog } from './ConfirmDialog';
export function BuildingPanel({ id }: { id: BuildingId }) {
  const game = useGame(s => s.game), now = useGame(s => s.now), dispatch = useGame(s => s.dispatch);
  const readonly = useGame(s => s.readonly || s.conflict);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const building = game.buildings[id];
  return <div className="feature-content">
    <div className="recipe-grid">{(Object.keys(RECIPES) as RecipeId[]).filter(r => RECIPES[r].building === id).map(r => {
      const recipe = RECIPES[r];
      return <article className="feature-card" key={r}>
        <h3>{tr.items[r]}</h3>
        {Object.entries(recipe.inputs).map(([item, qty]) => <p key={item} className={getStock(game, item as ItemId) < qty ? 'shortage' : ''}>{formatNumber(qty)} {tr.items[item as ItemId]} · {formatNumber(getStock(game, item as ItemId))}/{formatNumber(qty)}</p>)}
        <p>→ 1 {tr.items[r]} · {formatDuration(recipe.ms)}</p>
        <button className="primary" disabled={readonly || !building.owned || building.queue.length >= 3 || !canAfford(game, recipe.inputs)} onClick={() => dispatch({ type: 'queueProduction', buildingId: id, recipeId: r })}>{tr.produceAction}</button>
        {!canAfford(game, recipe.inputs) && <small className="shortage">{tr.reasons.missingIngredients}</small>}
        {building.queue.length >= 3 && <small>{tr.reasons.queueFull}</small>}
      </article>;
    })}</div>
    <h3>{tr.queueTitle}</h3>
    {!building.queue.length && <p className="muted">{tr.emptyQueue}</p>}
    <div className="queue-grid">{[0, 1, 2].map(i => {
      const job = building.queue[i];
      return <article className="feature-card queue-slot" key={i}>{job ? <>
        <strong>{tr.items[job.recipeId]}</strong>
        {job.startAt > now ? <><span>{tr.waiting}</span><button aria-label={tr.cancelJobTitle} onClick={() => setCancelId(job.id)} disabled={readonly}>×</button></> : <><progress max={job.endsAt - job.startAt} value={Math.max(0, now - job.startAt)} aria-label={tr.production} /><span>{formatDuration(job.endsAt - now)}</span></>}
      </> : <span className="muted">{tr.emptyJob}</span>}</article>;
    })}</div>
    {Object.values(building.readyOutput).some(q => q > 0) && <article className="feature-card ready-output">
      {Object.entries(building.readyOutput).map(([item, qty]) => <strong key={item}>{formatNumber(qty)} {tr.items[item as ItemId].toLocaleLowerCase('tr-TR')} {tr.outputReady}</strong>)}
      <button className="primary" disabled={readonly} onClick={() => dispatch({ type: 'collectProduction', buildingId: id })}>{tr.collect}</button>
    </article>}
    {cancelId && <ConfirmDialog title={tr.cancelJobTitle} body={tr.cancelJobBody} onClose={() => setCancelId(null)} onConfirm={() => dispatch({ type: 'cancelProduction', buildingId: id, jobId: cancelId })} />}
  </div>;
}
