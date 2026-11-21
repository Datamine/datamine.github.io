import { isFiniteNumber } from './types/json.ts';
import type { WorldPoint } from './types/geometry.ts';
import type { Appearance } from './types/content.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawCharacter } from './characters.ts';
import { westernCoastX } from './coastline.ts';

export const PACIFICA_SURF_SPOT = Object.freeze({
  z: 121.5,
  launchDistance: 1.6,
  north: 108,
  south: 143,
});
export const SURF_TRICKS = Object.freeze(
  [
    { id: 'air-360', label: contentText('surfing.module.label-1', {}), key: '1', duration: 1.05 },
    { id: 'kickflip', label: contentText('surfing.module.label-2', {}), key: '2', duration: 1.1 },
    { id: 'backflip', label: contentText('surfing.module.label-3', {}), key: '3', duration: 1.2 },
  ].map((value) => Object.freeze(value)),
);
export function sampleSurfWave(seconds: number, index: number, z: number = PACIFICA_SURF_SPOT.z) {
  const offshore = 1.4 + ((((index * 2.4 - seconds * 0.22) % 9.6) + 9.6) % 9.6),
    fade = Math.max(0, Math.min(1, (offshore - 1.4) / 0.55, (11 - offshore) / 0.6));
  return { x: westernCoastX(z) - offshore, z, offshore, height: 0.4 * fade };
}
/** Riding a wave follows the authored coastline, with the same water segment
 * rule used for paddling. Tricks never alter collision or teleport the rider. */
