import type { InteriorSection } from './types/interiors.ts';
import { drawPiercedWall } from './wall-openings.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import {
  recordInstitutePart,
  drawInstituteFloor,
  drawInstituteWall,
  instituteWindowOpenings,
} from './institute-interiors.ts';
import { drawPlaque } from './southern-district.ts';
import type { SignAtlas } from './types/world.ts';

// The same parcels place the models, exclude solid ground, and color the map.
export const BERKELEY_CAMPUS = Object.freeze({
  bounds: [-9, 1.6, 9, 18.5] satisfies [number, number, number, number],
  buildings: [
    {
      id: 'institute',
      rect: [-3.6, 5.7, 3.6, 10.6] satisfies [number, number, number, number],
      color: '#a8bbb3',
    },
    {
      id: 'campanile',
      rect: [-7.4, 8, -5.8, 9.6] satisfies [number, number, number, number],
      color: '#c9c6b1',
    },
    {
      id: 'library',
      rect: [-3.9, 15.4, 3.9, 17.9] satisfies [number, number, number, number],
      color: '#c5bda6',
    },
    {
      id: 'reading-room',
      rect: [6.3, 7, 8.1, 12] satisfies [number, number, number, number],
      color: '#bbad96',
    },
  ],
  paths: [
    [-0.55, -0.25, 0.55, 3.5] satisfies [number, number, number, number],
    [-7.8, 2.1, 7.8, 4.3] satisfies [number, number, number, number],
    [-5.8, 3.6, -4.2, 15.3] satisfies [number, number, number, number],
    [4.2, 3.6, 5.8, 15.3] satisfies [number, number, number, number],
    [-5.8, 11.4, 5.8, 15.3] satisfies [number, number, number, number],
    [-1.5, 4.3, 1.5, 5.7] satisfies [number, number, number, number],
  ],
  trees: [
    [-8, 4.8] satisfies [number, number],
    [-8, 11.8] satisfies [number, number],
    [-7.5, 16.3] satisfies [number, number],
    [8.1, 4.8] satisfies [number, number],
    [8.2, 14.3] satisfies [number, number],
    [6.2, 17.2] satisfies [number, number],
  ],
  obstacles: [
    { u: 0, v: 12.8, r: 1 },
    { u: -3.1, v: 13.7, r: 0.85 },
    { u: 3.1, v: 13.7, r: 0.85 },
    ...([-0.95, 0.95] satisfies [number, number]).map((u) => ({ u, v: 5.22, r: 0.09 })),
    ...([-4.95, 4.95] satisfies [number, number]).flatMap((u) =>
      ([2.8, 14.7] satisfies [number, number]).map((v) => ({ u, v, r: 0.09 })),
    ),
  ],
});
export const BERKELEY_INSTITUTE_ROOM = Object.freeze({
  id: 'berkeley-esoteric',
  x: 0,
  z: 8.15,
  w: 7.2,
  d: 4.9,
  base: 0,
  front: -1,
  rotation: 0,
});
const berkeleyStone = '#c6c3ad',
  berkeleyTrim = '#ddd6bd',
  berkeleyCopper = '#6c9792',
  berkeleyBrass = '#b6a46c';
