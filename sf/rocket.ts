import type { WorldPoint, Point } from './types/geometry.ts';
export interface RocketSite extends WorldPoint {
  base: number;
  entry: Point;
}
interface RocketPose {
  mode: string;
  motion: number;
  angle: number;
  phase: number;
  stage: string;
}
export interface RocketState {
  active: boolean;
  phase: string;
  elapsed: number;
  from: RocketSite | null;
  to: RocketSite | null;
  entry: (WorldPoint & { y: number }) | null;
  position: (WorldPoint & { y: number }) | null;
  vehicle: (WorldPoint & { y: number }) | null;
  thrust: number;
  pose: RocketPose | null;
  hatch: number;
  occupied: boolean;
  pitch: number;
  heading: number;
}
import type { SignAtlas } from './types/world.ts';
import { drawCachedMesh } from './rendering/cached-mesh.ts';
import { pitchAroundPoint, transformMeshRange } from './rendering/mesh-transform.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export const ROCKET_CABIN_HEIGHT = 4.7;
export const ROCKET_CRUISE_SECONDS = 24;
// Smoothstep reaches 1.5 times its average speed midway through the flight.
export function rocketCruiseSpeed(from: WorldPoint, to: WorldPoint) {
  return (Math.hypot(to.x - from.x, to.z - from.z) * 1.5) / ROCKET_CRUISE_SECONDS;
}
// Rotate around the rider's visual center, which is also the camera target.
// The hull and rider share this frame; rotating cannot displace the avatar.
export const ROCKET_RIDER_CENTER = 0.9;
export function rocketFlightPoint(
  point: WorldPoint & { y: number },
  vehicle: WorldPoint & { y: number },
  { pitch = 0, heading = 0 }: { pitch?: number; heading?: number } = {},
) {
  const pivot = vehicle.y + ROCKET_CABIN_HEIGHT + ROCKET_RIDER_CENTER,
    c = Math.cos(pitch),
    s = Math.sin(pitch),
    hx = Math.cos(heading),
    hz = Math.sin(heading);
  const x = point.x - vehicle.x,
    y = point.y - pivot,
    z = point.z - vehicle.z,
    forward = x * hx + z * hz,
    side = -x * hz + z * hx,
    tilted = forward * c + y * s;
  return {
    x: vehicle.x + tilted * hx - side * hz,
    y: pivot + y * c - forward * s,
    z: vehicle.z + tilted * hz + side * hx,
  };
}
export function tiltRocketMesh(
  mesh: Mesh,
  start: number,
  vehicle: WorldPoint & { y: number },
  { pitch = 0, heading = 0 }: { pitch?: number; heading?: number } = {},
) {
  if (!pitch) return;
  const pivot = vehicle.y + ROCKET_CABIN_HEIGHT + ROCKET_RIDER_CENTER;
  transformMeshRange(mesh, start, pitchAroundPoint(vehicle.x, pivot, vehicle.z, heading, pitch));
}
const rocketEase = (t: number) => t * t * (3 - 2 * t),
  rocketLerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rocketClamp = (t: number) => Math.max(0, Math.min(1, t));
// The pad mesh and the rider share these measurements. The ladder is outside
// the hull; only the final, level step passes through the north-facing hatch.
export const ROCKET_ACCESS = Object.freeze({
  ladderZ: -1.04,
  riderZ: -1.3,
  halfWidth: 0.24,
  rungSpacing: 0.28,
  walk: 0.8,
  grip: 0.25,
  climb: 4.2,
  enter: 0.8,
  seal: 0.45,
});
const rocketBoardingDuration =
  ROCKET_ACCESS.walk +
  ROCKET_ACCESS.grip +
  ROCKET_ACCESS.climb +
  ROCKET_ACCESS.enter +
  ROCKET_ACCESS.seal;
const rocketDurations = {
  boarding: rocketBoardingDuration,
  ascending: 6,
  cruising: ROCKET_CRUISE_SECONDS,
  descending: 6,
  disembarking: rocketBoardingDuration,
};

