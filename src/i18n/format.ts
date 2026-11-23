import { tr } from './tr';

const formatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
export const number = (value: number): string => formatter.format(value);

export function duration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${number(seconds)} ${tr.seconds}`;
  if (seconds < 3600) return `${number(Math.floor(seconds / 60))} ${tr.minutes}`;
  if (seconds < 86400) return `${number(Math.floor(seconds / 3600))} ${tr.hours}`;
  return `${number(Math.floor(seconds / 86400))} ${tr.days}`;
}
