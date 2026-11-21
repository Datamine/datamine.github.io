import type { RenderedSite, SignAtlas } from './types/world.ts';

// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { drawPlaque } from './southern-district.ts';

// Authored world coordinates: west of Lake Merced, and between Second/Third.
export const SF_ZOO = Object.freeze({
  x: 18.3,
  z: 90,
  w: 5.6,
  d: 8.4,
  cage: { x: 18.8, z: 90.5, w: 3.6, d: 4.2 },
  entry: { x: 15.5, y: 90 },
  exit: { x: 15.9, y: 90 },
  wardens: [
    { x: 15.6, y: 86 },
    { x: 15.3, y: 86.9 },
  ],
});
export const UCSF_HOSPITAL = Object.freeze({
  x: 78,
  z: 90,
  w: 4.5,
  d: 5.6,
  entry: { x: 74.7, y: 89.5 },
});
export const ZOO_PATHS = Object.freeze([
  {
    name: contentText('zoo.module.name-1', {}),
    points: [
      [14.46, 86.5] satisfies [number, number],
      [16.2, 86.5] satisfies [number, number],
      [16.2, 90.5] satisfies [number, number],
      [16.2, 95.4] satisfies [number, number],
    ],
    w: 0.32,
  },
  {
    name: contentText('zoo.module.name-2', {}),
    points: [
      [74.60240963855422, 90] satisfies [number, number],
      [75.6, 90] satisfies [number, number],
    ],
    w: 0.36,
  },
]);

function zooBounds(m: Mesh, start: number) {
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return { start, count: m.data.length - start, lo, hi };
}
function zooFence(
  m: Mesh,
  x: number,
  z: number,
  w: number,
  d: number,
  base: number,
  { gate = false } = {},
) {
  const west = x - w / 2,
    east = x + w / 2,
    north = z - d / 2,
    south = z + d / 2;
  for (const [a, b] of [
    [[west, north] satisfies [number, number], [east, north] satisfies [number, number]],
    [[east, north] satisfies [number, number], [east, south] satisfies [number, number]],
    [[east, south] satisfies [number, number], [west, south] satisfies [number, number]],
    [[west, south] satisfies [number, number], [west, north] satisfies [number, number]],
  ]) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.22);
    for (let i = 0; i <= n; i++) {
      const xx = a[0] + ((b[0] - a[0]) * i) / n,
        zz = a[1] + ((b[1] - a[1]) * i) / n;
      if (gate && xx === west && Math.abs(zz - z) < 0.65) continue;
      m.rod(
        [xx, base + 0.12, zz] satisfies [number, number, number],
        [xx, base + 2.4, zz] satisfies [number, number, number],
        0.017,
        '#63746a',
        8,
      );
    }
    for (const y of [0.15, 1.25, 2.4] satisfies [number, number, number]) {
      if (gate && a[0] === west && b[0] === west) {
        for (const sign of [-1, 1] satisfies [number, number])
          m.rod(
            [west, base + y, z + sign * 0.65] satisfies [number, number, number],
            [west, base + y, z + (sign * d) / 2] satisfies [number, number, number],
            0.035,
            '#63746a',
            8,
          );
      } else
        m.rod(
          [a[0], base + y, a[1]] satisfies [number, number, number],
          [b[0], base + y, b[1]] satisfies [number, number, number],
          0.035,
          '#63746a',
          8,
        );
    }
  }
}

