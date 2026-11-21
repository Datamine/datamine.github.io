import type {
  InteriorDefinition,
  InteriorSection,
  DetachedInterior,
  WallOpening,
  RoomGeometry,
} from './types/interiors.ts';

import { drawPiercedWall } from './wall-openings.ts';
import { Mesh, pose, cutawayWallMask, rayTriangle } from './geometry.ts';
import type { NumericVector, Ray } from './types/geometry.ts';

export const INSTITUTE_DOOR_WIDTH = 1.5;
export const INSTITUTE_FLOOR_HEIGHT = 0.015;
export function instituteLocalPoint(room: RoomGeometry, x: number, z: number) {
  const a = room.rotation || 0,
    c = Math.cos(a),
    s = Math.sin(a),
    dx = x - room.x,
    dz = z - room.z;
  return { u: dx * c + dz * s, v: -dx * s + dz * c };
}
export function insideInstitute(room: RoomGeometry, x: number, z: number) {
  const dx = x - room.x,
    dz = z - room.z;
  if (!room.rotation) return Math.abs(dx) < room.w / 2 - 0.12 && Math.abs(dz) < room.d / 2 - 0.12;
  if (dx * dx + dz * dz > (room.w * room.w + room.d * room.d) / 4) return false;
  const p = instituteLocalPoint(room, x, z);
  return Math.abs(p.u) < room.w / 2 - 0.12 && Math.abs(p.v) < room.d / 2 - 0.12;
}
export function raycastInstituteFloor(room: RoomGeometry, ray: Ray) {
  const angle = room.rotation || 0,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const corners = [
    [-room.w / 2, -room.d / 2] satisfies [number, number],
    [room.w / 2, -room.d / 2] satisfies [number, number],
    [room.w / 2, room.d / 2] satisfies [number, number],
    [-room.w / 2, room.d / 2] satisfies [number, number],
  ].map(([u, v]) => [
    room.x + u * c - v * s,
    room.base + INSTITUTE_FLOOR_HEIGHT,
    room.z + u * s + v * c,
  ]);
  const hits = [
    [0, 2, 1] satisfies [number, number, number],
    [0, 3, 2] satisfies [number, number, number],
  ]
    .map((tri) => rayTriangle(ray, corners[tri[0]], corners[tri[1]], corners[tri[2]]))
    .filter((t) => t !== null);
  if (!hits.length) return null;
  const distance = Math.min(...hits);
  return { distance, point: ray.origin.map((v, i) => v + ray.dir[i] * distance) };
}
export function instituteFixtures(room: RoomGeometry) {
  const w = room.w,
    d = room.d,
    front = room.front || 1;
  const rect = (kind: string, x: number, z: number, width: number, depth: number) => ({
    kind,
    x,
    z: front > 0 ? z : -z - depth,
    w: width,
    d: depth,
  });
  return [
    rect('books', -w / 2 + 0.28, -d / 2 + 0.2, 2.1, 0.38),
    rect('cabinet', w / 2 - 1.65, -d / 2 + 0.2, 1.35, 0.42),
    rect('desk', -w / 2 + 0.35, -0.18, 1.45, 1.22),
    rect('instrument', w / 2 - 1.65, -0.16, 1.15, 1.12),
  ];
}
export function instituteWallRects(room: RoomGeometry, side: number) {
  const w = room.w,
    d = room.d,
    t = 0.12,
    door = INSTITUTE_DOOR_WIDTH,
    frontSide = room.front === -1 ? 0 : 1;
  if (side >= 2) return [{ x: side === 2 ? -w / 2 : w / 2 - t, z: -d / 2, w: t, d }];
  const z = side === 0 ? -d / 2 : d / 2 - t;
  return side === frontSide
    ? [
        { x: -w / 2, z, w: (w - door) / 2, d: t },
        { x: door / 2, z, w: (w - door) / 2, d: t },
      ]
    : [{ x: -w / 2, z, w, d: t }];
}
/** These exact walls and furniture also generate the rendered room. */
const instituteObstacleCache = new WeakMap<
  RoomGeometry,
  { x: number; z: number; w: number; d: number }[]