export function createSurfing({
  water = (x: number, z: number) => x < westernCoastX(z),
  segment = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    water(a.x, a.z) && water(b.x, b.z),
} = {}) {
  const state = {
    active: false,
    phase: 'paddling',
    ride: null as {
      elapsed: number;
      duration: number;
      startZ: number;
      offshore: number;
      fromOffshore: number;
      direction: number;
    } | null,
    trick: null as ((typeof SURF_TRICKS)[number] & { elapsed: number }) | null,
    position: null as WorldPoint | null,
    angle: Math.PI / 2,
    settle: 0,
  };
  function stop() {
    state.active = false;
    state.phase = 'paddling';
    state.ride = null;
    state.trick = null;
    state.position = null;
    state.settle = 0;
  }
  function start(position: WorldPoint) {
    stop();
    state.active = true;
    state.position = { ...position };
  }
  function nearby(position: WorldPoint, seconds: number) {
    if (
      !state.active ||
      position.z < PACIFICA_SURF_SPOT.north ||
      position.z > PACIFICA_SURF_SPOT.south ||
      !water(position.x, position.z)
    )
      return null;
    return (
      Array.from({ length: 4 }, (_, i) => sampleSurfWave(seconds, i, position.z))
        .filter((w) => w.height > 0.08 && Math.abs(w.x - position.x) < 1.7)
        .sort((a, b) => Math.abs(a.x - position.x) - Math.abs(b.x - position.x))[0] || null
    );
  }
  function catchWave(position: WorldPoint, seconds: number) {
    if (state.ride || state.settle > 0) return false;
    const wave = nearby(position, seconds);
    if (!wave) return false;
    state.position = { ...position };
    state.phase = 'riding';
    state.angle = Math.PI / 2;
    state.ride = {
      elapsed: 0,
      duration: 6.4,
      startZ: position.z,
      offshore: wave.offshore,
      fromOffshore: westernCoastX(position.z) - position.x,
      direction: 1,
    };
    return true;
  }
  function cancelRide() {
    if (state.ride) state.settle = 0.4;
    state.ride = null;
    state.trick = null;
    state.phase = 'paddling';
  }
  function steer(x: unknown, z: unknown) {
    if (!state.ride || !isFiniteNumber(x) || !isFiniteNumber(z)) return false;
    if (Math.abs(z - state.position!.z) > 0.5)
      state.ride.direction = z > state.position!.z ? 1 : -1;
    return true;
  }
  function trick(id: unknown) {
    const t = SURF_TRICKS.find((t) => t.id === id),
      r = state.ride;
    if (!t || !r || state.trick || r.elapsed < 0.4 || r.duration - r.elapsed < t.duration + 0.1)
      return false;
    state.trick = { ...t, elapsed: 0 };
    return true;
  }
  function update(dt: unknown) {
    const events: ({ type: 'finish' } | { type: 'trick'; label: string })[] = [],
      r = state.ride;
    if (!isFiniteNumber(dt) || dt <= 0) return events;
    if (!r) {
      state.settle = Math.max(0, state.settle - dt);
      return events;
    }
    // Small steps preserve the same shoreline collision at any frame rate.
    let remaining = Math.min(dt, 30);
    while (remaining > 1e-8 && state.ride) {
      const step = Math.min(0.05, remaining);
      remaining -= step;
      r.elapsed = Math.min(r.duration, r.elapsed + step);
      const z = state.position!.z + r.direction * 3.6 * step,
        b = Math.min(1, r.elapsed / 0.4),
        blend = b * b * (3 - 2 * b),
        offshore = r.fromOffshore * (1 - blend) + (r.offshore - r.elapsed * 0.22) * blend,
        next = { x: westernCoastX(z) - offshore, z };
      if (!water(next.x, next.z) || !segment(state.position!, next) || offshore < 1.2) {
        cancelRide();
        events.push({ type: 'finish' });
        break;
      }
      const heading = Math.atan2(next.z - state.position!.z, next.x - state.position!.x);
      state.position = next;
      state.angle += Math.max(
        -step * 4,
        Math.min(
          step * 4,
          Math.atan2(Math.sin(heading - state.angle), Math.cos(heading - state.angle)),
        ),
      );
      if (state.trick) {
        state.trick.elapsed = Math.min(state.trick.duration, state.trick.elapsed + step);
        if (state.trick.elapsed >= state.trick.duration - 1e-8) {
          const t = state.trick;
          state.trick = null;
          events.push({ type: 'trick', label: t.label });
        }
      }
      if (r.elapsed >= r.duration - 1e-8) {
        cancelRide();
        events.push({ type: 'finish' });
      }
    }
    return events;
  }
  const poseAt = () => {
    const r = state.ride,
      t = state.trick,
      p = t ? t.elapsed / t.duration : 0,
      stand = r ? Math.min(1, r.elapsed / 0.4) : state.settle / 0.4;
    return {
      stand,
      height:
        (r ? 0.16 * stand + 0.18 * Math.sin((Math.PI * r.elapsed) / r.duration) : 0.16 * stand) +
        (t ? Math.sin(Math.PI * p) * 1.55 : 0),
      yaw: t?.id === 'air-360' ? Math.PI * 2 * p : 0,
      roll: t?.id === 'kickflip' ? Math.PI * 2 * p : 0,
      pitch: t?.id === 'backflip' ? -Math.PI * 2 * p : 0,
      trickProgress: p,
    };
  };
  return {
    state,
    start,
    stop,
    nearby,
    catchWave,
    cancelRide,
    steer,
    trick,
    update,
    get pose() {
      return poseAt();
    },
  };
}

