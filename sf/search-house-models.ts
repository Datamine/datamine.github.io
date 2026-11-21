import { requiredValue } from './types/assert.ts';
import type { InteriorBuilding } from './types/interiors.ts';
import type { Mesh } from './geometry.ts';
import { HOME_LORE_BOOKS } from './config/world-lore.ts';
import { drawLoreBook } from './world-lore.ts';

/** Cozy original interiors and ordinary-looking containers. Contents are
 * deliberately never drawn, named, or advertised on the buildings. */
export function drawSearchHouseInterior(m: Mesh, b: InteriorBuilding, base: number) {
  const { x, y: z, w, d } = b,
    type = requiredValue(b.searchDefinition, 'Search house definition').container;
  const bounds = (xx: number, zz: number, ww: number, dd: number) => [
    [xx, zz] satisfies [number, number],
    [xx + ww, zz] satisfies [number, number],
    [xx + ww, zz + dd] satisfies [number, number],
    [xx, zz + dd] satisfies [number, number],
  ];
  b.interiorObstacles = [];
  m.box(
    x + 0.3,
    base + 0.01,
    z + 0.3,
    w - 0.6,
    0.025,
    d - 0.6,
    (['#997365', '#747d8c', '#85967b'] satisfies [string, string, string])[
      requiredValue(b.searchIndex, 'Search house index') % 3
    ],
    'herringbone',
  );
  // A low upholstered seat and a little pot, leaving a broad center aisle.
  const sx = x + w - 0.75,
    sz = z + 0.55;
  m.box(sx, base + 0.03, sz, 0.5, 0.38, 0.8, '#8c9d86', 'canvasWeave');
  m.box(sx + 0.36, base + 0.41, sz, 0.14, 0.4, 0.8, '#a9b49b', 'canvasWeave');
  b.interiorObstacles.push(bounds(sx - 0.04, sz - 0.04, 0.58, 0.88));
  m.cylinder(x + w - 0.5, base + 0.02, z + d - 0.4, 0.15, 0.26, '#bd8b69', 12);
  m.sphere(x + w - 0.5, base + 0.45, z + d - 0.4, 0.22, 0.25, 0.19, '#6f8b60', 10, 7);
  b.interiorObstacles.push(bounds(x + w - 0.7, z + d - 0.6, 0.4, 0.4));
  const cx = x + 0.65,
    cz = z + 0.65,
    start = m.data.length;
  const wood = '#936b48',
    trim = '#c8aa72';
  if (type === 'doghouse') {
    m.box(cx - 0.35, base, cz - 0.3, 0.7, 0.48, 0.6, '#ad7e5e', 'clapboard');
    m.quad(
      [cx - 0.4, base + 0.48, cz - 0.35] satisfies [number, number, number],
      [cx - 0.4, base + 0.48, cz + 0.35],
      [cx, base + 0.79, cz + 0.35],
      [cx, base + 0.79, cz - 0.35],
      '#70827c',
      'roof',
    );
    m.quad(
      [cx, base + 0.79, cz - 0.35],
      [cx, base + 0.79, cz + 0.35],
      [cx + 0.4, base + 0.48, cz + 0.35],
      [cx + 0.4, base + 0.48, cz - 0.35],
      '#58706b',
      'roof',
    );
    m.box(cx - 0.13, base + 0.02, cz + 0.305, 0.26, 0.32, 0.015, '#34423c');
  } else if (type === 'laundry') {
    m.cylinder(cx, base, cz, 0.32, 0.48, '#b3986b', 18, 0.38);
    for (let i = 0; i < 4; i++)
      m.sphere(
        cx - 0.17 + i * 0.11,
        base + 0.48,
        cz,
        0.12,
        0.06,
        0.21,
        (['#d7e1d1', '#bacadd', '#d2a596'] satisfies [string, string, string])[i % 3],
        10,
        6,
      );
  } else {
    const tall = type === 'wardrobe',
      drawers = type === 'drawers',
      h = tall ? 1.35 : drawers ? 0.78 : 0.48;
    m.box(cx - 0.35, base, cz - 0.28, 0.7, h, 0.56, wood, 'wood');
    m.box(cx - 0.38, base + h, cz - 0.3, 0.76, 0.045, 0.6, trim, 'wood');
    for (let i = 0; i < (drawers ? 3 : tall ? 2 : 1); i++) {
      const yy = base + 0.08 + i * (drawers ? 0.22 : 0.12);
      m.box(cx - 0.3, yy, cz + 0.29, 0.6, drawers ? 0.18 : 0.025, 0.02, trim, 'wood');
      m.sphere(
        cx,
        yy + (drawers ? 0.09 : 0.02),
        cz + 0.326,
        0.035,
        0.025,
        0.022,
        '#cbb37c',
        10,
        6,
        { metal: 0.4 },
      );
    }
    if (tall) {
      m.rod([cx, base + 0.12, cz + 0.29], [cx, base + 1.25, cz + 0.29], 0.012, '#66513e', 6);
      for (const side of [-1, 1] satisfies [number, number])
        m.sphere(cx + side * 0.06, base + 0.75, cz + 0.31, 0.022, 0.022, 0.02, '#d1b56f', 10, 6);
    }
    if (type === 'toolbox')
      m.rod(
        [cx - 0.15, base + h + 0.09, cz],
        [cx + 0.15, base + h + 0.09, cz],
        0.027,
        '#5a655b',
        8,
      );
    if (type === 'trunk')
      for (const dx of [-0.24, 0.24] satisfies [number, number])
        m.box(cx + dx, base + 0.03, cz - 0.29, 0.035, h + 0.025, 0.59, '#556b6c', { metal: 0.2 });
  }
  b.interiorObstacles.push(bounds(cx - 0.42, cz - 0.34, 0.84, 0.7));
  b.searchContainer = { start, count: m.data.length - start };
  const book =
    HOME_LORE_BOOKS[
      requiredValue(b.searchDefinition, 'Search house definition')
        .id as keyof typeof HOME_LORE_BOOKS
    ];
  if (book) b.loreBook = drawLoreBook(m, cx, base + (type === 'drawers' ? 0.83 : 0.53), cz, book);
  // Framed abstract art supplies color without clues or readable signs.
  m.box(x + w / 2 - 0.3, base + 1.1, z + 0.11, 0.6, 0.5, 0.04, '#bd9f73', 'wood');
  m.box(
    x + w / 2 - 0.25,
    base + 1.15,
    z + 0.16,
    0.5,
    0.4,
    0.012,
    (['#769ba0', '#ba927e', '#8588a2'] satisfies [string, string, string])[
      requiredValue(b.searchIndex, 'Search house index') % 3
    ],
  );
}
