import { requiredValue } from './types/assert.ts';
import type { HeightTerrain } from './types/scenery.ts';
import type { CraftPlot } from './southern-craft-layout.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { makeNeighborhoodBench } from './neighborhood-interactions.ts';
import { neighborhoodServiceFor } from './config/neighborhood-services.ts';
import type { Mesh } from './geometry.ts';
import { pose, tint } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { drawPlaque } from './southern-district.ts';
import { intersectTilePolygons, tileArea } from './tiles.ts';
import { SOUTHERN_CRAFT, craftPoint, craftFootprint } from './southern-craft-layout.ts';
import type { SignAtlas } from './types/world.ts';

export const CRAFT_SHOPS = Object.freeze([
  {
    label: contentText('southern-craft.module.label-1', {}),
    sign: 'SEABREEZE BAKERY',
    kind: 'market',
    line: 'The fog is an excellent proving drawer. The sourdough has lived here longer than I have.',
  },
  {
    label: contentText('southern-craft.module.label-2', {}),
    sign: 'PALMETTO POTTERY',
    kind: 'studio',
    line: 'Every mug is a little different. The one with the wobble is about the nature of certainty.',
  },
  {
    label: contentText('southern-craft.module.label-3', {}),
    sign: 'JUNIPER BOOKS',
    kind: 'arcade',
    line: 'We organize by the sort of afternoon you would like to have.',
  },
  {
    label: contentText('southern-craft.module.label-4', {}),
    sign: 'GARDEN MARKET',
    kind: 'market',
    line: 'The citrus is local. The optimistic handwritten prices are a form of public art.',
  },
  {
    label: contentText('southern-craft.module.label-5', {}),
    sign: 'OCEAN WORKSHOP',
    kind: 'studio',
    line: 'We mend chairs, bicycles, and occasionally the mood of the neighborhood.',
  },
  {
    label: contentText('southern-craft.module.label-6', {}),
    sign: 'THE TERRACE',
    kind: 'arcade',
    line: 'A coffee, a sunny chair, and absolutely no plans to pivot.',
  },
  {
    label: contentText('southern-craft.module.label-7', {}),
    sign: 'CYPRESS FLOWERS',
    kind: 'market',
    line: 'These are for somebody, even if that somebody turns out to be you.',
  },
]);
export const SOUTHERN_CRAFT_SIGNS = Object.freeze(CRAFT_SHOPS.map((s) => s.sign));
export function drawCraftGround(
  m: Mesh,
  terrain: HeightTerrain,
  polygon: number[][],
  color = '#c0ae8d',
  material = 'herringbone',
) {
  const xs = polygon.map((p) => p[0]),
    zs = polygon.map((p) => p[1]);
  for (let z = Math.floor(Math.min(...zs) * 2) / 2; z < Math.max(...zs); z += 0.5)
    for (let x = Math.floor(Math.min(...xs) * 2) / 2; x < Math.max(...xs); x += 0.5)
      for (const triangle of [
        [
          [x, z] satisfies [number, number],
          [x + 0.5, z + 0.5] satisfies [number, number],
          [x + 0.5, z] satisfies [number, number],
        ],
        [
          [x, z] satisfies [number, number],
          [x, z + 0.5] satisfies [number, number],
          [x + 0.5, z + 0.5] satisfies [number, number],
        ],
      ]) {
        const p = intersectTilePolygons(polygon, triangle);
        if (tileArea(p) < 1e-9) continue;
        for (let i = 1; i < p.length - 1; i++)
          m.tri(
            [p[0][0], terrain.height(p[0][0], p[0][1]) + 0.012, p[0][1]],
            [p[i][0], terrain.height(p[i][0], p[i][1]) + 0.012, p[i][1]],
            [p[i + 1][0], terrain.height(p[i + 1][0], p[i + 1][1]) + 0.012, p[i + 1][1]],
            color,
            material,
          );
      }
}
function craftFlowerPot(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  color = '#d5a27f',
  small = false,
) {
  const r = small ? 0.06 : 0.1;
  m.cylinder(x, y, z, r, 0.16, color, 10, r * 1.35, 'limewash');
  m.cylinder(x, y + 0.145, z, r * 1.45, 0.025, tint(color, 12), 12);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3,
      xx = x + Math.cos(a) * r * 0.6,
      zz = z + Math.sin(a) * r * 0.6;
    m.sphere(
      xx,
      y + 0.25,
      zz,
      r * 0.85,
      0.11,
      r * 0.8,
      (['#779b64', '#90aa70', '#668d61'] satisfies [string, string, string])[i],
      8,
      4,
    );
    m.sphere(
      xx,
      y + 0.33,
      zz,
      0.028,
      0.024,
      0.028,
      (['#d9a089', '#e1c576', '#bfa3c8'] satisfies [string, string, string])[i],
      6,
      3,
    );
  }
}
function craftSeat(m: Mesh, x: number, y: number, z: number, width = 0.7) {
  for (const xx of [x - width * 0.4, x + width * 0.4] satisfies [number, number])
    m.box(xx, y, z - 0.09, 0.035, 0.43, 0.18, '#637f79', { metal: 0.2 });
  for (let i = 0; i < 3; i++)
    m.box(x - width / 2, y + 0.43, z - 0.13 + i * 0.09, width, 0.04, 0.065, '#b99c72', 'cedar');
  m.box(x - width / 2, y + 0.47, z - 0.16, width, 0.25, 0.035, '#b99c72', 'cedar');
}
function craftMural(
  m: Mesh,
  plane: number,
  back: number,
  depth: number,
  base: number,
  seed: number,
) {
  // A mosaic sun over rolling ocean bands, painted on a complete side wall.
  const z = back + 0.18,
    w = depth - 0.36;
  m.box(plane - 0.014, base + 0.55, z, 0.012, 1.35, w, '#d5bf93', 'limewash');
  for (let i = 0; i < 7; i++) {
    const zz = z + (i * w) / 7;
    m.box(
      plane - 0.022,
      base + 0.55 + Math.sin(i * 0.85 + seed) * 0.09,
      zz,
      0.008,
      0.3,
      w / 7 + 0.001,
      (['#658e94', '#83aa9e', '#99b4a8'] satisfies [string, string, string])[i % 3],
      'glazedTile',
    );
  }
  m.sphere(plane - 0.029, base + 1.47, z + w * 0.65, 0.008, 0.23, 0.23, '#d8a45f', 20, 10);
  for (let i = 0; i < 6; i++)
    m.rod(
      [
        plane - 0.035,
        base + 1.47 + Math.sin((i * Math.PI) / 3) * 0.29,
        z + w * 0.65 + Math.cos((i * Math.PI) / 3) * 0.29,
      ] satisfies [number, number, number],
      [
        plane - 0.035,
        base + 1.47 + Math.sin((i * Math.PI) / 3) * 0.36,
        z + w * 0.65 + Math.cos((i * Math.PI) / 3) * 0.36,
      ] satisfies [number, number, number],
      0.012,
      '#c38b58',
      4,
    );
}
function craftShopBody(
  m: Mesh,
  p: CraftPlot & { terrain: HeightTerrain },
  base: number,
  shop: (typeof CRAFT_SHOPS)[number],
  signs: SignAtlas,
) {
  const w = p.w - 0.24,
    back = -p.d / 2 + 0.12,
    front = p.d / 2 - 0.57,
    d = front - back,
    H = shop.kind === 'arcade' ? 3.45 : shop.kind === 'studio' ? 2.5 : 2.85,
    color = p.palette[(p.index || 0) % p.palette.length],
    trim = '#e6d9be';
  const point = (x: number, z: number) => craftPoint(p, x, z),
    foot = [
      [-w / 2, back] satisfies [number, number],
      [w / 2, back] satisfies [number, number],
      [w / 2, front] satisfies [number, number],
      [-w / 2, front] satisfies [number, number],
    ];
  const start = m.data.length;
  pose(m, p.x, 0, p.z, p.rotation, () => {
    m.box(-w / 2, base, back, w, H, d, color, shop.kind === 'studio' ? 'brick' : 'limewash');
    for (let side = 0; side < 4; side++) {
      const a = foot[side],
        b = foot[(side + 1) % 4],
        n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.3);
      for (let i = 0; i < n; i++) {
        const at = (t: number) =>
            [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] satisfies [number, number],
          u = at(i / n),
          v = at((i + 1) / n),
          bottom = (q: readonly number[]) =>
            Math.min(base - 0.04, p.terrain.height(...point(q[0], q[1])) - 0.04);
        m.quad(
          [u[0], bottom(u), u[1]] satisfies [number, number, number],
          [v[0], bottom(v), v[1]] satisfies [number, number, number],
          [v[0], base, v[1]] satisfies [number, number, number],
          [u[0], base, u[1]] satisfies [number, number, number],
          tint(color, -8),
          'limewash',
        );
      }
    }
    m.box(-w / 2 - 0.025, base + H - 0.17, back - 0.015, w + 0.05, 0.12, d + 0.03, trim, 'stone');
    const bays = Math.max(2, Math.floor(w / 0.8)),
      gap = w / bays;
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + 0.12 + i * gap;
      drawFacadeWindow(m, {
        plane: front + 0.012,
        along: x,
        y: base + 0.3,
        w: gap - 0.24,
        h: 1.13,
        style: 'storefront',
        seed: i + p.index,
        trim,
      });
      if (shop.kind === 'arcade')
        drawFacadeWindow(m, {
          plane: front + 0.014,
          along: x + 0.05,
          y: base + 2.18,
          w: gap - 0.34,
          h: 0.65,
          style: 'sash',
          seed: i + 4,
          trim,
        });
    }
    m.box(-0.18, base + 0.03, front + 0.09, 0.36, 1.46, 0.035, '#4c7870', 'wood');
    m.box(-0.125, base + 0.78, front + 0.128, 0.25, 0.58, 0.01, '#87a6a7', { window: 0.08 });
    drawPlaque(m, signs, shop.sign, 0, base + 1.68, front + 0.045, w - 0.2, 0.29);
    if (shop.kind === 'studio') {
      const teeth = 3,
        step = d / teeth;
      for (let i = 0; i < teeth; i++) {
        const z = back + i * step;
        m.quad(
          [-w / 2 - 0.04, base + H, z] satisfies [number, number, number],
          [w / 2 + 0.04, base + H, z] satisfies [number, number, number],
          [w / 2 + 0.04, base + H + 0.38, z + step] satisfies [number, number, number],
          [-w / 2 - 0.04, base + H + 0.38, z + step] satisfies [number, number, number],
          '#6c8587',
          'roof',
        );
        m.quad(
          [-w / 2, base + H, z + step] satisfies [number, number, number],
          [w / 2, base + H, z + step] satisfies [number, number, number],
          [w / 2, base + H + 0.38, z + step] satisfies [number, number, number],
          [-w / 2, base + H + 0.38, z + step] satisfies [number, number, number],
          '#9bb5b5',
          { window: 0.07 },
        );
        for (const x of [-w / 2, w / 2] satisfies [number, number])
          m.tri(
            [x, base + H, z] satisfies [number, number, number],
            [x, base + H, z + step] satisfies [number, number, number],
            [x, base + H + 0.38, z + step] satisfies [number, number, number],
            trim,
            'stone',
          );
      }
      craftMural(m, -w / 2, back, d, base, p.index);
    } else if (shop.kind === 'arcade') {
      m.box(-w / 2 + 0.03, base + H, back + 0.04, w - 0.06, 0.055, d - 0.08, '#8a9c89', 'roof');
      for (let i = 0; i < 3; i++)
        m.box(
          -w / 2 + 0.04 + i * 0.15,
          base + H + 0.055 + i * 0.12,
          front - 0.08,
          w - 0.08 - i * 0.3,
          0.12,
          0.15,
          i % 2 ? color : trim,
          'stucco',
        );
      for (const x of [-w * 0.35, w * 0.35] satisfies [number, number]) {
        m.cylinder(x, base + 1.98, front + 0.14, 0.035, 0.77, '#688177', 10);
        craftFlowerPot(m, x, base + H + 0.06, back + 0.35, '#b68b67', true);
      }
      m.rod(
        [-w * 0.4, base + 2.1, front + 0.17] satisfies [number, number, number],
        [w * 0.4, base + 2.1, front + 0.17] satisfies [number, number, number],
        0.018,
        '#688177',
        6,
      );
      for (let x = -w * 0.38; x < w * 0.4; x += 0.16)
        m.rod(
          [x, base + 2.1, front + 0.17] satisfies [number, number, number],
          [x, base + 2.43, front + 0.17] satisfies [number, number, number],
          0.009,
          '#688177',
          4,
        );
    } else {
      const a = [-w / 2 - 0.04, base + H, back - 0.04] satisfies [number, number, number],
        b = [w / 2 + 0.04, base + H, back - 0.04] satisfies [number, number, number],
        c = [w / 2 + 0.04, base + H, front + 0.04] satisfies [number, number, number],
        d0 = [-w / 2 - 0.04, base + H, front + 0.04] satisfies [number, number, number],
        top = [0, base + H + 0.5, (back + front) / 2] satisfies [number, number, number];
      m.tri(a, top, b, '#ad745b', 'roofTile');
      m.tri(b, top, c, '#b87e61', 'roofTile');
      m.tri(c, top, d0, '#bf8a6a', 'roofTile');
      m.tri(d0, top, a, '#ad745b', 'roofTile');
    }
    if (shop.kind !== 'studio')
      for (let i = 0; i < 12; i++) {
        const x = -w / 2 + (i * w) / 12;
        m.quad(
          [x, base + 1.61, front + 0.03] satisfies [number, number, number],
          [x + w / 12, base + 1.61, front + 0.03] satisfies [number, number, number],
          [x + w / 12, base + 1.42, front + 0.42] satisfies [number, number, number],
          [x, base + 1.42, front + 0.42] satisfies [number, number, number],
          i % 2
            ? '#e7d9bb'
            : (['#6c9b8b', '#ac7872', '#7b92ac'] satisfies [string, string, string])[p.index % 3],
          'canvasWeave',
        );
        m.box(
          x,
          base + 1.34,
          front + 0.4,
          w / 12,
          0.08,
          0.018,
          i % 2 ? '#e7d9bb' : '#6c9b8b',
          'canvasWeave',
        );
      }
    for (const side of [-1, 1] satisfies [number, number])
      craftFlowerPot(m, side * (w / 2 - 0.14), base, front + 0.27, '#bd8c6d');
    if (shop.kind === 'market')
      for (const side of [-1, 1] satisfies [number, number]) {
        const x = side * (w * 0.3);
        m.box(x - 0.2, base + 0.03, front + 0.26, 0.4, 0.28, 0.24, '#a2865e', 'cedar');
        for (let j = 0; j < 5; j++)
          m.sphere(
            x - 0.14 + j * 0.07,
            base + 0.34,
            front + 0.38,
            0.046,
            0.05,
            0.044,
            side < 0 ? '#b1b975' : '#ce916f',
            8,
            4,
          );
      }
  });
  return {
    start,
    count: m.data.length - start,
    height: H + 0.65,
    body: { x: -w / 2, z: back, w, d },
  };
}
export function drawSouthernCraftSite(
  m: Mesh,
  p: Readonly<CraftPlot>,
  terrain: HeightTerrain,
  signs: SignAtlas,
  shop = CRAFT_SHOPS[p.index % CRAFT_SHOPS.length],
) {
  const start = m.data.length,
    garden = p.kind === 'garden',
    front = craftPoint(p, 0, p.d / 2 - 0.18),
    base = terrain.height(...front) + 0.04,
    navigationPolygons = [],
    seats: ReturnType<typeof makeNeighborhoodBench>[] = [];
  drawCraftGround(m, terrain, craftFootprint(p), garden ? '#c6bca0' : '#c2aa8d');
  if (garden) {
    pose(m, p.x, 0, p.z, p.rotation, () => {
      const at = craftPoint(p, -p.w * 0.28, -p.d * 0.22),
        h = terrain.height(...at),
        seatStart = m.data.length;
      craftSeat(m, -p.w * 0.28, h, -p.d * 0.22, 0.62);
      seats.push(
        makeNeighborhoodBench({
          id: p.id + '-bench',
          x: at[0],
          z: at[1],
          angle: p.rotation,
          base: h,
          height: 0.47,
          start: seatStart,
          count: m.data.length - seatStart,
        }),
      );
      for (const [u, v] of [
        [p.w * 0.3, -p.d * 0.23] satisfies [number, number],
        [p.w * 0.29, p.d * 0.23] satisfies [number, number],
      ]) {
        const pt = craftPoint(p, u, v),
          height = terrain.height(...pt);
        craftFlowerPot(m, u, height, v, p.index % 2 ? '#b78970' : '#849c96');
        navigationPolygons.push(craftFootprint({ ...p, x: pt[0], z: pt[1] }, 0.3, 0.3));
      }
      navigationPolygons.push(craftFootprint({ ...p, x: at[0], z: at[1] }, 0.7, 0.35));
      if (p.index % 2 === 0) {
        for (const u of [-p.w * 0.4, p.w * 0.4] satisfies [number, number]) {
          const pos = craftPoint(p, u, -p.d * 0.39),
            height = terrain.height(...pos);
          m.cylinder(u, height, -p.d * 0.39, 0.025, 1.6, '#8b9a7d', 8);
        }
        m.quad(
          [-p.w * 0.42, base + 1.66, -p.d * 0.41],
          [p.w * 0.42, base + 1.66, -p.d * 0.41],
          [p.w * 0.34, base + 1.86, p.d * 0.12],
          [-p.w * 0.34, base + 1.86, p.d * 0.12],
          '#d5b18d',
          'canvasWeave',
        );
      }
    });
  } else {
    const body = craftShopBody(m, { ...p, terrain }, base, shop, signs),
      r = body.body,
      mid = craftPoint(p, r.x + r.w / 2, r.z + r.d / 2);
    navigationPolygons.push(craftFootprint({ ...p, x: mid[0], z: mid[1] }, r.w + 0.05, r.d + 0.08));
    // The same small fixtures visible on the terrace enter the native
    // collision graph; the central front door and public walk stay open.
    const front = r.z + r.d;
    for (const side of [-1, 1] satisfies [number, number]) {
      const pot = craftPoint(p, side * (r.w / 2 - 0.14), front + 0.27);
      navigationPolygons.push(craftFootprint({ ...p, x: pot[0], z: pot[1] }, 0.3, 0.3));
      if (shop.kind === 'market') {
        const crate = craftPoint(p, side * r.w * 0.3, front + 0.38);
        navigationPolygons.push(craftFootprint({ ...p, x: crate[0], z: crate[1] }, 0.42, 0.26));
      }
    }
  }
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return {
    ...p,
    entry: requiredValue(p.entry, 'Craft site entrance'),
    seats,
    neighborhoodService: garden ? null : neighborhoodServiceFor(shop.label),
    label: garden ? 'Neighborhood garden' : shop.label,
    kind: garden ? 'neighborhood-garden' : 'neighborhood-shop',
    neighborLine: garden
      ? 'We planted this little garden together. It has done wonders for the block.'
      : shop.line,
    description: garden
      ? contentText('southern-craft.drawSouthernCraftSite.description-9.yes', {})
      : contentText('southern-craft.drawSouthernCraftSite.description-9.no', { v0: shop.line }),
    base,
    start,
    count: m.data.length - start,
    lo,
    hi,
    footprint: craftFootprint(p),
    navigationPolygons,
  };
}
export function drawSouthernPocketGardens(m: Mesh, terrain: HeightTerrain, signs: SignAtlas) {
  return SOUTHERN_CRAFT.map((p) => drawSouthernCraftSite(m, p, terrain, signs));
}
