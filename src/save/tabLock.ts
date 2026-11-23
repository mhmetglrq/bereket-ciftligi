export const LOCK_KEY = 'bereket-ciftligi:owner:v1';

export interface Claim {
  id: string;
  openedAt: number;
}
export function compareClaims(a: Claim, b: Claim): number {
  return a.openedAt - b.openedAt || a.id.localeCompare(b.id);
}
function decode(raw: string | null): Claim | null {
  try {
    const value = JSON.parse(raw ?? 'null') as Partial<Claim> | null;
    return value && typeof value.id === 'string' &&
      typeof value.openedAt === 'number' && Number.isFinite(value.openedAt)
      ? value as Claim : null;
  } catch {
    return null;
  }
}

export class Ownership {
  private owner: Claim;
  private lost = false;
  constructor(readonly claim: Claim, private readonly onLost: () => void) {
    this.owner = claim;
  }
  observe(claim: Claim): void {
    if (compareClaims(claim, this.owner) > 0) this.owner = claim;
    if (!this.lost && this.owner.id !== this.claim.id) {
      this.lost = true;
      this.onLost();
    }
  }
  get owns(): boolean { return !this.lost; }
}

export function createTabLock(onLost: () => void): {
  owns: () => boolean;
  dispose: () => void;
} {
  const claim: Claim = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Math.random()}`,
    openedAt: performance.timeOrigin + performance.now()
  };
  const ownership = new Ownership(claim, onLost);
  let channel: BroadcastChannel | null = null;
  const read = (): Claim | null => {
    try { return decode(localStorage.getItem(LOCK_KEY)); } catch { return null; }
  };
  const publish = (): void => {
    if (!ownership.owns) return;
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(claim)); } catch { /* BC fallback */ }
    channel?.postMessage(claim);
  };
  const receive = (other: Claim): void => {
    ownership.observe(other);
    if (ownership.owns && compareClaims(claim, other) > 0) publish();
  };
  try {
    channel = new BroadcastChannel(LOCK_KEY);
    channel.onmessage = event => {
      const other = decode(JSON.stringify(event.data));
      if (other) receive(other);
    };
  } catch { /* storage event fallback */ }
  const existing = read();
  if (existing) {
    // Persisted ownership from a closed tab must not defeat a new tab after
    // a system clock rollback.
    claim.openedAt = Math.max(claim.openedAt, existing.openedAt + 0.001);
  }
  const storageListener = (event: StorageEvent): void => {
    if (event.key !== LOCK_KEY || !event.newValue) return;
    const other = decode(event.newValue);
    if (other) receive(other);
  };
  window.addEventListener('storage', storageListener);
  publish();

  return {
    owns: () => {
      const owner = read();
      if (owner) receive(owner);
      return ownership.owns;
    },
    dispose: () => {
      window.removeEventListener('storage', storageListener);
      channel?.close();
    }
  };
}
