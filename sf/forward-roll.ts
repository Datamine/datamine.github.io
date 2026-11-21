import { isFiniteNumber } from './types/json.ts';
import type { Mesh } from './geometry.ts';
import type { LocalPlayer } from './types/world.ts';

export const FORWARD_ROLL_DURATION = 0.75;
export const FORWARD_ROLL_SPEED = 1.18;
const rollEase = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};

export function sampleForwardRoll(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return {
    progress: t,
    tuck: rollEase(t / 0.18) * (1 - rollEase((t - 0.82) / 0.18)),
    pitch: Math.PI * 2 * rollEase((t - 0.16) / 0.68),
  };
}
export function createForwardRoll() {
  const state = { active: false, elapsed: 0 };
  return {
    state,
    start() {
      if (state.active) return false;
      state.active = true;
      state.elapsed = 0;
      return true;
    },
    cancel() {
      state.active = false;
      state.elapsed = 0;
    },
    update(dt: unknown) {
      if (!state.active || !isFiniteNumber(dt) || dt <= 0) return;
      state.elapsed = Math.min(FORWARD_ROLL_DURATION, state.elapsed + dt);
      if (state.elapsed >= FORWARD_ROLL_DURATION - 1e-9) state.active = false;
    },
    get progress() {
      return state.elapsed / FORWARD_ROLL_DURATION;
    },
  };
}

/** Trace the same native traversal rule as walking, stopping before the first
 * obstruction. Rolling never turns an invalid destination into a shortcut. */
export function forwardRollTarget(
  from: Pick<LocalPlayer, 'x' | 'y'>,
  heading: unknown,
  distance: unknown,
  canTravel: (from: Pick<LocalPlayer, 'x' | 'y'>, to: Pick<LocalPlayer, 'x' | 'y'>) => boolean,
) {
  if (!isFiniteNumber(distance) || distance <= 0 || !isFiniteNumber(heading)) return null;
  const steps = Math.max(1, Math.ceil(distance / 0.1)),
    dx = Math.cos(heading),
    dy = Math.sin(heading);
  let target = null;
  for (let i = 1; i <= steps; i++) {
    const length = (distance * i) / steps,
      next = { x: from.x + dx * length, y: from.y + dy * length };
    if (!canTravel(from, next)) break;
    target = next;
  }
  return target;
}

/** Rotate the already skinned, tucked body about its lateral axis. Sample a
 * local terrain plane once; grounding the support point avoids both floating
 * and underground frames without thousands of terrain queries per frame. */
export function applyForwardRollMesh(
  m: Mesh,
  start: number,
  x: number,
  base: number,
  z: number,
  heading: number,
  progress: number,
  ground: (value0: number, value1: number) => number = () => base - 0.07,
  walkable: ((x: number, z: number) => boolean) | null = null,
) {
  const { pitch } = sampleForwardRoll(progress);
  const c = Math.cos(pitch),
    s = Math.sin(pitch),
    fx = Math.cos(heading),
    fz = Math.sin(heading),
    pivot = base + 0.72;
  const floor = ground(x, z),
    support = (a: number, b: number) => (!walkable || walkable(a, b) ? ground(a, b) : floor);
  // Across a bridge edge or seawall, the sea below is not a support surface.
  const gx = (support(x + 0.35, z) - support(x - 0.35, z)) / 0.7,
    gz = (support(x, z + 0.35) - support(x, z - 0.35)) / 0.7;
  let lowest = Infinity;
  for (let i = start; i < m.data.length; i += 11) {
    const dx = m.data[i] - x,
      dz = m.data[i + 2] - z,
      u = dx * fx + dz * fz,
      h = m.data[i + 1] - pivot,
      forward = u * c + h * s;
    m.data[i] = x + dx + fx * (forward - u);
    m.data[i + 2] = z + dz + fz * (forward - u);
    m.data[i + 1] = pivot + h * c - u * s;
    const nu = m.data[i + 3] * fx + m.data[i + 5] * fz,
      ny = m.data[i + 4],
      turned = nu * c + ny * s;
    m.data[i + 3] += fx * (turned - nu);
    m.data[i + 5] += fz * (turned - nu);
    m.data[i + 4] = ny * c - nu * s;
    lowest = Math.min(
      lowest,
      m.data[i + 1] - floor - gx * (m.data[i] - x) - gz * (m.data[i + 2] - z),
    );
  }
  if (!Number.isFinite(lowest)) return;
  const correction = 0.035 - lowest;
  for (let i = start; i < m.data.length; i += 11) m.data[i + 1] += correction;
}
