import { isSafeInteger, isFiniteNumber, isRecord } from './types/json.ts';
import type { Economy, Health } from './types/controllers.ts';

import { ITEM_STATS } from './item-stats.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import type { Point } from './types/geometry.ts';

export const DELI_PRICES = Object.freeze({
  pickup: ITEM_STATS.sandwich.pickupPrice,
  delivery: ITEM_STATS.sandwich.deliveryPrice,
  inNOut: ITEM_STATS.sandwich.inNOutPrice,
});
export const DELIVERY_SPEED = 6;
/** Coordinates here are the navigation model's logical x/y, not mesh centers.
 * A delivery is paid for only after a real route exists. Replanning is bounded
 * to once per second; every movement follows that same adjacency graph. */
export function createDeli({
  economy,
  health,
  origin,
  routeTo,
  canTravel,
  saved: savedInput = {},
  onSave = () => {},
  onMessage = () => {},
  capacity = () => 5,
}: {
  economy: Economy;
  health: Pick<Health, 'heal' | 'state'>;
  origin: Point;
  routeTo: (target: Point, from: Point) => Point[] | null;
  canTravel: (from: Point, to: Point) => boolean;
  saved?: unknown;
  onSave?: (value: { sandwiches: number; pending: boolean }) => void;
  onMessage?: (message: string) => void;
  capacity?: () => number;
}) {
  const saved = isRecord(savedInput) ? savedInput : {};
  const state = {
    sandwiches: isSafeInteger(saved.sandwiches) ? Math.max(0, saved.sandwiches) : 0,
    pending: !!saved.pending,
    position: { ...origin },
    path: [] as Point[],
    angle: 0,
    travel: 0,
    arrived: false,
  };
  let replan = 1,
    lastGoal: { x: number; y: number } | null = null;
  const save = () => onSave({ sandwiches: state.sandwiches, pending: state.pending });
  const findRoute = (target: { x: number; y: number }) => {
    const path = routeTo(target, state.position);
    if (!path) return false;
    let previous = state.position;
    for (const p of path) {
      if (!canTravel(previous, p)) return false;
      previous = p;
    }
    if (Math.hypot(previous.x - target.x, previous.y - target.y) > 0.01) return false;
    state.path = path.map((p) => ({ ...p }));
    lastGoal = { ...target };
    return true;
  };
  return {
    state,
    storeSandwich(amount = 1) {
      if (
        !Number.isSafeInteger(amount) ||
        amount < 1 ||
        !Number.isSafeInteger(state.sandwiches + amount) ||
        state.sandwiches + amount + (state.pending ? 1 : 0) > capacity()
      )
        return false;
      state.sandwiches += amount;
      save();
      return true;
    },
    pickup(store = 'lucindas') {
      if (state.sandwiches + (state.pending ? 1 : 0) >= capacity())
        return { ok: false, message: 'Your sandwich bag is full (' + capacity() + ').' };
      const burger = store === 'in-n-out',
        result = economy.trade(burger ? 'sandwich-in-n-out' : 'sandwich-pickup');
      if (!result.ok) return result;
      state.sandwiches++;
      save();
      return {
        ok: true,
        message:
          'A fresh ' +
          (burger
            ? 'In-N-Out sandwich, yours for ' + DELI_PRICES.inNOut
            : 'Lucinda’s sandwich, yours for ' + DELI_PRICES.pickup) +
          ' coins. Eat it to restore up to ' +
          ITEM_STATS.sandwich.healing +
          ' hitpoints.',
      };
    },
    order(target: { x: number; y: number }) {
      if (state.sandwiches >= capacity())
        return { ok: false, message: 'Your sandwich bag is full (' + capacity() + ').' };
      if (state.pending)
        return { ok: false, message: 'Your DoorDash cooler is already on its way.' };
      state.position = { ...origin };
      if (!findRoute(target))
        return {
          ok: false,
          message:
            'The cooler needs a route to you. Order from a street, park, or other walkable ground.',
        };
      const result = economy.trade('sandwich-delivery');
      if (!result.ok) {
        state.path = [];
        return result;
      }
      state.pending = true;
      state.arrived = false;
      replan = 0;
      save();
      return {
        ok: true,
        message:
          'DoorDash ordered · 4 coins. A little cooler on wheels is bringing your Lucinda’s sandwich.',
      };
    },
    eat() {
      if (!state.sandwiches)
        return {
          ok: false,
          message: 'You do not have a sandwich.',
        };
      if (health.state.hp >= health.state.max)
        return {
          ok: false,
          message: 'You already have full hitpoints. Save the sandwich for later.',
        };
      const healed = health.heal();
      state.sandwiches--;
      save();
      return { ok: true, message: 'You eat a sandwich and restore ' + healed + ' hitpoints.' };
    },
    update(
      dt: unknown,
      target: Point,
      { deliverable = true }: { deliverable?: boolean } | undefined = {},
    ) {
      if (!state.pending || !isFiniteNumber(dt) || dt <= 0) return;
      replan += dt;
      if (replan >= 1) {
        replan = 0;
        if (
          deliverable &&
          (!lastGoal ||
            Math.hypot(target.x - lastGoal.x, target.y - lastGoal.y) > 0.4 ||
            !state.path.length)
        )
          findRoute(target);
      }
      let budget = dt * DELIVERY_SPEED;
      while (budget > 0 && state.path.length) {
        const next = state.path[0],
          dx = next.x - state.position.x,
          dy = next.y - state.position.y,
          d = Math.hypot(dx, dy);
        if (d > 1e-8) state.angle = Math.atan2(dy, dx);
        const step = Math.min(budget, d);
        if (d) {
          state.position.x += (dx / d) * step;
          state.position.y += (dy / d) * step;
        }
        state.travel += step;
        budget -= step;
        if (d <= step + 1e-8) state.path.shift();
      }
      if (
        deliverable &&
        Math.hypot(state.position.x - target.x, state.position.y - target.y) < 0.8 &&
        canTravel(state.position, target)
      ) {
        state.pending = false;
        state.arrived = true;
        state.sandwiches++;
        state.path = [];
        save();
        onMessage(
          'Your DoorDash cooler arrives! One Lucinda’s sandwich is in your bag. Eat it whenever you need hitpoints.',
        );
      }
    },
  };
}

