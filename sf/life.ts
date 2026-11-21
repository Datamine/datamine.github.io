import type { Actor } from './types/world.ts';
import type { CharacterAppearance, drawCharacter } from './characters.ts';

type GroundHeight = (x: number, z: number) => number;
interface LifeRoute {
  points: number[][];
  length: number;
  seed: number;
  rider: boolean;
  street?: string;
}
export interface LifeActor extends Omit<Actor, 'points' | 'phase' | 'seed' | 'rider'>, LifeRoute {
  phase: number;
  elapsed: number;
  hold: number;
  motion: number;
  angle?: number;
  stroller?: boolean;
  infant?: Actor;
  petDog?: Actor & { phase: number; color?: string };
}
interface CityLifeOptions {
  routes: readonly {
    points: readonly (readonly number[])[];
    name?: string;
    kind?: string;
    halfWidth?: number;
  }[];
  surfaceType: (x: number, z: number) => string;
  lamps: readonly { x: number; z: number }[];
  terrainHeight: GroundHeight;
  groundHeight?: GroundHeight;
  scale: number;
  human: typeof drawCharacter;
  bicycle: (m: Mesh, x: number, z: number, base: number, angle: number, phase?: number) => void;
  maxWalkers?: number;
  maxRiders?: number;
  waterTraffic?: boolean;
  prefix?: string;
  regional?: boolean | ((route: LifeRoute) => boolean);
  walkerQuotas?: { count: number; contains: (x: number, z: number) => boolean }[];
  strollers?: boolean;
  walkable?: (x: number, z: number) => boolean;
  canTravel?: (ax: number, az: number, bx: number, bz: number) => boolean;
  visible?: (x: number, z: number, base: number) => boolean;
  preparedPeople?: LifeActor[] | null;
}
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { drawHumanNPC } from './human-npc.ts';
import { drawCachedMesh } from './rendering/cached-mesh.ts';
import type { Mesh } from './geometry.ts';
import { rand, pose } from './geometry.ts';
import { drawWalkingDog, drawDogLeash, drawBabyStroller } from './companions.ts';
import { CHARACTER_CLIPS } from './characters.ts';

export const NOE_VALLEY_BOUNDS = Object.freeze({ west: 49, east: 64, north: 68, south: 84 });

export function routePhase(time: number, length: number, speed: number, seed = 0, pause = 1.5) {
  const travel = length / speed,
    cycle = travel * 2 + pause * 2,
    t = (time + seed * cycle) % cycle;
  if (t < travel) return { fraction: t / travel, direction: 1, moving: true };
  if (t < travel + pause) return { fraction: 1, direction: 1, moving: false };
  if (t < travel * 2 + pause)
    return { fraction: 1 - (t - travel - pause) / travel, direction: -1, moving: true };
  return { fraction: 0, direction: -1, moving: false };
}
const pointOn = (points: readonly (readonly number[])[], f: number) => {
  const at = Math.min(points.length - 1.000001, Math.max(0, f) * (points.length - 1)),
    i = Math.floor(at),
    t = at - i,
    a = points[i],
    b = points[i + 1];
  return {
    x: a[0] + (b[0] - a[0]) * t,
    z: a[1] + (b[1] - a[1]) * t,
    angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
  };
};

/** Tangent-facing flight over the bay. Motion remains gentle when reduced
 * motion is requested; position still advances instead of freezing in midair. */
export function seagullFlight(time: number, index: number, scale = 1.5, reduced = false) {
  const seconds = time * 0.001,
    rate = (0.2 + index * 0.014) * (reduced ? 0.45 : 1),
    a = seconds * rate + index * 0.89;
  const rx = 5.5 + index * 0.45,
    rz = 2.1 + index * 0.2,
    center =
      index < 4 ? ([57.5, 16] satisfies [number, number]) : ([29, 8.4] satisfies [number, number]);
  return {
    x: center[0] * scale + Math.cos(a) * rx,
    z: center[1] * scale + Math.sin(a) * rz,
    y: 4.2 + (index % 3) * 0.55 + Math.sin(a * 2 + index) * 0.2,
    angle: Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx),
    bank: Math.sin(a) * 0.035,
    flap: reduced ? 0.018 : Math.sin(seconds * 5.5 + index * 1.7) * 0.16,
  };
}