function rocketAccessPose(
  site: RocketSite,
  elapsed: number,
  descending = false,
  start: (WorldPoint & { y: number }) | null = null,
) {
  const a = ROCKET_ACCESS,
    t = rocketClamp(elapsed / rocketBoardingDuration) * rocketBoardingDuration;
  const entry = start || { x: site.entry.x + 0.5, y: site.base + 0.04, z: site.entry.y + 0.5 },
    foot = { x: site.x, y: site.base + 0.04, z: site.z + a.riderZ },
    top = { ...foot, y: site.base + 0.14 + ROCKET_CABIN_HEIGHT };
  const along = (p: WorldPoint & { y: number }, q: WorldPoint & { y: number }, f: number) => ({
    x: rocketLerp(p.x, q.x, f),
    y: rocketLerp(p.y, q.y, f),
    z: rocketLerp(p.z, q.z, f),
  });
  const walkEnd = a.walk,
    gripEnd = walkEnd + a.grip,
    climbEnd = gripEnd + a.climb,
    enterEnd = climbEnd + a.enter;
  let position,
    mode = 'idle',
    motion = 0,
    angle = Math.PI / 2,
    phase = 0,
    stage,
    hatch = 1,
    occupied = false;
  if (t < walkEnd) {
    const f = rocketEase(t / a.walk),
      distance = Math.hypot(foot.x - entry.x, foot.z - entry.z);
    position = along(entry, foot, f);
    mode = 'move';
    motion = Math.sin(Math.PI * f);
    stage = 'approach';
    hatch = rocketEase(t / a.walk);
    angle = Math.atan2(foot.z - entry.z, foot.x - entry.x) + (descending ? Math.PI : 0);
    phase = (distance * f * Math.PI * 2) / 0.92;
  } else if (t < gripEnd) {
    position = { ...foot };
    mode = 'climb';
    motion = rocketEase((t - walkEnd) / a.grip);
    stage = 'grip';
  } else if (t < climbEnd) {
    const f = (t - gripEnd) / a.climb,
      lift = rocketEase(f);
    position = along(foot, top, lift);
    mode = 'climb';
    motion = rocketEase(rocketClamp((1 - f) / 0.065));
    stage = 'ladder';
    // One full limb cycle per two rungs. Reversing the route reverses the
    // same contacts, rather than playing a walking loop while descending.
    phase = ((position.y - foot.y) * Math.PI * 2) / (a.rungSpacing * 2);
  } else if (t < enterEnd) {
    const f = rocketEase((t - climbEnd) / a.enter);
    position = along(top, { ...top, z: site.z }, f);
    mode = 'move';
    motion = Math.sin(Math.PI * f);
    stage = 'hatch';
    occupied = f > 0.45;
    angle = descending ? -Math.PI / 2 : Math.PI / 2;
    phase = (Math.abs(a.riderZ) * f * Math.PI * 2) / 0.92;
  } else {
    position = { x: site.x, y: top.y, z: site.z };
    stage = 'seal';
    hatch = 1 - rocketEase((t - enterEnd) / a.seal);
    occupied = true;
  }
  return { position, pose: { mode, motion, angle, phase, stage }, hatch, occupied };
}

/** A reusable shuttle physically follows the regional coordinates. The rider
 * occupies an open viewing cabin; the camera stays anchored to the rider. */