function berkeleyGable(
  m: Mesh,
  x: number,
  z: number,
  w: number,
  d: number,
  y: number,
  color = '#9c6855',
) {
  for (const side of [-1, 1] satisfies [number, number])
    m.quad(
      [x - w / 2 - 0.1, y, z + side * (d / 2 + 0.12)] satisfies [number, number, number],
      [x + w / 2 + 0.1, y, z + side * (d / 2 + 0.12)] satisfies [number, number, number],
      [x + w / 2 + 0.1, y + 0.65, z] satisfies [number, number, number],
      [x - w / 2 - 0.1, y + 0.65, z] satisfies [number, number, number],
      color,
      'roofTile',
    );
  for (const side of [-1, 1] satisfies [number, number])
    m.tri(
      [x + (side * w) / 2, y, z - d / 2] satisfies [number, number, number],
      [x + (side * w) / 2, y, z + d / 2] satisfies [number, number, number],
      [x + (side * w) / 2, y + 0.65, z] satisfies [number, number, number],
      berkeleyStone,
      'stone',
    );
}
function berkeleyPortal(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  { open = false, transparent = false } = {},
) {
  const shoulder = y + h - w / 2;
  if (!open) {
    if (transparent)
      m.quad(
        [x - w / 2, y, z] satisfies [number, number, number],
        [x + w / 2, y, z] satisfies [number, number, number],
        [x + w / 2, shoulder, z] satisfies [number, number, number],
        [x - w / 2, shoulder, z] satisfies [number, number, number],
        '#b9d2d5',
        { glass: 0.1 },
      );
    else m.box(x - w / 2, y, z - 0.025, w, h - w / 2, 0.045, '#3e6267', 'glass');
  }
  for (let i = 0; i < 20; i++) {
    const a = (i * Math.PI) / 20,
      b = ((i + 1) * Math.PI) / 20,
      at = (t: number, r: number) =>
        [x + Math.cos(t) * r, shoulder + Math.sin(t) * r, z] satisfies [number, number, number];
    if (!open)
      m.tri(
        [x, shoulder, z] satisfies [number, number, number],
        at(a, w / 2),
        at(b, w / 2),
        transparent ? '#b9d2d5' : '#496e72',
        transparent ? { glass: 0.1 } : 'glass',
      );
    m.quad(
      at(a, w / 2),
      at(b, w / 2),
      at(b, w / 2 + 0.075),
      at(a, w / 2 + 0.075),
      berkeleyTrim,
      'stone',
    );
  }
  for (const side of [-1, 1] satisfies [number, number])
    m.box(x + (side * w) / 2 - 0.04, y, z - 0.015, 0.08, h - w / 2, 0.08, berkeleyTrim, 'stone');
  if (!open)
    m.rod(
      [x, y, z + 0.04] satisfies [number, number, number],
      [x, y + h - 0.1, z + 0.04] satisfies [number, number, number],
      0.019,
      berkeleyBrass,
      8,
      { metal: 0.3 },
    );
}
function berkeleyOrbit(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  r: number,
  tilt: number,
  angle: number,
  color = berkeleyBrass,
) {
  pose(m, x, y, z, angle, () => {
    for (let i = 0; i < 48; i++) {
      const at = (a: number) =>
        [
          Math.cos(a) * r,
          Math.sin(a) * r * Math.sin(tilt),
          Math.sin(a) * r * Math.cos(tilt),
        ] satisfies [number, number, number];
      m.rod(at((i * Math.PI) / 24), at(((i + 1) * Math.PI) / 24), 0.024, color, 8, { metal: 0.35 });
    }
  });
}

/** An original, deliberately peculiar institute inside a tiny Berkeley campus:
 * a campanile, a classical library, redwoods and a real walkable quadrangle. */
