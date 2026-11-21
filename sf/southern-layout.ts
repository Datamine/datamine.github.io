import type { Parcel } from './types/parcels.ts';
import type { Vec2 } from './types/geometry.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { TERMINATOR_FACTORY, overlapsTerminatorParcel } from './encounter-layout.ts';
import { pickSearchHouseParcels, searchPlotKey } from './config/search-houses.ts';
import { createSegmentDistanceIndex } from './segment-index.ts';
import { isWizardHousePlot } from './wizard-house.ts';
import { SETTLEMENT_PARCELS } from './southern-settlement-layout.ts';
import {
  SOUTHERN_MAP_END,
  SOUTHERN_COUNTRY_ROADS,
  SOUTHERN_COUNTRY_PATHS,
  SOUTHERN_COUNTRY_HOMES,
  STARTUP_SITE,
  CENTRAL_PASTURE,
} from './southern-countryside-layout.ts';
import {
  SUBURBAN_COURTS,
  SUBURBAN_PARCELS,
  CUPERTINO_PATHS,
  overlapsSuburbanCourt,
  suburbanStyleFor,
  suburbanSolidAt,
} from './suburban-layout.ts';
import { VILLAGE_ROADS, VILLAGE_PATHS } from './southern-village-layout.ts';
import { DUEL_ARENA, DUEL_PATH } from './duel-layout.ts';
import { SOUTHERN_GREENWAYS, COASTAL_GARDEN_HOMES } from './southern-greenways.ts';
import { TWITTER_HQ, SALES_CONFERENCE, SOCIAL_PATHS } from './social-layout.ts';
import { APPLE_CAMPUS, ROBOTAXI_DEALER, TECH_PATHS } from './tech-layout.ts';
import { HABERDASHER } from './haberdasher-layout.ts';
import { timesSquarePropAt } from './times-square-layout.ts';
import {
  PENINSULA_TRUNK_STREETS,
  SAND_HILL_PATHS,
  planPeninsulaInfill,
} from './peninsula-urbanism.ts';
import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.ts';
import { SF_FITNESS, gymAccess, gymWalkable } from './fitness-layout.ts';
import { JURASSIC } from './jurassic-layout.ts';
import { GPU_FACTORY, GPU_FACTORY_PATH } from './gpu-layout.ts';
import { SALT_FLATS, SALT_FLATS_PATH } from './salt-layout.ts';
import { RESEARCH_ROADS, RESEARCH_PADS } from './research-layout.ts';
import { PENINSULA_STREETS, PENINSULA_HOUSING, PACIFICA_PARK_PATHS } from './southern-expansion.ts';
import { AIRPORT_GARDEN_HOMES, southBayPlotOverlaps } from './south-bay-layout.ts';
export { SF_FITNESS, gymAccess, gymWalkable };