export function createRocketTravel({
  groundHeight = () => 0,
}: { groundHeight?: (x: number, z: number) => number } = {}) {
  const state: RocketState = {
    active: false,
    phase: 'ground',
    elapsed: 0,
    from: null,
    to: null,
    entry: null,
    position: null,
    vehicle: null,
    thrust: 0,
    pose: null as {
      mode: string;
      motion: number;
      angle: number;
      phase: number;
      stage: string;
    } | null,
    hatch: 0,
    occupied: false,
    pitch: 0,
    heading: 0,
  };
  const durations = rocketDurations;
  function start(
    from: RocketSite,
    to: RocketSite,
    entry: (WorldPoint & { y: number }) | null = null,
  ) {
    if (state.active) return false;
    state.entry = entry ? { x: entry.x, y: entry.y, z: entry.z } : null;
    const access = rocketAccessPose(from, 0, false, state.entry);
    Object.assign(state, {
      active: true,
      phase: 'boarding',
      elapsed: 0,
      from,
      to,
      ...access,
      vehicle: { x: from.x, y: from.base + 0.14, z: from.z },
      thrust: 0,
      pitch: 0,
      heading: Math.atan2(to.z - from.z, to.x - from.x),
    });
    return true;
  }
  function update(dt: number) {
    if (!state.active) return null;
    let remaining = Math.max(0, dt);
    while (state.active) {
      const duration = durations[state.phase as keyof typeof durations],
        step = Math.min(remaining, duration - state.elapsed);
      state.elapsed += step;
      remaining -= step;
      const f = rocketEase(state.elapsed / duration),
        a = state.from!,
        b = state.to!,
        cabin = ROCKET_CABIN_HEIGHT,
        baseA = a.base + 0.14,
        baseB = b.base + 0.14;
      if (state.phase === 'boarding') {
        Object.assign(state, rocketAccessPose(a, state.elapsed, false, state.entry));
        state.pitch = 0;
      } else if (state.phase === 'disembarking') {
        Object.assign(state, rocketAccessPose(b, duration - state.elapsed, true));
        state.pitch = 0;
      } else {
        let x = a.x,
          z = a.z,
          y = baseA;
        if (state.phase === 'ascending') y = rocketLerp(baseA, baseA + 120, f);
        if (state.phase === 'cruising') {
          x = rocketLerp(a.x, b.x, f);
          z = rocketLerp(a.z, b.z, f);
          y = Math.max(
            groundHeight(x, z) + 14,
            rocketLerp(baseA, baseB, f) + 120 + Math.sin(Math.PI * f) * 240,
          );
        }
        if (state.phase === 'descending') {
          x = b.x;
          z = b.z;
          y = rocketLerp(baseB + 120, baseB, f);
        }
        const progress = state.elapsed / duration;
        state.pitch =
          state.phase === 'ascending'
            ? (Math.PI / 2) * rocketEase(rocketClamp((progress - 0.5) / 0.5))
            : state.phase === 'cruising'
              ? (Math.PI / 2) * (1 - rocketEase(rocketClamp((progress - 0.85) / 0.15)))
              : 0;
        state.vehicle = { x, y, z };
        state.position = { x, y: y + cabin, z };
        state.pose = { mode: 'idle', motion: 0, angle: Math.PI / 2, phase: 0, stage: 'cabin' };
        state.hatch = 0;
        state.occupied = true;
      }
      state.thrust =
        state.phase === 'ascending'
          ? 1
          : state.phase === 'descending'
            ? 0.6
            : state.phase === 'cruising'
              ? 0.35
              : 0;
      if (state.elapsed < duration) return null;
      const phases = Object.keys(durations),
        next = phases[phases.indexOf(state.phase) + 1];
      if (!next) {
        state.active = false;
        state.phase = 'ground';
        state.thrust = 0;
        state.pose!.motion = 0;
        state.hatch = 0;
        state.occupied = false;
        state.position = { x: b.entry.x + 0.5, y: b.base + 0.04, z: b.entry.y + 0.5 };
        return 'arrived';
      }
      state.phase = next;
      state.elapsed = 0;
      if (!remaining) return null;
    }
    return null;
  }
  function cancel() {
    state.active = false;
    state.phase = 'ground';
    state.entry = null;
    state.position = null;
    state.vehicle = null;
    state.thrust = 0;
    state.pose = null;
    state.hatch = 0;
    state.occupied = false;
    state.pitch = 0;
    state.heading = 0;
  }
  return {
    state,
    start,
    update,
    cancel,
    duration: Object.values(durations).reduce((a, b) => a + b, 0),
  };
}

/** Render a single frame on the server's journey timeline. Sampling the same
 * curve for the hull and rider preserves ladder contacts and cabin alignment;
 * interpolating their positions independently cannot do that at 5/10 Hz.
 * This copy never advances authoritative travel or completes a journey. */
