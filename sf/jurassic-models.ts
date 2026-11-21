import type { Actor, SignAtlas } from './types/world.ts';
import { drawBisonHide } from './bison-model.ts';
import { drawJurassicArchitecture, drawRaptorEnclosureGate } from './jurassic-architecture.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawHatModel } from './hat-models.ts';
import { drawPeptideVial } from './guild-models.ts';
import './windows.ts';
import { drawPlaque } from './southern-district.ts';
import { COW_PEN, KRAKEN_CAPE_LINES } from './jurassic-layout.ts';

export const JURASSIC_SIGNS = Object.freeze([
  'JURASSIC BIOSCIENCES',
  'AUTHORIZED PERSONNEL ONLY',
  'THE PEQUOD',
  ...KRAKEN_CAPE_LINES,
]);
export function drawJurassicCampus(m: Mesh, signs: SignAtlas) {
  return drawJurassicArchitecture(m, signs);
}
export function drawRaptorGate(
  m: Mesh,
  game: { raptor: { phase: string } | { phase: string; release: number } },
) {
  return drawRaptorEnclosureGate(m, game);
}
export function drawVelociraptor(
  m: Mesh,
  n: { x: number; z: number; base?: number; angle: number; phase: string },
  time: number,
) {
  pose(m, n.x, n.base || 0, n.z, n.angle, () => {
    const first = m.data.length,
      dead = n.phase === 'dead',
      bounce = dead ? -0.2 : Math.sin(time * 0.009) * 0.025;
    m.sphere(0, 0.85 + bounce, 0, 0.57, 0.31, 0.25, '#7b8860', 16, 9);
    m.sphere(0.48, 1.02 + bounce, 0, 0.24, 0.22, 0.19, '#9aa375', 14, 8);
    m.sphere(0.74, 1.16 + bounce, 0, 0.26, 0.17, 0.14, '#7c8d64', 16, 8);
    m.sphere(0.92, 1.1 + bounce, 0, 0.22, 0.075, 0.13, '#a0aa7c', 12, 6);
    for (const side of [-1, 1] satisfies [number, number]) {
      m.sphere(0.78, 1.21 + bounce, side * 0.128, 0.035, 0.041, 0.012, '#e9ba5d', 10, 6);
      m.sphere(0.79, 1.21 + bounce, side * 0.139, 0.012, 0.028, 0.005, '#27392a', 8, 5);
      for (let i = 0; i < 4; i++)
        m.tri(
          [0.8 + i * 0.075, 1.075, side * 0.08] satisfies [number, number, number],
          [0.83 + i * 0.075, 1.075, side * 0.08] satisfies [number, number, number],
          [0.82 + i * 0.075, 1.03, side * 0.08] satisfies [number, number, number],
          '#eee6be',
        );
    }
    let last = [-0.45, 0.87, 0] satisfies [number, number, number];
    for (let i = 1; i <= 8; i++) {
      const next = [
        -0.45 - i * 0.18,
        0.87 + i * 0.035,
        Math.sin(time * 0.005 - i * 0.35) * i * 0.013,
      ] satisfies [number, number, number];
      m.rod(last, next, 0.17 * (1 - i / 9), '#7e8e62', 10);
      last = next;
    }
    for (const side of [-1, 1] satisfies [number, number]) {
      const stride = dead ? 0 : Math.sin(time * 0.012 + side) * 0.2,
        knee = [-0.1, 0.43, side * 0.22] satisfies [number, number, number],
        foot = [0.12 + stride, 0.1, side * 0.27] satisfies [number, number, number];
      m.rod(
        [-0.22, 0.83, side * 0.14] satisfies [number, number, number],
        knee,
        0.1,
        '#8a9668',
        12,
      );
      m.rod(knee, foot, 0.058, '#a3a679', 10);
      for (let toe = 0; toe < 3; toe++)
        m.rod(
          foot,
          [foot[0] + 0.22, 0.055, foot[2] + (toe - 1) * 0.055] satisfies [number, number, number],
          0.018,
          '#d9c9a2',
          7,
        );
      m.rod(
        [0.36, 0.92, side * 0.15] satisfies [number, number, number],
        [0.53, 0.65, side * 0.31] satisfies [number, number, number],
        0.04,
        '#9fa779',
        9,
      );
      m.rod(
        [0.53, 0.65, side * 0.31] satisfies [number, number, number],
        [0.73, 0.69, side * 0.32] satisfies [number, number, number],
        0.025,
        '#d0c297',
        8,
      );
    }
    for (let i = 0; i < 9; i++)
      m.tri(
        [-0.4 + i * 0.14, 1.1, 0] satisfies [number, number, number],
        [-0.33 + i * 0.14, 1.1, 0] satisfies [number, number, number],
        [-0.43 + i * 0.14, 1.26, 0.015] satisfies [number, number, number],
        '#566c50',
      );
    if (dead)
      for (let i = first; i < m.data.length; i += 11) {
        const y = m.data[i + 1],
          z = m.data[i + 2],
          ny = m.data[i + 4],
          nz = m.data[i + 5];
        m.data[i + 1] = 0.35 - z;
        m.data[i + 2] = y - 0.7;
        m.data[i + 4] = -nz;
        m.data[i + 5] = ny;
      }
  });
}
export function drawCattlePen(m: Mesh, ground: (x: number, z: number) => number) {
  const p = COW_PEN,
    west = p.x - p.w / 2,
    east = p.x + p.w / 2,
    north = p.z - p.d / 2,
    south = p.z + p.d / 2;
  const post = (x: number, z: number) =>
    m.box(x - 0.045, ground(x, z), z - 0.045, 0.09, 0.9, 0.09, '#9b805b', 'wood');
  function fence(ax: number, az: number, bx: number, bz: number) {
    const count = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.3);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      post(ax + (bx - ax) * t, az + (bz - az) * t);
    }
    for (let i = 0; i < count; i++)
      for (const y of [0.35, 0.7] satisfies [number, number]) {
        const t = i / count,
          u = (i + 1) / count,
          x = ax + (bx - ax) * t,
          z = az + (bz - az) * t,
          xx = ax + (bx - ax) * u,
          zz = az + (bz - az) * u;
        m.rod(
          [x, ground(x, z) + y, z] satisfies [number, number, number],
          [xx, ground(xx, zz) + y, zz] satisfies [number, number, number],
          0.035,
          '#a18b65',
          8,
        );
      }
  }
  fence(west, north, east, north);
  fence(west, north, west, south);
  fence(east, north, east, south);
  fence(west, south, p.x - 0.7, south);
  fence(p.x + 0.7, south, east, south);
}
export function drawCow(
  m: Mesh,
  c: {
    x: number;
    z: number;
    base?: number;
    angle?: number;
    motion?: number;
    phase?: number | string;
  },
  time: number,
) {
  pose(m, c.x, c.base || 0, c.z, c.angle ?? 0, () => {
    m.sphere(0, 0.7, 0, 0.58, 0.35, 0.28, '#e7e3cc', 16, 9);
    m.sphere(-0.2, 0.77, 0.16, 0.25, 0.27, 0.13, '#4a5045', 12, 7);
    m.sphere(0.44, 0.92, 0, 0.22, 0.26, 0.2, '#dedcc9', 14, 8);
    m.sphere(0.61, 0.78, 0, 0.16, 0.095, 0.2, '#b99487', 12, 7);
    for (const side of [-1, 1] satisfies [number, number]) {
      m.sphere(0.48, 1.04, side * 0.17, 0.025, 0.035, 0.012, '#273b31', 9, 5);
      m.rod(
        [0.36, 1.1, side * 0.13] satisfies [number, number, number],
        [0.36, 1.3, side * 0.24] satisfies [number, number, number],
        0.035,
        '#d5c79d',
        10,
      );
      m.sphere(0.35, 1.03, side * 0.28, 0.12, 0.05, 0.07, '#b1ac94', 10, 6);
    }
    for (const x of [-0.33, 0.32] satisfies [number, number])
      for (const z of [-0.18, 0.18] satisfies [number, number]) {
        const shift = c.motion
          ? Math.sin((typeof c.phase === 'number' ? c.phase : 0) + (x * z > 0 ? 0 : Math.PI)) * 0.15
          : Math.sin(time * 0.002 + x + z) * 0.015;
        m.rod(
          [x, 0.64, z] satisfies [number, number, number],
          [x + shift, 0.1, z] satisfies [number, number, number],
          0.062,
          '#d5d6bd',
          10,
        );
        m.box(x - 0.065 + shift, 0.025, z - 0.06, 0.13, 0.1, 0.12, '#52594a');
      }
    m.rod(
      [-0.52, 0.7, 0] satisfies [number, number, number],
      [-0.73, 0.35, Math.sin(time * 0.003) * 0.1] satisfies [number, number, number],
      0.022,
      '#b4b69d',
      8,
    );
  });
}
export function drawSpectre(m: Mesh, n: Actor, time: number) {
  pose(m, n.x, (n.base || 0) + 0.16 + Math.sin(time * 0.002 + n.x) * 0.1, n.z, n.angle || 0, () => {
    m.sphere(0, 1.05, 0, 0.34, 0.48, 0.27, '#5eab69', 20, 12, { emissive: 0.12 });
    m.sphere(0.13, 1.4, 0, 0.22, 0.24, 0.19, '#8ac67c', 18, 10);
    m.sphere(0.25, 1.31, 0, 0.16, 0.11, 0.17, '#609958', 14, 8);
    for (const side of [-1, 1] satisfies [number, number]) {
      m.sphere(0.22, 1.45, side * 0.16, 0.05, 0.043, 0.018, '#173d30', 10, 6);
      m.sphere(0.235, 1.45, side * 0.177, 0.018, 0.022, 0.006, '#d2ed84', 9, 6, { emissive: 0.6 });
      let last = [0.02, 1.1, side * 0.23] satisfies [number, number, number];
      for (let i = 1; i <= 5; i++) {
        const q = [
          0.08 + i * 0.09,
          1.12 - i * 0.1 + Math.sin(time * 0.004 + i) * 0.05,
          side * (0.24 + i * 0.045),
        ] satisfies [number, number, number];
        m.rod(last, q, 0.1 * (1 - i / 7), '#74b676', 12);
        last = q;
      }
    }
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      let last = [Math.cos(a) * 0.2, 0.8, Math.sin(a) * 0.18] satisfies [number, number, number];
      for (let j = 1; j <= 4; j++) {
        const q = [
          Math.cos(a) * (0.2 + j * 0.03) + Math.sin(time * 0.003 + i + j) * 0.05,
          0.8 - j * 0.15,
          Math.sin(a) * (0.18 + j * 0.03),
        ] satisfies [number, number, number];
        m.rod(last, q, 0.09 * (1 - j / 5), '#539c68', 10);
        last = q;
      }
    }
  });
}
export function drawPequod(
  m: Mesh,
  ship: { x: number; z: number; aboard?: boolean },
  time: number,
  signs: SignAtlas,
) {
  pose(m, ship.x, 0.04 + Math.sin(time * 0.0014) * 0.035, ship.z, 0, () => {
    for (let i = 0; i < 20; i++) {
      const x = -3 + i * 0.3,
        q = x + 0.3,
        width = (t: number) => Math.max(0.12, Math.sin(((t + 3) / 6) * Math.PI) * 1.2),
        a = width(x),
        b = width(q);
      for (const side of [-1, 1] satisfies [number, number]) {
        m.quad(
          [x, 0.12, side * a * 0.55] satisfies [number, number, number],
          [q, 0.12, side * b * 0.55] satisfies [number, number, number],
          [q, 0.85, side * b] satisfies [number, number, number],
          [x, 0.85, side * a] satisfies [number, number, number],
          '#72533d',
          'wood',
        );
        m.rod(
          [x, 0.85, side * a] satisfies [number, number, number],
          [q, 0.85, side * b] satisfies [number, number, number],
          0.035,
          '#c0a578',
          8,
        );
        m.quad(
          [x, 0.84, 0] satisfies [number, number, number],
          [q, 0.84, 0] satisfies [number, number, number],
          [q, 0.84, side * b] satisfies [number, number, number],
          [x, 0.84, side * a] satisfies [number, number, number],
          '#baa47b',
          'wood',
        );
      }
    }
    m.box(0.8, 0.85, -0.65, 1.3, 0.65, 1.3, '#8b7458', 'wood');
    m.box(0.72, 1.5, -0.73, 1.46, 0.08, 1.46, '#554d3e', 'roof');
    for (const x of [-1.1, 0.4] satisfies [number, number]) {
      m.rod(
        [x, 0.8, 0] satisfies [number, number, number],
        [x, 5.1, 0] satisfies [number, number, number],
        0.055,
        '#8e7958',
        12,
      );
      m.rod(
        [x - 1.3, 4.4, 0] satisfies [number, number, number],
        [x + 1.3, 4.4, 0] satisfies [number, number, number],
        0.04,
        '#a18c65',
        10,
      );
      if (ship.aboard)
        m.rod(
          [x - 1.2, 4.25, 0] satisfies [number, number, number],
          [x + 1.2, 4.25, 0] satisfies [number, number, number],
          0.11,
          '#d2d0b4',
          16,
        );
      else
        m.quad(
          [x - 1.2, 4.35, -0.02] satisfies [number, number, number],
          [x + 1.2, 4.35, -0.02] satisfies [number, number, number],
          [x + 1.05, 2.9, 0.12] satisfies [number, number, number],
          [x - 1.05, 2.9, 0.12] satisfies [number, number, number],
          '#d2d0b4',
        );
      for (const side of [-1, 1] satisfies [number, number])
        m.rod(
          [x, 4.95, 0] satisfies [number, number, number],
          [x + side * 0.5, 0.87, side * 0.85] satisfies [number, number, number],
          0.009,
          '#baaf90',
          5,
        );
    }
    drawPlaque(m, signs, 'THE PEQUOD', 1.45, 1.05, -0.665, 0.9, 0.22, false);
  });
}
export function drawKraken(m: Mesh, n: { x: number; z: number }, time: number) {
  pose(m, n.x, 0.08, n.z, 0, () => {
    m.sphere(0, 0.75, 0, 1.05, 0.75, 0.85, '#657b7a', 24, 14);
    m.sphere(0, 1.15, 0, 0.72, 0.85, 0.62, '#81908a', 24, 14);
    for (const side of [-1, 1] satisfies [number, number]) {
      m.sphere(0.55, 1.37, side * 0.46, 0.16, 0.17, 0.09, '#dcc284', 16, 9);
      m.sphere(0.64, 1.37, side * 0.48, 0.045, 0.12, 0.04, '#263c3e', 12, 8);
    }
    for (let arm = 0; arm < 8; arm++) {
      const a = (arm * Math.PI) / 4;
      let last = [Math.cos(a) * 0.55, 0.35, Math.sin(a) * 0.55] satisfies [number, number, number];
      for (let i = 1; i <= 11; i++) {
        const r = 0.55 + i * 0.23,
          b = a + Math.sin(time * 0.0018 + arm) * i * 0.025,
          q = [
            Math.cos(b) * r,
            0.22 +
              Math.sin(i * 0.38 + time * 0.002 + arm) * 0.32 +
              Math.sin((i / 11) * Math.PI) * 0.55,
            Math.sin(b) * r,
          ] satisfies [number, number, number];
        m.rod(last, q, 0.21 * (1 - i / 13), '#6f8681', 12);
        if (i % 2 === 0) m.sphere(q[0], q[1] + 0.09, q[2], 0.075, 0.035, 0.075, '#b8ad8e', 9, 6);
        last = q;
      }
    }
  });
}
export function drawRailgun(m: Mesh, x: number, y: number, z: number, angle: number) {
  pose(m, x, y, z, angle, () => {
    m.box(-0.13, -0.07, -0.08, 0.65, 0.14, 0.16, '#4c626b', { metal: 0.45 });
    for (const side of [-1, 1] satisfies [number, number])
      m.box(0.05, -0.04, side * 0.1, 0.72, 0.045, 0.035, '#9cbabd', { metal: 0.5 });
    m.box(0.24, -0.025, -0.04, 0.56, 0.05, 0.08, '#85ddeb', { emissive: 0.65 });
    m.box(-0.08, -0.24, -0.045, 0.1, 0.2, 0.09, '#45535c');
  });
}
export function drawBeam(
  m: Mesh,
  beam: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } },
) {
  const a = beam.from,
    b = beam.to;
  m.rod([a.x, a.y, a.z], [b.x, b.y, b.z], 0.045, '#2e9dff', 12, { emissive: 0.9 });
  m.rod([a.x, a.y, a.z], [b.x, b.y, b.z], 0.018, '#c4f3ff', 10, { emissive: 1 });
  m.sphere(b.x, b.y, b.z, 0.1, 0.1, 0.1, '#7fe4ff', 12, 7, { emissive: 0.85 });
}
function drawGooseMembershipCard(m: Mesh, x: number, base: number, z: number) {
  m.box(x - 0.22, base + 0.025, z - 0.14, 0.44, 0.012, 0.28, '#d4bd7c');
  m.box(x - 0.21, base + 0.038, z - 0.13, 0.42, 0.004, 0.26, '#ede5ca');
  m.box(x - 0.21, base + 0.043, z - 0.13, 0.42, 0.004, 0.055, '#31554f');
  // A tiny embossed goose, with no inventory representation to survive pickup.
  m.sphere(x - 0.04, base + 0.05, z + 0.015, 0.085, 0.009, 0.042, '#faf6df', 10, 5);
  m.rod(
    [x + 0.02, base + 0.052, z + 0.01] satisfies [number, number, number],
    [x + 0.065, base + 0.052, z - 0.055] satisfies [number, number, number],
    0.012,
    '#faf6df',
    6,
  );
  m.sphere(x + 0.065, base + 0.053, z - 0.055, 0.023, 0.008, 0.019, '#faf6df', 8, 4);
  m.tri(
    [x + 0.077, base + 0.06, z - 0.067] satisfies [number, number, number],
    [x + 0.115, base + 0.06, z - 0.05] satisfies [number, number, number],
    [x + 0.076, base + 0.06, z - 0.042] satisfies [number, number, number],
    '#d99040',
  );
  for (let i = 0; i < 3; i++)
    m.box(x - 0.15 + i * 0.1, base + 0.045, z + 0.085, 0.07, 0.003, 0.009, '#8f9a7e');
}
export function drawExpeditionLoot(
  m: Mesh,
  item: Pick<
    import('./types/expeditions.ts').ExpeditionLoot,
    'x' | 'z' | 'lootKind' | 'hatId' | 'itemId'
  >,
  base: number,
  time: number | undefined,
) {
  const x = item.x,
    z = item.z;
  if (item.lootKind === 'bison-hide') {
    drawBisonHide(m, x, base, z);
  } else if (item.lootKind === 'goose-membership-card') {
    drawGooseMembershipCard(m, x, base, z);
  } else if (item.lootKind === 'peptides') {
    drawPeptideVial(m, x, base, z, time);
  } else if (item.lootKind === 'equipment') {
    const top = item.itemId === 'ice-top';
    m.box(x - 0.17, base + 0.05, z - 0.13, 0.34, top ? 0.23 : 0.12, 0.26, '#80c9e6');
    for (const side of [-1, 1] satisfies [number, number]) {
      if (top) m.sphere(x + side * 0.2, base + 0.19, z, 0.1, 0.08, 0.1, '#e1faff', 6, 4);
      else m.box(x + side * 0.09 - 0.07, base + 0.05, z + 0.08, 0.14, 0.1, 0.22, '#b3e7f4');
      m.sphere(x + side * 0.09, base + 0.23, z, 0.05, 0.12, 0.05, '#d2f7ff', 5, 4, {
        emissive: 0.12,
      });
    }
  } else if (item.lootKind === 'hat') {
    drawHatModel(m, item.hatId ?? '', x, base + 0.035, z, 0.3, 1.1);
  } else if (item.lootKind === 'iphone') {
    m.box(x - 0.11, base + 0.035, z - 0.18, 0.22, 0.035, 0.36, '#b4bdc3', { metal: 0.4 });
    m.box(x - 0.095, base + 0.071, z - 0.16, 0.19, 0.008, 0.32, '#273e55');
    for (let i = 0; i < 6; i++)
      m.box(
        x - 0.07 + (i % 2) * 0.08,
        base + 0.081,
        z - 0.11 + Math.floor(i / 2) * 0.075,
        0.045,
        0.003,
        0.045,
        (['#80bfc4', '#d9b368', '#8ca6cd'] satisfies [string, string, string])[i % 3],
        { emissive: 0.15 },
      );
    m.sphere(x, base + 0.082, z - 0.14, 0.014, 0.006, 0.014, '#1d242b', 8, 4);
  } else if (item.lootKind === 'sandwich') {
    m.box(x - 0.18, base + 0.03, z - 0.12, 0.36, 0.07, 0.24, '#d8b56c');
    m.box(x - 0.17, base + 0.1, z - 0.12, 0.34, 0.04, 0.24, '#719852');
    m.box(x - 0.18, base + 0.14, z - 0.12, 0.36, 0.07, 0.24, '#e3c48a');
  } else if (item.lootKind === 'raptor') {
    m.sphere(x, base + 0.1, z, 0.32, 0.14, 0.19, '#788964', 14, 8);
    m.rod([x - 0.3, base + 0.1, z], [x - 0.8, base + 0.08, z + 0.15], 0.04, '#adba8f', 10);
  } else if (item.lootKind === 'kraken') {
    m.box(x - 0.27, base + 0.025, z - 0.2, 0.54, 0.24, 0.4, '#8b6b45', 'wood');
    m.box(x - 0.29, base + 0.265, z - 0.22, 0.58, 0.065, 0.44, '#b09865', 'wood');
    for (const dx of [-0.18, 0.18] satisfies [number, number]) {
      m.box(x + dx - 0.025, base + 0.03, z - 0.207, 0.05, 0.23, 0.414, '#bba363', { metal: 0.35 });
      m.box(x + dx - 0.025, base + 0.331, z - 0.22, 0.05, 0.012, 0.44, '#c7ad6a', { metal: 0.35 });
    }
    m.box(x - 0.045, base + 0.14, z + 0.205, 0.09, 0.09, 0.025, '#d2b96d', { metal: 0.5 });
    m.box(x - 0.14, base + 0.343, z - 0.1, 0.28, 0.025, 0.2, '#54647d');
  } else
    for (let i = 0; i < 7; i++)
      m.cylinder(
        x + Math.cos(i * 2.4) * 0.15,
        base + 0.04 + Math.floor(i / 3) * 0.035,
        z + Math.sin(i * 2.4) * 0.12,
        0.075,
        0.025,
        '#e7bd5b',
        12,
        0.075,
        { metal: 0.7 },
      );
}
export function drawKrakenCape(
  m: Mesh,
  x: number,
  z: number,
  base: number,
  angle: number,
  time: number,
  signs: SignAtlas,
) {
  pose(m, x, base, z, angle - Math.PI / 2, () => {
    const top = [-0.21, 1.34, -0.16] satisfies [number, number, number],
      right = [0.21, 1.34, -0.16] satisfies [number, number, number],
      bottomY = 0.36,
      wave = Math.sin(time * 0.004) * 0.035;
    m.quad(
      top,
      [-0.29, bottomY, -0.25 + wave] satisfies [number, number, number],
      [0.29, bottomY, -0.25 + wave] satisfies [number, number, number],
      right,
      '#54647d',
    );
    m.quad(
      right,
      [0.29, bottomY, -0.245 + wave] satisfies [number, number, number],
      [-0.29, bottomY, -0.245 + wave] satisfies [number, number, number],
      top,
      '#657b97',
    );
    for (const [i, line] of KRAKEN_CAPE_LINES.entries()) {
      const uv = signs.get(line),
        y = 1.13 - i * 0.115,
        zz = -0.16 - ((1.34 - y) / 0.98) * (0.09 - wave) - 0.006;
      if (uv)
        m.quad(
          [0.235, y, zz] satisfies [number, number, number],
          [-0.235, y, zz] satisfies [number, number, number],
          [-0.235, y + 0.085, zz + 0.007] satisfies [number, number, number],
          [0.235, y + 0.085, zz + 0.007] satisfies [number, number, number],
          '#ece2c4',
          uv,
        );
    }
  });
}
