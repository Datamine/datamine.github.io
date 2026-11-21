import type { Material } from './types/geometry.ts';
import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { windowAppearance } from './materials.ts';
import { drawPlaque } from './southern-district.ts';
import { drawSquareStreetLife } from './times-square-life.ts';
import { TIMES_SQUARE, TIMES_SQUARE_BUILDINGS } from './southern-layout.ts';
import { drawCommercialRoof } from './rooftops.ts';

export const TIMES_SQUARE_EXAMINE = 'In my back yard?';
export const TIMES_SQUARE_SIGNS = Object.freeze(['TIMES SQUARE', 'BROADWAY'] satisfies [
  string,
  string,
]);

/** The LED faces share the sign atlas. RGB above one is the renderer's
 * emissive-atlas marker: artwork stays luminous without adding any lights. */
function squareScreen(
  m: Mesh,
  signs: SignAtlas,
  {
    x,
    y,
    z,
    w,
    h,
    art,
    angle = 0,
    curve = 0,
  }: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    art: string;
    angle?: number;
    curve?: number;
  },
) {
  // Move the entire assembly along the facade's outward normal. Windows and
  // their projecting trim must sit behind both flat and bowed screen faces.
  const standoff = 0.14;
  pose(m, x - Math.sin(angle) * standoff, y, z + Math.cos(angle) * standoff, angle, () => {
    m.box(-w / 2 - 0.055, -0.055, -0.11, w + 0.11, h + 0.11, 0.11, '#16232c', { metal: 0.3 });
    const uv = signs.get(art),
      segments = curve ? 12 : 1;
    for (let i = 0; i < segments; i++) {
      const u = i / segments,
        v = (i + 1) / segments,
        ax = (u - 0.5) * w,
        bx = (v - 0.5) * w,
        az = Math.cos((u - 0.5) * Math.PI) * curve,
        bz = Math.cos((v - 0.5) * Math.PI) * curve;
      const texture = uv && [
        [uv[0][0] + (uv[1][0] - uv[0][0]) * u, uv[0][1]] satisfies [number, number],
        [uv[0][0] + (uv[1][0] - uv[0][0]) * v, uv[1][1]] satisfies [number, number],
        [uv[3][0] + (uv[2][0] - uv[3][0]) * v, uv[2][1]] satisfies [number, number],
        [uv[3][0] + (uv[2][0] - uv[3][0]) * u, uv[3][1]] satisfies [number, number],
      ];
      m.quad(
        [ax, 0, az + 0.008] satisfies [number, number, number],
        [bx, 0, bz + 0.008] satisfies [number, number, number],
        [bx, h, bz + 0.008],
        [ax, h, az + 0.008],
        texture ? ([1.12, 1.12, 1.12] satisfies [number, number, number]) : '#8462a4',
        texture,
      );
      for (const yy of [-0.035, h + 0.025])
        m.rod([ax, yy, az + 0.015], [bx, yy, bz + 0.015], 0.012, '#657c83', 6, { metal: 0.25 });
    }
    for (const xx of [-w / 2 - 0.03, w / 2 + 0.03] satisfies [number, number])
      m.box(xx, -0.035, 0.015, 0.02, h + 0.07, 0.02, '#7c9295', { metal: 0.2 });
  });
}

