import type { Appearance } from './types/content.ts';
import type { WorldPoint, Point, Ray } from './types/geometry.ts';
interface TahoeVertex {
  p: number[];
  n: number[];
  groom: number;
}
export interface TahoeState {
  mode: string;
  position: (WorldPoint & { y: number }) | null;
  rented: boolean;
  travel: number;
  up: boolean;
  progress: number;
  speed: number;
  offset: number;
  steer: number;
  airTime: number;
  flipping: boolean;
  flipAngle: number;
  flips: number;
  ramps: Set<number>;
  angle: number;
}
import type { SignAtlas } from './types/world.ts';
import type { Mesh } from './geometry.ts';
import { pose, unit, rayTriangle } from './geometry.ts';
import { drawCharacter } from './characters.ts';
import { drawPlaque } from './southern-district.ts';
import { drawRocketPad } from './rocket.ts';
import { EAST_BAY_COAST_X } from './geography.ts';
import { drawFacadeWindow } from './windows.ts';

// Mid-lake coordinates: https://waterdata.usgs.gov/monitoring-location/USGS-390618120021101/
// SF's approximately seven-mile span maps to the existing 96-tile city.
export const REGIONAL_KM_PER_TILE = 11.2654 / 96;
const tahoeLatitude = 39.10490758,
  tahoeLongitude = -120.0374088,
  tahoeSfLat = 37.7749,
  tahoeSfLon = -122.4194;
const tahoeLakeX =
  48 +
  ((tahoeLongitude - tahoeSfLon) *
    111.195 *
    Math.cos(((tahoeLatitude + tahoeSfLat) * Math.PI) / 360)) /
    REGIONAL_KM_PER_TILE;
const tahoeLakeZ = 48 - ((tahoeLatitude - tahoeSfLat) * 111.195) / REGIONAL_KM_PER_TILE;
export const TAHOE = Object.freeze({
  x: tahoeLakeX,
  z: tahoeLakeZ,
  base: { x: tahoeLakeX - 42, z: tahoeLakeZ + 34 },
  peak: { x: tahoeLakeX - 232, z: tahoeLakeZ - 1 },
  lakeLevel: 10,
  peakHeight: 240,
});
// One village plan separates arrival road, gas forecourt, gondola and rocket.
// Rendering, NPC approaches and walking rules all consume these coordinates.
export const TAHOE_VILLAGE = Object.freeze({
  arrival: Object.freeze({ x: TAHOE.base.x, z: TAHOE.base.z + 10 }),
  fuel: Object.freeze({
    x: TAHOE.base.x - 5.5,
    z: TAHOE.base.z + 4.5,
    w: 4.8,
    d: 3.8,
    entry: Object.freeze({ x: TAHOE.base.x - 6, y: TAHOE.base.z + 6.5 }),
  }),
  spaceport: Object.freeze({
    x: TAHOE.base.x + 7,
    z: TAHOE.base.z + 1.5,
    entry: Object.freeze({ x: TAHOE.base.x + 6.5, y: TAHOE.base.z - 1.8 }),
  }),
});
export const TAHOE_VILLAGE_PAVING = Object.freeze(
  [
    [-2.5, 1.7, 2.5, 10.8] satisfies [number, number, number, number],
    [-5.5, 6.2, -2.5, 7.2] satisfies [number, number, number, number],
    [-0.65, 0.9, 0.65, 1.7] satisfies [number, number, number, number],
    [2, -1.8, 3, 1.7] satisfies [number, number, number, number],
    [3, -1.8, 7.5, -0.8] satisfies [number, number, number, number],
  ].map(([west, north, east, south]) =>
    Object.freeze({
      west: TAHOE.base.x + west,
      north: TAHOE.base.z + north,
      east: TAHOE.base.x + east,
      south: TAHOE.base.z + south,
    }),
  ),
);
export function tahoeVillagePavingAt(x: number, z: number) {
  return (
    TAHOE_VILLAGE_PAVING.find((r) => x >= r.west && x <= r.east && z >= r.north && z <= r.south) ||
    null
  );
}

function clipTahoePaving(poly: TahoeVertex[], axis: number, value: number, positive: boolean) {
  const out = [],
    sign = positive ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length],
      da = (a.p[axis] - value) * sign,
      db = (b.p[axis] - value) * sign;
    if (da >= -1e-9) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({
        p: a.p.map((v, k) => v + (b.p[k] - v) * t),
        n: unit(a.n.map((v, k) => v + (b.n[k] - v) * t)),
        groom: a.groom + (b.groom - a.groom) * t,
      });
    }
  }
  return out;
}
// The gondola approaches from the east/southeast. Keep the hut west of the
// station and use this same footprint for rendering, collision and rental access.
export const TAHOE_SUPPLY_HUT = Object.freeze({
  x: TAHOE.base.x + 10,
  z: TAHOE.base.z + 11,
  w: 3.2,
  d: 2.8,
  entry: Object.freeze({ x: TAHOE.base.x + 9.5, y: TAHOE.base.z + 12.8 }),
});
export const TAHOE_SKI_HUT = Object.freeze({
  x: TAHOE.peak.x - 4.5,
  z: TAHOE.peak.z - 2.5,
  w: 2.6,
  d: 3,
  rotation: -Math.PI / 2,
  entry: Object.freeze({ x: TAHOE.peak.x - 3.1, y: TAHOE.peak.z - 3 }),
});
export const TAHOE_BOUNDS = Object.freeze({
  west: TAHOE.base.x - 384,
  east: TAHOE.base.x + 144,
  north: TAHOE.base.z - 216,
  south: TAHOE.base.z + 216,
  step: 1.5,
});
// The village and giant woods are open terrain, not an invisible ski-path
// corridor. This includes the giants' full home/leash area on every side.
export const TAHOE_FOOTHILLS_RADIUS = 44;
const tahoeClamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)),
  tahoeMix = (a: number, b: number, t: number) => a + (b - a) * t,
  tahoeSmooth = (t: number) => t * t * (3 - 2 * t);
const tahoeLakeValue = (x: number, z: number) =>
  ((x - TAHOE.x) / 35) ** 2 + ((z - TAHOE.z) / 70) ** 2;
