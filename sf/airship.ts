import { isFiniteNumber } from './types/json.ts';
import type { Point, WorldPoint } from './types/geometry.ts';
import type { SurfaceTile, TileType } from './types/tiles.ts';
export interface AirshipState {
  active: boolean;
  phase: string;
  position: (WorldPoint & { y: number }) | null;
  heading: number;
  speed: number;
  target: WorldPoint | null;
}
interface AirportPaving {
  west: number;
  east: number;
  north: number;
  south: number;
  height: number;
  material: TileType;
}
interface AirportCurb {
  a: number[];
  b: number[];
  A: number[];
  B: number[];
  axis: number;
  sign: number;
}
import type { SignAtlas } from './types/world.ts';
import { drawCachedMesh } from './rendering/cached-mesh.ts';
import { createSegmentDistanceIndex } from './segment-index.ts';
import { STARTUP_SITE, SOUTHERN_MAP_END, inSouthernLake } from './southern-countryside-layout.ts';
import { inBottleStream } from './social-layout.ts';
import { saltSurfaceAt, saltPondAt } from './salt-layout.ts';
import { CITY_EDGE_GATES } from './city-edge.ts';
import { westernCoastX, westernShoreType } from './coastline.ts';
import { PENINSULA_TRUNK_STREETS } from './peninsula-urbanism.ts';
import { Mesh, pose } from './geometry.ts';
import { createRegionalNavigation } from './regional-navigation.ts';
import { drawAirshipBasket } from './airship-basket.ts';
import { nightlifeAccess, nightlifeWalkable } from './nightlife.ts';
import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.ts';
import { TILE_CONFIG, TILE_TYPES, buildSurfaceTile, clipTilePolygon } from './tiles.ts';
import {
  SOUTHERN_STREETS,
  southernTrailDistance,
  inTimesSquare,
  timesSquareWalkable,
  gymAccess,
  gymWalkable,
  SOUTHERN_BOUNDS,
  inSouthernHousePlot,
} from './southern-layout.ts';
import { researchCampusAt, researchCampusWalkable } from './research-layout.ts';
import { inPacificaPark, pacificaParkWalkable } from './southern-expansion.ts';
import { drawFacadeWindow } from './windows.ts';
import { southBaySurfaceAt } from './south-bay-layout.ts';