export const SOUTHERN_BOUNDS = Object.freeze({
  west: 8,
  east: 84,
  north: WORLD_SIZE,
  south: SOUTHERN_MAP_END,
  step: 0.5,
});
export const SAND_HILL_CAPITAL = Object.freeze({
  x: 43.5,
  z: 134.4,
  w: 5.4,
  d: 3.6,
  base: 4,
  entry: Object.freeze({ x: 43, y: 137 }),
});
const southernSecondX = (64.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE;
// A deliberately compressed Hillsborough: southwest of the airport.
export const TIMES_SQUARE = Object.freeze({
  x: 63,
  z: 154.5,
  west: 57,
  east: 70,
  north: 148,
  south: 162,
  base: 3.2,
  entry: Object.freeze({ x: 62.5, y: 154 }),
});
export const TIMES_SQUARE_BUILDINGS = Object.freeze(
  [
    { x: 63, z: 149.4, w: 2.7, d: 2.6, h: 8.8 },
    { x: 58.5, z: 150.2, w: 2.2, d: 3.2, h: 5.8 },
    { x: 67.5, z: 150.8, w: 2.5, d: 4, h: 10.5 },
    { x: 58.5, z: 159.4, w: 2.8, d: 3.4, h: 4.8 },
    { x: 67.4, z: 159.4, w: 3, d: 3.4, h: 6.6 },
  ].map((value) => Object.freeze(value)),
);
export function inTimesSquare(x: number, z: number) {
  const p = TIMES_SQUARE;
  return x >= p.west && x <= p.east && z >= p.north && z <= p.south;
}
export function timesSquareWalkable(x: number, z: number) {
  return (
    inTimesSquare(x, z) &&
    !TIMES_SQUARE_BUILDINGS.some(
      (b) => Math.abs(x - b.x) < b.w / 2 + 0.22 && Math.abs(z - b.z) < b.d / 2 + 0.22,
    ) &&
    !timesSquarePropAt(x, z)
  );
}
export const TIMES_SQUARE_ROUTE_NODES = Object.freeze(
  [
    [60.5, 152] satisfies [number, number],
    [65, 152] satisfies [number, number],
    [60.8, 158] satisfies [number, number],
    [65.2, 158] satisfies [number, number],
    [60.8, 161.85] satisfies [number, number],
    [65.2, 161.85] satisfies [number, number],
  ].map(([x, z]) => Object.freeze({ x: x - 0.5, y: z - 0.5 })),
);
export const SOUTHERN_STREETS = Object.freeze(
  [
    {
      name: contentText('southern-layout.module.name-1', {}),
      points: [
        [62.5, 99.5] satisfies [number, number],
        [southernSecondX, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-layout.module.name-2', {}),
      points: [
        [62.5, 99.5] satisfies [number, number],
        [62.5, 105.5] satisfies [number, number],
        [62.5, 117.5] satisfies [number, number],
        [62.5, 126.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-layout.module.name-3', {}),
      points: [
        [56.5, 105.5] satisfies [number, number],
        [62.5, 105.5] satisfies [number, number],
        [southernSecondX, 105.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-layout.module.name-4', {}),
      points: [
        [56.5, 117.5] satisfies [number, number],
        [62.5, 117.5] satisfies [number, number],
        [southernSecondX, 117.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-layout.module.name-5', {}),
      points: [
        [62.5, 126.5] satisfies [number, number],
        [southernSecondX, 126.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-layout.module.name-6', {}),
      points: [
        [56.5, 105.5] satisfies [number, number],
        [56.5, 111.5] satisfies [number, number],
        [56.5, 117.5] satisfies [number, number],
        [56.5, 154.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-layout.module.name-7', {}),
      points: [[56.5, 154.5] satisfies [number, number], [69.5, 154.5] satisfies [number, number]],
    },
    {
      name: contentText('southern-layout.module.name-8', {}),
      points: [[56.5, 137.5] satisfies [number, number], [43.5, 137.5] satisfies [number, number]],
    },
    ...RESEARCH_ROADS,
    ...SOUTHERN_COUNTRY_ROADS,
    ...VILLAGE_ROADS,
    ...SUBURBAN_COURTS,
    ...PENINSULA_STREETS,
  ].map((r) =>
    Object.freeze({ ...r, points: Object.freeze(r.points.map((value) => Object.freeze(value))) }),
  ),
);

export const SOUTHERN_TRAILS = Object.freeze(
  [
    {
      name: contentText('southern-layout.module.name-9', {}),
      halfWidth: 0.38,
      points: [
        [56.5, 111.5] satisfies [number, number],
        [53, 109] satisfies [number, number],
        [48, 108] satisfies [number, number],
        [44, 110] satisfies [number, number],
        [43, 114] satisfies [number, number],
        [46, 116] satisfies [number, number],
        [50, 115] satisfies [number, number],
        [53, 112] satisfies [number, number],
        [56.5, 111.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-layout.module.name-10', {}),
      halfWidth: 0.4,
      points: [
        [43, 114] satisfies [number, number],
        [35, 112] satisfies [number, number],
        [27, 111.7] satisfies [number, number],
        [23.5, 111.7] satisfies [number, number],
      ],
    },
    ...SOUTHERN_COUNTRY_PATHS,
    ...PACIFICA_PARK_PATHS,
    ...SAND_HILL_PATHS,
    DUEL_PATH,
    ...VILLAGE_PATHS,
    ...CUPERTINO_PATHS,
    GPU_FACTORY_PATH,
    SALT_FLATS_PATH,
    ...TECH_PATHS,
    ...SOCIAL_PATHS,
    ...SOUTHERN_GREENWAYS,
  ].map((r) =>
    Object.freeze({ ...r, points: Object.freeze(r.points.map((value) => Object.freeze(value))) }),
  ),
);

export const SOUTHERN_HILLS = Object.freeze(
  [
    {
      name: contentText('southern-layout.module.name-11', {}),
      x: 38,
      z: 115,
      h: 7.6,
      rx: 15,
      rz: 18,
    },
    {
      name: contentText('southern-layout.module.name-12', {}),
      x: 55,
      z: 139,
      h: 5.2,
      rx: 13,
      rz: 18,
    },
    {
      name: contentText('southern-layout.module.name-13', {}),
      x: 63,
      z: 103,
      h: 3.4,
      rx: 10,
      rz: 10,
    },
    {
      name: contentText('southern-layout.module.name-14', {}),
      x: 27,
      z: 161,
      h: 6.5,
      rx: 18,
      rz: 17,
    },
    {
      name: contentText('southern-layout.module.name-15', {}),
      x: 16.8,
      z: 194,
      h: 4.4,
      rx: 10,
      rz: 18,
    },
    {
      name: contentText('southern-layout.module.name-16', {}),
      x: 44,
      z: 211,
      h: 3.3,
      rx: 19,
      rz: 10,
    },
    {
      name: contentText('southern-layout.module.name-17', {}),
      x: 18,
      z: 227,
      h: 3.8,
      rx: 12,
      rz: 15,
    },
    {
      name: contentText('southern-layout.module.name-18', {}),
      x: 49,
      z: 229,
      h: 2.6,
      rx: 13,
      rz: 12,
    },
  ].map((value) => Object.freeze(value)),
);

export const SOUTHERN_LEVEL_PADS = Object.freeze(
  [
    {
      name: contentText('southern-layout.module.name-19', {}),
      x: DUEL_ARENA.west,
      z: DUEL_ARENA.north,
      w: DUEL_ARENA.east - DUEL_ARENA.west,
      d: DUEL_ARENA.south - DUEL_ARENA.north,
      height: DUEL_ARENA.base,
      blend: 4,
    },
    {
      name: contentText('southern-layout.module.name-20', {}),
      x: 50.5,
      z: 175.9,
      w: 23.2,
      d: 3.9,
      height: 1.6,
      blend: 1.5,
    },
    {
      name: contentText('southern-layout.module.name-21', {}),
      x: TWITTER_HQ.x - TWITTER_HQ.w / 2 - 0.25,
      z: 112.75,
      w: SALES_CONFERENCE.x + SALES_CONFERENCE.w / 2 - TWITTER_HQ.x + TWITTER_HQ.w / 2 + 0.5,
      d: 5.3,
      height: TWITTER_HQ.base,
      blend: 10,
    },
    {
      name: contentText('southern-layout.module.name-22', {}),
      x: APPLE_CAMPUS.x - 3.9,
      z: APPLE_CAMPUS.z - 4.3,
      w: 7.8,
      d: 8.2,
      height: APPLE_CAMPUS.base,
      blend: 8,
    },
    {
      name: contentText('southern-layout.module.name-23', {}),
      x: ROBOTAXI_DEALER.x - 1.7,
      z: ROBOTAXI_DEALER.z - 2.1,
      w: 3.4,
      d: 4,
      height: ROBOTAXI_DEALER.base,
      blend: 1.3,
    },
    {
      name: contentText('southern-layout.module.name-24', {}),
      x: HABERDASHER.x - HABERDASHER.w / 2 - 0.05,
      z: HABERDASHER.z - HABERDASHER.d / 2 - 0.05,
      w: HABERDASHER.w + 0.1,
      d: HABERDASHER.d + 0.1,
      height: HABERDASHER.base,
      blend: 1,
    },
    {
      name: contentText('southern-layout.module.name-25', {}),
      x: GPU_FACTORY.x - GPU_FACTORY.w / 2 - 0.2,
      z: GPU_FACTORY.z - GPU_FACTORY.d / 2 - 0.2,
      w: GPU_FACTORY.w + 0.4,
      d: GPU_FACTORY.d + 0.6,
      height: GPU_FACTORY.base - 0.03,
      blend: 3,
    },
    {
      name: contentText('southern-layout.module.name-26', {}),
      x: JURASSIC.x - JURASSIC.w / 2,
      z: JURASSIC.z - JURASSIC.d / 2,
      w: JURASSIC.w,
      d: JURASSIC.d,
      height: JURASSIC.base - 0.04,
      blend: 1.5,
    },
    {
      name: contentText('southern-layout.module.name-27', {}),
      x: 75.4,
      z: 103.2,
      w: 19.4,
      d: 47.3,
      blend: 1.8,
    },
    {
      name: contentText('southern-layout.module.name-28', {}),
      x: southernSecondX - 14,
      z: 128.5,
      w: 8,
      d: 19.5,
      blend: 12,
    },
    {
      name: contentText('southern-layout.module.name-29', {}),
      x: STARTUP_SITE.x - 2.7,
      z: 129.5,
      w: 5.4,
      d: 7.6,
      blend: 1.8,
    },
    {
      name: contentText('southern-layout.module.name-30', {}),
      x: CENTRAL_PASTURE.x - CENTRAL_PASTURE.w / 2,
      z: CENTRAL_PASTURE.z - CENTRAL_PASTURE.d / 2,
      w: CENTRAL_PASTURE.w,
      d: CENTRAL_PASTURE.d,
      height: 1.85,
      blend: 2,
    },
    {
      name: contentText('southern-layout.module.name-31', {}),
      x: 55,
      z: 147,
      w: 16,
      d: 16,
      height: TIMES_SQUARE.base,
      blend: 8,
    },
    {
      name: contentText('southern-layout.module.name-32', {}),
      x: 40.3,
      z: 132.2,
      w: 6.4,
      d: 6,
      height: SAND_HILL_CAPITAL.base,
      blend: 6,
    },
    ...RESEARCH_PADS,
    {
      name: contentText('southern-layout.module.name-33', {}),
      x: TERMINATOR_FACTORY.x - 2.6,
      z: TERMINATOR_FACTORY.z - 2.6,
      w: 5.2,
      d: 5.2,
      height: TERMINATOR_FACTORY.base,
      blend: 1.5,
    },
    {
      name: contentText('southern-layout.module.name-34', {}),
      x: SALT_FLATS.west,
      z: SALT_FLATS.north,
      w: SALT_FLATS.east - SALT_FLATS.west,
      d: SALT_FLATS.south - SALT_FLATS.north,
      height: SALT_FLATS.base,
      blend: 1.5,
    },
  ].map((value) => Object.freeze(value)),
);

// Row centers, street-facing rotation, frontage and lot depth are authored
// together; no house is scattered independently of a curb or another parcel.
const southernExistingHousing: Parcel[] = [
  { x: 65.8, z: 97.6, w: 3.6, d: 2, rotation: 0 },
  { x: 70.9, z: 97.6, w: 3.2, d: 2, rotation: 0 },
  { x: 68, z: 102.2, w: 8, d: 3.2, rotation: Math.PI },
  { x: 68, z: 108.2, w: 8, d: 3.2, rotation: Math.PI },
  { x: 68, z: 114.8, w: 8, d: 3.2, rotation: 0 },
  { x: 59, z: 111.5, w: 8, d: 2.8, rotation: Math.PI / 2 },
  { x: 60, z: 122, w: 6.5, d: 3, rotation: -Math.PI / 2 },
  { x: 71.7, z: 121.8, w: 6.5, d: 2.8, rotation: -Math.PI / 2 },
  { x: 77.6, z: 121.8, w: 6.5, d: 2.8, rotation: Math.PI / 2 },
  ...PENINSULA_HOUSING,
  ...COASTAL_GARDEN_HOMES,
];
export const SOUTHERN_HOUSING = Object.freeze(
  [
    ...southernExistingHousing,
    ...planPeninsulaInfill({
      roads: [...PENINSULA_TRUNK_STREETS, ...SOUTHERN_STREETS],
      trails: SOUTHERN_TRAILS,
      existing: southernExistingHousing,
    }),
  ]
    .filter((p) => !southBayPlotOverlaps(p) && !overlapsSuburbanCourt(p))
    .concat(AIRPORT_GARDEN_HOMES, SUBURBAN_PARCELS, SOUTHERN_COUNTRY_HOMES, SETTLEMENT_PARCELS)
    .filter((p) => !overlapsTerminatorParcel(p))
    .map((p) => {
      const style = p.settlement ? p.lowRiseStyle : suburbanStyleFor(p);
      return Object.freeze(style ? { ...p, lowRiseStyle: style } : p);
    }),
);

export function southernSegmentDistance(x: number, z: number, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
const southernTrailDistanceIndex = createSegmentDistanceIndex(SOUTHERN_TRAILS);
export function southernTrailDistance(x: number, z: number) {
  return southernTrailDistanceIndex(x, z);
}

export const SEARCH_HOUSE_PARCELS = Object.freeze(
  pickSearchHouseParcels(SOUTHERN_HOUSING.filter((p) => !isWizardHousePlot(p))),
);
const searchHouseBounds = SEARCH_HOUSE_PARCELS.map((p) => ({
  ...p,
  c: Math.cos(p.rotation || 0),
  s: Math.sin(p.rotation || 0),
}));
export function inSearchHousePlot(x: number, z: number, padding = 0) {
  return searchHouseBounds.some((p) => {
    const dx = x - p.x,
      dz = z - p.z;
    if (Math.abs(dx) > 4 + padding || Math.abs(dz) > 4 + padding) return false;
    return (
      Math.abs(dx * p.c + dz * p.s) < p.w / 2 + padding &&
      Math.abs(-dx * p.s + dz * p.c) < p.d / 2 + padding
    );
  });
}
const searchHouseKeys = new Set(SEARCH_HOUSE_PARCELS.map(searchPlotKey));
export const isSearchHousePlot = (p: Pick<Parcel, 'x' | 'z'>) =>
  searchHouseKeys.has(searchPlotKey(p));
const southernHouseBounds = SOUTHERN_HOUSING.filter(
  (p) => !isWizardHousePlot(p) && !isSearchHousePlot(p),
).map((p) => ({
  ...p,
  c: Math.cos(p.rotation || 0),
  s: Math.sin(p.rotation || 0),
  radius: Math.hypot(p.w, p.d) / 2,
}));
const southernHouseBuckets = new Map<string, (typeof southernHouseBounds)[number][]>();
for (const p of southernHouseBounds) {
  // Three extra units cover up to two units of local-axis padding even on
  // rotated lots. Larger queries fall back to the complete immutable list.
  const r = p.radius + 3;
  for (let z = Math.floor((p.z - r) / 8); z <= Math.floor((p.z + r) / 8); z++)
    for (let x = Math.floor((p.x - r) / 8); x <= Math.floor((p.x + r) / 8); x++) {
      const key = x + ',' + z;
      let plots = southernHouseBuckets.get(key);
      if (!plots) southernHouseBuckets.set(key, (plots = []));
      plots.push(p);
    }
}
export function inSouthernHousePlot(x: number, z: number, padding = 0) {
  const plots =
    padding <= 2
      ? southernHouseBuckets.get(Math.floor(x / 8) + ',' + Math.floor(z / 8)) || []
      : southernHouseBounds;
  return plots.some((p) => {
    const dx = x - p.x,
      dz = z - p.z,
      r = p.radius + Math.SQRT2 * Math.max(0, padding);
    if (Math.abs(dx) > r || Math.abs(dz) > r) return false;
    const u = dx * p.c + dz * p.s,
      v = -dx * p.s + dz * p.c;
    return p.lowRiseStyle
      ? suburbanSolidAt(p, u, v, padding)
      : Math.abs(u) < p.w / 2 + padding && Math.abs(v) < p.d / 2 + padding;
  });
}
