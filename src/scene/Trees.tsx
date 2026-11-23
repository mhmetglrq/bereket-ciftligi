import { useGame } from '../store/game';
import { Batch, type Instance } from './Tiles';
import type { Assets } from './assets';
import { palette } from './palette';
import { TREES } from '../sim/data';
import { cellPosition } from '../sim/layout';
export function Trees({ assets }: { assets: Assets }) {
  const layout = useGame(s => s.game.layout);
  const cells = useGame(s => s.game.cells), now = useGame(s => s.now);
  const trunks: Instance[] = [], crowns: Instance[] = [], fruit: Instance[] = [];
  for (const original of cells) {
    const cell = { ...original, ...cellPosition(original, layout) };
    if (cell.kind !== 'tree') continue;
    const scale = Math.min(1, 0.35 + (cell.ageDays ?? 0) / 28 * 0.65);
    trunks.push({ x: cell.x, y: 0.43 * scale, z: cell.y, scale });
    crowns.push({ x: cell.x, y: 1.03 * scale, z: cell.y, scale });
    if (cell.fruitReady) for (const offset of [-0.23, 0, 0.23]) fruit.push({ x: cell.x + offset, y: 1.05 + Math.abs(offset), z: cell.y + 0.33, color: cell.treeId === 'cherry' ? palette.strawberry : palette.tomato });
  }
  return <><Batch assetId="tree.trunk" items={trunks} assets={assets} castShadow={false} /><Batch assetId="tree.crown" items={crowns} assets={assets} castShadow={false} /><Batch assetId="tree.fruit" items={fruit} assets={assets} castShadow={false} /></>;
}
