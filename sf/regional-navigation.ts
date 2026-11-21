import { createNavigationGrid } from './navigation.ts';

/** Quarter-tile navigation over the rendered southern land, with the same
 * adjacency and corner rules as the city. Spatial buckets keep solid-footprint
 * checks cheap; the completed graph is reused for every player/NPC route. */
export function createRegionalNavigation({
  west = 7.875,
  east = 108.625,
  north = 93.375,
  south = 180.625,
  walkable,
  clearance = 0.16,
}: {
  west?: number;
  east?: number;
  north?: number;
  south?: number;
  walkable: (x: number, z: number) => boolean;
  clearance?: number;
}) {
  const resolution = 4,
    width = Math.ceil((east - west) * resolution),
    height = Math.ceil((south - north) * resolution),
    buckets = new Map<string, (readonly (readonly number[])[])[]>();
  let graph: ReturnType<typeof createNavigationGrid> | null = null;
  const local = (p: { x: number; y: number }) => ({ x: p.x + 0.5 - west, y: p.y + 0.5 - north }),
    world = (p: { x: number; y: number }) => ({ x: p.x + west - 0.5, y: p.y + north - 0.5 });
  function blocked(x: number, z: number) {
    for (const polygon of buckets.get(Math.floor(x / 4) + ',' + Math.floor(z / 4)) || []) {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[j],
          b = polygon[i],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          t = Math.max(
            0,
            Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)),
          );
        if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < clearance) return true;
        if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
          inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }
  // City/Marin/Tahoe probes frequently miss this region entirely. Reject
  // those before evaluating every southern plot, fence and water boundary.
  const maxX = west + width / resolution,
    maxZ = north + height / resolution;
  const raw = (x: number, z: number) =>
    x >= west && x < maxX && z >= north && z < maxZ && walkable(x, z) && !blocked(x, z);
  function clearSegment(a: { x: number; y: number }, b: { x: number; y: number }) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.08));
    for (let i = 0; i <= n; i++)
      if (!raw(a.x + ((b.x - a.x) * i) / n + west, a.y + ((b.y - a.y) * i) / n + north))
        return false;
    return true;
  }
  function ensure() {
    if (graph) return graph;
    const mask = new Uint8Array(width * height);
    for (let z = 0; z < height; z++)
      for (let x = 0; x < width; x++)
        mask[z * width + x] = raw(west + (x + 0.5) / resolution, north + (z + 0.5) / resolution)
          ? 1
          : 0;
    return (graph = createNavigationGrid({
      width,
      height,
      resolution,
      mask,
      canTraverse: clearSegment,
      canLink: (a: { x: number; y: number }, b: { x: number; y: number }) => {
        // Endpoints are already in the mask; sample only the edge interior.
        for (const t of [0.25, 0.5, 0.75] satisfies [number, number, number])
          if (!raw(a.x + (b.x - a.x) * t + west, a.y + (b.y - a.y) * t + north)) return false;
        return true;
      },
    }));
  }
  function setObstacles(obstacles: readonly (readonly (readonly number[])[])[]) {
    buckets.clear();
    graph = null;
    for (const polygon of obstacles) {
      const xs = polygon.map((p) => p[0]),
        zs = polygon.map((p) => p[1]);
      for (
        let z = Math.floor((Math.min(...zs) - clearance) / 4);
        z <= Math.floor((Math.max(...zs) + clearance) / 4);
        z++
      )
        for (
          let x = Math.floor((Math.min(...xs) - clearance) / 4);
          x <= Math.floor((Math.max(...xs) + clearance) / 4);
          x++
        ) {
          const key = x + ',' + z;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key)!.push(polygon);
        }
    }
  }
  return {
    restore(prepared: import('./types/navigation.ts').NavigationGraphData) {
      graph = createNavigationGrid({
        ...prepared,
        prepared,
        canTraverse: clearSegment,
        canLink: clearSegment,
      });
    },
    setObstacles,
    contains: (x: number, z: number) => raw(x, z) && ensure().free(x - west, z - north),
    segment: (a: { x: number; y: number }, b: { x: number; y: number }) =>
      ensure().segment(local(a), local(b)),
    path: (a: { x: number; y: number }, b: { x: number; y: number }) =>
      ensure().path(local(a), local(b))?.map(world) || null,
    get graph() {
      return ensure();
    },
  };
}
