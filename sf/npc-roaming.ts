import { isFiniteNumber, isSafeInteger, isRecord } from './types/json.ts';
import { createNavigationGrid } from './navigation.ts';
import { CHARACTER_CLIPS } from './characters.ts';

import type { Point, WorldPoint } from './types/geometry.ts';
import type { Actor, RoamingRoute } from './types/world.ts';

type RoamingCandidate = Pick<Actor, 'id' | 'x' | 'z'> & Partial<Actor>;
type ActiveRoamer<T extends RoamingCandidate> = T & {
  roam: RoamingRoute;
  hold: number;
  phase: number;
  motion: number;
  angle: number;
};
interface RoamingOptions<T extends RoamingCandidate> {
  eligible: (npc: T) => boolean;
  walkable: (x: number, y: number, npc: T) => boolean;
  canTravel: (ax: number, ay: number, bx: number, by: number) => boolean;
  ground: (x: number, z: number) => number;
  approachFor: (npc: T) => Point | null | undefined;
  span?: number;
}
const roamingSeed = (id: string) => {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return (n % 997) / 997;
};

/** Only the cursor and timers are persisted. They are meaningful for the
 * exact authored patrol that produced them, never just its bounding square. */
export function validNPCRoamingState(
  roam: Pick<RoamingRoute, 'points'>,
  saved: unknown,
): saved is { index: number; pause: number; stops: number } {
  return (
    isRecord(saved) &&
    Number.isInteger(saved.index) &&
    saved.index >= 1 &&
    saved.index < roam.points.length &&
    isFiniteNumber(saved.pause) &&
    saved.pause >= 0 &&
    isSafeInteger(saved.stops) &&
    saved.stops >= 0
  );
}

function resetNPCRoaming(npc: RoamingCandidate) {
  const r = npc.roam,
    home = r?.points?.[0];
  if (!r || !home || !Number.isFinite(home.x) || !Number.isFinite(home.y) || r.points.length < 2)
    return false;
  npc.x = home.x + 0.5;
  npc.z = home.y + 0.5;
  r.index = 1;
  r.pause = 0.5;
  r.stops = 0;
  return true;
}

/** Prepare small, bounded patrols once against the world's real adjacency
 * rules. Runtime movement only follows those routes; it never pathfinds. */
