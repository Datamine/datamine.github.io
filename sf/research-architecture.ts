import type { InteriorSection } from './types/interiors.ts';
import type { SignAtlas } from './types/world.ts';
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

const researchBrass = '#bda46d',
  researchIvory = '#ded4bb',
  researchCopper = '#72978e';

function researchPanel(
  m: Mesh,
  signs: SignAtlas,
  id: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
) {
  // Flush panels need only visible faces, rather than hidden box geometry
  // behind every little ceramic tile in the cornice.
  m.quad(
    [x - 0.045, y - 0.045, z + 0.012] satisfies [number, number, number],
    [x + w + 0.045, y - 0.045, z + 0.012] satisfies [number, number, number],
    [x + w + 0.045, y + h + 0.045, z + 0.012] satisfies [number, number, number],
    [x - 0.045, y + h + 0.045, z + 0.012] satisfies [number, number, number],
    researchBrass,
    { metal: 0.2 },
  );
  m.quad(
    [x, y, z + 0.021] satisfies [number, number, number],
    [x + w, y, z + 0.021] satisfies [number, number, number],
    [x + w, y + h, z + 0.021] satisfies [number, number, number],
    [x, y + h, z + 0.021] satisfies [number, number, number],
    '#eee9db',
    signs.get(id) || 'stone',
  );
}

// Upright arched glazing and projecting stone voussoirs. The ambient window
// shader belongs only to the glass; each lead line is separate solid geometry.
function researchArch(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  { stained = false, seed = 0, open = false, transparent = false } = {},
) {
  const r = w / 2,
    shoulder = y + h - r,
    glass = stained ? '#7c9694' : seed % 3 ? '#42626b' : '#adab92',
    point = (a: number, rr: number) =>
      [x + Math.cos(a) * rr, shoulder + Math.sin(a) * rr, z] satisfies [number, number, number];
  if (!open)
    m.quad(
      [x - r, y, z] satisfies [number, number, number],
      [x + r, y, z] satisfies [number, number, number],
      [x + r, shoulder, z] satisfies [number, number, number],
      [x - r, shoulder, z] satisfies [number, number, number],
      transparent ? '#b9d2d5' : glass,
      transparent ? { glass: 0.1 } : { window: seed % 3 ? 0.035 : 0.18 },
    );
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 12,
      b = ((i + 1) * Math.PI) / 12;
    if (!open)
      m.tri(
        [x, shoulder, z] satisfies [number, number, number],
        point(a, r),
        point(b, r),
        transparent
          ? stained
            ? (
                ['#a5bdb8', '#c2bca4', '#aab6c2', '#bfb1bd'] satisfies [
                  string,
                  string,
                  string,
                  string,
                ]
              )[i % 4]
            : '#b9d2d5'
          : stained
            ? (
                ['#7c9e9b', '#b7a179', '#6a7e93', '#9d8796'] satisfies [
                  string,
                  string,
                  string,
                  string,
                ]
              )[i % 4]
            : glass,
        transparent ? { glass: stained ? 0.16 : 0.1 } : { window: 0.06 },
      );
    m.quad(
      point(a, r),
      point(b, r),
      point(b, r + 0.055),
      point(a, r + 0.055),
      i % 4 === 0 ? researchBrass : researchIvory,
      'stone',
    );
  }
  for (const side of [-1, 1] satisfies [number, number])
    m.box(
      x + side * r - 0.027,
      y - 0.04,
      z - 0.01,
      0.054,
      h - r + 0.06,
      0.07,
      researchIvory,
      'stone',
    );
  m.box(x - r - 0.065, y - 0.055, z - 0.015, w + 0.13, 0.06, 0.14, researchIvory, 'stone');
  if (!open)
    m.rod(
      [x, y, z + 0.032] satisfies [number, number, number],
      [x, y + h - 0.025, z + 0.032] satisfies [number, number, number],
      0.012,
      researchBrass,
      4,
    );
  if (!open)
    m.rod(
      [x - r, y + h * 0.48, z + 0.032] satisfies [number, number, number],
      [x + r, y + h * 0.48, z + 0.032] satisfies [number, number, number],
      0.01,
      researchBrass,
      4,
    );
}

