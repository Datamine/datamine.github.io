import type { Point, Ray } from './types/geometry.ts';
interface MarinPickGroup {
  lo: number[];
  hi: number[];
  faces: number[];
}
import { drawBolinas, bolinasBlocks } from './bolinas.ts';
import { drawGoblinTown, goblinHutBlocks } from './goblin-town.ts';
import { createNavigationGrid } from './navigation.ts';
import { Mesh, unit, rayTriangle, rayBox } from './geometry.ts';

const marinInside = (x: number, z: number, poly: number[][]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
};
function drawMarinSurface(
  m: Mesh,
  polygon: number[][],
  scale: number,
  height: (x: number, z: number) => number,
) {
  const marinHeight = height,
    mapPosition = (v: number) => v * scale,
    MARIN = polygon;
  // Clip boundary cells to the actual headland polygon, keeping the shore
  // continuous rather than exposing a checkerboard of whole terrain cells.
  // Distant northern ridges use a coarse mesh; the visible headlands keep
  // finer contours without a rectangular land edge behind them.
  for (let z = mapPosition(-65); z < mapPosition(3.2);) {
    const step = z < mapPosition(-22) ? 2.4 : 0.6;
    for (let x = mapPosition(-20); x < mapPosition(65); x += step) {
      const points = [],
        insideCell = (p: number[]) =>
          p[0] >= x - 1e-8 &&
          p[0] <= x + step + 1e-8 &&
          p[1] >= z - 1e-8 &&
          p[1] <= z + step + 1e-8;
      for (const p of [
        [x, z] satisfies [number, number],
        [x + step, z] satisfies [number, number],
        [x + step, z + step] satisfies [number, number],
        [x, z + step] satisfies [number, number],
      ])
        if (marinInside(...p, MARIN)) points.push(p);
      // Match the fine row's vertices at the terrain LOD seam.
      if (step > 1 && z + step >= mapPosition(-22))
        for (let dx = 0.6; dx < step - 0.01; dx += 0.6) {
          const p = [x + dx, z + step] satisfies [number, number];
          if (marinInside(...p, MARIN)) points.push(p);
        }
      for (let i = 0; i < MARIN.length; i++) {
        const a = MARIN[i],
          b = MARIN[(i + 1) % MARIN.length],
          dx = b[0] - a[0],
          dz = b[1] - a[1];
        if (insideCell(a)) points.push(a);
        for (const xx of [x, x + step] satisfies [number, number])
          if (Math.abs(dx) > 1e-9) {
            const t = (xx - a[0]) / dx,
              p = [xx, a[1] + dz * t] satisfies [number, number];
            if (t >= 0 && t <= 1 && insideCell(p)) points.push(p);
          }
        for (const zz of [z, z + step] satisfies [number, number])
          if (Math.abs(dz) > 1e-9) {
            const t = (zz - a[1]) / dz,
              p = [a[0] + dx * t, zz] satisfies [number, number];
            if (t >= 0 && t <= 1 && insideCell(p)) points.push(p);
          }
      }
      const unique = [
        ...new Map(points.map((p) => [p.map((v) => v.toFixed(6)).join(','), p])).values(),
      ];
      if (unique.length < 3) continue;
      const center = unique.reduce(
        (a, p) =>
          [a[0] + p[0] / unique.length, a[1] + p[1] / unique.length] satisfies [number, number],
        [0, 0] satisfies [number, number],
      );
      unique.sort(
        (a, b) =>
          Math.atan2(a[1] - center[1], a[0] - center[0]) -
          Math.atan2(b[1] - center[1], b[0] - center[0]),
      );
      for (let i = 0; i < unique.length; i++) {
        const a = unique[i],
          b = unique[(i + 1) % unique.length];
        const start = m.data.length,
          h = marinHeight(center[0], center[1]),
          slope =
            Math.hypot(
              marinHeight(center[0] + 0.2, center[1]) - h,
              marinHeight(center[0], center[1] + 0.2) - h,
            ) / 0.2;
        m.tri(
          [center[0], h, center[1]],
          [b[0], marinHeight(b[0], b[1]), b[1]],
          [a[0], marinHeight(a[0], a[1]), a[1]],
          '#899775',
          'grass',
        );
        for (let v = start; v < m.data.length; v += 11) {
          const x = m.data[v],
            z = m.data[v + 2],
            n = unit([
              -(marinHeight(x + 0.1, z) - marinHeight(x - 0.1, z)) / 0.2,
              1,
              -(marinHeight(x, z + 0.1) - marinHeight(x, z - 0.1)) / 0.2,
            ] satisfies [number, number, number]),
            dry = 0.5 + 0.3 * Math.sin(x * 0.28 + z * 0.11) + 0.2 * Math.sin(z * 0.57 - x * 0.19),
            rock = Math.min(0.65, Math.max(0, slope - 0.6) * 0.5),
            grass = [0.46 + dry * 0.13, 0.53 + dry * 0.065, 0.36 + dry * 0.07] satisfies [
              number,
              number,
              number,
            ];
          for (let k = 0; k < 3; k++) {
            m.data[v + 3 + k] = n[k];
            m.data[v + 6 + k] =
              grass[k] * (1 - rock) +
              ([0.62, 0.6, 0.49] satisfies [number, number, number])[k] * rock;
          }
        }
      }
    }
    z += step;
  }
}
/** Grass and rocky headlands use a native adjacency graph, sharing their coast
 * and prison footprint with collision. Coordinates exposed here are logical
 * x/y; rendered coordinates are half a tile higher in x/z. */