export function drawBerkeleyCampus(m: Mesh, signs: SignAtlas, title: string) {
  const b = BERKELEY_CAMPUS;
  m.box(-9, -0.12, 1.6, 18, 0.12, 16.9, '#839774', 'grass');
  for (const [x, z, xx, zz] of b.paths)
    m.box(x, 0.003, z, xx - x, 0.012, zz - z, '#c6c5b1', 'stone');
  for (const [x, z] of [
    [-9, 1.6] satisfies [number, number],
    [-9, 18.35] satisfies [number, number],
  ])
    m.box(x, -0.03, z, 18, 0.07, 0.15, '#aab49d', 'stone');
  for (const x of [-9, 8.85] satisfies [number, number])
    m.box(x, -0.03, 1.6, 0.15, 0.07, 16.9, '#aab49d', 'stone');
  for (const x of [-4.95, 4.95] satisfies [number, number])
    for (let z = 4.5; z < 15; z += 0.75) m.box(x, 0.02, z, 0.015, 0.003, 0.45, '#a9b4a5');
  // Asymmetric intersecting volumes, an open portico, and an eight-sided
  // copper observatory replace the flat rectangular office.
  const instituteStart = m.data.length,
    parts: InteriorSection[] = [],
    room = BERKELEY_INSTITUTE_ROOM;
  recordInstitutePart(m, parts, 'floor', null, () => drawInstituteFloor(m, room, 2));
  for (let side = 0; side < 4; side++)
    recordInstitutePart(m, parts, 'wall', side, () => {
      drawInstituteWall(m, room, side, 2.75, '#b1bfb2', berkeleyTrim, {
        openings: instituteWindowOpenings(room, side, 'berkeley'),
        cornices: [2.24, 2.73] satisfies [number, number],
      });
      if (side < 2) {
        const front = side === 0,
          z = front ? 5.675 : 10.625;
        for (const x of [-2.85, -1.85, 1.15, 2.15] satisfies [number, number, number, number])
          berkeleyPortal(m, x, 0.45, z, 0.64, 1.65, { transparent: true });
        if (front) {
          berkeleyPortal(m, 0, 0.015, 5.675, 1.5, 2.12, { open: true });
          for (const x of [-0.95, 0.95] satisfies [number, number]) {
            m.cylinder(x, 0, 5.22, 0.085, 2.18, berkeleyTrim, 20);
            m.cylinder(x, 2.09, 5.22, 0.14, 0.1, berkeleyTrim, 20);
          }
          m.box(-1.18, 2.17, 5.02, 2.36, 0.1, 0.8, berkeleyTrim, 'stone');
          m.box(-3.22, 2.3, 5.64, 6.44, 0.35, 0.04, '#354e59');
          drawPlaque(m, signs, title, 0, 2.31, 5.62, 6.1, 0.32, false);
        }
      } else {
        const sign = side === 2 ? -1 : 1;
        pose(m, sign * 3.61, 0, 8.15, (sign * Math.PI) / 2, () => {
          for (let i = 0; i < 4; i++)
            berkeleyPortal(m, -1.8 + i * 1.18, 0.55, 0, 0.65, 1.5, { transparent: true });
        });
      }
    });
  recordInstitutePart(m, parts, 'roof', null, () => {
    m.box(-3.72, 2.75, 5.58, 7.44, 0.09, 5.14, berkeleyTrim, 'stone');
    // A shifted upper study, pierced by a watchful circular stained-glass eye.
    for (const isX of [false, true] satisfies [boolean, boolean])
      for (const far of [false, true] satisfies [boolean, boolean])
        drawPiercedWall(m, {
          isX,
          far,
          plane: isX ? (far ? -2.25 : 1.35) : far ? 6.45 : 9.35,
          along: isX ? 6.45 : -2.25,
          y: 2.84,
          w: isX ? 2.9 : 3.6,
          h: 1.55,
          depth: 0.1,
          color: '#8da8a6',
          openings: !isX
            ? [{ x: -1.05, y: 3.1, w: 1.2, h: 1.04, ellipse: true, segments: 24 }]
            : [],
        });
    m.box(-2.4, 4.38, 6.3, 3.9, 0.12, 3.2, berkeleyTrim, 'stone');
    for (const side of [-1, 1] satisfies [number, number])
      pose(m, -0.45, 3.62, side < 0 ? 6.415 : 9.385, side < 0 ? 0 : Math.PI, () => {
        for (let i = 0; i < 48; i++) {
          const a = (i * Math.PI) / 24,
            b = ((i + 1) * Math.PI) / 24;
          m.tri(
            [0, 0, 0] satisfies [number, number, number],
            [Math.cos(a) * 0.6, Math.sin(a) * 0.52, 0] satisfies [number, number, number],
            [Math.cos(b) * 0.6, Math.sin(b) * 0.52, 0] satisfies [number, number, number],
            '#a6c8cc',
            { glass: 0.13 },
          );
        }
        for (let i = 0; i < 48; i++) {
          const a = (i * Math.PI) / 24,
            b = ((i + 1) * Math.PI) / 24;
          m.rod(
            [Math.cos(a) * 0.61, Math.sin(a) * 0.53, -0.035] satisfies [number, number, number],
            [Math.cos(b) * 0.61, Math.sin(b) * 0.53, -0.035] satisfies [number, number, number],
            0.032,
            berkeleyBrass,
            8,
            { metal: 0.4 },
          );
        }
        for (let i = 0; i < 24; i++) {
          const a = (i * Math.PI) / 12,
            b = ((i + 1) * Math.PI) / 12;
          m.tri(
            [0, 0, -0.04] satisfies [number, number, number],
            [Math.cos(a) * 0.15, Math.sin(a) * 0.21, -0.04] satisfies [number, number, number],
            [Math.cos(b) * 0.15, Math.sin(b) * 0.21, -0.04] satisfies [number, number, number],
            '#95bbb7',
            { glass: 0.22 },
          );
        }
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          m.rod(
            [Math.cos(a) * 0.16, Math.sin(a) * 0.2, -0.065] satisfies [number, number, number],
            [Math.cos(a + 0.3) * 0.58, Math.sin(a + 0.3) * 0.5, -0.065] satisfies [
              number,
              number,
              number,
            ],
            0.014,
            berkeleyBrass,
            6,
            { metal: 0.3 },
          );
        }
      });
    pose(m, 1.9, 2.84, 8.35, Math.PI / 8, () => {
      for (let face = 0; face < 8; face++)
        pose(m, 0, 0, 0, (face * Math.PI) / 4, () =>
          drawPiercedWall(m, {
            plane: 1.205,
            along: -0.5,
            y: 0,
            w: 1,
            h: 1.9,
            depth: 0.1,
            color: '#a5b8aa',
            openings: [{ x: -0.3, y: 0.45, w: 0.6, h: 1.2, arch: true, segments: 20 }],
          }),
        );
      m.cylinder(0, 1.78, 0, 1.42, 0.12, berkeleyTrim, 8);
      for (let face = 0; face < 8; face++)
        pose(m, 0, 0, 0, (face * Math.PI) / 4, () =>
          berkeleyPortal(m, 0, 0.45, 1.215, 0.6, 1.2, { transparent: true }),
        );
      // Twisted, terraced crown and an off-center armillary instrument.
      for (let i = 0; i < 4; i++)
        pose(m, 0, 0, 0, i * 0.075, () =>
          m.cylinder(
            0,
            1.9 + i * 0.19,
            0,
            1.44 - i * 0.24,
            0.2,
            berkeleyCopper,
            8,
            1.2 - i * 0.24,
            { metal: 0.25 },
          ),
        );
      m.cylinder(0, 2.65, 0, 0.085, 0.45, berkeleyBrass, 20, 0.04, { metal: 0.4 });
      for (let i = 0; i < 3; i++)
        berkeleyOrbit(m, 0, 3.24, 0, 0.6 - i * 0.1, 0.5 + i * 0.6, i * 1.1);
      m.sphere(0, 3.24, 0, 0.12, 0.12, 0.12, '#c5d8b9', 24, 14, { emissive: 0.22 });
    });
  });
  const institute = { start: instituteStart, end: m.data.length, parts, spec: room };
  // A miniature Sather-style campanile with open belfry and four clocks.
  pose(m, -6.6, 0, 8.8, 0, () => {
    m.box(-0.8, 0, -0.8, 1.6, 0.16, 1.6, berkeleyTrim, 'stone');
    m.box(-0.58, 0.16, -0.58, 1.16, 5.8, 1.16, berkeleyStone, 'stone');
    for (const y of [0.7, 4.65, 5.95, 7.15] satisfies [number, number, number, number])
      m.box(-0.69, y, -0.69, 1.38, 0.13, 1.38, berkeleyTrim, 'stone');
    for (let face = 0; face < 4; face++)
      pose(m, 0, 0, 0, (face * Math.PI) / 2, () => {
        for (const x of [-0.39, 0.39] satisfies [number, number])
          m.box(x - 0.035, 0.6, 0.593, 0.07, 4.02, 0.045, berkeleyTrim, 'stone');
        m.sphere(0, 5.35, 0.596, 0.33, 0.33, 0.018, '#e7dfc3', 32, 12);
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          m.rod(
            [Math.sin(a) * 0.25, 5.35 + Math.cos(a) * 0.25, 0.62] satisfies [
              number,
              number,
              number,
            ],
            [Math.sin(a) * 0.29, 5.35 + Math.cos(a) * 0.29, 0.62] satisfies [
              number,
              number,
              number,
            ],
            0.012,
            '#596d68',
            4,
          );
        }
        m.rod(
          [0, 5.35, 0.628] satisfies [number, number, number],
          [-0.15, 5.47, 0.628] satisfies [number, number, number],
          0.016,
          '#425b57',
          6,
        );
        m.rod(
          [0, 5.35, 0.63] satisfies [number, number, number],
          [0.16, 5.49, 0.63] satisfies [number, number, number],
          0.012,
          '#425b57',
          6,
        );
        for (const x of [-0.48, 0.48] satisfies [number, number])
          m.box(x - 0.055, 6.08, 0.48, 0.11, 1.07, 0.11, berkeleyTrim, 'stone');
        m.rod(
          [-0.42, 7, 0.535] satisfies [number, number, number],
          [0.42, 7, 0.535] satisfies [number, number, number],
          0.048,
          berkeleyTrim,
          12,
        );
      });
    m.cylinder(0, 6.4, 0, 0.24, 0.35, '#b7a16b', 24, 0.13, { metal: 0.4 });
    m.cylinder(0, 7.28, 0, 0.91, 1.1, berkeleyCopper, 4, 0, 'roof');
    m.cylinder(0, 8.38, 0, 0.025, 0.3, berkeleyBrass, 12, 0.005);
  });
  // A colonnaded Doe-like library and a smaller terracotta seminar hall.
  m.box(-3.9, 0, 15.4, 7.8, 2.45, 2.5, berkeleyStone, 'stone');
  for (let i = 0; i < 9; i++) berkeleyPortal(m, -3.35 + i * 0.84, 0.45, 15.38, 0.45, 1.5);
  for (let i = 0; i < 6; i++) {
    const x = -2.75 + i * 1.1;
    m.cylinder(x, 0, 15.05, 0.075, 2.2, berkeleyTrim, 20);
    m.cylinder(x, 2.1, 15.05, 0.12, 0.12, berkeleyTrim, 20);
  }
  m.box(-3.35, 2.22, 14.89, 6.7, 0.16, 0.65, berkeleyTrim, 'stone');
  m.tri(
    [-3.35, 2.38, 14.88] satisfies [number, number, number],
    [3.35, 2.38, 14.88] satisfies [number, number, number],
    [0, 3.18, 14.88] satisfies [number, number, number],
    berkeleyTrim,
    'stone',
  );
  berkeleyGable(m, 0, 16.65, 7.8, 2.5, 2.45);
  m.box(6.3, 0, 7, 1.8, 2.1, 5, '#baad96', 'stucco');
  berkeleyGable(m, 7.2, 9.5, 1.8, 5, 2.1);
  for (let i = 0; i < 4; i++)
    pose(m, 6.285, 0, 7.5 + i * 1.1, -Math.PI / 2, () => berkeleyPortal(m, 0, 0.4, 0, 0.5, 1.2));
  // A small impossible-looking instrument at the center of the public quad.
  m.cylinder(0, 0, 12.8, 0.85, 0.13, '#8e9d91', 40);
  m.cylinder(0, 0.13, 12.8, 0.54, 0.27, berkeleyTrim, 32, 0.4);
  for (let i = 0; i < 3; i++)
    berkeleyOrbit(m, 0, 1.2, 12.8, 0.77 - i * 0.13, 0.45 + i * 0.6, i * 0.9);
  m.sphere(0, 1.2, 12.8, 0.18, 0.18, 0.18, '#92b9bd', 24, 14, { emissive: 0.2 });
  for (const x of [-3.1, 3.1] satisfies [number, number]) {
    m.box(x - 0.65, 0.45, 13.47, 1.3, 0.065, 0.45, '#9b805e', 'wood');
    m.box(x - 0.65, 0.52, 13.85, 1.3, 0.44, 0.055, '#9b805e', 'wood');
    for (const dx of [-0.5, 0.5] satisfies [number, number])
      m.box(x + dx, 0, 13.5, 0.055, 0.45, 0.35, '#64766e');
  }
  for (const [index, [x, z]] of b.trees.entries()) {
    const h = 3.1 + (index % 3) * 0.45;
    m.cylinder(x, 0, z, 0.12, h, '#826e54', 16, 0.07, 'wood');
    for (let tier = 0; tier < 4; tier++)
      m.cylinder(x, 1.15 + tier * 0.55, z, 0.85 - tier * 0.16, 0.95, '#557e62', 16, 0.08, 'grass');
  }
  for (const x of [-4.95, 4.95] satisfies [number, number])
    for (const z of [2.8, 14.7] satisfies [number, number]) {
      m.cylinder(x, 0, z, 0.04, 1.9, '#4c7068', 16);
      m.cylinder(x, 0, z, 0.09, 0.12, '#4c7068', 16);
      m.sphere(x, 2.04, z, 0.16, 0.18, 0.16, '#eee4c2', 20, 12, { emissive: 0.65 });
      m.cylinder(x, 2.2, z, 0.05, 0.03, berkeleyBrass, 12, 0.01);
    }
  return institute;
}
