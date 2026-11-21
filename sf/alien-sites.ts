import type { Point, Ray } from './types/geometry.ts';
import type { Site, SignAtlas } from './types/world.ts';
import { requiredValue } from './types/assert.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose, rayTriangle } from './geometry.ts';
import { drawPlaque } from './southern-district.ts';
import { drawFacadeWindow } from './windows.ts';
import { createNavigationGrid } from './navigation.ts';
import { instituteWalkable, detachInstituteMesh } from './institute-interiors.ts';
import { BERKELEY_CAMPUS, BERKELEY_INSTITUTE_ROOM, drawBerkeleyCampus } from './berkeley-campus.ts';

export const ALIEN_SITE_SIGNS = Object.freeze([
  'AMERICAN INDUSTRIAL CENTER',
  'BERKELEY INSTITUTE\nFOR ESOTERIC STUDIES',
] satisfies [string, string]);
export const INDUSTRIAL_CENTER = Object.freeze({
  x: 84.8,
  z: 77.3,
  w: 3.8,
  d: 3.3,
  angle: Math.PI / 2,
});
function alienSiteBounds<T extends Site>(m: Mesh, start: number, site: T) {
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return { ...site, start, count: m.data.length - start, lo, hi };
}
export function drawIndustrialCenter(m: Mesh, signs: SignAtlas, { base }: { base: number }) {
  const c = INDUSTRIAL_CENTER,
    start = m.data.length;
  pose(m, c.x, base, c.z, c.angle, () => {
    m.box(-c.w / 2, -0.04, -c.d / 2, c.w, 2.1, c.d, '#a27e67', 'brick');
    for (let i = 0; i < 3; i++) {
      const z = -c.d / 2 + (i * c.d) / 3;
      m.quad(
        [-c.w / 2, 2.1, z] satisfies [number, number, number],
        [-c.w / 2, 2.6, z + 0.78] satisfies [number, number, number],
        [c.w / 2, 2.6, z + 0.78] satisfies [number, number, number],
        [c.w / 2, 2.1, z] satisfies [number, number, number],
        '#718783',
        'roof',
      );
      m.quad(
        [-c.w / 2, 2.6, z + 0.78] satisfies [number, number, number],
        [-c.w / 2, 2.1, z + c.d / 3] satisfies [number, number, number],
        [c.w / 2, 2.1, z + c.d / 3] satisfies [number, number, number],
        [c.w / 2, 2.6, z + 0.78] satisfies [number, number, number],
        '#739397',
        'glass',
      );
      for (const side of [-1, 1] satisfies [number, number]) {
        const points = [
          [(side * c.w) / 2, 2.1, z] satisfies [number, number, number],
          [(side * c.w) / 2, 2.6, z + 0.78] satisfies [number, number, number],
          [(side * c.w) / 2, 2.1, z + c.d / 3] satisfies [number, number, number],
        ];
        if (side < 0) points.reverse();
        m.tri(points[0], points[1], points[2], '#a27e67', 'brick');
      }
    }
    m.box(-0.65, 0.02, c.d / 2 + 0.01, 1.3, 1.4, 0.035, '#6a7770', { metal: 0.18 });
    for (let j = 0; j < 12; j++)
      m.box(-0.62, 0.08 + j * 0.105, c.d / 2 + 0.05, 1.24, 0.018, 0.018, '#a1aaa0');
    for (const x of [-1.45, 1.08] satisfies [number, number])
      drawFacadeWindow(m, {
        plane: c.d / 2 + 0.012,
        along: x,
        y: 0.65,
        w: 0.5,
        h: 0.65,
        style: 'office',
        trim: '#c6c4ab',
        seed: x,
      });
    m.box(-1.84, 1.55, c.d / 2 + 0.025, 3.68, 0.4, 0.04, '#3e5654');
    drawPlaque(m, signs, ALIEN_SITE_SIGNS[0], 0, 1.61, c.d / 2 + 0.07, 3.45, 0.26);
    for (const x of [-1.6, 1.6] satisfies [number, number]) {
      m.box(x - 0.1, 0.03, c.d / 2 + 0.13, 0.2, 0.53, 0.2, '#b8ad76');
      m.box(x - 0.1, 0.29, c.d / 2 + 0.14, 0.2, 0.09, 0.2, '#4d5851');
    }
  });
  return alienSiteBounds(m, start, {
    id: 'american-industrial-center',
    kind: 'industrial-center',
    label: contentText('alien-sites.drawIndustrialCenter.label-1', {}),
    base,
    entry: { x: 82, y: 76.8 },
    description: contentText('alien-sites.drawIndustrialCenter.description-2', {}),
  });
}