function researchRose(m: Mesh, x: number, y: number, z: number, r: number, transparent = false) {
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12,
      b = ((i + 1) * Math.PI) / 12,
      at = (t: number, rr: number) =>
        [x + Math.cos(t) * rr, y + Math.sin(t) * rr, z] satisfies [number, number, number];
    m.tri(
      [x, y, z] satisfies [number, number, number],
      at(a, r),
      at(b, r),
      (['#659393', '#b3a27c', '#81768f', '#9da88b'] satisfies [string, string, string, string])[
        Math.floor(i / 3) % 4
      ],
      transparent ? { glass: 0.16 } : { window: 0.12 },
    );
    m.rod(at(a, r), at(b, r), 0.025, researchBrass, 4, { metal: 0.25 });
    if (i % 3 === 0) m.rod(at(a, r * 0.23), at(a, r), 0.012, researchIvory, 4);
  }
  m.sphere(x, y, z + 0.015, r * 0.23, r * 0.23, 0.025, '#c3c5a5', 12, 4, { emissive: 0.12 });
}

function researchOrbit(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  r: number,
  tilt: number,
  yaw: number,
) {
  pose(m, x, y, z, yaw, () => {
    for (let i = 0; i < 32; i++) {
      const at = (a: number) =>
        [
          Math.cos(a) * r,
          Math.sin(a) * r * Math.sin(tilt),
          Math.sin(a) * r * Math.cos(tilt),
        ] satisfies [number, number, number];
      m.rod(at((i * Math.PI) / 16), at(((i + 1) * Math.PI) / 16), 0.018, researchBrass, 4, {
        metal: 0.3,
      });
    }
  });
}

function researchObservatory(m: Mesh, signs: SignAtlas) {
  // Copper ribs, a tiled drum and a brass armillary make the roof an actual
  // scientific instrument, with an offset little reading room beside it.
  const x = -0.8,
    z = -0.25;
  m.cylinder(x, 3.39, z, 1.27, 0.5, '#94a6a0', 24, 1.27, 'stone');
  m.cylinder(x, 3.86, z, 1.35, 0.09, researchBrass, 32, 1.35, { metal: 0.3 });
  const domeStart = m.data.length;
  m.sphere(x, 3.91, z, 1.22, 0.78, 1.22, researchCopper, 32, 12, { metal: 0.22 });
  // The drum closes the underside. Keep the smoothly shaded upper half.
  m.data.length = domeStart + (m.data.length - domeStart) / 2;
  for (let rib = 0; rib < 12; rib++)
    for (let i = 0; i < 8; i++) {
      const angle = (rib * Math.PI) / 6,
        at = (a: number) =>
          [
            x + Math.cos(a) * 1.235 * Math.cos(angle),
            3.91 + Math.sin(a) * 0.79,
            z + Math.cos(a) * 1.235 * Math.sin(angle),
          ] satisfies [number, number, number];
      m.rod(at((i * Math.PI) / 16), at(((i + 1) * Math.PI) / 16), 0.012, researchBrass, 4, {
        metal: 0.25,
      });
    }
  for (let i = 0; i < 8; i++)
    pose(m, x, 0, z, (i * Math.PI) / 4, () =>
      researchPanel(m, signs, 'research-etching', -0.22, 3.48, 1.275, 0.44, 0.29),
    );
  m.cylinder(x, 4.64, z, 0.065, 0.36, researchBrass, 12, 0.035, { metal: 0.3 });
  for (let i = 0; i < 3; i++) researchOrbit(m, x, 5.28, z, 0.59 - i * 0.09, 0.3 + i * 0.6, i * 0.8);
  m.sphere(x, 5.28, z, 0.11, 0.11, 0.11, '#a7c2b4', 12, 6, { emissive: 0.14 });
  for (const isX of [false, true] satisfies [boolean, boolean])
    for (const far of [false, true] satisfies [boolean, boolean])
      drawPiercedWall(m, {
        isX,
        far,
        plane: isX ? (far ? 1.18 : 2.84) : far ? -1.32 : 0.84,
        along: isX ? -1.32 : 1.18,
        y: 3.39,
        w: isX ? 2.16 : 1.66,
        h: 0.75,
        depth: 0.1,
        color: '#bfae95',
        openings:
          !isX && !far ? [{ x: 1.74, y: 3.51, w: 0.54, h: 0.54, ellipse: true, segments: 12 }] : [],
      });
  m.box(1.1, 4.12, -1.4, 1.82, 0.11, 2.32, researchIvory, 'stone');
  researchRose(m, 2.01, 3.78, 0.86, 0.27, true);
  for (const side of [-1, 1] satisfies [number, number])
    m.quad(
      [1.08, 4.23, -0.24 + side * 1.16] satisfies [number, number, number],
      [2.94, 4.23, -0.24 + side * 1.16] satisfies [number, number, number],
      [2.94, 4.73, -0.24] satisfies [number, number, number],
      [1.08, 4.73, -0.24] satisfies [number, number, number],
      researchCopper,
      'roofTile',
    );
  for (const side of [-1, 1] satisfies [number, number])
    m.tri(
      [side < 0 ? 1.18 : 2.84, 4.23, -1.32],
      [side < 0 ? 1.18 : 2.84, 4.23, 0.84],
      [side < 0 ? 1.18 : 2.84, 4.73, -0.24],
      '#c0b39d',
      'stone',
    );
}

