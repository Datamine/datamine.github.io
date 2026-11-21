import { requiredValue } from './types/assert.ts';
import type { NumericVector } from './types/geometry.ts';
/** One shared outline for terrain, navigation, water partitions, and the map. */
const COAST_REFERENCE = [
  [8, 70] satisfies [number, number],
  [8, 58] satisfies [number, number],
  [8.1, 49] satisfies [number, number],
  [8.2, 41] satisfies [number, number],
  [8.3, 34] satisfies [number, number],
  [8, 29] satisfies [number, number],
  [7.4, 27] satisfies [number, number],
  [5.5, 26] satisfies [number, number],
  [4.8, 24.5] satisfies [number, number],
  [5.6, 23.2] satisfies [number, number],
  [5.2, 22] satisfies [number, number],
  [6.5, 20.3] satisfies [number, number],
  [7.2, 19] satisfies [number, number],
  [8.8, 18.4] satisfies [number, number],
  [10, 17] satisfies [number, number],
  [11.3, 16.3] satisfies [number, number],
  [12.5, 14.5] satisfies [number, number],
  [14, 12.4] satisfies [number, number],
  [15, 11.5] satisfies [number, number],
  [16.1, 9.6] satisfies [number, number],
  [17.6, 8.8] satisfies [number, number],
  [18.2, 6.5] satisfies [number, number],
  [19.8, 6.2] satisfies [number, number],
  [21.1, 7.7] satisfies [number, number],
  [22.6, 8.3] satisfies [number, number],
  [24.8, 9] satisfies [number, number],
  [27.8, 9.7] satisfies [number, number],
  [30, 10] satisfies [number, number],
  [32.6, 10.5] satisfies [number, number],
  [35, 10.1] satisfies [number, number],
  [37.8, 9.3] satisfies [number, number],
  [39.6, 9.5] satisfies [number, number],
  [41.7, 9.1] satisfies [number, number],
  [43.2, 9.6] satisfies [number, number],
  [44.6, 9.3] satisfies [number, number],
  [46, 10.3] satisfies [number, number],
  [47.4, 11.7] satisfies [number, number],
  [48.6, 13.3] satisfies [number, number],
  [49.8, 14.6] satisfies [number, number],
  [51.2, 16.2] satisfies [number, number],
  [52.6, 18] satisfies [number, number],
  [54, 20.2] satisfies [number, number],
  [54.6, 20.8] satisfies [number, number],
  [55.4, 20] satisfies [number, number],
  [57.2, 21.8] satisfies [number, number],
  [55.7, 23.2] satisfies [number, number],
  [55.9, 25] satisfies [number, number],
  [55.8, 27.8] satisfies [number, number],
  [55.1, 30.6] satisfies [number, number],
  [55.8, 32.2] satisfies [number, number],
  [55.2, 33.7] satisfies [number, number],
  [56.3, 35] satisfies [number, number],
  [56.5, 37.7] satisfies [number, number],
  [57.2, 40] satisfies [number, number],
  [57, 42.2] satisfies [number, number],
  [58, 43.3] satisfies [number, number],
  [57.2, 45.5] satisfies [number, number],
  [58.7, 47] satisfies [number, number],
  [60.6, 47.8] satisfies [number, number],
  [61.6, 49.6] satisfies [number, number],
  [60.4, 51.2] satisfies [number, number],
  [58.8, 51.5] satisfies [number, number],
  [58.5, 53] satisfies [number, number],
  [59.4, 54.8] satisfies [number, number],
  [58.3, 56.5] satisfies [number, number],
  [56.7, 57.1] satisfies [number, number],
  [56, 59.4] satisfies [number, number],
  [56, 70] satisfies [number, number],
];
const coastSmooth = (v: number) => {
  v = Math.max(0, Math.min(1, v));
  return v * v * (3 - 2 * v);
};
const WESTERN_COAST_KNOTS = [
  [43.5, 12] satisfies [number, number],
  [49, 11.6] satisfies [number, number],
  [56, 9.7] satisfies [number, number],
  [62, 10.5] satisfies [number, number],
  [69, 12.8] satisfies [number, number],
  [77, 11.4] satisfies [number, number],
  [84, 9.3] satisfies [number, number],
  [91, 10.2] satisfies [number, number],
  [96, 12] satisfies [number, number],
  [104, 11.7] satisfies [number, number],
  [111, 9.5] satisfies [number, number],
  [120, 10.6] satisfies [number, number],
  [127, 12.9] satisfies [number, number],
  [136, 11.7] satisfies [number, number],
  [144, 9.3] satisfies [number, number],
  [153, 10.4] satisfies [number, number],
  [162, 12.7] satisfies [number, number],
  [171, 10.1] satisfies [number, number],
  [180, 11.6] satisfies [number, number],
  [190, 9.8] satisfies [number, number],
  [200, 11.9] satisfies [number, number],
  [208, 10.6] satisfies [number, number],
  [216, 12.4] satisfies [number, number],
  [222, 11.5] satisfies [number, number],
  [228, 9.9] satisfies [number, number],
  [234, 10.7] satisfies [number, number],
  [240, 12.1] satisfies [number, number],
];
function westernCoastCurve(z: number) {
  let i = 1;
  while (i < WESTERN_COAST_KNOTS.length - 1 && z > WESTERN_COAST_KNOTS[i][0]) i++;
  const a = WESTERN_COAST_KNOTS[i - 1],
    b = WESTERN_COAST_KNOTS[i],
    t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
  return (
    a[1] +
    (b[1] - a[1]) * coastSmooth(t) +
    Math.sin(Math.PI * t) ** 2 * (0.14 * Math.sin(z * 1.37) + 0.08 * Math.sin(z * 2.61))
  );
}
// Two-tile contour stations align with the southern half-tile height field.
// Interpolate this same polygon everywhere, rather than resampling a curve
// independently for rendering, collision, water, or the minimap.
const WESTERN_COAST_POINTS = [
  [43.5, 12] satisfies [number, number],
  ...Array.from(
    {
      length:
        Math.round((requiredValue(WESTERN_COAST_KNOTS.at(-1), 'coast endpoint')[0] - 44) / 2) + 1,
    },
    (_, i) => {
      const z = 44 + i * 2;
      return [z, westernCoastCurve(z)] satisfies [number, number];
    },
  ),
];
export function westernCoastX(z: number, scale = 1.5) {
  const factor = scale / 1.5,
    zz = z / factor;
  let i = 1;
  while (i < WESTERN_COAST_POINTS.length - 1 && zz > WESTERN_COAST_POINTS[i][0]) i++;
  const a = WESTERN_COAST_POINTS[i - 1],
    b = WESTERN_COAST_POINTS[i],
    t = Math.max(0, Math.min(1, (zz - a[0]) / (b[0] - a[0])));
  return (a[1] + (b[1] - a[1]) * t) * factor;
}
export function westernBeachWidth(z: number) {
  const width = 0.35 + 1.3 * (0.5 + 0.5 * Math.sin(z * 0.17 + 0.7)) ** 1.4;
  // Ocean Beach reaches the Great Highway. Narrow it gradually into the
  // peninsula coves so the two terrain regions share one sandy seam.
  if (z >= 96 && z < 104) {
    const join = coastSmooth((z - 96) / 8);
    return (14.4 - westernCoastX(z)) * (1 - join) + width * join;
  }
  return width;
}
export function westernShoreType(x: number, z: number) {
  const distance = x - westernCoastX(z),
    width = westernBeachWidth(z);
  return distance < 0 ? 'sea' : distance < width ? (width < 0.65 ? 'rock' : 'sand') : 'grass';
}
export function westernCoastline(north = 43.5, south = 180, scale = 1.5) {
  const factor = scale / 1.5;
  return [
    [westernCoastX(north, scale), north] satisfies [number, number],
    ...WESTERN_COAST_POINTS.filter(
      ([z]) => z * factor > north + 1e-8 && z * factor < south - 1e-8,
    ).map(([z, x]) => [x * factor, z * factor] satisfies [number, number]),
    [westernCoastX(south, scale), south] satisfies [number, number],
  ];
}
export function createSFCoast(scale = 1.5, south = 70 * scale) {
  const west = westernCoastline(29 * scale, south, scale).reverse();
  const north = COAST_REFERENCE.slice(6, -1).map(([x, z]) => {
    const northeast = coastSmooth((x - 40) / 6) * (1 - coastSmooth((z - 19) / 5));
    return [
      x * scale + 2 * northeast,
      z * scale - 2 * northeast * (1 - coastSmooth((z - 15) / 7)),
    ] satisfies [number, number];
  });
  return [...west, ...north, [56 * scale, south] satisfies [number, number]];
}
/** Split at terrain grid edges AND triangle diagonals. Every curtain top is
 * then exactly on one linear terrain face; no exposed holes over the sea. */
export function shorelineSegments(outline: readonly NumericVector[], step = 0.25) {
  const segments = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length],
      cuts = [0, 1] satisfies [number, number];
    for (const project of [
      (p: NumericVector) => p[0],
      (p: NumericVector) => p[1],
      (p: NumericVector) => p[0] - p[1],
    ]) {
      const lo = project(a),
        hi = project(b),
        delta = hi - lo;
      if (Math.abs(delta) < 1e-10) continue;
      for (let k = Math.floor(Math.min(lo, hi) / step) + 1; k * step < Math.max(lo, hi) - 1e-9; k++)
        cuts.push((k * step - lo) / delta);
    }
    const values = [...new Set(cuts.map((t) => Math.round(t * 1e10) / 1e10))].sort((a, b) => a - b),
      at = (t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let j = 1; j < values.length; j++) segments.push([at(values[j - 1]), at(values[j])]);
  }
  return segments;
}
