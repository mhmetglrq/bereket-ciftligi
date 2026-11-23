import { useState } from 'react';
import { Html } from '@react-three/drei';
import { useGame } from '../store/game';
import { tr } from '../i18n/tr';
import { number } from '../i18n/format';
import { palette } from './palette';

export function Coop() {
  const coop = useGame(state => state.game.coop);
  const size = useGame(state => state.game.gridSize);
  const [hovered, setHovered] = useState(false);
  if (!coop.owned) return null;
  const hungry = coop.chickens.some(chicken => chicken.fedAt === null);
  const open = (): void => {
    const state = useGame.getState();
    if (state.phase === 'playing' && !state.panel && !state.away && !state.conflict) {
      state.setPanel('coop');
    }
  };
  return (
    <group position={[size + 0.65, 0, (size - 1) / 2]}
      onClick={event => { event.stopPropagation(); open(); }}
      onPointerOver={event => { event.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}>
      <mesh position={[0, 0.65, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.55, 1.2, 1.45]} />
        <meshStandardMaterial color={palette.wall} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.52, 0]} rotation={[0, Math.PI / 4, 0]} receiveShadow>
        <coneGeometry args={[1.38, 0.65, 4]} />
        <meshStandardMaterial color={palette.roof} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.37, 0.732]}>
        <boxGeometry args={[0.47, 0.65, 0.04]} />
        <meshStandardMaterial color={palette.trunk} flatShading />
      </mesh>
      {coop.chickens.map((chicken, index) => (
        <group key={chicken.id} position={[-0.5 + index * 0.5, 0.18, 1.12]}>
          <mesh receiveShadow>
            <icosahedronGeometry args={[0.19, 0]} />
            <meshStandardMaterial color={palette.egg} flatShading />
          </mesh>
          <mesh position={[0.02, 0.2, 0.03]}>
            <icosahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color={palette.egg} flatShading />
          </mesh>
          <mesh position={[0.02, 0.22, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.04, 0.1, 4]} />
            <meshStandardMaterial color={palette.corn} flatShading />
          </mesh>
        </group>
      ))}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.06, 1.13, 4, 1, Math.PI / 4]} />
          <meshBasicMaterial color={palette.selection} />
        </mesh>
      )}
      <Html position={[0, 2.05, 0]} center>
        <button className="coop-scene-button" onClick={open} aria-label={tr.coop}>
          <span>{tr.coop}</span>
          {coop.pendingEggs > 0 && <span className="coop-badge egg-badge">🥚 {number(coop.pendingEggs)}</span>}
          {hungry && <span className="coop-badge hungry-badge" title={tr.hungry}>🍽</span>}
        </button>
      </Html>
    </group>
  );
}