function researchFieldRoof(m: Mesh, signs: SignAtlas) {
  // An eight-sided lantern and terraced indigo roof overlook an asymmetric
  // sloping chart room. Its glazed roof carries the original star-map SVG.
  pose(m, 0.9, 3.39, -0.2, Math.PI / 8, () => {
    const half = 1.33 * Math.sin(Math.PI / 8),
      plane = 1.33 * Math.cos(Math.PI / 8);
    for (let i = 0; i < 8; i++)
      pose(m, 0, 0, 0, (i * Math.PI) / 4, () => {
        drawPiercedWall(m, {
          plane,
          along: -half,
          y: 0,
          w: half * 2,
          h: 0.95,
          depth: 0.08,
          color: '#82969b',
          openings: [{ x: -0.25, y: 0.14, w: 0.5, h: 0.66, arch: true }],
        });
        m.tri(
          [0, 0.95, 0] satisfies [number, number, number],
          [-half, 0.95, plane] satisfies [number, number, number],
          [half, 0.95, plane] satisfies [number, number, number],
          researchIvory,
          'stone',
        );
        researchArch(m, 0, 0.14, plane + 0.012, 0.5, 0.66, {
          stained: true,
          seed: i,
          transparent: true,
        });
      });
    for (let i = 0; i < 3; i++)
      m.cylinder(
        0,
        0.92 + i * 0.23,
        0,
        1.49 - i * 0.32,
        0.24,
        i % 2 ? '#6c7b90' : '#626a8a',
        8,
        1.16 - i * 0.32,
        'shingles',
      );
    m.cylinder(0, 1.64, 0, 0.075, 0.32, researchBrass, 16, 0.02, { metal: 0.35 });
    researchOrbit(m, 0, 2.18, 0, 0.39, Math.PI / 2, 0);
    m.sphere(0, 2.18, 0, 0.1, 0.1, 0.1, '#b9c6bd', 12, 6, { emissive: 0.12 });
  });
  const left = -3.18,
    right = -1.42,
    near = 1.37,
    far = -1.27;
  m.box(left, 3.39, far, right - left, 0.3, near - far, '#8d8d9e', 'stone');
  for (const side of [-1, 1] satisfies [number, number]) {
    const z = side < 0 ? far : near;
    m.quad(
      [left, 3.69, z],
      [right, 3.69, z],
      [right, 4.35, 0.05] satisfies [number, number, number],
      [left, 4.35, 0.05] satisfies [number, number, number],
      '#b9d2d5',
      {
        glass: 0.14,
      },
    );
    for (let i = 0; i < 5; i++) {
      const x = left + 0.2 + i * 0.31,
        z = (side < 0 ? far + 0.28 : near - 0.28) - (i % 2) * 0.12 * side,
        y = 3.69 + (1 - Math.abs(z - 0.05) / 1.32) * 0.66 + 0.015;
      m.sphere(x, y, z, 0.024, 0.018, 0.024, researchBrass, 6, 3, { metal: 0.2 });
      if (i) {
        const px = x - 0.31,
          pz = (side < 0 ? far + 0.28 : near - 0.28) - ((i - 1) % 2) * 0.12 * side,
          py = 3.69 + (1 - Math.abs(pz - 0.05) / 1.32) * 0.66 + 0.015;
        m.rod(
          [px, py, pz] satisfies [number, number, number],
          [x, y, z] satisfies [number, number, number],
          0.006,
          researchBrass,
          4,
        );
      }
    }
    for (const x of [left, left + 0.44, left + 0.88, left + 1.32, right] satisfies [
      number,
      number,
      number,
      number,
      number,
    ])
      m.rod(
        [x, 3.7, z],
        [x, 4.37, 0.05] satisfies [number, number, number],
        0.021,
        researchBrass,
        6,
        { metal: 0.25 },
      );
  }
  m.rod(
    [left, 4.37, 0.05] satisfies [number, number, number],
    [right, 4.37, 0.05] satisfies [number, number, number],
    0.025,
    researchIvory,
    8,
  );
  for (const x of [left, right] satisfies [number, number])
    m.tri(
      [x, 3.69, far] satisfies [number, number, number],
      [x, 3.69, near] satisfies [number, number, number],
      [x, 4.35, 0.05] satisfies [number, number, number],
      '#b9d2d5',
      { glass: 0.1 },
    );
}

