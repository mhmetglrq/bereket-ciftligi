import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry,
  IcosahedronGeometry, MeshStandardMaterial, type BufferGeometry
} from 'three';
import { palette } from './palette';
import { CROP_IDS } from '../sim/data';

export interface Asset {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
}

export function createAssets(): { get: (id: string) => Asset; dispose: () => void } {
  const assets = new Map<string, Asset>();
  const add = (id: string, geometry: BufferGeometry, color: string): void => {
    assets.set(id, {
      geometry,
      material: new MeshStandardMaterial({ color, flatShading: true, roughness: 1 })
    });
  };
  add('tile.untilled', new BoxGeometry(0.94, 0.16, 0.94), palette.grass);
  // Soil instances carry their own absolute palette colour.
  add('tile.tilled', new BoxGeometry(0.94, 0.12, 0.94), '#ffffff');
  const soil = assets.get('tile.tilled');
  if (soil) soil.material.roughness = 0.7;
  add('tile.furrow', new BoxGeometry(0.72, 0.035, 0.055), palette.furrow);
  add('tree.trunk', new CylinderGeometry(0.07, 0.12, 0.85, 5), palette.trunk);
  add('tree.crown', new IcosahedronGeometry(0.46, 0), palette.leaf);
  add('tree.fruit', new IcosahedronGeometry(0.085, 0), palette.tomato);
  add('building.wood', new BoxGeometry(1, 1, 1), palette.wood);
  add('building.stone', new CylinderGeometry(0.55, 0.7, 1.5, 8), palette.stone);
  add('building.roof', new ConeGeometry(0.85, 0.65, 4), palette.roof);
  add('building.wall', new BoxGeometry(1, 1, 1), palette.roof);
  add('building.dark', new BoxGeometry(1, 1, 1), palette.trunk);
  add('building.window', new BoxGeometry(1, 1, 1), palette.wheat);
  const windowMaterial = assets.get('building.window')!.material;
  windowMaterial.emissive.set(palette.wheat);
  windowMaterial.emissiveIntensity = 0.4;
  add('building.marker', new IcosahedronGeometry(0.13, 0), palette.wheat);
  add('building.proxy', new BoxGeometry(2.2, 2.3, 1.9), palette.wood);
  const proxyMaterial = assets.get('building.proxy')!.material;
  proxyMaterial.transparent = true;
  proxyMaterial.opacity = 0;
  proxyMaterial.depthWrite = false;

  for (const cropId of CROP_IDS) {
    add(`crop.${cropId}.stage0`, new ConeGeometry(0.10, 0.17, 4), palette.youngLeaf);
    add(`crop.${cropId}.stage1`, new ConeGeometry(0.17, 0.30, 5), palette.leaf);
    if (cropId === 'wheat') {
      add(`crop.${cropId}.stage2`, new CylinderGeometry(0.055, 0.085, 0.48, 5), palette.youngLeaf);
      add(`crop.${cropId}.stage3`, new CylinderGeometry(0.10, 0.04, 0.63, 5), palette.wheat);
    } else if (cropId === 'carrot') {
      add(`crop.${cropId}.stage2`, new ConeGeometry(0.19, 0.38, 5), palette.leaf);
      add(`crop.${cropId}.stage3`, new ConeGeometry(0.14, 0.32, 6), palette.carrot);
    } else if (cropId === 'corn') {
      add(`crop.${cropId}.stage2`, new ConeGeometry(0.12, 0.6, 5), palette.leaf);
      add(`crop.${cropId}.stage3`, new CylinderGeometry(0.08, 0.12, 0.72, 6), palette.corn);
    } else if (cropId === 'strawberry') {
      add(`crop.${cropId}.stage2`, new IcosahedronGeometry(0.20, 0), palette.leaf);
      add(`crop.${cropId}.stage3`, new ConeGeometry(0.15, 0.24, 6), palette.strawberry);
    } else {
      add(`crop.${cropId}.stage2`, new IcosahedronGeometry(0.23, 0), palette.leaf);
      add(`crop.${cropId}.stage3`, new DodecahedronGeometry(0.19, 0), palette.tomato);
    }
  }

  return {
    get: id => {
      const asset = assets.get(id);
      if (!asset) throw new Error(`Missing procedural asset: ${id}`);
      return asset;
    },
    dispose: () => assets.forEach(asset => {
      asset.geometry.dispose();
      asset.material.dispose();
    })
  };
}
export type Assets = ReturnType<typeof createAssets>;