export function drawZooAndHospital(
  m: Mesh,
  ground: (x: number, z: number) => number,
  signs: SignAtlas,
) {
  const sites: RenderedSite[] = [],
    c = SF_ZOO.cage,
    base = ground(c.x, c.z);
  let start = m.data.length;
  m.box(
    c.x - c.w / 2 - 0.08,
    base - 0.08,
    c.z - c.d / 2 - 0.08,
    c.w + 0.16,
    0.13,
    c.d + 0.16,
    '#839266',
    'grass',
  );
  zooFence(m, c.x, c.z, c.w, c.d, base, { gate: true });
  m.sphere(c.x + 0.6, base + 0.23, c.z + 1.1, 0.6, 0.32, 0.47, '#91937b', 18, 10, 'stone');
  m.rod(
    [c.x - 0.5, base + 0.2, c.z + 0.8] satisfies [number, number, number],
    [c.x + 0.6, base + 0.27, c.z + 0.4] satisfies [number, number, number],
    0.14,
    '#836d4a',
    12,
    'wood',
  );
  m.box(c.x + 0.55, base + 0.05, c.z - 1.25, 0.65, 0.12, 0.52, '#898e7b', 'stone');
  m.box(c.x + 0.6, base + 0.177, c.z - 1.2, 0.55, 0.008, 0.42, '#699a9d', { water: 0.5 });
  sites.push({
    id: 'zoo',
    kind: 'zoo',
    label: contentText('zoo.drawZooAndHospital.label-3', {}),
    entry: { ...SF_ZOO.entry },
    description: contentText('zoo.drawZooAndHospital.description-4', {}),
    base,
    ...zooBounds(m, start),
    footprint: [
      [c.x - c.w / 2, c.z - c.d / 2] satisfies [number, number],
      [c.x + c.w / 2, c.z - c.d / 2] satisfies [number, number],
      [c.x + c.w / 2, c.z + c.d / 2] satisfies [number, number],
      [c.x - c.w / 2, c.z + c.d / 2] satisfies [number, number],
    ],
  });
  start = m.data.length;
  const hut = { x: 18.7, z: 86.8, w: 2.3, d: 1.45 },
    h = ground(hut.x, hut.z);
  m.box(hut.x - hut.w / 2, h, hut.z - hut.d / 2, hut.w, 1.55, hut.d, '#c4a778', 'stucco');
  m.quad(
    [hut.x - 1.3, h + 1.55, hut.z - 0.85] satisfies [number, number, number],
    [hut.x + 1.3, h + 1.55, hut.z - 0.85] satisfies [number, number, number],
    [hut.x + 1.3, h + 2.05, hut.z] satisfies [number, number, number],
    [hut.x - 1.3, h + 2.05, hut.z] satisfies [number, number, number],
    '#667c60',
    'shingles',
  );
  m.quad(
    [hut.x - 1.3, h + 2.05, hut.z] satisfies [number, number, number],
    [hut.x + 1.3, h + 2.05, hut.z] satisfies [number, number, number],
    [hut.x + 1.3, h + 1.55, hut.z + 0.85] satisfies [number, number, number],
    [hut.x - 1.3, h + 1.55, hut.z + 0.85] satisfies [number, number, number],
    '#74896a',
    'shingles',
  );
  drawFacadeWindow(m, {
    isX: true,
    far: true,
    plane: hut.x - hut.w / 2 - 0.01,
    along: hut.z - 0.35,
    y: h + 0.5,
    w: 0.7,
    h: 0.65,
    style: 'storefront',
    trim: '#efe2bb',
  });
  sites.push({
    id: 'zoo-office',
    kind: 'scenery',
    label: contentText('zoo.drawZooAndHospital.label-5', {}),
    entry: { x: 16.4, y: 86.3 },
    description: contentText('zoo.drawZooAndHospital.description-6', {}),
    base: h,
    ...zooBounds(m, start),
  });
  // The visitor gate, bamboo beds and signs sit outside the tiger enclosure.
  for (const z of [85.8, 87.2] satisfies [number, number])
    m.cylinder(16.15, ground(16.15, z), z, 0.085, 2.2, '#8b7855', 12, 0.085, 'wood');
  pose(m, 16.15, ground(16.15, 86.5) + 1.65, 86.5, Math.PI / 2, () =>
    drawPlaque(m, signs, 'SF ZOO', 0, 0, 0.02, 1.4, 0.45),
  );
  pose(m, c.x - c.w / 2 - 0.08, base + 0.8, c.z - 1.25, Math.PI / 2, () =>
    drawPlaque(m, signs, 'TIGER', 0, 0, 0.02, 0.85, 0.3),
  );
  for (const [x, z] of [
    [20.7, 87.7] satisfies [number, number],
    [20.8, 93.2] satisfies [number, number],
    [17.4, 93.5] satisfies [number, number],
  ])
    for (let i = 0; i < 4; i++) {
      const xx = x + i * 0.07,
        zz = z + (i % 2) * 0.15,
        b = ground(xx, zz);
      m.cylinder(xx, b, zz, 0.023, 0.8 + i * 0.13, '#78965b', 8);
      m.sphere(xx + 0.08, b + 0.85, zz, 0.2, 0.12, 0.07, '#78965b', 8, 5);
    }
  start = m.data.length;
  const s = UCSF_HOSPITAL,
    hospitalBase = ground(s.x, s.z);
  pose(m, s.x, hospitalBase, s.z, Math.PI / 2, () => {
    m.box(-2.8, 0, -2.25, 5.6, 3.5, 4.5, '#f2f1e8', 'concrete');
    m.box(-1.2, 3.5, -1.8, 2.4, 1.0, 3.4, '#eee9e4', 'concrete');
    m.box(-2.9, 3.45, -2.35, 5.8, 0.13, 4.7, '#b84d4a', 'stone');
    m.box(-1.28, 4.48, -1.88, 2.56, 0.12, 3.56, '#b84d4a', 'stone');
    for (const side of [-1, 1] satisfies [number, number])
      for (let floor = 0; floor < 3; floor++)
        for (let i = 0; i < 5; i++) {
          if (side === 1 && ((floor === 0 && i === 2) || (floor === 1 && i >= 1 && i <= 3)))
            continue;
          drawFacadeWindow(m, {
            plane: side * 2.26,
            far: side < 0,
            along: -2.45 + i * 1.05,
            y: 0.35 + floor * 1.02,
            w: 0.68,
            h: 0.66,
            style: 'office',
            trim: '#eee8df',
            seed: floor * 9 + i,
          });
        }
    for (const side of [-1, 1] satisfies [number, number])
      for (let floor = 0; floor < 3; floor++)
        for (let i = 0; i < 4; i++)
          drawFacadeWindow(m, {
            isX: true,
            plane: side * 2.81,
            far: side < 0,
            along: -1.9 + i * 0.95,
            y: 0.35 + floor * 1.02,
            w: 0.6,
            h: 0.66,
            style: 'office',
            trim: '#eee8df',
            seed: i + 5,
          });
    m.box(-0.52, 0.02, 2.26, 1.04, 1.45, 0.035, '#668b99', 'glass');
    m.box(-0.035, 0.04, 2.3, 0.07, 1.4, 0.025, '#dce4dc');
    m.box(-1.3, 1.55, 2.2, 2.6, 0.12, 0.65, '#b94743', { metal: 0.1 });
    m.box(-1.3, 1.7, 2.275, 2.6, 0.45, 0.04, '#9c3838');
    drawPlaque(m, signs, 'UCSF HOSPITAL', 0, 1.75, 2.32, 2.45, 0.34);
    for (const y of [1.12, 2.14] satisfies [number, number])
      m.box(-2.82, y, -2.27, 5.64, 0.1, 4.54, '#bf514b');
    // A red medical cross on a pale plaque above the entrance.
    m.box(-0.44, 3.64, 1.615, 0.88, 0.82, 0.025, '#f0ede0');
    m.box(-0.11, 3.76, 1.65, 0.22, 0.56, 0.035, '#ce443c');
    for (const x of [-0.28, 0.11] satisfies [number, number])
      m.box(x, 3.93, 1.65, 0.17, 0.22, 0.035, '#ce443c');
    // Compact rooftop landing pad: a painted ring, H and four edge lights.
    m.cylinder(0, 4.6, -0.1, 1.1, 0.06, '#526c68', 48, 1.1, 'concrete');
    for (let i = 0; i < 48; i++) {
      const a = (i * Math.PI) / 24,
        b = ((i + 1) * Math.PI) / 24,
        at = (angle: number, r: number) =>
          [Math.cos(angle) * r, 4.665, -0.1 + Math.sin(angle) * r] satisfies [
            number,
            number,
            number,
          ];
      m.quad(at(a, 0.96), at(a, 0.91), at(b, 0.91), at(b, 0.96), '#eee5bc');
    }
    for (const x of [-0.34, 0.2] satisfies [number, number])
      m.box(x, 4.668, -0.55, 0.14, 0.008, 0.9, '#eee5bc');
    m.box(-0.2, 4.668, -0.17, 0.4, 0.008, 0.14, '#eee5bc');
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      m.sphere(
        Math.cos(a) * 1.04,
        4.68,
        -0.1 + Math.sin(a) * 1.04,
        0.035,
        0.025,
        0.035,
        '#e7c77c',
        8,
        4,
        { emissive: 0.35 },
      );
    }
    for (const x of [-2.3, 1.7] satisfies [number, number]) {
      m.box(x, 3.62, -1.65, 0.65, 0.35, 0.8, '#7c8c8e', { metal: 0.15 });
      for (let i = 0; i < 5; i++)
        m.box(x + 0.04, 3.99, -1.6 + i * 0.14, 0.57, 0.015, 0.025, '#b4c1bb');
    }
  });
  sites.push({
    id: 'ucsf',
    kind: 'hospital',
    label: contentText('zoo.drawZooAndHospital.label-7', {}),
    entry: { ...s.entry },
    description: contentText('zoo.drawZooAndHospital.description-8', {}),
    base: hospitalBase,
    ...zooBounds(m, start),
    footprint: [
      [s.x - s.w / 2, s.z - s.d / 2] satisfies [number, number],
      [s.x + s.w / 2, s.z - s.d / 2] satisfies [number, number],
      [s.x + s.w / 2, s.z + s.d / 2] satisfies [number, number],
      [s.x - s.w / 2, s.z + s.d / 2] satisfies [number, number],
    ],
  });
  return sites;
}

