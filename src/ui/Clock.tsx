import { useGame } from '../store/game';
import { SEASON_NAMES } from '../sim/seasons';
import { formatTime } from '../sim/time';
export function Clock() {
  const game = useGame(s => s.game);
  return <span className={game.minute >= 1440 ? 'game-clock late' : 'game-clock'} title={SEASON_NAMES[game.season].toLocaleUpperCase('tr-TR')}>{SEASON_NAMES[game.season]} {game.day} · Yıl {game.year} · {formatTime(game.minute)}</span>;
}
