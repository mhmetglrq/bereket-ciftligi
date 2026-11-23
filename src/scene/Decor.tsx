import { palette } from './palette';

function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.9, 5]} />
        <meshStandardMaterial color={palette.trunk} flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <icosahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial color={palette.leaf} flatShading />
      </mesh>
      <mesh castShadow position={[0.2, 1.5, 0.1]}>
        <icosahedronGeometry args={[0.48, 0]} />
        <meshStandardMaterial color={palette.youngLeaf} flatShading />
      </mesh>
    </group>
  );
}

export function Decor() {
  return (
    <group>
      <Tree x={-1.1} z={-1.2} scale={1.25} />
      <Tree x={8.5} z={-1.3} scale={1.4} />
      <Tree x={9} z={8.4} />
      <Tree x={-1.2} z={8.6} scale={0.85} />
      <group position={[4.3, 0, -2]}>
        <mesh castShadow position={[0, 0.55, 0]}>
          <boxGeometry args={[1.8, 1.1, 1.35]} />
          <meshStandardMaterial color={palette.wall} flatShading />
        </mesh>
        <mesh castShadow position={[0, 1.3, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.45, 0.8, 4]} />
          <meshStandardMaterial color={palette.roof} flatShading />
        </mesh>
        <mesh position={[0.2, 0.36, 0.686]}>
          <boxGeometry args={[0.38, 0.7, 0.025]} />
          <meshStandardMaterial color={palette.trunk} flatShading />
        </mesh>
        <mesh position={[-0.5, 0.67, 0.69]}>
          <boxGeometry args={[0.35, 0.35, 0.03]} />
          <meshStandardMaterial color={palette.water} flatShading />
        </mesh>
      </group>
      {[-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map(x => (
        <group key={x} position={[x, 0, -0.9]}>
          <mesh castShadow position={[0, 0.23, 0]}>
            <boxGeometry args={[0.09, 0.52, 0.09]} />
            <meshStandardMaterial color={palette.wood} flatShading />
          </mesh>
          <mesh castShadow position={[0.45, 0.27, 0]}>
            <boxGeometry args={[0.9, 0.07, 0.055]} />
            <meshStandardMaterial color={palette.wood} flatShading />
          </mesh>
        </group>
      ))}
      <mesh receiveShadow position={[8.7, 0.025, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.75, 9]} />
        <meshStandardMaterial color={palette.water} flatShading />
      </mesh>
    </group>
  );
}