export function rawTahoeHeight(x: number, z: number) {
  const r = Math.hypot((x - TAHOE.peak.x) / 196, (z - TAHOE.peak.z) / 190),
    rise = 228 * Math.max(0, 1 - r) ** 1.25;
  const ridges = Math.max(
    70 * Math.exp(-(((x - TAHOE.peak.x + 65) / 72) ** 2 + ((z - TAHOE.peak.z - 125) / 80) ** 2)),
    85 * Math.exp(-(((x - TAHOE.peak.x + 60) / 70) ** 2 + ((z - TAHOE.peak.z + 130) / 75) ** 2)),
  );
  const summit = Math.hypot(x - TAHOE.peak.x, z - TAHOE.peak.z),
    baseDistance = Math.hypot(x - TAHOE.base.x, z - TAHOE.base.z);
  const summitRise = tahoeMix(
      228,
      Math.max(rise, ridges),
      tahoeSmooth(tahoeClamp((summit - 7) / 17, 0, 1)),
    ),
    baseBlend = 1 - tahoeSmooth(tahoeClamp((baseDistance - 10) / 6, 0, 1));
  const shore = tahoeClamp((Math.sqrt(tahoeLakeValue(x, z)) - 1) * 8, 0, 1);
  return tahoeLakeValue(x, z) < 1
    ? 9.4
    : 10 + tahoeSmooth(shore) * (2 + summitRise * (1 - baseBlend));
}
/** Feet and ray picking use the same two planes as each rendered terrain cell. */
export function tahoeHeight(x: number, z: number) {
  const b = TAHOE_BOUNDS,
    s = b.step,
    ix = Math.floor((x - b.west) / s),
    iz = Math.floor((z - b.north) / s),
    xx = b.west + ix * s,
    zz = b.north + iz * s,
    u = (x - xx) / s,
    v = (z - zz) / s;
  const a = rawTahoeHeight(xx, zz),
    c = rawTahoeHeight(xx + s, zz + s);
  return u >= v
    ? a + (rawTahoeHeight(xx + s, zz) - a) * u + (c - rawTahoeHeight(xx + s, zz)) * v
    : a + (c - rawTahoeHeight(xx, zz + s)) * u + (rawTahoeHeight(xx, zz + s) - a) * v;
}
export function tahoeNormal(x: number, z: number) {
  const d = 0.3;
  return unit([
    -(rawTahoeHeight(x + d, z) - rawTahoeHeight(x - d, z)) / (2 * d),
    1,
    -(rawTahoeHeight(x, z + d) - rawTahoeHeight(x, z - d)) / (2 * d),
  ] satisfies [number, number, number]);
}
export function nearTahoe(x: number, z: number, radius?: number) {
  if (radius !== undefined) return Math.hypot(x - TAHOE.base.x, z - TAHOE.base.z) < radius;
  const b = TAHOE_BOUNDS;
  return x >= b.west && x <= b.east && z >= b.north && z <= b.south;
}
export function regionalGroundHeight(x: number, z: number) {
  if (nearTahoe(x, z)) return tahoeHeight(x, z);
  if (x < EAST_BAY_COAST_X) return -0.65;
  const foothills =
    14 * Math.exp(-(((x - (TAHOE.x - 260)) / 160) ** 2 + ((z - TAHOE.z) / 210) ** 2));
  return 1.15 + foothills + Math.sin(x * 0.01) * Math.sin(z * 0.013) * 0.2;
}

/** Raise the orbit above intervening terrain while keeping the target centered.
 * The caller adjusts focal length to retain the avatar's apparent size. */
export function fitTahoeCamera(
  target: number[],
  back: number[],
  distance: number,
  previousRise = 0,
) {
  const dx = back[0] * distance,
    dz = back[2] * distance;
  let rise = back[1] * distance;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20,
      x = target[0] + dx * t,
      z = target[2] + dz * t;
    rise = Math.max(rise, (tahoeHeight(x, z) + 0.55 - target[1]) / t);
  }
  rise = Math.max(rise, previousRise * 0.84 + rise * 0.16);
  const eye = [target[0] + dx, target[1] + rise, target[2] + dz] satisfies [number, number, number],
    actualDistance = Math.hypot(dx, rise, dz);
  return { eye, rise, focalScale: distance / actualDistance };
}

export const SNOW_SURFACE_GLSL = `
    else if(abs(vUV.x+.75)<.025){
        col*=alpineSurface(vWorld,normalize(vNormal),vUV.y);
        vec3 snowN=normalize(vNormal),snowV=normalize(uEye-vWorld);
        float sparkle=pow(max(dot(reflect(-normalize(vec3(-.5,.9,.35)),snowN),snowV),0.),24.);
        col+=vec3(.8,.9,1.)*sparkle*.035;
    }
`;

