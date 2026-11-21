import type { BuildingBase } from './types/buildings.ts';
import type { Actor, Site, WorldObject } from './types/world.ts';
export type RestaurantPlan = Omit<RestaurantSite, 'object'> &
  ({ h: number } | { worldHeight: number });
export interface RestaurantSite extends BuildingBase {
  id: string;
  x: number;
  y: number;
  w: number;
  d: number;
  rotation?: number;
  patioDepth: number;
  object: WorldObject & { base: number };
  sight?: Site;
  tables?: { x: number; z: number; base: number; footprint: number[][] }[];
}
export interface Diner extends Actor {
  index: number;
  seed: number;
  base: number;
  angle: number;
}
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { drawHumanNPC } from './human-npc.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

// Targets use the same 64-unit geographic drawing as the other landmarks.
export const RESTAURANTS = Object.freeze([
  Object.freeze({
    id: 'lucindas-deli',
    name: contentText('restaurants.module.name-1', {}),
    label: contentText('restaurants.module.label-2', {}),
    target: [35.5, 30.5] satisfies [number, number],
    w: 2.4,
    d: 1.6,
    patioDepth: 1.2,
    worldHeight: 2.8,
    arch: 'victorian',
    roof: 'gable',
    color: '#819a76',
    trim: '#f0d9a4',
    roofColor: '#5a6a64',
    category: 'Alamo Square · sandwiches',
    description: contentText('restaurants.module.description-3', {}),
  }),
  Object.freeze({
    id: 'shanghai-kelly',
    name: contentText('restaurants.module.name-4', {}),
    label: contentText('restaurants.module.label-5', {}),
    target: [40, 18.8] satisfies [number, number],
    w: 2.5,
    d: 1.7,
    patioDepth: 1,
    worldHeight: 2.75,
    arch: 'warehouse',
    roof: 'gable',
    color: '#5c665c',
    trim: '#d7b677',
    roofColor: '#565f66',
    category: 'North Beach · neighborhood bar',
    description: contentText('restaurants.module.description-6', {}),
  }),
  Object.freeze({
    id: 'cotogna',
    name: contentText('restaurants.module.name-7', {}),
    label: contentText('restaurants.module.label-8', {}),
    target: [46, 17] satisfies [number, number],
    w: 3,
    d: 1.9,
    patioDepth: 1.5,
    worldHeight: 2.3,
    arch: 'warehouse',
    roof: 'flat',
    color: '#ad795d',
    trim: '#d8c5a5',
    roofColor: '#68776b',
    category: 'North Beach · near Coit Tower',
    description: contentText('restaurants.module.description-9', {}),
  }),
  Object.freeze({
    id: 'rich-table',
    name: contentText('restaurants.module.name-10', {}),
    label: contentText('restaurants.module.label-11', {}),
    target: [39, 33.5] satisfies [number, number],
    w: 2.1,
    d: 1.3,
    patioDepth: 1.5,
    worldHeight: 3.05,
    arch: 'victorian',
    roof: 'gable',
    color: '#597667',
    trim: '#e0d8bc',
    roofColor: '#7c6b66',
    category: 'Hayes Valley · outdoor dining',
    description: contentText('restaurants.module.description-12', {}),
  }),
]);

export function restaurantPoint(
  site: Pick<RestaurantSite, 'x' | 'y' | 'w' | 'd' | 'rotation'>,
  u: number,
  v: number,
) {
  const a = site.rotation || 0,
    c = Math.cos(a),
    s = Math.sin(a);
  return [site.x + site.w / 2 + u * c - v * s, site.y + site.d / 2 + u * s + v * c];
}

/** Patio furniture stays inside its reserved private parcel. The dining group
 * has one collision footprint; a clear aisle leads to the front door. */
