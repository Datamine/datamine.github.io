import type { WorldObject } from './types/world.ts';
import { requiredValue } from './types/assert.ts';
interface LightRoad {
  name: string;
  kind?: string;
  halfWidth?: number;
  points: readonly (readonly number[])[];
}
interface StreetLamp {
  x: number;
  z: number;
  angle: number;
  style: number;
  street: string;
  kind: string;
  block: string;
  blocks?: string[];
}
interface LitBlock {
  id: string;
  street: string;
  kind: string;
  a: number[];
  b: number[];
  length: number;
  targetFixtures: number;
  fixtures: number[];
}
interface LightAvoidance {
  x: number;
  z: number;
  clearance?: number;
}
interface StreetLightOptions {
  roads: readonly LightRoad[];
  surfaceType: (x: number, z: number) => string;
  avoid?: readonly LightAvoidance[];
  minZ?: number;
  maxZ?: number;
  maxSpacing?: number;
  minSeparation?: number;
  shareCorners?: boolean;
  doorClearance?: number;
}
/** Split authored streets at their junctions, then light every block. Fixture
 * placement is deterministic and uses the same surface types as the road mesh. */
// One fixture for an ordinary block; a second only beyond 12 tiles. Nearby
// short blocks share corner lamps, and posts stay at least 3.25 tiles apart.
export const SOUTHERN_STREET_LIGHT_POLICY = Object.freeze({
  maxSpacing: 12,
  minSeparation: 3.25,
  shareCorners: true,
});

export function houseDoorPositions(
  houses: readonly Pick<Partial<WorldObject>, 'houses' | 'rotation' | 'x' | 'y' | 'w' | 'd'>[],
) {
  const doors = [];
  for (const house of houses)
    for (const h of house.houses || []) {
      const a = house.rotation || 0,
        u =
          requiredValue(h.door, 'House door offset') + requiredValue(h.dw, 'House door width') / 2,
        v = requiredValue(h.entry, 'House door entry'),
        c = Math.cos(a),
        s = Math.sin(a);
      doors.push({
        x:
          requiredValue(house.x, 'House x') +
          requiredValue(house.w, 'House width') / 2 +
          u * c -
          v * s,
        z:
          requiredValue(house.y, 'House y') +
          requiredValue(house.d, 'House depth') / 2 +
          u * s +
          v * c,
      });
    }
  return doors;
}

/** Architectural families stay consistent along streets; blocks provide
 * deliberate variation without changing on reload or using frame-time RNG. */
export function streetLampStyle(street: string, block: string, kind = 'road') {
  if (kind === 'path') return 2;
  if (street === 'Market Street') return 1;
  if ((['Embarcadero', 'California Street'] satisfies [string, string]).includes(street)) return 0;
  const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  const family = hash(street) % 4,
    variant = hash(block) % 3;
  return [
    [1, 2, 1] satisfies [number, number, number],
    [0, 1, 2] satisfies [number, number, number],
    [3, 4, 3] satisfies [number, number, number],
    [4, 2, 3] satisfies [number, number, number],
  ][family][variant];
}