const tahoeRouteOffsets = [
  [0, 0] satisfies [number, number],
  [35, -24] satisfies [number, number],
  [65, 22] satisfies [number, number],
  [100, -8] satisfies [number, number],
  [130, 38] satisfies [number, number],
  [160, 10] satisfies [number, number],
  [190, 35] satisfies [number, number],
];
export const SKI_ROUTE = Object.freeze(
  tahoeRouteOffsets.map(([x, z]) => Object.freeze({ x: TAHOE.peak.x + x, z: TAHOE.peak.z + z })),
);
const tahoeSmoothRoute: WorldPoint[] = [];
for (let i = 0; i < SKI_ROUTE.length - 1; i++)
  for (let j = 0; j < 16; j++) {
    const a = SKI_ROUTE[Math.max(0, i - 1)],
      b = SKI_ROUTE[i],
      c = SKI_ROUTE[i + 1],
      d = SKI_ROUTE[Math.min(SKI_ROUTE.length - 1, i + 2)],
      t = j / 16;
    const curve = (k: 'x' | 'z') =>
      0.5 *
      (2 * b[k] +
        (-a[k] + c[k]) * t +
        (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t +
        (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t);
    tahoeSmoothRoute.push({ x: curve('x'), z: curve('z') });
  }
tahoeSmoothRoute.push(SKI_ROUTE.at(-1)!);
const tahoeRouteDistances = [0];
for (let i = 1; i < tahoeSmoothRoute.length; i++) {
  const a = tahoeSmoothRoute[i - 1],
    b = tahoeSmoothRoute[i];
  tahoeRouteDistances.push(
    tahoeRouteDistances.at(-1)! +
      Math.hypot(b.x - a.x, b.z - a.z, tahoeHeight(b.x, b.z) - tahoeHeight(a.x, a.z)),
  );
}
const tahoeCourseLength = tahoeRouteDistances.at(-1)!;
function tahoeCourseAt(distance: number) {
  distance = tahoeClamp(distance, 0, tahoeCourseLength);
  let i = 1;
  while (i < tahoeRouteDistances.length - 1 && distance > tahoeRouteDistances[i]) i++;
  const a = tahoeSmoothRoute[i - 1],
    b = tahoeSmoothRoute[i],
    t =
      (distance - tahoeRouteDistances[i - 1]) /
      (tahoeRouteDistances[i] - tahoeRouteDistances[i - 1]),
    angle = Math.atan2(b.z - a.z, b.x - a.x);
  return { x: tahoeMix(a.x, b.x, t), z: tahoeMix(a.z, b.z, t), angle, index: i };
}
const tahoeDistanceSegment = (x: number, z: number, a: WorldPoint, b: WorldPoint) => {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    t = tahoeClamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
};
// Drawing and walking consume the same evergreen positions.
export const TAHOE_TREES = Object.freeze(
  Array.from({ length: 110 }, (_, i) => {
    const a = i * 2.399963,
      x = TAHOE.base.x + Math.cos(a) * (9 + i * 0.5),
      z = TAHOE.base.z + Math.sin(a) * (9 + i * 0.4);
    return { x, z, h: tahoeHeight(x, z) };
  }).filter(
    (p) =>
      !(Math.abs(p.x - TAHOE_SUPPLY_HUT.x) < 3 && Math.abs(p.z - TAHOE_SUPPLY_HUT.z) < 3) &&
      p.h <= 75 &&
      tahoeLakeValue(p.x, p.z) >= 1.06 &&
      !tahoeSmoothRoute
        .slice(1)
        .some((b, i) => tahoeDistanceSegment(p.x, p.z, tahoeSmoothRoute[i], b) < 4),
  ),
);
// Projectile cover uses the narrow wooden trunk, not the evergreen canopy or
// the larger clearance needed to walk around it. Shots can pass beside trees.
export const TAHOE_COMBAT_TRUNKS = Object.freeze(
  TAHOE_TREES.map((p) =>
    Object.freeze({
      arch: 'tree',
      solid: true,
      lo: [p.x - 0.075, p.h, p.z - 0.075] satisfies [number, number, number],
      hi: [p.x + 0.075, p.h + 2.7, p.z + 0.075] satisfies [number, number, number],
    }),
  ),
);

export function createTahoe() {
  const state: TahoeState = {
    mode: 'ground',
    position: null,
    rented: false,
    travel: 0,
    up: true,
    progress: 0,
    speed: 0,
    offset: 0,
    steer: 0,
    airTime: 0,
    flipping: false,
    flipAngle: 0,
    flips: 0,
    ramps: new Set(),
    angle: 0,
  };
  const spaceport = {
      ...TAHOE_VILLAGE.spaceport,
      base: tahoeHeight(TAHOE_VILLAGE.spaceport.x, TAHOE_VILLAGE.spaceport.z),
    },
    baseEntry = { x: TAHOE.base.x - 0.5, y: TAHOE.base.z - 0.5 },
    summitEntry = { x: TAHOE.peak.x - 0.5, y: TAHOE.peak.z - 0.5 };
  // The cabin and wire share this sampled path. Check the entire cabin
  // footprint against terrain, including the steep shoulder near the summit.
  const cabinAngle = Math.atan2(TAHOE.peak.z - TAHOE.base.z, TAHOE.peak.x - TAHOE.base.x),
    co = Math.cos(cabinAngle),
    si = Math.sin(cabinAngle),
    cablePath: (WorldPoint & { y: number })[] = [];
  for (let i = 0; i <= 256; i++) {
    const f = i / 256,
      x = tahoeMix(TAHOE.base.x, TAHOE.peak.x, f),
      z = tahoeMix(TAHOE.base.z, TAHOE.peak.z, f);
    let ground = tahoeHeight(x, z);
    for (const u of [-0.9, 0.9] satisfies [number, number])
      for (const v of [-0.67, 0.67] satisfies [number, number])
        ground = Math.max(ground, tahoeHeight(x + u * co - v * si, z + u * si + v * co));
    const direct =
      tahoeMix(
        tahoeHeight(TAHOE.base.x, TAHOE.base.z),
        tahoeHeight(TAHOE.peak.x, TAHOE.peak.z),
        f,
      ) +
      0.2 +
      Math.sin(Math.PI * f) * 5;
    cablePath.push({
      x,
      z,
      y: Math.max(direct, ground + 0.24 + Math.sqrt(Math.max(0, Math.sin(Math.PI * f))) * 2.5),
    });
  }
  const cableDistances = [0];
  for (let i = 1; i < cablePath.length; i++) {
    const a = cablePath[i - 1],
      b = cablePath[i];
    cableDistances.push(cableDistances.at(-1)! + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  function contains(x: number, z: number) {
    return (
      x >= TAHOE_BOUNDS.west &&
      x <= TAHOE_BOUNDS.east &&
      z >= TAHOE_BOUNDS.north &&
      z <= TAHOE_BOUNDS.south
    );
  }
  function walkable(x: number, z: number) {
    if (TAHOE_TREES.some((p) => Math.hypot(x - p.x, z - p.z) < 0.3)) return false;
    const supplies = TAHOE_SUPPLY_HUT;
    if (
      Math.abs(x - supplies.x) < supplies.w / 2 + 0.18 &&
      Math.abs(z - supplies.z) < supplies.d / 2 + 0.18
    )
      return false;
    const hut = TAHOE_SKI_HUT;
    if (Math.abs(x - hut.x) < hut.w / 2 + 0.18 && Math.abs(z - hut.z) < hut.d / 2 + 0.18)
      return false;
    if (Math.hypot(x - spaceport.x, z - spaceport.z) < 0.92) return false;
    for (const site of [TAHOE.base, TAHOE.peak])
      for (const dx of [-1.5, 1.5] satisfies [number, number])
        for (const dz of [-0.9, 0.9] satisfies [number, number])
          if (Math.hypot(x - site.x - dx, z - site.z - dz) < 0.17) return false;
    const fuel = TAHOE_VILLAGE.fuel;
    for (const dx of [-0.8, 0.8] satisfies [number, number])
      if (Math.abs(x - fuel.x - dx) < 0.3 && Math.abs(z - fuel.z - 0.08) < 0.32) return false;
    return (
      contains(x, z) &&
      tahoeLakeValue(x, z) > 1.03 &&
      (Math.hypot(x - TAHOE.base.x, z - TAHOE.base.z) < TAHOE_FOOTHILLS_RADIUS ||
        Math.hypot(x - TAHOE.peak.x, z - TAHOE.peak.z) < 7 ||
        tahoeSmoothRoute
          .slice(1)
          .some((b, i) => tahoeDistanceSegment(x, z, tahoeSmoothRoute[i], b) < 3.5))
    );
  }
  function segment(a: { x: number; y: number }, b: { x: number; y: number }) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.3));
    for (let i = 0; i <= n; i++)
      if (!walkable(tahoeMix(a.x, b.x, i / n) + 0.5, tahoeMix(a.y, b.y, i / n) + 0.5)) return false;
    return true;
  }
  function path(from: { x: number; y: number }, to: { x: number; y: number }) {
    if (!walkable(from.x + 0.5, from.y + 0.5) || !walkable(to.x + 0.5, to.y + 0.5)) return null;
    if (Math.hypot(from.x - to.x, from.y - to.y) < 1e-7) return [];
    if (segment(from, to)) return [{ ...to }];
    const origin = { x: from.x + 0.5, z: from.y + 0.5 },
      target = { x: to.x + 0.5, z: to.y + 0.5 };
    // Only nearby cover needs visibility nodes. Long mountain journeys
    // already have the ski-route nodes; do not expand the whole forest.
    const detours = TAHOE_TREES.filter(
      (p) =>
        Math.hypot(p.x - TAHOE.base.x, p.z - TAHOE.base.z) < TAHOE_FOOTHILLS_RADIUS &&
        tahoeDistanceSegment(p.x, p.z, origin, target) < 2,
    )
      .flatMap((p) =>
        Array.from({ length: 8 }, (_, i) => ({
          x: p.x + Math.cos((i * Math.PI) / 4) * 0.6 - 0.5,
          y: p.z + Math.sin((i * Math.PI) / 4) * 0.6 - 0.5,
        })),
      )
      .filter((p) => walkable(p.x + 0.5, p.y + 0.5));
    const nodes = [
        from,
        to,
        ...detours,
        ...tahoeSmoothRoute
          .filter((p, i) => i % 4 === 0 || i === tahoeSmoothRoute.length - 1)
          .map((p) => ({ x: p.x - 0.5, y: p.z - 0.5 })),
      ],
      cost = nodes.map(() => Infinity),
      parents = nodes.map(() => -1),
      used = new Set();
    cost[0] = 0;
    for (let k = 0; k < nodes.length; k++) {
      let next = -1;
      for (let i = 0; i < nodes.length; i++)
        if (!used.has(i) && (next < 0 || cost[i] < cost[next])) next = i;
      if (next < 0 || !Number.isFinite(cost[next])) return null;
      if (next === 1) {
        const result = [];
        for (let i = 1; i !== 0; i = parents[i]) result.push(nodes[i]);
        return result.reverse();
      }
      used.add(next);
      for (let i = 0; i < nodes.length; i++)
        if (!used.has(i) && segment(nodes[next], nodes[i])) {
          const c = cost[next] + Math.hypot(nodes[i].x - nodes[next].x, nodes[i].y - nodes[next].y);
          if (c < cost[i]) {
            cost[i] = c;
            parents[i] = next;
          }
        }
    }
    return null;
  }
  function gondola(up = true) {
    if (state.mode !== 'ground') return false;
    state.mode = 'gondola';
    state.travel = 0;
    state.up = up;
    state.position = gondolaAt(up ? 0 : 1);
    return true;
  }
  function gondolaAt(f: number) {
    const scaled = tahoeClamp(f, 0, 1) * 256,
      i = Math.min(255, Math.floor(scaled)),
      a = cablePath[i],
      b = cablePath[i + 1],
      t = scaled - i;
    return { x: tahoeMix(a.x, b.x, t), y: tahoeMix(a.y, b.y, t), z: tahoeMix(a.z, b.z, t) };
  }
  function gondolaProgress(f: number) {
    const distance = tahoeClamp(f, 0, 1) * cableDistances.at(-1)!;
    let lo = 0,
      hi = 256;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cableDistances[mid] < distance) lo = mid;
      else hi = mid;
    }
    return gondolaAt(
      (lo + (distance - cableDistances[lo]) / (cableDistances[hi] - cableDistances[lo])) / 256,
    );
  }
  function startSki() {
    if (state.mode !== 'ground' || !state.rented) return false;
    Object.assign(state, {
      mode: 'ski',
      progress: 0,
      speed: 4,
      offset: 0,
      steer: 0,
      airTime: 0,
      flipping: false,
      flipAngle: 0,
      ramps: new Set(),
    });
    const p = tahoeCourseAt(0);
    state.position = { ...p, y: tahoeHeight(p.x, p.z) + 0.1 };
    return true;
  }
  function flip() {
    if (state.mode !== 'ski' || state.airTime <= 0 || state.flipping) return false;
    state.flipping = true;
    state.flips++;
    return true;
  }
  function steerTo(x: number, z: number) {
    if (state.mode !== 'ski') return false;
    const p = tahoeCourseAt(state.progress);
    state.steer = tahoeClamp(
      -(x - p.x) * Math.sin(p.angle) + (z - p.z) * Math.cos(p.angle),
      -1.4,
      1.4,
    );
    return true;
  }
  function update(dt: number) {
    if (state.mode === 'gondola') {
      state.travel = Math.min(1, state.travel + dt / 28);
      const f = state.up ? tahoeSmooth(state.travel) : 1 - tahoeSmooth(state.travel);
      state.position = gondolaProgress(f);
      state.angle = cabinAngle;
      if (state.travel === 1) {
        state.mode = 'ground';
        state.position = {
          x: state.up ? TAHOE.peak.x : TAHOE.base.x,
          z: state.up ? TAHOE.peak.z : TAHOE.base.z,
          y: tahoeHeight(
            state.up ? TAHOE.peak.x : TAHOE.base.x,
            state.up ? TAHOE.peak.z : TAHOE.base.z,
          ),
        };
        return state.up ? 'summit' : 'base';
      }
      return null;
    }
    if (state.mode !== 'ski') return null;
    state.speed = Math.min(22, state.speed + dt * 8);
    const old = state.progress;
    state.progress = Math.min(tahoeCourseLength, state.progress + state.speed * dt);
    state.offset += (state.steer - state.offset) * Math.min(1, dt * 5);
    for (const f of [0.22, 0.43, 0.64, 0.82] satisfies [number, number, number, number])
      if (
        old < tahoeCourseLength * f &&
        state.progress >= tahoeCourseLength * f &&
        !state.ramps.has(f)
      ) {
        state.ramps.add(f);
        state.airTime = 1.45;
        state.flipping = false;
      }
    const wasAir = state.airTime > 0;
    state.airTime = Math.max(0, state.airTime - dt);
    const air = state.airTime > 0 ? 1 - state.airTime / 1.45 : 0,
      p = tahoeCourseAt(state.progress);
    const x = p.x - Math.sin(p.angle) * state.offset,
      z = p.z + Math.cos(p.angle) * state.offset;
    state.position = {
      x,
      z,
      y: tahoeHeight(x, z) + 0.1 + (state.airTime > 0 ? Math.sin(Math.PI * air) * 6 : 0),
    };
    state.angle = p.angle;
    state.flipAngle = state.flipping && state.airTime > 0 ? air * Math.PI * 2 : 0;
    if (state.progress === tahoeCourseLength) {
      state.mode = 'ground';
      state.speed = 0;
      state.airTime = 0;
      state.flipAngle = 0;
      return 'finish';
    }
    if (wasAir && state.airTime === 0 && state.flipping) {
      state.flipping = false;
      return 'flip';
    }
    return null;
  }
  function reset() {
    Object.assign(state, {
      mode: 'ground',
      position: null,
      rented: false,
      airTime: 0,
      speed: 0,
      flipAngle: 0,
    });
  }
  return {
    state,
    spaceport,
    baseEntry,
    summitEntry,
    contains,
    walkable,
    segment,
    path,
    gondola,
    gondolaAt,
    cablePath,
    startSki,
    flip,
    steerTo,
    update,
    reset,
    courseLength: tahoeCourseLength,
    courseAt: tahoeCourseAt,
  };
}

