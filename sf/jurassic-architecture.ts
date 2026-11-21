import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { drawPlaque } from './southern-district.ts';
import { JURASSIC } from './jurassic-layout.ts';
import type { SignAtlas } from './types/world.ts';
export const RAPTOR_ENCLOSURE = Object.freeze({ height: 2.65, gateWidth: 1.1, wireSpacing: 0.34 });
/** Chain-link diagonals clipped to a real rectangular fence panel. */
export function drawRaptorFencePanel(
  m: Mesh,
  a: number[],
  b: number[],
  base: number,
  { height = RAPTOR_ENCLOSURE.height } = {},
) {
  const w = Math.hypot(b[0] - a[0], b[1] - a[1]),
    ux = (b[0] - a[0]) / w,
    uz = (b[1] - a[1]) / w,
    at = (u: number, v: number) =>
      [a[0] + ux * u, base + v, a[1] + uz * u] satisfies [number, number, number],
    low = 0.16,
    high = height - 0.15;
  for (const y of [0.12, height * 0.5, height - 0.08] satisfies [number, number, number])
    m.rod(at(0, y), at(w, y), 0.025, '#7f9991', 8, { metal: 0.3 });
  for (const sign of [-1, 1] satisfies [number, number])
    for (let k = -Math.ceil(w / 0.34); k <= Math.ceil((high + w) / 0.34); k++) {
      const c = k * 0.34,
        points = [];
      for (const u of [0, w] satisfies [number, number]) {
        const v = sign * u + c;
        if (v >= low && v <= high) points.push([u, v] satisfies [number, number]);
      }
      for (const v of [low, high] satisfies [number, number]) {
        const u = (v - c) / sign;
        if (u > 0 && u < w) points.push([u, v] satisfies [number, number]);
      }
      if (points.length >= 2)
        m.rod(at(...points[0]), at(...points[1]), 0.0055, '#78958f', 4, { metal: 0.15 });
    }
}
function jurassicDNA(m: Mesh, x: number, y: number, z: number) {
  for (let i = 0; i < 25; i++) {
    const a = i * 0.47,
      b = (i + 1) * 0.47,
      at = (angle: number, h: number, side: number) =>
        [
          x + Math.cos(angle + side * Math.PI) * 0.21,
          y + h,
          z + Math.sin(angle + side * Math.PI) * 0.21,
        ] satisfies [number, number, number];
    for (const side of [0, 1] satisfies [number, number])
      m.rod(
        at(a, i * 0.065, side),
        at(b, (i + 1) * 0.065, side),
        0.024,
        side ? '#c0a5bc' : '#80bdaf',
        8,
        { emissive: 0.12 },
      );
    if (i % 2 === 0)
      m.rod(at(a, i * 0.065, 0), at(a, i * 0.065, 1), 0.013, i % 4 ? '#b7d18c' : '#c7b775', 6);
  }
}
export function drawJurassicArchitecture(m: Mesh, signs: SignAtlas) {
  const b = JURASSIC.base,
    l = JURASSIC.lab,
    c = JURASSIC.cage,
    start = m.data.length,
    green = '#537b75',
    cream = '#d9dcc4',
    bronze = '#a99a6e';
  m.box(
    JURASSIC.x - JURASSIC.w / 2,
    b - 0.07,
    JURASSIC.z - JURASSIC.d / 2,
    JURASSIC.w,
    0.07,
    JURASSIC.d,
    '#b6baa2',
    'cobble',
  );
  pose(m, l.x, b, l.z, 0, () => {
    const x = -l.w / 2,
      z = -l.d / 2,
      face = l.d / 2;
    m.box(x, 0, z, l.w, 3.85, l.d, '#b1bbaa', 'brick');
    for (const y of [0.12, 1.87, 3.72] satisfies [number, number, number])
      m.box(x - 0.045, y, z - 0.045, l.w + 0.09, 0.11, l.d + 0.09, cream, 'travertine');
    for (const side of [-1, 1] satisfies [number, number])
      for (let floor = 0; floor < 2; floor++)
        for (let i = 0; i < 3; i++)
          drawFacadeWindow(m, {
            isX: true,
            plane: side * (l.w / 2 + 0.025),
            along: z + 0.3 + i * 0.98,
            y: 0.55 + floor * 1.65,
            w: 0.6,
            h: 1.06,
            far: side < 0,
            style: 'office',
            trim: '#74958b',
            seed: i + floor * 11,
            glow: 0.06,
          });
    // Recessed front entrance and a projecting upper laboratory bay.
    m.box(-0.32, 0.02, face + 0.02, 0.64, 1.68, 0.04, '#486d67', 'cedar');
    m.box(-0.25, 0.4, face + 0.065, 0.5, 1.18, 0.012, '#a1c0af', 'glass');
    m.rod(
      [0.22, 0.68, face + 0.09] satisfies [number, number, number],
      [0.22, 0.98, face + 0.09] satisfies [number, number, number],
      0.012,
      bronze,
      8,
    );
    m.box(-0.69, 2.16, face + 0.025, 1.38, 1.08, 0.24, green, 'cedar');
    for (let i = 0; i < 3; i++)
      drawFacadeWindow(m, {
        plane: face + 0.272,
        along: -0.59 + i * 0.4,
        y: 2.28,
        w: 0.3,
        h: 0.79,
        style: 'office',
        trim: cream,
        seed: 4 + i,
      });
    m.box(-l.w / 2, 1.8, face + 0.03, l.w, 0.31, 0.07, '#344f49');
    drawPlaque(m, signs, 'JURASSIC BIOSCIENCES', 0, 1.845, face + 0.108, l.w - 0.09, 0.19);
    // Crooked stacks, a glass specimen lantern and an external DNA coil.
    m.box(x - 0.09, 3.84, z - 0.09, l.w + 0.18, 0.15, l.d + 0.18, green, 'roof');
    for (const [xx, zz, H, tilt] of [
      [-0.5, -1.05, 1.3, 0.18] satisfies [number, number, number, number],
      [0.47, -0.9, 0.8, -0.14] satisfies [number, number, number, number],
    ]) {
      m.rod(
        [xx, 3.98, zz] satisfies [number, number, number],
        [xx + tilt, 3.98 + H, zz + 0.12] satisfies [number, number, number],
        0.09,
        '#9fae9f',
        16,
        { metal: 0.3 },
      );
      m.cylinder(xx + tilt, 3.98 + H, zz + 0.12, 0.14, 0.08, bronze, 16, 0.14, { metal: 0.2 });
    }
    m.cylinder(0, 3.99, 0.55, 0.61, 0.17, green, 24, 0.61, 'stone');
    m.cylinder(0, 4.16, 0.55, 0.52, 1.35, '#b4d5c3', 24, 0.52, { glass: 0.13 });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      m.rod(
        [Math.cos(a) * 0.535, 4.16, 0.55 + Math.sin(a) * 0.535] satisfies [number, number, number],
        [Math.cos(a) * 0.535, 5.51, 0.55 + Math.sin(a) * 0.535] satisfies [number, number, number],
        0.014,
        bronze,
        6,
      );
    }
    m.cylinder(0, 5.51, 0.55, 0.64, 0.17, green, 24, 0.25, 'roof');
    m.sphere(0, 5.65, 0.55, 0.28, 0.2, 0.28, '#b4baa2', 18, 8, { metal: 0.2 });
    jurassicDNA(m, 0, 4.22, 0.55);
    m.rod(
      [0.45, 3.9, 1.2] satisfies [number, number, number],
      [0.73, 4.28, 1.35] satisfies [number, number, number],
      0.035,
      bronze,
      8,
    );
    m.sphere(0.73, 4.4, 1.35, 0.16, 0.16, 0.16, '#c5d38a', 16, 8, { emissive: 0.2 });
    for (let i = 0; i < 10; i++) {
      const y = 0.32 + i * 0.28;
      m.rod(
        [-0.84, y, -1.25] satisfies [number, number, number],
        [-0.84, y + 0.18, -1.25] satisfies [number, number, number],
        0.025,
        bronze,
        6,
      );
      if (i % 2 === 0) m.box(-0.88, y, -1.27, 0.08, 0.08, 0.27, green);
    }
    // An oversized molecular model is a very questionable lightning rod.
    for (const [v, r, color] of [
      [[0.05, 6.12, 0.58] satisfies [number, number, number], 0.11, '#b5c8a7'],
      [[0.35, 6.36, 0.63] satisfies [number, number, number], 0.14, '#92bab4'],
      [[-0.24, 6.47, 0.55] satisfies [number, number, number], 0.12, '#bf9eb4'],
    ] satisfies [[number, number, number], number, string][]) {
      m.rod([0, 5.8, 0.55] satisfies [number, number, number], v, 0.025, bronze, 8);
      m.sphere(...v, r, r, r, color, 16, 8, { emissive: 0.12 });
    }
  });
  const x0 = c.x - c.w / 2,
    x1 = c.x + c.w / 2,
    z0 = c.z - c.d / 2,
    z1 = c.z + c.d / 2,
    H = RAPTOR_ENCLOSURE.height,
    g = RAPTOR_ENCLOSURE.gateWidth / 2;
  m.box(x0, b, z0, c.w, 0.035, c.d, '#9a9a78', 'dirt');
  const panels = [
    [[x0, z0] satisfies [number, number], [x1, z0] satisfies [number, number]],
    [[x0, z0] satisfies [number, number], [x0, z1] satisfies [number, number]],
    [[x1, z0] satisfies [number, number], [x1, z1] satisfies [number, number]],
    [[x0, z1] satisfies [number, number], [c.x - g, z1] satisfies [number, number]],
    [[c.x + g, z1] satisfies [number, number], [x1, z1] satisfies [number, number]],
  ];
  for (const [a, q] of panels) drawRaptorFencePanel(m, a, q, b);
  for (const [x, z] of [
    [x0, z0] satisfies [number, number],
    [x1, z0] satisfies [number, number],
    [x0, z1] satisfies [number, number],
    [x1, z1] satisfies [number, number],
    [c.x - g, z1] satisfies [number, number],
    [c.x + g, z1] satisfies [number, number],
  ]) {
    m.box(x - 0.1, b - 0.015, z - 0.1, 0.2, 0.1, 0.2, '#aeb8a4', 'concrete');
    m.cylinder(x, b + 0.06, z, 0.045, H + 0.12, green, 12, 0.045, { metal: 0.3 });
    m.sphere(x, b + H + 0.19, z, 0.065, 0.065, 0.065, bronze, 12, 6);
  }
  // Open overhead trusses preserve the view of the animal, unlike a solid roof.
  for (const z of [z0, z1] satisfies [number, number]) {
    m.rod(
      [x0, b + H, z] satisfies [number, number, number],
      [c.x, b + H + 0.34, z] satisfies [number, number, number],
      0.035,
      green,
      8,
    );
    m.rod(
      [c.x, b + H + 0.34, z] satisfies [number, number, number],
      [x1, b + H, z] satisfies [number, number, number],
      0.035,
      green,
      8,
    );
  }
  m.rod(
    [c.x, b + H + 0.34, z0] satisfies [number, number, number],
    [c.x, b + H + 0.34, z1] satisfies [number, number, number],
    0.025,
    green,
    8,
  );
  for (const side of [-1, 1] satisfies [number, number]) {
    const x = c.x + side * 0.67,
      z = z0 + 0.3;
    m.sphere(x, b + 0.1, z, 0.22, 0.12, 0.19, '#939b7c', 14, 7, 'stone');
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      m.rod(
        [x, b + 0.1, z] satisfies [number, number, number],
        [x + Math.cos(a) * 0.24, b + 0.42, z + Math.sin(a) * 0.19] satisfies [
          number,
          number,
          number,
        ],
        0.013,
        '#6d9569',
        5,
      );
    }
  }
  m.cylinder(c.x + 0.6, b + 0.04, z0 + 1, 0.2, 0.045, '#b5c3ac', 20, 0.2, { metal: 0.2 });
  m.cylinder(c.x + 0.6, b + 0.086, z0 + 1, 0.17, 0.008, '#8fb9ac', 20, 0.17, { water: 2 });
  m.box(c.x - 0.9, b + H + 0.03, z1 - 0.025, 1.8, 0.27, 0.07, green, 'cedar');
  drawPlaque(m, signs, 'AUTHORIZED PERSONNEL ONLY', c.x, b + H + 0.075, z1 + 0.053, 1.69, 0.16);
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return { start, count: m.data.length - start, lo, hi };
}
export function drawRaptorEnclosureGate(
  m: Mesh,
  game: { raptor: { phase: string; release?: number } },
) {
  const c = JURASSIC.cage,
    b = JURASSIC.base,
    w = RAPTOR_ENCLOSURE.gateWidth,
    H = RAPTOR_ENCLOSURE.height,
    open = game.raptor.phase === 'caged' ? 0 : Math.min(1, game.raptor.release || 1);
  pose(m, c.x - w / 2, b, c.z + c.d / 2, -open * Math.PI * 0.48, () => {
    drawRaptorFencePanel(
      m,
      [0, 0] satisfies [number, number],
      [w, 0] satisfies [number, number],
      0,
    );
    for (const x of [0, w] satisfies [number, number])
      m.rod(
        [x, 0, 0] satisfies [number, number, number],
        [x, H, 0] satisfies [number, number, number],
        0.028,
        '#a4b3a5',
        8,
      );
    m.rod(
      [0, 0.15, 0] satisfies [number, number, number],
      [w, H - 0.15, 0] satisfies [number, number, number],
      0.018,
      '#a1ad98',
      6,
    );
    m.box(w - 0.12, 0.95, 0.03, 0.12, 0.22, 0.05, '#d5b96c', { metal: 0.4 });
    for (let i = 0; i < 6; i++) {
      const x = (i * w) / 6;
      m.box(x, 0.08, 0.025, w / 12, 0.09, 0.016, i % 2 ? '#4a5650' : '#c9b25d');
    }
  });
}
