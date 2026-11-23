import { tr } from '../i18n/tr';

export const formatNumber = (value: number): string => value.toLocaleString('tr-TR');
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${formatNumber(seconds)} ${tr.seconds}`;
  if (seconds < 3600) return `${formatNumber(Math.floor(seconds / 60))} ${tr.minutes}${seconds % 60 ? ` ${formatNumber(seconds % 60)} ${tr.seconds}` : ''}`;
  return `${formatNumber(Math.floor(seconds / 3600))} ${tr.hours}${Math.floor(seconds % 3600 / 60) ? ` ${formatNumber(Math.floor(seconds % 3600 / 60))} ${tr.minutes}` : ''}`;
}