export function drawTahoeTerrain(m: Mesh) {
  const b = TAHOE_BOUNDS,
    s = b.step;
  m.quad(
    [b.west - 16, 1, b.north - 16] satisfies [number, number, number],
    [b.west - 16, 1, b.south + 16] satisfies [number, number, number],
    [b.east + 16, 1, b.south + 16] satisfies [number, number, number],
    [b.east + 16, 1, b.north - 16] satisfies [number, number, number],
    '#9fa78d',
  );
  const width = Math.round((b.east - b.west) / s) + 1,
    rows = Math.round((b.south - b.north) / s) + 1,
    vertices = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < width; i++) {
      const x = b.west + i * s,
        z = b.north + j * s;
      let distance = Infinity;
      for (let k = 1; k < tahoeSmoothRoute.length; k++)
        distance = Math.min(
          distance,
          tahoeDistanceSegment(x, z, tahoeSmoothRoute[k - 1], tahoeSmoothRoute[k]),
        );
      // A broad, connected finish apron meets the gondola platform. Leave
      // enough full snow at the edges for steering and terrain interpolation.
      distance = Math.min(
        distance,
        Math.max(0, Math.hypot(x - TAHOE.base.x, z - TAHOE.base.z) - 2),
      );
      vertices.push({
        p: [x, rawTahoeHeight(x, z), z] satisfies [number, number, number],
        n: tahoeNormal(x, z),
        groom: 1 - tahoeSmooth(tahoeClamp((distance - 3) / 1.5, 0, 1)),
      });
    }
  const emit = (poly: TahoeVertex[], paved: boolean) => {
    for (let j = 1; j < poly.length - 1; j++) {
      const vertices = [poly[0], poly[j], poly[j + 1]],
        start = m.data.length;
      m.tri(
        vertices[0].p,
        vertices[1].p,
        vertices[2].p,
        paved ? '#b3b8aa' : '#ffffff',
        paved ? 'cobble' : { snow: true },
      );
      for (const [i, v] of vertices.entries()) {
        for (let k = 0; k < 3; k++) m.data[start + i * 11 + 3 + k] = v.n[k];
        if (!paved) m.data[start + i * 11 + 10] = v.groom;
      }
    }
  };
  const triangle = (a: TahoeVertex, c: TahoeVertex, d: TahoeVertex) => {
    const tri = [a, c, d],
      minX = Math.min(...tri.map((v) => v.p[0])),
      maxX = Math.max(...tri.map((v) => v.p[0])),
      minZ = Math.min(...tri.map((v) => v.p[2])),
      maxZ = Math.max(...tri.map((v) => v.p[2]));
    const cuts = TAHOE_VILLAGE_PAVING.filter(
      (r) => maxX > r.west && minX < r.east && maxZ > r.north && minZ < r.south,
    );
    if (!cuts.length) {
      emit(tri, false);
      return;
    }
    // Partition the original terrain faces. Paving replaces snow/grass;
    // it never sits in a second coplanar layer above it.
    let remaining = [tri];
    for (const r of cuts) {
      const outside = [];
      for (const poly of remaining) {
        let inside = poly;
        for (const [axis, value, positive] of [
          [0, r.west, true] satisfies [number, number, boolean],
          [0, r.east, false] satisfies [number, number, boolean],
          [2, r.north, true] satisfies [number, number, boolean],
          [2, r.south, false] satisfies [number, number, boolean],
        ]) {
          if (inside.length < 3) break;
          const part = clipTahoePaving(inside, axis, value, !positive);
          if (part.length >= 3) outside.push(part);
          inside = clipTahoePaving(inside, axis, value, positive);
        }
        if (inside.length >= 3) emit(inside, true);
      }
      remaining = outside;
    }
    for (const poly of remaining) emit(poly, false);
  };
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < width - 1; i++) {
      const a = vertices[j * width + i],
        c = vertices[(j + 1) * width + i + 1];
      triangle(a, c, vertices[j * width + i + 1]);
      triangle(a, vertices[(j + 1) * width + i], c);
    }
  const shore = [];
  for (let i = 0; i < 96; i++) {
    const a = (i * Math.PI) / 48;
    shore.push([
      TAHOE.x + Math.cos(a) * 35,
      TAHOE.lakeLevel + 0.025,
      TAHOE.z + Math.sin(a) * 70,
    ] satisfies [number, number, number]);
  }
  for (let i = 0; i < shore.length; i++)
    m.tri(
      [TAHOE.x, TAHOE.lakeLevel + 0.025, TAHOE.z] satisfies [number, number, number],
      shore[(i + 1) % shore.length],
      shore[i],
      '#ffffff',
      { water: 2 },
    );
  // Evergreen clusters below the snow line, away from the actual ski course.
  for (const { x, z, h } of TAHOE_TREES) {
    m.cylinder(x, h, z, 0.075, 2.7, '#82705b', 8);
    for (let j = 0; j < 3; j++)
      m.cylinder(x, h + 0.7 + j * 0.7, z, 0.65 - j * 0.14, 1.3, '#4c7565', 12, 0);
  }
}

