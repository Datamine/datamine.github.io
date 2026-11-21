import { isFiniteNumber } from './types/json.ts';
import type { Point } from './types/geometry.ts';
import type { Appearance } from './types/content.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawCharacter } from './characters.ts';

export const WINDSURF_LAUNCH = Object.freeze({
  shore: [29.2, 11.2] satisfies [number, number],
  water: [29.2, 8.7] satisfies [number, number],
});

/** Open-water sailing has no distance or map bounds. Authored coast polygons
 * give exact segment checks and a small, lazily cached visibility graph. */
export function createWindsurfing({
  scale,
  isSea = () => true,
  obstacles = [],
}: {
  scale: number;
  isSea?: (x: number, z: number) => boolean;
  obstacles?: number[][][];
}) {
  const launch = {
    x: WINDSURF_LAUNCH.water[0] * scale - 0.5,
    y: WINDSURF_LAUNCH.water[1] * scale - 0.5,
  };
  const state = {
    riding: false,
    mode: 'windsurf',
    launch,
    shore: null as Point | null,
    jump: null as {
      from: { x: number; y: number };
      to: { x: number; y: number };
      x: number;
      y: number;
      height: number;
      pitch: number;
      angle: number;
      elapsed: number;
      duration: number;
    } | null,
  };
  const inside = (x: number, y: number, poly: number[][]) => {
    let found = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
        found = !found;
    }
    return found;
  };
  const edges = obstacles.flatMap((poly) => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]));
  let graph: { nodes: Point[]; links: number[][] } | null = null;
  function water(x: unknown, z: unknown) {
    return (
      isFiniteNumber(x) &&
      isFiniteNumber(z) &&
      isSea(x, z) &&
      !obstacles.some((p) => inside(x, z, p))
    );
  }
  function segment(a: Point, b: Point) {
    if (!water(a.x + 0.5, a.y + 0.5) || !water(b.x + 0.5, b.y + 0.5)) return false;
    const px = a.x + 0.5,
      py = a.y + 0.5,
      dx = b.x - a.x,
      dy = b.y - a.y;
    for (const [p, q] of edges) {
      const ex = q[0] - p[0],
        ey = q[1] - p[1],
        ox = p[0] - px,
        oy = p[1] - py,
        den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-10) {
        if (Math.abs(ox * dy - oy * dx) > 1e-8) continue;
        const length2 = dx * dx + dy * dy;
        if (length2 < 1e-12) continue;
        const t = (ox * dx + oy * dy) / length2,
          u = ((q[0] - px) * dx + (q[1] - py) * dy) / length2;
        if (Math.max(t, u) >= 0 && Math.min(t, u) <= 1) return false;
      } else {
        const t = (ox * ey - oy * ex) / den,
          u = (ox * dy - oy * dx) / den;
        if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) return false;
      }
    }
    if (obstacles.length) return true;
    // Predicate-only callers can describe a small custom shoreline.
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.2));
    for (let i = 0; i <= steps; i++)
      if (!water(a.x + ((b.x - a.x) * i) / steps + 0.5, a.y + ((b.y - a.y) * i) / steps + 0.5))
        return false;
    return true;
  }
  function coastGraph() {
    if (graph) return graph;
    const nodes = [];
    for (const poly of obstacles) {
      const winding =
        Math.sign(
          poly.reduce((area, p, i) => {
            const q = poly[(i + 1) % poly.length];
            return area + p[0] * q[1] - q[0] * p[1];
          }, 0),
        ) || 1;
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i],
          a = poly[(i + poly.length - 1) % poly.length],
          b = poly[(i + 1) % poly.length],
          al = Math.hypot(p[0] - a[0], p[1] - a[1]),
          bl = Math.hypot(b[0] - p[0], b[1] - p[1]);
        if (!al || !bl) continue;
        const n = [(winding * (p[1] - a[1])) / al, (-winding * (p[0] - a[0])) / al] satisfies [
            number,
            number,
          ],
          q = [(winding * (b[1] - p[1])) / bl, (-winding * (b[0] - p[0])) / bl] satisfies [
            number,
            number,
          ],
          length = Math.hypot(n[0] + q[0], n[1] + q[1]) || 1;
        const u = [(n[0] + q[0]) / length, (n[1] + q[1]) / length] satisfies [number, number],
          offset = 0.4 / Math.max(0.2, u[0] * n[0] + u[1] * n[1]);
        const at = { x: p[0] + u[0] * offset - 0.5, y: p[1] + u[1] * offset - 0.5 };
        if (water(at.x + 0.5, at.y + 0.5)) nodes.push(at);
      }
    }
    const links: number[][] = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        if (segment(nodes[i], nodes[j])) {
          links[i].push(j);
          links[j].push(i);
        }
    return (graph = { nodes, links });
  }
  function path(from: Point, to: Point) {
    if (!water(from.x + 0.5, from.y + 0.5) || !water(to.x + 0.5, to.y + 0.5)) return null;
    if (segment(from, to))
      return Math.hypot(from.x - to.x, from.y - to.y) < 0.0001 ? [] : [{ ...to }];
    if (obstacles.length) {
      const coast = coastGraph(),
        nodes = [from, to, ...coast.nodes],
        links = [[], [], ...coast.links.map((list) => list.map((i) => i + 2))];
      for (let i = 2; i < nodes.length; i++)
        for (const end of [0, 1] satisfies [number, number])
          if (segment(nodes[end], nodes[i])) {
            links[end].push(i);
            links[i].push(end);
          }
      const costs = new Float64Array(nodes.length),
        parent = new Int32Array(nodes.length),
        closed = new Uint8Array(nodes.length);
      costs.fill(Infinity);
      parent.fill(-1);
      costs[0] = 0;
      for (let count = 0; count < nodes.length; count++) {
        let next = -1,
          best = Infinity;
        for (let i = 0; i < nodes.length; i++) {
          const estimate = costs[i] + Math.hypot(nodes[i].x - to.x, nodes[i].y - to.y);
          if (!closed[i] && estimate < best) {
            next = i;
            best = estimate;
          }
        }
        if (next < 0) return null;
        if (next === 1) {
          const result = [];
          for (let i = 1; i !== 0; i = parent[i]) result.push({ ...nodes[i] });
          return result.reverse();
        }
        closed[next] = 1;
        for (const i of links[next]) {
          const cost =
            costs[next] + Math.hypot(nodes[i].x - nodes[next].x, nodes[i].y - nodes[next].y);
          if (cost < costs[i]) {
            costs[i] = cost;
            parent[i] = next;
          }
        }
      }
      return null;
    }
    const bends = [
      { x: (from.x + to.x) / 2, y: 6 * scale - 0.5 },
      { x: from.x, y: 6 * scale - 0.5 },
      { x: to.x, y: 6 * scale - 0.5 },
    ];
    const bend = bends
      .filter((p) => segment(from, p) && segment(p, to))
      .sort(
        (a, b) =>
          Math.hypot(from.x - a.x, from.y - a.y) +
          Math.hypot(to.x - a.x, to.y - a.y) -
          Math.hypot(from.x - b.x, from.y - b.y) -
          Math.hypot(to.x - b.x, to.y - b.y),
      )[0];
    return bend ? [bend, { ...to }] : null;
  }
  function jumpApproach(
    from: { y: number; x: number },
    target: { z: number; x: number; angle: number },
  ) {
    const near = Math.atan2(from.y + 0.5 - target.z, from.x + 0.5 - target.x);
    for (const a of [
      near,
      target.angle + Math.PI / 2,
      target.angle - Math.PI / 2,
      near + Math.PI / 2,
      near - Math.PI / 2,
    ] satisfies [number, number, number, number, number]) {
      const dx = Math.cos(a) * 4.5,
        dz = Math.sin(a) * 4.5,
        takeoff = { x: target.x + dx - 0.5, y: target.z + dz - 0.5 },
        landing = { x: target.x - dx - 0.5, y: target.z - dz - 0.5 };
      if (segment(takeoff, landing) && path(from, takeoff)) return takeoff;
    }
    return null;
  }
  function jumpOver(from: { x: number; y: number }, target: { x: number; z: number }) {
    if (!state.riding || state.jump) return false;
    const dx = target.x - from.x - 0.5,
      dz = target.z - from.y - 0.5,
      distance = Math.hypot(dx, dz),
      to = { x: from.x + dx * 2, y: from.y + dz * 2 };
    if (!Number.isFinite(distance) || distance < 3 || distance > 6 || !segment(from, to))
      return false;
    state.jump = {
      from: { x: from.x, y: from.y },
      to,
      x: from.x,
      y: from.y,
      height: 0,
      pitch: 0.18,
      angle: Math.atan2(dz, dx),
      elapsed: 0,
      duration: (distance * 2) / 7.2,
    };
    return true;
  }
  function updateJump(dt: number) {
    const jump = state.jump;
    if (!jump) return false;
    jump.elapsed = Math.min(jump.duration, jump.elapsed + Math.max(0, dt));
    const f = jump.elapsed / jump.duration;
    jump.x = jump.from.x + (jump.to.x - jump.from.x) * f;
    jump.y = jump.from.y + (jump.to.y - jump.from.y) * f;
    jump.height = Math.sin(Math.PI * f) * 3.4;
    jump.pitch = Math.cos(Math.PI * f) * 0.18;
    if (f === 1) {
      jump.height = 0;
      state.jump = null;
      return true;
    }
    return false;
  }
  function cancelJump() {
    state.jump = null;
  }
  function pursuitRoute(
    from: { x: number; y: number },
    to: { x: number; y: number },
    {
      landPath,
      clear,
    }: { landPath: (to: Point, from: Point) => Point[] | null; clear: (point: Point) => boolean },
  ) {
    const shore = state.shore!,
      dx = launch.x - shore.x,
      dy = launch.y - shore.y,
      length2 = dx * dx + dy * dy,
      t = ((from.x - shore.x) * dx + (from.y - shore.y) * dy) / length2;
    const onLaunch =
        t > 1e-5 &&
        t < 1 - 1e-5 &&
        Math.hypot(from.x - shore.x - t * dx, from.y - shore.y - t * dy) < 0.2,
      targetSea = water(to.x + 0.5, to.y + 0.5);
    // Finish crossing the shore before replanning on land or water. Without
    // this, repeated plans send an officer back to the launch every time.
    if (onLaunch) {
      const tail = targetSea ? path(launch, to) : landPath(to, shore);
      return tail ? [{ ...(targetSea ? launch : shore) }, ...tail] : null;
    }
    const atSea = water(from.x + 0.5, from.y + 0.5);
    if (atSea && targetSea) return path(from, to);
    if (atSea) {
      const seaPath = path(from, launch),
        tail = landPath(to, shore);
      return seaPath && tail ? [...seaPath, { ...shore }, ...tail] : null;
    }
    if (!clear(from)) return null;
    if (targetSea) {
      const approach = landPath(shore, from),
        tail = path(launch, to);
      return approach && tail ? [...approach, { ...launch }, ...tail] : null;
    }
    return landPath(to, from);
  }
  return {
    state,
    water,
    segment,
    path,
    pursuitRoute,
    jumpApproach,
    jumpOver,
    updateJump,
    cancelJump,
  };
}

