export type CropId = 'wheat' | 'carrot' | 'tomato' | 'corn' | 'strawberry';
export type Tool = 'till' | 'plant' | 'harvest' | 'water';
export type Inventory = Record<CropId, number>;
export interface Water { at: number; until: number }
export type Cell =
  | { id: string; x: number; y: number; kind: 'untilled' | 'tilled' }
  | { id: string; x: number; y: number; kind: 'planted'; cropId: CropId; plantedAt: number; water?: Water };

export interface Chicken { id: string; fedAt: number | null }
export interface CoopState { owned: boolean; chickens: Chicken[]; pendingEggs: number }
export type QuestStatus = 'active' | 'complete' | 'claimed';
export interface QuestProgress { count: number; status: QuestStatus }
export interface GameState {
  version: 2;
  createdAt: number;
  savedAt: number;
  gridSize: 6 | 8;
  gold: number;
  xp: number;
  eggs: number;
  coop: CoopState;
  seeds: Inventory;
  produce: Inventory;
  cells: Cell[];
  quests: Record<string, QuestProgress>;
}
export interface GameEvent {
  type: 'till' | 'plant' | 'harvest' | 'sell' | 'buySeed' | 'expand' | 'claim' | 'rescue'
    | 'water' | 'buyCoop' | 'buyChicken' | 'feed' | 'collectEgg';
  cropId?: CropId;
  amount: number;
}
export type Reason =
  | 'missingCell' | 'alreadyTilled' | 'needTill' | 'occupied' | 'noSeeds'
  | 'notPlanted' | 'notRipe' | 'noProduce' | 'notEnoughGold'
  | 'alreadyExpanded' | 'questNotReady' | 'invalidAmount' | 'notApplicable'
  | 'locked' | 'alreadyOwned' | 'needCoop' | 'coopFull' | 'noWheat'
  | 'alreadyFed' | 'missingChicken' | 'noEggs';
export type Result =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: Reason };
export type Action =
  | { type: 'till' | 'harvest' | 'water'; cellId: string }
  | { type: 'plant'; cellId: string; cropId: CropId }
  | { type: 'sell'; cropId: CropId; amount: number | 'all' }
  | { type: 'sellEgg'; amount: number | 'all' }
  | { type: 'buySeed'; cropId: CropId; amount: number }
  | { type: 'expand' | 'buyCoop' | 'buyChicken' | 'feedAll' | 'collectEgg' }
  | { type: 'feed'; chickenId: string }
  | { type: 'claim'; questId: string };