/** Walls, furnishings and open doorways share the navigation floor plan.
 * Separate sections allow roofs and camera-facing walls to lift away. */
export function drawResearchInstitute(
  m: Mesh,
  signs: SignAtlas,
  c: Readonly<{ id: string; x: number; z: number; w: number; d: number; base: number }>,
  index: number | undefined,
  title: string,
) {
  const stone = index ? '#a5a9b6' : '#cfbda3',
    trim = index ? '#666f8c' : '#8b9c88',
    start = m.data.length,
    parts: InteriorSection[] = [];
  let detailStart = 0;
  const local = { x: 0, z: 0, base: 0, w: c.w, d: c.d, front: 1 };
  pose(m, c.x, c.base, c.z, 0, () => {
    recordInstitutePart(m, parts, 'floor', null, () => drawInstituteFloor(m, local, index));
    for (let side = 0; side < 4; side++)
      recordInstitutePart(m, parts, 'wall', side, () => {
        drawInstituteWall(m, local, side, 3.25, stone, researchIvory, {
          openings: instituteWindowOpenings(local, side),
        });
        if (side < 2)
          pose(m, 0, 0, side === 0 ? -c.d / 2 : c.d / 2, side === 0 ? Math.PI : 0, () => {
            for (const [i, x] of (
              [-c.w * 0.39, -c.w * 0.23, c.w * 0.23, c.w * 0.39] satisfies [
                number,
                number,
                number,
                number,
              ]
            ).entries())
              researchArch(m, x, 0.48, 0.035, 0.62, 1.23, {
                stained: index === 1 && i % 2 === 0,
                seed: i + (index ?? 0),
                transparent: true,
              });
            if (side === 0)
              researchPanel(
                m,
                signs,
                index ? 'research-stars' : 'research-etching',
                -0.62,
                0.47,
                0.037,
                1.24,
                1.23,
              );
            for (let x = -c.w / 2 + 0.25; x < c.w / 2 - 0.5; x += 0.64)
              researchPanel(m, signs, 'research-mosaic', x, 3.005, 0.04, 0.57, 0.16);
            for (const x of [-c.w / 2 + 0.08, c.w / 2 - 0.24] satisfies [number, number]) {
              m.box(x, 0.2, 0.005, 0.16, 3.03, 0.12, researchIvory, 'stone');
              m.box(x - 0.035, 3.13, -0.015, 0.23, 0.16, 0.16, researchBrass, { metal: 0.18 });
            }
          });
        else
          pose(
            m,
            side === 2 ? -c.w / 2 : c.w / 2,
            0,
            0,
            side === 2 ? Math.PI / 2 : -Math.PI / 2,
            () => {
              for (const x of [-1.28, 1.28] satisfies [number, number])
                researchArch(m, x, 0.51, 0.035, 0.57, 1.29, {
                  stained: index === 1,
                  seed: Math.round(x * 4),
                  transparent: true,
                });
              researchPanel(
                m,
                signs,
                index ? 'research-stars' : 'research-mosaic',
                -0.46,
                0.62,
                0.04,
                0.92,
                1.1,
              );
              for (let x = -1.85; x < 1.7; x += 0.64)
                researchPanel(m, signs, 'research-mosaic', x, 2.73, 0.04, 0.57, 0.35);
            },
          );
        if (side === 1) {
          researchArch(m, 0, 0.015, c.d / 2 + 0.035, 1.5, 2.1, { seed: 1, open: true });
          m.box(-1.8, 2.17, c.d / 2 - 0.05, 3.6, 0.1, 0.65, trim, { metal: 0.2 });
          for (const x of [-1.55, 1.55] satisfies [number, number]) {
            m.cylinder(x, 0, c.d / 2 + 0.48, 0.035, 2.18, researchBrass, 12);
            m.cylinder(x, 2.04, c.d / 2 + 0.48, 0.075, 0.13, researchIvory, 12, 0.04);
          }
          m.box(
            -c.w / 2 + 0.24,
            2.3,
            c.d / 2 + 0.04,
            c.w - 0.48,
            0.66,
            0.045,
            index ? '#414c67' : '#465e53',
          );
          drawPlaque(m, signs, title, 0, 2.32, c.d / 2 + 0.09, c.w - 0.65, 0.59);
        }
      });
    recordInstitutePart(m, parts, 'roof', null, () => {
      m.box(
        -c.w / 2 - 0.07,
        3.25,
        -c.d / 2 - 0.07,
        c.w + 0.14,
        0.1,
        c.d + 0.14,
        researchIvory,
        'stone',
      );
      m.box(
        -c.w / 2 + 0.08,
        3.35,
        -c.d / 2 + 0.08,
        c.w - 0.16,
        0.035,
        c.d - 0.16,
        index ? '#737c91' : '#9baba0',
        'roof',
      );
      for (const side of [-1, 1] satisfies [number, number]) {
        m.box(
          -c.w / 2 - 0.08,
          3.34,
          side < 0 ? -c.d / 2 - 0.08 : c.d / 2 - 0.04,
          c.w + 0.16,
          0.15,
          0.12,
          trim,
          'stone',
        );
        m.box(
          side < 0 ? -c.w / 2 - 0.08 : c.w / 2 - 0.04,
          3.34,
          -c.d / 2,
          0.12,
          0.15,
          c.d,
          trim,
          'stone',
        );
      }
      detailStart = m.data.length;
      if (index) researchFieldRoof(m, signs);
      else researchObservatory(m, signs);
    });
  });
  // Keep the human-sized door and glazing; compress the upper masonry and
  // scale the roof instruments to the reduced footprint, rather than leaving
  // an oversized dome over a shrunken floor plan.
  for (let i = start; i < m.data.length; i += 11) {
    let sx = 1,
      sy = 1,
      sz = 1;
    const y = m.data[i + 1] - c.base;
    if (i >= detailStart) {
      sx = c.w / (index ? 7.8 : 7);
      sz = c.d / 4.2;
      sy = 0.75;
      m.data[i] = c.x + (m.data[i] - c.x) * sx;
      m.data[i + 2] = c.z + (m.data[i + 2] - c.z) * sz;
      m.data[i + 1] = c.base + 2.79 + (y - 3.39) * sy;
    } else if (y > 2.15) {
      sy = 0.64 / 1.24;
      m.data[i + 1] = c.base + 2.15 + (y - 2.15) * sy;
    }
    const nx = m.data[i + 3] / sx,
      ny = m.data[i + 4] / sy,
      nz = m.data[i + 5] / sz,
      n = Math.hypot(nx, ny, nz) || 1;
    m.data[i + 3] = nx / n;
    m.data[i + 4] = ny / n;
    m.data[i + 5] = nz / n;
  }
  return {
    start,
    end: m.data.length,
    parts,
    spec: { id: c.id, x: c.x, z: c.z, w: c.w, d: c.d, base: c.base, front: 1, rotation: 0 },
  };
}

