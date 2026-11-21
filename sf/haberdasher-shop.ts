import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { HABERDASHER } from './haberdasher-layout.ts';
import { drawHatModel } from './hat-models.ts';
import { drawPlaque } from './southern-district.ts';

export const HABERDASHER_SIGNS = Object.freeze([
  'HABERDASHER',
  'HATS · 1 TO 100,000 COINS',
] satisfies [string, string]);
/** Two recessed display cases, a striped canopy and a modeled hanging top hat.
 * Staff trade from the pavement; this storefront is a solid, non-enterable shop. */
export function drawHaberdasherShop(m: Mesh, signs: SignAtlas) {
  const h = HABERDASHER,
    start = m.data.length;
  pose(m, h.x, h.base, h.z, h.rotation, () => {
    m.box(-1.5, -0.05, -0.9, 3, 0.12, 1.8, '#bbb59e', 'stone');
    m.box(-1.46, 0.07, -0.86, 2.92, 2.17, 1.43, '#8b7971', 'brick');
    for (const x of [-1.46, -0.42, 0.35, 1.38] satisfies [number, number, number, number])
      m.box(x, 0.16, 0.56, 0.08, 1.75, 0.3, '#d5c9ac', 'wood');
    for (const x of [-1.38, 0.43] satisfies [number, number]) {
      m.box(x, 0.18, 0.6, 0.95, 0.43, 0.25, '#536f63', 'cedar');
      m.box(x - 0.02, 0.59, 0.6, 0.99, 0.045, 0.27, '#d5c9ac', 'wood');
      // Glass is the rear of the case, allowing the physical hats to show.
      m.quad(
        [x, 0.65, 0.61] satisfies [number, number, number],
        [x + 0.95, 0.65, 0.61] satisfies [number, number, number],
        [x + 0.95, 1.69, 0.61] satisfies [number, number, number],
        [x, 1.69, 0.61] satisfies [number, number, number],
        '#48595b',
        { window: 0.13 },
      );
      for (const dx of [0.02, 0.32, 0.63] satisfies [number, number, number])
        m.box(x + dx, 0.65, 0.67, 0.26, 0.14, 0.17, '#c8b89c', 'wood');
      m.box(x - 0.02, 1.68, 0.6, 0.99, 0.07, 0.27, '#d5c9ac', 'wood');
      for (const xx of [x - 0.02, x + 0.95] satisfies [number, number])
        m.box(xx, 0.62, 0.83, 0.025, 1.1, 0.03, '#c0ad83');
    }
    for (const [id, x, scale] of [
      ['paper', -1.23, 0.65] satisfies [string, number, number],
      ['stone-of-jordan', -0.77, 0.6] satisfies [string, number, number],
      ['santa', 0.65, 0.8] satisfies [string, number, number],
      ['crown', 1.14, 0.8] satisfies [string, number, number],
    ])
      drawHatModel(m, id, x, 0.81, 0.72, 0, scale);
    m.box(-0.34, 0.1, 0.6, 0.64, 1.65, 0.06, '#405d52', 'wood');
    m.box(-0.28, 0.77, 0.668, 0.52, 0.84, 0.018, '#90a6a0', { window: 0.2 });
    m.box(-0.28, 0.19, 0.668, 0.52, 0.46, 0.018, '#4a685a', 'cedar');
    m.rod(
      [0.2, 0.73, 0.706] satisfies [number, number, number],
      [0.2, 0.95, 0.706] satisfies [number, number, number],
      0.013,
      '#c7a46b',
      8,
      { metal: 0.5 },
    );
    m.box(-1.53, 1.84, 0.56, 3.06, 0.34, 0.38, '#3b584c', 'wood');
    drawPlaque(m, signs, 'HABERDASHER', 0, 1.91, 0.951, 2.7, 0.19);
    for (let i = 0; i < 16; i++) {
      const x = -1.52 + (i * 3.04) / 16,
        color = i % 2 ? '#e3d6b9' : '#876573';
      m.quad(
        [x, 2.48, 0.93] satisfies [number, number, number],
        [x + 3.04 / 16, 2.48, 0.93] satisfies [number, number, number],
        [x + 3.04 / 16, 2.32, 1.15] satisfies [number, number, number],
        [x, 2.32, 1.15] satisfies [number, number, number],
        color,
        'wood',
      );
      m.box(x, 2.26, 1.135, 3.04 / 16, 0.06, 0.018, color);
    }
    // Mansard roof with a central dormer and restrained copper trim.
    m.quad(
      [-1.52, 2.25, -0.92] satisfies [number, number, number],
      [-1.15, 2.75, -0.57] satisfies [number, number, number],
      [1.15, 2.75, -0.57] satisfies [number, number, number],
      [1.52, 2.25, -0.92] satisfies [number, number, number],
      '#596c65',
      'shingles',
    );
    m.quad(
      [-1.52, 2.25, 0.93] satisfies [number, number, number],
      [1.52, 2.25, 0.93] satisfies [number, number, number],
      [1.15, 2.75, 0.57] satisfies [number, number, number],
      [-1.15, 2.75, 0.57] satisfies [number, number, number],
      '#596c65',
      'shingles',
    );
    m.quad(
      [-1.52, 2.25, -0.92] satisfies [number, number, number],
      [-1.52, 2.25, 0.93] satisfies [number, number, number],
      [-1.15, 2.75, 0.57] satisfies [number, number, number],
      [-1.15, 2.75, -0.57] satisfies [number, number, number],
      '#53635e',
      'shingles',
    );
    m.quad(
      [1.52, 2.25, -0.92] satisfies [number, number, number],
      [1.15, 2.75, -0.57] satisfies [number, number, number],
      [1.15, 2.75, 0.57] satisfies [number, number, number],
      [1.52, 2.25, 0.93] satisfies [number, number, number],
      '#53635e',
      'shingles',
    );
    m.box(-1.17, 2.74, -0.59, 2.34, 0.06, 1.18, '#829184', 'roof');
    m.box(-0.31, 2.28, 0.6, 0.62, 0.48, 0.32, '#b9b499', 'stucco');
    m.box(-0.24, 2.36, 0.93, 0.48, 0.28, 0.024, '#718e8c', { window: 0.14 });
    m.box(-0.28, 2.49, 0.96, 0.56, 0.025, 0.025, '#d4c7aa');
    m.box(-0.015, 2.36, 0.96, 0.03, 0.28, 0.025, '#d4c7aa');
    m.tri(
      [-0.37, 2.75, 0.96] satisfies [number, number, number],
      [0.37, 2.75, 0.96] satisfies [number, number, number],
      [0, 2.94, 0.96] satisfies [number, number, number],
      '#d4c7aa',
      'stone',
    );
    for (const x of [-1.49, 1.49] satisfies [number, number])
      m.box(x - 0.03, 0.13, 0.91, 0.06, 1.63, 0.06, '#d8c9a5', 'wood');
    drawPlaque(m, signs, 'HATS · 1 TO 100,000 COINS', 0, 1.28, 0.711, 0.52, 0.12);
    // The projecting shop symbol sits above head height and never blocks a tile.
    m.rod(
      [-1.3, 2.9, 0.85] satisfies [number, number, number],
      [-1.3, 2.9, 1.45] satisfies [number, number, number],
      0.025,
      '#806f4f',
      8,
    );
    m.rod(
      [-1.3, 2.9, 1.4] satisfies [number, number, number],
      [-1.3, 2.73, 1.4] satisfies [number, number, number],
      0.014,
      '#806f4f',
      8,
    );
    drawHatModel(m, 'top-hat', -1.3, 2.5, 1.4, 0, 0.63);
  });
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], m.data[i + a]);
      hi[a] = Math.max(hi[a], m.data[i + a]);
    }
  const footprint = [
    [h.x - h.w / 2, h.z - h.d / 2] satisfies [number, number],
    [h.x + h.w / 2, h.z - h.d / 2] satisfies [number, number],
    [h.x + h.w / 2, h.z + h.d / 2] satisfies [number, number],
    [h.x - h.w / 2, h.z + h.d / 2] satisfies [number, number],
  ];
  return {
    id: 'haberdasher',
    kind: 'haberdasher',
    label: contentText('haberdasher-shop.drawHaberdasherShop.label-1', {}),
    entry: { ...h.entry },
    description: contentText('haberdasher-shop.drawHaberdasherShop.description-2', {}),
    start,
    count: m.data.length - start,
    lo,
    hi,
    footprint,
    navigationPolygons: [footprint],
  };
}