export function createMarinLand({
  polygon,
  scale = 1.5,
  detention,
  gate,
  resolution = 2,
  prepared = null,
}: {
  polygon: number[][];
  scale?: number;
  detention: Pick<
    ReturnType<typeof import('./encounters.ts').createDetentionSite>,
    'terrain' | 'walkable' | 'path' | 'x' | 'z' | 'w' | 'd'
  >;
  gate: import('./types/geometry.ts').Point;
  resolution?: number;
  prepared?: import('./types/navigation.ts').NavigationGraphData | null;
}) {
  const west = Math.floor(Math.min(...polygon.map((p) => p[0]))),
    north = Math.floor(Math.min(...polygon.map((p) => p[1]))),
    width = Math.ceil((Math.max(...polygon.map((p) => p[0])) - west) * resolution) + 1,
    height = Math.ceil((Math.max(...polygon.map((p) => p[1])) - north) * resolution) + 1;
  const onLand = (x: number, z: number) => marinInside(x, z, polygon),
    ground = detention.terrain;
  const freeWorld = (x: number, z: number) =>
    onLand(x, z) &&
    !goblinHutBlocks(x, z) &&
    !bolinasBlocks(x, z) &&
    ![
      [-0.18, 0] satisfies [number, number],
      [0.18, 0] satisfies [number, number],
      [0, -0.18] satisfies [number, number],
      [0, 0.18] satisfies [number, number],
    ].some(([dx, dz]) => !onLand(x + dx, z + dz)) &&
    !(
      Math.abs(x - detention.x) < detention.w / 2 + 0.2 &&
      Math.abs(z - detention.z) < detention.d / 2 + 0.2
    );
  const point = (p: Point) => ({ x: p.x + 0.5 - west, y: p.y + 0.5 - north }),
    logical = (p: Point) => ({ x: p.x + west - 0.5, y: p.y + north - 0.5 });
  const clear = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.2));
    for (let i = 0; i <= steps; i++)
      if (
        !freeWorld(west + a.x + ((b.x - a.x) * i) / steps, north + a.y + ((b.y - a.y) * i) / steps)
      )
        return false;
    return true;
  };
  const mask =
      prepared?.mask ||
      Uint8Array.from({ length: width * height }, (_, i) =>
        freeWorld(
          west + ((i % width) + 0.5) / resolution,
          north + (Math.floor(i / width) + 0.5) / resolution,
        )
          ? 1
          : 0,
      ),
    graph = createNavigationGrid({ width, height, resolution, mask, canTraverse: clear, prepared });
  const contains = (x: number, z: number) => freeWorld(x, z) && graph.free(x - west, z - north),
    segment = (a: Point, b: Point) => graph.segment(point(a), point(b));
  function internal(a: { x: number; y: number }, b: { x: number; y: number }) {
    return graph.path(point(a), point(b))?.map(logical) || null;
  }
  function path(
    from: { x: number; y: number },
    to: { x: number; y: number },
    basePath: (from: Point, to: Point) => Point[] | null | undefined,
  ) {
    const a = contains(from.x + 0.5, from.y + 0.5),
      b = contains(to.x + 0.5, to.y + 0.5);
    if (!a && !b) return basePath(from, to);
    if (a && b) return internal(from, to);
    const head = a ? internal(from, gate) : basePath(from, gate),
      tail = b ? internal(gate, to) : basePath(gate, to);
    return head && tail ? [...head, ...tail] : null;
  }
  function nearest(
    x: number,
    y: number,
    radius = 3,
    predicate: (value0: number, value1: number) => boolean = () => true,
  ) {
    const p = point({ x, y }),
      found = graph.nearest(p.x, p.y, radius, (a, b) => {
        const q = logical({ x: a, y: b });
        return predicate(q.x, q.y);
      });
    return found ? logical(found) : null;
  }
  let surface: Mesh | null = null;
  function surfaceMesh() {
    if (!surface) {
      surface = new Mesh();
      drawMarinSurface(surface, polygon, scale, ground);
      drawGoblinTown(surface, ground);
      drawBolinas(surface, ground);
    }
    return surface;
  }
  // Group terrain faces once. Ordinary city clicks reject every headland
  // box without allocating or testing tens of thousands of triangles.
  let pickGroups: MarinPickGroup[] | null = null;
  function raycast(ray: Ray) {
    const data = surfaceMesh().data;
    if (!pickGroups) {
      const bins = new Map<string, MarinPickGroup>();
      for (let i = 0; i < data.length; i += 33) {
        const key = Math.floor(data[i] / 8) + ',' + Math.floor(data[i + 2] / 8);
        let b = bins.get(key);
        if (!b) {
          b = {
            lo: [Infinity, Infinity, Infinity] satisfies [number, number, number],
            hi: [-Infinity, -Infinity, -Infinity] satisfies [number, number, number],
            faces: [],
          };
          bins.set(key, b);
        }
        b.faces.push(i);
        for (const j of [0, 11, 22] satisfies [number, number, number])
          for (let k = 0; k < 3; k++) {
            b.lo[k] = Math.min(b.lo[k], data[i + j + k]);
            b.hi[k] = Math.max(b.hi[k], data[i + j + k]);
          }
      }
      pickGroups = [...bins.values()];
    }
    let best = Infinity;
    for (const b of pickGroups) {
      const near = rayBox(ray, b.lo, b.hi);
      if (near === null || near > best) continue;
      for (const i of b.faces) {
        const hit = rayTriangle(
          ray,
          [data[i], data[i + 1], data[i + 2]] satisfies [number, number, number],
          [data[i + 11], data[i + 12], data[i + 13]] satisfies [number, number, number],
          [data[i + 22], data[i + 23], data[i + 24]] satisfies [number, number, number],
        );
        if (hit !== null && hit < best) best = hit;
      }
    }
    return best < Infinity
      ? { distance: best, point: ray.origin.map((v, i) => v + ray.dir[i] * best) }
      : null;
  }
  return {
    graph,
    gate,
    onLand,
    contains,
    height: ground,
    segment,
    path,
    nearest,
    raycast,
    draw(m: { data: number[] }) {
      for (const v of surfaceMesh().data) m.data.push(v);
    },
  };
}