/** The campus uses a small precomputed adjacency graph on the same ground
 * parcels as its models, picking surface, and minimap. */
export function createEsotericCampus(
  car: Pick<ReturnType<typeof import('./ferrari.ts').createFerrari>, 'sample' | 'dealer'>,
  {
    prepared = null,
  }: { prepared?: import('./types/navigation.ts').NavigationGraphData | null } = {},
) {
  const p = car.sample(car.dealer + 24),
    c = Math.cos(p.angle),
    s = Math.sin(p.angle),
    base = p.y,
    gate = { x: p.x - 0.5, y: p.z - 0.5 },
    layout = BERKELEY_CAMPUS;
  const local = (x: number, z: number) => {
    const dx = x - p.x,
      dz = z - p.z;
    return { u: dx * c + dz * s, v: -dx * s + dz * c };
  };
  const point = (u: number, v: number) => ({ x: p.x + u * c - v * s, z: p.z + u * s + v * c });
  const inRect = (u: number, v: number, [a, b, d, e]: number[], pad = 0) =>
    u >= a - pad - 1e-8 && u <= d + pad + 1e-8 && v >= b - pad - 1e-8 && v <= e + pad + 1e-8;
  const clearLocal = (u: number, v: number) => {
    if (!inRect(u, v, layout.bounds) && !inRect(u, v, layout.paths[0])) return false;
    for (const b of layout.buildings)
      if (inRect(u, v, b.rect, 0.16)) {
        if (b.id !== 'institute' || !instituteWalkable(BERKELEY_INSTITUTE_ROOM, u, v)) return false;
      }
    if (layout.obstacles.some((o) => Math.hypot(u - o.u, v - o.v) < o.r + 0.16)) return false;
    return !layout.trees.some(([x, z]) => Math.hypot(u - x, v - z) < 0.3);
  };
  const contains = (x: number, z: number) => {
    const q = local(x, z);
    return clearLocal(q.u, q.v);
  };
  const ground = () => base + 0.015;
  const resolution = 4,
    west = -9,
    north = -0.25,
    width = 72,
    height = 75;
  const graphPoint = (q: { u: number; v: number }) => ({ x: q.u - west, y: q.v - north }),
    worldPoint = (q: { x: number; y: number }) => {
      const at = point(q.x + west, q.y + north);
      return { x: at.x - 0.5, y: at.z - 0.5 };
    };
  const clearGraphLine = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 0.06));
    for (let i = 0; i <= n; i++)
      if (!clearLocal(west + a.x + ((b.x - a.x) * i) / n, north + a.y + ((b.y - a.y) * i) / n))
        return false;
    return true;
  };
  const mask =
    prepared?.mask ||
    Uint8Array.from({ length: width * height }, (_, id) =>
      clearLocal(
        west + ((id % width) + 0.5) / resolution,
        north + (Math.floor(id / width) + 0.5) / resolution,
      )
        ? 1
        : 0,
    );
  const graph = createNavigationGrid({
    width,
    height,
    resolution,
    mask,
    canTraverse: clearGraphLine,
    canLink: clearGraphLine,
    prepared,
  });
  function segment(a: { x: number; y: number }, b: { x: number; y: number }) {
    return graph.segment(
      graphPoint(local(a.x + 0.5, a.y + 0.5)),
      graphPoint(local(b.x + 0.5, b.y + 0.5)),
    );
  }
  function internal(a: Point, b: Point) {
    return (
      graph
        .path(graphPoint(local(a.x + 0.5, a.y + 0.5)), graphPoint(local(b.x + 0.5, b.y + 0.5)))
        ?.map(worldPoint) || null
    );
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
    const entry = a ? internal(from, gate) : basePath(from, gate),
      exit = b ? internal(gate, to) : basePath(gate, to);
    return entry && exit ? [...entry, ...exit] : null;
  }
  const quad = (rect: readonly number[]) => {
    const [a, b, c, d] = rect;
    return [
      [a, b],
      [a, d],
      [c, d],
      [c, b],
    ].map(([u, v]) => {
      const q = point(u, v);
      return [q.x, ground(), q.z];
    });
  };
  const quads = [quad(layout.bounds), quad(layout.paths[0])];
  const mapFeatures = [
    { polygon: quad(layout.bounds), color: '#879c78' },
    ...layout.paths.map((rect) => ({ polygon: quad(rect), color: '#c8c6b1' })),
    ...layout.buildings.map((b) => ({ polygon: quad(b.rect), color: b.color })),
  ];
  function raycast(ray: Ray) {
    let best = Infinity;
    for (const q of quads)
      for (const tri of [
        [q[0], q[1], q[2]],
        [q[0], q[2], q[3]],
      ]) {
        const d = rayTriangle(ray, tri[0], tri[1], tri[2]);
        if (d !== null) best = Math.min(best, d);
      }
    return Number.isFinite(best)
      ? { distance: best, point: ray.origin.map((v, i) => v + ray.dir[i] * best) }
      : null;
  }
  function draw(m: Mesh, signs: SignAtlas, { separateInterior = false } = {}) {
    const start = m.data.length;
    let definition: ReturnType<typeof drawBerkeleyCampus> | undefined;
    pose(m, p.x, base, p.z, p.angle, () => {
      definition = drawBerkeleyCampus(m, signs, ALIEN_SITE_SIGNS[1]);
    });
    const entry = point(0.8, 2.65);
    const inside = point(0, 7.25),
      site: Site & { start: number; count: number; lo: number[]; hi: number[] } = alienSiteBounds(
        m,
        start,
        {
          enterableInstitute: true,
          inside: { x: inside.x - 0.5, y: inside.z - 0.5 },
          id: 'berkeley-esoteric',
          kind: 'esoteric-institute',
          label: contentText('alien-sites.draw.label-3', {}),
          entry: { x: entry.x - 0.5, y: entry.z - 0.5 },
          base,
          description: contentText('alien-sites.draw.description-4', {}),
        },
      );
    if (separateInterior) {
      site.interior = detachInstituteMesh(
        m,
        requiredValue(definition, 'Berkeley interior definition'),
      );
      const center = point(BERKELEY_INSTITUTE_ROOM.x, BERKELEY_INSTITUTE_ROOM.z);
      site.interior.spec = {
        ...BERKELEY_INSTITUTE_ROOM,
        x: center.x,
        z: center.z,
        base,
        rotation: p.angle,
      };
      site.count = m.data.length - start;
    }
    return site;
  }
  const n = point(0.6, 7.6),
    a = point(-0.3, 7.4);
  const npc: import('./types/world.ts').Actor = {
    id: 'esoteric-professor',
    name: contentText('alien-sites.createEsotericCampus.name-5', {}),
    label: contentText('alien-sites.createEsotericCampus.label-6', {}),
    questRole: 'esoteric',
    x: n.x,
    z: n.z,
    base: ground(),
    skin: '#b58c6d',
    shirt: '#6e8c83',
    hair: '#b6b5a3',
    female: true,
    longHair: true,
    angle: p.angle + Math.PI,
    regional: true,
    approach: { x: a.x - 0.5, y: a.z - 0.5 },
    description: contentText('alien-sites.createEsotericCampus.description-7', {}),
  };
  const routes = [
    [-5, 4, -5, 14.6] satisfies [number, number, number, number],
    [5, 4, 5, 14.6] satisfies [number, number, number, number],
    [-5, 12.4, 5, 12.4] satisfies [number, number, number, number],
  ].map(([u, v, x, z], i) => ({
    name: contentText('alien-sites.createEsotericCampus.name-8', { v0: i }),
    kind: 'path',
    halfWidth: 0.4,
    points: [[u, v] satisfies [number, number], [x, z] satisfies [number, number]].map(([a, b]) => {
      const q = point(a, b);
      return [q.x, q.z];
    }),
  }));
  const surfaceType = (x: number, z: number) => {
    const q = local(x, z);
    return !clearLocal(q.u, q.v)
      ? 'building'
      : layout.paths.some((r) => inRect(q.u, q.v, r))
        ? 'sidewalk'
        : 'grass';
  };
  return {
    gate,
    base,
    point,
    contains,
    ground,
    segment,
    path,
    raycast,
    draw,
    npc,
    quads,
    mapFeatures,
    routes,
    surfaceType,
    layout,
    graph,
    life: null as ReturnType<typeof import('./life.ts').createCityLife> | null,
  };
}
