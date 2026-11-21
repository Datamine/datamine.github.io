import type { HeightField } from './southern-terrain.ts';

interface StreetGradeOptions {
  points: readonly (readonly number[])[];
  halfWidth?: number;
  curbWidth?: number;
  shoulder?: number;
  contains?: (x: number, z: number) => boolean;
}
/** Give a street a level cross-section while keeping its longitudinal grade.
 * Edit the shared height field before buildings, tiles, picking, or navigation
 * consume it; never place a separate road slab over the terrain. */
export function gradeStreetHeightField(
  field: HeightField,
  resolution: number,
  {
    points,
    halfWidth = 0.5,
    curbWidth = 0.25,
    shoulder = 1,
    contains = () => true,
  }: StreetGradeOptions,
) {
  const n = field.length - 1,
    source = field.map((row) => row.slice()),
    flat = halfWidth + curbWidth + Math.SQRT2 / resolution,
    reach = flat + shoulder;
  const sample = (x: number, z: number) => {
    x = Math.max(0, Math.min(n / resolution - 1e-8, x));
    z = Math.max(0, Math.min(n / resolution - 1e-8, z));
    const ix = Math.floor(x * resolution),
      iz = Math.floor(z * resolution),
      u = x * resolution - ix,
      v = z * resolution - iz;
    const a = source[iz][ix],
      b = source[iz][ix + 1],
      c = source[iz + 1][ix + 1],
      d = source[iz + 1][ix];
    return u >= v ? a + (b - a) * u + (c - b) * v : a + (c - d) * u + (d - a) * v;
  };
  const segments = points
    .slice(1)
    .map((b, i) => {
      const a = points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz);
      return { a, b, dx, dz, length };
    })
    .filter((s) => s.length > 1e-9);
  if (!segments.length) return;
  const xs = points.map((p) => p[0]),
    zs = points.map((p) => p[1]);
  for (
    let iz = Math.max(0, Math.floor((Math.min(...zs) - reach) * resolution));
    iz <= Math.min(n, Math.ceil((Math.max(...zs) + reach) * resolution));
    iz++
  ) {
    for (
      let ix = Math.max(0, Math.floor((Math.min(...xs) - reach) * resolution));
      ix <= Math.min(n, Math.ceil((Math.max(...xs) + reach) * resolution));
      ix++
    ) {
      const x = ix / resolution,
        z = iz / resolution;
      if (!contains(x, z)) continue;
      let nearest = null,
        distance = Infinity;
      for (const s of segments) {
        const t = Math.max(
            0,
            Math.min(1, ((x - s.a[0]) * s.dx + (z - s.a[1]) * s.dz) / s.length ** 2),
          ),
          cx = s.a[0] + s.dx * t,
          cz = s.a[1] + s.dz * t,
          d = Math.hypot(x - cx, z - cz);
        if (d < distance) {
          distance = d;
          nearest = { s, t, cx, cz };
        }
      }
      if (distance >= reach || !nearest) continue;
      const { s, t } = nearest;
      // Average a short stretch of centerline to remove small ripples,
      // using the original field so the result cannot depend on loop order.
      let height = 0;
      for (const [offset, weight] of [
        [-1, 1] satisfies [number, number],
        [-0.5, 2] satisfies [number, number],
        [0, 3] satisfies [number, number],
        [0.5, 2] satisfies [number, number],
        [1, 1] satisfies [number, number],
      ]) {
        const at = Math.max(0, Math.min(1, t + offset / s.length));
        height += (sample(s.a[0] + s.dx * at, s.a[1] + s.dz * at) * weight) / 9;
      }
      const u = Math.max(0, Math.min(1, (distance - flat) / shoulder)),
        blend = 1 - u * u * (3 - 2 * u);
      field[iz][ix] = source[iz][ix] + (height - source[iz][ix]) * blend;
    }
  }
}
