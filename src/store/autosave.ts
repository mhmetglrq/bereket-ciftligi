import { AUTOSAVE_MS, SAVE_DEBOUNCE_MS } from '../sim/data';
import { saveGame } from '../save/storage';
import { getStorage, useGame } from './game';
import { tr } from '../i18n/tr';

export class SaveSchedule {
  private due: number | null = null;
  private last: number;
  constructor(now: number) { this.last = now; }
  request(now: number): void { this.due = now + SAVE_DEBOUNCE_MS; }
  shouldSave(now: number): boolean {
    return (this.due !== null && now >= this.due) || now - this.last >= AUTOSAVE_MS;
  }
  saved(now: number): void { this.last = now; this.due = null; }
}

export function startAutosave(): () => void {
  const schedule = new SaveSchedule(Date.now());
  let raf = 0;
  let disposed = false;
  let busy = false;
  let revision = 0;

  const flush = async (): Promise<void> => {
    const current = useGame.getState();
    if (busy || current.phase === 'loading' || !current.mayWrite()) return;
    const snapshot = current.game;
    const snapshotRevision = revision;
    const now = Date.now();
    busy = true;
    try {
      await saveGame(getStorage(), snapshot, now);
      schedule.saved(now);
      if (!disposed) {
        useGame.setState({
          storageMode: getStorage().mode,
          saveStatus: revision === snapshotRevision ? 'saved' : 'saving'
        });
      }
      if (revision !== snapshotRevision) schedule.request(Date.now());
    } catch {
      if (!disposed) {
        useGame.setState({ readonly: true });
        useGame.getState().notify(tr.saveFailed);
      }
    } finally {
      busy = false;
    }
  };
  const requestSave = (): void => {
    revision++;
    schedule.request(Date.now());
  };
  useGame.setState({ requestSave });

  const frame = (): void => {
    if (schedule.shouldSave(Date.now())) void flush();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const onPageHide = (): void => { void flush(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    useGame.setState({ requestSave: () => undefined });
  };
}