// Reuse the building east of the runway. Its passenger entrance and mooring
// share this layout with picking, navigation, rental controls and cartography.
export const AIRPORT_TERMINAL_BUILDING = Object.freeze({ x: 90.2, z: 124, w: 4, d: 5.3 });
export const AIRSHIP_TERMINAL = Object.freeze({
  x: 92.2,
  z: 126.65,
  base: 1.15,
  entry: Object.freeze({ x: 91.7, y: 122.9 }),
  boarding: Object.freeze({ x: 91.7, y: 119.5 }),
});
export const AIRPORT_RUNWAY = Object.freeze({ x: 85.8, z: 118.5, width: 3.6, depth: 31 });
export const AIRPORT_SPACEPORT = Object.freeze({
  x: 104,
  z: 122,
  base: AIRSHIP_TERMINAL.base,
  entry: { x: 103.5, y: 118.7 },
});
export const SPACEPORT_PIER = Object.freeze({
  west: 94.4,
  east: 100.5,
  north: 119,
  south: 121.2,
  pad: { west: 99.5, east: 108, north: 117, south: 126 },
});
export const STARTUP_HQ = STARTUP_SITE;
// Third Street is the continuous peninsula highway; Startup HQ has a side lane.
// Rendering, city reservations, walking, and cartography share this centerline.
const thirdStreet = (70.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE;
export const SECOND_STREET_X = (64.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE;
export const SOUTHERN_ROADS = Object.freeze(
  [...PENINSULA_TRUNK_STREETS, ...SOUTHERN_STREETS].map((r) =>
    Object.freeze({ ...r, points: Object.freeze(r.points.map((value) => Object.freeze(value))) }),
  ),
);
export const SOUTHERN_ROAD_END =
  Math.max(...SOUTHERN_ROADS.flatMap((r) => r.points.map((p) => p[1]))) +
  TILE_CONFIG.curbWidth +
  0.25;
export const AIRSHIP_ACCESS = Object.freeze({
  halfWidth: 0.5,
  points: Object.freeze(
    [
      [thirdStreet, (77.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE] satisfies [number, number],
      [thirdStreet, SOUTHERN_MAP_END - 0.75] satisfies [number, number],
    ].map((value) => Object.freeze(value)),
  ),
});
const airportRoadDistanceIndex = createSegmentDistanceIndex(
  SOUTHERN_ROADS.map(({ points }) => ({ points })),
);
export function airportRoadDistance(x: number, z: number) {
  return airportRoadDistanceIndex(x, z) - AIRSHIP_ACCESS.halfWidth;
}
export function airportGate(worldSize = WORLD_SIZE) {
  return { x: thirdStreet - 0.5, y: worldSize - 1.5 };
}
export function onAirportApron(x: number, z: number) {
  const p = SPACEPORT_PIER,
    q = p.pad;
  return (
    (x >= 80 && x <= 94.8 && z >= 103.2 && z <= 117.5) ||
    (x >= 82.4 && x <= 94.8 && z >= 117.5 && z <= 150.5) ||
    (x >= p.west && x <= p.east && z >= p.north && z <= p.south) ||
    (x >= q.west && x <= q.east && z >= q.north && z <= q.south)
  );
}
export function airportSurfaceTypeAt(x: number, z: number) {
  if (z >= WORLD_SIZE && z <= SOUTHERN_BOUNDS.south && x < westernCoastX(z)) return 'sea';
  const salt = saltSurfaceAt(x, z);
  if (salt === 'water' || inSouthernLake(x, z)) return 'water';
  const road = airportRoadDistance(x, z),
    path = southernTrailDistance(x, z);
  return road < 0
    ? 'road'
    : path < 0
      ? 'path'
      : Math.min(road, path) < TILE_CONFIG.curbWidth
        ? 'sidewalk'
        : inBottleStream(x, z)
          ? 'water'
          : salt ||
            southBaySurfaceAt(x, z) ||
            (z >= WORLD_SIZE && z <= SOUTHERN_BOUNDS.south ? westernShoreType(x, z) : 'grass');
}
/** The extension uses the city's exact quarter-tile material partitioner. */
const airportTileCache = new Map<
  number,
  { x: number; z: number; step: number; tile: SurfaceTile }[]
>();
export function airportRoadTiles(worldSize = WORLD_SIZE) {
  if (airportTileCache.has(worldSize)) return airportTileCache.get(worldSize)!;
  const step = 1 / TILE_CONFIG.resolution,
    tiles = [],
    end = SOUTHERN_ROAD_END;
  for (let z = worldSize; z < end; z += step)
    for (let x = SOUTHERN_BOUNDS.west; x < 85.5; x += step) {
      const values = [
        [x, z] satisfies [number, number],
        [x + step, z] satisfies [number, number],
        [x + step, z + step] satisfies [number, number],
        [x, z + step] satisfies [number, number],
      ].map(
        (p) => [airportRoadDistance(...p), southernTrailDistance(...p)] satisfies [number, number],
      );
      const tile = buildSurfaceTile('grass', values);
      if (tile.areas.road || tile.areas.path || tile.areas.sidewalk)
        tiles.push({ x, z, step, tile });
    }
  airportTileCache.set(worldSize, tiles);
  return tiles;
}

/** Ground access and reversible flight are separate from the city tile grid.
 * The short southern extension joins a real, reachable city navigation node. */
export function createAirship({
  worldSize = 96,
  groundHeight = () => -0.65,
}: { worldSize?: number; groundHeight?: (x: number, z: number) => number } = {}) {
  const site = AIRSHIP_TERMINAL,
    state: AirshipState = {
      active: false,
      phase: 'ground',
      position: null,
      heading: 0,
      speed: 0,
      target: null,
    },
    home = { x: site.boarding.x + 0.5, y: site.base + 0.03, z: site.boarding.y + 0.5 };
  let gate = airportGate(worldSize),
    cruiseHeight = 28,
    entry: { x: number; y: number } | null = null;
  const inRect = (x: number, z: number, a: number, b: number, c: number, d: number) =>
    x >= a && x <= c && z >= b && z <= d;
  const terminal = AIRPORT_TERMINAL_BUILDING,
    airportObstacles = [
      [85.6, 103.3, 91, 108.5] satisfies [number, number, number, number],
      [84.7, 111.7, 90.2, 117] satisfies [number, number, number, number],
      [terminal.x, terminal.z, terminal.x + terminal.w, terminal.z + terminal.d] satisfies [
        number,
        number,
        number,
        number,
      ],
    ];
  const gates = () => [
    gate,
    { x: SECOND_STREET_X - 0.5, y: gate.y },
    ...(worldSize === WORLD_SIZE ? CITY_EDGE_GATES : []),
  ];
  function dryGround(x: number, z: number) {
    if (inBottleStream(x, z, 0.16)) return false;
    if (saltPondAt(x, z, 0.16) || inSouthernLake(x, z, 0.16)) return false;
    if (z >= worldSize && z <= SOUTHERN_BOUNDS.south && x < westernCoastX(z) + 0.16) return false;
    if (inPacificaPark(x, z)) return pacificaParkWalkable(x, z);
    if (researchCampusAt(x, z)) return researchCampusWalkable(x, z);
    if (gymAccess(x, z)) return gymWalkable(x, z);
    if (inTimesSquare(x, z)) return timesSquareWalkable(x, z);
    if (nightlifeAccess(x, z)) return nightlifeWalkable(x, z);
    const pier = SPACEPORT_PIER,
      pad = pier.pad;
    if (inSouthernHousePlot(x, z, 0.16)) return false;
    const land =
      x >= westernCoastX(z) + 0.16 &&
      x <= SOUTHERN_BOUNDS.east - 0.16 &&
      z >= worldSize &&
      z <= SOUTHERN_BOUNDS.south - 0.16;
    return (
      (land ||
        (z >= worldSize - 2.5 &&
          z < SOUTHERN_ROAD_END &&
          airportRoadDistance(x, z) <= TILE_CONFIG.curbWidth - 0.08) ||
        southernTrailDistance(x, z) <= -0.04 ||
        inRect(x, z, 80, 103.2, 94.6, 117.5) ||
        inRect(x, z, 82.4, 117.5, 94.6, 150.3) ||
        inRect(x, z, SECOND_STREET_X - 2.5, 128.7, SECOND_STREET_X + 2.5, 133) ||
        inRect(x, z, pier.west, pier.north, pier.east, pier.south) ||
        inRect(x, z, pad.west, pad.north, pad.east, pad.south)) &&
      !airportObstacles.some((p) => inRect(x, z, ...p)) &&
      Math.hypot(x - AIRPORT_SPACEPORT.x, z - AIRPORT_SPACEPORT.z) > 0.9
    );
  }
  const groundNavigation = createRegionalNavigation({
    north: worldSize - 2.625,
    south: SOUTHERN_BOUNDS.south + 0.625,
    walkable: dryGround,
  });
  const contains = (x: number, z: number) => groundNavigation.contains(x, z);
  const segment = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    groundNavigation.segment(a, b);
  function nearest(
    x: number,
    y: number,
    radius = 3,
    predicate: (value0: number, value1: number) => boolean = () => true,
  ) {
    let best: { x: number; y: number } | null = null,
      cost = Infinity;
    for (let iz = Math.floor((y - radius) * 4); iz <= Math.ceil((y + radius) * 4); iz++)
      for (let ix = Math.floor((x - radius) * 4); ix <= Math.ceil((x + radius) * 4); ix++) {
        const px = ix / 4,
          py = iz / 4,
          d = (px - x) ** 2 + (py - y) ** 2;
        if (d >= cost || d > radius ** 2 || !predicate(px, py) || !contains(px + 0.5, py + 0.5))
          continue;
        best = { x: px, y: py };
        cost = d;
      }
    return best;
  }
  const localPath = (
    from: Readonly<{ x: number; y: number }>,
    to: Readonly<{ x: number; y: number }>,
  ) => groundNavigation.path(from, to);
  function path(
    from: { x: number; y: number },
    to: { x: number; y: number },
    cityPath: (to: Point, from: Point) => Point[] | null,
  ) {
    const a = contains(from.x + 0.5, from.y + 0.5),
      b = contains(to.x + 0.5, to.y + 0.5);
    if (a && b) return localPath(from, to);
    if (!a && !b) return cityPath(to, from);
    let best = null,
      bestLength = Infinity;
    for (const entry of gates()) {
      const approach = b ? cityPath(entry, from) : localPath(from, entry),
        tail = b ? localPath(entry, to) : cityPath(to, entry);
      if (!approach || !tail) continue;
      const route = [...approach, ...tail];
      let length = 0,
        previous = from;
      for (const point of route) {
        length += Math.hypot(point.x - previous.x, point.y - previous.y);
        previous = point;
      }
      if (length < bestLength) {
        best = route;
        bestLength = length;
      }
    }
    return best;
  }
  function board(from: { x: number; y: number }) {
    if (state.active) return false;
    entry = { x: from.x, y: from.y };
    Object.assign(home, { x: from.x + 0.5, y: site.base + 0.03, z: from.y + 0.5 });
    Object.assign(state, {
      active: true,
      phase: 'ascending',
      position: { ...home },
      heading: -Math.PI / 2,
      speed: 0,
      target: null,
    });
    return true;
  }
  function flyTo(x: unknown, z: unknown) {
    if (!state.active || !isFiniteNumber(x) || !isFiniteNumber(z)) return false;
    state.target = { x, z };
    if (state.phase === 'descending') state.phase = 'ascending';
    else if (state.phase !== 'ascending') state.phase = 'flying';
    return true;
  }
  function returnHome() {
    if (!state.active) return false;
    state.phase =
      Math.hypot(state.position!.x - home.x, state.position!.z - home.z) < 0.03
        ? 'descending'
        : 'returning';
    state.target = { x: home.x, z: home.z };
    return true;
  }
  function cancel() {
    const back = state.active ? entry : null;
    Object.assign(state, {
      active: false,
      phase: 'ground',
      position: null,
      speed: 0,
      target: null,
    });
    entry = null;
    return back;
  }
  function stop() {
    if (!state.active || state.phase === 'descending') return false;
    if (state.phase === 'returning') state.phase = 'flying';
    state.target = null;
    state.speed = 0;
    return true;
  }
  function update(dt: number) {
    if (!state.active) return null;
    const p = state.position!;
    if (state.phase === 'ascending') {
      p.y = Math.min(
        cruiseHeight,
        p.y + Math.min(3, Math.max(0.7, (cruiseHeight - p.y) * 0.7)) * dt,
      );
      if (p.y >= cruiseHeight - 1e-6) {
        p.y = cruiseHeight;
        state.phase = 'flying';
        return 'cruising';
      }
      return null;
    }
    if (state.phase === 'descending') {
      const turn = Math.atan2(
        Math.sin(-Math.PI / 2 - state.heading),
        Math.cos(-Math.PI / 2 - state.heading),
      );
      state.heading += Math.max(-dt * 0.9, Math.min(dt * 0.9, turn));
      p.y = Math.max(home.y, p.y - Math.min(3, Math.max(0.7, (p.y - home.y) * 0.7)) * dt);
      if (p.y <= home.y + 1e-6) {
        cancel();
        return 'landed';
      }
      return null;
    }
    if (!state.target) {
      state.speed = Math.max(0, state.speed - dt * 3);
      return null;
    }
    const dx = state.target.x - p.x,
      dz = state.target.z - p.z,
      d = Math.hypot(dx, dz),
      desired = Math.min(8, Math.sqrt(d * 5));
    const ahead = Math.min(24, d),
      required = Math.max(
        cruiseHeight,
        groundHeight(p.x, p.z) + 8,
        groundHeight(p.x + (dx / (d || 1)) * ahead, p.z + (dz / (d || 1)) * ahead) + 8,
      );
    p.y += Math.max(-4 * dt, Math.min(4 * dt, required - p.y));
    const safeSpeed = p.y < required - 0.5 ? 0 : desired;
    state.speed += Math.max(-3 * dt, Math.min(3 * dt, safeSpeed - state.speed));
    const step = Math.min(d, (p.y < required - 0.5 ? 0 : Math.max(0.03, state.speed)) * dt);
    if (d > 1e-6) {
      p.x += (dx / d) * step;
      p.z += (dz / d) * step;
      const angle = Math.atan2(dz, dx),
        turn = Math.atan2(Math.sin(angle - state.heading), Math.cos(angle - state.heading));
      state.heading += Math.max(-dt * 0.9, Math.min(dt * 0.9, turn));
    }
    if (d - step < 1e-6) {
      p.x = state.target.x;
      p.z = state.target.z;
      state.speed = 0;
      if (Math.abs(p.y - required) > 0.1) return null;
      state.target = null;
      if (state.phase === 'returning') state.phase = 'descending';
      return 'arrived';
    }
    return null;
  }
  return {
    state,
    home,
    get gate() {
      return gate;
    },
    get gates() {
      return gates();
    },
    get cruiseHeight() {
      return cruiseHeight;
    },
    setGate: (p: { x: number; y: number }) => {
      gate = { ...p };
    },
    setCruiseHeight: (y: number) => {
      cruiseHeight = Math.max(20, y);
    },
    contains,
    segment,
    nearest,
    path,
    setObstacles: groundNavigation.setObstacles,
    groundNavigation,
    board,
    flyTo,
    returnHome,
    cancel,
    stop,
    update,
  };
}

function airshipMesh() {
  const m = new Mesh(),
    center = -1.2;
  m.sphere(center, 4.15, 0, 4.8, 1.38, 1.35, '#f5f6f3', 32, 16, { envelope: true });
  // Fabric seams and colored longitudinal bands follow the actual envelope.
  for (let seam = 0; seam < 12; seam++) {
    const a = (seam * Math.PI) / 6;
    let last: [number, number, number] | null = null;
    for (let j = 1; j < 32; j++) {
      const t = (j * Math.PI) / 32,
        p = [
          center + Math.cos(t) * 4.81,
          4.15 + Math.sin(t) * Math.cos(a) * 1.392,
          Math.sin(t) * Math.sin(a) * 1.362,
        ] satisfies [number, number, number];
      if (last) m.rod(last, p, 0.008, seam % 3 ? '#e2e5e2' : '#d7dddc', 4);
      last = p;
    }
  }
  for (const side of [-1, 1] satisfies [number, number]) {
    m.tri(
      [-4.4, 4.15, side * 0.4] satisfies [number, number, number],
      [-5.3, 4.15, side * 2] satisfies [number, number, number],
      [-6.2, 4.15, side * 0.1] satisfies [number, number, number],
      '#e7ece9',
      {
        metal: 0.12,
      },
    );
    m.tri(
      [-4.4, 4.25, 0] satisfies [number, number, number],
      [-5.35, 6.1, 0] satisfies [number, number, number],
      [-6.1, 4.2, 0] satisfies [number, number, number],
      '#e7ece9',
      { metal: 0.12 },
    );
    m.rod(
      [-3.2, 3.05, side * 0.9] satisfies [number, number, number],
      [-2.7, 0.79, side * 1.03] satisfies [number, number, number],
      0.018,
      '#bbc8d0',
      6,
    );
    m.rod(
      [0.8, 3.05, side * 0.9] satisfies [number, number, number],
      [0.3, 0.79, side * 1.03] satisfies [number, number, number],
      0.018,
      '#bbc8d0',
      6,
    );
    m.sphere(-1.7, 0.55, side * 1.35, 0.48, 0.2, 0.2, '#e9eef0', 16, 8, { metal: 0.18 });
    m.rod(
      [-1.7, 0.55, side * 1.48] satisfies [number, number, number],
      [-1.7, 0.55, side * 1.85] satisfies [number, number, number],
      0.025,
      '#aabac4',
      8,
    );
  }
  drawAirshipBasket(m);
  return m;
}
let cachedAirship: Mesh | null = null;
export function drawAirship(
  m: Mesh,
  position: WorldPoint & { y: number },
  angle: number,
  time: number,
  reduced = false,
) {
  cachedAirship ??= airshipMesh();
  pose(m, position.x, position.y, position.z, angle, () => {
    drawCachedMesh(m, 'airship-hull', (mesh) => {
      for (const value of cachedAirship!.data) mesh.data.push(value);
    });
    for (const side of [-1, 1] satisfies [number, number])
      for (let blade = 0; blade < 3; blade++) {
        const a = (reduced ? 0 : time * 0.013) + (blade * Math.PI * 2) / 3;
        m.rod(
          [-1.7 + Math.cos(a) * 0.36, 0.55 + Math.sin(a) * 0.36, side * 1.86] satisfies [
            number,
            number,
            number,
          ],
          [-1.7 - Math.cos(a) * 0.36, 0.55 - Math.sin(a) * 0.36, side * 1.86] satisfies [
            number,
            number,
            number,
          ],
          0.026,
          '#607782',
          6,
        );
      }
  });
}

function privateJet(m: Mesh, x: number, z: number, angle: number) {
  pose(m, x, 1.55, z, angle, () => {
    m.sphere(0, 0.55, 0, 2.35, 0.31, 0.32, '#e0e2d6', 24, 12, { metal: 0.12 });
    for (const side of [-1, 1] satisfies [number, number]) {
      m.tri(
        [0.4, 0.48, side * 0.1] satisfies [number, number, number],
        [-1.2, 0.42, side * 2.5] satisfies [number, number, number],
        [-1.45, 0.45, side * 0.1] satisfies [number, number, number],
        '#d1d9cf',
        { metal: 0.12 },
      );
      m.tri(
        [-1.5, 0.65, side * 0.08] satisfies [number, number, number],
        [-2.1, 0.8, side * 1] satisfies [number, number, number],
        [-2.25, 0.68, side * 0.05] satisfies [number, number, number],
        '#8ba19b',
        { metal: 0.12 },
      );
      m.sphere(-1.4, 0.61, side * 0.43, 0.49, 0.17, 0.17, '#bac8c1', 16, 8, { metal: 0.12 });
      for (let i = 0; i < 7; i++)
        m.sphere(
          -1.05 + i * 0.36,
          0.64,
          side * 0.304,
          0.07,
          0.085,
          0.012,
          '#557880',
          12,
          6,
          'glass',
        );
      m.rod(
        [-0.8, 0.2, side * 0.4] satisfies [number, number, number],
        [-0.8, -0.34, side * 0.4] satisfies [number, number, number],
        0.025,
        '#6b7b74',
        6,
      );
      m.sphere(-0.8, -0.32, side * 0.43, 0.13, 0.13, 0.055, '#384441', 12, 6);
    }
    m.tri(
      [-1.3, 0.72, 0] satisfies [number, number, number],
      [-2.3, 1.8, 0] satisfies [number, number, number],
      [-2.27, 0.66, 0] satisfies [number, number, number],
      '#6f908b',
      { metal: 0.12 },
    );
    m.rod(
      [1.5, 0.25, 0] satisfies [number, number, number],
      [1.5, -0.34, 0] satisfies [number, number, number],
      0.022,
      '#6b7b74',
      6,
    );
    m.sphere(1.5, -0.31, 0, 0.11, 0.11, 0.055, '#384441', 12, 6);
  });
}

export function drawAirportRoad(
  m: Mesh,
  worldSize = WORLD_SIZE,
  groundHeight: (x: number, z: number) => number = () => AIRSHIP_TERMINAL.base,
) {
  const end = SOUTHERN_ROAD_END;
  const flatPaving = new Map<string, AirportPaving[]>();
  // Join flat, collinear curb faces without changing their tile boundaries
  // or heights. The longer gym and Sand Hill routes need no extra draw cost
  // for dozens of identical quarter-tile faces along a level block.
  const flatCurbs = new Map<string, AirportCurb[]>(),
    curb = (a: number[], b: number[], A: number[], B: number[]) => {
      const axis = Math.abs(a[0] - b[0]) < 1e-9 ? 2 : Math.abs(a[2] - b[2]) < 1e-9 ? 0 : -1;
      if (axis < 0) {
        m.quad(a, b, B, A, '#aaa58f');
        return;
      }
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < 1e-10) return;
      const slope = (b[1] - a[1]) / delta;
      if (Math.abs((B[1] - A[1]) / delta - slope) > 1e-9) {
        m.quad(a, b, B, A, '#aaa58f');
        return;
      }
      const sign = delta > 0 ? 1 : -1,
        key = [axis, a[axis === 0 ? 2 : 0], slope, a[1] - slope * a[axis], A[1] - a[1], sign]
          .map((v) => v.toFixed(9))
          .join(',');
      if (!flatCurbs.has(key)) flatCurbs.set(key, []);
      flatCurbs
        .get(key)!
        .push(sign > 0 ? { a, b, A, B, axis, sign } : { a: b, b: a, A: B, B: A, axis, sign });
    };
  const roadTiles = airportRoadTiles(worldSize),
    tileLookup = new Map(
      roadTiles.map((t) => [Math.round(t.x * 4) + ',' + Math.round(t.z * 4), t]),
    ),
    consumed = new Set();
  for (const { x, z, step, tile } of roadTiles) {
    const ix = Math.round(x * 4),
      iz = Math.round(z * 4),
      key = ix + ',' + iz;
    if (consumed.has(key)) continue;
    // Four uniform quarter-tiles can share the terrain's exact half-tile
    // diagonal. This removes redundant vertices without approximating hills.
    if (
      ix % 2 === 0 &&
      iz % 2 === 0 &&
      !tile.patches &&
      (['road', 'path'] satisfies [string, string]).includes(tile.type)
    ) {
      const keys = [
        key,
        ix + 1 + ',' + iz,
        ix + ',' + (iz + 1),
        ix + 1 + ',' + (iz + 1),
      ] satisfies [string, string, string, string];
      if (
        keys.every((k) => {
          const t = tileLookup.get(k);
          return t && !t.tile.patches && t.tile.type === tile.type;
        }) &&
        z + step * 2 <= end
      ) {
        const material = TILE_TYPES[tile.type],
          at = (xx: number, zz: number) => [xx, groundHeight(xx, zz) + material.height, zz];
        const corners = [
          at(x, z),
          at(x, z + step * 2),
          at(x + step * 2, z + step * 2),
          at(x + step * 2, z),
        ];
        if (corners.some((p) => Math.abs(p[1] - corners[0][1]) > 1e-10)) {
          m.quad(corners[0], corners[1], corners[2], corners[3], material.color, material.texture);
          for (const k of keys) consumed.add(k);
          continue;
        }
      }
    }
    const patches = tile.patches || [
      {
        type: tile.type,
        polygon: [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      },
    ];
    for (const patch of patches) {
      if (!(['road', 'path', 'sidewalk'] satisfies [string, string, string]).includes(patch.type))
        continue;
      const polygon = clipTilePolygon(patch.polygon, 1, (end - z) / step, true),
        material = TILE_TYPES[patch.type];
      const points = polygon.map((p) => {
        const xx = x + p[0] * step,
          zz = z + p[1] * step;
        return [xx, groundHeight(xx, zz) + material.height, zz];
      });
      const xs = points.map((p) => p[0]),
        zs = points.map((p) => p[2]),
        west = Math.min(...xs),
        east = Math.max(...xs),
        north = Math.min(...zs),
        south = Math.max(...zs);
      const rectangle =
        points.length === 4 &&
        points.every(
          (p) =>
            (Math.abs(p[0] - west) < 1e-10 || Math.abs(p[0] - east) < 1e-10) &&
            (Math.abs(p[2] - north) < 1e-10 || Math.abs(p[2] - south) < 1e-10) &&
            Math.abs(p[1] - points[0][1]) < 1e-10,
        );
      if (rectangle) {
        // Merge only coplanar rectangles. Slopes, curves, intersections,
        // and their exact material boundaries retain their triangles.
        const key = [patch.type, north.toFixed(9), south.toFixed(9), points[0][1].toFixed(9)].join(
          ',',
        );
        if (!flatPaving.has(key)) flatPaving.set(key, []);
        flatPaving.get(key)!.push({ west, east, north, south, height: points[0][1], material });
      } else
        for (let i = 1; i < points.length - 1; i++)
          m.tri(points[0], points[i + 1], points[i], material.color, material.texture);
      if (patch.type === 'sidewalk')
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i],
            b = polygon[(i + 1) % polygon.length],
            inner =
              (Math.abs(a[2]) < 1e-7 && Math.abs(b[2]) < 1e-7) ||
              (Math.abs(a[3]) < 1e-7 && Math.abs(b[3]) < 1e-7),
            outer =
              Math.abs(a[4] - TILE_CONFIG.curbWidth) < 1e-7 &&
              Math.abs(b[4] - TILE_CONFIG.curbWidth) < 1e-7;
          if (!inner && !outer) continue;
          const bottom = inner ? TILE_TYPES.road.height : 0,
            p = points[i],
            q = points[(i + 1) % points.length];
          curb(
            [p[0], groundHeight(p[0], p[2]) + bottom, p[2]],
            [q[0], groundHeight(q[0], q[2]) + bottom, q[2]],
            p,
            q,
          );
        }
    }
  }
  const pavingColumns = new Map<string, AirportPaving[]>();
  for (const strips of flatPaving.values()) {
    strips.sort((a: { west: number }, b: { west: number }) => a.west - b.west);
    const merged: AirportPaving[] = [];
    for (const strip of strips) {
      const last = merged.at(-1);
      if (last && Math.abs(last.east - strip.west) < 1e-10) last.east = strip.east;
      else merged.push({ ...strip });
    }
    for (const p of merged) {
      const key = [
        p.west.toFixed(9),
        p.east.toFixed(9),
        p.height.toFixed(9),
        p.material.color,
        p.material.texture,
      ].join(',');
      if (!pavingColumns.has(key)) pavingColumns.set(key, []);
      pavingColumns.get(key)!.push(p);
    }
  }
  // Flat runs can also share a quad along the street, keeping every material
  // edge and height while avoiding a new pair of triangles every quarter tile.
  for (const column of pavingColumns.values()) {
    column.sort((a: { north: number }, b: { north: number }) => a.north - b.north);
    const merged: AirportPaving[] = [];
    for (const p of column) {
      const last = merged.at(-1);
      if (last && Math.abs(last.south - p.north) < 1e-10) last.south = p.south;
      else merged.push({ ...p });
    }
    for (const p of merged)
      m.quad(
        [p.west, p.height, p.north],
        [p.west, p.height, p.south],
        [p.east, p.height, p.south],
        [p.east, p.height, p.north],
        p.material.color,
        p.material.texture,
      );
  }
  for (const edges of flatCurbs.values()) {
    edges.sort((a, b) => a.a[a.axis] - b.a[b.axis]);
    const merged: AirportCurb[] = [];
    for (const edge of edges) {
      const last = merged.at(-1);
      if (last && Math.hypot(...last.b.map((v, i) => v - edge.a[i])) < 1e-10) {
        last.b = edge.b;
        last.B = edge.B;
      } else merged.push({ ...edge });
    }
    for (const e of merged)
      if (e.sign > 0) m.quad(e.a, e.b, e.B, e.A, '#aaa58f');
      else m.quad(e.b, e.a, e.A, e.B, '#aaa58f');
  }
}

export function drawAirshipTerminal(
  m: Mesh,
  groundHeight: (x: number, z: number) => number = () => AIRSHIP_TERMINAL.base,
  signs: SignAtlas = new Map(),
) {
  const s = AIRSHIP_TERMINAL;
  drawAirportRoad(m, WORLD_SIZE, groundHeight);
  const runway = AIRPORT_RUNWAY;
  // One continuous reclaimed apron; no L-shaped water cutout between jets
  // and the southbound runway. The threshold sits directly below the jets.
  m.box(82.4, -0.15, 103.2, 12.4, s.base + 0.15, 47.3, '#a3aaa0', 'concrete');
  m.box(82.4, s.base + 0.001, 103.2, 12.4, 0.006, 47.3, '#949a8e', 'concrete');
  const pier = SPACEPORT_PIER,
    pad = pier.pad;
  for (const [x, z, w, d] of [
    [pier.west, pier.north, pier.east - pier.west, pier.south - pier.north] satisfies [
      number,
      number,
      number,
      number,
    ],
    [pad.west, pad.north, pad.east - pad.west, pad.south - pad.north] satisfies [
      number,
      number,
      number,
      number,
    ],
  ]) {
    m.box(x, -0.3, z, w, s.base + 0.3, d, '#8e9e9c', 'concrete');
    m.box(x, s.base + 0.002, z, w, 0.006, d, '#b2b8ab', 'concrete');
    for (const xx of [x + 0.3, x + w - 0.3] satisfies [number, number])
      for (let zz = z + 0.3; zz < z + d; zz += 2)
        m.cylinder(xx, -0.7, zz, 0.12, 1.1, '#536e70', 12, 0.14, 'concrete');
  }
  for (const zz of [pier.north, pier.south] satisfies [number, number]) {
    m.rod([pier.west, s.base + 0.55, zz], [pad.west, s.base + 0.55, zz], 0.025, '#b9c9c2', 8);
    for (let xx = pier.west; xx < pad.west; xx += 1.2)
      m.rod([xx, s.base, zz], [xx, s.base + 0.6, zz], 0.02, '#829d99', 8);
  }
  for (const zz of [pad.north, pad.south] satisfies [number, number])
    m.rod(
      [pad.west, s.base + 0.5, zz] satisfies [number, number, number],
      [pad.east, s.base + 0.5, zz] satisfies [number, number, number],
      0.025,
      '#c4d0c7',
      8,
    );
  m.rod(
    [pad.east, s.base + 0.5, pad.north] satisfies [number, number, number],
    [pad.east, s.base + 0.5, pad.south] satisfies [number, number, number],
    0.025,
    '#c4d0c7',
    8,
  );
  m.box(
    runway.x,
    s.base + 0.055,
    runway.z,
    runway.width,
    0.018,
    runway.depth,
    '#717d79',
    'asphalt',
  );
  for (let z = runway.z + 1; z < runway.z + runway.depth; z += 2)
    m.box(runway.x + runway.width / 2 - 0.06, s.base + 0.075, z, 0.12, 0.005, 0.9, '#dedbcc');
  for (const z of [runway.z + 0.4, runway.z + runway.depth - 1.3] satisfies [number, number])
    for (let j = 0; j < 5; j++)
      m.box(runway.x + 0.3 + j * 0.6, s.base + 0.075, z, 0.2, 0.005, 0.8, '#dedbcc');
  const start = m.data.length,
    b = AIRPORT_TERMINAL_BUILDING;
  // The existing eastern hangar becomes the passenger terminal, retaining
  // its service bay beside the runway and gaining a north-facing entrance.
  m.box(b.x, s.base, b.z, b.w, 2.1, b.d, '#c0c4b6', 'stucco');
  for (let j = 0; j < 10; j++)
    m.box(b.x - 0.025, s.base + 0.08, b.z + 2.6 + j * 0.26, 0.025, 1.78, 0.035, '#788c81');
  for (let j = 0; j < 3; j++)
    drawFacadeWindow(m, {
      isX: true,
      far: true,
      plane: b.x - 0.012,
      along: b.z + 0.35 + j * 0.7,
      y: s.base + 0.48,
      w: 0.52,
      h: 0.95,
      style: 'office',
      seed: 74 + j,
    });
  m.box(b.x - 0.1, s.base + 2.1, b.z - 0.1, b.w + 0.2, 0.12, b.d + 0.2, '#889b8d', 'roof');
  for (const x of [b.x + 0.4, b.x + 2.85] satisfies [number, number])
    drawFacadeWindow(m, {
      far: true,
      plane: b.z - 0.012,
      along: x,
      y: s.base + 0.4,
      w: 0.75,
      h: 1.1,
      style: 'storefront',
      seed: x,
    });
  m.box(s.x - 0.5, s.base + 0.03, b.z - 0.045, 1, 1.65, 0.035, '#527e83', 'glass');
  m.box(s.x - 0.018, s.base + 0.03, b.z - 0.065, 0.036, 1.65, 0.025, '#cbd4c8');
  for (const x of [s.x - 0.13, s.x + 0.13] satisfies [number, number])
    m.rod(
      [x, s.base + 0.72, b.z - 0.08] satisfies [number, number, number],
      [x, s.base + 0.96, b.z - 0.08] satisfies [number, number, number],
      0.015,
      '#b8c9be',
      8,
      {
        metal: 0.35,
      },
    );
  m.box(s.x - 1.05, s.base + 2.19, b.z - 0.07, 2.1, 0.38, 0.035, '#3f5f62');
  const terminalUV = signs.get('PRIVATE JET TERMINAL');
  if (terminalUV)
    m.quad(
      [s.x + 1, s.base + 2.24, b.z - 0.11] satisfies [number, number, number],
      [s.x - 1, s.base + 2.24, b.z - 0.11] satisfies [number, number, number],
      [s.x - 1, s.base + 2.52, b.z - 0.11] satisfies [number, number, number],
      [s.x + 1, s.base + 2.52, b.z - 0.11] satisfies [number, number, number],
      '#ffffff',
      terminalUV,
    );
  m.box(s.x - 1.2, s.base + 1.96, b.z - 0.7, 2.4, 0.1, 0.72, '#a7bdb4', { metal: 0.15 });
  for (const x of [s.x - 1.08, s.x + 1.08] satisfies [number, number])
    m.cylinder(x, s.base, b.z - 0.59, 0.035, 1.96, '#81998c', 12);
  const end = m.data.length,
    lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < end; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  pose(m, 15.2, 0, 0, 0, () => {
    privateJet(m, 72.3, 114.3, -Math.PI / 2);
    privateJet(m, 73.1, 105.9, -Math.PI / 2);
    for (const z of [105.3, 116.8] satisfies [number, number])
      for (const x of [66.3, 77.8] satisfies [number, number]) {
        m.cylinder(x, s.base, z, 0.035, 1.65, '#7b9182', 10);
        m.sphere(x, s.base + 1.67, z, 0.075, 0.09, 0.075, '#c4d5bf', 12, 8, { emissive: 0.25 });
      }
  });
  // The rental mooring sits north of the new entrance, clear of the runway,
  // parked aircraft, passenger canopy and spaceport pier.
  const mooring = { x: s.boarding.x + 0.5, z: s.boarding.y + 0.5 };
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI) / 16,
      b = ((i + 1) * Math.PI) / 16;
    m.rod(
      [mooring.x + Math.cos(a) * 1.1, s.base + 0.058, mooring.z + Math.sin(a) * 1.1] satisfies [
        number,
        number,
        number,
      ],
      [mooring.x + Math.cos(b) * 1.1, s.base + 0.058, mooring.z + Math.sin(b) * 1.1] satisfies [
        number,
        number,
        number,
      ],
      0.022,
      '#cfbd83',
      4,
    );
  }
  m.cylinder(mooring.x - 1.25, s.base, mooring.z, 0.09, 0.7, '#8ba193', 16);
  m.sphere(mooring.x - 1.25, s.base + 0.73, mooring.z, 0.14, 0.14, 0.14, '#b3bfac', 16, 8, {
    metal: 0.12,
  });
  return { start, end, lo, hi };
}
