import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { APPLE_CAMPUS, ROBOTAXI_DEALER, appleRingSections } from './tech-layout.ts';
import { drawPlaque } from './southern-district.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export const TECH_SIGNS = Object.freeze([
  'TIM APPLE',
  'iPHONE · 100 COINS',
  'TESLA ROBOTAXI',
  '100 COINS · 20 / MINUTE',
] satisfies [string, string, string, string]);
const techRectangle = (x: number, z: number, w: number, d: number) => [
  [x - w / 2, z - d / 2] satisfies [number, number],
  [x + w / 2, z - d / 2] satisfies [number, number],
  [x + w / 2, z + d / 2] satisfies [number, number],
  [x - w / 2, z + d / 2] satisfies [number, number],
];
export function drawAppleCampus(m: Mesh, signs: SignAtlas) {
  const c = APPLE_CAMPUS,
    start = m.data.length,
    top = c.base + c.height,
    sections = appleRingSections(),
    at = (r: number, a: number, y: number) =>
      [c.x + Math.sin(a) * r, y, c.z + Math.cos(a) * r] satisfies [number, number, number];
  for (const { a, b, polygon } of sections) {
    m.quad(
      [polygon[0][0], c.base + 0.035, polygon[0][1]],
      [polygon[1][0], c.base + 0.035, polygon[1][1]],
      [polygon[2][0], c.base + 0.035, polygon[2][1]],
      [polygon[3][0], c.base + 0.035, polygon[3][1]],
      '#b6c3bc',
      'concrete',
    );
    // Curved glass faces and three continuous white aluminum ribbons.
    for (const r of [c.outer, c.inner] satisfies [number, number]) {
      const p = [
        at(r, a, c.base + 0.1),
        at(r, b, c.base + 0.1),
        at(r, b, top - 0.1),
        at(r, a, top - 0.1),
      ];
      if (r === c.inner) p.reverse();
      m.quad(p[0], p[1], p[2], p[3], '#8ba9a9', { window: 0.12 });
      for (const y of [c.base + 0.04, c.base + 1.01, top - 0.08] satisfies [
        number,
        number,
        number,
      ]) {
        const band = [
          at(r + (r === c.outer ? 0.018 : -0.018), a, y),
          at(r + (r === c.outer ? 0.018 : -0.018), b, y),
          at(r + (r === c.outer ? 0.018 : -0.018), b, y + 0.075),
          at(r + (r === c.outer ? 0.018 : -0.018), a, y + 0.075),
        ];
        if (r === c.inner) band.reverse();
        m.quad(band[0], band[1], band[2], band[3], '#e0e6dc', { metal: 0.18 });
      }
      m.rod(at(r, a, c.base + 0.1), at(r, a, top - 0.1), 0.012, '#c8d4cf', 6);
    }
    m.quad(
      [polygon[0][0], top, polygon[0][1]],
      [polygon[1][0], top, polygon[1][1]],
      [polygon[2][0], top, polygon[2][1]],
      [polygon[3][0], top, polygon[3][1]],
      '#e6e7dc',
      'concrete',
    );
    m.quad(
      at(c.outer - 0.15, a, top + 0.025),
      at(c.outer - 0.15, b, top + 0.025),
      at(c.inner + 0.15, b, top + 0.025),
      at(c.inner + 0.15, a, top + 0.025),
      '#738b90',
      'glass',
    );
  }
  // Seal the two ends of the ring at its real walk-through northern gateway.
  const gateSides = [
    Math.max(...sections.filter((s) => s.b < Math.PI).map((s) => s.b)),
    Math.min(...sections.filter((s) => s.a > Math.PI).map((s) => s.a)),
  ] satisfies [number, number];
  for (const a of gateSides)
    m.quad(
      at(c.inner, a, c.base + 0.035),
      at(c.outer, a, c.base + 0.035),
      at(c.outer, a, top),
      at(c.inner, a, top),
      '#dce3da',
      'concrete',
    );
  // An overhead bridge shades the gate without a collision wall below it.
  m.box(c.x - 0.77, top - 0.02, c.z - c.outer + 0.12, 1.54, 0.12, 0.74, '#e6e8de', 'concrete');
  for (let i = 0; i < 64; i++) {
    const a = (i * Math.PI) / 32,
      b = ((i + 1) * Math.PI) / 32;
    m.tri(
      [c.x, c.base + 0.014, c.z] satisfies [number, number, number],
      at(c.inner - 0.13, b, c.base + 0.014),
      at(c.inner - 0.13, a, c.base + 0.014),
      '#8da66e',
      'grass',
    );
    m.quad(
      at(c.inner - 0.32, a, c.base + 0.027),
      at(c.inner - 0.32, b, c.base + 0.027),
      at(c.inner - 0.04, b, c.base + 0.027),
      at(c.inner - 0.04, a, c.base + 0.027),
      '#d2d8c7',
      'sidewalk',
    );
  }
  const tx = c.x + 0.3,
    tz = c.z + 0.7;
  m.cylinder(tx, c.base, tz, 0.055, 0.85, '#8d7d62', 12, 0.04, 'wood');
  for (const [dx, dy, dz, r] of [
    [0, 1.12, 0, 0.44] satisfies [number, number, number, number],
    [-0.3, 1.03, 0.06, 0.31] satisfies [number, number, number, number],
    [0.25, 1.22, -0.1, 0.33] satisfies [number, number, number, number],
  ])
    m.sphere(tx + dx, c.base + dy, tz + dz, r, 0.38, r, '#74945b', 14, 8);
  const bx = c.x + 1.05,
    bz = c.z + 0.6;
  m.box(bx - 0.4, c.base + 0.37, bz - 0.15, 0.8, 0.05, 0.3, '#9cae9f', 'wood');
  for (const dx of [-0.31, 0.31] satisfies [number, number])
    m.box(bx + dx, c.base, bz - 0.12, 0.035, 0.37, 0.24, '#7b8b80');
  m.box(bx - 0.4, c.base + 0.42, bz + 0.12, 0.8, 0.34, 0.035, '#9cae9f', 'wood');
  const sx = c.x - 1.3,
    sz = c.z - c.outer - 0.47;
  m.box(sx - 0.58, c.base, sz - 0.11, 1.16, 0.68, 0.22, '#dfe4d8', 'concrete');
  drawPlaque(m, signs, 'TIM APPLE', sx, c.base + 0.35, sz - 0.125, 1.04, 0.19, false);
  drawPlaque(m, signs, 'iPHONE · 100 COINS', sx, c.base + 0.15, sz - 0.125, 1.04, 0.12, false);
  const navigationPolygons = [
    ...sections.map((p) => p.polygon),
    techRectangle(tx, tz, 0.6, 0.6),
    techRectangle(bx, bz, 0.85, 0.35),
    techRectangle(sx, sz, 1.2, 0.25),
  ];
  return {
    id: 'tim-apple-campus',
    kind: 'apple-campus',
    label: contentText('tech-buildings.drawAppleCampus.label-1', {}),
    entry: { ...c.entry },
    description: contentText('tech-buildings.drawAppleCampus.description-2', {}),
    start,
    count: m.data.length - start,
    lo: [c.x - c.outer - 0.1, c.base - 0.02, c.z - c.outer - 0.7] satisfies [
      number,
      number,
      number,
    ],
    hi: [c.x + c.outer + 0.1, top + 0.2, c.z + c.outer + 0.1] satisfies [number, number, number],
    footprint: techRectangle(c.x, c.z, c.outer * 2, c.outer * 2),
    navigationPolygons,
  };
}

