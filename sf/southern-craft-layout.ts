import type { Parcel } from './types/parcels.ts';
import type { Vec2, Point } from './types/geometry.ts';
import { requiredValue } from './types/assert.ts';
export interface CraftPlot extends Parcel {
  id: string;
  rotation: number;
  kind: string;
  index: number;
  street?: string;
  palette: readonly string[];
  entry?: Point;
}
interface CraftSegment {
  a: Vec2;
  b: Vec2;
  name?: string;
  r?: number;
}
type CraftNearest<T extends CraftSegment> = T & { x: number; z: number; distance: number };
import { SOUTHERN_PALETTES, southernHousingStyle } from './neighborhood-palette.ts';
import { SOUTHERN_HOUSING, SOUTHERN_TRAILS } from './southern-layout.ts';
import { SOUTHERN_ROADS, airportRoadDistance } from './airship.ts';
import { PENINSULA_RESERVATIONS } from './peninsula-urbanism.ts';
import { westernCoastX } from './coastline.ts';
import { inEstateDistrict } from './estate-layout.ts';
import { inSocialGrounds } from './social-layout.ts';

export function craftPoint(
  p: Pick<Parcel, 'x' | 'z' | 'rotation'>,
  u: number,
  v: number,
): [number, number] {
  const a = p.rotation || 0;
  return [p.x + u * Math.cos(a) - v * Math.sin(a), p.z + u * Math.sin(a) + v * Math.cos(a)];
}
export function craftFootprint(p: Readonly<Parcel>, w = p.w, d = p.d) {
  return [
    [-w / 2, -d / 2] satisfies [number, number],
    [w / 2, -d / 2] satisfies [number, number],
    [w / 2, d / 2] satisfies [number, number],
    [-w / 2, d / 2] satisfies [number, number],
  ].map(([u, v]) => craftPoint(p, u, v));
}
export function craftBounds(p: Readonly<Parcel>) {
  const poly = craftFootprint(p);
  return [
    Math.min(...poly.map((v) => v[0])),
    Math.min(...poly.map((v) => v[1])),
    Math.max(...poly.map((v) => v[0])),
    Math.max(...poly.map((v) => v[1])),
  ] satisfies [number, number, number, number];
}
const craftOverlap = (a: number[], b: number[], gap = 0.18) =>
  a[0] < b[2] + gap && a[2] > b[0] - gap && a[1] < b[3] + gap && a[3] > b[1] - gap;
const craftRoadSegments = SOUTHERN_ROADS.flatMap((r) =>
  r.points.slice(1).map((b, i) => ({ a: r.points[i], b, name: r.name })),
);
const craftTrailSegments = SOUTHERN_TRAILS.flatMap((r) =>
  r.points.slice(1).map((b, i) => ({ a: r.points[i], b, r: r.halfWidth + 0.3 })),
);
function craftNearest<T extends CraftSegment>(
  x: number,
  z: number,
  segments: readonly T[],
): CraftNearest<T> | { distance: number } {
  let best: CraftNearest<T> | { distance: number } = { distance: Infinity };
  for (const s of segments) {
    const dx = s.b[0] - s.a[0],
      dz = s.b[1] - s.a[1],
      t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / (dx * dx + dz * dz))),
      xx = s.a[0] + t * dx,
      zz = s.a[1] + t * dz,
      distance = Math.hypot(x - xx, z - zz);
    if (distance < best.distance) best = { ...s, x: xx, z: zz, distance };
  }
  return best;
}
export function craftSiteFits(p: Readonly<Parcel>, occupied: readonly Parcel[] = []) {
  const box = craftBounds(p);
  if (
    box[1] < 97.1 ||
    box[3] > 177 ||
    box[2] > 82 ||
    inEstateDistrict(p.x, p.z) ||
    inSocialGrounds(p.x, p.z, 1)
  )
    return false;
  if (
    [
      ...SOUTHERN_HOUSING.map(craftBounds),
      ...PENINSULA_RESERVATIONS,
      ...occupied.map(craftBounds),
    ].some((q) => craftOverlap(box, q))
  )
    return false;
  for (let z = box[1]; z <= box[3] + 0.01; z += 0.2)
    for (let x = box[0]; x <= box[2] + 0.01; x += 0.2) {
      if (x < westernCoastX(z) + 1.15 || airportRoadDistance(x, z) < 0.62) return false;
      if (craftTrailSegments.some((s) => craftNearest(x, z, [s]).distance < s.r)) return false;
    }
  return true;
}
const craftAnchors = [
  [18, 102.5, 'market'] satisfies [number, number, string],
  [24.8, 102.5, 'garden'] satisfies [number, number, string],
  [18, 108.6, 'studio'] satisfies [number, number, string],
  [25, 108.6, 'garden'] satisfies [number, number, string],
  [32, 108.5, 'arcade'] satisfies [number, number, string],
  [39, 108.5, 'garden'] satisfies [number, number, string],
  [46, 108.5, 'studio'] satisfies [number, number, string],
  [53, 102.5, 'arcade'] satisfies [number, number, string],
  [32, 115.5, 'garden'] satisfies [number, number, string],
  [39, 115.5, 'studio'] satisfies [number, number, string],
  [46, 115.5, 'garden'] satisfies [number, number, string],
  [53, 115.5, 'market'] satisfies [number, number, string],
  [18, 122.8, 'garden'] satisfies [number, number, string],
  [25, 122.8, 'studio'] satisfies [number, number, string],
  [32, 123.5, 'garden'] satisfies [number, number, string],
  [39, 123, 'arcade'] satisfies [number, number, string],
  [46, 123, 'garden'] satisfies [number, number, string],
  [53, 123, 'studio'] satisfies [number, number, string],
  [18, 131.2, 'market'] satisfies [number, number, string],
  [32, 131.2, 'garden'] satisfies [number, number, string],
  [18, 139, 'garden'] satisfies [number, number, string],
  [25, 139.2, 'market'] satisfies [number, number, string],
  [32, 139, 'studio'] satisfies [number, number, string],
  [18, 147.5, 'studio'] satisfies [number, number, string],
  [25, 147.5, 'garden'] satisfies [number, number, string],
  [32, 147.5, 'arcade'] satisfies [number, number, string],
  [39, 148, 'garden'] satisfies [number, number, string],
  [46, 148, 'market'] satisfies [number, number, string],
  [53, 148, 'garden'] satisfies [number, number, string],
  [18, 155.5, 'garden'] satisfies [number, number, string],
  [25, 155.5, 'market'] satisfies [number, number, string],
  [32, 155.5, 'garden'] satisfies [number, number, string],
  [39, 155.5, 'studio'] satisfies [number, number, string],
  [46, 155.5, 'arcade'] satisfies [number, number, string],
  [53, 155.5, 'garden'] satisfies [number, number, string],
  [18, 163.4, 'arcade'] satisfies [number, number, string],
  [25, 163.4, 'garden'] satisfies [number, number, string],
  [32, 163.4, 'market'] satisfies [number, number, string],
  [39, 163.4, 'garden'] satisfies [number, number, string],
  [46, 160.8, 'studio'] satisfies [number, number, string],
  [53, 163.4, 'garden'] satisfies [number, number, string],
  [15.8, 172, 'market'] satisfies [number, number, string],
  [21, 173.9, 'garden'] satisfies [number, number, string],
  [25, 173.9, 'garden'] satisfies [number, number, string],
  [29, 173.9, 'garden'] satisfies [number, number, string],
  [33.5, 173.9, 'garden'] satisfies [number, number, string],
  [41, 164, 'studio'] satisfies [number, number, string],
  [46, 162.5, 'arcade'] satisfies [number, number, string],
  [53, 160.5, 'market'] satisfies [number, number, string],
  [76, 157.7, 'garden'] satisfies [number, number, string],
  [77.1, 162.1, 'studio'] satisfies [number, number, string],
  [77.5, 169.5, 'garden'] satisfies [number, number, string],
];
/** Curated centers resolve only within their own block. Exact plot, route and
 * protected-land tests replace arbitrary decoration scattered over the map. */
