import { isFiniteNumber } from './types/json.ts';
import type { AircraftPoint, BomberDescent, BomberState } from './types/aircraft.ts';
import type { WorldPoint } from './types/geometry.ts';
import { MONSTER_STATS } from './monster-drops.ts';

export const BOMBER_SPEED = 8,
  BOMBER_BOOST_SPEED = 140,
  BOMBER_ALTITUDE = 20,
  BOMBER_AIRSHIP_CLEARANCE = 8,
  BOMBER_ROLL_SECONDS = 1.4,
  BOMB_COOLDOWN_MS = 20000,
  BOMB_DAMAGE = 100,
  BOMB_WIDTH = 3,
  BOMB_FALL_MS = 1500;
export const BOMBER_LAUNCH = Object.freeze({ x: -24, y: BOMBER_ALTITUDE, z: 106 });
export const BOMBER_REPLACEMENT_MESSAGE = 'The Illuminati will pay for another one.';
export function bomberCruiseHeight(airshipHeight = 28) {
  return Math.max(BOMBER_ALTITUDE, airshipHeight - BOMBER_AIRSHIP_CLEARANCE);
}
export function bomberFlightHeight(
  x: number,
  z: number,
  ground: (x: number, z: number) => number,
  cruiseHeight = BOMBER_ALTITUDE,
) {
  return Math.max(cruiseHeight, ground(x, z) + 5);
}
/** Find a real walkable landing, including when ejecting offshore. This runs
 * only on ejection, uses native surface/collision rules, and has bounded work. */
