export type Sound = 'till' | 'plant' | 'harvest' | 'coin' | 'error';

let context: AudioContext | null = null;
let unlocked = false;
let muted = false;

export function unlockAudio(): void {
  unlocked = true;
  if (muted) return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => undefined);
  } catch { /* Audio is optional. */ }
}

export function setMuted(value: boolean): void { muted = value; }

export function playSound(sound: Sound, reducedMotion: boolean): void {
  if (muted || !unlocked) return;
  try {
    context ??= new AudioContext();
    if (context.state !== 'running') return;
    const notes: Record<Sound, number[]> = {
      till: [100, 65],
      plant: [340, 520],
      harvest: [520, 660, 880],
      coin: [880, 1180],
      error: [160, 110]
    };
    notes[sound].forEach((frequency, index) => {
      const start = context!.currentTime + index * 0.065;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = sound === 'till' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      oscillator.connect(gain);
      gain.connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.15);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
    if (!reducedMotion && sound === 'harvest') navigator.vibrate?.(18);
  } catch { /* Silent fallback for unsupported browsers. */ }
}
