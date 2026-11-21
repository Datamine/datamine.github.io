import type { WorldPoint, Point, NumericVector, Ray } from './types/geometry.ts';
export interface CombatPoint extends WorldPoint {
  base?: number;
  y?: number;
}
interface CombatObstacle {
  arch?: string;
  solid?: boolean;
  sight?: { kind: string } | null;
  lo?: NumericVector;
  hi?: NumericVector;
  navigationPolygons?: number[][][];
}
import { rayBox, rayTriangle } from './geometry.ts';

/** Weapon reach is measured across map tiles. A slope does not shorten a
 * ranged weapon; the terrain ray below decides whether a hill blocks it. */
export function combatInRange(a: CombatPoint, b: CombatPoint, range: number) {
  return (
    Math.hypot(b.x - a.x, b.z - a.z) <= range + 0.001 &&
    (range > 1.5 || Math.abs((a.base ?? a.y ?? 0) - (b.base ?? b.y ?? 0)) <= 3)
  );
}

function pointInFootprint(x: number, z: number, polygon: number[][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}
function rayHitsFootprint(
  ray: Ray,
  polygon: number[][],
  bottom: number,
  top: number,
  distance: number,
) {
  if (
    ray.origin[1] >= bottom &&
    ray.origin[1] <= top &&
    pointInFootprint(ray.origin[0], ray.origin[2], polygon)
  )
    return true;
  const hits = (a: NumericVector, b: NumericVector, c: NumericVector) => {
    const t = rayTriangle(ray, a, b, c);
    return t !== null && t < distance - 0.2;
  };
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i],
      q = polygon[(i + 1) % polygon.length],
      a = [p[0], bottom, p[1]] satisfies [number, number, number],
      b = [q[0], bottom, q[1]] satisfies [number, number, number],
      c = [q[0], top, q[1]] satisfies [number, number, number],
      d = [p[0], top, p[1]] satisfies [number, number, number];
    if (hits(a, b, c) || hits(a, c, d)) return true;
    if (i > 0 && i < polygon.length - 1)
      for (const y of [bottom, top] satisfies [number, number])
        if (
          hits(
            [polygon[0][0], y, polygon[0][1]] satisfies [number, number, number],
            [p[0], y, p[1]] satisfies [number, number, number],
            [q[0], y, q[1]] satisfies [number, number, number],
          )
        )
          return true;
  }
  return false;
}

/** A scenery batch can span an entire neighborhood. Its bounding box is a
 * broad-phase test; only actual solid footprints can block an attack. The
 * same retained footprints work in both streamed clients and the server. */
export function combatLineClear(
  a: CombatPoint,
  b: CombatPoint,
  objects: readonly CombatObstacle[],
  ground: (x: number, z: number) => number = () => 0,
) {
  const ay = (a.base ?? a.y ?? ground(a.x, a.z)) + 1.14,
    by = (b.base ?? b.y ?? ground(b.x, b.z)) + 0.9;
  const distance = Math.hypot(b.x - a.x, by - ay, b.z - a.z);
  if (!distance) return true;
  const ray = {
    origin: [a.x, ay, a.z],
    dir: [(b.x - a.x) / distance, (by - ay) / distance, (b.z - a.z) / distance] satisfies [
      number,
      number,
      number,
    ],
  };
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25);
  for (let i = 1; i < steps; i++) {
    const f = i / steps,
      x = a.x + (b.x - a.x) * f,
      z = a.z + (b.z - a.z) * f;
    if (ground(x, z) > ay + (by - ay) * f - 0.04) return false;
  }
  for (const o of objects) {
    if (
      (!o.arch && !o.solid) ||
      o.arch === 'cow-pen' ||
      (['park', 'biosciences'] satisfies [string, string]).includes(o.sight?.kind || '')
    )
      continue;
    if (!o.lo || !o.hi) continue;
    const hit = rayBox(ray, o.lo, o.hi);
    if (hit === null || hit >= distance - 0.2) continue;
    if (o.navigationPolygons) {
      if (o.navigationPolygons.some((p) => rayHitsFootprint(ray, p, o.lo![1], o.hi![1], distance)))
        return false;
    } else return false;
  }
  return true;
}

/** Choose a reachable standing point for the selected weapon, rather than
 * sending every creature through a railgun-specific click handler. */
export function combatApproach({
  from,
  target,
  range,
  free,
  ground,
  lineClear,
  pathTo,
  canTravel,
}: {
  from: Point;
  target: CombatPoint;
  range: number;
  free: (x: number, y: number) => boolean;
  ground: (x: number, z: number) => number;
  lineClear: (from: CombatPoint, to: CombatPoint) => boolean;
  pathTo: (x: number, y: number, from: Point) => unknown;
  canTravel: (ax: number, ay: number, bx: number, by: number, ignore?: boolean) => boolean;
}) {
  const valid = (p: Point) => {
    const origin = { x: p.x + 0.5, z: p.y + 0.5, base: ground(p.x + 0.5, p.y + 0.5) },
      end = { ...target, base: target.base ?? ground(target.x, target.z) };
    return (
      combatInRange(origin, end, range) &&
      free(p.x, p.y) &&
      (range > 1.5 || canTravel(p.x, p.y, target.x - 0.5, target.z - 0.5, true)) &&
      lineClear(origin, end)
    );
  };
  if (valid(from)) return { ...from };
  const candidates = [];
  for (const radius of [range * 0.88, range * 0.6, Math.min(0.8, range * 0.65)] satisfies [
    number,
    number,
    number,
  ])
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8,
        p = {
          x: target.x - 0.5 + Math.cos(angle) * radius,
          y: target.z - 0.5 + Math.sin(angle) * radius,
        };
      if (valid(p)) candidates.push(p);
    }
  candidates.sort(
    (a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y),
  );
  for (const p of candidates) if (pathTo(p.x, p.y, from)) return p;
  return null;
}