function squareProfile(x: number, z: number, w: number, d: number, cut = 0.22) {
  const a = x - w / 2,
    b = x + w / 2,
    c = z - d / 2,
    e = z + d / 2,
    k = Math.min(cut, w * 0.2, d * 0.2);
  return [
    [a + k, c] satisfies [number, number],
    [b - k, c] satisfies [number, number],
    [b, c + k] satisfies [number, number],
    [b, e - k] satisfies [number, number],
    [b - k, e] satisfies [number, number],
    [a + k, e] satisfies [number, number],
    [a, e - k] satisfies [number, number],
    [a, c + k] satisfies [number, number],
  ];
}
function squareExtrusion(
  m: Mesh,
  points: readonly (readonly number[])[],
  y: number,
  h: number,
  color: string,
  material?: Material,
) {
  const center = points.reduce(
    (v, p) => [v[0] + p[0] / points.length, v[1] + p[1] / points.length] satisfies [number, number],
    [0, 0] satisfies [number, number],
  );
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    m.quad(
      [b[0], y, b[1]],
      [a[0], y, a[1]],
      [a[0], y + h, a[1]],
      [b[0], y + h, b[1]],
      color,
      material,
    );
    m.tri([center[0], y + h, center[1]], [b[0], y + h, b[1]], [a[0], y + h, a[1]], color, material);
  }
}
function squareTower(
  m: Mesh,
  b: (typeof TIMES_SQUARE_BUILDINGS)[number],
  base: number,
  index: number,
) {
  const palette = ['#a8aba5', '#b89576', '#547c8d', '#a66a5c', '#91a6ab'] satisfies [
      string,
      string,
      string,
      string,
      string,
    ],
    body = palette[index];
  // Three successively narrower, clipped-corner volumes, rather than one box.
  for (const [level, inset, h] of [
    [0, 0, b.h * 0.58] satisfies [number, number, number],
    [b.h * 0.58, 0.16, b.h * 0.27] satisfies [number, number, number],
    [b.h * 0.85, 0.34, b.h * 0.15] satisfies [number, number, number],
  ]) {
    const points = squareProfile(
      b.x,
      b.z,
      b.w - inset * 2,
      b.d - inset * 2,
      index === 2 ? 0.38 : 0.19,
    );
    squareExtrusion(
      m,
      points,
      base + level,
      h,
      body,
      index === 2 ? 'glass' : index % 2 ? 'brick' : 'stone',
    );
    squareExtrusion(m, points, base + level + h - 0.07, 0.11, index === 3 ? '#e1c293' : '#bdc6c4', {
      metal: 0.15,
    });
    for (let floor = level + 0.4; floor < level + h - 0.15; floor += 0.64) {
      squareExtrusion(m, points, base + floor, 0.045, index === 2 ? '#91c6cd' : '#cfbeb0');
      for (const side of [-1, 1] satisfies [number, number])
        for (let j = 0; j < 3; j++) {
          const x = b.x - b.w / 2 + inset + 0.18 + (j * (b.w - inset * 2 - 0.32)) / 3,
            y = base + floor + 0.08,
            z = b.z + side * (b.d / 2 - inset + 0.006),
            w = (b.w - inset * 2 - 0.6) / 3;
          const pane = windowAppearance(x, y, z, index * 91 + j),
            points = [
              [x, y, z],
              [x + w, y, z],
              [x + w, y + 0.3, z],
              [x, y + 0.3, z],
            ];
          if (side < 0) points.reverse();
          m.quad(points[0], points[1], points[2], points[3], pane.color, pane.material);
        }
    }
    for (const [x, z] of points)
      m.box(x - 0.018, base + level, z - 0.018, 0.036, h, 0.036, '#b5c8c9', { metal: 0.12 });
  }
  for (const side of [-1, 1] satisfies [number, number])
    pose(
      m,
      b.x + side * (b.w / 2 + 0.012),
      base,
      b.z,
      side > 0 ? -Math.PI / 2 : Math.PI / 2,
      () => {
        for (let floor = 0.5; floor < b.h * 0.57; floor += 0.64)
          for (let j = 0; j < 3; j++) {
            const u = -b.d / 2 + 0.22 + (j * (b.d - 0.36)) / 3,
              pane = windowAppearance(b.x + side, b.z, floor, j + index * 37);
            m.quad(
              [u, floor, 0] satisfies [number, number, number],
              [u + (b.d - 0.65) / 3, floor, 0] satisfies [number, number, number],
              [u + (b.d - 0.65) / 3, floor + 0.31, 0] satisfies [number, number, number],
              [u, floor + 0.31, 0] satisfies [number, number, number],
              pane.color,
              pane.material,
            );
          }
        const inward = index > 0 && (b.x < 63 ? side > 0 : side < 0);
        if (inward) {
          for (let j = 0; j < 3; j++) {
            const u = -b.d / 2 + 0.2 + (j * (b.d - 0.35)) / 3,
              w = (b.d - 0.7) / 3;
            m.box(u, 0.06, 0.013, w, 0.85, 0.027, '#45676b', 'glass');
            m.box(u - 0.045, 0, 0.005, 0.06, 1, 0.075, '#c9bca3', 'stone');
            m.box(u, 0.3, 0.047, w, 0.023, 0.018, '#bcae94');
          }
          m.box(
            -b.d / 2 + 0.12,
            1.03,
            0.02,
            b.d - 0.24,
            0.065,
            0.25,
            index % 2 ? '#647f76' : '#8d7867',
            'wood',
          );
        }
      },
    );
  // Mechanical penthouses, art-deco copper caps, and antennae vary the skyline.
  if (index % 2) {
    const y = base + b.h + 0.1;
    for (let j = 0; j < 4; j++)
      squareExtrusion(
        m,
        squareProfile(b.x, b.z, b.w * 0.65 - j * 0.2, b.d * 0.65 - j * 0.25, 0.08),
        y + j * 0.18,
        0.19,
        j % 2 ? '#78a296' : '#92b7a7',
        { metal: 0.18 },
      );
    m.cylinder(b.x, y + 0.72, b.z, 0.025, 0.72, '#ded7be', 8);
  } else {
    const w = b.w - 0.72,
      d = b.d - 0.72;
    drawCommercialRoof(m, {
      x: b.x - w / 2,
      y: base + b.h + 0.08,
      z: b.z - d / 2,
      w,
      d,
      seed: index * 3.17 + 9,
      parapets: false,
    });
  }
}

/** A compact downtown neighborhood: stone and brick setbacks, working shops,
 * restrained advertising, cafe seating, books, music and a construction site. */