export function drawTahoeStructures(
  m: Mesh,
  tahoe: ReturnType<typeof createTahoe>,
  signs: SignAtlas,
) {
  const sights: {
      id: string;
      label: string;
      kind: string;
      entry: Readonly<{ x: number; y: number }>;
      start: number;
      count: number;
      lo: number[];
      hi: number[];
    }[] = [],
    add = (
      id: string,
      label: string,
      kind: string,
      entry: Readonly<{ x: number; y: number }>,
      draw: () => void,
    ) => {
      const start = m.data.length;
      draw();
      const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
        hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
      for (let i = start; i < m.data.length; i += 11)
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], m.data[i + k]);
          hi[k] = Math.max(hi[k], m.data[i + k]);
        }
      sights.push({ id, label, kind, entry, start, count: m.data.length - start, lo, hi });
    };
  add('tahoe-spaceport', 'Tahoe SpaceX spaceport', 'spaceport', tahoe.spaceport.entry, () =>
    drawRocketPad(m, tahoe.spaceport, signs),
  );
  for (const [site, up] of [[TAHOE.base, true] as const, [TAHOE.peak, false] as const]) {
    const h = tahoeHeight(site.x, site.z);
    add(
      up ? 'gondola-base' : 'gondola-summit',
      up ? 'Mountain gondola' : 'Summit gondola',
      'gondola',
      up ? tahoe.baseEntry : tahoe.summitEntry,
      () => {
        m.box(site.x - 1.8, h, site.z - 1.5, 3.6, 0.12, 3, '#b3b6a6', 'stone');
        for (const dx of [-1.5, 1.5] satisfies [number, number]) {
          m.box(site.x + dx - 0.08, h + 0.12, site.z - 0.9, 0.16, 3.4, 0.16, '#a15b54', {
            metal: 0.3,
          });
          m.box(site.x + dx - 0.08, h + 0.12, site.z + 0.9, 0.16, 3.4, 0.16, '#a15b54', {
            metal: 0.3,
          });
        }
        for (const dz of [-1.2, 1] satisfies [number, number])
          m.box(site.x - 1.85, h + 3.5, site.z + dz, 3.7, 0.15, 0.2, '#6e7775', 'roof');
        drawPlaque(m, signs, 'GONDOLA', site.x, h + 2.9, site.z - 1.22, 2.8, 0.35, false);
        for (const side of [-1, 1] satisfies [number, number]) {
          const roof = [
            [site.x - 2, h + 3.65, site.z + side * 1.55],
            [site.x + 2, h + 3.65, site.z + side * 1.55],
            [site.x + 2, h + 4.15, site.z],
            [site.x - 2, h + 4.15, site.z],
          ];
          if (side < 0) roof.reverse();
          m.quad(roof[0], roof[1], roof[2], roof[3], '#e6ece6', { snow: true, groom: 1 });
          m.rod(
            [site.x - 2, h + 3.6, site.z + side * 1.55],
            [site.x + 2, h + 3.6, site.z + side * 1.55],
            0.04,
            '#8a7966',
            10,
            'wood',
          );
          m.sphere(site.x + side * 0.78, h + 2.82, site.z, 0.3, 0.3, 0.045, '#596b70', 24, 12, {
            metal: 0.4,
          });
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            m.rod(
              [site.x + side * 0.78, h + 2.82, site.z - 0.05],
              [
                site.x + side * 0.78 + Math.cos(a) * 0.27,
                h + 2.82 + Math.sin(a) * 0.27,
                site.z - 0.05,
              ],
              0.014,
              '#c4cdc5',
              6,
            );
          }
        }
        for (const dx of [-1.65, 1.65] satisfies [number, number])
          for (let i = 0; i < 5; i++)
            m.box(
              site.x + dx - 0.035,
              h + 0.15,
              site.z - 1.25 + i * 0.53,
              0.07,
              0.075,
              0.34,
              '#e5e9df',
              { snow: true },
            );
      },
    );
  }
  for (let i = 0; i < tahoe.cablePath.length; i++) {
    const p = tahoe.cablePath[i],
      cable = [p.x, p.y + 2.4, p.z];
    if (i) {
      const q = tahoe.cablePath[i - 1];
      m.rod([q.x, q.y + 2.4, q.z], cable, 0.023, '#687571', 8);
    }
    if (i % 32 === 0) {
      const ground = tahoeHeight(p.x, p.z);
      for (const dx of [-0.55, 0.55] satisfies [number, number])
        m.rod([p.x + dx, ground, p.z], [p.x + dx, p.y + 2.7, p.z], 0.08, '#6b827b', 10);
      m.rod([p.x - 0.8, p.y + 2.5, p.z], [p.x + 0.8, p.y + 2.5, p.z], 0.065, '#aab5aa', 10);
    }
  }
  const hut = TAHOE_SKI_HUT,
    h = tahoeHeight(hut.x, hut.z);
  add('ski-rental', 'Summit ski rental', 'ski-rental', { ...hut.entry }, () => {
    pose(m, hut.x, h, hut.z, hut.rotation, () => {
      const w = hut.d,
        d = hut.w;
      m.box(-w / 2, 0, -d / 2, w, 1.8, d, '#977958', 'wood');
      for (const side of [-1, 1] satisfies [number, number]) {
        const roof = [
          [-w / 2 - 0.15, 1.81, side * (d / 2 + 0.15)] satisfies [number, number, number],
          [w / 2 + 0.15, 1.81, side * (d / 2 + 0.15)] satisfies [number, number, number],
          [w / 2 + 0.15, 2.4, 0] satisfies [number, number, number],
          [-w / 2 - 0.15, 2.4, 0] satisfies [number, number, number],
        ];
        if (side < 0) roof.reverse();
        m.quad(roof[0], roof[1], roof[2], roof[3], '#e5ece8', { snow: true, groom: 1 });
        m.rod(
          [-w / 2 - 0.16, 1.77, side * (d / 2 + 0.16)] satisfies [number, number, number],
          [w / 2 + 0.16, 1.77, side * (d / 2 + 0.16)] satisfies [number, number, number],
          0.045,
          '#5b6e71',
          10,
        );
        m.tri(
          [(side * w) / 2, 1.8, -d / 2] satisfies [number, number, number],
          [(side * w) / 2, 1.8, d / 2] satisfies [number, number, number],
          [(side * w) / 2, 2.4, 0] satisfies [number, number, number],
          '#ad9172',
          'wood',
        );
      }
      for (const x of [-1.18, 0.67] satisfies [number, number])
        drawFacadeWindow(m, {
          plane: d / 2 + 0.015,
          along: x,
          y: 0.45,
          w: 0.49,
          h: 0.59,
          trim: '#e2d2b5',
          seed: x,
        });
      m.box(-0.28, 0.03, d / 2 + 0.02, 0.56, 1.12, 0.035, '#526b72', 'wood');
      m.sphere(0.18, 0.62, d / 2 + 0.07, 0.025, 0.025, 0.025, '#bca56e', 10, 6, { metal: 0.3 });
      m.box(-1.1, 1.8, -0.75, 0.25, 0.85, 0.3, '#9b8877', 'stone');
      m.box(-1.13, 2.64, -0.78, 0.31, 0.08, 0.36, '#dde5de');
      for (const x of [-w / 2 + 0.04, w / 2 - 0.1] satisfies [number, number])
        m.box(x, 0.05, -d / 2, 0.065, 1.72, d, '#b49a74', 'wood');
      drawPlaque(m, signs, 'SKIS · 1 COIN', 0, 1.25, d / 2 + 0.025, 2.4, 0.33);
      for (let i = 0; i < 5; i++)
        m.rod(
          [-1 + i * 0.4, 0.1, d / 2 + 0.15] satisfies [number, number, number],
          [-1.15 + i * 0.4, 1.1, d / 2 + 0.2] satisfies [number, number, number],
          0.035,
          i % 2 ? '#d0a05d' : '#668e9c',
          6,
        );
    });
  });
  const supplies = TAHOE_SUPPLY_HUT,
    sh = tahoeHeight(supplies.x, supplies.z);
  add('hiking-supplies', 'Hiker’s supplies', 'hiking-supplies', supplies.entry, () => {
    pose(m, supplies.x, sh, supplies.z, 0, () => {
      m.box(-1.6, -0.1, -1.4, 3.2, 1.9, 2.8, '#987953', 'wood');
      for (const side of [-1, 1] satisfies [number, number]) {
        m.quad(
          [-1.8, 1.8, side * 1.6] satisfies [number, number, number],
          [1.8, 1.8, side * 1.6] satisfies [number, number, number],
          [1.8, 2.5, 0] satisfies [number, number, number],
          [-1.8, 2.5, 0] satisfies [number, number, number],
          side < 0 ? '#78918c' : '#e4ece5',
          side > 0 ? { snow: true } : 'roof',
        );
        m.tri(
          [side * 1.6, 1.8, -1.4] satisfies [number, number, number],
          [side * 1.6, 1.8, 1.4] satisfies [number, number, number],
          [side * 1.6, 2.5, 0] satisfies [number, number, number],
          '#7c654b',
          'wood',
        );
      }
      m.box(-0.32, 0, 1.41, 0.64, 1.2, 0.045, '#516e68', 'wood');
      for (const x of [-1.12, 0.75] satisfies [number, number])
        drawFacadeWindow(m, {
          plane: 1.43,
          along: x,
          y: 0.65,
          w: 0.5,
          h: 0.65,
          trim: '#e1cfaa',
          seed: x,
        });
      drawPlaque(m, signs, 'HIKING SUPPLIES', 0, 1.42, 1.46, 2.8, 0.31);
      for (const x of [-1.15, 1] satisfies [number, number]) {
        m.box(x - 0.17, 0.03, 1.6, 0.34, 0.54, 0.22, '#59765b', 'wood');
        m.rod(
          [x - 0.12, 0.06, 1.84] satisfies [number, number, number],
          [x - 0.12, 0.58, 1.84] satisfies [number, number, number],
          0.015,
          '#d9cda5',
          6,
        );
      }
    });
  });
  // Groomed piste markers and four raised ramps follow the same route as the skier.
  for (let d = 0; d < tahoeCourseLength; d += 7) {
    const p = tahoeCourseAt(d);
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = p.x - Math.sin(p.angle) * side * 2.5,
        z = p.z + Math.cos(p.angle) * side * 2.5,
        h = tahoeHeight(x, z);
      m.cylinder(x, h, z, 0.018, 0.65, '#a7715b', 6);
      m.tri(
        [x, h + 0.6, z] satisfies [number, number, number],
        [x + 0.22, h + 0.52, z] satisfies [number, number, number],
        [x, h + 0.4, z] satisfies [number, number, number],
        side < 0 ? '#be7058' : '#6d8ca3',
      );
    }
  }
  for (const f of [0.22, 0.43, 0.64, 0.82] satisfies [number, number, number, number]) {
    const p = tahoeCourseAt(tahoeCourseLength * f),
      c = Math.cos(p.angle),
      s = Math.sin(p.angle),
      at = (u: number, v: number, extra: number) => {
        const x = p.x + c * u - s * v,
          z = p.z + s * u + c * v;
        return [x, tahoeHeight(x, z) + extra, z] satisfies [number, number, number];
      };
    m.quad(
      at(-1.8, -1.4, 0.03),
      at(-1.8, 1.4, 0.03),
      at(0.3, 1.4, 1.1),
      at(0.3, -1.4, 1.1),
      '#d5dfda',
      'wood',
    );
    m.quad(
      at(0.3, -1.4, 0.03),
      at(0.3, -1.4, 1.1),
      at(0.3, 1.4, 1.1),
      at(0.3, 1.4, 0.03),
      '#728c91',
    );
  }
  return sights;
}

