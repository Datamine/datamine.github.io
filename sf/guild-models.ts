import type { InteriorBuilding } from './types/interiors.ts';
import type { Mesh } from './geometry.ts';
import { drawLoreBook } from './world-lore.ts';

/** Small code-native lodge and market details share the existing material
 * atlas. No bitmap download or per-frame texture construction is required. */
export function drawGuildInterior(m: Mesh, b: InteriorBuilding, base: number) {
  const { x, y: z, w, d } = b;
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < 9; i++)
      m.box(
        x + 0.12 + (i * (w - 0.24)) / 9,
        base + 0.002,
        z + 0.12 + (j * (d - 0.24)) / 8,
        (w - 0.24) / 9,
        0.012,
        (d - 0.24) / 8,
        (i + j) % 2 ? '#3b4948' : '#ddd4b7',
        'stone',
      );
  for (const side of [-1, 1] satisfies [number, number]) {
    const xx = side < 0 ? x + 0.22 : x + w - 0.63;
    m.box(xx, base + 0.38, z + 0.6, 0.42, 0.08, d - 1.3, '#7e3034', 'wood');
    m.box(side < 0 ? xx : xx + 0.35, base + 0.45, z + 0.6, 0.07, 0.65, d - 1.3, '#72403b', 'wood');
    for (const zz of [z + 0.7, z + d - 1])
      m.box(xx + 0.04, base, zz, 0.33, 0.4, 0.09, '#9d7e4f', 'wood');
  }
  m.box(x + w / 2 - 0.55, base, z + 0.32, 1.1, 0.65, 0.43, '#76644c', 'wood');
  m.box(x + w / 2 - 0.6, base + 0.65, z + 0.27, 1.2, 0.07, 0.53, '#d0bd86', 'stone');
  b.loreBook = drawLoreBook(m, x + w / 2, base + 0.725, z + 0.52, 'lodge-minutes');
  for (const xx of [x + 0.55, x + w - 0.55]) {
    m.cylinder(xx, base, z + 0.35, 0.13, 1.72, '#d1c5a0', 16, 0.11, 'stone');
    m.sphere(xx, base + 1.84, z + 0.35, 0.18, 0.18, 0.18, '#c4aa66', 16, 8, { metal: 0.4 });
  }
  const cx = x + w / 2,
    cz = z + d / 2,
    brass = '#c5a967';
  for (const [a, b] of [
    [
      [cx - 0.6, base + 0.025, cz + 0.45],
      [cx, base + 0.025, cz - 0.55],
    ],
    [
      [cx, base + 0.025, cz - 0.55],
      [cx + 0.6, base + 0.025, cz + 0.45],
    ],
    [
      [cx - 0.48, base + 0.027, cz - 0.05] satisfies [number, number, number],
      [cx - 0.48, base + 0.027, cz + 0.5],
    ],
    [
      [cx - 0.48, base + 0.027, cz + 0.5],
      [cx + 0.48, base + 0.027, cz + 0.5],
    ],
  ])
    m.rod(a, b, 0.022, brass, 6, { metal: 0.35 });
}
export function drawTechnologistMarketInterior(m: Mesh, b: InteriorBuilding, base: number) {
  const { x, y: z, w, d } = b;
  m.box(x + 0.12, base, z + 0.12, w - 0.24, 0.012, d - 0.24, '#c8c5ae', 'stone');
  for (const xx of [x + 0.25, x + w - 0.7]) {
    m.box(xx, base, z + 0.3, 0.45, 0.76, d - 1, '#3b4d40', 'wood');
    for (let j = 0; j < 5; j++)
      m.box(xx - 0.025, base + 0.77, z + 0.42 + j * 0.33, 0.5, 0.065, 0.28, '#a38658', 'wood');
    for (let j = 0; j < 6; j++)
      m.box(
        xx - 0.06,
        base + 1.55,
        z + 0.28 + (j * (d - 0.96)) / 6,
        0.57,
        0.055,
        (d - 0.96) / 6,
        j % 2 ? '#435b46' : '#202c26',
      );
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 2; i++)
        m.sphere(
          xx + 0.12 + i * 0.2,
          base + 0.82,
          z + 0.5 + j * 0.33,
          0.085,
          0.075,
          0.08,
          (['#b04e3d', '#63854d', '#d3ae50'] satisfies [string, string, string])[(i + j) % 3],
          8,
          5,
        );
  }
  m.box(x + w / 2 - 0.5, base, z + 0.25, 1, 0.74, 0.4, '#48654c', 'wood');
  m.box(x + w / 2 + 0.15, base + 0.74, z + 0.3, 0.21, 0.27, 0.12, '#202d27');
  m.box(x + w / 2 + 0.17, base + 0.81, z + 0.422, 0.17, 0.14, 0.006, '#2f985d', { emissive: 0.25 });
  for (let i = 0; i < 3; i++)
    m.box(
      x + w / 2 + 0.19 + i * 0.043,
      base + 0.84 + i * 0.025,
      z + 0.43,
      0.015,
      0.055,
      0.004,
      '#a6e6a1',
      { emissive: 0.3 },
    );
}
export function drawGuildEmblem(m: Mesh, b: InteriorBuilding, base: number, height: number) {
  const cx = b.x + b.w / 2,
    z = b.y + b.d + 0.108,
    y = base + height - 0.9,
    c = '#c6a767';
  for (const [a, d] of [
    [
      [cx - 0.3, y, z],
      [cx, y + 0.48, z],
    ],
    [
      [cx, y + 0.48, z],
      [cx + 0.3, y, z],
    ],
    [
      [cx - 0.23, y + 0.25, z],
      [cx - 0.23, y - 0.08, z],
    ],
    [
      [cx - 0.23, y - 0.08, z],
      [cx + 0.23, y - 0.08, z],
    ],
  ])
    m.rod(a, d, 0.018, c, 7, { metal: 0.35 });
}
export function drawPeptideVial(m: Mesh, x: number, base: number, z: number, time = 0) {
  m.cylinder(x, base + 0.03, z, 0.095, 0.28, '#92c7bd', 16, 0.095, { metal: 0.12 });
  m.cylinder(x, base + 0.055, z, 0.073, 0.16, '#67b8d0', 16, 0.073, { emissive: 0.2 });
  m.cylinder(x, base + 0.31, z, 0.104, 0.065, '#ddd5b7', 16, 0.104, { metal: 0.35 });
  m.box(x - 0.096, base + 0.15, z - 0.025, 0.025, 0.1, 0.05, '#f4efdb');
  m.box(x + 0.017, base + 0.13, z + 0.081, 0.05, 0.09, 0.014, '#edf3d9');
  // A small glint makes the vial legible among produce and pavement.
  const glow = 0.01 + 0.007 * Math.sin(time * 0.003);
  m.sphere(x + 0.055, base + 0.25, z - 0.055, glow, glow, glow, '#d9ffff', 8, 4, { emissive: 0.5 });
}
