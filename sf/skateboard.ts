import { requiredValue } from './types/assert.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export const SKATE_TRICKS = Object.freeze(
  [
    { id: 'ollie', label: contentText('skateboard.module.label-1', {}), key: '1', duration: 0.95 },
    {
      id: 'kickflip',
      label: contentText('skateboard.module.label-2', {}),
      key: '2',
      duration: 1.15,
    },
    {
      id: 'shove-it',
      label: contentText('skateboard.module.label-3', {}),
      key: '3',
      duration: 1.2,
    },
  ].map((value) => Object.freeze(value)),
);
export function sampleSkateTrick(id: string | null, progress: number) {
  const t = Math.max(0, Math.min(1, progress)),
    air = Math.max(0, Math.min(1, (t - 0.18) / 0.64)),
    arc = Math.sin(Math.PI * air),
    turn = air * air * (3 - 2 * air);
  return {
    progress: t,
    height: arc * (id === 'kickflip' ? 0.78 : 0.63),
    drop: arc * 0.1,
    pitch: -0.32 * Math.sin(Math.PI * 2 * air) * arc,
    roll: id === 'kickflip' ? turn * Math.PI * 2 : 0,
    yaw: id === 'shove-it' ? turn * Math.PI * 2 : 0,
  };
}
export function createSkateTricks() {
  const state = { active: false, id: null, elapsed: 0 };
  function start(id: string) {
    if (state.active || !SKATE_TRICKS.some((t) => t.id === id)) return false;
    Object.assign(state, { active: true, id, elapsed: 0 });
    return true;
  }
  function cancel() {
    Object.assign(state, { active: false, id: null, elapsed: 0 });
  }
  function update(dt: number) {
    if (!state.active) return null;
    state.elapsed += Math.max(0, dt);
    const trick = requiredValue(
      SKATE_TRICKS.find((t) => t.id === state.id),
      'active skate trick',
    );
    if (state.elapsed < trick.duration) return null;
    const id = state.id;
    cancel();
    return id;
  }
  return {
    state,
    start,
    cancel,
    update,
    get pose() {
      if (!state.active) return null;
      return sampleSkateTrick(
        state.id,
        state.elapsed /
          requiredValue(
            SKATE_TRICKS.find((t) => t.id === state.id),
            'active skate trick',
          ).duration,
      );
    },
  };
}

/** One small native mesh; the board and rider share the sampled street slope. */
export function drawPlayerSkateboard(
  m: Mesh,
  x: number,
  z: number,
  base: number,
  angle: number,
  travel = 0,
  ground: (value0: number, value1: number) => number = () => base,
  trick:
    | (
        | {
            progress: number;
            height: number;
            drop: number;
            pitch: number;
            roll: number;
            yaw: number;
          }
        | null
        | undefined
      )
    | null = null,
) {
  const heading = angle + (trick?.yaw || 0),
    co = Math.cos(heading),
    si = Math.sin(heading),
    slope =
      Math.atan2(
        ground(x + co * 0.42, z + si * 0.42) - ground(x - co * 0.42, z - si * 0.42),
        0.84,
      ) + (trick?.pitch || 0);
  pose(m, x, base, z, heading, () => {
    const start = m.data.length;
    m.box(-0.43, 0.16, -0.15, 0.86, 0.045, 0.3, '#758e87', 'wood');
    for (const side of [-1, 1] satisfies [number, number])
      m.sphere(side * 0.43, 0.191, 0, 0.14, 0.027, 0.15, '#90a79a', 16, 8);
    m.box(-0.42, 0.207, -0.133, 0.84, 0.009, 0.266, '#3f4c49');
    for (const axle of [-0.32, 0.32] satisfies [number, number]) {
      m.rod(
        [axle, 0.078, -0.21] satisfies [number, number, number],
        [axle, 0.078, 0.21] satisfies [number, number, number],
        0.019,
        '#b6c1b8',
        10,
      );
      m.box(axle - 0.04, 0.1, -0.07, 0.08, 0.055, 0.14, '#a0aca3', { metal: 0.25 });
      for (const side of [-1, 1] satisfies [number, number]) {
        m.rod(
          [axle, 0.075, side * 0.16] satisfies [number, number, number],
          [axle, 0.075, side * 0.23] satisfies [number, number, number],
          0.067,
          '#d5c9a4',
          14,
        );
        const a = travel / 0.067;
        m.rod(
          [axle, 0.075, side * 0.234] satisfies [number, number, number],
          [axle + Math.cos(a) * 0.044, 0.075 + Math.sin(a) * 0.044, side * 0.234] satisfies [
            number,
            number,
            number,
          ],
          0.009,
          '#96927b',
          6,
        );
      }
    }
    const c = Math.cos(slope),
      s = Math.sin(slope),
      cr = Math.cos(trick?.roll || 0),
      sr = Math.sin(trick?.roll || 0);
    for (let i = start; i < m.data.length; i += 11) {
      const x = m.data[i],
        y = 0.18 + (m.data[i + 1] - 0.18) * cr - m.data[i + 2] * sr,
        z = (m.data[i + 1] - 0.18) * sr + m.data[i + 2] * cr,
        nx = m.data[i + 3],
        ny = m.data[i + 4] * cr - m.data[i + 5] * sr,
        nz = m.data[i + 4] * sr + m.data[i + 5] * cr;
      m.data[i] = x * c - y * s;
      m.data[i + 1] = x * s + y * c - (trick?.drop || 0);
      m.data[i + 2] = z;
      m.data[i + 3] = nx * c - ny * s;
      m.data[i + 4] = nx * s + ny * c;
      m.data[i + 5] = nz;
    }
  });
}