export function drawGondolaCabin(m: Mesh, p: WorldPoint & { y: number }, angle: number) {
  pose(m, p.x, p.y, p.z, angle, () => {
    m.box(-0.85, -0.1, -0.62, 1.7, 0.12, 1.24, '#ad8065', 'wood');
    for (const side of [-1, 1] satisfies [number, number]) {
      m.box(-0.8, 0.02, side * 0.6, 1.6, 0.55, 0.035, '#526f7a', { metal: 0.25 });
      m.box(-0.8, 0.6, side * 0.6, 1.6, 0.75, 0.025, '#90b3bc', 'glass');
    }
    for (const x of [-0.8, 0.8] satisfies [number, number])
      for (const z of [-0.6, 0.6] satisfies [number, number])
        m.rod(
          [x, 0, z] satisfies [number, number, number],
          [x, 1.8, z] satisfies [number, number, number],
          0.025,
          '#c2c9be',
          8,
        );
    m.box(-0.82, 1.7, 0.42, 1.64, 0.08, 0.2, '#697b7b');
    m.rod(
      [0, 1.75, 0] satisfies [number, number, number],
      [0, 2.35, 0] satisfies [number, number, number],
      0.035,
      '#879b94',
      8,
    );
  });
}

export function drawSkiRider(
  m: Mesh,
  state: Pick<TahoeState, 'position' | 'angle' | 'flipAngle'>,
  time: number,
  reduced = false,
  appearance: Appearance = {},
) {
  const p = state.position!,
    start = m.data.length;
  drawCharacter(
    m,
    0,
    0,
    0.13,
    0,
    0,
    false,
    appearance.skin || '#bd9369',
    appearance.shirt || '#6c8a97',
    {
      pants: '#53646b',
      ...appearance,
      mode: 'surf',
      backpack: false,
      time: reduced ? 0 : time * 0.001,
    },
  );
  for (const side of [-1, 1] satisfies [number, number]) {
    m.box(-1.05, 0.02, side * 0.14 - 0.055, 2.1, 0.045, 0.11, '#c08058', { metal: 0.1 });
    m.rod(
      [1.02, 0.065, side * 0.14] satisfies [number, number, number],
      [1.2, 0.16, side * 0.14] satisfies [number, number, number],
      0.048,
      '#d4b282',
      8,
    );
    m.rod(
      [0.32, 0.9, side * 0.45] satisfies [number, number, number],
      [-0.25, 0.04, side * 0.6] satisfies [number, number, number],
      0.012,
      '#acbcb9',
      8,
    );
    m.sphere(-0.25, 0.04, side * 0.6, 0.06, 0.014, 0.06, '#637b79', 10, 4);
  }
  const ca = Math.cos(state.angle),
    sa = Math.sin(state.angle),
    f = state.flipAngle || 0,
    cf = Math.cos(f),
    sf = Math.sin(f);
  m.characters?.transform(
    start,
    new Float32Array([
      ca * cf,
      sf,
      sa * cf,
      0,
      -ca * sf,
      cf,
      -sa * sf,
      0,
      -sa,
      0,
      ca,
      0,
      p.x + ca * 0.8 * sf,
      p.y + 0.8 - 0.8 * cf,
      p.z + sa * 0.8 * sf,
      1,
    ]),
  );
  for (let i = start; i < m.data.length; i += 11) {
    let x = m.data[i],
      y = m.data[i + 1] - 0.8,
      z = m.data[i + 2],
      nx = m.data[i + 3],
      ny = m.data[i + 4],
      nz = m.data[i + 5];
    const xx = x * cf - y * sf,
      yy = x * sf + y * cf,
      nnx = nx * cf - ny * sf,
      nny = nx * sf + ny * cf;
    m.data[i] = p.x + xx * ca - z * sa;
    m.data[i + 1] = p.y + yy + 0.8;
    m.data[i + 2] = p.z + xx * sa + z * ca;
    m.data[i + 3] = nnx * ca - nz * sa;
    m.data[i + 4] = nny;
    m.data[i + 5] = nnx * sa + nz * ca;
  }
}

