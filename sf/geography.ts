import type { HeightField } from './southern-terrain.ts';
import type { TerrainPad } from './types/buildings.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** Geographic coordinates use the original 64-unit drawing. Model sizes stay
 * fixed when the walking grid grows; these transforms only spread out sites. */
export const WORLD_SIZE = 96,
  REFERENCE_SIZE = 64,
  STREET_LAYOUT_SIZE = 83;
// Compressed East Bay shore: a short crossing from the island to the shops.
export const EAST_BAY_COAST_X = 112;
export const PARK_BOUNDS = Object.freeze({ west: 9, east: 32, north: 29, south: 34 });
// Fell/Oak, Stanyan/Baker: a deliberately narrow continuation of the park.
// The eastern boundary stops at the next north/south street's western curb.
export const PANHANDLE = Object.freeze({ west: 32, east: 37.65, north: 30.95, south: 32.2 });
// A wider Mission lawn, contained within the neighboring street curbs.
export const DOLORES_PARK = Object.freeze({ west: 35.35, east: 37.15, north: 42.8, south: 45.4 });
export function inBounds(
  x: number,
  z: number,
  b: Readonly<{ west: number; east: number; north: number; south: number }>,
) {
  return x >= b.west && x <= b.east && z >= b.north && z <= b.south;
}
export function boundsPolygon(
  b:
    | Readonly<{ west: 32; east: 37.65; north: 30.95; south: 32.2 }>
    | Readonly<{ west: 35.35; east: 37.15; north: 42.8; south: 45.4 }>,
) {
  return [
    [b.west, b.north],
    [b.east, b.north],
    [b.east, b.south],
    [b.west, b.south],
  ];
}

// Cartographic relief, not a surveyed elevation model. The central spine is
// much taller than the northern hills; the Mission, SoMa and Marina stay low.
// Elongated ridges connect the peaks without turning the whole city into a dome.
export const SF_HILLS = Object.freeze([
  {
    name: contentText('geography.module.name-1', {}),
    x: 29,
    y: 44,
    h: 2.8,
    r: 8,
    rx: 6.2,
    rz: 10.2,
    angle: 0.12,
  },
  { name: contentText('geography.module.name-2', {}), x: 29.1, y: 41.6, h: 3.9, r: 2.25 },
  { name: contentText('geography.module.name-3', {}), x: 28.7, y: 44, h: 4, r: 2.25 },
  {
    name: contentText('geography.module.name-4', {}),
    x: 28.8,
    y: 52,
    h: 6.5,
    r: 4.8,
    rx: 4.5,
    rz: 5.2,
  },
  { name: contentText('geography.module.name-5', {}), x: 25.6, y: 39.7, h: 3.8, r: 4.5 },
  {
    name: contentText('geography.module.name-6', {}),
    x: 23.4,
    y: 45.5,
    h: 1.7,
    r: 4.8,
    rx: 3.1,
    rz: 6,
  },
  { name: contentText('geography.module.name-7', {}), x: 42, y: 21, h: 3.8, r: 4.8 },
  {
    name: contentText('geography.module.name-8', {}),
    x: 40,
    y: 14.7,
    h: 3.6,
    r: 4.1,
    rx: 3.6,
    rz: 5,
  },
  { name: contentText('geography.module.name-9', {}), x: 47, y: 13, h: 2.9, r: 4.2 },
  {
    name: contentText('geography.module.name-10', {}),
    x: 34,
    y: 19,
    h: 4.1,
    r: 6.5,
    rx: 7,
    rz: 4.8,
  },
  {
    name: contentText('geography.module.name-11', {}),
    x: 19.8,
    y: 14.8,
    h: 3.8,
    r: 6.5,
    rx: 6.8,
    rz: 5.5,
  },
  { name: contentText('geography.module.name-12', {}), x: 29.7, y: 26.1, h: 2.3, r: 2.4 },
  { name: contentText('geography.module.name-13', {}), x: 34.4, y: 28.3, h: 2.6, r: 2.7 },
  { name: contentText('geography.module.name-14', {}), x: 33.5, y: 36.4, h: 2.1, r: 3.5 },
  {
    name: contentText('geography.module.name-15', {}),
    x: 42,
    y: 51,
    h: 3.3,
    r: 4.1,
    rx: 4.5,
    rz: 3.5,
  },
  {
    name: contentText('geography.module.name-16', {}),
    x: 48.8,
    y: 43.7,
    h: 3,
    r: 4.1,
    rx: 3.8,
    rz: 4.8,
  },
  { name: contentText('geography.module.name-17', {}), x: 32, y: 53.7, h: 2.1, r: 4.5 },
]);
const bell = (x: number, z: number, cx: number, cz: number, rx: number, rz = rx) =>
  Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
