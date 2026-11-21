import type { Parcel } from './types/parcels.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** Authored public space and parcels; shared by housing, planting and paving. */
export const BAYVIEW_COMMON = Object.freeze({
  id: 'bayview-common',
  label: contentText('south-bay-layout.module.label-1', {}),
  west: 57.5,
  east: 61.5,
  north: 100.45,
  south: 104.5,
  entry: { x: 59, y: 99.7 },
});
export const AIRPORT_GARDEN_DISTRICT = Object.freeze({
  west: 75.55,
  east: 80.65,
  north: 96.6,
  south: 104.45,
});
export const AIRPORT_AD_GARDEN = Object.freeze({
  west: 82.2,
  east: 85.1,
  north: 86.3,
  south: 95.8,
});
export const AIRPORT_GARDEN_HOMES = Object.freeze(
  [
    { x: 76.85, z: 98.15, w: 2.1, d: 2, rotation: Math.PI, seed: 0.21, district: 'coastal' },
    { x: 79.25, z: 98.15, w: 2.2, d: 2, rotation: Math.PI, seed: 0.66, district: 'craftsman' },
    { x: 76.85, z: 103, w: 2.1, d: 1.8, rotation: 0, seed: 0.43, district: 'mediterranean' },
  ].map((p) => Object.freeze({ ...p, relocated: true })),
);
export const AIRPORT_GARDEN_OFFICES = Object.freeze([
  {
    id: 'bayshore-design-studio',
    label: contentText('south-bay-layout.module.label-2', {}),
    x: 76.85,
    z: 100.9,
    w: 1.7,
    d: 1.5,
    rotation: Math.PI,
    height: 1.8,
    entry: { x: 76.35, y: 99.4 },
    seed: 0.31,
  },
  {
    id: 'redwood-office-court',
    label: contentText('south-bay-layout.module.label-3', {}),
    x: 79.4,
    z: 102.5,
    w: 1.8,
    d: 2.35,
    rotation: Math.PI,
    height: 2.8,
    entry: { x: 78.9, y: 100.7 },
    seed: 0.73,
  },
]);
export const SOUTH_BAY_RESERVES = Object.freeze([BAYVIEW_COMMON, AIRPORT_GARDEN_DISTRICT]);
export function inSouthBayReserve(x: number, z: number, margin = 0) {
  return SOUTH_BAY_RESERVES.some(
    (b) =>
      x > b.west - margin && x < b.east + margin && z > b.north - margin && z < b.south + margin,
  );
}
export function southBayPlotOverlaps(p: Readonly<Parcel>) {
  const horizontal = Math.abs(Math.sin(p.rotation || 0)) < 0.5,
    w = horizontal ? p.w : p.d,
    d = horizontal ? p.d : p.w;
  return SOUTH_BAY_RESERVES.some(
    (b) =>
      p.x + w / 2 > b.west &&
      p.x - w / 2 < b.east &&
      p.z + d / 2 > b.north &&
      p.z - d / 2 < b.south,
  );
}
const nearLine = (
  x: number,
  z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  r: number,
) => {
  const dx = bx - ax,
    dz = bz - az,
    t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz) < r;
};
export function southBaySurfaceAt(x: number, z: number) {
  const p = BAYVIEW_COMMON;
  if (x >= p.west && x <= p.east && z >= p.north && z <= p.south)
    return nearLine(x, z, 59.5, p.north, 59.5, p.south, 0.3) ||
      nearLine(x, z, p.west, 102.5, p.east, 102.5, 0.27)
      ? 'path'
      : 'grass';
  const c = AIRPORT_GARDEN_DISTRICT;
  if (x >= c.west && x <= c.east && z >= c.north && z <= c.south)
    return ([96.75, 99.7, 104.15] satisfies [number, number, number]).some(
      (zz) => Math.abs(z - zz) < 0.23,
    ) ||
      (Math.abs(x - 78.15) < 0.23 && z > 99.4)
      ? 'path'
      : 'grass';
  return null;
}