/** Coarse California ground is generated only around the camera. Tahoe uses
 * its own detailed mesh; the intervening countryside never expands the city grid. */
export function drawRegionalBackdrop(m: Mesh, x: number, z: number, viewerHeight = 0) {
  const altitude = Math.max(viewerHeight, regionalGroundHeight(x, z)),
    step = altitude > 80 ? 32 : 16,
    r = Math.max(192, Math.min(800, altitude * 3 + 180)),
    minX = Math.floor((x - r) / step) * step,
    minZ = Math.floor((z - r) / step) * step,
    b = TAHOE_BOUNDS;
  const rect = (x0: number, z0: number, x1: number, z1: number) => {
    if (x1 - x0 < 1e-8 || z1 - z0 < 1e-8) return;
    const points = [
      [x0, z0] satisfies [number, number],
      [x0, z1] satisfies [number, number],
      [x1, z1] satisfies [number, number],
      [x1, z0] satisfies [number, number],
    ].map(([u, v]) => [u, regionalGroundHeight(u, v), v] satisfies [number, number, number]);
    m.quad(points[0], points[1], points[2], points[3], '#a7ac87', 'grass');
  };
  for (let zz = minZ; zz < z + r; zz += step)
    for (let xx = minX; xx < x + r; xx += step) {
      if (xx + step <= EAST_BAY_COAST_X) continue;
      const x0 = Math.max(EAST_BAY_COAST_X, xx),
        x1 = xx + step,
        z1 = zz + step;
      if (x0 === EAST_BAY_COAST_X)
        m.quad(
          [x0, -0.65, zz] satisfies [number, number, number],
          [x0, -0.65, z1] satisfies [number, number, number],
          [x0, regionalGroundHeight(x0, z1), z1] satisfies [number, number, number],
          [x0, regionalGroundHeight(x0, zz), zz] satisfies [number, number, number],
          '#929c7d',
          'dirt',
        );
      if (x0 >= b.east || x1 <= b.west || zz >= b.south || z1 <= b.north) {
        rect(x0, zz, x1, z1);
        continue;
      }
      rect(x0, zz, x1, Math.min(z1, b.north));
      rect(x0, Math.max(zz, b.south), x1, z1);
      const top = Math.max(zz, b.north),
        bottom = Math.min(z1, b.south);
      rect(x0, top, Math.min(x1, b.west), bottom);
      rect(Math.max(x0, b.east), top, x1, bottom);
    }
}

