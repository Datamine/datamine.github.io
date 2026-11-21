import type { NumericVector } from './types/geometry.ts';
interface StaticBucket {
  triangles: number;
  lo: number[];
  hi: number[];
  start: number;
  count: number;
  cursor: number;
}
/** Repack only the GPU copy. CPU triangle order stays untouched for picking,
 * cutaways and object ranges. Broad bounds include every triangle vertex, so
 * tall landmarks and geometry crossing a cell edge cannot disappear early. */
export function packStaticMesh(source: Float32Array, cellSize = 12) {
  const buckets = new Map<number, StaticBucket>(),
    keyAt = (i: number) => {
      const x = (source[i] + source[i + 11] + source[i + 22]) / 3,
        z = (source[i + 2] + source[i + 13] + source[i + 24]) / 3;
      return (Math.floor(x / cellSize) + 1024) * 2048 + Math.floor(z / cellSize) + 1024;
    };
  for (let i = 0; i < source.length; i += 33) {
    const key = keyAt(i);
    let b = buckets.get(key);
    if (!b) {
      b = {
        triangles: 0,
        start: 0,
        count: 0,
        cursor: 0,
        lo: [Infinity, Infinity, Infinity] satisfies [number, number, number],
        hi: [-Infinity, -Infinity, -Infinity] satisfies [number, number, number],
      };
      buckets.set(key, b);
    }
    b.triangles++;
    for (const j of [0, 11, 22] satisfies [number, number, number])
      for (let k = 0; k < 3; k++) {
        const v = source[i + j + k];
        b.lo[k] = Math.min(b.lo[k], v);
        b.hi[k] = Math.max(b.hi[k], v);
      }
  }
  let offset = 0;
  const batches = [];
  for (const b of buckets.values()) {
    b.start = offset / 11;
    b.count = b.triangles * 3;
    b.cursor = offset;
    offset += b.triangles * 33;
    batches.push(b);
  }
  const data = new Float32Array(source.length);
  for (let i = 0; i < source.length; i += 33) {
    const b = buckets.get(keyAt(i))!;
    data.set(source.subarray(i, i + 33), b.cursor);
    b.cursor += 33;
  }
  return { data, batches };
}
export function batchInFrustum(batch: Pick<StaticBucket, 'lo' | 'hi'>, matrix: NumericVector) {
  const { lo, hi } = batch;
  for (let axis = 0; axis < 3; axis++)
    for (let side = -1; side <= 1; side += 2) {
      const a = matrix[3] + side * matrix[axis],
        b = matrix[7] + side * matrix[4 + axis],
        c = matrix[11] + side * matrix[8 + axis],
        d = matrix[15] + side * matrix[12 + axis];
      if (
        a * (a >= 0 ? hi[0] : lo[0]) +
          b * (b >= 0 ? hi[1] : lo[1]) +
          c * (c >= 0 ? hi[2] : lo[2]) +
          d <
        0
      )
        return false;
    }
  return true;
}
