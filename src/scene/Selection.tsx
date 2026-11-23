import { Html } from '@react-three/drei';
import { canApply } from '../sim/actions';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { palette } from './palette';

export function Selection() {
  const game = useGame(state => state.game);
  const selected = useGame(state => state.selected);
  const tool = useGame(state => state.tool);
  const seed = useGame(state => state.seed);
  const now = useGame(state => state.now);
  const panel = useGame(state => state.panel);
  const away = useGame(state => state.away);
  const painting = useGame(state => state.painting);
  const paintedCell = useGame(state => state.paintedCell);
  const cell = game.cells.find(item => item.id === selected);
  if (!cell || painting && paintedCell !== selected) return null;
  const valid = !tool || canApply(tool, cell, game, now, seed);
  return (
    <group position={[cell.x, 0.11, cell.y]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.40, 0.48, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial
          color={painting ? palette.wheat : !tool ? palette.selection : valid ? palette.valid : palette.invalid}
          depthWrite={false} />
      </mesh>
      {valid && !painting && !panel && !away && (
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <span className="selection-label">{tool ? tr.valid : tr.cell}</span>
        </Html>
      )}
    </group>
  );
}