export function drawSurfboard(m: Mesh, color = '#6c9da7') {
  const rim = (i: number, y: number, scale = 1) => {
    const a = (i * Math.PI) / 16;
    return [
      Math.cos(a) * (Math.cos(a) > 0 ? 1.05 : 0.94) * scale,
      y,
      Math.sin(a) * 0.25 * scale,
    ] satisfies [number, number, number];
  };
  for (let i = 0; i < 32; i++) {
    m.quad(rim(i + 1, 0.035), rim(i, 0.035), rim(i, 0.105, 0.96), rim(i + 1, 0.105, 0.96), color);
    m.tri(
      [0, 0.105, 0] satisfies [number, number, number],
      rim(i + 1, 0.105, 0.96),
      rim(i, 0.105, 0.96),
      '#e6dfc7',
    );
    m.tri(
      [0, 0.035, 0] satisfies [number, number, number],
      rim(i, 0.035),
      rim(i + 1, 0.035),
      color,
    );
  }
  m.box(-0.6, 0.108, -0.15, 0.66, 0.009, 0.3, color, 'roof');
  m.box(-0.48, 0.118, -0.012, 1.2, 0.008, 0.024, color);
  for (const z of [-0.12, 0, 0.12] satisfies [number, number, number])
    m.tri(
      [-0.73, 0.035, z] satisfies [number, number, number],
      [-0.87, -0.12, z] satisfies [number, number, number],
      [-0.49, 0.035, z] satisfies [number, number, number],
      '#445e62',
    );
}
export function drawSurfRack(m: Mesh, { x, z, base }: WorldPoint & { base: number }) {
  pose(m, x, base, z, 0, () => {
    for (const zz of [-0.8, 0.8] satisfies [number, number]) {
      m.rod(
        [0.14, 0, zz] satisfies [number, number, number],
        [0.14, 1.8, zz] satisfies [number, number, number],
        0.035,
        '#876f52',
        10,
      );
      m.rod(
        [-0.2, 0.14, zz] satisfies [number, number, number],
        [0.32, 0.14, zz] satisfies [number, number, number],
        0.028,
        '#876f52',
        8,
      );
    }
    m.rod(
      [0.14, 1.1, -0.85] satisfies [number, number, number],
      [0.14, 1.1, 0.85] satisfies [number, number, number],
      0.035,
      '#876f52',
      10,
    );
    for (const [i, color] of (
      ['#d99469', '#6ca8af', '#d0b963'] satisfies [string, string, string]
    ).entries()) {
      const start = m.data.length;
      drawSurfboard(m, color);
      for (let k = start; k < m.data.length; k += 11) {
        const xx = m.data[k],
          yy = m.data[k + 1],
          nx = m.data[k + 3],
          ny = m.data[k + 4];
        m.data[k] = -0.03 - yy;
        m.data[k + 1] = 1.1 + xx;
        m.data[k + 2] += (i - 1) * 0.58;
        m.data[k + 3] = -ny;
        m.data[k + 4] = nx;
      }
    }
  });
}
export function drawWaveSurfer(
  m: Mesh,
  x: number,
  z: number,
  base: number,
  angle: number,
  time: number,
  surfPose: Pick<
    ReturnType<typeof createSurfing>['pose'],
    'stand' | 'yaw' | 'roll' | 'pitch' | 'trickProgress'
  >,
  {
    appearance = {},
    moving = false,
    reduced = false,
  }: { appearance?: Appearance; moving?: boolean; reduced?: boolean } = {},
) {
  pose(m, x, base, z, angle + surfPose.yaw, () => {
    const start = m.data.length;
    drawSurfboard(m, '#6da6ad');
    if (surfPose.roll) {
      const c = Math.cos(surfPose.roll),
        s = Math.sin(surfPose.roll);
      for (let i = start; i < m.data.length; i += 11) {
        const y = m.data[i + 1] - 0.075,
          z = m.data[i + 2],
          ny = m.data[i + 4],
          nz = m.data[i + 5];
        m.data[i + 1] = 0.075 + y * c - z * s;
        m.data[i + 2] = y * s + z * c;
        m.data[i + 4] = ny * c - nz * s;
        m.data[i + 5] = ny * s + nz * c;
      }
    }
    const rider = m.data.length,
      blend = surfPose.stand;
    drawCharacter(
      m,
      0,
      0,
      0,
      0,
      0,
      false,
      appearance.skin || '#b78e6c',
      appearance.shirt || '#4e7079',
      {
        ...appearance,
        mode: blend ? 'surfboard' : 'paddle',
        time: reduced ? 0 : time * 0.001,
        backpack: false,
        cap: false,
        motion: 0,
        action: surfPose.roll ? 'skate-trick' : undefined,
        actionT: surfPose.trickProgress,
      },
    );
    const a = (-(1 - blend) * Math.PI) / 2,
      c = Math.cos(a),
      s = Math.sin(a);
    m.characters?.transform(
      rider,
      new Float32Array([
        c,
        s,
        0,
        0,
        -s,
        c,
        0,
        0,
        0,
        0,
        1,
        0,
        0.85 * s,
        0.85 - 0.85 * c - 0.6 * (1 - blend) + 0.1 * blend,
        0,
        1,
      ] satisfies [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ]),
    );
    for (let i = rider; i < m.data.length; i += 11) {
      const x = m.data[i],
        y = m.data[i + 1] - 0.85,
        nx = m.data[i + 3],
        ny = m.data[i + 4];
      m.data[i] = x * c - y * s;
      m.data[i + 1] = x * s + y * c + 0.85 - 0.6 * (1 - blend) + 0.1 * blend;
      m.data[i + 3] = nx * c - ny * s;
      m.data[i + 4] = nx * s + ny * c;
    }
    if (surfPose.pitch) {
      const c = Math.cos(surfPose.pitch),
        s = Math.sin(surfPose.pitch);
      m.characters?.transform(
        start,
        new Float32Array([
          c,
          s,
          0,
          0,
          -s,
          c,
          0,
          0,
          0,
          0,
          1,
          0,
          0.75 * s,
          0.75 - 0.75 * c,
          0,
          1,
        ] satisfies [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
      for (let i = start; i < m.data.length; i += 11) {
        const x = m.data[i],
          y = m.data[i + 1] - 0.75,
          nx = m.data[i + 3],
          ny = m.data[i + 4];
        m.data[i] = x * c - y * s;
        m.data[i + 1] = x * s + y * c + 0.75;
        m.data[i + 3] = nx * c - ny * s;
        m.data[i + 4] = nx * s + ny * c;
      }
    }
    if (moving && !surfPose.pitch)
      for (const side of [-1, 1] satisfies [number, number])
        m.rod(
          [-1.1, 0.02, side * 0.2] satisfies [number, number, number],
          [-1.6, 0.015, side * 0.32] satisfies [number, number, number],
          0.013,
          '#c9e0d8',
          4,
        );
  });
}
export function drawPacificaWaves(m: Mesh, time: number, viewer: WorldPoint) {
  if (viewer.z < 80 || viewer.z > 170 || viewer.x > 40) return;
  // These crests are gameplay targets, so they follow the simulation clock
  // even when decorative character motion is reduced.
  const seconds = time * 0.001,
    slices = Math.ceil((PACIFICA_SURF_SPOT.south - PACIFICA_SURF_SPOT.north) / 0.7);
  // Both sides of a slice use the same endpoint profile as their neighbors.
  // Taper the width as well as the height so the ends dissolve into the sea.
  const endpoint = (wave: number, z: number) => {
    const w = sampleSurfWave(seconds, wave, z),
      t = Math.max(
        0,
        Math.min(1, (z - PACIFICA_SURF_SPOT.north) / 3, (PACIFICA_SURF_SPOT.south - z) / 3),
      ),
      fade = t * t * (3 - 2 * t);
    return { ...w, fade, y: 0.025 + (0.035 + w.height) * fade };
  };
  for (let wave = 0; wave < 4; wave++)
    for (let i = 0; i < slices; i++) {
      const z = PACIFICA_SURF_SPOT.north + i * 0.7,
        zz = Math.min(PACIFICA_SURF_SPOT.south, PACIFICA_SURF_SPOT.north + (i + 1) * 0.7),
        a = endpoint(wave, z),
        b = endpoint(wave, zz);
      if (Math.hypot(a.x - viewer.x, z - viewer.z) > 36 || a.height < 0.02) continue;
      m.quad(
        [a.x - 0.8 * a.fade, 0.025, z] satisfies [number, number, number],
        [b.x - 0.8 * b.fade, 0.025, zz] satisfies [number, number, number],
        [b.x, b.y, zz] satisfies [number, number, number],
        [a.x, a.y, z] satisfies [number, number, number],
        '#7daeb0',
        { water: 0.25 },
      );
      m.quad(
        [a.x, a.y, z] satisfies [number, number, number],
        [b.x, b.y, zz] satisfies [number, number, number],
        [b.x + 0.4 * b.fade, 0.025, zz] satisfies [number, number, number],
        [a.x + 0.4 * a.fade, 0.025, z] satisfies [number, number, number],
        '#94c0bb',
        { water: 0.25 },
      );
      m.quad(
        [a.x - 0.035 * a.fade, a.y + 0.01 * a.fade, z] satisfies [number, number, number],
        [b.x - 0.035 * b.fade, b.y + 0.01 * b.fade, zz] satisfies [number, number, number],
        [b.x + 0.045 * b.fade, b.y + 0.01 * b.fade, zz] satisfies [number, number, number],
        [a.x + 0.045 * a.fade, a.y + 0.01 * a.fade, z] satisfies [number, number, number],
        '#d1e6dd',
      );
    }
}