export function drawSeagull(m: Mesh, bird: ReturnType<typeof seagullFlight>) {
  pose(m, bird.x, bird.y, bird.z, bird.angle, () => {
    m.sphere(0, 0, 0, 0.13, 0.045, 0.045, '#d6ddd4', 8, 4);
    m.sphere(0.1, 0.025, 0, 0.055, 0.05, 0.045, '#e2e6d8', 8, 4);
    m.tri(
      [0.145, 0.025, -0.018] satisfies [number, number, number],
      [0.145, 0.025, 0.018] satisfies [number, number, number],
      [0.2, 0.018, 0] satisfies [number, number, number],
      '#bfa569',
    );
    for (const side of [-1, 1] satisfies [number, number]) {
      const lift = bird.flap + side * bird.bank;
      m.tri(
        [0.07, 0, side * 0.025] satisfies [number, number, number],
        [-0.04, lift, side * 0.29],
        [-0.075, -0.01, side * 0.08] satisfies [number, number, number],
        '#dce2d7',
      );
      m.tri(
        [-0.04, lift, side * 0.29],
        [-0.15, lift - 0.035, side * 0.46] satisfies [number, number, number],
        [-0.075, -0.01, side * 0.08] satisfies [number, number, number],
        '#899a96',
      );
    }
  });
}

/** Short, checked pavement routes prevent background people walking through
 * buildings. Routes and appearances are prepared once, never pathfound per frame. */
