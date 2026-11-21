import type { Parcel, ParcelRectangle } from './types/parcels.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** Small courts and individual lots finish the southern residential blocks.
 * Reserve the courts before procedural frontage is generated. +Z faces a lane. */
export const SUBURBAN_COURTS = Object.freeze([
  {
    name: contentText('suburban-layout.module.name-1', {}),
    points: [[42.5, 163.5] satisfies [number, number], [37.8, 163.5] satisfies [number, number]],
  },
  {
    name: contentText('suburban-layout.module.name-2', {}),
    points: [[28.5, 163.5] satisfies [number, number], [32, 163.5] satisfies [number, number]],
  },
  {
    name: contentText('suburban-layout.module.name-3', {}),
    points: [[21.5, 155.5] satisfies [number, number], [25, 155.5] satisfies [number, number]],
  },
]);
export const SUBURBAN_RESERVES = Object.freeze([
  [36.3, 160.35, 41.7, 166.65] satisfies [number, number, number, number],
  [29.4, 160.35, 34.6, 166.65] satisfies [number, number, number, number],
  [22.8, 152.35, 27.2, 158.65] satisfies [number, number, number, number],
]);
export const SUBURBAN_PARCELS = Object.freeze(
  [
    { x: 37.8, z: 161.5, w: 2.6, d: 2.05, rotation: 0, lowRiseStyle: 'craftsman' },
    { x: 40.5, z: 161.5, w: 2.05, d: 2.05, rotation: 0, lowRiseStyle: 'bungalow' },
    { x: 37.8, z: 165.5, w: 2.6, d: 2.05, rotation: Math.PI, lowRiseStyle: 'eichler' },
    { x: 40.5, z: 165.5, w: 2.05, d: 2.05, rotation: Math.PI, lowRiseStyle: 'craftsman' },
    { x: 31.9, z: 161.5, w: 3.9, d: 2.05, rotation: 0, lowRiseStyle: 'eichler' },
    { x: 31.9, z: 165.5, w: 3.9, d: 2.05, rotation: Math.PI, lowRiseStyle: 'bungalow' },
    { x: 25, z: 153.5, w: 3.8, d: 2.05, rotation: 0, lowRiseStyle: 'craftsman' },
    { x: 25, z: 157.5, w: 3.8, d: 2.05, rotation: Math.PI, lowRiseStyle: 'eichler' },
  ].map((p, i) =>
    Object.freeze({
      ...p,
      seed: 0.13 + i * 0.107,
      authoredSuburb: true,
      street: i < 4 ? 'Palm Court' : i < 6 ? 'Cypress Court' : 'Orchard Place',
    }),
  ),
);
export const CUPERTINO_PATHS = Object.freeze([
  {
    name: contentText('suburban-layout.module.name-4', {}),
    halfWidth: 0.32,
    points: [[38.7, 169.1] satisfies [number, number], [43, 169.1] satisfies [number, number]],
  },
  {
    name: contentText('suburban-layout.module.name-5', {}),
    halfWidth: 0.28,
    points: [
      [38.7, 172.7] satisfies [number, number],
      [38.7, 177.6] satisfies [number, number],
      [43, 178] satisfies [number, number],
      [47, 177.6] satisfies [number, number],
      [47, 174.5] satisfies [number, number],
    ],
  },
]);
export function overlapsSuburbanCourt(p: Readonly<Parcel>) {
  const sideways = Math.abs(Math.sin(p.rotation || 0)) > 0.5,
    w = sideways ? p.d : p.w,
    d = sideways ? p.w : p.d;
  return SUBURBAN_RESERVES.some(
    ([a, b, c, e]) => p.x + w / 2 > a && p.x - w / 2 < c && p.z + d / 2 > b && p.z - d / 2 < e,
  );
}
export function suburbanStyleFor(p: Readonly<Parcel>) {
  if (p.lowRiseStyle) return p.lowRiseStyle;
  if (p.x < 16 || p.x > 53.8 || p.z < 148 || p.z > 173 || p.w < 2.5 || p.d < 1.85) return null;
  const n = Math.abs(Math.floor(p.x * 13 + p.z * 7));
  return (
    ['eichler', 'bungalow', 'craftsman', 'bungalow', 'eichler'] satisfies [
      string,
      string,
      string,
      string,
      string,
    ]
  )[n % 5];
}
/** Rendered solids and native walking use these same local rectangles. */
export function suburbanPlan(p: Readonly<Parcel>) {
  const style = p.lowRiseStyle || suburbanStyleFor(p),
    garage =
      p.w >= 3.65 && p.d >= 2
        ? { x: p.w / 2 - 1.0, z: -p.d / 2 + 0.15, w: 0.84, d: p.d - 0.6 }
        : null;
  const left = -p.w / 2 + 0.14,
    right = garage ? garage.x - 0.16 : p.w / 2 - 0.14;
  const house = { x: left, z: -p.d / 2 + 0.16, w: right - left, d: p.d - 0.65 },
    front = house.z + house.d;
  return {
    style,
    house,
    garage,
    front,
    entry: { x: house.x + house.w * 0.54, z: p.d / 2 - 0.05 },
    height: style === 'craftsman' ? 1.83 : style === 'bungalow' ? 1.76 : 1.7,
  };
}
export function suburbanSolidAt(p: Readonly<Parcel>, x: number, z: number, padding = 0) {
  const plan = suburbanPlan(p);
  return [plan.house, plan.garage, ...suburbanGardenFences(p)]
    .filter((r): r is ParcelRectangle => r !== null)
    .some(
      (r) =>
        x > r.x - padding &&
        x < r.x + r.w + padding &&
        z > r.z - padding &&
        z < r.z + r.d + padding,
    );
}

export function suburbanGardenFences(p: Readonly<Parcel>) {
  const plan = suburbanPlan(p),
    left = -p.w / 2 + 0.08,
    right = plan.garage ? plan.garage.x - 0.12 : p.w / 2 - 0.08,
    z = p.d / 2 - 0.07,
    gate = plan.entry.x;
  return [
    { x: left, z: z - 0.035, w: Math.max(0, gate - 0.31 - left), d: 0.07 },
    { x: gate + 0.31, z: z - 0.035, w: Math.max(0, right - gate - 0.31), d: 0.07 },
  ].filter((r) => r.w > 0.12);
}