const smooth = (v: number) => {
  v = Math.max(0, Math.min(1, v));
  return v * v * (3 - 2 * v);
};

/** Heights in model units, sampled in the 64-unit geographic coordinate space. */
export function sfElevation(x: number, z: number) {
  let peaks = 0;
  const relief =
    SF_HILLS.reduce((height, h) => {
      const c = Math.cos(h.angle || 0),
        s = Math.sin(h.angle || 0),
        dx = x - h.x,
        dz = z - h.y;
      const rise =
        h.h *
        Math.exp(
          -(((dx * c + dz * s) / (h.rx || h.r)) ** 2 + ((-dx * s + dz * c) / (h.rz || h.r)) ** 2),
        );
      if (h.name.endsWith('Twin Peak')) {
        peaks = Math.max(peaks, rise);
        return height;
      }
      return height + rise;
    }, 0) + peaks;
  const valley =
    0.8 * bell(x, z, 40, 42, 4.5, 8) +
    0.5 * bell(x, z, 48, 31, 7, 6) +
    bell(x, z, 36, 11, 6, 2.8) +
    2.1 * bell(x, z, 28.5, 11.4, 5.5, 1.5);
  // Low rolling western dunes, and an eastward rise through Golden Gate Park.
  const dunes = 0.55 * bell(x, z, 17, 43, 8, 15);
  const parkGrade = 0.65 * bell(x, z, 27, 31.5, 12, 3.2);
  const detail = 0.055 * (Math.sin(x * 1.7 + z * 0.31) + Math.sin(z * 1.35 - x * 0.27));
  return 1.15 + Math.max(0, relief - valley) + dunes + parkGrade + detail;
}

export function woodedHillPark(x: number, z: number) {
  return (
    ((x - 25.6) / 2.4) ** 2 + ((z - 39.7) / 3) ** 2 < 1 ||
    ((x - 42) / 2.2) ** 2 + ((z - 51) / 1.4) ** 2 < 1
  );
}
export function sfHillCover(x: number, z: number) {
  if (((x - 29) / 4) ** 2 + ((z - 43) / 5) ** 2 >= 1) return 'grass';
  const height = sfElevation(x, z);
  return height > 8.7 ? 'rock' : height > 7.2 ? 'scrub' : 'grass';
}

/** Level a building's small pad, retaining the surrounding street's hill grade.
 * At most a narrow collar is blended; never flatten an entire neighborhood. */
export function levelHeightField(
  field: HeightField,
  resolution: number,
  { cx, cz, w, d, angle = 0, height }: Omit<TerrainPad, 'angle'> & { angle?: number },
  { protect = () => false }: { protect?: (x: number, z: number) => boolean } | undefined = {},
) {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    reach = Math.hypot(w, d) / 2 + 0.65,
    n = field.length - 1;
  let changed = 0,
    maxChange = 0;
  for (
    let iz = Math.max(0, Math.floor((cz - reach) * resolution));
    iz <= Math.min(n, Math.ceil((cz + reach) * resolution));
    iz++
  ) {
    for (
      let ix = Math.max(0, Math.floor((cx - reach) * resolution));
      ix <= Math.min(n, Math.ceil((cx + reach) * resolution));
      ix++
    ) {
      if (protect(ix / resolution, iz / resolution)) continue;
      const dx = ix / resolution - cx,
        dz = iz / resolution - cz,
        u = dx * c + dz * s,
        v = -dx * s + dz * c;
      const outside = Math.hypot(
        Math.max(0, Math.abs(u) - w / 2),
        Math.max(0, Math.abs(v) - d / 2),
      );
      if (outside >= 0.6) continue;
      const weight = 1 - smooth((outside - 0.15) / 0.45),
        before = field[iz][ix];
      field[iz][ix] = before + (height - before) * weight;
      changed++;
      maxChange = Math.max(maxChange, Math.abs(field[iz][ix] - before));
    }
  }
  return { changed, maxChange };
}

/** Cut a private building plot into its hill. Keep public curbs untouched:
 * unlike destination pads, these plots never blend beyond their footprint. */
