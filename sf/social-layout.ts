import type { RoomGeometry } from './types/interiors.ts';
import type { ParcelRectangle } from './types/parcels.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { westernCoastX } from './coastline.ts';

// Roughly three seven-tile blocks south of SF Zoo, facing a shared public walk.
export const TWITTER_HQ = Object.freeze({
  id: 'twitter-hq',
  label: contentText('social-layout.module.label-1', {}),
  x: 18.8,
  z: 114.8,
  w: 4.4,
  d: 3.6,
  base: 3,
  front: 1,
  entry: Object.freeze({ x: 18.3, y: 117 }),
  inside: Object.freeze({ x: 18.3, y: 115.6 }),
});
export const SALES_CONFERENCE = Object.freeze({
  id: 'sales-conference',
  label: contentText('social-layout.module.label-2', {}),
  x: 24.8,
  z: 114.8,
  w: 4.4,
  d: 3.6,
  base: 3,
  front: 1,
  entry: Object.freeze({ x: 24.3, y: 117 }),
  inside: Object.freeze({ x: 24.3, y: 115.6 }),
});
export const SOCIAL_PATHS = Object.freeze([
  {
    name: contentText('social-layout.module.name-3', {}),
    halfWidth: 0.36,
    points: [
      [14.5, 117.5] satisfies [number, number],
      [18.8, 117.5] satisfies [number, number],
      [24.8, 117.5] satisfies [number, number],
      [28.5, 117.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('social-layout.module.name-4', {}),
    halfWidth: 0.36,
    points: [[18.8, 117.5] satisfies [number, number], [18.8, 116.35] satisfies [number, number]],
  },
  {
    name: contentText('social-layout.module.name-5', {}),
    halfWidth: 0.36,
    points: [[24.8, 117.5] satisfies [number, number], [24.8, 116.35] satisfies [number, number]],
  },
]);
export const BOTTLE_STREAM = Object.freeze({
  halfWidth: 0.23,
  points: Object.freeze(
    [
      [16.48, 114.05] satisfies [number, number],
      [15.5, 114.05] satisfies [number, number],
      [14.5, 114.05] satisfies [number, number],
      [13.35, 114.05] satisfies [number, number],
      [12.6, 114.35] satisfies [number, number],
      [11.6, 114.15] satisfies [number, number],
      [10.65, 114.4] satisfies [number, number],
      [westernCoastX(114.4) - 0.65, 114.4] satisfies [number, number],
    ].map((value) => Object.freeze(value)),
  ),
  culvert: Object.freeze({ west: 13.68, east: 15.32, north: 113.7, south: 114.4 }),
});
const socialStreamBounds = {
  west: Math.min(...BOTTLE_STREAM.points.map((p) => p[0])) - BOTTLE_STREAM.halfWidth,
  east: 16.48 + BOTTLE_STREAM.halfWidth,
  north: 113.82,
  south: 114.63,
};
export function streamProjection(x: number, z: number) {
  let best: {
    distance: number;
    x?: number;
    z?: number;
    t?: number;
    index?: number;
    angle?: number;
  } = { distance: Infinity };
  for (let i = 1; i < BOTTLE_STREAM.points.length; i++) {
    const a = BOTTLE_STREAM.points[i - 1],
      b = BOTTLE_STREAM.points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      length = Math.hypot(dx, dz),
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (length * length))),
      xx = a[0] + dx * t,
      zz = a[1] + dz * t,
      distance = Math.hypot(x - xx, z - zz);
    if (distance < best.distance)
      best = { distance, x: xx, z: zz, t, index: i - 1, angle: Math.atan2(dz, dx) };
  }
  return best;
}
export function streamDistance(x: number, z: number) {
  return streamProjection(x, z).distance - BOTTLE_STREAM.halfWidth;
}
export function inStreamCulvert(x: number, z: number) {
  const c = BOTTLE_STREAM.culvert;
  return x >= c.west && x <= c.east && z >= c.north && z <= c.south;
}
export function inBottleStream(x: number, z: number, margin = 0) {
  const b = socialStreamBounds;
  return (
    x >= b.west - margin &&
    x <= b.east + margin &&
    z >= b.north - margin &&
    z <= b.south + margin &&
    !inStreamCulvert(x, z) &&
    streamDistance(x, z) < margin
  );
}
export function inSocialGrounds(x: number, z: number, margin = 0) {
  return (
    [TWITTER_HQ, SALES_CONFERENCE].some(
      (s) =>
        Math.abs(x - s.x) < s.w / 2 + 0.25 + margin && Math.abs(z - s.z) < s.d / 2 + 0.75 + margin,
    ) || streamDistance(x, z) < 0.35 + margin
  );
}
export function socialFixtures(room: RoomGeometry) {
  const box = (id: string, x: number, z: number, w: number, d: number) => ({ id, x, z, w, d });
  return room.id === 'twitter-hq'
    ? [
        box('bottle-belt', -0.99, -0.75, 2.4, 0.57),
        box('envelopes', 1.03, -1.27, 1.45, 0.39),
        box('poster-desk', 1.35, 0.18, 0.62, 0.68),
        box('poster-chair', 1.35, 0.86, 0.42, 0.42),
      ]
    : [
        box('redhead-booth', -1.43, -0.95, 0.7, 1.0),
        box('sales-screen', 1.33, -1.33, 1.08, 0.24),
        box('coffee', 1.53, 1.12, 0.52, 0.42),
      ];
}
export function socialLocalPoint(room: RoomGeometry, u: number, v: number) {
  const a = room.rotation || 0;
  return {
    x: room.x + u * Math.cos(a) - v * Math.sin(a),
    z: room.z + u * Math.sin(a) + v * Math.cos(a),
  };
}
export function socialRect(room: RoomGeometry, r: ParcelRectangle) {
  return [
    [r.x - r.w / 2, r.z - r.d / 2] satisfies [number, number],
    [r.x + r.w / 2, r.z - r.d / 2],
    [r.x + r.w / 2, r.z + r.d / 2],
    [r.x - r.w / 2, r.z + r.d / 2],
  ].map(([u, v]) => {
    const p = socialLocalPoint(room, u, v);
    return [p.x, p.z] satisfies [number, number];
  });
}