export function createCityLife({
  routes,
  surfaceType,
  lamps,
  terrainHeight,
  groundHeight = terrainHeight,
  scale,
  human,
  bicycle,
  maxWalkers = 26,
  maxRiders = 4,
  waterTraffic = true,
  prefix = 'citizen',
  regional = false,
  walkerQuotas = [],
  strollers = false,
  walkable = () => true,
  canTravel = () => true,
  visible = () => true,
  preparedPeople = null,
}: CityLifeOptions) {
  const candidates: LifeRoute[] = [],
    gulls: { x: number; z: number; y: number; angle: number; bank: number; flap: number }[] = [],
    people = preparedPeople || [];
  if (!preparedPeople) {
    for (const [index, r] of routes.entries()) {
      const [a, b] = r.points,
        len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        ux = (b[0] - a[0]) / len,
        uz = (b[1] - a[1]) / len;
      for (const side of strollers ? [1] : ([-1, 1] satisfies [number, number])) {
        const offset = strollers ? 0 : (r.halfWidth ?? 0) + 0.125;
        let points: number[][] = [];
        const finish = () => {
          if (strollers) points = points.slice(5, -5);
          if (points.length >= 11)
            candidates.push({
              points,
              length: (points.length - 1) * 0.2,
              seed: rand(index, side, 14),
              rider: false,
              street: r.name,
            });
          points = [];
        };
        for (let t = 0.5; t < len - 0.5; t += 0.2) {
          const x = a[0] + ux * t - uz * side * offset,
            z = a[1] + uz * t + ux * side * offset,
            type = surfaceType(x, z),
            fits = (strollers ? ([-0.3, 0, 0.3] satisfies [number, number, number]) : [0]).every(
              (v) => walkable(x - uz * v, z + ux * v),
            );
          if (
            (type === 'sidewalk' || (strollers && type === 'road')) &&
            fits &&
            !lamps.some((p) => Math.hypot(p.x - x, p.z - z) < (strollers ? 0.4 : 0.25))
          ) {
            if (points.length && !canTravel(points.at(-1)![0], points.at(-1)![1], x, z)) finish();
            points.push([x, z]);
          } else finish();
        }
        finish();
      }
      if (r.kind === 'path' && len > 4) {
        let points: number[][] = [];
        const finish = () => {
          if (points.length > 14)
            candidates.push({
              points,
              length: (points.length - 1) * 0.2,
              seed: rand(index, 0, 41),
              rider: true,
            });
          points = [];
        };
        for (let t = 0.5; t < len - 0.5; t += 0.2) {
          const x = a[0] + ux * t,
            z = a[1] + uz * t,
            type = surfaceType(x, z);
          if ((type === 'path' || type === 'sidewalk') && walkable(x, z)) {
            if (points.length && !canTravel(points.at(-1)![0], points.at(-1)![1], x, z)) finish();
            points.push([x, z]);
          } else finish();
        }
        finish();
      }
    }
    const walkers = candidates.filter((p) => !p.rider),
      riders = candidates.filter((p) => p.rider);
    const chosen = new Set<LifeRoute>();
    const select = (pool: LifeRoute[], count: number) => {
      count = Math.min(count, pool.length, maxWalkers - chosen.size);
      for (let i = 0; i < count; i++) chosen.add(pool[Math.floor((i * pool.length) / count)]);
    };
    for (const quota of walkerQuotas)
      select(
        walkers.filter(
          (p) =>
            !chosen.has(p) &&
            quota.contains(
              p.points[Math.floor(p.points.length / 2)][0],
              p.points[Math.floor(p.points.length / 2)][1],
            ),
        ),
        quota.count,
      );
    select(
      walkers.filter((p) => !chosen.has(p)),
      maxWalkers - chosen.size,
    );
    // Routes acquire their actor identity below, before the controller is exposed.
    (people as LifeRoute[]).push(...chosen);
    // Families may share an obstacle-free promenade, with distinct starting
    // phases, rather than inventing extra routes through narrow blocked gaps.
    if (strollers && walkers.length)
      for (let i = people.length; i < maxWalkers; i++) {
        const route = walkers[i % walkers.length];
        (people as LifeRoute[]).push({ ...route, seed: (route.seed + i * 0.31) % 1 });
      }
    for (let i = 0; i < Math.min(maxRiders, riders.length); i++)
      (people as LifeRoute[]).push(
        riders[Math.floor((i * riders.length) / Math.min(maxRiders, riders.length))],
      );
    people.forEach((p, i) =>
      Object.assign(p, {
        child: !strollers && !p.rider && i % 11 === 3,
        dogWalker: !strollers && !p.rider && i % 9 === 4,
        stroller: strollers && !p.rider,
        id: prefix + '-' + i,
        label:
          !strollers && !p.rider && i % 11 === 3
            ? contentText('life.createCityLife.label-1.yes', {})
            : i % 2
              ? contentText('life.createCityLife.label-1.no.yes', {})
              : contentText('life.createCityLife.label-1.no.no', {}),
        regional: typeof regional === 'function' ? regional(p) : regional,
        elapsed: 0,
        hold: 0,
        phase: p.seed * Math.PI * 2,
        motion: 0,
      }),
    );
  }
  let networkControlled = false;
  function update(dt: number) {
    if (networkControlled) return;
    for (const p of people) {
      const held = p.hold > 0 || p.waiting;
      if (held) p.hold = Math.max(0, p.hold - dt);
      else p.elapsed += dt;
      const speed = p.rider ? 1.8 : 0.75 + p.seed * 0.25,
        state = routePhase(p.elapsed, p.length, speed, p.seed),
        at = pointOn(p.points, state.fraction),
        moving = state.moving && !held;
      p.x = at.x;
      p.z = at.z;
      p.motion += (Number(moving) - p.motion) * (1 - Math.exp(-dt * 12));
      if (moving)
        p.phase += speed * dt * (p.rider ? 1 / 0.31 : (Math.PI * 2) / CHARACTER_CLIPS.walk.stride);
      let facing =
        at.angle +
        (state.moving ? (state.direction < 0 ? Math.PI : 0) : state.fraction > 0.5 ? Math.PI : 0);
      if (held && p.lookAt && !p.stroller)
        facing = Math.atan2(p.lookAt.z - at.z, p.lookAt.x - at.x);
      if (p.angle === undefined) p.angle = facing;
      else
        p.angle += Math.max(
          -dt * 4,
          Math.min(dt * 4, Math.atan2(Math.sin(facing - p.angle), Math.cos(facing - p.angle))),
        );
    }
  }
  const colors = [
      '#647a7b',
      '#8e6b59',
      '#686e53',
      '#506d86',
      '#a1846e',
      '#75727e',
      '#8e8060',
    ] satisfies [string, string, string, string, string, string, string],
    skins = ['#bd9673', '#9e7053', '#d0b293', '#7d573f', '#c49e7e'] satisfies [
      string,
      string,
      string,
      string,
      string,
    ];
  function ferry(m: Mesh, x: number, z: number, y: number, angle: number) {
    pose(m, x, y, z, angle, () => {
      m.box(-0.8, 0.02, -0.25, 1.6, 0.17, 0.5, '#d6dfd9');
      m.tri(
        [0.8, 0.02, -0.25] satisfies [number, number, number],
        [0.8, 0.02, 0.25] satisfies [number, number, number],
        [1.04, 0.08, 0] satisfies [number, number, number],
        '#cbd8d3',
      );
      m.box(-0.82, 0.03, -0.26, 1.62, 0.045, 0.52, '#375e6a');
      m.box(-0.65, 0.19, -0.21, 1.22, 0.32, 0.42, '#c4d0ca');
      for (let i = 0; i < 6; i++)
        for (const side of [-1, 1] satisfies [number, number])
          m.box(-0.55 + i * 0.18, 0.27, side * 0.218, 0.13, 0.16, 0.016, '#487585');
      m.box(-0.69, 0.51, -0.24, 1.31, 0.06, 0.48, '#d7e0d3');
      m.box(-0.4, 0.57, -0.16, 0.45, 0.13, 0.32, '#9bb1ae');
      m.rod(
        [-0.02, 0.58, 0] satisfies [number, number, number],
        [-0.02, 0.96, 0] satisfies [number, number, number],
        0.014,
        '#b4bfae',
        6,
      );
      for (const side of [-1, 1] satisfies [number, number])
        for (let j = 0; j < 3; j++)
          m.rod(
            [-0.87 - j * 0.45, 0.025, side * (0.19 + j * 0.16)] satisfies [number, number, number],
            [-1.15 - j * 0.45, 0.025, side * (0.23 + j * 0.16)] satisfies [number, number, number],
            0.017,
            '#9ac0ba',
            4,
          );
    });
  }
  function draw(
    m: Mesh,
    time: number,
    viewer: number[],
    reduced: boolean | undefined,
    addTarget: (start: number, actor: Actor) => void = () => {},
  ) {
    const seconds = reduced ? 12 : time * 0.001;
    for (const [i, p] of people.entries()) {
      if (p.expeditionDead || (networkControlled && !p.networkVisible)) continue;
      const state = routePhase(
          reduced && !p.networked ? 12 : p.elapsed,
          p.length,
          p.rider ? 1.8 : 0.75 + p.seed * 0.25,
          p.seed,
        ),
        at = p.networked ? { x: p.x, z: p.z, angle: p.angle! } : pointOn(p.points, state.fraction);
      if (!p.networked) {
        p.x = at.x;
        p.z = at.z;
      }
      if (Math.hypot(at.x - viewer[0], at.z - viewer[1]) > 26) continue;
      const angle = reduced
          ? at.angle + (state.direction < 0 ? Math.PI : 0)
          : (p.angle ?? at.angle),
        base = (p.stroller ? groundHeight : terrainHeight)(at.x, at.z) + 0.075,
        phase = reduced ? 0 : p.phase,
        start = m.data.length;
      if (!visible(at.x, at.z, base)) continue;
      const appearance: CharacterAppearance & { height: number } = {
        pants: i % 2 ? '#475259' : '#5a574d',
        hair: (['#3c352f', '#5d4e3c', '#907657'] satisfies [string, string, string])[i % 3],
        female: p.label === 'Woman',
        cap: i % 7 === 0,
        longHair: p.label === 'Woman' && i % 3 !== 0,
        backpack: i % 4 === 0,
        coat: i % 3 === 0,
        height: p.stroller ? 1 : p.child ? 0.65 + p.seed * 0.05 : 0.92 + p.seed * 0.16,
        carryingFish: p.dogWalker,
        pushingStroller: p.stroller,
        mode: p.rider ? 'cycle' : 'move',
        motion: reduced ? 0 : p.motion,
        time: reduced ? 0 : seconds + p.seed * 13,
        ground: p.rider ? null : groundHeight,
      };
      if (!reduced && p.gesture && time < p.gesture.started + p.gesture.duration) {
        appearance.action = p.gesture.name || undefined;
        appearance.actionT = (time - p.gesture.started) / p.gesture.duration;
      }
      p.base = base + (p.rider ? 0.3 : 0);
      p.height = (p.rider ? 1.48 : 1.83) * appearance.height + 0.1;
      drawHumanNPC(m, p, time, {
        x: at.x,
        z: at.z,
        base: base + (p.rider ? 0.3 : 0),
        angle: angle,
        phase: phase,
        seated: p.rider,
        skin: skins[i % skins.length],
        shirt: colors[i % colors.length],
        appearance: appearance,
        reduced: reduced,
        draw: human,
      });
      if (p.rider) bicycle(m, at.x, at.z, base, angle, phase);
      addTarget(start, p);
      if (p.stroller) {
        const baby =
          p.infant ||
          (p.infant = {
            id: p.id + '-baby',
            label: contentText('life.draw.label-2', {}),
            baby: true,
            child: true,
            parent: p,
            height: 0.9,
            hold: 0,
            x: p.x,
            z: p.z,
          });
        const strollerStart = m.data.length,
          at = drawBabyStroller(
            m,
            {
              ...p,
              angle,
              strollerColor: (['#648f91', '#98798e', '#85936a'] satisfies [string, string, string])[
                i % 3
              ],
              blanketColor: (['#dbb3a8', '#c5cfb1', '#c2c4dc'] satisfies [string, string, string])[
                i % 3
              ],
              babySkin: skins[(i + 2) % skins.length],
            },
            reduced ? 0 : time,
            groundHeight,
          );
        Object.assign(baby, at);
        addTarget(strollerStart, baby);
      }
      if (p.dogWalker) {
        const behind = pointOn(
          p.points,
          Math.max(0, Math.min(1, state.fraction - (state.direction * 0.65) / p.length)),
        );
        const dog =
          p.petDog ||
          (p.petDog = {
            id: p.id + '-dog',
            label: contentText('life.draw.label-3', {}),
            dog: true,
            regional: p.regional,
            description: contentText('life.draw.description-4', {}),
            height: 0.75,
            hold: 0,
            x: p.x,
            z: p.z,
            phase: 0,
          });
        Object.assign(dog, {
          x: behind.x,
          z: behind.z,
          angle: angle,
          base: groundHeight(behind.x, behind.z),
          moving: state.moving && !p.hold,
          phase: phase * 1.5,
          color: i % 2 ? '#bca37d' : '#7d6857',
        });
        const dogStart = m.data.length;
        drawWalkingDog(m, dog, time, groundHeight);
        addTarget(dogStart, dog);
        drawDogLeash(m, dog, groundHeight, { x: p.x, z: p.z, base, angle });
      }
    }
    if (!waterTraffic) return;
    for (let boat = 0; boat < 2; boat++) {
      const f = routePhase(seconds, 23, 0.48 + boat * 0.11, boat * 0.46, 7).fraction,
        points = boat
          ? [
              [58.6, 21] satisfies [number, number],
              [61, 16] satisfies [number, number],
              [55, 8] satisfies [number, number],
              [45, 5] satisfies [number, number],
            ]
          : [
              [58.2, 20] satisfies [number, number],
              [61, 14] satisfies [number, number],
              [54, 6] satisfies [number, number],
              [35, 5] satisfies [number, number],
            ],
        p = pointOn(points, f),
        x = p.x * scale,
        z = p.z * scale;
      if (Math.hypot(x - viewer[0], z - viewer[1]) < 65)
        ferry(m, x, z, 0.08 + Math.sin(seconds * 0.7 + boat) * 0.016, p.angle);
    }
    gulls.length = 0;
    for (let i = 0; i < 7; i++) {
      const bird = seagullFlight(time, i, scale, reduced);
      gulls.push(bird);
      if (Math.hypot(bird.x - viewer[0], bird.z - viewer[1]) > 55) continue;
      drawSeagull(m, bird);
    }
  }
  return {
    draw,
    people,
    gulls,
    update,
    setNetworkControlled(value: boolean) {
      networkControlled = value;
    },
  };
}