export function sampleRocketPresentation(
  snapshot: RocketState | null,
  offset = 0,
  groundHeight: (x: number, z: number) => number = () => 0,
) {
  if (!snapshot?.active) return null;
  let elapsed = snapshot.elapsed;
  for (const [phase, duration] of Object.entries(rocketDurations)) {
    if (phase === snapshot.phase) break;
    elapsed += duration;
  }
  const visual = createRocketTravel({ groundHeight });
  visual.start(snapshot.from!, snapshot.to!, snapshot.entry);
  visual.update(Math.max(0, Math.min(visual.duration - 1e-6, elapsed + offset)));
  return visual.state;
}

export function drawRocketPad(m: Mesh, site: RocketSite, signs: SignAtlas) {
  const { x, z, base } = site,
    start = m.data.length;
  m.cylinder(x, base, z, 2.5, 0.12, '#8d9997', 48, 2.5, 'concrete');
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      b = ((i + 1) * Math.PI) / 24;
    m.rod(
      [x + Math.cos(a) * 2.1, base + 0.14, z + Math.sin(a) * 2.1] satisfies [
        number,
        number,
        number,
      ],
      [x + Math.cos(b) * 2.1, base + 0.14, z + Math.sin(b) * 2.1] satisfies [
        number,
        number,
        number,
      ],
      0.025,
      '#dedaca',
      4,
    );
  }
  for (const side of [-1, 1] satisfies [number, number])
    m.box(x + side * 0.6 - 0.05, base + 0.125, z - 0.8, 0.1, 0.008, 1.6, '#e7e6d8');
  m.box(x - 0.6, base + 0.125, z - 0.05, 1.2, 0.008, 0.1, '#e7e6d8');
  m.box(x + 2.1, base, z - 0.5, 0.3, 6.3, 0.3, '#71868a', { metal: 0.25 });
  for (let i = 0; i < 6; i++) {
    m.rod(
      [x + 2.1, base + i, z - 0.5] satisfies [number, number, number],
      [x + 2.4, base + i + 1, z - 0.2] satisfies [number, number, number],
      0.02,
      '#a7b5b4',
      5,
    );
    m.rod(
      [x + 2.1, base + i + 1, z - 0.5] satisfies [number, number, number],
      [x + 2.4, base + i, z - 0.2] satisfies [number, number, number],
      0.02,
      '#a7b5b4',
      5,
    );
  }
  m.box(x + 1.0, base + 5.4, z - 0.45, 1.25, 0.12, 0.25, '#b0bcb7', { metal: 0.2 });
  const access = ROCKET_ACCESS,
    landing = base + 0.14 + ROCKET_CABIN_HEIGHT,
    ladder = z + access.ladderZ;
  // A bolted service ladder and landing replace the unsupported diagonal
  // stair treads. The open handrail extensions leave room to step aboard.
  for (const side of [-1, 1] satisfies [number, number]) {
    m.rod(
      [x + side * access.halfWidth, base + 0.06, ladder] satisfies [number, number, number],
      [x + side * access.halfWidth, landing + 1.55, ladder] satisfies [number, number, number],
      0.032,
      '#b6c2bf',
      10,
      { metal: 0.25 },
    );
    m.rod(
      [x + side * 0.5, landing, z - 1.12] satisfies [number, number, number],
      [x + side * 0.5, landing + 1.02, z - 1.12] satisfies [number, number, number],
      0.026,
      '#aab9b6',
      8,
    );
    for (const y of [0.55, 1.02] satisfies [number, number])
      m.rod(
        [x + side * 0.5, landing + y, z - 1.12] satisfies [number, number, number],
        [x + side * 0.5, landing + y, z - 0.56] satisfies [number, number, number],
        0.022,
        '#b9c7c0',
        8,
      );
    for (const y of [0.5, 2.1, 3.7] satisfies [number, number, number])
      m.rod(
        [x + side * access.halfWidth, base + y, ladder] satisfies [number, number, number],
        [x + side * access.halfWidth, base + y, z - 0.64] satisfies [number, number, number],
        0.022,
        '#7e9292',
        8,
      );
  }
  for (let y = base + 0.147; y < landing - 0.1; y += access.rungSpacing)
    m.rod(
      [x - access.halfWidth, y, ladder] satisfies [number, number, number],
      [x + access.halfWidth, y, ladder] satisfies [number, number, number],
      0.024,
      '#d2d8c9',
      10,
      { metal: 0.2 },
    );
  m.box(x - 0.49, landing - 0.09, z - 1.12, 0.98, 0.09, 0.58, '#8c9d99', { metal: 0.2 });
  for (let i = 0; i < 8; i++)
    m.box(x - 0.46 + i * 0.125, landing + 0.004, z - 1.1, 0.012, 0.008, 0.55, '#c1cbc3');
  m.box(x - 0.34, base + 0.008, z - 1.59, 0.68, 0.018, 0.53, '#cfbb72', 'concrete');
  const uv = signs.get('SPACEX · 1 COIN');
  if (uv) {
    m.box(x - 2.35, base, z - 2.8, 0.07, 1.5, 0.07, '#829390');
    m.quad(
      [x - 0.05, base + 1.1, z - 2.83] satisfies [number, number, number],
      [x - 2.8, base + 1.1, z - 2.83] satisfies [number, number, number],
      [x - 2.8, base + 1.5, z - 2.83] satisfies [number, number, number],
      [x - 0.05, base + 1.5, z - 2.83] satisfies [number, number, number],
      '#ffffff',
      uv,
    );
  }
  return {
    start,
    count: m.data.length - start,
    lo: [x - 2.8, base, z - 2.95] satisfies [number, number, number],
    hi: [x + 2.5, base + 8.5, z + 2.5] satisfies [number, number, number],
  };
}

