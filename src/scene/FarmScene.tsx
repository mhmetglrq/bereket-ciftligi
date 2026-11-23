import { Component, useEffect, useMemo, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGame } from '../store/game';
import { createAssets } from './assets';
import { CameraRig } from './CameraRig';
import { Crops } from './Crops';
import { Coop } from './Coop';
import { WaterMarks } from './WaterMarks';
import { DayNight } from './DayNight';
import { Decor } from './Decor';
import { Ground } from './Ground';
import { Selection } from './Selection';
import { Tiles } from './Tiles';
import { tr } from '../i18n/tr';
import { Buildings } from './Buildings';
import { Trees } from './Trees';
import { stepDriver } from '../store/driver';
import { EditLayer } from './EditLayer';
import { SceneLabels } from './SceneLabels';

declare global {
  interface Window {
    __bereketRenderer?: { calls: number; maxCalls: number };
  }
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="scene-error panel" role="status">{tr.webgl}</div>
      : this.props.children;
  }
}

function World() {
  const assets = useMemo(createAssets, []);
  useEffect(() => () => assets.dispose(), [assets]);
  useFrame(({ gl }) => {
    const previous = window.__bereketRenderer?.maxCalls ?? 0;
    window.__bereketRenderer = {
      calls: gl.info.render.calls,
      maxCalls: Math.max(previous, gl.info.render.calls)
    };
  });
  useFrame((_, delta) => stepDriver(delta));
  return (
    <>
      <CameraRig />
      <DayNight />
      <Ground />
      <Tiles assets={assets} />
      <WaterMarks />
      <Crops assets={assets} />
      <Coop />
      <Buildings assets={assets} />
      <Trees assets={assets} />
      <Selection />
      <Decor />
      <EditLayer />
      <SceneLabels />
    </>
  );
}

export function FarmScene() {
  const epoch = useGame(state => state.sceneEpoch);
  return (
    <div className="scene" aria-hidden="true">
      <SceneBoundary key={epoch}>
        <Canvas orthographic shadows dpr={[1, 1.5]}
          camera={{ position: [14.5, 13, 14.5], zoom: 58, near: 0.1, far: 100 }}
          gl={{ antialias: true, powerPreference: 'low-power' }}
          fallback={<div className="scene-error panel">{tr.webgl}</div>}>
          <World key={epoch} />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
