import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawExcavator } from './rail-works.ts';
import { drawPlaque } from './southern-district.ts';
import {
  SQUARE_DIGSITE,
  SQUARE_CRANES,
  SQUARE_SITE_FENCES,
  squareConstructionPolygons,
} from './square-construction-layout.ts';

export function drawTowerCrane(
  m: Mesh,
  c:
    | Readonly<{ id: 'west-crane'; x: 53.35; z: 153.3; height: 11.6; jib: 6.4; angle: 0 }>
    | Readonly<{ id: 'east-crane'; x: 71.1; z: 158.2; height: 12.4; jib: 5.5; angle: number }>,
  base: number,
) {
  const yellow = '#cfac4b',
    dark = '#647579',
    H = c.height;
  pose(m, c.x, base, c.z, c.angle, () => {
    m.box(-0.52, -0.04, -0.52, 1.04, 0.2, 1.04, '#a5aaa0', 'stone');
    for (const x of [-0.18, 0.18] satisfies [number, number])
      for (const z of [-0.18, 0.18] satisfies [number, number])
        m.rod([x, 0.16, z] satisfies [number, number, number], [x, H, z], 0.027, yellow, 8, {
          metal: 0.2,
        });
    for (let y = 0.2; y < H - 0.3; y += 0.55)
      for (const side of [-1, 1] satisfies [number, number]) {
        m.rod(
          [-0.18, y, side * 0.18] satisfies [number, number, number],
          [0.18, y, side * 0.18] satisfies [number, number, number],
          0.018,
          yellow,
          6,
        );
        m.rod(
          [side * 0.18, y, -0.18] satisfies [number, number, number],
          [side * 0.18, y, 0.18] satisfies [number, number, number],
          0.018,
          yellow,
          6,
        );
        m.rod(
          [-0.18, y, side * 0.18] satisfies [number, number, number],
          [0.18, Math.min(H, y + 0.55), side * 0.18] satisfies [number, number, number],
          0.012,
          yellow,
          6,
        );
        m.rod(
          [side * 0.18, y, -0.18] satisfies [number, number, number],
          [side * 0.18, Math.min(H, y + 0.55), 0.18] satisfies [number, number, number],
          0.012,
          yellow,
          6,
        );
      }
    for (let y = 0.3; y < H - 0.6; y += 0.28)
      m.rod(
        [-0.09, y, -0.205] satisfies [number, number, number],
        [0.09, y, -0.205] satisfies [number, number, number],
        0.009,
        dark,
        5,
      );
    m.cylinder(0, H - 0.12, 0, 0.35, 0.18, dark, 20);
    m.box(-0.4, H - 0.16, -0.38, 0.8, 0.1, 0.76, yellow, { metal: 0.2 });
    m.box(0.2, H - 0.66, -0.44, 0.55, 0.46, 0.5, yellow);
    m.box(0.25, H - 0.57, -0.455, 0.4, 0.29, 0.018, '#638e98', 'glass');
    m.box(0.755, H - 0.57, -0.37, 0.018, 0.29, 0.35, '#729ba1', 'glass');
    const tail = -2.1,
      end = c.jib;
    for (const z of [-0.17, 0.17] satisfies [number, number]) {
      m.rod([tail, H, z], [end, H, z], 0.025, yellow, 8);
      m.rod(
        [tail, H + 0.37, z] satisfies [number, number, number],
        [end, H + 0.37, z],
        0.02,
        yellow,
        8,
      );
    }
    for (let x = tail; x < end - 0.1; x += 0.5) {
      const next = Math.min(end, x + 0.5);
      for (const side of [-1, 1] satisfies [number, number])
        m.rod(
          [x, H, side * 0.17],
          [next, H + 0.37, side * 0.17] satisfies [number, number, number],
          0.012,
          yellow,
          6,
        );
      m.rod([x, H, -0.17], [x, H, 0.17], 0.015, yellow, 6);
    }
    m.rod(
      [0, H + 0.38, 0] satisfies [number, number, number],
      [0, H + 1.12, 0] satisfies [number, number, number],
      0.025,
      yellow,
      8,
    );
    m.rod(
      [0, H + 1.1, 0] satisfies [number, number, number],
      [end - 0.4, H + 0.37, 0] satisfies [number, number, number],
      0.009,
      dark,
      5,
    );
    m.rod(
      [0, H + 1.1, 0] satisfies [number, number, number],
      [tail, H + 0.37, 0] satisfies [number, number, number],
      0.009,
      dark,
      5,
    );
    for (let i = 0; i < 3; i++)
      m.box(tail + 0.15 + i * 0.31, H - 0.43, -0.3, 0.29, 0.41, 0.6, '#989f98', 'stone');
    const hoist = end * 0.72,
      drop = 2.5;
    m.box(hoist - 0.13, H - 0.03, -0.23, 0.26, 0.1, 0.46, dark);
    m.rod(
      [hoist, H, 0],
      [hoist, H - drop, 0] satisfies [number, number, number],
      0.008,
      '#414d4d',
      5,
    );
    m.sphere(hoist, H - drop, 0, 0.06, 0.09, 0.05, yellow, 12, 6);
    m.rod(
      [hoist, H - drop - 0.04, 0] satisfies [number, number, number],
      [hoist, H - drop - 0.22, 0.03] satisfies [number, number, number],
      0.015,
      dark,
      6,
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [hoist, H - drop - 0.16, 0] satisfies [number, number, number],
        [hoist + side * 0.46, H - drop - 0.65, 0] satisfies [number, number, number],
        0.007,
        dark,
        5,
      );
    for (const z of [-0.1, 0.1] satisfies [number, number])
      m.box(hoist - 0.6, H - drop - 0.79, z - 0.045, 1.2, 0.16, 0.09, '#7c8886', { metal: 0.3 });
    m.sphere(0, H + 1.16, 0, 0.055, 0.055, 0.055, '#e28b64', 12, 6, { emissive: 0.55 });
  });
}

