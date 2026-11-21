import type { WorldPoint, Point } from './types/geometry.ts';
import { requiredValue } from './types/assert.ts';
export interface FishingLocation {
  entry: Point;
  water: WorldPoint;
  base?: number;
}
import { isFiniteNumber } from './types/json.ts';
import type { Economy } from './types/controllers.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { GAMEPLAY } from './config/gameplay.ts';
import { WATER_LEVEL } from './water-tiles.ts';

export const FISHING_DURATION = GAMEPLAY.fishingSeconds;
export function createFishing(economy: Economy) {
  const state = { active: false, elapsed: 0, site: null as FishingLocation | null };
  function cancel() {
    state.active = false;
    state.elapsed = 0;
    state.site = null;
  }
  function start(site: FishingLocation) {
    if (economy.state.fish)
      return {
        ok: false,
        message: 'You can only carry one live fish.',
      };
    if (state.active) return { ok: false, message: 'Your line is already in the water.' };
    Object.assign(state, { active: true, elapsed: 0, site });
    return { ok: true, message: 'You cast your line. Something is nibbling…' };
  }
  function update(dt: unknown) {
    if (!state.active || !isFiniteNumber(dt) || dt <= 0) return null;
    state.elapsed += dt;
    if (state.elapsed + 1e-9 < FISHING_DURATION) return null;
    const result = economy.trade('catch-fish');
    cancel();
    return {
      ...result,
      message: result.ok
        ? 'You catch a live fish and slip it into a bucket of water.'
        : result.message,
    };
  }
  return {
    state,
    start,
    cancel,
    update,
    get progress() {
      return Math.min(1, state.elapsed / FISHING_DURATION);
    },
  };
}

export function drawLiveFish(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  angle = 0,
  time = 0,
  scale = 1,
) {
  pose(m, x, y, z, angle, () => {
    m.sphere(0, 0, 0, 0.18 * scale, 0.065 * scale, 0.058 * scale, '#8faeab', 16, 8, {
      metal: 0.18,
    });
    m.sphere(
      0.12 * scale,
      0.012 * scale,
      0,
      0.065 * scale,
      0.054 * scale,
      0.055 * scale,
      '#a8c5bd',
      12,
      8,
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.sphere(
        0.14 * scale,
        0.025 * scale,
        side * 0.045 * scale,
        0.012 * scale,
        0.013 * scale,
        0.008 * scale,
        '#233e41',
        8,
        4,
      );
    const wag = Math.sin(time * 8) * 0.045 * scale;
    m.tri(
      [-0.14 * scale, 0, 0] satisfies [number, number, number],
      [-0.29 * scale, 0.085 * scale, wag] satisfies [number, number, number],
      [-0.29 * scale, -0.075 * scale, wag] satisfies [number, number, number],
      '#537e80',
    );
    m.tri(
      [-0.07 * scale, 0.04 * scale, 0] satisfies [number, number, number],
      [0.03 * scale, 0.12 * scale, 0] satisfies [number, number, number],
      [0.09 * scale, 0.04 * scale, 0] satisfies [number, number, number],
      '#638a88',
    );
  });
}
export function drawFishBucket(
  m: Mesh,
  x: number,
  base: number,
  z: number,
  angle = 0,
  time = 0,
  occupied = true,
) {
  pose(m, x, base, z, angle, () => {
    m.cylinder(0, 0, 0, 0.14, 0.28, '#809a9c', 20, 0.18, { metal: 0.22 });
    m.cylinder(0, 0.275, 0, 0.185, 0.025, '#b2c2ba', 24, 0.185, { metal: 0.3 });
    m.cylinder(0, 0.302, 0, 0.155, 0.006, '#669da6', 24, 0.155, { water: 2 });
    for (let i = 0; i < 16; i++) {
      const at = (a: number) =>
        [Math.cos(a) * 0.19, 0.28 + Math.sin(a) * 0.22, 0] satisfies [number, number, number];
      m.rod(at((i * Math.PI) / 16), at(((i + 1) * Math.PI) / 16), 0.009, '#c5c9b6', 6, {
        metal: 0.3,
      });
    }
    if (occupied) drawLiveFish(m, 0, 0.32, 0, Math.sin(time * 0.8) * 0.2, time, 0.55);
  });
}
export function drawFishingSpot(m: Mesh, site: FishingLocation, time: number, reduced = false) {
  const { water, entry } = site,
    t = reduced ? 0 : time * 0.001;
  drawFishBucket(
    m,
    entry.x + 0.25,
    requiredValue(site.base, 'Fishing spot height'),
    entry.y + 0.75,
    0,
    t,
    false,
  );
  m.rod(
    [
      entry.x + 0.3,
      requiredValue(site.base, 'Fishing spot height') + 0.06,
      entry.y + 0.72,
    ] satisfies [number, number, number],
    [
      entry.x + 0.42,
      requiredValue(site.base, 'Fishing spot height') + 0.78,
      entry.y + 0.64,
    ] satisfies [number, number, number],
    0.014,
    '#9d815d',
    10,
  );
  for (let ring = 0; ring < 2; ring++)
    for (let i = 0; i < 24; i++) {
      const r = 0.28 + ring * 0.17 + Math.sin(t * 1.5 + ring) * 0.025,
        at = (a: number) => [
          water.x + Math.cos(a) * r,
          WATER_LEVEL + 0.018,
          water.z + Math.sin(a) * r * 0.55,
        ];
      m.rod(at((i * Math.PI) / 12), at(((i + 1) * Math.PI) / 12), 0.006, '#a3c7bf', 4);
    }
  m.sphere(
    water.x,
    WATER_LEVEL + 0.07 + Math.sin(t * 2) * 0.018,
    water.z,
    0.05,
    0.075,
    0.05,
    '#bf7659',
    12,
    8,
  );
  drawLiveFish(
    m,
    water.x + Math.sin(t * 0.8) * 0.18,
    WATER_LEVEL + 0.035,
    water.z + 0.13,
    t * 0.35,
    t,
    0.8,
  );
}
export function drawFishingRod(
  m: Mesh,
  player: WorldPoint & { site: FishingLocation },
  base: number,
  progress: number,
) {
  const site = player.site,
    dx = site.water.x - player.x,
    dz = site.water.z - player.z,
    angle = Math.atan2(dz, dx),
    distance = Math.hypot(dx, dz),
    lift = Math.sin(progress * Math.PI) * 0.12;
  pose(m, player.x, base, player.z, angle, () => {
    const tip = [1.05, 1.65 + lift, 0] satisfies [number, number, number];
    m.rod(
      [0.35, 0.95, 0.13] satisfies [number, number, number],
      [0.7, 1.28, 0.06] satisfies [number, number, number],
      0.018,
      '#896c4f',
      10,
    );
    m.rod([0.7, 1.28, 0.06] satisfies [number, number, number], tip, 0.012, '#bda574', 8);
    m.sphere(0.42, 1.02, 0.14, 0.045, 0.045, 0.025, '#879b99', 12, 8, { metal: 0.4 });
    m.rod(
      tip,
      [distance, WATER_LEVEL - base + 0.1, 0] satisfies [number, number, number],
      0.003,
      '#d8dfc6',
      4,
    );
  });
  if (progress > 0.67 && progress < 0.96) {
    const f = (progress - 0.67) / 0.29;
    drawLiveFish(
      m,
      site.water.x,
      WATER_LEVEL + 0.13 + Math.sin(f * Math.PI) * 0.5,
      site.water.z,
      angle,
      progress * 10,
    );
  }
}
