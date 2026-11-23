import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DirectionalLight, HemisphereLight } from 'three';
import { DAY_MS } from '../sim/data';
import { useGame } from '../store/game';
import { palette } from './palette';

const day = new Color(palette.sky.day);
const night = new Color(palette.sky.night);

export function DayNight() {
  const sun = useRef<DirectionalLight>(null);
  const ambient = useRef<HemisphereLight>(null);
  const sky = useRef(new Color(palette.sky.day));
  const phase = useRef(0);

  useFrame(({ scene }, delta) => {
    const state = useGame.getState();
    if (state.panel !== 'pause') phase.current = ((Date.now() - state.game.createdAt) % DAY_MS) / DAY_MS;
    const daylight = Math.max(0, Math.sin(phase.current * Math.PI * 2));
    const desired = day.clone().lerp(night, 1 - daylight);
    sky.current.lerp(desired, state.reducedMotion ? 1 : Math.min(1, delta * 0.5));
    scene.background = sky.current;
    if (sun.current) sun.current.intensity = 0.6 + daylight * 1.5;
    if (ambient.current) ambient.current.intensity = 1.2 + daylight * 0.5;
  });

  return (
    <>
      <hemisphereLight ref={ambient} args={['#fff4d8', '#6f875e', 1.6]} />
      <directionalLight
        ref={sun}
        castShadow
        position={[0, 12, 5]}
        intensity={2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.001}
      />
    </>
  );
}