function drawCybercab(m: Mesh, x: number, base: number, z: number, angle = 0) {
  pose(m, x, base, z, angle, () => {
    // A low, faceted two-seat cab with a swept canopy, full-width light bars
    // and enclosed wheel faces. Local +X is the direction of travel.
    m.box(-0.55, 0.11, -0.28, 1.1, 0.14, 0.56, '#b9ab78', { metal: 0.28 });
    m.quad(
      [-0.56, 0.25, -0.28] satisfies [number, number, number],
      [0.57, 0.25, -0.28] satisfies [number, number, number],
      [0.42, 0.38, -0.24] satisfies [number, number, number],
      [-0.41, 0.4, -0.24] satisfies [number, number, number],
      '#c4b484',
      { metal: 0.32 },
    );
    m.quad(
      [-0.56, 0.25, 0.28] satisfies [number, number, number],
      [-0.41, 0.4, 0.24] satisfies [number, number, number],
      [0.42, 0.38, 0.24] satisfies [number, number, number],
      [0.57, 0.25, 0.28] satisfies [number, number, number],
      '#c4b484',
      { metal: 0.32 },
    );
    m.quad(
      [-0.41, 0.4, -0.24] satisfies [number, number, number],
      [0.42, 0.38, -0.24] satisfies [number, number, number],
      [0.42, 0.38, 0.24] satisfies [number, number, number],
      [-0.41, 0.4, 0.24] satisfies [number, number, number],
      '#c5b585',
      { metal: 0.28 },
    );
    m.quad(
      [-0.4, 0.4, -0.235] satisfies [number, number, number],
      [-0.2, 0.62, -0.21] satisfies [number, number, number],
      [0.12, 0.62, -0.21] satisfies [number, number, number],
      [0.39, 0.39, -0.235] satisfies [number, number, number],
      '#53676d',
      'glass',
    );
    m.quad(
      [-0.4, 0.4, 0.235] satisfies [number, number, number],
      [0.39, 0.39, 0.235] satisfies [number, number, number],
      [0.12, 0.62, 0.21] satisfies [number, number, number],
      [-0.2, 0.62, 0.21] satisfies [number, number, number],
      '#53676d',
      'glass',
    );
    m.quad(
      [-0.2, 0.62, -0.21] satisfies [number, number, number],
      [-0.2, 0.62, 0.21] satisfies [number, number, number],
      [0.12, 0.62, 0.21] satisfies [number, number, number],
      [0.12, 0.62, -0.21] satisfies [number, number, number],
      '#b9c5c0',
      'glass',
    );
    m.quad(
      [0.12, 0.62, -0.21] satisfies [number, number, number],
      [0.12, 0.62, 0.21] satisfies [number, number, number],
      [0.39, 0.39, 0.235] satisfies [number, number, number],
      [0.39, 0.39, -0.235] satisfies [number, number, number],
      '#4d6269',
      'glass',
    );
    m.quad(
      [-0.4, 0.4, -0.235] satisfies [number, number, number],
      [-0.4, 0.4, 0.235] satisfies [number, number, number],
      [-0.2, 0.62, 0.21] satisfies [number, number, number],
      [-0.2, 0.62, -0.21] satisfies [number, number, number],
      '#667980',
      'glass',
    );
    for (const xx of [-0.36, 0.36] satisfies [number, number])
      for (const side of [-1, 1] satisfies [number, number]) {
        const zz = side * 0.27;
        pose(m, xx, 0.14, zz, 0, () => {
          m.rod(
            [0, 0, -0.045] satisfies [number, number, number],
            [0, 0, 0.045] satisfies [number, number, number],
            0.12,
            '#3c4646',
            18,
          );
          m.rod(
            [0, 0, side * 0.045] satisfies [number, number, number],
            [0, 0, side * 0.051] satisfies [number, number, number],
            0.089,
            '#afa986',
            18,
            { metal: 0.3 },
          );
        });
      }
    m.box(0.555, 0.27, -0.23, 0.018, 0.025, 0.46, '#d4e5d8', { emissive: 0.35 });
    m.box(-0.565, 0.25, -0.23, 0.018, 0.022, 0.46, '#b98379', { emissive: 0.22 });
  });
}
export function drawRobotaxiDealer(m: Mesh, signs: SignAtlas) {
  const r = ROBOTAXI_DEALER,
    start = m.data.length,
    x = r.x,
    z = r.z,
    base = r.base;
  m.box(x - r.w / 2, base - 0.025, z - r.d / 2, r.w, 0.06, r.d, '#bbc3b7', 'concrete');
  m.box(x - 1.4, base + 0.035, z - 0.3, 2.8, 1.65, 1.9, '#cbd3cd', 'stucco');
  m.box(x - 1.49, base + 1.68, z - 0.4, 2.98, 0.13, 2.1, '#e2e6dd', 'concrete');
  m.quad(
    [x - 1.25, base + 0.23, z - 0.315] satisfies [number, number, number],
    [x - 1.25, base + 1.47, z - 0.315] satisfies [number, number, number],
    [x + 1.25, base + 1.47, z - 0.315] satisfies [number, number, number],
    [x + 1.25, base + 0.23, z - 0.315] satisfies [number, number, number],
    '#7e9d9f',
    { window: 0.12 },
  );
  for (const xx of [-1.25, 0, 1.25] satisfies [number, number, number])
    m.box(x + xx - 0.015, base + 0.17, z - 0.34, 0.03, 1.4, 0.035, '#e3e7dc');
  m.box(x - 1.4, base + 1.27, z - 0.365, 2.8, 0.26, 0.055, '#465d61');
  drawPlaque(m, signs, 'TESLA ROBOTAXI', x, base + 1.32, z - 0.43, 2.55, 0.14, false);
  drawPlaque(m, signs, '100 COINS · 20 / MINUTE', x, base + 0.1, z - 0.37, 2.5, 0.11, false);
  drawCybercab(m, x - 0.72, base + 0.04, z - 1.02, 0);
  drawCybercab(m, x + 0.7, base + 0.04, z - 0.95, Math.PI);
  // Charging posts and a showroom roof fan stay off the public approach.
  for (const xx of [-1.34, 1.34] satisfies [number, number]) {
    m.box(x + xx - 0.06, base + 0.06, z - 0.83, 0.12, 0.6, 0.14, '#e6e8df', 'concrete');
    m.box(x + xx - 0.04, base + 0.43, z - 0.91, 0.08, 0.14, 0.018, '#6b9295', { emissive: 0.16 });
    m.rod(
      [x + xx, base + 0.3, z - 0.83] satisfies [number, number, number],
      [x + xx * 0.85, base + 0.2, z - 0.93] satisfies [number, number, number],
      0.012,
      '#566968',
      7,
    );
  }
  m.box(x + 0.65, base + 1.82, z + 0.3, 0.55, 0.23, 0.55, '#a4b6ae', { metal: 0.2 });
  m.cylinder(x + 0.925, base + 2.05, z + 0.575, 0.17, 0.02, '#6e837d', 18, 0.17);
  const navigationPolygons = [
    techRectangle(x, z + 0.65, 2.85, 1.95),
    techRectangle(x - 0.72, z - 1.02, 1.18, 0.6),
    techRectangle(x + 0.7, z - 0.95, 1.18, 0.6),
  ];
  return {
    id: 'tesla-robotaxi',
    kind: 'robotaxi-dealer',
    label: contentText('tech-buildings.drawRobotaxiDealer.label-3', {}),
    entry: { ...r.entry },
    description: contentText('tech-buildings.drawRobotaxiDealer.description-4', {}),
    start,
    count: m.data.length - start,
    lo: [x - r.w / 2 - 0.05, base - 0.05, z - r.d / 2 - 0.05] satisfies [number, number, number],
    hi: [x + r.w / 2 + 0.05, base + 2.15, z + r.d / 2 + 0.1] satisfies [number, number, number],
    footprint: techRectangle(x, z, r.w, r.d),
    navigationPolygons,
  };
}
