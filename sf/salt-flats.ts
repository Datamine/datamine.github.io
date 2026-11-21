import type { HeightTerrain } from './types/scenery.ts';
import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { SALT_FLATS, SALT_PONDS } from './salt-layout.ts';
import { drawPlaque } from './southern-district.ts';
import type { Mesh } from './geometry.ts';
import { rand } from './geometry.ts';

export const SALT_FLATS_SIGNS = Object.freeze([
  'BAY AREA SALT FLATS',
  'SAVE THE SALT PONDS',
] satisfies [string, string]);
const saltRect = (x: number, z: number, w: number, d: number) => [
  [x, z] satisfies [number, number],
  [x + w, z] satisfies [number, number],
  [x + w, z + d] satisfies [number, number],
  [x, z + d] satisfies [number, number],
];
/** The colored pond surfaces are part of the terrain itself. This batch only
 * adds crystalline banks, sluices, reeds and the activist's letter-writing desk. */
export function drawSaltFlats(m: Mesh, signs: SignAtlas, terrain: HeightTerrain) {
  const s = SALT_FLATS,
    start = m.data.length,
    base = s.base;
  for (const p of SALT_PONDS) {
    for (const z of [p.z - 0.055, p.z + p.d] satisfies [number, number])
      m.box(p.x - 0.055, base + 0.005, z, p.w + 0.11, 0.055, 0.055, '#dedbc7', 'saltCrust');
    for (const x of [p.x - 0.055, p.x + p.w] satisfies [number, number])
      m.box(x, base + 0.005, p.z, 0.055, 0.055, p.d, '#d9d8bf', 'saltCrust');
    // Tiny tide gates and weathered walkover planks connect the cells.
    const x = p.x + p.w * 0.6,
      z = p.z + (p.z < SALT_FLATS.north + 2 ? p.d + 0.05 : -0.13);
    for (const dx of [-0.075, 0.075] satisfies [number, number])
      m.box(x + dx - 0.015, base, z, 0.03, 0.25, 0.05, '#7e887b', 'wood');
    m.box(x - 0.12, base + 0.2, z - 0.03, 0.24, 0.045, 0.11, '#b0ad8c', 'wood');
    m.rod(
      [x, base + 0.15, z + 0.025] satisfies [number, number, number],
      [x, base + 0.38, z + 0.025] satisfies [number, number, number],
      0.012,
      '#7e8e85',
      8,
      {
        metal: 0.2,
      },
    );
  }
  // Salt blooms and low pickleweed fringe the bay-facing boundary.
  for (let i = 0; i < 32; i++) {
    const x = s.east - 0.33 + rand(i, 2) * 0.16,
      z = s.north + 0.1 + rand(i, 5) * (s.south - s.north - 0.3),
      y = terrain.height(x, z);
    if (i % 3 === 0) m.sphere(x, y + 0.035, z, 0.08, 0.045, 0.12, '#e7e4d4', 8, 4, 'saltCrust');
    else
      for (let j = 0; j < 3; j++)
        m.rod(
          [x, y, z],
          [x + (j - 1) * 0.04, y + 0.11 + rand(i, j) * 0.08, z + 0.02],
          0.013,
          i % 2 ? '#9c8879' : '#8b9c6e',
          6,
        );
  }
  const x = s.west + 0.35,
    z = s.north + 0.65,
    y = terrain.height(x, z);
  m.box(x - 0.26, y + 0.66, z - 0.18, 0.52, 0.055, 0.36, '#b5a480', 'wood');
  for (const dx of [-0.2, 0.2] satisfies [number, number])
    for (const dz of [-0.12, 0.12] satisfies [number, number])
      m.box(x + dx - 0.015, y, z + dz - 0.015, 0.03, 0.66, 0.03, '#766f59', 'wood');
  for (let i = 0; i < 4; i++)
    m.box(x - 0.17 + i * 0.045, y + 0.72 + i * 0.007, z - 0.08, 0.16, 0.008, 0.13, '#e5ddc4');
  m.box(x + 0.1, y + 0.725, z + 0.06, 0.11, 0.025, 0.07, '#7c9c92');
  m.rod([x - 0.19, y + 0.74, z + 0.09], [x - 0.04, y + 0.74, z + 0.12], 0.007, '#6b6956', 6);
  for (const [cx, cz, title, w] of [
    [s.west + 0.65, s.north + 0.12, 'BAY AREA SALT FLATS', 1.1] satisfies [
      number,
      number,
      string,
      number,
    ],
    [s.west + 0.37, s.north + 1.13, 'SAVE THE SALT PONDS', 0.62] satisfies [
      number,
      number,
      string,
      number,
    ],
  ]) {
    const h = terrain.height(cx, cz);
    for (const dx of [-w * 0.4, w * 0.4] satisfies [number, number])
      m.box(cx + dx - 0.018, h, cz - 0.02, 0.036, 0.95, 0.04, '#8b8064', 'wood');
    m.box(cx - w / 2, h + 0.71, cz - 0.04, w, 0.29, 0.06, '#597868', 'wood');
    drawPlaque(m, signs, title, cx, h + 0.75, cz + 0.027, w - 0.06, 0.19);
  }
  const fixtures = [
    saltRect(x - 0.27, z - 0.2, 0.54, 0.4),
    saltRect(s.west + 0.1, s.north + 1.08, 0.56, 0.13),
    saltRect(s.west + 0.08, s.north + 0.06, 1.14, 0.12),
  ];
  return {
    id: 'salt-flats',
    kind: 'salt-flats',
    label: contentText('salt-flats.drawSaltFlats.label-1', {}),
    entry: { ...s.entry },
    description: contentText('salt-flats.drawSaltFlats.description-2', {}),
    start,
    count: m.data.length - start,
    lo: [s.west, base - 0.05, s.north] satisfies [number, number, number],
    hi: [s.east, base + 1.15, s.south] satisfies [number, number, number],
    footprint: saltRect(s.west, s.north, s.east - s.west, s.south - s.north),
    navigationPolygons: [...SALT_PONDS.map((p) => saltRect(p.x, p.z, p.w, p.d)), ...fixtures],
  };
}
