import type { WorldPoint } from './types/geometry.ts';
interface SutroPose {
  mode: string;
  motion: number;
  angle: number;
  ladderHeight: number;
}
export interface SutroState {
  active: boolean;
  phase: string;
  progress: number;
  position: (WorldPoint & { y: number }) | null;
  pose: SutroPose | null;
}
import type { Mesh } from './geometry.ts';
import { unit } from './geometry.ts';

// Site coordinates use the same geographic drawing as the surrounding hills.
export const SUTRO_SITE = Object.freeze({
  x: 27.1,
  y: 40.4,
  width: 2.6,
  height: 11.05,
  platformHeight: 7.35,
  horizontalScale: 0.82,
  entry: { x: 28.8, y: 41.2 },
});
const SUTRO_LEVELS = [0, 1, 2.15, 3.25, 4.35, 5.4, 6.4, 7.3] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ],
  SUTRO_RADII = [1.02, 0.94, 0.8, 0.66, 0.56, 0.68, 0.85, 1.02] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
export function sutroLegRadius(y: number) {
  for (let i = 1; i < SUTRO_LEVELS.length; i++)
    if (y <= SUTRO_LEVELS[i]) {
      const t = (y - SUTRO_LEVELS[i - 1]) / (SUTRO_LEVELS[i] - SUTRO_LEVELS[i - 1]);
      return SUTRO_RADII[i - 1] + (SUTRO_RADII[i] - SUTRO_RADII[i - 1]) * t;
    }
  return SUTRO_RADII.at(-1)!;
}

/** Reversible traversal along the actual ladder, followed by a step onto the
 * headframe. Positions are world-space feet heights, independent of the camera. */
export function createSutroClimb({ duration = 7.2 } = {}) {
  const state: SutroState = {
    active: false,
    phase: 'ground',
    progress: 0,
    position: null,
    pose: null,
  };
  let site: (WorldPoint & { base: number }) | null = null,
    start: (WorldPoint & { y: number }) | null = null,
    direction = 0;
  const smooth = (t: number) => {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  };
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  function sample() {
    const p = state.progress,
      scale = SUTRO_SITE.horizontalScale,
      height = SUTRO_SITE.platformHeight;
    const foot = {
      x: site!.x,
      y: site!.base + 0.14,
      z: site!.z - (sutroLegRadius(0.14) + 0.13) * scale - 0.2,
    };
    let position, pose;
    if (p < 0.14) {
      const t = smooth(p / 0.14);
      position = {
        x: mix(start!.x, foot.x, t),
        y: mix(start!.y, foot.y, t),
        z: mix(start!.z, foot.z, t),
      };
      pose = {
        mode: 'move',
        motion: Math.sin(Math.PI * t),
        angle: Math.atan2(foot.z - start!.z, foot.x - start!.x),
        ladderHeight: 0,
      };
    } else if (p < 0.9) {
      const t = (p - 0.14) / 0.76,
        y = mix(0.14, height, smooth(t));
      position = {
        x: site!.x,
        y: site!.base + y,
        z: site!.z - (sutroLegRadius(y) + 0.13) * scale - 0.2,
      };
      pose = {
        mode: 'climb',
        motion: Math.min(smooth(t / 0.075), smooth((1 - t) / 0.075)),
        angle: Math.PI / 2,
        ladderHeight: y - 0.14,
      };
    } else {
      const t = smooth((p - 0.9) / 0.1),
        outside = site!.z - (sutroLegRadius(height) + 0.13) * scale - 0.2;
      position = { x: site!.x, y: site!.base + height, z: mix(outside, site!.z - 0.12, t) };
      pose = {
        mode: 'move',
        motion: Math.sin(Math.PI * t),
        angle: Math.PI / 2,
        ladderHeight: height - 0.14,
      };
    }
    if (direction < 0 && pose.mode === 'move') pose.angle += Math.PI;
    state.position = position;
    state.pose = pose;
  }
  function begin(tower: WorldPoint & { base: number }, entry: WorldPoint & { y: number }) {
    if (state.active) return false;
    site = { ...tower };
    start = { ...entry };
    direction = 1;
    state.active = true;
    state.phase = 'climbing';
    state.progress = 0;
    sample();
    return true;
  }
  function descend() {
    if (!state.active) return false;
    direction = -1;
    state.phase = 'descending';
    return true;
  }
  function update(dt: number) {
    if (!state.active || !direction) return null;
    state.progress = Math.max(
      0,
      Math.min(1, state.progress + (Math.max(0, dt) * direction) / duration),
    );
    sample();
    if (state.progress >= 1 && direction > 0) {
      direction = 0;
      state.phase = 'top';
      state.pose!.motion = 0;
      return 'top';
    }
    if (state.progress <= 0 && direction < 0) {
      direction = 0;
      state.phase = 'ground';
      state.active = false;
      state.pose!.motion = 0;
      return 'ground';
    }
    return null;
  }
  function cancel() {
    const entry = state.active && start ? { ...start } : null;
    state.active = false;
    state.phase = 'ground';
    state.progress = 0;
    state.position = null;
    state.pose = null;
    direction = 0;
    site = null;
    start = null;
    return entry;
  }
  return { state, begin, descend, update, cancel };
}