export function drawStreetcar(m: Mesh, x: number, base: number, z: number, angle: number) {
  pose(m, x, base, z, angle, () =>
    drawCachedMesh(m, 'streetcar', (mesh) => {
      mesh.box(-0.82, 0.12, -0.33, 1.64, 0.23, 0.66, '#9e5741');
      mesh.box(-0.74, 0.35, -0.32, 1.48, 0.54, 0.64, '#c7b88c');
      for (const u of [-0.82, 0.74] satisfies [number, number])
        mesh.box(u, 0.28, -0.31, 0.08, 0.44, 0.62, '#9b5742');
      mesh.box(-0.87, 0.89, -0.38, 1.74, 0.09, 0.76, '#536e60');
      for (let i = 0; i < 6; i++)
        for (const side of [-1, 1] satisfies [number, number]) {
          mesh.box(-0.64 + i * 0.23, 0.43, side * 0.326, 0.16, 0.32, 0.015, '#537d84');
          mesh.box(-0.68 + i * 0.23, 0.38, side * 0.34, 0.025, 0.43, 0.025, '#d8ccaa');
        }
      for (const u of [-0.55, 0.55] satisfies [number, number])
        for (const side of [-1, 1] satisfies [number, number])
          mesh.sphere(u, 0.12, side * 0.29, 0.12, 0.12, 0.045, '#3d4c4b', 12, 6);
      for (const u of [-0.87, 0.85] satisfies [number, number])
        mesh.sphere(u, 0.39, 0, 0.023, 0.065, 0.065, '#efd9a2', 12, 6, { emissive: 0.65 });
      mesh.rod(
        [-0.28, 0.98, 0] satisfies [number, number, number],
        [0.28, 1.17, 0] satisfies [number, number, number],
        0.017,
        '#71867a',
        6,
      );
      mesh.rod(
        [0.28, 1.17, 0] satisfies [number, number, number],
        [0.55, 1.4, 0] satisfies [number, number, number],
        0.012,
        '#71867a',
        6,
      );
    }),
  );
}

/** Clip actor routes at a region boundary without inventing a separate road. */
export function clipLifeRoutes<T extends { points: readonly (readonly number[])[] }>(
  routes: readonly T[],
  minZ = -Infinity,
  maxZ = Infinity,
) {
  return routes.flatMap((r) =>
    r.points.slice(1).flatMap((b, i) => {
      const a = r.points[i],
        dz = b[1] - a[1];
      let start = 0,
        end = 1;
      if (!dz) {
        if (a[1] < minZ || a[1] > maxZ) return [];
      } else {
        const t = (minZ - a[1]) / dz,
          u = (maxZ - a[1]) / dz;
        start = Math.max(0, Math.min(t, u));
        end = Math.min(1, Math.max(t, u));
      }
      if (start >= end) return [];
      const at = (t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + dz * t];
      return [{ ...r, points: [at(start), at(end)] }];
    }),
  );
}
