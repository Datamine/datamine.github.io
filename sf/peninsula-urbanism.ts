import type { Parcel } from './types/parcels.ts';

interface InfillRoute {
  name: string;
  points: readonly (readonly number[])[];
}
interface InfillParcel extends Parcel {
  infill: boolean;
  district?: string;
}
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import {
  SOUTHERN_MAP_END,
  PENINSULA_HIGHWAY_X,
  STARTUP_SITE,
  SOUTHERN_COUNTRY_RESERVES,
} from './southern-countryside-layout.ts';
import { SUBURBAN_RESERVES } from './suburban-layout.ts';
import { DUEL_ARENA } from './duel-layout.ts';
import { SOUTHERN_VILLAGE } from './southern-village-layout.ts';
import { AIRPORT_FIELD_ADS } from './airport-billboards.ts';
import { TWITTER_HQ, SALES_CONFERENCE } from './social-layout.ts';
import { APPLE_CAMPUS, ROBOTAXI_DEALER } from './tech-layout.ts';
import { HABERDASHER } from './haberdasher-layout.ts';
import { SALT_FLATS } from './salt-layout.ts';
import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.ts';
import { SQUARE_DIGSITE } from './square-construction-layout.ts';
import { JURASSIC, COW_PEN } from './jurassic-layout.ts';
import { GPU_FACTORY } from './gpu-layout.ts';
import { ARMORY } from './armory-layout.ts';
import { SOUTH_BAY_RESERVES } from './south-bay-layout.ts';
import { SETTLEMENT_RESERVES } from './southern-settlement-layout.ts';
const peninsulaSecond = (64.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE,
  peninsulaThird = (70.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE;
export const PENINSULA_TRUNK_STREETS = Object.freeze([
  {
    name: contentText('peninsula-urbanism.module.name-1', {}),
    points: [
      [peninsulaThird, (77.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE] satisfies [number, number],
      [peninsulaThird, SOUTHERN_MAP_END - 0.75] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-2', {}),
    points: [
      [STARTUP_SITE.x - 1.5, 132.5] satisfies [number, number],
      [peninsulaThird, 132.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-3', {}),
    points: [
      [peninsulaSecond, (77.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE] satisfies [number, number],
      [peninsulaSecond, 132.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-4', {}),
    points: [
      [peninsulaSecond, 112.1] satisfies [number, number],
      [peninsulaThird, 112.1] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-5', {}),
    points: [
      [peninsulaThird, 109.5] satisfies [number, number],
      [84.5, 109.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-6', {}),
    points: [
      [peninsulaSecond - 11, 129.8] satisfies [number, number],
      [peninsulaThird, 129.8] satisfies [number, number],
    ],
  },
]);
// Each connection is authored around the zoo, gym, woods, and civic facilities.
export const PENINSULA_INFILL_STREETS = Object.freeze([
  {
    name: contentText('peninsula-urbanism.module.name-7', {}),
    points: [
      [14.5, 99.5] satisfies [number, number],
      [14.5, 111.7] satisfies [number, number],
      [14.5, 127.5] satisfies [number, number],
      [14.5, 143.5] satisfies [number, number],
      [14.5, 159.5] satisfies [number, number],
      [14.5, 167.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-8', {}),
    points: [
      [14.5, 105.5] satisfies [number, number],
      [21.5, 105.5] satisfies [number, number],
      [28.5, 105.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-9', {}),
    points: [[14.5, 99.5] satisfies [number, number], [28.5, 99.5] satisfies [number, number]],
  },
  {
    name: contentText('peninsula-urbanism.module.name-10', {}),
    points: [
      [14.5, 111.7] satisfies [number, number],
      [21.5, 111.7] satisfies [number, number],
      [28.5, 111.7] satisfies [number, number],
      [35.5, 111.7] satisfies [number, number],
      [42.5, 111.7] satisfies [number, number],
      [49.5, 111.7] satisfies [number, number],
      [56.5, 111.7] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-11', {}),
    points: [[14.5, 119.5] satisfies [number, number], [21.5, 119.5] satisfies [number, number]],
  },
  {
    name: contentText('peninsula-urbanism.module.name-12', {}),
    points: [[14.5, 127.5] satisfies [number, number], [21.5, 127.5] satisfies [number, number]],
  },
  {
    name: contentText('peninsula-urbanism.module.name-13', {}),
    points: [[14.5, 135.5] satisfies [number, number], [21.5, 135.5] satisfies [number, number]],
  },
  {
    name: contentText('peninsula-urbanism.module.name-14', {}),
    points: [[14.5, 143.5] satisfies [number, number], [21.5, 143.5] satisfies [number, number]],
  },
  {
    name: contentText('peninsula-urbanism.module.name-15', {}),
    points: [
      [42.5, 105.5] satisfies [number, number],
      [42.5, 111.7] satisfies [number, number],
      [42.5, 119.5] satisfies [number, number],
      [42.5, 127.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-16', {}),
    points: [
      [49.5, 105.5] satisfies [number, number],
      [49.5, 111.7] satisfies [number, number],
      [49.5, 119.5] satisfies [number, number],
      [49.5, 127.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-17', {}),
    points: [
      [35.5, 127.5] satisfies [number, number],
      [42.5, 127.5] satisfies [number, number],
      [49.5, 127.5] satisfies [number, number],
      [56.5, 127.5] satisfies [number, number],
      [62.5, 127.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-18', {}),
    points: [
      [35.5, 145.5] satisfies [number, number],
      [42.5, 145.5] satisfies [number, number],
      [56.5, 145.5] satisfies [number, number],
      [68.5, 145.5] satisfies [number, number],
      [81.5, 145.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-19', {}),
    points: [
      [21.5, 143.5] satisfies [number, number],
      [21.5, 151.5] satisfies [number, number],
      [21.5, 159.5] satisfies [number, number],
      [21.5, 167.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-20', {}),
    points: [
      [28.5, 143.5] satisfies [number, number],
      [28.5, 151.5] satisfies [number, number],
      [28.5, 159.5] satisfies [number, number],
      [28.5, 167.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-21', {}),
    points: [
      [35.5, 143.5] satisfies [number, number],
      [35.5, 151.5] satisfies [number, number],
      [35.5, 159.5] satisfies [number, number],
      [35.5, 167.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-22', {}),
    points: [
      [42.5, 145.5] satisfies [number, number],
      [42.5, 151.5] satisfies [number, number],
      [42.5, 159.5] satisfies [number, number],
      [42.5, 167.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-23', {}),
    points: [
      [49.5, 145.5] satisfies [number, number],
      [49.5, 151.5] satisfies [number, number],
      [49.5, 159.5] satisfies [number, number],
      [49.5, 164.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-24', {}),
    points: [
      [14.5, 151.5] satisfies [number, number],
      [28.5, 151.5] satisfies [number, number],
      [42.5, 151.5] satisfies [number, number],
      [56.5, 151.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-25', {}),
    points: [
      [14.5, 159.5] satisfies [number, number],
      [28.5, 159.5] satisfies [number, number],
      [42.5, 159.5] satisfies [number, number],
      [56.5, 159.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-26', {}),
    points: [
      [14.5, 167.5] satisfies [number, number],
      [28.5, 167.5] satisfies [number, number],
      [42.5, 167.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-27', {}),
    points: [
      [68.5, 129.8] satisfies [number, number],
      [68.5, 137.5] satisfies [number, number],
      [72.5, 137.5] satisfies [number, number],
      [72.5, 145.5] satisfies [number, number],
      [72.5, 154.5] satisfies [number, number],
      [72.5, 164.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-28', {}),
    points: [
      [68.5, 137.5] satisfies [number, number],
      [75.5, 137.5] satisfies [number, number],
      [PENINSULA_HIGHWAY_X, 137.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-29', {}),
    points: [
      [70, 154.5] satisfies [number, number],
      [75.5, 154.5] satisfies [number, number],
      [81.5, 154.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-30', {}),
    points: [
      [56.5, 164.5] satisfies [number, number],
      [68.5, 164.5] satisfies [number, number],
      [81.5, 164.5] satisfies [number, number],
    ],
  },
]);
export const SAND_HILL_WOODS = Object.freeze({
  id: 'sand-hill-woods',
  label: contentText('peninsula-urbanism.module.label-31', {}),
  west: 37.5,
  east: 52,
  north: 129,
  south: 144.4,
  entry: { x: 48, y: 137 },
});
export const SAND_HILL_PATHS = Object.freeze([
  {
    name: contentText('peninsula-urbanism.module.name-32', {}),
    halfWidth: 0.34,
    points: [
      [48.5, 137.5] satisfies [number, number],
      [50.5, 139] satisfies [number, number],
      [49, 142.5] satisfies [number, number],
      [43, 143] satisfies [number, number],
      [39, 140.5] satisfies [number, number],
      [39, 133] satisfies [number, number],
      [42, 130.5] satisfies [number, number],
      [48, 130.5] satisfies [number, number],
      [50.5, 133] satisfies [number, number],
      [50.5, 139] satisfies [number, number],
    ],
  },
  {
    name: contentText('peninsula-urbanism.module.name-33', {}),
    halfWidth: 0.34,
    points: [[42.5, 127.5] satisfies [number, number], [42, 130.5] satisfies [number, number]],
  },
  {
    name: contentText('peninsula-urbanism.module.name-34', {}),
    halfWidth: 0.34,
    points: [[43, 143] satisfies [number, number], [42.5, 145.5] satisfies [number, number]],
  },
]);
export const PENINSULA_GREENS = Object.freeze([
  {
    id: 'ocean-pocket-garden',
    label: contentText('peninsula-urbanism.module.label-35', {}),
    x: 17.8,
    z: 123.4,
    w: 3.4,
    d: 4.3,
    entry: { x: 17.3, y: 126 },
  },
  {
    id: 'bayshore-pocket-garden',
    label: contentText('peninsula-urbanism.module.label-36', {}),
    x: 77.2,
    z: 148.9,
    w: 4.4,
    d: 4.5,
    entry: { x: 76.75, y: 145.5 },
  },
]);
// Protected public land and existing facilities. A plot must clear both this
// registry and every actual road/path, rather than assuming empty space is a lot.
export const PENINSULA_RESERVATIONS = Object.freeze([
  ...SUBURBAN_RESERVES,
  ...SOUTHERN_COUNTRY_RESERVES,
  ...SETTLEMENT_RESERVES,
  [STARTUP_SITE.x - 2.2, 132.9, STARTUP_SITE.x + 2.2, 136.4] satisfies [
    number,
    number,
    number,
    number,
  ],
  [
    DUEL_ARENA.west - 0.25,
    DUEL_ARENA.north - 0.25,
    DUEL_ARENA.east + 0.25,
    DUEL_ARENA.south + 0.25,
  ] satisfies [number, number, number, number],
  [
    SOUTHERN_VILLAGE.west,
    SOUTHERN_VILLAGE.north,
    SOUTHERN_VILLAGE.east,
    SOUTHERN_VILLAGE.south,
  ] satisfies [number, number, number, number],
  ...SOUTH_BAY_RESERVES.map((b) => [b.west, b.north, b.east, b.south]),
  [
    ARMORY.x - ARMORY.d / 2 - 0.6,
    ARMORY.z - ARMORY.w / 2 - 0.2,
    ARMORY.x + ARMORY.d / 2 + 0.2,
    ARMORY.z + ARMORY.w / 2 + 0.2,
  ] satisfies [number, number, number, number],
  ...AIRPORT_FIELD_ADS.map(
    (p) => [p.x - 1.2, p.z - 0.6, p.x + 1.2, p.z + 0.6] satisfies [number, number, number, number],
  ),
  ...[TWITTER_HQ, SALES_CONFERENCE].map(
    (s) =>
      [
        s.x - s.w / 2 - 0.25,
        s.z - s.d / 2 - 0.3,
        s.x + s.w / 2 + 0.25,
        s.z + s.d / 2 + 1.2,
      ] satisfies [number, number, number, number],
  ),
  [
    APPLE_CAMPUS.x - 3.9,
    APPLE_CAMPUS.z - 4.3,
    APPLE_CAMPUS.x + 3.9,
    APPLE_CAMPUS.z + 3.9,
  ] satisfies [number, number, number, number],
  [
    ROBOTAXI_DEALER.x - 1.8,
    ROBOTAXI_DEALER.z - 2.2,
    ROBOTAXI_DEALER.x + 1.8,
    ROBOTAXI_DEALER.z + 2,
  ] satisfies [number, number, number, number],
  [
    HABERDASHER.x - HABERDASHER.w / 2 - 0.15,
    HABERDASHER.z - HABERDASHER.d / 2 - 0.15,
    HABERDASHER.x + HABERDASHER.w / 2 + 0.15,
    HABERDASHER.z + HABERDASHER.d / 2 + 0.15,
  ] satisfies [number, number, number, number],
  [SALT_FLATS.west, SALT_FLATS.north, SALT_FLATS.east, SALT_FLATS.south] satisfies [
    number,
    number,
    number,
    number,
  ],
  [
    GPU_FACTORY.x - GPU_FACTORY.w / 2 - 0.5,
    GPU_FACTORY.z - GPU_FACTORY.d / 2 - 0.4,
    GPU_FACTORY.x + GPU_FACTORY.w / 2 + 0.5,
    175.8,
  ] satisfies [number, number, number, number],
  [
    JURASSIC.x - JURASSIC.w / 2 - 0.4,
    JURASSIC.z - JURASSIC.d / 2 - 0.4,
    JURASSIC.x + JURASSIC.w / 2 + 0.4,
    JURASSIC.entry.y + 1,
  ] satisfies [number, number, number, number],
  [
    COW_PEN.x - COW_PEN.w / 2 - 0.4,
    COW_PEN.z - COW_PEN.d / 2 - 0.4,
    COW_PEN.x + COW_PEN.w / 2 + 0.4,
    COW_PEN.z + COW_PEN.d / 2 + 0.8,
  ] satisfies [number, number, number, number],
  [
    SQUARE_DIGSITE.west - 0.2,
    SQUARE_DIGSITE.north - 0.2,
    SQUARE_DIGSITE.east + 0.2,
    SQUARE_DIGSITE.south + 0.2,
  ] satisfies [number, number, number, number],
  [22, 128, 28, 135] satisfies [number, number, number, number],
  [
    SAND_HILL_WOODS.west,
    SAND_HILL_WOODS.north,
    SAND_HILL_WOODS.east,
    SAND_HILL_WOODS.south,
  ] satisfies [number, number, number, number],
  [55, 147, 71, 163] satisfies [number, number, number, number],
  [50, 166.5, 61, 176] satisfies [number, number, number, number],
  [63.4, 166.5, 74.6, 176] satisfies [number, number, number, number],
  [75, 102.5, 84, 136.5] satisfies [number, number, number, number],
  [peninsulaSecond - 13.2, 128.6, peninsulaSecond - 6.8, 144.5] satisfies [
    number,
    number,
    number,
    number,
  ],
  [peninsulaSecond - 3.5, 132.7, peninsulaSecond + 3.5, 137] satisfies [
    number,
    number,
    number,
    number,
  ],
  [58, 99.7, 61.4, 104.2] satisfies [number, number, number, number],
  [16.5, 96, 21, 99] satisfies [number, number, number, number],
  ...PENINSULA_GREENS.map(
    (p) =>
      [
        p.x - p.w / 2 - 0.2,
        p.z - p.d / 2 - 0.2,
        p.x + p.w / 2 + 0.2,
        p.z + p.d / 2 + 0.2,
      ] satisfies [number, number, number, number],
  ),
]);
const urbanDistance = (x: number, z: number, a: readonly number[], b: readonly number[]) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
};
const urbanBox = (p: Readonly<Parcel>) => {
  const horizontal = Math.abs(Math.sin(p.rotation || 0)) < 0.5;
  return [
    p.x - (horizontal ? p.w : p.d) / 2,
    p.z - (horizontal ? p.d : p.w) / 2,
    p.x + (horizontal ? p.w : p.d) / 2,
    p.z + (horizontal ? p.d : p.w) / 2,
  ];
};
const urbanOverlap = (a: readonly number[], b: readonly number[], pad = 0.12) =>
  a[0] < b[2] + pad && a[2] > b[0] - pad && a[1] < b[3] + pad && a[3] > b[1] - pad;

export function planPeninsulaInfill({
  roads,
  trails,
  existing,
}: {
  roads: readonly InfillRoute[];
  trails: readonly (InfillRoute & { halfWidth: number })[];
  existing: readonly Parcel[];
}) {
  const occupied = [...existing.map(urbanBox), ...PENINSULA_RESERVATIONS],
    segments = roads
      .flatMap((r) => r.points.slice(1).map((b, i) => ({ a: r.points[i], b, width: 0.85 })))
      .concat(
        trails.flatMap((r) =>
          r.points.slice(1).map((b, i) => ({ a: r.points[i], b, width: r.halfWidth + 0.15 })),
        ),
      );
  const plots: Readonly<InfillParcel>[] = [];
  // Sweep the complete coastline-to-airport grid in street order. Varied lot
  // widths and district palettes create a continuous frontage, not copied rows.
  for (const [ri, r] of roads.entries())
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1],
        b = r.points[i],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 2) continue;
      const ux = (b[0] - a[0]) / len,
        uz = (b[1] - a[1]) / len;
      for (const side of [-1, 1] satisfies [number, number])
        for (let t = 1; t < len - 1;) {
          const seed =
              ((((ri * 37 + i * 13 + Math.floor(t * 7) + side * 19) % 101) + 101) % 101) / 101,
            w = 2.5 + seed * 1.7,
            d = 2.05 + (1 - seed) * 0.8,
            nx = -uz * side,
            nz = ux * side;
          const p: InfillParcel = {
            x: a[0] + ux * (t + w / 2) + nx * (0.94 + d / 2),
            z: a[1] + uz * (t + w / 2) + nz * (0.94 + d / 2),
            w,
            d,
            rotation: Math.atan2(nx, -nz),
            seed,
            infill: true,
            street: r.name,
          };
          t += w + 0.18;
          if (t > len - 0.3 || p.x < 15.5 || p.x > 79.3 || p.z < 97 || p.z > 165.8) continue;
          const box = urbanBox(p);
          if (box[1] < 96.6) continue;
          if (occupied.some((q) => urbanOverlap(box, q))) continue;
          let clear = true;
          for (let z = box[1]; z <= box[3] + 1e-7 && clear; z += 0.2)
            for (let x = box[0]; x <= box[2] + 1e-7; x += 0.2)
              if (segments.some((s) => urbanDistance(x, z, s.a, s.b) < s.width)) {
                clear = false;
                break;
              }
          if (!clear) continue;
          p.district =
            p.x < 27
              ? seed > 0.55
                ? 'west'
                : 'telegraph'
              : p.x > 65
                ? seed > 0.55
                  ? 'soma'
                  : 'bayview'
                : seed > 0.72
                  ? 'mission'
                  : seed > 0.3
                    ? 'victorian'
                    : 'bayview';
          occupied.push(box);
          plots.push(Object.freeze(p));
        }
    }
  return plots;
}
