import type { Parcel, ParcelRectangle, ParcelTerrain } from './types/parcels.ts';
import type { Mesh } from './geometry.ts';
import { pose, tint } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { suburbanPlan } from './suburban-layout.ts';
import { drawCraftGround } from './southern-craft.ts';
import { drawResidentialGarden } from './residential-gardens.ts';
const suburbanRect = (p: Readonly<Parcel>, r: ParcelRectangle) =>
  [
    [r.x, r.z],
    [r.x + r.w, r.z],
    [r.x + r.w, r.z + r.d],
    [r.x, r.z + r.d],
  ].map(([x, z]) => {
    const c = Math.cos(p.rotation || 0),
      s = Math.sin(p.rotation || 0);
    return [p.x + x * c - z * s, p.z + x * s + z * c];
  });
function suburbanRoof(
  m: Mesh,
  r: ParcelRectangle,
  y: number,
  rise: number,
  color: string,
  material = 'shingles',
  butterfly = false,
) {
  const { x, z, w, d } = r,
    mid = z + d * 0.5,
    e = 0.095,
    a = [x - e, y, z - e] satisfies [number, number, number],
    b = [x + w + e, y, z - e],
    c = [x + w + e, y, z + d + e],
    q = [x - e, y, z + d + e],
    L = [x - e, y + rise, mid],
    R = [x + w + e, y + rise, mid];
  if (butterfly) {
    a[1] += rise;
    b[1] += rise;
    c[1] += rise;
    q[1] += rise;
    L[1] = y;
    R[1] = y;
  }
  m.quad(a, L, R, b, color, material);
  m.quad(q, c, R, L, tint(color, -6), material);
  for (const [u, v, k] of [
    [a, q, L],
    [b, R, c],
  ])
    m.tri(u, v, k, '#d4c2a0', 'clapboard');
  for (const [u, v] of [
    [a, b],
    [q, c],
    [a, q],
    [b, c],
  ])
    m.rod(u, v, 0.022, '#e1d4b8', 5);
  if (butterfly)
    for (let i = 0; i < 7; i++) {
      const xx = x + ((i + 0.4) * w) / 7;
      m.rod([xx, y + rise + 0.008, z - e], [xx, y + 0.008, mid], 0.007, '#7a938c', 5);
      m.rod([xx, y + 0.008, mid], [xx, y + rise + 0.008, z + d + e], 0.007, '#7a938c', 5);
    }
}
/** Single-storey houses occupy part of the lot. Garden paths and lawns remain
 * traversable; the house and garage alone enter the shared collision plan. */