export function drawTigerGate(m: Mesh, base: number, open: number) {
  m.box(16.45, base, 89.32, 0.13, 0.8, 0.16, '#6b7f70', { metal: 0.1 });
  m.sphere(16.45, base + 0.85, 89.4, 0.1, 0.1, 0.1, '#bd6951', 10, 6);
  const c = SF_ZOO.cage;
  pose(m, c.x - c.w / 2, base, c.z - 0.65, open * Math.PI * 0.55, () => {
    for (const y of [0.15, 1.25, 2.4] satisfies [number, number, number])
      m.rod(
        [0, y, 0] satisfies [number, number, number],
        [0, y, 1.3] satisfies [number, number, number],
        0.035,
        '#63746a',
        8,
      );
    for (let z = 0; z <= 1.301; z += 0.216)
      m.rod(
        [0, 0.15, z] satisfies [number, number, number],
        [0, 2.4, z] satisfies [number, number, number],
        0.017,
        '#63746a',
        8,
      );
    m.box(-0.05, 1.15, 1.05, 0.1, 0.16, 0.16, '#be9955', { metal: 0.2 });
  });
}

export function drawTiger(
  m: Mesh,
  actor: { x: number; y: number; moving: boolean; travel: number; angle: number },
  ground: (x: number, z: number) => number,
  { reduced = false }: { reduced?: boolean } | undefined = {},
) {
  const x = actor.x + 0.5,
    z = actor.y + 0.5,
    base = ground(x, z),
    phase = reduced || !actor.moving ? 0 : (actor.travel * Math.PI * 2) / 1.3;
  const bob = actor.moving && !reduced ? Math.sin(phase * 2) * 0.025 : 0,
    co = Math.cos(actor.angle),
    si = Math.sin(actor.angle);
  pose(m, x, base, z, actor.angle, () => {
    const fur = '#d38b3d',
      stripe = '#3e3d32',
      cream = '#e8d9b6';
    m.sphere(-0.02, 0.85 + bob, 0, 0.7, 0.34, 0.29, fur, 24, 12);
    m.sphere(0.1, 0.68 + bob, 0, 0.5, 0.17, 0.265, cream, 20, 8);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 16; j++) {
        const a = (j * Math.PI) / 8,
          b = ((j + 1) * Math.PI) / 8,
          cx = -0.52 + i * 0.145,
          w = 0.022 + (i % 3) * 0.006;
        const p = (xx: number, t: number) => {
          const r = Math.sqrt(Math.max(0, 1 - (xx / 0.705) ** 2));
          return [
            xx + Math.sin(t * 3 + i) * 0.015,
            0.85 + bob + Math.cos(t) * r * 0.344,
            Math.sin(t) * r * 0.294,
          ] satisfies [number, number, number];
        };
        m.quad(p(cx - w, a), p(cx + w, a), p(cx + w, b), p(cx - w, b), stripe);
      }
    for (const front of [-1, 1] satisfies [number, number])
      for (const side of [-1, 1] satisfies [number, number]) {
        const swing = Math.sin(phase + (front === side ? 0 : Math.PI)),
          px = front * 0.45,
          zz = side * 0.21,
          lift = Math.max(0, swing) * 0.11;
        const footX = px + swing * 0.16,
          footZ = zz,
          groundY = ground(x + footX * co - footZ * si, z + footX * si + footZ * co) - base;
        const hip = [px, 0.79 + bob, zz] satisfies [number, number, number],
          knee = [px - swing * 0.06, 0.43 + bob, zz] satisfies [number, number, number],
          paw = [footX, 0.1 + groundY + lift, zz] satisfies [number, number, number];
        m.rod(hip, knee, 0.1, fur, 12);
        m.rod(knee, paw, 0.07, fur, 10);
        m.sphere(paw[0], paw[1], paw[2], 0.14, 0.095, 0.1, cream, 12, 7);
        for (const f of [0.35, 0.65] satisfies [number, number]) {
          const p = knee.map((v, i) => v + (paw[i] - v) * f),
            q = knee.map((v, i) => v + (paw[i] - v) * (f + 0.1));
          m.rod(p, q, 0.073, stripe, 10);
        }
      }
    pose(m, 0.65, 1.0 + bob, 0, Math.sin(phase * 0.5) * 0.035, () => {
      m.sphere(0, 0, 0, 0.3, 0.27, 0.28, fur, 22, 12);
      for (const side of [-1, 1] satisfies [number, number]) {
        m.sphere(-0.1, 0.23, side * 0.2, 0.115, 0.13, 0.065, stripe, 12, 8);
        m.sphere(-0.085, 0.235, side * 0.205, 0.067, 0.08, 0.066, fur, 10, 6);
        m.sphere(0.19, -0.07, side * 0.13, 0.16, 0.12, 0.13, cream, 16, 8);
        m.sphere(0.19, 0.08, side * 0.206, 0.035, 0.035, 0.025, '#bcb566', 10, 6);
        m.sphere(0.205, 0.082, side * 0.22, 0.012, 0.027, 0.013, stripe, 8, 6);
        for (let i = 0; i < 3; i++)
          m.rod(
            [-0.02 + i * 0.07, 0.18 - i * 0.045, side * 0.205] satisfies [number, number, number],
            [0.02 + i * 0.07, 0.07 - i * 0.065, side * 0.266] satisfies [number, number, number],
            0.026,
            stripe,
            6,
          );
        for (let i = 0; i < 3; i++)
          m.rod(
            [0.24, -0.09, side * 0.14] satisfies [number, number, number],
            [0.29 + i * 0.025, -0.08 - i * 0.035, side * 0.35] satisfies [number, number, number],
            0.005,
            cream,
            4,
          );
      }
      m.sphere(0.31, -0.04, 0, 0.06, 0.045, 0.075, '#866157', 12, 7);
      m.rod(
        [0.31, -0.07, 0] satisfies [number, number, number],
        [0.28, -0.13, 0] satisfies [number, number, number],
        0.012,
        stripe,
        6,
      );
    });
    let prev = [-0.63, 0.87 + bob, 0] satisfies [number, number, number];
    for (let i = 1; i <= 9; i++) {
      const f = i / 9,
        p = [
          -0.63 - f * 0.83,
          0.87 + bob + Math.sin(f * Math.PI) * 0.18,
          Math.sin(f * 2.2 + phase * 0.35) * 0.17 * f,
        ] satisfies [number, number, number];
      m.rod(prev, p, 0.055 - f * 0.024, i % 2 ? fur : stripe, 10);
      prev = p;
    }
  });
}

