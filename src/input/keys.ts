import { useGame } from '../store/game';

export function bindKeys(): () => void {
  const onKey = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLElement &&
      (target.matches('input, textarea, select') || target.isContentEditable)) return;
    const state = useGame.getState();
    if (state.panel || state.away || state.phase !== 'playing') return;
    if (event.key === 'Escape') useGame.setState({ tool: null, selected: null });
    if (event.key.toLowerCase() === 'p') {
      event.preventDefault();
      state.setPanel('pause');
      return;
    }
    const tool = ({ '1': 'till', '2': 'plant', '3': 'harvest', '4': 'water' } as const)[
      event.key as '1' | '2' | '3' | '4'
    ];
    if (tool) {
      event.preventDefault();
      state.chooseTool(tool);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
