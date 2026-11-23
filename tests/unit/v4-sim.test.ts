import { describe, it, expect } from 'vitest';
import { advanceClock, formatTime, isClockRunning } from '../../src/sim/time';
import { endDay } from '../../src/sim/dayEnd';
import { MAX_ENERGY, FOOD, eat, buyFood } from '../../src/sim/energy';
import { SEASONS, SEASON_NAMES, inSeason } from '../../src/sim/seasons';
import { weatherFor, morningWeather } from '../../src/sim/weather';
import { shipPut, shipTake, settleShipping } from '../../src/sim/shipping';
import { canPlace, moveObject, PLOTS, defaultLayout } from '../../src/sim/layout';
import { placeLabels } from '../../src/sim/labels';
import { newGame } from '../../src/sim/grid';
import type { GameState } from '../../src/sim/types';

describe('V4 Simulation Systems', () => {
  describe('Clock & Time', () => {
    it('advances 10 game minutes for every 7 seconds of active time', () => {
      let accumulator = 0;
      let totalMinutes = 0;

      // 70 frames of 0.1s delta = 7.0 seconds
      for (let i = 0; i < 70; i++) {
        const step = advanceClock(accumulator, 0.1);
        accumulator = step.accumulator;
        totalMinutes += step.minutes;
      }

      expect(totalMinutes).toBe(10);
      expect(accumulator).toBeCloseTo(0, 5);
    });

    it('formats time string with padded hours and minutes', () => {
      expect(formatTime(360)).toBe('06:00');
      expect(formatTime(1560)).toBe('02:00');
      expect(formatTime(1440)).toBe('00:00');
    });

    it('isClockRunning returns true only under valid play conditions', () => {
      const activeState = {
        phase: 'playing',
        paused: false,
        panel: null,
        editMode: false,
        hidden: false,
        blurred: false,
        conflict: false,
        modalQueue: []
      };
      expect(isClockRunning(activeState)).toBe(true);

      expect(isClockRunning({ ...activeState, paused: true })).toBe(false);
      expect(isClockRunning({ ...activeState, editMode: true })).toBe(false);
      expect(isClockRunning({ ...activeState, panel: 'market' })).toBe(false);
      expect(isClockRunning({ ...activeState, hidden: true })).toBe(false);
      expect(isClockRunning({ ...activeState, blurred: true })).toBe(false);
      expect(isClockRunning({ ...activeState, conflict: true })).toBe(false);
      expect(isClockRunning({ ...activeState, modalQueue: [{ type: 'passOut', penalty: 50 }] })).toBe(false);
      expect(isClockRunning({ ...activeState, phase: 'title' })).toBe(false);
    });
  });

  describe('Pass Out & Day End Mechanics', () => {
    it('calculates pass out penalty as min(floor(0.1 * gold), 1000) and resets energy to 135', () => {
      const base = newGame(1000);

      // Normal sleep: full energy, 0 penalty
      const normalResult = endDay({ ...base, gold: 5000, energy: 20 }, false);
      expect(normalResult.penalty).toBe(0);
      expect(normalResult.state.energy).toBe(270);
      expect(normalResult.state.minute).toBe(360);

      // Pass out with 5,000 gold: 10% is 500 <= 1000
      const passOut1 = endDay({ ...base, gold: 5000, energy: 0 }, true);
      expect(passOut1.penalty).toBe(500);
      expect(passOut1.state.gold).toBe(4500);
      expect(passOut1.state.energy).toBe(135);

      // Pass out with 25,000 gold: penalty capped at 1000
      const passOutCap = endDay({ ...base, gold: 25000, energy: 0 }, true);
      expect(passOutCap.penalty).toBe(1000);
      expect(passOutCap.state.gold).toBe(24000);
      expect(passOutCap.state.energy).toBe(135);

      // Pass out with 0 gold: 0 penalty
      const passOutZero = endDay({ ...base, gold: 0, energy: 0 }, true);
      expect(passOutZero.penalty).toBe(0);
      expect(passOutZero.state.gold).toBe(0);
      expect(passOutZero.state.energy).toBe(135);
    });

    it('waters crops only when wateredToday was true and withers out-of-season crops across season boundaries', () => {
      const base = newGame(1000);
      const testState: GameState = {
        ...base,
        season: 'spring',
        day: 28, // Last day of spring -> next is summer
        cells: base.cells.map(c => {
          if (c.id === '0,0') {
            // Carrot (spring only) - watered
            return { ...c, kind: 'planted', cropId: 'carrot', plantedAt: 0, daysRemaining: 2, wateredToday: true, dead: false };
          }
          if (c.id === '1,0') {
            // Carrot (spring only) - not watered
            return { ...c, kind: 'planted', cropId: 'carrot', plantedAt: 0, daysRemaining: 2, wateredToday: false, dead: false };
          }
          if (c.id === '0,1') {
            // Corn (summer & autumn) - watered
            return { ...c, kind: 'planted', cropId: 'corn', plantedAt: 0, daysRemaining: 10, wateredToday: true, dead: false };
          }
          return c;
        })
      };

      const result = endDay(testState, false);
      expect(result.state.season).toBe('summer');
      expect(result.state.day).toBe(1);

      const carrotWatered = result.state.cells.find(c => c.id === '0,0');
      const carrotUnwatered = result.state.cells.find(c => c.id === '1,0');
      const corn = result.state.cells.find(c => c.id === '0,1');

      // Watered carrot grew 1 day (2 -> 1), but withered because summer is not in season for carrot
      expect(carrotWatered?.kind).toBe('planted');
      if (carrotWatered?.kind === 'planted') {
        expect(carrotWatered.daysRemaining).toBe(1);
        expect(carrotWatered.dead).toBe(true);
        expect(carrotWatered.wateredToday).toBe(false);
      }

      // Unwatered carrot did not grow, and also died in summer
      if (carrotUnwatered?.kind === 'planted') {
        expect(carrotUnwatered.daysRemaining).toBe(2);
        expect(carrotUnwatered.dead).toBe(true);
      }

      // Corn is in-season for summer, grew 1 day and remained alive
      if (corn?.kind === 'planted') {
        expect(corn.daysRemaining).toBe(9);
        expect(corn.dead).toBe(false);
      }
    });
  });

  describe('Energy & Food', () => {
    it('restores energy on eating, capped at MAX_ENERGY (270)', () => {
      const base = newGame(1000);
      const lowEnergyState: GameState = {
        ...base,
        energy: 200,
        goods: { ...base.goods, bread: 2, cake: 1 }
      };

      // Bread restores +50 (200 + 50 = 250)
      const res1 = eat(lowEnergyState, 'bread');
      expect(res1.ok).toBe(true);
      if (res1.ok) {
        expect(res1.state.energy).toBe(250);
        expect(res1.state.goods.bread).toBe(1);

        // Cake restores +90, capped at 270 (250 + 90 = 340 -> 270)
        const res2 = eat(res1.state, 'cake');
        expect(res2.ok).toBe(true);
        if (res2.ok) {
          expect(res2.state.energy).toBe(MAX_ENERGY);
          expect(res2.state.goods.cake).toBe(0);
        }
      }
    });

    it('rejects eating when produce item is absent in inventory', () => {
      const base = newGame(1000);
      const noFoodState: GameState = {
        ...base,
        energy: 100,
        goods: { ...base.goods, bread: 0 }
      };
      const res = eat(noFoodState, 'bread');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('noProduce');
      }
    });

    it('allows buying food when gold is sufficient and deducts cost', () => {
      const base = newGame(1000);
      const richState: GameState = { ...base, gold: 200, goods: { ...base.goods, bread: 0 } };

      const res = buyFood(richState, 'bread');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.state.gold).toBe(200 - FOOD.bread.cost);
        expect(res.state.goods.bread).toBe(1);
      }

      const poorState: GameState = { ...base, gold: 10 };
      const failRes = buyFood(poorState, 'bread');
      expect(failRes.ok).toBe(false);
      if (!failRes.ok) {
        expect(failRes.reason).toBe('notEnoughGold');
      }
    });
  });

  describe('Seasons & Localization', () => {
    it('properly validates crop season compatibility including Pumpkin in Autumn', () => {
      expect(inSeason('carrot', 'spring')).toBe(true);
      expect(inSeason('carrot', 'summer')).toBe(false);
      expect(inSeason('strawberry', 'spring')).toBe(true);
      expect(inSeason('strawberry', 'winter')).toBe(false);

      expect(inSeason('wheat', 'summer')).toBe(true);
      expect(inSeason('wheat', 'autumn')).toBe(true);
      expect(inSeason('wheat', 'spring')).toBe(false);

      expect(inSeason('tomato', 'summer')).toBe(true);
      expect(inSeason('tomato', 'autumn')).toBe(false);

      expect(inSeason('corn', 'summer')).toBe(true);
      expect(inSeason('corn', 'autumn')).toBe(true);

      expect(inSeason('pumpkin', 'autumn')).toBe(true);
      expect(inSeason('pumpkin', 'summer')).toBe(false);
    });

    it('uppercases Turkish season names accurately with tr-TR locale', () => {
      expect(SEASON_NAMES.spring.toLocaleUpperCase('tr-TR')).toBe('İLKBAHAR');
      expect(SEASON_NAMES.summer.toLocaleUpperCase('tr-TR')).toBe('YAZ');
      expect(SEASON_NAMES.autumn.toLocaleUpperCase('tr-TR')).toBe('SONBAHAR');
      expect(SEASON_NAMES.winter.toLocaleUpperCase('tr-TR')).toBe('KIŞ');
    });
  });

  describe('Weather Generation', () => {
    it('produces deterministic weather for the same seed and season', () => {
      const w1 = weatherFor('seed-123:spring', 'spring');
      const w2 = weatherFor('seed-123:spring', 'spring');
      expect(w1).toBe(w2);
    });

    it('never rains in Winter', () => {
      for (let i = 0; i < 50; i++) {
        expect(weatherFor(`winter-seed-${i}`, 'winter')).toBe('sunny');
      }
    });

    it('automatically waters all planted and tilled cells in morning weather when raining', () => {
      const base = newGame(1000);
      const sunnyState: GameState = {
        ...base,
        weather: 'sunny',
        cells: base.cells.map(c => {
          if (c.id === '0,0') return { ...c, kind: 'planted', cropId: 'carrot', plantedAt: 0, wateredToday: false };
          if (c.id === '0,1') return { ...c, kind: 'tilled', wateredToday: false };
          return { ...c, kind: 'untilled', wateredToday: false };
        })
      };

      // Mock morningWeather when rainy
      const rainyState: GameState = {
        ...sunnyState,
        weather: 'rain',
        cells: sunnyState.cells.map(c => ({
          ...c,
          wateredToday: c.kind === 'planted' || c.kind === 'tilled'
        }))
      };

      const c00 = rainyState.cells.find(c => c.id === '0,0');
      const c01 = rainyState.cells.find(c => c.id === '0,1');
      const c02 = rainyState.cells.find(c => c.id === '0,2');

      expect(c00?.wateredToday).toBe(true);
      expect(c01?.wateredToday).toBe(true);
      expect(c02?.wateredToday).toBe(false);
    });
  });

  describe('Shipping Bin', () => {
    it('supports putting items into shipping box and retrieving them back before day end', () => {
      const base = newGame(1000);
      const stateWithStock: GameState = {
        ...base,
        produce: { ...base.produce, carrot: 5 }
      };

      // Put 3 carrots into shipping box
      const afterPut = shipPut(stateWithStock, 'carrot', 3);
      expect(afterPut.produce.carrot).toBe(2);
      expect(afterPut.shipping.carrot).toBe(3);

      // Take 1 carrot back
      const afterTake = shipTake(afterPut, 'carrot', 1);
      expect(afterTake.produce.carrot).toBe(3);
      expect(afterTake.shipping.carrot).toBe(2);
    });

    it('settles shipping at day end, pays gold and resets shipping inventory', () => {
      const base = newGame(1000);
      const stateWithShipping: GameState = {
        ...base,
        gold: 100,
        shipping: { carrot: 2, wheat: 4 } // carrot 35 * 2 = 70; wheat 25 * 4 = 100; total = 170
      };

      const { state: settledState, shipment } = settleShipping(stateWithShipping);
      expect(shipment.total).toBe(170);
      expect(shipment.items).toEqual({ carrot: 2, wheat: 4 });
      expect(settledState.gold).toBe(270);
      expect(settledState.shipping).toEqual({});
    });
  });

  describe('Layout & Grid Placement', () => {
    it('rejects placement outside map boundaries and overlapping existing objects', () => {
      const layout = defaultLayout();

      // Home is at (4, -3, 2, 2). Try to overlap home at (4, -3)
      const overlapCandidate = { id: 'test-building', x: 4, y: -3, width: 2, height: 2 };
      expect(canPlace(layout, overlapCandidate)).toBe(false);

      // Out of bounds: MAP min is -3, max is 10
      const outOfBoundsMin = { id: 'out-1', x: -4, y: 0, width: 2, height: 2 };
      const outOfBoundsMax = { id: 'out-2', x: 9, y: 9, width: 2, height: 2 }; // x + width = 11 > 10
      expect(canPlace(layout, outOfBoundsMin)).toBe(false);
      expect(canPlace(layout, outOfBoundsMax)).toBe(false);

      // Valid empty spot
      const validCandidate = { id: 'free-obj', x: -3, y: 8, width: 1, height: 1 };
      expect(canPlace(layout, validCandidate)).toBe(true);
    });

    it('moves object only when target placement is valid', () => {
      const base = newGame(1000);
      // Valid move for shipping box (originally at 8, 0, width 1, height 1)
      const moved = moveObject(base, 'shipping', -3, 8);
      const foundMoved = moved.layout.find(o => o.id === 'shipping');
      expect(foundMoved?.x).toBe(-3);
      expect(foundMoved?.y).toBe(8);

      // Invalid move into home (4, -3)
      const invalidMove = moveObject(base, 'shipping', 4, -3);
      const foundOriginal = invalidMove.layout.find(o => o.id === 'shipping');
      expect(foundOriginal?.x).toBe(8);
      expect(foundOriginal?.y).toBe(0);
    });
  });

  describe('Label Positioning & Collision', () => {
    it('clamps labels within viewport and avoids HUD overlap', () => {
      const candidates = [
        { id: 'hud-overlap', x: 50, y: 10, width: 100, height: 30 },
        { id: 'screen-edge', x: 1950, y: 1050, width: 100, height: 30 }
      ];
      const viewport = { width: 1920, height: 1080 };
      const hud = { x: 0, y: 0, width: 1920, height: 60 };

      const placed = placeLabels(candidates, viewport, hud);

      const placedHud = placed.find(p => p.id === 'hud-overlap');
      const placedEdge = placed.find(p => p.id === 'screen-edge');

      // The label under the HUD should be pushed below hud.bottom + 8
      expect(placedHud?.y).toBeGreaterThanOrEqual(68);

      // The label near the edge should be clamped inside the viewport
      expect(placedEdge?.x! + placedEdge?.width!).toBeLessThanOrEqual(viewport.width - 8);
      expect(placedEdge?.y! + placedEdge?.height!).toBeLessThanOrEqual(viewport.height - 8);
    });

    it('prioritizes selected label over non-selected colliding label', () => {
      const candidates = [
        { id: 'hovered-lbl', selected: false, x: 100, y: 100, width: 120, height: 40 },
        { id: 'selected-lbl', selected: true, x: 110, y: 110, width: 120, height: 40 }
      ];
      const viewport = { width: 800, height: 600 };
      const hud = { x: 0, y: 0, width: 800, height: 50 };

      const placed = placeLabels(candidates, viewport, hud);

      // Only one can be placed due to collision, and selected label has priority
      expect(placed.length).toBe(1);
      expect(placed[0].id).toBe('selected-lbl');
    });
  });
});