export function drawSquareConstruction(
  m: Mesh,
  signs: SignAtlas,
  terrain: import('./types/parcels.ts').ParcelTerrain,
) {
  const s = SQUARE_DIGSITE,
    p = s.pit,
    start = m.data.length,
    floor = terrain.height(p.x, p.z) - p.depth;
  terrain.cutPlot({ cx: p.x, cz: p.z, w: p.w, d: p.d, height: floor, onlyLower: true });
  // Cover the actual lowered height-field triangles with soil. There is no
  // open hole, second flat floor, or sea visible beneath the excavation.
  for (let z = s.north; z < s.south - 1e-8; z += 0.25)
    for (let x = s.west; x < s.east - 1e-8; x += 0.25) {
      const at = (u: number, v: number) => [u, terrain.height(u, v) + 0.014, v];
      m.quad(at(x, z), at(x, z + 0.25), at(x + 0.25, z + 0.25), at(x + 0.25, z), '#ad9570', 'dirt');
    }
  for (const f of SQUARE_SITE_FENCES) {
    const along = f.w > f.d,
      length = along ? f.w : f.d,
      n = Math.ceil(length / 0.5);
    for (let i = 0; i <= n; i++) {
      const x = f.x + (along ? (i / n - 0.5) * length : 0),
        z = f.z + (along ? 0 : (i / n - 0.5) * length),
        h = terrain.height(x, z);
      m.rod([x, h, z], [x, h + 0.85, z], 0.018, '#7e9293', 6);
    }
    const a = [f.x - (along ? length / 2 : 0), f.z - (along ? 0 : length / 2)] satisfies [
        number,
        number,
      ],
      b = [f.x + (along ? length / 2 : 0), f.z + (along ? 0 : length / 2)] satisfies [
        number,
        number,
      ];
    for (const y of [0.3, 0.75] satisfies [number, number])
      m.rod(
        [a[0], terrain.height(...a) + y, a[1]],
        [b[0], terrain.height(...b) + y, b[1]],
        0.012,
        '#819797',
        6,
      );
  }
  const e = s.excavator;
  drawExcavator(m, { ...e, y: terrain.height(e.x, e.z) + 0.02 });
  for (const c of SQUARE_CRANES) drawTowerCrane(m, c, terrain.height(c.x, c.z) + 0.02);
  // Spoil, stacked concrete pipes and a small unfinished frame describe the
  // work beneath the jibs without filling the pedestrian plaza with props.
  for (let i = 0; i < 5; i++)
    m.sphere(
      53.2 + i * 0.14,
      terrain.height(53.2 + i * 0.14, 154.1) + 0.09,
      154.1,
      0.19,
      0.13 + (i % 2) * 0.04,
      0.16,
      '#9e8664',
      12,
      6,
      'dirt',
    );
  for (const z of [156.9, 157.14] satisfies [number, number]) {
    const y = terrain.height(53.3, z);
    m.rod([53.04, y + 0.1, z], [53.58, y + 0.1, z], 0.09, '#a8afa4', 16);
    m.sphere(53.59, y + 0.1, z, 0.008, 0.06, 0.06, '#626d65', 12, 6);
  }
  const h = terrain.height(71.1, 160.3);
  m.box(70.7, h, 159.6, 0.8, 0.1, 1.4, '#b4b8ab', 'stone');
  for (const x of [70.76, 71.44] satisfies [number, number])
    for (const z of [159.66, 160.94] satisfies [number, number]) {
      m.box(x - 0.035, h + 0.1, z - 0.035, 0.07, 2.6, 0.07, '#9e7860', { metal: 0.2 });
      for (let y = 0.65; y < 2.5; y += 0.6)
        m.rod([70.76, h + y, z], [71.44, h + y, z], 0.016, '#708c8d', 6);
    }
  for (const x of [70.76, 71.44] satisfies [number, number])
    for (const y of [1.2, 2.7] satisfies [number, number])
      m.rod([x, h + y, 159.66], [x, h + y, 160.94], 0.027, '#9e7860', 8);
  const signBase = terrain.height(55.45, 155.55);
  m.box(55.41, signBase + 0.4, 155.15, 0.08, 0.32, 0.8, '#466367');
  pose(m, 55.46, signBase + 0.44, 155.55, -Math.PI / 2, () =>
    drawPlaque(m, signs, 'HILLSBOROUGH WORKS', 0, 0, 0.045, 0.72, 0.2),
  );
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return {
    id: 'times-square-works',
    label: contentText('square-construction.drawSquareConstruction.label-1', {}),
    kind: 'construction',
    entry: { ...s.entry },
    description: contentText('square-construction.drawSquareConstruction.description-2', {}),
    base: terrain.height(s.foreman.x, s.foreman.z),
    start,
    count: m.data.length - start,
    lo,
    hi,
    navigationPolygons: squareConstructionPolygons(),
  };
}