export function drawResearchCourtDetails(
  m: Mesh,
  signs: SignAtlas,
  c: Readonly<{ x: number; z: number; base: number }>,
  index: number,
) {
  // These almost-flush inlays add celestial geometry to the existing paving,
  // not new barriers. Keep the three-dimensional sculpture in its solid disc.
  for (const r of [0.9, 1.07] satisfies [number, number])
    for (let i = 0; i < 48; i++) {
      const a = (i * Math.PI) / 24,
        b = ((i + 1) * Math.PI) / 24,
        at = (angle: number, radius: number) =>
          [
            c.x + Math.cos(angle) * radius,
            c.base + 0.022,
            c.z + 3.3 + Math.sin(angle) * radius,
          ] satisfies [number, number, number];
      m.quad(at(a, r - 0.007), at(b, r - 0.007), at(b, r + 0.007), at(a, r + 0.007), researchBrass);
    }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6,
      dx = Math.cos(a),
      dz = Math.sin(a),
      at = (r: number, w: number) =>
        [c.x + dx * r - dz * w, c.base + 0.023, c.z + 3.3 + dz * r + dx * w] satisfies [
          number,
          number,
          number,
        ];
    m.quad(at(0.94, -0.009), at(1.035, -0.009), at(1.035, 0.009), at(0.94, 0.009), researchIvory);
  }
  if (index) {
    for (let i = 0; i < 2; i++)
      researchOrbit(m, c.x, c.base + 0.88, c.z + 3.3, 0.57, i ? 1.1 : 0.45, i ? 1.3 : 0);
    m.sphere(c.x, c.base + 0.88, c.z + 3.3, 0.14, 0.14, 0.14, '#aabeb8', 12, 6, { emissive: 0.16 });
  }
}
