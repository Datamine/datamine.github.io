import { streamDistance, BOTTLE_STREAM } from './social-layout.ts';

const runoffBounds = {
  west: Math.min(...BOTTLE_STREAM.points.map((p) => p[0])) - 0.3,
  east: 16.8,
  north: 113.7,
  south: 114.7,
};
export function nearRunoff(poly: number[][]) {
  return (
    !poly.every((p) => p[0] < runoffBounds.west) &&
    !poly.every((p) => p[0] > runoffBounds.east) &&
    !poly.every((p) => p[2] < runoffBounds.north) &&
    !poly.every((p) => p[2] > runoffBounds.south)
  );
}
function clipRunoff(poly: number[][], water: boolean) {
  const out = [],
    sign = water ? -1 : 1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length],
      da = a[3] * sign,
      db = b[3] * sign;
    if (da >= -1e-10) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push(a.map((v, k) => v + (b[k] - v) * t));
    }
  }
  return out.map((p) => p.slice(0, 3));
}
/** Split existing planar terrain faces, rather than layer water over grass.
 * Four subdivisions resolve the narrow channel without changing the height
 * field or the boundary vertices shared with neighboring terrain triangles. */
export function partitionRunoff(
  poly: number[][],
  emitLand: (polygon: number[][]) => void,
  emitWater: (polygon: number[][]) => void,
) {
  if (!nearRunoff(poly)) {
    emitLand(poly);
    return;
  }
  for (let fan = 1; fan < poly.length - 1; fan++) {
    const a = poly[0],
      b = poly[fan],
      c = poly[fan + 1],
      at = (u: number, v: number) => a.map((n, k) => n + (b[k] - n) * u + (c[k] - n) * v),
      emit = (tri: number[][]) => {
        const signed = tri.map((p) => [...p, streamDistance(p[0], p[2])]);
        const land = clipRunoff(signed, false),
          water = clipRunoff(signed, true);
        if (land.length >= 3) emitLand(land);
        if (water.length >= 3) emitWater(water);
      };
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4 - i; j++) {
        emit([at(i / 4, j / 4), at((i + 1) / 4, j / 4), at(i / 4, (j + 1) / 4)]);
        if (i + j < 3)
          emit([at((i + 1) / 4, j / 4), at((i + 1) / 4, (j + 1) / 4), at(i / 4, (j + 1) / 4)]);
      }
  }
}
