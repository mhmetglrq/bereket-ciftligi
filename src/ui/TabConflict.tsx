import { useGame } from '../store/game';
import { tr } from '../i18n/tr';

export function TabConflict() {
  const conflict = useGame(state => state.conflict);
  const readonly = useGame(state => state.readonly);
  if (!conflict && !readonly) return null;
  return (
    <div className="conflict-banner panel" role="alert">
      <strong>{conflict ? tr.conflictTitle : tr.readonly}</strong>
      <p>{conflict ? tr.conflict : tr.future}</p>
    </div>
  );
}
