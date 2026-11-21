import type { Mesh } from './geometry.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { PACIFICA_PARK, PACIFICA_PARK_OBSTACLES } from './southern-expansion.ts';
import { drawPlaque } from './southern-district.ts';
import { TILE_TYPES } from './tiles.ts';
import type { SignAtlas } from './types/world.ts';

export const PENINSULA_SIGNS = Object.freeze(['PACIFICA COMMONS', 'BUS'] satisfies [
  string,
  string,
]);
export function drawPeninsulaDetails(
  m: Mesh,
  terrain: { height: (arg0: number, arg1: number) => number },
  signs: SignAtlas,
  tree: (arg0: number, arg1: number, arg2: number | boolean, arg3: boolean) => void,
) {
  const p = PACIFICA_PARK,
    start = m.data.length;
  for (const o of PACIFICA_PARK_OBSTACLES) {
    const h = terrain.height(o.x, o.z);
    if (o.kind === 'tree') {
      tree(o.x - 0.5, o.z - 0.5, o.z < 131 ? 3 : true, true);
      continue;
    }
    if (o.kind === 'bench') {
      for (const x of [-0.3, 0.3] satisfies [number, number])
        m.box(o.x + x, h - 0.1, o.z - 0.12, 0.045, 0.56, 0.26, '#60736e', { metal: 0.2 });
      for (let i = 0; i < 4; i++)
        m.box(o.x - 0.43, h + 0.44, o.z - 0.22 + i * 0.105, 0.86, 0.05, 0.08, '#b59a72', 'wood');
      m.box(o.x - 0.43, h + 0.49, o.z - 0.24, 0.86, 0.42, 0.045, '#b59a72', 'wood');
    } else if (o.kind === 'fountain') {
      m.cylinder(o.x, h - 0.18, o.z, 0.59, 0.38, '#a5b1a6', 32, 0.59, 'stone');
      m.cylinder(o.x, h + 0.2, o.z, 0.5, 0.025, '#83b6ba', 32, 0.5, { water: 0.5 });
      m.cylinder(o.x, h + 0.22, o.z, 0.07, 0.46, '#c9c6ac', 16);
      m.sphere(o.x, h + 0.7, o.z, 0.16, 0.08, 0.16, '#d1d2b6', 16, 8);
    }
  }
  const signHeight = terrain.height(25, 128.55);
  for (const x of [24.25, 25.75] satisfies [number, number])
    m.cylinder(x, signHeight, 128.55, 0.035, 0.95, '#607d72', 10);
  m.box(24.08, signHeight + 0.56, 128.5, 1.84, 0.4, 0.08, '#547263');
  drawPlaque(m, signs, 'PACIFICA COMMONS', 25, signHeight + 0.6, 128.59, 1.72, 0.28);
  for (const [x, z] of [
    [23.1, 128.7] satisfies [number, number],
    [26.8, 134.25] satisfies [number, number],
  ])
    for (let i = 0; i < 7; i++) {
      const xx = x + i * 0.065,
        h = terrain.height(xx, z);
      m.rod(
        [xx, h, z] satisfies [number, number, number],
        [xx, h + 0.16, z] satisfies [number, number, number],
        0.008,
        '#72925c',
        5,
      );
      m.sphere(xx, h + 0.18, z, 0.045, 0.04, 0.045, i % 2 ? '#cfb56d' : '#b28ba6', 8, 5);
    }
  // No separate slab: the park inherits the same rolling terrain and textures.
  const site = {
    id: p.id,
    label: p.label,
    kind: 'park',
    entry: { ...p.entry },
    description: contentText('peninsula-details.drawPeninsulaDetails.description-2', {}),
    start,
    count: m.data.length - start,
    lo: [
      p.west,
      Math.min(...PACIFICA_PARK_OBSTACLES.map((o) => terrain.height(o.x, o.z))) - 0.2,
      p.north,
    ] satisfies [number, number, number],
    hi: [
      p.east,
      Math.max(...PACIFICA_PARK_OBSTACLES.map((o) => terrain.height(o.x, o.z))) + 3.5,
      p.south,
    ] satisfies [number, number, number],
  };
  for (const [x, z] of [
    [53, 98.25] satisfies [number, number],
    [36.8, 130] satisfies [number, number],
  ]) {
    const h = terrain.height(x, z);
    for (const xx of [-0.75, 0.75] satisfies [number, number])
      m.rod(
        [x + xx, h, z] satisfies [number, number, number],
        [x + xx, h + 2, z] satisfies [number, number, number],
        0.035,
        '#788e91',
        10,
      );
    m.box(x - 0.9, h + 2, z - 0.33, 1.8, 0.09, 0.66, '#87a5a1', { metal: 0.2 });
    m.box(x - 0.8, h + 0.45, z + 0.08, 1.6, 0.06, 0.22, '#a4b6ae');
    for (let i = 0; i < 4; i++)
      m.box(x - 0.8 + i * 0.4, h + 0.7, z + 0.31, 0.025, 1.2, 0.03, '#a5b9b9');
    m.rod(
      [x + 1.1, h, z] satisfies [number, number, number],
      [x + 1.1, h + 2.3, z] satisfies [number, number, number],
      0.024,
      '#91a29d',
      10,
    );
    drawPlaque(m, signs, 'BUS', x + 1.1, h + 1.8, z + 0.03, 0.45, 0.3);
  }
  for (const [x, z] of [
    [49.5, 99.5] satisfies [number, number],
    [35.5, 119.5] satisfies [number, number],
    [28.5, 127.5] satisfies [number, number],
    [28.5, 135.5] satisfies [number, number],
  ])
    for (let bar = 0; bar < 4; bar++) {
      const a = x - 0.42 + bar * 0.23,
        b = z + 0.95,
        w = 0.13,
        d = 0.72;
      for (let zz = b; zz < b + d - 1e-9; zz += 0.125) {
        const end = Math.min(b + d, zz + 0.125),
          at = (xx: number, yy: number) =>
            [xx, terrain.height(xx, yy) + TILE_TYPES.road.height + 0.006, yy] satisfies [
              number,
              number,
              number,
            ];
        m.quad(at(a, zz), at(a, end), at(a + w, end), at(a + w, zz), '#d5d6bc');
      }
    }
  return site;
}
