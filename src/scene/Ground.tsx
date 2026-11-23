import { palette } from './palette';

export function Ground() {
  return (
    <group>
      <mesh receiveShadow position={[3.5, -0.39, 3.5]}>
        <boxGeometry args={[14, 0.65, 14]} />
        <meshStandardMaterial color={palette.grassEdge} flatShading />
      </mesh>
      <mesh receiveShadow position={[3.5, -0.09, 3.5]}>
        <boxGeometry args={[14.1, 0.15, 14.1]} />
        <meshStandardMaterial color={palette.grass} flatShading />
      </mesh>
      <mesh receiveShadow position={[-2.4, 0.01, 3.5]}>
        <boxGeometry args={[1.1, 0.04, 12]} />
        <meshStandardMaterial color={palette.soil} flatShading />
      </mesh>
    </group>
  );
}