export function createRestaurantPatio(
  m: Mesh,
  site: RestaurantSite,
  registerFixture: (mesh: Mesh, start: number, info: WorldObject) => unknown = () => {},
) {
  const base = site.object.base + 0.015,
    front = site.d / 2,
    diners: Diner[] = [];
  pose(m, site.x + site.w / 2, base, site.y + site.d / 2, site.rotation || 0, () => {
    const left = -site.w / 2,
      right = site.w / 2;
    const back = front,
      edge = front + site.patioDepth;
    m.quad(
      [left, 0, back] satisfies [number, number, number],
      [left, 0, edge],
      [right, 0, edge],
      [right, 0, back] satisfies [number, number, number],
      '#c0b79b',
      'cobble',
    );
    for (const x of site.id === 'rich-table'
      ? [right - 0.17]
      : ([left + 0.17, right - 0.17] satisfies [number, number])) {
      const z = back + 0.25;
      m.cylinder(x, 0.015, z, 0.135, 0.24, '#aa7759', 16, 0.16, 'stone');
      m.sphere(x, 0.36, z, 0.17, 0.23, 0.17, '#788f59', 12, 8);
    }
  });
  const tables = [];
  for (let table = 0; table < 1; table++) {
    const u = site.id === 'cotogna' ? 0.78 : 0.45,
      v = front + 0.75,
      turn = 0,
      start = m.data.length;
    const local = (x: number, z: number) =>
      [
        u + x * Math.cos(turn) - z * Math.sin(turn),
        v + x * Math.sin(turn) + z * Math.cos(turn),
      ] satisfies [number, number];
    pose(m, site.x + site.w / 2, base, site.y + site.d / 2, site.rotation || 0, () =>
      pose(m, u, 0, v, turn, () => {
        m.cylinder(0, 0.02, 0, 0.065, 0.7, '#566a60', 12);
        m.cylinder(0, 0.71, 0, 0.32, 0.065, '#b19b75', 24, 0.32, 'wood');
        for (const side of [-1, 1] satisfies [number, number]) {
          const seat = side * 0.4;
          m.box(-0.17, 0.43, seat - 0.16, 0.34, 0.065, 0.32, '#856e51', 'wood');
          m.box(-0.18, 0.49, seat + side * 0.18 - 0.025, 0.36, 0.49, 0.05, '#856e51', 'wood');
          for (const dx of [-0.13, 0.13] satisfies [number, number])
            for (const dz of [-0.12, 0.12] satisfies [number, number])
              m.rod(
                [dx, 0.02, seat + dz] satisfies [number, number, number],
                [dx, 0.43, seat + dz] satisfies [number, number, number],
                0.018,
                '#596d61',
                8,
              );
          m.cylinder(0, 0.781, side * 0.18, 0.115, 0.018, '#e3ddca', 24);
          m.sphere(0, 0.81, side * 0.18, 0.065, 0.015, 0.05, table ? '#b88a55' : '#8c9a55', 12, 6);
          for (const offset of [-0.05, 0.045] satisfies [number, number])
            m.sphere(offset, 0.822, side * 0.18, 0.018, 0.015, 0.018, '#b96e4e', 8, 4);
          m.cylinder(0.19, 0.78, side * 0.12, 0.035, 0.12, '#9caaa0', 16, 0.04, 'glass');
          m.rod(
            [-0.16, 0.79, side * 0.08] satisfies [number, number, number],
            [-0.16, 0.79, side * 0.26] satisfies [number, number, number],
            0.006,
            '#bdc2b2',
            5,
          );
        }
      }),
    );
    const point = restaurantPoint(site, u, v),
      footprint = [
        [-0.36, -0.625] satisfies [number, number],
        [0.36, -0.625] satisfies [number, number],
        [0.36, 0.625] satisfies [number, number],
        [-0.36, 0.625] satisfies [number, number],
      ].map(([x, z]) => restaurantPoint(site, ...local(x, z)));
    registerFixture(m, start, {
      x: point[0] - 0.8,
      y: point[1] - 0.8,
      w: 1.6,
      d: 1.6,
      h: 1,
      base,
      rotation: (site.rotation || 0) + turn,
      footprint,
      solid: true,
      preserveGround: true,
      sight: site.sight,
    });
    tables.push({ x: point[0], z: point[1], base, footprint });
    for (const side of [-1, 1] satisfies [number, number]) {
      const [x, z] = restaurantPoint(site, ...local(0, side * 0.4)),
        index = (site.id === 'cotogna' ? 2 : 0) + table * 2 + (side > 0 ? 1 : 0);
      diners.push({
        id: site.id + '-diner-' + index,
        label: contentText('restaurants.createRestaurantPatio.label-13', {
          v0: site.id === 'cotogna' ? 'Cotogna' : 'Rich Table',
        }),
        x,
        z,
        base: base + 0.025,
        height: 1.55,
        angle: (site.rotation || 0) + turn + (side < 0 ? Math.PI / 2 : -Math.PI / 2),
        index,
        hold: 0,
        seed: index * 0.217,
      });
    }
  }
  return { diners, tables };
}

export function drawRestaurantDiners(
  m: Mesh,
  diners: readonly Diner[],
  time: number,
  viewer: readonly number[],
  reduced = false,
  addTarget: (start: number, actor: Actor) => void = () => {},
  visible: (x: number, z: number, base: number) => boolean = () => true,
) {
  const skins = ['#9b7053', '#c19a78', '#c7ac8c', '#805a42'] satisfies [
      string,
      string,
      string,
      string,
    ],
    shirts = ['#647e87', '#a87f6b', '#7d825c', '#9b7985'] satisfies [
      string,
      string,
      string,
      string,
    ];
  for (const diner of diners) {
    if (
      Math.hypot(diner.x - viewer[0], diner.z - viewer[1]) > 28 ||
      !visible(diner.x, diner.z, diner.base)
    )
      continue;
    const start = m.data.length,
      gesture =
        !reduced && diner.gesture && time < diner.gesture.started + diner.gesture.duration
          ? diner.gesture
          : null;
    drawHumanNPC(m, diner, time, {
      x: diner.x,
      z: diner.z,
      base: diner.base,
      angle: diner.angle,
      phase: 0,
      seated: !diner.club,
      skin: diner.skin || skins[diner.index],
      shirt: diner.shirt || shirts[diner.index],
      appearance: {
        mode: diner.club ? 'idle' : 'sit',
        female: diner.label === 'Woman',
        longHair: diner.index === 1,
        hairstyle: diner.index === 3 ? 'curly' : undefined,
        backpack: false,
        pants: '#59605a',
        time: reduced ? 0 : time * 0.001 + diner.seed,
        action: reduced
          ? undefined
          : gesture
            ? gesture.name || undefined
            : diner.club
              ? 'dance'
              : 'eat',
        actionT: gesture
          ? (time - gesture.started) / gesture.duration
          : (time * 0.00019 + diner.seed) % 1,
      },
      reduced: reduced,
    });
    addTarget(start, diner);
  }
}