/** Rounded board, actual sail panels, rigging, and a rider holding the boom. */
export function drawWindsurfer(
  m: Mesh,
  x: number,
  z: number,
  base: number,
  angle: number,
  time: number,
  {
    rider = true,
    moving = false,
    police = false,
    reduced = false,
    pitch = 0,
    appearance = {} as Appearance,
  } = {},
) {
  const bob = reduced ? 0 : Math.sin(time * 0.0017 + x) * 0.025;
  pose(m, x, base + bob, z, angle, () => {
    const start = m.data.length;
    const blue = police ? '#365776' : '#2d8f9b',
      gold = police ? '#b7cfdf' : '#e6b758';
    const rim = (i: number, y: number, shrink = 1) => {
      const a = (i * Math.PI) / 12;
      return [Math.cos(a) * 1.22 * shrink, y, Math.sin(a) * 0.29 * shrink] satisfies [
        number,
        number,
        number,
      ];
    };
    for (let i = 0; i < 24; i++) {
      m.quad(rim(i + 1, 0.035), rim(i, 0.035), rim(i, 0.115, 0.94), rim(i + 1, 0.115, 0.94), blue);
      m.tri(
        [0, 0.115, 0] satisfies [number, number, number],
        rim(i + 1, 0.115, 0.94),
        rim(i, 0.115, 0.94),
        '#e8ddba',
      );
    }
    m.box(-0.63, 0.12, -0.19, 0.64, 0.015, 0.38, '#5b7475', 'roof');
    m.rod(
      [0.28, 0.13, 0] satisfies [number, number, number],
      [0.06, 2.94, 0.13] satisfies [number, number, number],
      0.025,
      '#d8e0cd',
      10,
    );
    const mast = [0.06, 2.94, 0.13] satisfies [number, number, number],
      clew = [-1.09, 1.02, 0.28] satisfies [number, number, number],
      tack = [0.28, 0.25, 0] satisfies [number, number, number],
      mid = [0.15, 1.55, 0.065] satisfies [number, number, number];
    m.tri(mast, mid, clew, blue);
    m.tri(clew, mid, mast, blue);
    m.tri(mid, tack, clew, gold);
    m.tri(clew, tack, mid, gold);
    for (const [a, b] of [
      [mast, clew],
      [clew, tack],
      [tack, mast],
      [mid, clew],
    ])
      m.rod(a, b, 0.014, '#e8e2ca', 6);
    m.rod(
      [0.2, 1.28, -0.03] satisfies [number, number, number],
      [-0.93, 1.05, 0.23] satisfies [number, number, number],
      0.026,
      '#424f50',
      8,
    );
    for (const u of [-0.48, -0.22] satisfies [number, number])
      m.rod(
        [u, 0.15, -0.14] satisfies [number, number, number],
        [u, 0.15, 0.05] satisfies [number, number, number],
        0.024,
        '#4b5856',
        6,
      );
    if (rider)
      drawCharacter(
        m,
        -0.49,
        -0.28,
        0.14,
        0,
        0,
        false,
        appearance.skin || '#bd9369',
        police ? '#304b66' : appearance.shirt || '#485c64',
        {
          pants: police ? '#2d4055' : '#485c64',
          ...appearance,
          mode: 'surf',
          time: reduced ? 0 : time * 0.001,
          cap: police,
          uniform: police,
          backpack: false,
        },
      );
    if (moving)
      for (const side of [-1, 1] satisfies [number, number])
        for (let i = 0; i < 3; i++)
          m.rod(
            [-1.05 - i * 0.4, 0.025, side * (0.17 + i * 0.12)] satisfies [number, number, number],
            [-1.35 - i * 0.4, 0.025, side * (0.2 + i * 0.14)] satisfies [number, number, number],
            0.017,
            '#bad5cd',
            4,
          );
    // The rider, rather than the center of the board, is the camera anchor.
    if (rider)
      m.characters?.transform(
        start,
        new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.49, 0, 0.28, 1] satisfies [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
    if (rider)
      for (let v = start; v < m.data.length; v += 11) {
        m.data[v] += 0.49;
        m.data[v + 2] += 0.28;
      }
    if (pitch) {
      const c = Math.cos(pitch),
        s = Math.sin(pitch);
      m.characters?.transform(
        start,
        new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] satisfies [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
      for (let v = start; v < m.data.length; v += 11) {
        const xx = m.data[v],
          yy = m.data[v + 1],
          nx = m.data[v + 3],
          ny = m.data[v + 4];
        m.data[v] = xx * c - yy * s;
        m.data[v + 1] = xx * s + yy * c;
        m.data[v + 3] = nx * c - ny * s;
        m.data[v + 4] = nx * s + ny * c;
      }
    }
  });
}
