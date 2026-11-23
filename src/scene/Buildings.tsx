import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { useGame } from '../store/game';
import type { Assets } from './assets';
import type { BuildingId } from '../sim/types';
import { tr } from '../i18n/tr';
import { objectCenter } from '../sim/layout';

function BuildingModel({ id, assets }: { id: BuildingId; assets: Assets }) {
  const building = useGame(s => s.game.buildings[id]);
  const layout = useGame(s => s.game.layout);
  const sails = useRef<Group>(null), marker = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    const state = useGame.getState();
    if (!state.reducedMotion && state.panel !== 'pause') {
      if (sails.current) sails.current.rotation.z += Math.min(delta, 0.1) * 0.25;
      if (marker.current) marker.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.06;
    } else if (marker.current) marker.current.position.y = 0;
  });
  const open = (): void => {
    const s = useGame.getState();
    if (s.phase === 'playing' && !s.editMode && !s.modalQueue.length && !s.panel && !s.conflict) { useGame.setState({ selectedObject: id }); s.setPanel(building.owned ? id : 'market'); }
  };
  const wood = assets.get('building.wood'), stone = assets.get('building.stone'), roof = assets.get('building.roof'), wall = assets.get('building.wall'), dark = assets.get('building.dark'), window = assets.get('building.window'), gold = assets.get('building.marker');
  const ready = Object.values(building.readyOutput).some(q => q > 0);
  const proxy = assets.get('building.proxy');
  return <group position={objectCenter(layout, id)} dispose={null} onPointerOver={() => useGame.setState({ hoveredObject: id })} onPointerOut={() => useGame.setState({ hoveredObject: null })}>
    <mesh geometry={wood.geometry} material={wood.material} position={[0, 0.1, 0]} scale={[1.9, 0.18, 1.55]} />
    {[-0.6, 0, 0.6].map(x => <mesh key={x} geometry={dark.geometry} material={dark.material} position={[x, 0.2, 0]} scale={[0.025, 0.02, 1.55]} />)}
    {building.owned ? id === 'mill' ? <>
      <mesh geometry={stone.geometry} material={stone.material} position={[0, 0.95, 0]} />
      <mesh geometry={roof.geometry} material={roof.material} position={[0, 1.99, 0]} rotation={[0, Math.PI / 4, 0]} />
      <group ref={sails} position={[0, 1.6, 0.75]}>
        {[0, 1, 2, 3].map(i => <group key={i} rotation={[0, 0, i * Math.PI / 2]}><mesh geometry={dark.geometry} material={dark.material} position={[0, 0.56, 0]} scale={[0.07, 1.12, 0.06]} /><mesh geometry={wood.geometry} material={wood.material} position={[0.13, 0.62, 0]} scale={[0.27, 0.72, 0.04]} /></group>)}
      </group>
    </> : <>
      <mesh geometry={wall.geometry} material={wall.material} position={[0, 0.77, 0]} scale={[1.5, 1.12, 1.2]} />
      <mesh geometry={roof.geometry} material={roof.material} position={[0, 1.55, 0]} scale={[1.25, 0.8, 1.1]} rotation={[0, Math.PI / 4, 0]} />
      <mesh geometry={dark.geometry} material={dark.material} position={[0.48, 1.62, -0.2]} scale={[0.28, 1, 0.28]} />
      <mesh geometry={window.geometry} material={window.material} position={[-0.3, 0.85, 0.61]} scale={[0.48, 0.4, 0.04]} />
      <mesh geometry={dark.geometry} material={dark.material} position={[0.35, 0.62, 0.61]} scale={[0.4, 0.85, 0.04]} />
    </> : <>
      <mesh geometry={dark.geometry} material={dark.material} position={[0, 0.6, 0.4]} scale={[0.1, 0.9, 0.1]} />
      <mesh geometry={wood.geometry} material={wood.material} position={[0, 0.98, 0.4]} scale={[1.4, 0.45, 0.08]} />
    </>}
    <mesh geometry={proxy.geometry} material={proxy.material} position={[0, 0.9, 0]} onClick={e => { e.stopPropagation(); open(); }} />
    {ready && <group ref={marker}><mesh geometry={gold.geometry} material={gold.material} position={[0, 2.55, 0]} /></group>}
  </group>;
}
export function Buildings({ assets }: { assets: Assets }) {
  return <><BuildingModel id="mill" assets={assets} /><BuildingModel id="bakery" assets={assets} /></>;
}