export function drawReusableRocket(
  m: Mesh,
  position: WorldPoint & { y: number },
  time: number,
  {
    occupied = false,
    cameraAngle = 0,
    cameraPosition = null,
    thrust = 0,
    hatch = 0,
    pitch = 0,
    heading = 0,
  }: {
    occupied?: boolean;
    cameraAngle?: number;
    cameraPosition?: readonly number[] | null;
    thrust?: number;
    hatch?: number;
    pitch?: number;
    heading?: number;
  } = {},
) {
  if (m.characters && !occupied && !thrust && !hatch && !pitch) {
    pose(m, position.x, position.y, position.z, 0, () =>
      drawCachedMesh(m, 'parked-rocket', (mesh) =>
        drawReusableRocket(mesh, { x: 0, y: 0, z: 0 }, 0),
      ),
    );
    return;
  }
  const start = m.data.length;
  if (cameraPosition) {
    // Choose the cabin cutaway in the unpitched frame, so it continues to
    // face the viewer as both the rocket and the camera rotate.
    const eye = rocketFlightPoint(
      { x: cameraPosition[0], y: cameraPosition[1], z: cameraPosition[2] },
      position,
      { pitch: -pitch, heading },
    );
    cameraAngle = Math.atan2(eye.z - position.z, eye.x - position.x);
  }
  pose(m, position.x, position.y, position.z, 0, () => {
    m.cylinder(0, 0.3, 0, 0.66, 4.35, '#e4e8e5', 40, 0.66, { metal: 0.2 });
    m.cylinder(0, 3.7, 0, 0.675, 0.55, '#303e44', 40, 0.675, { metal: 0.3 });
    m.cylinder(0, 4.28, 0, 0.7, 0.35, '#cdd6d3', 40, 0.7, { metal: 0.2 });
    for (let face = 0; face < 4; face++)
      pose(m, 0, 0, 0, (face * Math.PI) / 2, () => {
        m.tri(
          [0.55, 0.5, -0.09] satisfies [number, number, number],
          [1.35, 0.2, -0.09] satisfies [number, number, number],
          [0.63, 1.5, -0.09] satisfies [number, number, number],
          '#6e7d7e',
          {
            metal: 0.25,
          },
        );
        m.tri(
          [0.55, 0.5, 0.09] satisfies [number, number, number],
          [0.63, 1.5, 0.09] satisfies [number, number, number],
          [1.35, 0.2, 0.09] satisfies [number, number, number],
          '#879593',
          { metal: 0.25 },
        );
        m.rod(
          [0.57, 1.1, 0] satisfies [number, number, number],
          [1.5, -0.05, 0] satisfies [number, number, number],
          0.035,
          '#4e6165',
          8,
        );
        m.box(1.3, -0.1, -0.15, 0.45, 0.1, 0.3, '#596b6b');
        if (!occupied && face !== 2)
          m.quad(
            [-0.26, 5.1, 0.708] satisfies [number, number, number],
            [0.26, 5.1, 0.708] satisfies [number, number, number],
            [0.26, 5.85, 0.708] satisfies [number, number, number],
            [-0.26, 5.85, 0.708] satisfies [number, number, number],
            '#789da8',
            'glass',
          );
      });
    for (let i = 0; i < 40; i++) {
      const a = (i * Math.PI) / 20,
        b = a + Math.PI / 20,
        mid = (a + b) / 2,
        hatchFace = Math.cos(mid + Math.PI / 2) > 0.76;
      if (hatchFace || (occupied && Math.cos(mid - cameraAngle) > 0)) continue;
      m.quad(
        [Math.cos(a) * 0.7, 4.65, Math.sin(a) * 0.7] satisfies [number, number, number],
        [Math.cos(b) * 0.7, 4.65, Math.sin(b) * 0.7] satisfies [number, number, number],
        [Math.cos(b) * 0.7, 6.65, Math.sin(b) * 0.7] satisfies [number, number, number],
        [Math.cos(a) * 0.7, 6.65, Math.sin(a) * 0.7] satisfies [number, number, number],
        '#dce4e1',
        { metal: 0.2 },
      );
    }
    // A real north-facing hatch swings out before the rider reaches it.
    // The viewing cutaway remains camera-facing once the rider is inside.
    const frontCut = occupied && Math.cos(-Math.PI / 2 - cameraAngle) > 0;
    if (!frontCut) {
      for (const side of [-1, 1] satisfies [number, number])
        m.box(side * 0.45 - 0.035, 4.65, -0.755, 0.07, 1.98, 0.23, '#7f9498', { metal: 0.25 });
      m.box(-0.48, 6.59, -0.755, 0.96, 0.06, 0.23, '#7f9498', { metal: 0.25 });
    }
    if (hatch > 0.01 || !frontCut)
      pose(m, -0.45, 4.72, -0.75, -rocketClamp(hatch) * Math.PI * 0.58, () => {
        m.box(0, 0, -0.035, 0.9, 1.86, 0.07, '#cad5d2', { metal: 0.2 });
        m.box(0.12, 0.67, -0.044, 0.66, 0.92, 0.014, '#526d79', { metal: 0.15 });
        m.box(0.17, 0.72, -0.053, 0.56, 0.82, 0.01, '#8fb1bd', 'glass');
        m.rod(
          [0.74, 0.36, -0.09] satisfies [number, number, number],
          [0.74, 0.58, -0.09] satisfies [number, number, number],
          0.022,
          '#536c75',
          8,
        );
        for (const y of [0.25, 1.5] satisfies [number, number])
          m.cylinder(0, y, 0, 0.045, 0.15, '#718b92', 10);
      });
    m.cylinder(0, 6.65, 0, 0.72, 0.18, '#596d75', 40, 0.72, { metal: 0.2 });
    m.cylinder(0, 6.83, 0, 0.72, 1.45, '#e1e7e4', 40, 0.04, { metal: 0.2 });
    m.cylinder(0, ROCKET_CABIN_HEIGHT - 0.06, 0, 0.69, 0.06, '#9aa9a3', 32);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3,
        x = Math.cos(a) * 0.32,
        z = Math.sin(a) * 0.32;
      m.cylinder(x, -0.1, z, 0.21, 0.46, '#40535a', 16, 0.12, { metal: 0.4 });
      if (thrust) {
        const length = (1.2 + Math.sin(time * 0.04 + i) * 0.16) * thrust;
        m.cylinder(x, -0.15 - length, z, 0.025, length, '#f3bf68', 16, 0.18, { emissive: 0.8 });
        m.cylinder(x, -0.14 - length * 0.7, z, 0.02, length * 0.7, '#d7eaf2', 12, 0.09, {
          emissive: 0.9,
        });
      }
    }
  });
  tiltRocketMesh(m, start, position, { pitch, heading });
}