export function drawTimesSquare(m: Mesh, signs: SignAtlas) {
  const p = TIMES_SQUARE,
    base = p.base,
    start = m.data.length;
  m.box(
    p.west,
    base - 0.035,
    p.north,
    p.east - p.west,
    0.047,
    p.south - p.north,
    '#969d9f',
    'stone',
  );
  for (const z of [153.7, 155.3] satisfies [number, number])
    m.box(p.west, base + 0.013, z, p.east - p.west, 0.018, 0.14, '#c8c9ba', 'stone');
  for (const b of TIMES_SQUARE_BUILDINGS) {
    for (const z of [b.z - b.d / 2 - 0.3, b.z + b.d / 2 + 0.3] satisfies [number, number])
      m.box(b.x - b.w / 2 - 0.22, base + 0.005, z, b.w + 0.44, 0.04, 0.18, '#bfc2bc', 'stone');
  }
  const adSets = [
    ['ts-market', 'ts-cola', 'ts-think'] satisfies [string, string, string],
    ['ts-cola', 'ts-night', 'ts-moonshot'] satisfies [string, string, string],
    ['ts-market', 'ts-moonshot', 'ts-night'] satisfies [string, string, string],
    ['ts-broadway', 'ts-night', 'ts-broadway'] satisfies [string, string, string],
    ['ts-think', 'ts-cola', 'ts-market'] satisfies [string, string, string],
  ];
  for (const [i, b] of TIMES_SQUARE_BUILDINGS.entries()) {
    squareTower(m, b, base, i);
    const angle = i === 0 ? 0 : b.x < 63 ? -Math.PI / 2 : Math.PI / 2,
      sideX = i === 0 ? b.x : b.x + (b.x < 63 ? b.w / 2 : -b.w / 2),
      sideZ = i === 0 ? b.z + b.d / 2 + 0.04 : b.z;
    const width = i === 0 ? b.w * 0.95 : b.d * 0.88;
    squareScreen(m, signs, {
      x: sideX,
      y: base + 1.1,
      z: sideZ,
      w: width,
      h: i === 3 ? 2.3 : 1.65,
      art: adSets[i][0],
      angle,
      curve: i === 2 ? 0.14 : 0,
    });
    if (b.h > 5)
      squareScreen(m, signs, {
        x: sideX,
        y: base + 3.1,
        z: sideZ,
        w: width * 0.88,
        h: 1.65,
        art: adSets[i][1],
        angle,
      });
    if (b.h > 8)
      squareScreen(m, signs, {
        x: sideX,
        y: base + 5.3,
        z: sideZ,
        w: width * 0.7,
        h: i === 0 ? 2.4 : 2,
        art: adSets[i][2],
        angle,
      });
    // Second street-facing elevation keeps screens visible as the camera turns.
    for (const side of i === 0 ? [-1] : ([-1, 1] satisfies [number, number]))
      squareScreen(m, signs, {
        x: b.x,
        y: base + 2.1,
        z: b.z + side * (b.d / 2 + 0.04),
        w: b.w * 0.89,
        h: i === 3 ? 1.6 : 1.8,
        art: adSets[i][side < 0 ? 2 : 0],
        angle: side < 0 ? Math.PI : 0,
      });
  }
  const one = TIMES_SQUARE_BUILDINGS[0];
  for (let i = 0; i < 4; i++)
    squareExtrusion(
      m,
      squareProfile(63, 149.4, 1.7 - i * 0.27, 2.1 - i * 0.3, 0.12),
      base + one.h + 0.12 + i * 0.18,
      0.19,
      '#a9b8be',
      { metal: 0.35 },
    );
  // Broadway's projecting gold-bulb canopy and ticket doors.
  const theater = TIMES_SQUARE_BUILDINGS[3];
  pose(m, theater.x, base, theater.z - theater.d / 2 - 0.12, Math.PI, () => {
    m.box(-1.12, 1.02, -0.02, 2.24, 0.26, 0.32, '#6a2945');
    m.box(-1.17, 1.28, -0.03, 2.34, 0.08, 0.36, '#c6a15d', { metal: 0.3 });
    drawPlaque(m, signs, 'BROADWAY', 0, 1.05, 0.315, 2.03, 0.2, true);
    for (let i = 0; i < 15; i++)
      for (const z of [0.04, 0.31] satisfies [number, number])
        m.sphere(-1.07 + i * 0.153, 1, z, 0.026, 0.026, 0.026, '#ffe6a2', 8, 4, { emissive: 0.85 });
    for (const x of [-0.64, 0, 0.64] satisfies [number, number, number]) {
      m.box(x - 0.2, 0, 0.04, 0.4, 0.94, 0.035, '#21434c', { window: 0.25 });
      m.box(x - 0.22, 0, 0.08, 0.025, 0.94, 0.025, '#cfac6d');
    }
  });
  drawSquareStreetLife(m, signs);
  let top = base + one.h + 2.5;
  for (let i = start; i < m.data.length; i += 11) top = Math.max(top, m.data[i + 1]);
  return {
    id: 'times-square',
    kind: 'times-square',
    label: contentText('times-square.drawTimesSquare.label-1', {}),
    entry: { ...p.entry },
    description: TIMES_SQUARE_EXAMINE,
    base,
    start,
    count: m.data.length - start,
    lo: [p.west, base - 0.04, p.north] satisfies [number, number, number],
    hi: [p.east, top, p.south] satisfies [number, number, number],
  };
}