/** Original low-poly model, referenced to the tower's official photographs.
 * Three splayed legs pinch at the waist, then open into a triangular headframe.
 * Masts and guy wires stay actual geometry so the silhouette survives rotation. */
export function drawSutroTower(m: Mesh, cx: number, base: number, cz: number) {
  const start = m.data.length,
    horizontalScale = SUTRO_SITE.horizontalScale;
  const red = '#c9573e',
    white = '#f0e7ce',
    steel = '#82928b';
  const levels = SUTRO_LEVELS;
  const angle = (leg: number) => -Math.PI / 2 + (leg * Math.PI * 2) / 3;
  const radius = sutroLegRadius;
  const at = (leg: number, y: number, r = radius(y), offset = 0) => {
    const a = angle(leg);
    return [
      cx + Math.cos(a) * r - Math.sin(a) * offset,
      base + y,
      cz + Math.sin(a) * r + Math.cos(a) * offset,
    ] satisfies [number, number, number];
  };
  m.box(cx - 1.48, base - 0.06, cz - 1.48, 2.96, 0.1, 2.96, '#acb29a', 'stone');
  for (let leg = 0; leg < 3; leg++) {
    const foot = at(leg, 0);
    m.box(foot[0] - 0.25, base, foot[2] - 0.25, 0.5, 0.18, 0.5, '#c7c5ab', 'stone');
    for (let bay = 0; bay < levels.length - 1; bay++) {
      const low = levels[bay],
        high = levels[bay + 1],
        color = bay % 2 ? white : red;
      m.rod(at(leg, low), at(leg, high), 0.105, color, 4);
      // Open steel lattice along the outside of each column.
      for (const offset of [-0.105, 0.105] satisfies [number, number])
        m.rod(
          at(leg, low, radius(low), offset),
          at(leg, high, radius(high), offset),
          0.024,
          color,
          4,
        );
      m.rod(at(leg, low, radius(low), -0.105), at(leg, high, radius(high), 0.105), 0.014, color, 4);
      const next = (leg + 1) % 3;
      m.rod(at(leg, low + 0.05), at(next, high - 0.05), 0.012, steel, 4);
      m.rod(at(next, low + 0.05), at(leg, high - 0.05), 0.012, steel, 4);
    }
    // The service ladder follows the changing lean of one leg.
    if (!leg) {
      for (let y = 0.3; y < 7.6; y += 0.28)
        m.rod(
          at(leg, y, radius(y) + 0.13, -0.15),
          at(leg, y, radius(y) + 0.13, 0.15),
          0.011,
          white,
          4,
        );
      for (const side of [-0.15, 0.15] satisfies [number, number]) {
        for (let i = 1; i < levels.length; i++)
          m.rod(
            at(leg, levels[i - 1], radius(levels[i - 1]) + 0.13, side),
            at(leg, levels[i], radius(levels[i]) + 0.13, side),
            0.013,
            white,
            4,
          );
        m.rod(
          at(leg, 7.3, radius(7.3) + 0.13, side),
          at(leg, 8.55, radius(7.3) + 0.13, side),
          0.013,
          white,
          4,
        );
      }
    }
  }
  function frame(y: number, r: number | undefined, color: string, depth = 0.2) {
    for (let leg = 0; leg < 3; leg++) {
      const next = (leg + 1) % 3,
        a = at(leg, y, r),
        b = at(next, y, r),
        A = at(leg, y - depth, r),
        B = at(next, y - depth, r);
      m.rod(a, b, 0.045, color, 5);
      m.rod(A, B, 0.042, color, 5);
      for (let i = 0; i < 4; i++) {
        const t = i / 4,
          u = (i + 1) / 4,
          p = a.map((v, k) => v + (b[k] - v) * t),
          q = A.map((v, k) => v + (B[k] - v) * u);
        m.rod(p, q, 0.019, color, 4);
        m.rod(
          p,
          p.map((v, k) => (k === 1 ? v - depth : v)),
          0.016,
          color,
          4,
        );
      }
    }
  }
  frame(1.03, 0.98, red, 0.22);
  frame(4.35, 0.62, red, 0.22);
  frame(5.75, 0.77, white, 0.13);
  frame(7.35, 1.36, red, 0.24);
  const deck = ([0, 1, 2] satisfies [number, number, number]).map((leg) =>
    at(leg, SUTRO_SITE.platformHeight, 1.34),
  );
  m.tri(deck[0], deck[2], deck[1], '#7e8c83', { metal: 0.2 });
  for (let leg = 0; leg < 3; leg++)
    for (let i = 1; i < 8; i++) {
      const t = i / 8,
        a = deck[leg],
        b = deck[(leg + 1) % 3],
        c = deck[(leg + 2) % 3];
      const along = (p: number[]) => a.map((v, k) => v + (p[k] - v) * t + (k === 1 ? 0.009 : 0));
      m.rod(along(b), along(c), 0.006, '#b6c2b4', 4, { metal: 0.2 });
    }
  for (let leg = 0; leg < 3; leg++) {
    const p = at(leg, 7.35, 1.02),
      tip = 10.55 + leg * 0.2;
    for (let band = 0; band < 8; band++) {
      const y = 7.35 + (band * (tip - 7.35)) / 8,
        r = 0.057 - band * 0.004;
      m.cylinder(p[0], base + y, p[2], r, (tip - 7.35) / 8, band % 2 ? white : red, 6, r * 0.9);
    }
    m.rod(
      [p[0], base + tip, p[2]] satisfies [number, number, number],
      [p[0], base + tip + 0.05, p[2]] satisfies [number, number, number],
      0.013,
      steel,
      5,
    );
    m.sphere(p[0], base + tip + 0.05, p[2], 0.035, 0.035, 0.035, '#df7251', 6, 3);
    // Fine stays fan out to the headframe, retaining the three-prong shape.
    for (let corner = 0; corner < 3; corner++)
      m.rod(
        [p[0], base + tip - 0.35, p[2]] satisfies [number, number, number],
        at(corner, 7.35, 1.36),
        0.008,
        '#a4b0a3',
        4,
      );
    for (let i = 0; i < 5; i++)
      m.rod(
        [p[0], base + 7.7 + i * 0.3, p[2]] satisfies [number, number, number],
        [p[0] + 0.13, base + 7.7 + i * 0.3, p[2]] satisfies [number, number, number],
        0.018,
        white,
        5,
      );
  }
  // A small equipment hut and low perimeter rail give the tower a grounded base.
  m.box(cx - 0.45, base + 0.04, cz + 0.75, 0.9, 0.5, 0.48, '#c4b593', 'stucco');
  m.box(cx - 0.48, base + 0.54, cz + 0.72, 0.96, 0.065, 0.54, '#8a9483', 'roof');
  m.box(cx - 0.34, base + 0.12, cz + 1.235, 0.21, 0.34, 0.015, '#667e73');
  for (let i = 0; i < 5; i++)
    m.box(cx + 0.05, base + 0.16 + i * 0.055, cz + 1.235, 0.25, 0.018, 0.02, '#79877a');
  const corners = [
    [cx - 1.47, cz - 1.47] satisfies [number, number],
    [cx + 1.47, cz - 1.47] satisfies [number, number],
    [cx + 1.47, cz + 1.47] satisfies [number, number],
    [cx - 1.47, cz + 1.47] satisfies [number, number],
  ];
  for (let edge = 0; edge < 4; edge++) {
    const a = corners[edge],
      b = corners[(edge + 1) % 4];
    for (let i = 0; i <= 5; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / 5,
        z = a[1] + ((b[1] - a[1]) * i) / 5;
      if (edge === 0 && Math.abs(x - cx) < 0.4) continue;
      m.rod(
        [x, base + 0.05, z] satisfies [number, number, number],
        [x, base + 0.52, z] satisfies [number, number, number],
        0.016,
        steel,
        4,
      );
    }
    for (const h of [0.24, 0.48] satisfies [number, number]) {
      if (edge === 0) {
        m.rod(
          [a[0], base + h, a[1]] satisfies [number, number, number],
          [cx - 0.4, base + h, a[1]] satisfies [number, number, number],
          0.012,
          steel,
          4,
        );
        m.rod(
          [cx + 0.4, base + h, b[1]] satisfies [number, number, number],
          [b[0], base + h, b[1]] satisfies [number, number, number],
          0.012,
          steel,
          4,
        );
      } else
        m.rod(
          [a[0], base + h, a[1]] satisfies [number, number, number],
          [b[0], base + h, b[1]] satisfies [number, number, number],
          0.012,
          steel,
          4,
        );
    }
    if (edge === 0)
      for (const x of [cx - 0.4, cx + 0.4] satisfies [number, number])
        m.rod(
          [x, base + 0.05, a[1]] satisfies [number, number, number],
          [x, base + 0.55, a[1]] satisfies [number, number, number],
          0.018,
          steel,
          4,
        );
  }
  // Keep the narrow landmark in its hillside parcel without shortening it.
  for (let i = start; i < m.data.length; i += 11) {
    m.data[i] = cx + (m.data[i] - cx) * horizontalScale;
    m.data[i + 2] = cz + (m.data[i + 2] - cz) * horizontalScale;
    const normal = unit([
      m.data[i + 3] / horizontalScale,
      m.data[i + 4],
      m.data[i + 5] / horizontalScale,
    ] satisfies [number, number, number]);
    for (let k = 0; k < 3; k++) m.data[i + 3 + k] = normal[k];
  }
}