export function drawTahoeMinimap(
  ctx: CanvasRenderingContext2D,
  projection: Pick<ReturnType<typeof import('./wayfinding.ts').createMinimapProjection>, 'point'>,
  viewer: number[],
) {
  ctx.fillStyle = '#b2c1b1';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const polygon = (points: Point[], color: string) => {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const step = 4,
    startX = Math.floor((viewer[0] - 48) / step) * step,
    startZ = Math.floor((viewer[1] - 48) / step) * step;
  for (let z = startZ; z < viewer[1] + 48; z += step)
    for (let x = startX; x < viewer[0] + 48; x += step) {
      const h = tahoeHeight(x + 2, z + 2),
        wet = tahoeLakeValue(x + 2, z + 2) < 1;
      polygon(
        [
          [x, z] satisfies [number, number],
          [x + step, z] satisfies [number, number],
          [x + step, z + step] satisfies [number, number],
          [x, z + step] satisfies [number, number],
        ].map((p) => projection.point(...p)),
        wet ? '#548fa9' : h > 150 ? '#f1f1e5' : h > 60 ? '#d4dfd4' : '#9bb395',
      );
    }
  for (const r of TAHOE_VILLAGE_PAVING)
    polygon(
      [
        [r.west, r.north] satisfies [number, number],
        [r.east, r.north] satisfies [number, number],
        [r.east, r.south] satisfies [number, number],
        [r.west, r.south] satisfies [number, number],
      ].map((p) => projection.point(...p)),
      '#b3b8aa',
    );
  const line = (points: WorldPoint[], color: string) => {
    ctx.beginPath();
    points
      .map((p) => projection.point(p.x, p.z))
      .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  line(tahoeSmoothRoute, '#7c99aa');
  line([TAHOE.base, TAHOE.peak], '#8b7b67');
}

export function raycastTahoe(ray: Ray, maxDistance = 850) {
  const b = TAHOE_BOUNDS,
    s = b.step,
    o = ray.origin,
    d = ray.dir;
  let near = 0,
    far = maxDistance;
  for (const [axis, min, max] of [
    [0, b.west, b.east] satisfies [number, number, number],
    [2, b.north, b.south] satisfies [number, number, number],
  ]) {
    if (Math.abs(d[axis]) < 1e-9) {
      if (o[axis] < min || o[axis] > max) return null;
    } else {
      let a = (min - o[axis]) / d[axis],
        c = (max - o[axis]) / d[axis];
      if (a > c) [a, c] = [c, a] satisfies [number, number];
      near = Math.max(near, a);
      far = Math.min(far, c);
    }
  }
  if (near > far) return null;
  const countX = Math.round((b.east - b.west) / s),
    countZ = Math.round((b.south - b.north) / s),
    sx = d[0] >= 0 ? 1 : -1,
    sz = d[2] >= 0 ? 1 : -1;
  let ix = tahoeClamp(Math.floor((o[0] + d[0] * (near + 1e-6) - b.west) / s), 0, countX - 1),
    iz = tahoeClamp(Math.floor((o[2] + d[2] * (near + 1e-6) - b.north) / s), 0, countZ - 1),
    t = near;
  let tx = Math.abs(d[0]) < 1e-9 ? Infinity : (b.west + (ix + (sx > 0 ? 1 : 0)) * s - o[0]) / d[0],
    tz = Math.abs(d[2]) < 1e-9 ? Infinity : (b.north + (iz + (sz > 0 ? 1 : 0)) * s - o[2]) / d[2];
  const dx = Math.abs(s / d[0]),
    dz = Math.abs(s / d[2]);
  while (t <= far && ix >= 0 && iz >= 0 && ix < countX && iz < countZ) {
    const x = b.west + ix * s,
      z = b.north + iz * s,
      a = [x, rawTahoeHeight(x, z), z] satisfies [number, number, number],
      c = [x + s, rawTahoeHeight(x + s, z + s), z + s] satisfies [number, number, number],
      p = [x + s, rawTahoeHeight(x + s, z), z] satisfies [number, number, number],
      q = [x, rawTahoeHeight(x, z + s), z + s] satisfies [number, number, number];
    for (const tri of [
      [a, c, p],
      [a, q, c],
    ]) {
      const hit = rayTriangle(ray, tri[0], tri[1], tri[2]);
      if (hit !== null && hit >= near - 1e-6 && hit <= far)
        return { point: o.map((v, i) => v + d[i] * hit), distance: hit };
    }
    if (tx < tz) {
      t = tx;
      tx += dx;
      ix += sx;
    } else {
      t = tz;
      tz += dz;
      iz += sz;
    }
  }
  return null;
}
