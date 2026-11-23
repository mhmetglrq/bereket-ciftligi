export type CropId = 'wheat' | 'carrot' | 'tomato';
export type Tool = 'till' | 'plant' | 'harvest';
export type Inventory = Record<CropId, number>;
export type Cell =
  | { id: string; x: number; y: number; kind: 'untilled' | 'tilled' }
  | { id: string; x: number; y: number; kind: 'planted'; cropId: CropId; plantedAt: number };

export type QuestStatus = 'active' | 'complete' | 'claimed';
export interface QuestProgress {
  count: number;
  status: QuestStatus;
}
export interface GameState {
  version: 1;
  createdAt: number;
  savedAt: number;
  gridSize: 6 | 8;
  gold: number;
  seeds: Inventory;
  produce: Inventory;
  cells: Cell[];
  quests: Record<string, QuestProgress>;
}
export interface GameEvent {
  type: 'till' | 'plant' | 'harvest' | 'sell' | 'buySeed' | 'expand' | 'claim' | 'rescue';
  cropId?: CropId;
  amount: number;
}
export type Reason =
  | 'missingCell'
  | 'alreadyTilled'
  | 'needTill'
  | 'occupied'
  | 'noSeeds'
  | 'notPlanted'
  | 'notRipe'
  | 'noProduce'
  | 'notEnoughGold'
  | 'alreadyExpanded'
  | 'questNotReady'
  | 'invalidAmount';
export type Result =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: Reason };
export type Action =
  | { type: 'till'; cellId: string }
  | { type: 'plant'; cellId: string; cropId: CropId }
  | { type: 'harvest'; cellId: string }
  | { type: 'sell'; cropId: CropId; amount: number | 'all' }
  | { type: 'buySeed'; cropId: CropId; amount: number }
  | { type: 'expand' }
  | { type: 'claim'; questId: string };
