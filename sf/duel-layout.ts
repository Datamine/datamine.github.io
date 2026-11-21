// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** The pen, open gate, raised deck and ramp share these world coordinates. */
export const DUEL_ARENA = Object.freeze({
  id: 'duel-arena',
  label: contentText('duel-layout.module.label-1', {}),
  x: 45.5,
  z: 163.3,
  w: 3,
  d: 3,
  base: 2.4,
  rise: 0.24,
  west: 43.3,
  east: 48,
  north: 161.1,
  south: 166.4,
  entry: Object.freeze({ x: 45, y: 165.8 }),
});
export function atDuelArena(x: number, z: number) {
  const a = DUEL_ARENA;
  return x >= a.west && x <= a.east && z >= a.north && z <= a.south;
}
export function duelDeckHeightAt(x: number, z: number) {
  const a = DUEL_ARENA;
  if (Math.abs(x - a.x) <= 1.5 && Math.abs(z - a.z) <= 1.5) return a.base + a.rise + 0.015;
  if (Math.abs(x - a.x) < 0.61 && z > a.z + 1.5 && z < a.z + 2.9)
    return a.base + a.rise * (1 - (z - a.z - 1.5) / 1.4) + 0.015;
  return null;
}
export const DUEL_PATH = Object.freeze({
  name: contentText('duel-layout.module.name-2', {}),
  halfWidth: 0.35,
  points: [[49.5, 166] satisfies [number, number], [45.5, 166] satisfies [number, number]],
});
