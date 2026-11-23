import { QUESTS } from './data';
import type { GameEvent, GameState, Result } from './types';

export function applyQuestEvents(state: GameState, events: GameEvent[]): GameState {
  const quests = { ...state.quests };
  for (const quest of QUESTS) {
    const current = quests[quest.id];
    if (current.status !== 'active') continue;
    const gained = events.reduce((sum, event) => {
      return event.type === quest.event &&
        (quest.cropId === null || event.cropId === quest.cropId)
        ? sum + event.amount
        : sum;
    }, 0);
    const count = Math.min(quest.target, current.count + gained);
    quests[quest.id] = {
      count,
      status: count >= quest.target ? 'complete' : 'active'
    };
  }
  return { ...state, quests };
}

export function claimQuest(state: GameState, questId: string): Result {
  const quest = QUESTS.find(item => item.id === questId);
  if (!quest || state.quests[questId]?.status !== 'complete') {
    return { ok: false, reason: 'questNotReady' };
  }
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold + quest.reward,
      quests: {
        ...state.quests,
        [questId]: { ...state.quests[questId], status: 'claimed' }
      }
    },
    events: [{ type: 'claim', amount: quest.reward }]
  };
}