export function drawDeliveryCooler(
  m: Mesh,
  state: Pick<ReturnType<typeof createDeli>['state'], 'position' | 'angle'>,
  ground: (x: number, z: number) => number,
) {
  const p = state.position,
    x = p.x + 0.5,
    z = p.y + 0.5;
  pose(m, x, ground(x, z) + 0.06, z, state.angle, () => {
    for (const a of [-0.22, 0.22] satisfies [number, number])
      for (const side of [-1, 1] satisfies [number, number])
        m.sphere(a, 0.13, side * 0.25, 0.105, 0.105, 0.045, '#39454b', 12, 6);
    m.box(-0.34, 0.19, -0.23, 0.68, 0.42, 0.46, '#f3f0e6');
    m.box(-0.36, 0.58, -0.25, 0.72, 0.09, 0.5, '#e35a44');
    for (const side of [-1, 1] satisfies [number, number]) {
      m.box(-0.19, 0.28, side * 0.234, 0.36, 0.17, 0.012, '#da4e3c');
      m.box(-0.1, 0.34, side * 0.245, 0.2, 0.04, 0.015, '#fff5de');
    }
    m.rod(
      [-0.23, 0.65, 0.14] satisfies [number, number, number],
      [-0.23, 1.35, 0.14] satisfies [number, number, number],
      0.012,
      '#d7dfe0',
      8,
    );
    m.quad(
      [-0.23, 1.35, 0.14] satisfies [number, number, number],
      [-0.23, 1.14, 0.14] satisfies [number, number, number],
      [0.07, 1.14, 0.14] satisfies [number, number, number],
      [0.1, 1.35, 0.14] satisfies [number, number, number],
      '#e4533c',
    );
    m.box(0.342, 0.43, -0.17, 0.012, 0.06, 0.11, '#bce1e0', { emissive: 0.3 });
    m.box(0.342, 0.43, 0.06, 0.012, 0.06, 0.11, '#bce1e0', { emissive: 0.3 });
    m.box(0.345, 0.26, -0.09, 0.02, 0.045, 0.18, '#43545b');
  });
}
