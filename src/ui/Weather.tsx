import { useGame } from '../store/game';
export function Weather() {
  const rain = useGame(s => s.game.weather === 'rain');
  const label = rain ? 'Hava: Yağmurlu (tarla sulandı)' : 'Hava: Güneşli';
  return <span role="img" aria-label={label} title={label}>{rain ? '🌧' : '☀️'}</span>;
}