export function makeSuburbanHome(m: Mesh, p: Readonly<Parcel>, terrain: ParcelTerrain) {
  const start = m.data.length,
    plan = suburbanPlan(p),
    r = plan.house,
    H = plan.height,
    seed = p.seed ?? 0.4,
    variant = Math.floor(seed * 11) % 4,
    palettes = {
      eichler: ['#b3b49a', '#a9c0b6', '#c4ad90', '#a5b7bf'] satisfies [
        string,
        string,
        string,
        string,
      ],
      bungalow: ['#d3ae88', '#a5b997', '#bda4b8', '#cdbd8e'] satisfies [
        string,
        string,
        string,
        string,
      ],
      craftsman: ['#688d83', '#a18067', '#7c8b69', '#8c9baf'] satisfies [
        string,
        string,
        string,
        string,
      ],
    },
    paint = palettes[plan.style as keyof typeof palettes][variant],
    trim = plan.style === 'craftsman' ? '#d8c8a7' : '#e6ddc5';
  const point = (x: number, z: number) => {
      const a = p.rotation || 0;
      return [p.x + x * Math.cos(a) - z * Math.sin(a), p.z + x * Math.sin(a) + z * Math.cos(a)] as [
        number,
        number,
      ];
    },
    frontPoint = point(plan.entry.x, p.d / 2),
    base = terrain.height(...frontPoint) + 0.035;
  terrain.cutPlot({
    cx: p.x,
    cz: p.z,
    w: p.w - 0.08,
    d: p.d - 0.08,
    angle: p.rotation,
    height: base - 0.035,
    onlyLower: true,
  });
  const body = suburbanRect(p, r),
    paths = [
      suburbanRect(p, { x: plan.entry.x - 0.2, z: r.z + r.d, w: 0.4, d: p.d / 2 - r.z - r.d }),
    ];
  for (const path of paths)
    drawCraftGround(
      m,
      terrain,
      path,
      '#cbbd9d',
      plan.style === 'eichler' ? 'flagstone' : 'herringbone',
    );
  pose(m, p.x, base, p.z, p.rotation || 0, () => {
    m.box(
      r.x,
      0,
      r.z,
      r.w,
      H,
      r.d,
      paint,
      plan.style === 'eichler' ? 'limewash' : plan.style === 'craftsman' ? 'clapboard' : 'stucco',
    );
    // Fit a quiet concrete skirt to the slope, with garage doors wherever
    // the front-facing plinth would otherwise be taller than a step.
    for (const [i, [x, z, w, d]] of [
      [r.x, r.z, r.w, 0.035] satisfies [number, number, number, number],
      [r.x, r.z + r.d - 0.035, r.w, 0.035] satisfies [number, number, number, number],
      [r.x, r.z, 0.035, r.d] satisfies [number, number, number, number],
      [r.x + r.w - 0.035, r.z, 0.035, r.d] satisfies [number, number, number, number],
    ].entries()) {
      const ground = Math.min(
        ...[[x, z] satisfies [number, number], [x + w, z + d] satisfies [number, number]].map(
          ([u, v]) => terrain.height(...point(u, v)) - base,
        ),
      );
      if (ground < -0.02) {
        const rise = -ground;
        m.box(x, ground, z, w, rise, d, tint(paint, -17), 'boardConcrete');
        if (rise > 0.95 && i < 2) {
          const gw = Math.min(1.3, w - 0.22),
            gh = Math.min(1.38, rise - 0.12),
            gx = x + (w - gw) / 2,
            gy = ground + 0.045,
            plane = i === 0 ? z - 0.032 : z + d + 0.014;
          m.box(gx, gy, plane, gw, gh, 0.018, '#b3b398', 'cedar');
          for (let j = 1; j < 7; j++)
            m.box(
              gx + 0.02,
              gy + (j * gh) / 7,
              plane + (i === 0 ? -0.009 : 0.02),
              gw - 0.04,
              0.012,
              0.01,
              '#838f7d',
            );
          for (let j = 0; j < 3; j++)
            m.box(
              gx + 0.07 + (j * (gw - 0.14)) / 3,
              gy + gh * 0.74,
              plane + (i === 0 ? -0.012 : 0.025),
              (gw - 0.23) / 3,
              gh * 0.16,
              0.009,
              '#90aaa2',
              'glass',
            );
          for (const xx of [gx - 0.025, gx + gw] satisfies [number, number])
            m.box(xx, gy, plane - 0.004, 0.025, gh + 0.025, 0.03, trim, 'wood');
        } else if (rise > 0.45) {
          const span = i < 2 ? w : d,
            plane =
              i < 2 ? (i === 0 ? z - 0.015 : z + d + 0.015) : i === 2 ? x - 0.015 : x + w + 0.015;
          drawFacadeWindow(m, {
            isX: i >= 2,
            plane,
            along: (i < 2 ? x : z) + span * 0.22,
            y: ground + 0.15,
            w: span * 0.56,
            h: Math.min(0.32, rise - 0.25),
            far: i === 0 || i === 2,
            style: 'office',
            trim,
            seed: i + seed,
          });
        }
      }
    }
    const face = r.z + r.d,
      doorW = Math.min(0.4, r.w * 0.22),
      doorX = plan.entry.x - doorW * 0.5;
    m.box(
      doorX,
      0.035,
      face + 0.018,
      doorW,
      1.43,
      0.04,
      plan.style === 'eichler'
        ? (['#b46e4d', '#b3a359', '#668e99', '#a66774'] satisfies [string, string, string, string])[
            variant
          ]
        : '#4c6c60',
      'wood',
    );
    m.box(doorX + 0.06, 0.71, face + 0.063, doorW - 0.12, 0.61, 0.012, '#a5beb7', 'glass');
    m.rod(
      [doorX + doorW - 0.065, 0.65, face + 0.08] satisfies [number, number, number],
      [doorX + doorW - 0.065, 0.84, face + 0.08] satisfies [number, number, number],
      0.009,
      '#bdab79',
      6,
    );
    const windowW = Math.max(0.35, r.w * 0.3),
      windowX = r.x + 0.1;
    drawFacadeWindow(m, {
      plane: face + 0.035,
      along: windowX,
      y: 0.49,
      w: windowW,
      h: 0.8,
      style: plan.style === 'eichler' ? 'storefront' : 'sash',
      trim,
      seed: seed * 31,
    });
    drawFacadeWindow(m, {
      plane: r.z - 0.014,
      far: true,
      along: r.x + r.w * 0.2,
      y: 0.49,
      w: r.w * 0.58,
      h: 0.72,
      style: 'sash',
      trim,
      seed: seed * 53,
    });
    for (const side of [-1, 1] satisfies [number, number])
      if (r.d > 1.1)
        drawFacadeWindow(m, {
          isX: true,
          plane: side < 0 ? r.x - 0.014 : r.x + r.w + 0.014,
          far: side < 0,
          along: r.z + 0.28,
          y: 0.56,
          w: Math.min(0.6, r.d - 0.5),
          h: 0.59,
          trim,
          seed: side + seed * 9,
        });
    if (plan.style === 'eichler') {
      suburbanRoof(m, r, H, 0.21, '#5d7772', 'roof', true);
      for (let j = 0; j < Math.floor(r.w / 0.22); j++)
        m.box(r.x + 0.06 + j * 0.22, H - 0.29, face + 0.015, 0.16, 0.17, 0.016, '#b5cebd', 'glass');
      for (let j = 0; j < 5; j++)
        m.box(r.x + 0.035 + j * 0.07, 0.1, face + 0.07, 0.022, 1.45, 0.04, '#9a7958', 'cedar');
      m.box(r.x - 0.06, H - 0.08, face - 0.02, r.w + 0.12, 0.06, 0.38, trim, 'cedar');
    } else {
      suburbanRoof(
        m,
        r,
        H,
        plan.style === 'craftsman' ? 0.48 : 0.34,
        plan.style === 'craftsman'
          ? '#66766b'
          : (
              ['#9a7a64', '#a97c5c', '#857c80', '#76858a'] satisfies [
                string,
                string,
                string,
                string,
              ]
            )[variant],
      );
      const porchW = Math.min(r.w - 0.08, plan.style === 'craftsman' ? 1.22 : 0.92),
        px = plan.entry.x - porchW / 2,
        porchD = 0.36;
      m.box(px, 0.025, face, porchW, 0.08, porchD, '#c1b299', 'flagstone');
      suburbanRoof(
        m,
        { x: px, z: face - 0.06, w: porchW, d: 0.42 },
        1.52,
        0.22,
        plan.style === 'craftsman' ? '#66766b' : '#9d8b70',
      );
      for (const x of [px + 0.06, px + porchW - 0.06] satisfies [number, number]) {
        m.box(x - 0.04, 0.1, face + 0.26, 0.08, 0.31, 0.08, '#aa9b82', 'stone');
        m.cylinder(x, 0.41, face + 0.3, 0.032, 1.1, trim, 4, 0.055, 'cedar');
      }
      if (plan.style === 'craftsman')
        for (let x = r.x + 0.12; x < r.x + r.w - 0.05; x += 0.27)
          m.rod(
            [x, H - 0.08, r.z - 0.02] satisfies [number, number, number],
            [x, H + 0.015, r.z - 0.12] satisfies [number, number, number],
            0.016,
            '#c6b28b',
            4,
          );
    }
    // A side chimney and a real garage replace the anonymous tall bases.
    if (plan.style !== 'eichler') {
      m.box(r.x + r.w - 0.29, H - 0.15, r.z + 0.22, 0.2, 0.64, 0.26, '#aa8970', 'brick');
      m.box(r.x + r.w - 0.32, H + 0.46, r.z + 0.19, 0.26, 0.07, 0.32, trim, 'stone');
    }
    if (plan.garage) {
      const g = plan.garage;
      m.box(
        g.x,
        0,
        g.z,
        g.w,
        1.25,
        g.d,
        tint(paint, -9),
        plan.style === 'eichler' ? 'cedar' : 'clapboard',
      );
      m.box(g.x - 0.04, 1.25, g.z - 0.04, g.w + 0.08, 0.1, g.d + 0.08, '#76857a', 'roof');
      m.box(g.x + 0.07, 0.035, g.z + g.d + 0.014, g.w - 0.14, 1.08, 0.03, '#c7c0a6', 'wood');
      for (let j = 1; j < 6; j++)
        m.box(g.x + 0.075, j * 0.17, g.z + g.d + 0.05, g.w - 0.15, 0.012, 0.012, '#9d9f8a');
      for (let j = 0; j < 3; j++)
        m.box(
          g.x + 0.12 + (j * (g.w - 0.24)) / 3,
          0.85,
          g.z + g.d + 0.052,
          (g.w - 0.3) / 3,
          0.16,
          0.009,
          '#8aa8a1',
          'glass',
        );
    }
    for (const x of [r.x + 0.16, r.x + r.w - 0.16] satisfies [number, number]) {
      m.cylinder(x, 0.05, face + 0.25, 0.075, 0.13, '#b68e72', 10, 0.1, 'limewash');
      m.sphere(x, 0.28, face + 0.25, 0.1, 0.13, 0.09, '#7e9a66', 10, 5);
    }
  });
  if (plan.garage) {
    const g = plan.garage;
    drawCraftGround(
      m,
      terrain,
      suburbanRect(p, { x: g.x, z: g.z + g.d, w: g.w, d: p.d / 2 - g.z - g.d }),
      '#bdbaa5',
      'concrete',
    );
  }
  const fences = drawResidentialGarden(m, p, terrain);
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return {
    mesh: m,
    start: start / 11,
    count: (m.data.length - start) / 11,
    lo,
    hi,
    x: p.x - p.w / 2,
    y: p.z - p.d / 2,
    w: p.w,
    d: p.d,
    rotation: p.rotation,
    base,
    arch: 'suburban',
    district: plan.style,
    suburbanStyle: plan.style,
    houseHeight: H,
    plot: p,
    plan,
    footprint: body,
    navigationPolygons: [
      body,
      ...(plan.garage ? [suburbanRect(p, plan.garage)] : []),
      ...fences.map((f) => suburbanRect(p, f)),
    ],
    solid: true,
    preserveGround: true,
    homes: 1,
    storeys: 1,
    houses: [{ door: plan.entry.x - 0.2, dw: 0.4, entry: p.d / 2 }],
  };
}
