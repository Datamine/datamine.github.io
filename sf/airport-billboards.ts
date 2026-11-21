import type { WorldObject, SignAtlas } from './types/world.ts';
export interface AirportBillboardPlan {
  id: string;
  art: string;
  side: string;
  near: readonly number[];
  compact?: boolean;
  width: number;
  x: number;
  z: number;
  roadX: number;
  street: string;
  angle: number;
  polygon: number[][];
  clearing: number[][];
}
export type AirportBillboard = AirportBillboardPlan & { base: number; object: WorldObject };
export type AirportFieldBillboard = (typeof AIRPORT_FIELD_ADS)[number] & {
  base: number;
  object: WorldObject;
};

import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

const airportAdvertisers = [
  { id: 'airport-openai', art: 'ai-openai', z: 81.9 },
  { id: 'airport-anthropic', art: 'ai-anthropic', z: 83.25 },
  { id: 'airport-xai', art: 'ai-xai', z: 84.6 },
];
export const AIRPORT_ADS: readonly {
  id: string;
  art: string;
  side: string;
  near: readonly number[];
  compact?: boolean;
}[] = Object.freeze([
  ...(['east', 'west'] satisfies [string, string]).flatMap((side) =>
    airportAdvertisers.map((ad) =>
      Object.freeze({
        id: ad.id + (side === 'west' ? '-west' : ''),
        art: ad.art,
        side,
        near: Object.freeze([side === 'east' ? 84 : 79, ad.z]),
      }),
    ),
  ),
  ...(['ai-openai', 'ai-anthropic', 'ai-xai'] satisfies [string, string, string]).map((art, i) =>
    Object.freeze({
      id: 'airport-east-column-' + i,
      art,
      side: 'east',
      compact: true,
      near: Object.freeze([83.12, 87.5 + i * 3] satisfies [number, number]),
    }),
  ),
]);
export const AIRPORT_BILLBOARD_PLOT = Object.freeze({
  width: 2.3,
  depth: 0.8,
  clearingWidth: 2.4,
  clearingDepth: 1.2,
});
const airportFieldRoadX = (70.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE;
const airportAdRect = (x: number, z: number, w: number, d: number) => [
  [x - w / 2, z - d / 2] satisfies [number, number],
  [x + w / 2, z - d / 2] satisfies [number, number],
  [x + w / 2, z + d / 2] satisfies [number, number],
  [x - w / 2, z + d / 2] satisfies [number, number],
];
/** Authored openings in the green strip immediately west of the terminal
 * approach. Keep the cross streets and the existing estate frontage clear. */
export const AIRPORT_FIELD_ADS = Object.freeze(
  (['ai-openai', 'ai-anthropic', 'ai-xai'] satisfies [string, string, string]).map((art, i) => {
    const x = airportFieldRoadX - 2.2,
      z = ([106.8, 115.6, 128] satisfies [number, number, number])[i];
    return Object.freeze({
      id: 'airport-field-ad-' + i,
      art,
      x,
      z,
      angle: 0,
      side: 'west',
      area: 'airport-field',
      street: 'Third Street south',
      roadX: airportFieldRoadX,
      polygon: airportAdRect(x, z, 2.3, 0.8),
      clearing: airportAdRect(x, z, 2.4, 1.2),
    });
  }),
);
export function inAirportFieldBillboards(x: number, z: number, margin = 0) {
  return AIRPORT_FIELD_ADS.some(
    (p) => Math.abs(x - p.x) < 1.2 + margin && Math.abs(z - p.z) < 0.6 + margin,
  );
}

/** Panels always run east–west, across the direction of arriving traffic.
 * Reserve their clearings before houses are placed, on both road verges. */
export function planAirportBillboards({
  routes,
  fits,
  curbWidth = 0.25,
}: {
  routes: readonly { name: string; points: readonly (readonly number[])[]; halfWidth: number }[];
  fits: (polygon: number[][]) => boolean;
  curbWidth?: number;
}) {
  const plans: AirportBillboardPlan[] = [],
    rect = (x: number, z: number, w: number, d: number) => [
      [x - w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z + d / 2] satisfies [number, number],
      [x - w / 2, z + d / 2] satisfies [number, number],
    ];
  for (const ad of AIRPORT_ADS) {
    const size = ad.compact
      ? { width: 1.5, depth: 0.8, clearingWidth: 1.6, clearingDepth: 1.2 }
      : AIRPORT_BILLBOARD_PLOT;
    let best: AirportBillboardPlan | null = null,
      score = Infinity;
    for (const road of routes)
      if ((['Third Street', 'Third Street south'] satisfies [string, string]).includes(road.name)) {
        const [a, b] = road.points;
        if (Math.abs(b[0] - a[0]) > 0.01) continue;
        const offset =
            road.halfWidth + curbWidth + size.clearingWidth / 2 + (ad.compact ? 0.03 : 0.15),
          roadX = a[0],
          x = roadX + (ad.side === 'east' ? offset : -offset);
        for (
          let z = Math.max(79, Math.min(a[1], b[1]) + 0.65);
          z < Math.min(95.3, Math.max(a[1], b[1]) - 0.65);
          z += 0.125
        ) {
          const distance = (x - ad.near[0]) ** 2 + (z - ad.near[1]) ** 2;
          if (distance >= score) continue;
          const clearing = rect(x, z, size.clearingWidth, size.clearingDepth);
          if (
            plans.some(
              (p) =>
                Math.abs(p.x - x) < (p.width + size.width) / 2 + 0.1 &&
                Math.abs(p.z - z) < size.clearingDepth,
            ) ||
            !fits(clearing)
          )
            continue;
          score = distance;
          best = {
            ...ad,
            width: size.width,
            x,
            z,
            roadX,
            street: road.name,
            angle: 0,
            polygon: rect(x, z, size.width, size.depth),
            clearing,
          };
        }
      }
    if (!best || score > 100) throw new Error('No clear airport-road billboard plot for ' + ad.id);
    plans.push(best);
  }
  return plans;
}

export function drawAirportBillboard(
  m: Mesh,
  signs: SignAtlas,
  {
    x,
    z,
    angle,
    base,
    art,
    width = 2.3,
  }: { x: number; z: number; angle: number; base: number; art: string; width?: number },
) {
  const start = m.data.length;
  pose(m, 0, base, 0, 0, () => {
    // Two supports, service catwalk and a restrained, double-sided panel.
    for (const xx of [-0.7, 0.7] satisfies [number, number]) {
      m.box(xx - 0.13, -0.08, -0.19, 0.26, 0.2, 0.38, '#adb4ae', 'stone');
      m.rod(
        [xx, 0, 0] satisfies [number, number, number],
        [xx, 2.5, 0] satisfies [number, number, number],
        0.045,
        '#667e82',
        10,
        { metal: 0.2 },
      );
    }
    m.box(-1.04, 1.31, -0.14, 2.08, 1.28, 0.28, '#34484f', { metal: 0.2 });
    const uv = signs.get(art);
    if (uv)
      for (const side of [-1, 1] satisfies [number, number]) {
        const points = [
          [-1, 1.35, side * 0.149] satisfies [number, number, number],
          [1, 1.35, side * 0.149] satisfies [number, number, number],
          [1, 2.55, side * 0.149] satisfies [number, number, number],
          [-1, 2.55, side * 0.149] satisfies [number, number, number],
        ];
        m.quad(
          ...(side === 1
            ? ([points[0], points[1], points[2], points[3]] as const)
            : ([points[1], points[0], points[3], points[2]] as const)),
          [1.06, 1.06, 1.06] satisfies [number, number, number],
          uv,
        );
      }
    m.box(-1.09, 1.27, -0.24, 2.18, 0.055, 0.48, '#819292', { metal: 0.3 });
    for (const xx of [-0.8, 0.8] satisfies [number, number]) {
      m.rod(
        [xx, 2.63, 0] satisfies [number, number, number],
        [xx, 2.68, 0.27] satisfies [number, number, number],
        0.015,
        '#668088',
        6,
      );
      m.box(xx - 0.1, 2.63, 0.25, 0.2, 0.045, 0.12, '#e6e2cc', { emissive: 0.35 });
    }
  });
  const c = Math.cos(angle),
    s = Math.sin(angle),
    scale = width / 2.3;
  for (let i = start; i < m.data.length; i += 11) {
    const xx = m.data[i] * scale,
      zz = m.data[i + 2],
      nx = m.data[i + 3] / scale,
      nz = m.data[i + 5],
      norm = Math.hypot(nx, m.data[i + 4], nz);
    m.data[i] = x + xx * c - zz * s;
    m.data[i + 2] = z + xx * s + zz * c;
    m.data[i + 3] = (nx * c - nz * s) / norm;
    m.data[i + 4] /= norm;
    m.data[i + 5] = (nx * s + nz * c) / norm;
  }
}