export function cutBuildingPlot(
  field: HeightField,
  resolution: number,
  {
    cx,
    cz,
    w,
    d,
    angle = 0,
    height,
    onlyLower = false,
  }: {
    cx: number;
    cz: number;
    w: number;
    d: number;
    angle: number;
    height: number;
    onlyLower?: boolean;
  },
  { protect = () => false }: { protect?: (x: number, z: number) => boolean } | undefined = {},
) {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    reach = Math.hypot(w, d) / 2,
    n = field.length - 1;
  for (
    let iz = Math.max(0, Math.floor((cz - reach) * resolution));
    iz <= Math.min(n, Math.ceil((cz + reach) * resolution));
    iz++
  ) {
    for (
      let ix = Math.max(0, Math.floor((cx - reach) * resolution));
      ix <= Math.min(n, Math.ceil((cx + reach) * resolution));
      ix++
    ) {
      if (protect(ix / resolution, iz / resolution)) continue;
      const dx = ix / resolution - cx,
        dz = iz / resolution - cz;
      if (Math.abs(dx * c + dz * s) <= w / 2 && Math.abs(-dx * s + dz * c) <= d / 2)
        field[iz][ix] = onlyLower ? Math.min(field[iz][ix], height) : height;
    }
  }
}

/** Layered headland ridges, with lower Rodeo/Gerbode valleys and the bridge landing. */
export const MARIN_OUTLINE = [
  [-20, -65] satisfies [number, number],
  [65, -65] satisfies [number, number],
  [58, -38] satisfies [number, number],
  [46, -22] satisfies [number, number],
  [42, -12] satisfies [number, number],
  [35, -7] satisfies [number, number],
  [28, -3] satisfies [number, number],
  [24, 0] satisfies [number, number],
  [22, 1.5] satisfies [number, number],
  [20.5, 2.8] satisfies [number, number],
  [18, 3.1] satisfies [number, number],
  [17.1, 2.5] satisfies [number, number],
  [16.6, 2.1] satisfies [number, number],
  [16.1, 2.25] satisfies [number, number],
  [15.7, 2.65] satisfies [number, number],
  [14.2, 1.9] satisfies [number, number],
  [12.4, 1.2] satisfies [number, number],
  [11.5, 0.1] satisfies [number, number],
  [10.4, -0.5] satisfies [number, number],
  [9.4, 0.4] satisfies [number, number],
  [8, 0.2] satisfies [number, number],
  [7.7, -1.4] satisfies [number, number],
  [8.5, -2.2] satisfies [number, number],
  [7.4, -3] satisfies [number, number],
  [6.8, -4.1] satisfies [number, number],
  [6.4, -5] satisfies [number, number],
  [5.6, -6.4] satisfies [number, number],
  [5.2, -7.5] satisfies [number, number],
  [3.9, -8] satisfies [number, number],
  [2, -10] satisfies [number, number],
  [-2, -12] satisfies [number, number],
  [-8, -25] satisfies [number, number],
];
export function marinElevation(x: number, z: number) {
  const ridges =
    8.3 * bell(x, z, 14, -4.6, 4.2, 3.3) +
    6.7 * bell(x, z, 22, -3.4, 3.3, 4.3) +
    8.7 * bell(x, z, 13, -14, 7.2, 4.5) +
    6.4 * bell(x, z, 27, -13, 6.5, 6) +
    3 * bell(x, z, 8, -2.8, 2.4, 1.8) +
    7 * bell(x, z, 20, -32, 22, 16) +
    7 * bell(x, z, 15, -54, 25, 15);
  const valleys = 3.6 * bell(x, z, 7.2, -6.5, 3.6, 2.3) + 3.6 * bell(x, z, 17, -10, 3.3, 2.5);
  const folds = 0.3 * Math.sin(x * 1.4 + z * 0.8) * Math.sin(z * 0.7 - x * 0.25);
  let h = 0.42 + 9.2 * Math.tanh(Math.max(0, ridges - valleys + folds) / 9.2);
  // Bluffs give way to sloping coves instead of a single vertical shelf.
  let coast = Infinity;
  for (let i = 3; i < MARIN_OUTLINE.length - 1; i++) {
    const a = MARIN_OUTLINE[i],
      b = MARIN_OUTLINE[i + 1],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    coast = Math.min(coast, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz));
  }
  const shore = Math.min(1, coast / 2.1);
  h *= 0.25 + 0.75 * shore * shore * (3 - 2 * shore);
  h = h * (1 - 0.8 * bell(x, z, 18.8, 1, 1.2, 2.2));
  h = h * (1 - 0.93 * bell(x, z, 16.5, 2.25, 1.1, 0.7));
  const lake = ((x - 6.9) / 1.12) ** 2 + ((z + 6.5) / 0.55) ** 2;
  if (lake < 1.12) h = Math.min(h, 0.88 + 0.12 * lake);
  return Math.max(0.22, h);
}