export function planBlockStreetLights({
  roads,
  surfaceType,
  avoid = [],
  minZ = 96,
  maxZ = Infinity,
  maxSpacing = 8,
  minSeparation = 1.4,
  shareCorners = false,
  doorClearance = 0.75,
}: StreetLightOptions) {
  const segments = [];
  for (const road of roads)
    for (let i = 1; i < road.points.length; i++) {
      let a = [...road.points[i - 1]],
        b = [...road.points[i]];
      if (Math.max(a[1], b[1]) <= minZ || Math.min(a[1], b[1]) >= maxZ) continue;
      if (Math.min(a[1], b[1]) < minZ) {
        const t = (minZ - a[1]) / (b[1] - a[1]),
          p = [a[0] + (b[0] - a[0]) * t, minZ];
        if (a[1] < minZ) a = p;
        else b = p;
      }
      if (Math.max(a[1], b[1]) > maxZ) {
        const t = (maxZ - a[1]) / (b[1] - a[1]),
          p = [a[0] + (b[0] - a[0]) * t, maxZ];
        if (a[1] > maxZ) a = p;
        else b = p;
      }
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz);
      if (length > 1e-6)
        segments.push({
          street: road.name,
          kind: road.kind || 'road',
          halfWidth: road.halfWidth ?? 0.5,
          a,
          b,
          dx,
          dz,
          length,
          cuts: [0, length] satisfies [number, number],
        });
    }
  const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;
  for (const s of segments)
    for (const other of segments) {
      if (s === other) continue;
      const ox = other.a[0] - s.a[0],
        oz = other.a[1] - s.a[1],
        det = cross(s.dx, s.dz, other.dx, other.dz);
      if (Math.abs(det) > 1e-9) {
        const t = cross(ox, oz, other.dx, other.dz) / det,
          u = cross(ox, oz, s.dx, s.dz) / det;
        if (t > 1e-7 && t < 1 - 1e-7 && u >= -1e-7 && u <= 1 + 1e-7) s.cuts.push(t * s.length);
      } else if (Math.abs(cross(ox, oz, s.dx, s.dz)) < 1e-7)
        for (const p of [other.a, other.b]) {
          const d = ((p[0] - s.a[0]) * s.dx + (p[1] - s.a[1]) * s.dz) / s.length;
          if (d > 1e-7 && d < s.length - 1e-7) s.cuts.push(d);
        }
    }
  const blocks: LitBlock[] = [],
    lamps: StreetLamp[] = [],
    seen = new Set<string>(),
    unlit = [];
  for (const s of segments) {
    const cuts = [...new Set(s.cuts.map((t) => +t.toFixed(6)))].sort((a, b) => a - b),
      ux = s.dx / s.length,
      uz = s.dz / s.length;
    for (let j = 1; j < cuts.length; j++) {
      const length = cuts[j] - cuts[j - 1];
      if (length < 1.8) continue;
      const a = [s.a[0] + ux * cuts[j - 1], s.a[1] + uz * cuts[j - 1]],
        b = [a[0] + ux * length, a[1] + uz * length];
      const key = [a, b]
        .map((p) => p.map((v) => v.toFixed(5)).join(','))
        .sort()
        .join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      const count = Math.ceil(length / maxSpacing),
        block: LitBlock = {
          id: key,
          street: s.street,
          kind: s.kind,
          a,
          b,
          length,
          targetFixtures: count,
          fixtures: [],
        };
      blocks.push(block);
      if (shareCorners && count === 1) {
        const index = lamps.findIndex(
          (l) =>
            Math.max(Math.hypot(l.x - a[0], l.z - a[1]), Math.hypot(l.x - b[0], l.z - b[1])) <=
            maxSpacing / 2 + 1,
        );
        if (index >= 0) {
          const lamp = lamps[index];
          lamp.blocks = [...new Set([...(lamp.blocks || [lamp.block]), key])];
          block.fixtures.push(index);
          continue;
        }
      }
      for (let slot = 0; slot < count; slot++) {
        const center = ((slot + 0.5) * length) / count;
        let fixture: StreetLamp | null = null;
        for (const shift of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05] satisfies [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]) {
          const t = Math.max(0.85, Math.min(length - 0.85, center + shift));
          for (const side of (blocks.length + slot) % 2
            ? ([-1, 1] satisfies [number, number])
            : ([1, -1] satisfies [number, number])) {
            const nx = -uz * side,
              nz = ux * side,
              x = a[0] + ux * t + nx * (s.halfWidth + 0.125),
              z = a[1] + uz * t + nz * (s.halfWidth + 0.125);
            if (
              avoid.some((p) => Math.hypot(p.x - x, p.z - z) < (p.clearance ?? doorClearance)) ||
              lamps.some((p) => Math.hypot(p.x - x, p.z - z) < minSeparation)
            )
              continue;
            const surfaces =
              s.kind === 'path'
                ? (['sidewalk', 'grass', 'plaza', 'courtyard'] satisfies [
                    string,
                    string,
                    string,
                    string,
                  ])
                : ['sidewalk'];
            if (
              ![
                [0, 0] satisfies [number, number],
                [0.085, 0] satisfies [number, number],
                [-0.085, 0] satisfies [number, number],
                [0, 0.085] satisfies [number, number],
                [0, -0.085] satisfies [number, number],
              ].every(([dx, dz]) => surfaces.includes(surfaceType(x + dx, z + dz)))
            )
              continue;
            fixture = {
              x,
              z,
              angle: Math.atan2(nx, -nz),
              style: streetLampStyle(s.street, key, s.kind),
              street: s.street,
              kind: s.kind,
              block: key,
            };
            break;
          }
          if (fixture) break;
        }
        // A two-tile connector can share a neighboring corner lamp;
        // squeezing another post beside it would obstruct the curb.
        if (!fixture && length < maxSpacing) {
          const x = (a[0] + b[0]) / 2,
            z = (a[1] + b[1]) / 2,
            index = lamps.findIndex((l) =>
              shareCorners
                ? Math.max(
                    Math.hypot(l.x - a[0], l.z - a[1]),
                    Math.hypot(l.x - b[0], l.z - b[1]),
                  ) <=
                  maxSpacing / 2 + 1
                : Math.hypot(l.x - x, l.z - z) < Math.min(3, maxSpacing / 2),
            );
          if (index >= 0) {
            const lamp = lamps[index];
            lamp.blocks = [...new Set([...(lamp.blocks || [lamp.block]), key])];
            block.fixtures.push(index);
            continue;
          }
        }
        if (fixture) {
          block.fixtures.push(lamps.length);
          lamps.push(fixture);
        } else unlit.push({ block: key, street: s.street, slot });
      }
    }
  }
  // A short connector may be processed before the cross street that lights
  // its corner. Resolve these shared fixtures after the entire grid exists.
  const byID = new Map(blocks.map((b) => [b.id, b]));
  for (let i = unlit.length - 1; i >= 0; i--) {
    const block = requiredValue(byID.get(unlit[i].block), 'Unlit block must exist');
    if (block.length >= maxSpacing) continue;
    let index = -1,
      best = Infinity;
    for (const [id, lamp] of lamps.entries()) {
      const reach = Math.max(
        ...[block.a, block.b].map((p) => Math.hypot(lamp.x - p[0], lamp.z - p[1])),
      );
      if (reach < (shareCorners ? maxSpacing / 2 + 1 : maxSpacing - 0.8) && reach < best) {
        best = reach;
        index = id;
      }
    }
    if (index < 0) continue;
    const lamp = lamps[index];
    lamp.blocks = [...new Set([...(lamp.blocks || [lamp.block]), block.id])];
    if (!block.fixtures.includes(index)) block.fixtures.push(index);
    unlit.splice(i, 1);
  }
  return { lamps, blocks, unlit, avoid, doorClearance, maxSpacing, minSeparation };
}