>();
export function instituteWalkable(room: RoomGeometry, x: number, z: number, clearance = 0.16) {
  const p = instituteLocalPoint(room, x, z);
  if (Math.abs(p.u) > room.w / 2 + 0.25 || Math.abs(p.v) > room.d / 2 + 0.25) return false;
  let obstacles = instituteObstacleCache.get(room);
  if (!obstacles) {
    obstacles = [
      ...([0, 1, 2, 3] satisfies [number, number, number, number]).flatMap((side) =>
        instituteWallRects(room, side),
      ),
      ...instituteFixtures(room),
    ];
    instituteObstacleCache.set(room, obstacles);
  }
  return !obstacles.some(
    (o) =>
      p.u > o.x - clearance &&
      p.u < o.x + o.w + clearance &&
      p.v > o.z - clearance &&
      p.v < o.z + o.d + clearance,
  );
}
export function recordInstitutePart(
  m: Mesh,
  parts: InteriorSection[],
  kind: string,
  side: number | null,
  draw: () => void,
) {
  const start = m.data.length;
  draw();
  parts.push({ kind, side, start, count: m.data.length - start });
}
export function instituteWindowOpenings(room: RoomGeometry, side: number, style = 'research') {
  if (style === 'berkeley')
    return (
      side < 2
        ? ([-2.85, -1.85, 1.15, 2.15] satisfies [number, number, number, number])
        : ([-1.8, -0.62, 0.56, 1.74] satisfies [number, number, number, number]).map((u) =>
            side === 2 ? -u : u,
          )
    ).map((x) => ({
      x: x - (side < 2 ? 0.64 : 0.65) / 2,
      y: side < 2 ? 0.45 : 0.55,
      w: side < 2 ? 0.64 : 0.65,
      h: side < 2 ? 1.65 : 1.5,
      arch: true,
      segments: 20,
    }));
  return (
    side < 2
      ? ([-room.w * 0.39, -room.w * 0.23, room.w * 0.23, room.w * 0.39] satisfies [
          number,
          number,
          number,
          number,
        ])
      : ([-1.28, 1.28] satisfies [number, number])
  ).map((x) => ({
    x: x - (side < 2 ? 0.62 : 0.57) / 2,
    y: side < 2 ? 0.48 : 0.51,
    w: side < 2 ? 0.62 : 0.57,
    h: side < 2 ? 1.23 : 1.29,
    arch: true,
    segments: 12,
  }));
}
export function drawInstituteWall(
  m: Mesh,
  room: RoomGeometry,
  side: number,
  height: number,
  color: string,
  trim: string,
  {
    openings = [],
    cornices = [1.94, height - 0.02] satisfies [number, number],
  }: { openings?: WallOpening[]; cornices?: number[] } = {},
) {
  pose(m, room.x, room.base, room.z, 0, () => {
    const isX = side >= 2,
      far = side % 2 === 0,
      plane = isX ? (far ? -room.w / 2 : room.w / 2) : far ? -room.d / 2 : room.d / 2;
    for (const r of instituteWallRects(room, side))
      drawPiercedWall(m, {
        isX,
        plane,
        along: isX ? r.z : r.x,
        y: 0.2,
        w: isX ? r.d : r.w,
        h: height - 0.2,
        depth: 0.12,
        far,
        color,
        material: 'stone',
        openings,
      });
    if (side === (room.front === -1 ? 0 : 1))
      m.box(
        -INSTITUTE_DOOR_WIDTH / 2,
        2.15,
        side === 0 ? -room.d / 2 : room.d / 2 - 0.12,
        INSTITUTE_DOOR_WIDTH,
        height - 2.15,
        0.12,
        color,
        'stone',
      );
    // Perimeter cornices, never full slabs across the room.
    for (const y of cornices) {
      if (side < 2) {
        if (side === (room.front === -1 ? 0 : 1) && y < 2.15) {
          for (const r of instituteWallRects(room, side))
            m.box(
              r.x,
              y,
              side === 0 ? -room.d / 2 - 0.07 : room.d / 2 - 0.03,
              r.w,
              0.1,
              0.1,
              trim,
              'stone',
            );
        } else
          m.box(
            -room.w / 2 - 0.06,
            y,
            side === 0 ? -room.d / 2 - 0.07 : room.d / 2 - 0.03,
            room.w + 0.12,
            0.1,
            0.1,
            trim,
            'stone',
          );
      } else
        m.box(
          side === 2 ? -room.w / 2 - 0.07 : room.w / 2 - 0.03,
          y,
          -room.d / 2,
          0.1,
          0.1,
          room.d,
          trim,
          'stone',
        );
    }
  });
}
export function drawInstituteFloor(m: Mesh, room: RoomGeometry, variant = 0) {
  pose(m, room.x, room.base, room.z, 0, () => {
    const floor = INSTITUTE_FLOOR_HEIGHT,
      wood = variant === 1 ? '#8b809b' : '#a68a63',
      brass = '#bca16b';
    m.box(
      -room.w / 2,
      -0.025,
      -room.d / 2,
      room.w,
      0.04,
      room.d,
      variant === 1 ? '#85949a' : '#b6b6a0',
      'stone',
    );
    for (const side of [0, 1, 2, 3] satisfies [number, number, number, number])
      for (const r of instituteWallRects(room, side))
        m.box(r.x, 0, r.z, r.w, 0.2, r.d, '#babca9', 'stone');
    // The central aisle is a flat celestial inlay, with no collision slab.
    for (let i = 0; i < 48; i++) {
      const a = (i * Math.PI) / 24,
        b = ((i + 1) * Math.PI) / 24,
        at = (t: number, r: number) =>
          [Math.cos(t) * r, floor + 0.002, Math.sin(t) * r] satisfies [number, number, number];
      m.quad(at(a, 0.93), at(b, 0.93), at(b, 0.95), at(a, 0.95), brass);
    }
    for (const o of instituteFixtures(room)) {
      if (o.kind === 'books' || o.kind === 'cabinet') {
        m.box(o.x, floor, o.z, o.w, 1.28, o.d, wood, 'wood');
        const front = room.front === -1 ? o.z - 0.012 : o.z + o.d + 0.012;
        for (let row = 0; row < 3; row++)
          for (let book = 0; book < Math.floor(o.w / 0.16) - 1; book++) {
            m.box(
              o.x + 0.08 + book * 0.16,
              floor + 0.13 + row * 0.37,
              front,
              0.115,
              0.22 + (book % 3) * 0.025,
              0.035,
              (
                ['#6d8883', '#ad976d', '#807691', '#b7826b'] satisfies [
                  string,
                  string,
                  string,
                  string,
                ]
              )[(book + row + variant) % 4],
            );
          }
      } else if (o.kind === 'desk') {
        for (const dx of [0.08, o.w - 0.12] satisfies [number, number])
          for (const dz of [0.08, 0.58] satisfies [number, number])
            m.box(o.x + dx, floor, o.z + dz, 0.045, 0.7, 0.045, brass, { metal: 0.2 });
        m.box(o.x, floor + 0.7, o.z, o.w, 0.07, 0.72, wood, 'wood');
        for (let i = 0; i < 3; i++)
          m.box(o.x + 0.16 + i * 0.29, floor + 0.772, o.z + 0.12, 0.23, 0.006, 0.34, '#e4dcc0');
        m.cylinder(o.x + o.w - 0.24, floor + 0.77, o.z + 0.48, 0.06, 0.15, '#c2c7b1', 16);
        m.cylinder(o.x + o.w - 0.24, floor + 0.92, o.z + 0.48, 0.045, 0.003, '#735d45', 12);
        m.box(o.x + 0.42, floor + 0.43, o.z + 0.83, 0.43, 0.055, 0.32, wood, 'wood');
        m.box(o.x + 0.42, floor + 0.47, o.z + 1.12, 0.43, 0.39, 0.05, wood, 'wood');
        for (const dx of [0.46, 0.79] satisfies [number, number])
          for (const dz of [0.86, 1.09] satisfies [number, number])
            m.box(o.x + dx, floor, o.z + dz, 0.035, 0.43, 0.035, brass);
      } else {
        const x = o.x + o.w / 2,
          z = o.z + o.d / 2;
        m.cylinder(x, floor, z, 0.46, 0.22, '#8e9a91', 24, 0.38, 'stone');
        m.cylinder(x, floor + 0.22, z, 0.075, 0.52, brass, 12);
        for (let ring = 0; ring < 2; ring++)
          for (let i = 0; i < 32; i++) {
            const at = (a: number) =>
              ring
                ? ([x + Math.cos(a) * 0.36, floor + 0.92 + Math.sin(a) * 0.36, z] satisfies [
                    number,
                    number,
                    number,
                  ])
                : ([x + Math.cos(a) * 0.38, floor + 0.92, z + Math.sin(a) * 0.38] satisfies [
                    number,
                    number,
                    number,
                  ]);
            m.rod(at((i * Math.PI) / 16), at(((i + 1) * Math.PI) / 16), 0.012, brass, 6, {
              metal: 0.35,
            });
          }
        m.sphere(
          x,
          floor + 0.92,
          z,
          0.13,
          0.13,
          0.13,
          variant === 1 ? '#a3b2d2' : '#a6c5b4',
          16,
          8,
          { emissive: 0.18 },
        );
      }
    }
  });
}
export function detachInstituteMesh(m: Mesh, definition: InteriorDefinition): DetachedInterior {
  const mesh = new Mesh();
  mesh.data = m.data.splice(definition.start, definition.end - definition.start);
  const sections = definition.parts.map((p) => ({
    ...p,
    start: (p.start - definition.start) / 11,
    count: p.count / 11,
  }));
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = 0; i < mesh.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], mesh.data[i + k]);
      hi[k] = Math.max(hi[k], mesh.data[i + k]);
    }
  return { mesh, sections, spec: definition.spec, lo, hi };
}
export function instituteHiddenSections<T extends { kind: string; side?: number | null }>(
  room: RoomGeometry,
  sections: readonly T[],
  eye: NumericVector,
  inside: boolean,
) {
  if (!inside) return [];
  const mask = cutawayWallMask(
    {
      x: room.x - room.w / 2,
      y: room.z - room.d / 2,
      w: room.w,
      d: room.d,
      rotation: room.rotation || 0,
    },
    eye,
  );
  return sections.filter(
    (p) =>
      p.kind === 'roof' ||
      (p.kind === 'wall' && p.side !== null && p.side !== undefined && mask & (1 << p.side)),
  );
}