export function drawAnimalControlNet(
  m: Mesh,
  x: number,
  base: number,
  z: number,
  angle: number,
  time: number,
) {
  pose(m, x, base, z, angle - Math.PI / 2, () => {
    const lift = Math.sin(time * 3) * 0.03;
    m.rod(
      [0.23, 0.8, 0.18] satisfies [number, number, number],
      [0.3, 1.9 + lift, 0.5] satisfies [number, number, number],
      0.024,
      '#a49165',
      10,
      'wood',
    );
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12;
      m.rod(
        [0.3 + Math.cos(a) * 0.34, 1.9 + lift + Math.sin(a) * 0.34, 0.5] satisfies [
          number,
          number,
          number,
        ],
        [0.3 + Math.cos(b) * 0.34, 1.9 + lift + Math.sin(b) * 0.34, 0.5] satisfies [
          number,
          number,
          number,
        ],
        0.015,
        '#b7bcb0',
        6,
      );
    }
    for (let i = -2; i <= 2; i++) {
      const q = i * 0.1,
        half = Math.sqrt(0.34 ** 2 - q * q);
      m.rod(
        [0.3 - half, 1.9 + lift + q, 0.5] satisfies [number, number, number],
        [0.3 + half, 1.9 + lift + q, 0.5] satisfies [number, number, number],
        0.005,
        '#d3cdb1',
        4,
      );
      m.rod(
        [0.3 + q, 1.9 + lift - half, 0.5] satisfies [number, number, number],
        [0.3 + q, 1.9 + lift + half, 0.5] satisfies [number, number, number],
        0.005,
        '#d3cdb1',
        4,
      );
    }
  });
}