export function planSouthernCraft() {
  const plots: Readonly<CraftPlot>[] = [];
  for (const [index, [ax, az, kind]] of craftAnchors.entries()) {
    let found = null;
    for (const [dx, dz] of [
      [0, 0] satisfies [number, number],
      [-0.65, 0] satisfies [number, number],
      [0.65, 0] satisfies [number, number],
      [0, -0.35] satisfies [number, number],
      [0, 0.35] satisfies [number, number],
      [0, -0.65] satisfies [number, number],
      [0, 0.65] satisfies [number, number],
      [-1.2, 0] satisfies [number, number],
      [1.2, 0] satisfies [number, number],
      [0, -1.2] satisfies [number, number],
      [0, 1.2] satisfies [number, number],
    ]) {
      const x = ax + dx,
        z = az + dz,
        road = craftNearest(x, z, craftRoadSegments);
      if (!('a' in road)) continue;
      const rotation =
          kind === 'garden' && z > 172
            ? 0
            : Math.abs(road.b[0] - road.a[0]) > Math.abs(road.b[1] - road.a[1])
              ? z > road.z
                ? Math.PI
                : 0
              : x > road.x
                ? Math.PI / 2
                : -Math.PI / 2,
        w = kind === 'garden' ? 1.85 : 2.65,
        d = kind === 'garden' ? 1.4 : 2.4;
      const p: CraftPlot = {
        id: 'southern-craft-' + index,
        x,
        z,
        w,
        d,
        rotation,
        kind,
        index,
        street: requiredValue(road.name, 'Craft road name'),
        palette: SOUTHERN_PALETTES[southernHousingStyle({ x, z })],
      };
      if (road.distance > 7 || !craftSiteFits(p, plots)) continue;
      const entry = craftPoint(p, 0, d / 2 + 0.3);
      p.entry = { x: entry[0] - 0.5, y: entry[1] - 0.5 };
      found = p;
      break;
    }
    if (found) plots.push(Object.freeze(found));
  }
  return Object.freeze(plots);
}
export const SOUTHERN_CRAFT = planSouthernCraft();
export function inSouthernCraft(x: number, z: number, margin = 0) {
  return SOUTHERN_CRAFT.some((p) => {
    const a = p.rotation,
      c = Math.cos(a),
      s = Math.sin(a),
      dx = x - p.x,
      dz = z - p.z;
    return (
      Math.abs(dx * c + dz * s) < p.w / 2 + margin && Math.abs(-dx * s + dz * c) < p.d / 2 + margin
    );
  });
}
