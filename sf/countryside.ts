import type { Point, Ray } from './types/geometry.ts';
import type { RoadPoint, RoadSegment } from './types/roads.ts';
interface CountryParcel {
  x: number;
  z: number;
  w: number;
  d: number;
  angle?: number;
}
interface CountryObstacle {
  x: number;
  z: number;
  w: number;
  d: number;
  c: number;
  s: number;
}
import { isFiniteNumber } from './types/json.ts';
import { rayTriangle } from './geometry.ts';
import { EAST_BAY_COAST_X } from './geography.ts';
import { TAHOE_BOUNDS, regionalGroundHeight } from './tahoe.ts';

/** Open California ground uses a small visibility graph around solid parcels,
 * rather than allocating millions of empty grid cells between SF and Tahoe.
 * The same analytic edges validate paths on the client and server. */
export function createCountryside({
  road,
  campus,
  parcels = [],
}: {
  road: {
    points: readonly RoadPoint[];
    segments: readonly Pick<RoadSegment, 'a' | 'b' | 'dx' | 'dz' | 'length'>[];
  };
  campus: { quads: readonly (readonly (readonly number[])[])[] };
  parcels?: readonly CountryParcel[];
}) {
  const b = TAHOE_BOUNDS,
    bounds = {
      west: EAST_BAY_COAST_X + 0.18,
      east: b.east + 256,
      north: b.north - 256,
      south: Math.max(...road.points.map((p) => p.z)) + 256,
    };
  const rectangle = (x: number, z: number, w: number, d: number, angle = 0) => ({
    x,
    z,
    w: w + 0.36,
    d: d + 0.36,
    c: Math.cos(angle),
    s: Math.sin(angle),
  });
  const campusQuad = campus.quads[0],
    center = campusQuad.reduce((p, q) => ({ x: p.x + q[0] / 4, z: p.z + q[2] / 4 }), {
      x: 0,
      z: 0,
    }),
    edge = [campusQuad[3][0] - campusQuad[0][0], campusQuad[3][2] - campusQuad[0][2]] satisfies [
      number,
      number,
    ];
  const obstacles = [
    rectangle((b.west + b.east) / 2, (b.north + b.south) / 2, b.east - b.west, b.south - b.north),
    rectangle(
      center.x,
      center.z,
      Math.hypot(...edge),
      Math.hypot(campusQuad[1][0] - campusQuad[0][0], campusQuad[1][2] - campusQuad[0][2]),
      Math.atan2(edge[1], edge[0]),
    ),
    ...parcels.map((p) => rectangle(p.x, p.z, p.w, p.d, p.angle)),
  ];
  const local = (p: { x: number; y: number }, o: CountryObstacle) => ({
    x: (p.x - o.x) * o.c + (p.y - o.z) * o.s,
    y: -(p.x - o.x) * o.s + (p.y - o.z) * o.c,
  });
  const inBounds = (p: Point) =>
    isFiniteNumber(p.x) &&
    isFiniteNumber(p.y) &&
    p.x >= bounds.west &&
    p.x <= bounds.east &&
    p.y >= bounds.north &&
    p.y <= bounds.south;
  const free = (p: Point) =>
    inBounds(p) &&
    !obstacles.some((o) => {
      const q = local(p, o);
      return Math.abs(q.x) <= o.w / 2 && Math.abs(q.y) <= o.d / 2;
    });
  function intersects(
    a: { x: number; y: number },
    b: { x: number; y: number },
    o: CountryObstacle,
  ) {
    const p = local(a, o),
      q = local(b, o);
    let lo = 0,
      hi = 1;
    for (const [axis, half] of [
      ['x', o.w / 2] satisfies ['x' | 'y', number],
      ['y', o.d / 2] satisfies ['x' | 'y', number],
    ]) {
      const d = q[axis] - p[axis];
      if (Math.abs(d) < 1e-10) {
        if (Math.abs(p[axis]) > half) return false;
      } else {
        let a = (-half - p[axis]) / d,
          b = (half - p[axis]) / d;
        if (a > b) [a, b] = [b, a] satisfies [number, number];
        lo = Math.max(lo, a);
        hi = Math.min(hi, b);
        if (lo > hi) return false;
      }
    }
    return true;
  }
  const world = (p: { x: number; y: number }) => ({ x: p.x + 0.5, y: p.y + 0.5 }),
    logical = (p: Point) => ({ x: p.x - 0.5, y: p.y - 0.5 });
  const clear = (a: Point, b: Point) =>
    free(a) && free(b) && !obstacles.some((o) => intersects(a, b, o));
  const nodes: Point[] = [];
  for (const o of obstacles)
    for (const sx of [-1, 1] satisfies [number, number])
      for (const sz of [-1, 1] satisfies [number, number]) {
        const u = sx * (o.w / 2 + 0.035),
          v = sz * (o.d / 2 + 0.035),
          p = { x: o.x + u * o.c - v * o.s, y: o.z + u * o.s + v * o.c };
        if (free(p)) nodes.push(p);
      }
  const edges: [number, number][][] = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++)
    for (let j = 0; j < i; j++)
      if (clear(nodes[i], nodes[j])) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        edges[i].push([j, d] satisfies [number, number]);
        edges[j].push([i, d] satisfies [number, number]);
      }
  function internal(from: { x: number; y: number }, to: { x: number; y: number }) {
    const a = world(from),
      b = world(to);
    if (!free(a) || !free(b)) return null;
    if (clear(a, b)) return Math.hypot(a.x - b.x, a.y - b.y) < 1e-8 ? [] : [{ ...to }];
    const points = [...nodes, a, b],
      start = nodes.length,
      goal = start + 1,
      links = edges.map((e) => [...e]);
    links.push([], []);
    for (let i = 0; i < nodes.length; i++)
      for (const id of [start, goal] satisfies [number, number])
        if (clear(points[i], points[id])) {
          const d = Math.hypot(points[i].x - points[id].x, points[i].y - points[id].y);
          links[i].push([id, d] satisfies [number, number]);
          links[id].push([i, d] satisfies [number, number]);
        }
    const costs = points.map(() => Infinity),
      parents = points.map(() => -1),
      visited = new Set<number>();
    costs[start] = 0;
    for (let n = 0; n < points.length; n++) {
      let id = -1;
      for (let i = 0; i < points.length; i++)
        if (!visited.has(i) && (id < 0 || costs[i] < costs[id])) id = i;
      if (id < 0 || !Number.isFinite(costs[id])) break;
      if (id === goal) {
        const path = [];
        for (let at = goal; at !== start; at = parents[at]) path.push(logical(points[at]));
        return path.reverse();
      }
      visited.add(id);
      for (const [next, d] of links[id])
        if (costs[id] + d < costs[next]) {
          costs[next] = costs[id] + d;
          parents[next] = id;
        }
    }
    return null;
  }
  function join(p: { x: number; y: number }) {
    let best = Infinity,
      result: ReturnType<typeof logical> | null = null;
    const q = world(p);
    for (const s of road.segments) {
      const t = Math.max(
          0,
          Math.min(1, ((q.x - s.a.x) * s.dx + (q.y - s.a.z) * s.dz) / (s.length * s.length)),
        ),
        at = { x: s.a.x + s.dx * t, y: s.a.z + s.dz * t },
        d = Math.hypot(q.x - at.x, q.y - at.y);
      if (d < best && free(at)) {
        best = d;
        result = logical(at);
      }
    }
    return result;
  }
  function path(
    from: { x: number; y: number },
    to: { x: number; y: number },
    fallback: (from: Point, to: Point) => Point[] | null | undefined,
  ) {
    const a = free(world(from)),
      b = free(world(to));
    if (!a && !b) return fallback(from, to);
    if (a && b) return internal(from, to);
    const gate = join(a ? from : to);
    if (!gate) return null;
    const head = a ? internal(from, gate) : fallback(from, gate),
      tail = b ? internal(gate, to) : fallback(gate, to);
    return head && tail ? [...head, ...tail] : null;
  }
  // Match the clipped 16-tile triangle cells of drawRegionalBackdrop exactly.
  function cell(x: number, z: number) {
    if (x < EAST_BAY_COAST_X || (x >= b.west && x <= b.east && z >= b.north && z <= b.south))
      return null;
    let west = Math.max(EAST_BAY_COAST_X, Math.floor(x / 16) * 16),
      east = Math.floor(x / 16) * 16 + 16,
      north = Math.floor(z / 16) * 16,
      south = north + 16;
    if (west < b.east && east > b.west && north < b.south && south > b.north) {
      if (z < b.north) south = Math.min(south, b.north);
      else if (z > b.south) north = Math.max(north, b.south);
      else if (x < b.west) east = Math.min(east, b.west);
      else west = Math.max(west, b.east);
    }
    return [
      [west, north] satisfies [number, number],
      [west, south] satisfies [number, number],
      [east, south] satisfies [number, number],
      [east, north] satisfies [number, number],
    ].map(([x, z]) => [x, regionalGroundHeight(x, z), z] satisfies [number, number, number]);
  }
  function height(x: number, z: number) {
    const q = cell(x, z);
    if (!q) return regionalGroundHeight(x, z);
    const u = (x - q[0][0]) / (q[2][0] - q[0][0]),
      v = (z - q[0][2]) / (q[2][2] - q[0][2]);
    return v >= u
      ? q[0][1] + v * (q[1][1] - q[0][1]) + u * (q[2][1] - q[1][1])
      : q[0][1] + u * (q[3][1] - q[0][1]) + v * (q[2][1] - q[3][1]);
  }
  function raycast(ray: Ray) {
    let best = 220,
      hit: {
        distance: number;
        point: number[] | Float64Array<ArrayBuffer> | Float32Array<ArrayBuffer>;
      } | null = null;
    const seen = new Set();
    for (let t = 0; t <= 220; t += 4) {
      const x = ray.origin[0] + ray.dir[0] * t,
        z = ray.origin[2] + ray.dir[2] * t,
        key = Math.floor(x / 16) + ',' + Math.floor(z / 16);
      if (seen.has(key) || !inBounds({ x, y: z })) continue;
      seen.add(key);
      const west = Math.max(EAST_BAY_COAST_X, Math.floor(x / 16) * 16),
        north = Math.floor(z / 16) * 16;
      for (const [u, v] of [
        [west + 0.001, north + 0.001] satisfies [number, number],
        [west + 0.001, north + 15.999] satisfies [number, number],
        [west + 15.999, north + 0.001] satisfies [number, number],
        [west + 15.999, north + 15.999] satisfies [number, number],
      ]) {
        const q = cell(u, v);
        if (!q) continue;
        for (const tri of [
          [q[0], q[1], q[2]],
          [q[0], q[2], q[3]],
        ]) {
          const d = rayTriangle(ray, tri[0], tri[1], tri[2]);
          if (d !== null && d < best) {
            best = d;
            hit = { distance: d, point: ray.origin.map((v, i) => v + ray.dir[i] * d) };
          }
        }
      }
    }
    return hit;
  }
  return {
    bounds,
    obstacles,
    path,
    height,
    raycast,
    contains: (x: number, z: number) => free({ x, y: z }),
    segment: (a: { x: number; y: number }, b: { x: number; y: number }) =>
      clear(world(a), world(b)),
    nodes,
    edges,
  };
}
