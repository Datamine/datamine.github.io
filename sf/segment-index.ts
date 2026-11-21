interface RoadSegment {
  x: number;
  z: number;
  dx: number;
  dz: number;
  length2: number;
  width: number;
  loX: number;
  hiX: number;
  loZ: number;
  hiZ: number;
  stamp: number;
}
interface SegmentRoute {
  points: readonly (readonly number[])[];
  halfWidth?: number;
}
/** Exact distance to immutable road/path centerlines, less each half-width.
 * Nearby queries use buckets; sparse distant queries scan the bounded source.
 * Generation stamps deduplicate segments without a Set allocation per query. */
export function createSegmentDistanceIndex(
  routes: readonly SegmentRoute[],
  { size = 8 }: { size?: number } = {},
) {
  const segments: RoadSegment[] = [],
    buckets = new Map<string, RoadSegment[]>();
  let generation = 0,
    maxWidth = 0;
  for (const route of routes)
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        width = route.halfWidth || 0;
      const segment = {
        x: a[0],
        z: a[1],
        dx,
        dz,
        length2: dx * dx + dz * dz,
        width,
        loX: Math.min(a[0], b[0]),
        hiX: Math.max(a[0], b[0]),
        loZ: Math.min(a[1], b[1]),
        hiZ: Math.max(a[1], b[1]),
        stamp: 0,
      };
      segments.push(segment);
      maxWidth = Math.max(maxWidth, width);
      for (let z = Math.floor(segment.loZ / size); z <= Math.floor(segment.hiZ / size); z++)
        for (let x = Math.floor(segment.loX / size); x <= Math.floor(segment.hiX / size); x++) {
          const key = x + ',' + z;
          let bucket = buckets.get(key);
          if (!bucket) buckets.set(key, (bucket = []));
          bucket.push(segment);
        }
    }
  return (x: number, z: number) => {
    if (++generation >= Number.MAX_SAFE_INTEGER) {
      for (const s of segments) s.stamp = 0;
      generation = 1;
    }
    let best = Infinity;
    const visit = (items: readonly RoadSegment[]) => {
      for (const s of items) {
        if (s.stamp === generation) continue;
        s.stamp = generation;
        const dxBox = Math.max(s.loX - x, 0, x - s.hiX),
          dzBox = Math.max(s.loZ - z, 0, z - s.hiZ),
          reach = best + s.width;
        if (reach < 0 || dxBox * dxBox + dzBox * dzBox > reach * reach) continue;
        const t = s.length2
          ? Math.max(0, Math.min(1, ((x - s.x) * s.dx + (z - s.z) * s.dz) / s.length2))
          : 0;
        best = Math.min(best, Math.hypot(x - s.x - s.dx * t, z - s.z - s.dz * t) - s.width);
      }
    };
    visit(buckets.get(Math.floor(x / size) + ',' + Math.floor(z / size)) || []);
    const radius = best + maxWidth;
    if (!Number.isFinite(best) || radius > size * 2) visit(segments);
    else
      for (let iz = Math.floor((z - radius) / size); iz <= Math.floor((z + radius) / size); iz++)
        for (let ix = Math.floor((x - radius) / size); ix <= Math.floor((x + radius) / size); ix++)
          visit(buckets.get(ix + ',' + iz) || []);
    return best;
  };
}