export function createNPCRoaming<T extends RoamingCandidate>(
  npcs: readonly T[],
  { eligible, walkable, canTravel, ground, approachFor, span = 3 }: RoamingOptions<T>,
) {
  const people: ActiveRoamer<T>[] = [],
    unavailable: string[] = [],
    resolution = 4,
    width = Math.max(3, Math.floor((span * resolution) / 2) * 2 - 1),
    size = width / resolution,
    half = size / 2;
  for (const npc of npcs) {
    if (!eligible(npc)) continue;
    const home = { x: npc.x - 0.5, y: npc.z - 0.5 },
      west = home.x - half,
      north = home.y - half,
      seed = roamingSeed(npc.id),
      originalApproach = approachFor(npc);
    const local = (p: Point) => ({ x: p.x - west, y: p.y - north }),
      world = (p: Point) => ({ x: p.x + west, y: p.y + north });
    // Leave a small interior margin: a sampled segment can otherwise
    // graze a sliver of a parcel corner between its sampled points.
    const free = (x: number, y: number) =>
      [
        [0, 0] satisfies [number, number],
        [-0.035, 0] satisfies [number, number],
        [0.035, 0] satisfies [number, number],
        [0, -0.035] satisfies [number, number],
        [0, 0.035] satisfies [number, number],
      ].every(([dx, dy]) => walkable(x + dx, y + dy, npc));
    const segment = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const from = world(a),
        to = world(b);
      if (!canTravel(from.x, from.y, to.x, to.y)) return false;
      const n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 0.08));
      for (let i = 0; i <= n; i++)
        if (!free(from.x + ((to.x - from.x) * i) / n, from.y + ((to.y - from.y) * i) / n))
          return false;
      return true;
    };
    const mask = Uint8Array.from({ length: width * width }, (_, id) =>
      free(
        west + ((id % width) + 0.5) / resolution,
        north + (Math.floor(id / width) + 0.5) / resolution,
      )
        ? 1
        : 0,
    );
    const graph = createNavigationGrid({
      width,
      resolution,
      mask,
      canTraverse: segment,
      canLink: segment,
    });
    const requestedStart = local(home),
      start = free(home.x, home.y)
        ? requestedStart
        : graph.nearest(requestedStart.x, requestedStart.y, 0.5),
      candidates = [];
    if (!start) {
      unavailable.push(npc.id);
      continue;
    }
    const standing = world(start);
    npc.x = standing.x + 0.5;
    npc.z = standing.y + 0.5;
    for (let id = 0; id < mask.length; id++)
      if (mask[id]) {
        const p = graph.pointAt(id);
        if (graph.connected(start, p) && Math.hypot(p.x - start.x, p.y - start.y) > 0.45)
          candidates.push(p);
      }
    const points = [{ ...standing, stop: true }];
    let previous = start;
    for (let direction = 0; direction < 3; direction++) {
      const angle = (seed + direction / 3) * Math.PI * 2,
        score = (p: Point) => (p.x - start.x) * Math.cos(angle) + (p.y - start.y) * Math.sin(angle);
      const target = candidates
        .filter((p) => Math.hypot(p.x - previous.x, p.y - previous.y) > 0.5)
        .sort((a, b) => score(b) - score(a))[0];
      if (!target) continue;
      const route = graph.path(previous, target);
      if (!route?.length) continue;
      for (const p of route) points.push({ ...world(p), stop: false });
      points.at(-1)!.stop = true;
      previous = target;
    }
    const back = graph.path(previous, start);
    if (back) for (const p of back) points.push({ ...world(p), stop: false });
    if (points.length < 3 || !back) {
      unavailable.push(npc.id);
      continue;
    }
    points.at(-1)!.stop = true;
    const preferred = originalApproach
      ? Math.atan2(originalApproach.y - home.y, originalApproach.x - home.x)
      : npc.angle || 0;
    npc.roam = {
      home: { ...standing },
      bounds: { west, north, east: west + size, south: north + size },
      points,
      index: 1,
      pause: 0.4 + seed * 2.2,
      speed: 0.48 + seed * 0.24,
      seed,
      stops: 0,
      restAngle: npc.angle || 0,
      approachAngle: preferred,
    };
    npc.hold = 0;
    npc.waiting = false;
    npc.moving = false;
    npc.motion = 0;
    npc.phase = seed * Math.PI * 2;
    Object.defineProperty(npc, 'approach', {
      configurable: true,
      enumerable: true,
      get: () => approach(npc),
    });
    people.push(npc as ActiveRoamer<T>);
  }
  function approach(npc: T) {
    const r = npc.roam,
      home = { x: npc.x - 0.5, y: npc.z - 0.5 };
    for (const radius of [0.8, 0.65, 1] satisfies [number, number, number])
      for (const turn of [0, 1, -1, 2, -2, 3, -3, 4] satisfies [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ]) {
        const a = (r?.approachAngle || 0) + (turn * Math.PI) / 4,
          x = home.x + Math.cos(a) * radius,
          y = home.y + Math.sin(a) * radius;
        if (walkable(x, y, npc) && canTravel(home.x, home.y, x, y)) return { x, y };
      }
    return home;
  }
  function update(
    dt: number,
    {
      paused = false,
      lookAt = null,
      disabled = () => false,
    }: { paused?: boolean; lookAt?: WorldPoint | null; disabled?: (npc: T) => boolean } = {},
  ) {
    if (dt <= 0) return;
    for (const npc of people) {
      const r = npc.roam;
      // A stale/corrupt cursor must never take down the world tick. Reset
      // this NPC to the start of its native route, preserving all players.
      if (
        !r ||
        !Array.isArray(r.points) ||
        (!validNPCRoamingState(r, r) && !resetNPCRoaming(npc))
      ) {
        npc.moving = false;
        npc.motion = 0;
        continue;
      }
      const held = npc.waiting || npc.hold > 0;
      let remaining = dt,
        distance = 0,
        facing = npc.angle;
      if (npc.hold > 0 && !paused) npc.hold = Math.max(0, npc.hold - dt);
      if (!paused && !held && !disabled(npc))
        while (remaining > 1e-8) {
          if (r.pause > 0) {
            const used = Math.min(remaining, r.pause);
            r.pause -= used;
            remaining -= used;
            facing = r.restAngle;
            continue;
          }
          const next = r.points[r.index];
          if (!next || !Number.isFinite(next.x) || !Number.isFinite(next.y)) {
            npc.moving = false;
            break;
          }
          const dx = next.x + 0.5 - npc.x,
            dz = next.y + 0.5 - npc.z,
            d = Math.hypot(dx, dz),
            step = Math.min(d, r.speed * remaining);
          if (d > 1e-8) {
            const x = d <= step + 1e-8 ? next.x + 0.5 : npc.x + (dx / d) * step,
              z = d <= step + 1e-8 ? next.y + 0.5 : npc.z + (dz / d) * step;
            if (!walkable(x - 0.5, z - 0.5, npc)) {
              r.pause = 0.5;
              break;
            }
            npc.x = x;
            npc.z = z;
            distance += step;
            remaining -= step / r.speed;
            facing = Math.atan2(dz, dx);
          }
          if (d - step < 1e-8) {
            r.index = r.index === r.points.length - 1 ? 1 : r.index + 1;
            if (next.stop) {
              r.stops++;
              r.pause = 1.4 + ((r.stops * 7 + Math.round(r.seed * 23)) % 11) * 0.24;
            }
          }
        }
      npc.base = ground(npc.x, npc.z) + 0.025;
      npc.moving = distance > 1e-8;
      npc.phase += (distance * Math.PI * 2) / CHARACTER_CLIPS.walk.stride;
      npc.motion += (Number(npc.moving) - npc.motion) * (1 - Math.exp(-dt * 12));
      if (held && lookAt) facing = Math.atan2(lookAt.z - npc.z, lookAt.x - npc.x);
      npc.angle += Math.max(
        -dt * 3,
        Math.min(dt * 3, Math.atan2(Math.sin(facing - npc.angle), Math.cos(facing - npc.angle))),
      );
    }
  }
  return { people, unavailable, update, approach };
}

export type NPCRoaming<T extends RoamingCandidate> = ReturnType<typeof createNPCRoaming<T>>;