export function bomberLanding(
  x: number,
  z: number,
  {
    free,
    ground,
    fallback,
  }: {
    free: (x: number, z: number) => boolean;
    ground: (x: number, z: number) => number;
    fallback?: WorldPoint;
  },
) {
  let best = free(x, z) ? { x, z } : null;
  for (let radius = 2; !best && radius <= 512; radius += 2) {
    for (let i = 0; i < 64; i++) {
      const angle = (i * Math.PI) / 32,
        xx = x + Math.cos(angle) * radius,
        zz = z + Math.sin(angle) * radius;
      if (free(xx, zz)) {
        best = { x: xx, z: zz };
        break;
      }
    }
  }
  if (!best && fallback && free(fallback.x, fallback.z)) best = { ...fallback };
  if (!best) return null;
  return { x: best.x, y: ground(best.x, best.z), z: best.z };
}
export function createBomberDescent(from: AircraftPoint, to: AircraftPoint, heading = 0) {
  return {
    from: { ...from },
    to: { ...to },
    heading,
    duration: Math.max(
      4,
      Math.min(12, Math.max((from.y - to.y) / 6, Math.hypot(to.x - from.x, to.z - from.z) / 12)),
    ),
  };
}
export function bomberDescentPoint(flight: BomberDescent, elapsed: number) {
  const t = Math.max(0, Math.min(1, elapsed / flight.duration)),
    ease = t * t * (3 - 2 * t),
    { from, to } = flight;
  return {
    x: from.x + (to.x - from.x) * ease,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * ease,
  };
}
export function bombTileArea(x: number, z: number) {
  return { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5, halfWidth: BOMB_WIDTH / 2 };
}
export function monsterInBombArea(
  actor: WorldPoint & {
    combatKind?: string;
    questRole?: string;
    alienId?: string;
    networkPlayer?: boolean;
    hp: number;
  },
  area: WorldPoint & { halfWidth: number },
) {
  const stats = MONSTER_STATS[actor.combatKind || ''];
  return (
    !!stats &&
    !stats.quest &&
    !actor.questRole &&
    !actor.alienId &&
    !actor.networkPlayer &&
    actor.hp > 0 &&
    Math.abs(actor.x - area.x) < area.halfWidth &&
    Math.abs(actor.z - area.z) < area.halfWidth
  );
}
export function createStealthBomber({
  ground = () => 0,
  now = Date.now,
  cruiseHeight = () => BOMBER_ALTITUDE,
  boostSpeed = () => BOMBER_BOOST_SPEED,
}: {
  ground?: (x: number, z: number) => number;
  now?: () => number;
  cruiseHeight?: () => number;
  boostSpeed?: () => number;
} = {}) {
  const state: BomberState = {
    active: false,
    phase: 'ground',
    position: { ...BOMBER_LAUNCH },
    heading: 0,
    bank: 0,
    rollAngle: 0,
    rollElapsed: null as 0 | number | null,
    rollStart: 0,
    speed: 0,
    boost: false,
    target: null as { x: number; z: number } | null,
    bombReadyAt: 0,
    descent: null,
    elapsed: 0,
  };
  function board(position: AircraftPoint = BOMBER_LAUNCH) {
    Object.assign(state, {
      active: true,
      phase: 'flying',
      position: {
        ...position,
        y: bomberFlightHeight(position.x, position.z, ground, cruiseHeight()),
      },
      heading: position.angle || 0,
      target: null,
      bank: 0,
      rollAngle: 0,
      rollElapsed: null,
      rollStart: 0,
      speed: 0,
      boost: false,
      descent: null,
      elapsed: 0,
    });
  }
  function barrelRoll() {
    if (!state.active || state.phase !== 'flying' || state.rollElapsed !== null) return false;
    state.rollStart = state.rollAngle;
    state.rollElapsed = 0;
    return true;
  }
  function eject(flight: BomberDescent) {
    if (!state.active || state.phase !== 'flying') return false;
    Object.assign(state, {
      phase: 'parachuting',
      descent: flight,
      elapsed: 0,
      position: { ...flight.from },
      heading: flight.heading,
      target: null,
      boost: false,
      speed: 0,
      rollAngle: 0,
      rollElapsed: null,
    });
    return true;
  }
  function target(x: unknown, z: unknown) {
    if (
      !state.active ||
      state.phase !== 'flying' ||
      !isFiniteNumber(x) ||
      !isFiniteNumber(z) ||
      Math.abs(x) > 5000 ||
      Math.abs(z) > 5000
    )
      return false;
    state.target = { x, z };
    return true;
  }
  function update(dt: unknown, { boost = false } = {}) {
    if (!state.active || !isFiniteNumber(dt)) return;
    const stepTime = Math.max(0, dt);
    if (state.phase === 'parachuting') {
      state.elapsed += stepTime;
      state.position = bomberDescentPoint(state.descent!, state.elapsed);
      return state.elapsed >= state.descent!.duration ? 'landed' : null;
    }
    const goal = state.target,
      p = state.position;
    let turn = 0;
    state.boost = boost;
    state.speed = 0;
    if (goal) {
      const dx = goal.x - p.x,
        dz = goal.z - p.z,
        d = Math.hypot(dx, dz),
        desired = Math.atan2(dz, dx),
        delta = Math.atan2(Math.sin(desired - state.heading), Math.cos(desired - state.heading));
      turn = Math.max(-1, Math.min(1, delta));
      state.heading += delta * (1 - Math.exp(-stepTime * 3));
      const step = Math.min(d, (boost ? boostSpeed() : BOMBER_SPEED) * stepTime);
      state.speed = stepTime ? step / stepTime : 0;
      p.x += (dx / (d || 1)) * step;
      p.z += (dz / (d || 1)) * step;
      if (d <= step + 0.02) state.target = null;
    }
    p.y = bomberFlightHeight(p.x, p.z, ground, cruiseHeight());
    state.bank += (turn * 0.3 - state.bank) * (1 - Math.exp(-stepTime * 4));
    if (state.rollElapsed !== null) {
      state.rollElapsed = Math.min(BOMBER_ROLL_SECONDS, state.rollElapsed + stepTime);
      const t = state.rollElapsed / BOMBER_ROLL_SECONDS;
      state.rollAngle = state.rollStart + Math.PI * 2 * t * t * (3 - 2 * t);
      if (t === 1) state.rollElapsed = null;
    }
  }
  return {
    state,
    board,
    eject,
    target,
    barrelRoll,
    update,
    stop() {
      Object.assign(state, {
        active: false,
        phase: 'ground',
        target: null,
        boost: false,
        speed: 0,
        descent: null,
        rollAngle: 0,
        rollElapsed: null,
      });
    },
    get bombSeconds() {
      return Math.max(0, Math.ceil((state.bombReadyAt - now()) / 1000));
    },
  };
}
