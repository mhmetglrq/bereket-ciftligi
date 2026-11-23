export type CropId = 'wheat' | 'carrot' | 'tomato' | 'corn' | 'strawberry' | 'pumpkin';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export interface LayoutObject { id: string; x: number; y: number; width: number; height: number }
export type Layout = LayoutObject[];
export type Tool = 'till' | 'plant' | 'harvest' | 'water';
export type Inventory = Record<CropId, number>;
export type GoodId = 'flour' | 'bread' | 'cake' | 'apple' | 'cherry';
export type ItemId = CropId | GoodId | 'eggs';
export type BuildingId = 'mill' | 'bakery';
export type RecipeId = 'flour' | 'bread' | 'cake';
export type TreeId = 'apple' | 'cherry';
export interface Job { id: string; recipeId: RecipeId; startAt: number; endsAt: number }
export interface Building { owned: boolean; queue: Job[]; readyOutput: Partial<Record<GoodId, number>> }
export interface Order { id: string; items: Partial<Record<ItemId, number>>; gold: number; xp: number }
export interface OrderSlot { order: Order | null; refillAt: number; generation: number }
export interface DailyQuest { id: string; event: GameEvent['type']; target: number; count: number; claimed: boolean; gold: number; xp: number }
export interface DailyState { lastClaim: string | null; streak: number; date: string; quests: DailyQuest[] }
export interface Water { at: number; until: number }
export type Cell = { wateredToday?: boolean; dead?: boolean; growthDays?: number; daysRemaining?: number; ageDays?: number; fruitReady?: boolean } & (
  | { id: string; x: number; y: number; kind: 'untilled' | 'tilled' }
  | { id: string; x: number; y: number; kind: 'planted'; cropId: CropId; plantedAt: number; water?: Water }
  | { id: string; x: number; y: number; kind: 'tree'; treeId: TreeId; plantedAt: number; ripeAt: number; harvested: boolean });

export interface Chicken { id: string; fedAt: number | null }
export interface CoopState { owned: boolean; chickens: Chicken[]; pendingEggs: number }
export type QuestStatus = 'active' | 'complete' | 'claimed';
export interface QuestProgress { count: number; status: QuestStatus }
export interface GameState {
  version: 4;
  day: number;
  season: Season;
  year: number;
  minute: number;
  elapsedMinutes: number;
  energy: number;
  weather: 'sunny' | 'rain';
  layout: Layout;
  shipping: Partial<Record<ItemId, number>>;
  seenV4Intro: boolean;
  goods: Record<GoodId, number>;
  buildings: Record<BuildingId, Building>;
  orders: OrderSlot[];
  daily: DailyState;
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
    | 'water' | 'buyCoop' | 'buyChicken' | 'feed' | 'collectEgg' | 'production' | 'order' | 'daily' | 'tree';
  cropId?: CropId;
  amount: number;
}
export type Reason =
  | 'noEnergy' | 'alreadyWatered' | 'winter' | 'wrongSeason'
  | 'missingCell' | 'alreadyTilled' | 'needTill' | 'occupied' | 'noSeeds'
  | 'notPlanted' | 'notRipe' | 'noProduce' | 'notEnoughGold'
  | 'alreadyExpanded' | 'questNotReady' | 'invalidAmount' | 'notApplicable'
  | 'locked' | 'alreadyOwned' | 'needCoop' | 'coopFull' | 'noWheat'
  | 'alreadyFed' | 'missingChicken' | 'noEggs' | 'treeOccupied' | 'queueFull' | 'missingIngredients' | 'jobStarted' | 'nothingReady' | 'dailyClaimed';
export type Result =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: Reason };
export type Action =
  | { type: 'eat' | 'buyFood'; itemId: 'bread' | 'cake' }
  | { type: 'buyBuilding' | 'collectProduction'; buildingId: BuildingId }
  | { type: 'queueProduction'; buildingId: BuildingId; recipeId: RecipeId }
  | { type: 'cancelProduction'; buildingId: BuildingId; jobId: string }
  | { type: 'plantTree'; cellId: string; treeId: TreeId }
  | { type: 'removeTree'; cellId: string }
  | { type: 'sellItem'; itemId: ItemId; amount: number | 'all' }
  | { type: 'deliverOrder' | 'rejectOrder'; slot: number }
  | { type: 'claimDaily' }
  | { type: 'claimDailyQuest'; questId: string }
  | { type: 'till' | 'harvest' | 'water'; cellId: string }
  | { type: 'plant'; cellId: string; cropId: CropId }
  | { type: 'sell'; cropId: CropId; amount: number | 'all' }
  | { type: 'sellEgg'; amount: number | 'all' }
  | { type: 'buySeed'; cropId: CropId; amount: number }
  | { type: 'expand' | 'buyCoop' | 'buyChicken' | 'feedAll' | 'collectEgg' }
  | { type: 'feed'; chickenId: string }
  | { type: 'claim'; questId: string };
