import { inSaltFlats } from './salt-layout.js';
import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.js';
import {
  SOUTHERN_SETTLEMENT_END,
  SETTLEMENT_ROADS,
  SOUTHERN_CAMPUS_SITES,
} from './southern-settlement-layout.js';

/** The southern extension is planned as landscape first: a through highway,
 * quiet residential lanes, a lake, pasture and neighboring rival campuses.
 * These definitions are shared by terrain, roads, planting and navigation. */
export const SOUTHERN_MAP_END = SOUTHERN_SETTLEMENT_END;
export const PENINSULA_HIGHWAY_X = (70.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE;
export const STARTUP_SITE = Object.freeze({
  x: 77,
  z: 134.5,
  entry: Object.freeze({ x: 76.5, y: 131.6 }),
});
export function inStartupGrounds(x, z, pad = 0) {
  return Math.abs(x - STARTUP_SITE.x) < 2.2 + pad && z > 131.1 - pad && z < 136.6 + pad;
}
export const SOUTHERN_LAKE = Object.freeze({
  id: 'redwood-lake',
  x: 31,
  z: 188,
  rx: 6.3,
  rz: 3.9,
  level: 1.45,
  west: 22,
  east: 40.5,
  north: 182,
  south: 193.6,
});
// The meadow occupies the full block between the lake circuit, Redwood Avenue,
// Meadow Way and Meadow Road. Leave one tile of clearance beside the streets.
export const CENTRAL_PASTURE = Object.freeze({
  x: 48.5,
  z: 188,
  w: 14,
  d: 11,
  entry: Object.freeze({ x: 48, y: 194 }),
});
export const SOUTHERN_COUNTRY_ROADS = Object.freeze(
  [
    {
      name: 'Redwood Avenue',
      points: [
        [21.5, 181.5],
        [50, 181.5],
        [62, 181.5],
        [PENINSULA_HIGHWAY_X, 181.5],
      ],
    },
    {
      name: 'Orchard Road',
      points: [
        [21.5, 181.5],
        [21.5, 194.5],
        [21.5, 205.5],
        [21.5, 213.5],
      ],
    },
    {
      name: 'Meadow Road',
      points: [
        [21.5, 194.5],
        [43.5, 194.5],
        [56.5, 194.5],
        [PENINSULA_HIGHWAY_X, 194.5],
      ],
    },
    {
      name: 'Alder Lane',
      points: [
        [43.5, 194.5],
        [43.5, 205.5],
        [43.5, 213.5],
      ],
    },
    {
      name: 'Meadow Way',
      points: [
        [56.5, 181.5],
        [56.5, 194.5],
        [56.5, 205.5],
        [56.5, 213.5],
      ],
    },
    {
      name: 'Laurel Garden Court',
      points: [
        [75.1, 199.1],
        [PENINSULA_HIGHWAY_X, 199.1],
      ],
    },
    {
      name: 'Consciousness Drive',
      points: [
        [21.5, 205.5],
        [43.5, 205.5],
        [56.5, 205.5],
        [PENINSULA_HIGHWAY_X, 205.5],
      ],
    },
    {
      name: 'South Coast Drive',
      points: [
        [21.5, 213.5],
        [43.5, 213.5],
        [56.5, 213.5],
        [PENINSULA_HIGHWAY_X, 213.5],
      ],
    },
    ...SETTLEMENT_ROADS,
  ].map((r) => Object.freeze({ ...r, points: Object.freeze(r.points.map(Object.freeze)) })),
);
export const SOUTHERN_COUNTRY_PATHS = Object.freeze(
  [
    {
      name: 'Orchard greenway extension',
      halfWidth: 0.32,
      points: [
        [18, 175],
        [18, 181.5],
        [21.5, 181.5],
      ],
    },
    {
      name: 'Redwood lake circuit',
      halfWidth: 0.32,
      points: [
        [24, 181.5],
        [24, 182.5],
        [30, 182.5],
        [38, 183],
        [40, 187],
        [39, 192],
        [35, 193],
        [25, 193],
        [22.5, 190],
        [22.5, 185],
        [24, 182.5],
      ],
    },
    {
      name: 'Lake to meadow',
      halfWidth: 0.32,
      points: [
        [35, 193],
        [35, 194.5],
      ],
    },
    {
      name: 'Pasture gate walk',
      halfWidth: 0.34,
      points: [
        [48.5, 194.5],
        [48.5, 193],
      ],
    },
    {
      name: 'Campus woodland walk',
      halfWidth: 0.3,
      points: [
        [40.5, 207.3],
        [47, 207],
        [52.5, 207.8],
        [56.5, 208],
        [60, 208.2],
        [66.5, 207.5],
      ],
    },
    {
      name: 'South Grove green',
      halfWidth: 0.32,
      points: [
        [29, 225.5],
        [29, 227.5],
        [35, 227.5],
        [36.5, 231.5],
        [29, 232],
        [29, 227.5],
      ],
    },
    {
      name: 'Rival institutes promenade',
      halfWidth: 0.32,
      points: [
        [27.5, 224.85],
        [37.7, 224.85],
      ],
    },
  ].map((r) => Object.freeze({ ...r, points: Object.freeze(r.points.map(Object.freeze)) })),
);

const countrysidePlots = [
  // Garden homes take the place of the old, tightly packed institute plots.
  [53.3, 170, 3.3, 2.8, 0, 'craftsman'],
  [57.5, 170, 3.5, 2.8, 0, 'eichler'],
  [62.8, 228, 3.4, 2.8, Math.PI, 'bungalow'],
  [69.6, 228, 3.5, 2.8, Math.PI, 'craftsman'],
  // Short residential groups leave generous shared woods and lawns between.
  [18.1, 197.8, 3.8, 2.8, -Math.PI / 2, 'bungalow'],
  [18.1, 202.1, 3.6, 2.8, -Math.PI / 2, 'craftsman'],
  [25, 198, 4.1, 3.1, Math.PI / 2, 'eichler'],
  [25, 202.4, 3.7, 3.1, Math.PI / 2, 'craftsman'],
  [18.1, 208.6, 3.9, 2.8, -Math.PI / 2, 'eichler'],
  [25, 209, 4.2, 3.1, Math.PI / 2, 'bungalow'],
  [31, 210.3, 4.3, 3, 0, 'craftsman'],
  [37, 210.3, 4.5, 3, 0, 'eichler'],
  [47.1, 198.3, 3.8, 3.2, Math.PI / 2, 'bungalow'],
  [47.1, 202.5, 3.4, 3.2, Math.PI / 2, 'craftsman'],
  [52.9, 198.8, 3.8, 3.1, -Math.PI / 2, 'eichler'],
  [52.9, 202.5, 3.4, 3.1, -Math.PI / 2, 'bungalow'],
  [47, 210.3, 4.3, 3, 0, 'craftsman'],
  [52.6, 210.3, 4.2, 3, 0, 'eichler'],
  [61.2, 184.4, 3.6, 2.7, Math.PI, 'bungalow'],
  [66, 184.4, 3.8, 2.7, Math.PI, 'craftsman'],
  [63.2, 191.4, 4.5, 3, 0, 'eichler'],
  [69.3, 191.4, 4.2, 3, 0, 'bungalow'],
  [75.7, 191.4, 4.1, 3, 0, 'craftsman'],
  [18.1, 185.7, 3.6, 2.8, -Math.PI / 2, 'craftsman'],
  [18.1, 190.2, 3.7, 2.8, -Math.PI / 2, 'bungalow'],
  [60.1, 187.9, 3.3, 2.6, Math.PI / 2, 'bungalow'],
  [58.7, 198, 3.2, 2.5, Math.PI / 2, 'craftsman'],
  [58.7, 202.1, 3.2, 2.5, Math.PI / 2, 'eichler'],
  [75.5, 196.8, 3.8, 2.35, 0, 'eichler'],
  [79, 196.8, 2.8, 2.35, 0, 'bungalow'],
  [75.5, 201.8, 3.8, 2.8, Math.PI, 'craftsman'],
  [79, 201.8, 2.8, 2.8, Math.PI, 'eichler'],
];
export const SOUTHERN_COUNTRY_HOMES = Object.freeze(
  countrysidePlots
    .filter(([x, z, w, d]) => !inSaltFlats(x, z, Math.max(w, d) / 2 + 0.1))
    .map(([x, z, w, d, rotation, lowRiseStyle], i) =>
      Object.freeze({
        x,
        z,
        w,
        d,
        rotation,
        lowRiseStyle,
        seed: 0.09 + ((i * 0.137) % 0.86),
        countryside: true,
        street: z < 180 ? 'College garden walk' : 'Southern garden lanes',
      }),
    ),
);
export const SOUTHERN_COUNTRY_RESERVES = Object.freeze([
  [SOUTHERN_LAKE.west, SOUTHERN_LAKE.north, SOUTHERN_LAKE.east, SOUTHERN_LAKE.south],
  [
    CENTRAL_PASTURE.x - CENTRAL_PASTURE.w / 2 - 0.2,
    CENTRAL_PASTURE.z - CENTRAL_PASTURE.d / 2 - 0.2,
    CENTRAL_PASTURE.x + CENTRAL_PASTURE.w / 2 + 0.2,
    CENTRAL_PASTURE.z + CENTRAL_PASTURE.d / 2 + 0.2,
  ],
  ...SOUTHERN_CAMPUS_SITES.map((c) => [c.west - 0.3, c.north - 0.3, c.east + 0.3, c.south + 0.3]),
]);
export function southernLakeValue(x, z, padding = 0) {
  const l = SOUTHERN_LAKE;
  return 1 - ((x - l.x) / (l.rx + padding)) ** 2 - ((z - l.z) / (l.rz + padding)) ** 2;
}
export function inSouthernLake(x, z, padding = 0) {
  return southernLakeValue(x, z, padding) > 0;
}

/** Split existing terrain faces at a shared shoreline. Both halves use the
 * exact same edge vertices; water cannot expose the ocean below the mesh. */
export function partitionSouthernLake(polygon, dry, wet) {
  const values = polygon.map((p) => southernLakeValue(p[0], p[2]));
  if (values.every((v) => v <= 0)) {
    dry(polygon);
    return;
  }
  if (values.every((v) => v >= 0)) {
    wet(polygon.map((p) => [p[0], SOUTHERN_LAKE.level, p[2]]));
    return;
  }
  const land = [],
    water = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length],
      va = values[i],
      vb = values[(i + 1) % polygon.length];
    (va > 0 ? water : land).push(va > 0 ? [a[0], SOUTHERN_LAKE.level, a[2]] : a);
    if (va > 0 !== vb > 0) {
      const t = va / (va - vb),
        point = [a[0] + (b[0] - a[0]) * t, SOUTHERN_LAKE.level, a[2] + (b[2] - a[2]) * t];
      land.push(point);
      water.push(point);
    }
  }
  if (land.length >= 3) dry(land);
  if (water.length >= 3) wet(water);
}
