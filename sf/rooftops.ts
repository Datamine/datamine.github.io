interface RoofPlanOptions {
  x: number;
  z: number;
  w: number;
  d: number;
  seed?: number;
  style?: string | null;
}
interface RoofOptions extends RoofPlanOptions {
  y: number;
  parapets?: boolean;
  surfaceColor?: string | null;
}
import type { Mesh } from './geometry.ts';
import { rand, tint, pose } from './geometry.ts';

export const COMMERCIAL_ROOF_STYLES = Object.freeze([
  'mechanical',
  'cool-roof',
  'copper-shed',
  'northlights',
  'gravel',
  'solar',
  'terrace',
  'penthouse',
] satisfies [string, string, string, string, string, string, string, string]);
const roofPalette = [
  '#647982',
  '#b3a68b',
  '#aebbb6',
  '#546168',
  '#987360',
  '#72978a',
  '#9da4b2',
  '#c5c0a5',
] satisfies [string, string, string, string, string, string, string, string];
function roofPaint(color: string, seed: number) {
  const values = ([1, 3, 5] satisfies [number, number, number]).map(
      (i) => parseInt(color.slice(i, i + 2), 16) / 255,
    ),
    gray = values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722,
    saturation = 0.65 + rand(seed, 31, 4) * 0.85,
    light = (rand(seed, 19, 8) - 0.5) * 0.08;
  return (
    '#' +
    values
      .map((v) =>
        Math.round(Math.max(0, Math.min(1, gray + (v - gray) * saturation + light)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
/** Stable building-specific choices; all details are baked into static meshes. */
export function commercialRoofPlan({ x, z, w, d, seed = 0, style = null }: RoofPlanOptions) {
  const value = seed * 97.13 + x * 3.7 + z * 0.91,
    index = Math.floor(rand(value, 17, 83) * COMMERCIAL_ROOF_STYLES.length),
    name = style || COMMERCIAL_ROOF_STYLES[index];
  const colors: Record<string, string> = {
    'cool-roof': '#c8cdc0',
    'copper-shed': '#69988c',
    gravel: '#b3a68b',
    terrace: '#9b7960',
  };
  return {
    style: name,
    color: roofPaint(
      colors[name] || roofPalette[Math.floor(rand(value, 9, 41) * roofPalette.length)],
      value,
    ),
    trim: roofPaint('#b9bfb4', value + 5),
    metal: roofPaint('#879c9e', value + 11),
    accent: roofPaint('#648c7b', value + 17),
    seed: value,
    w,
    d,
  };
}

function roofFan(m: Mesh, x: number, y: number, z: number, r: number, color: string) {
  m.cylinder(x, y, z, r, 0.014, '#384b50', 16);
  m.cylinder(x, y + 0.016, z, r * 0.18, 0.018, color, 12);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.4,
      p = (r: number, b: number) =>
        [x + Math.cos(b) * r, y + 0.021, z + Math.sin(b) * r] satisfies [number, number, number];
    m.quad(
      p(r * 0.24, a + 0.7),
      p(r * 0.79, a + 0.57),
      p(r * 0.72, a + 0.2),
      p(r * 0.16, a),
      color,
      { metal: 0.3 },
    );
  }
  for (let i = -3; i <= 3; i++) {
    const u = (i * r) / 4,
      reach = Math.sqrt(r * r - u * u) * 0.92;
    m.rod(
      [x - reach, y + 0.035, z + u] satisfies [number, number, number],
      [x + reach, y + 0.035, z + u] satisfies [number, number, number],
      0.005,
      color,
      4,
    );
  }
}
function roofHVAC(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: string,
) {
  for (const u of [0.06, w - 0.1] satisfies [number, number])
    m.box(x + u, y, z + 0.04, 0.035, 0.05, Math.max(0.08, d - 0.08), '#455958');
  m.box(x, y + 0.05, z, w, h, d, color, { metal: 0.22 });
  m.box(x - 0.008, y + h + 0.05, z - 0.008, w + 0.016, 0.025, d + 0.016, tint(color, 18), {
    metal: 0.3,
  });
  for (let i = 0; i < 4; i++)
    m.box(x + 0.025, y + 0.08 + i * h * 0.19, z - 0.009, w - 0.05, 0.012, 0.013, '#52686c');
  roofFan(m, x + w / 2, y + h + 0.08, z + d / 2, Math.min(w, d) * 0.32, tint(color, 18));
}
function roofVent(m: Mesh, x: number, y: number, z: number, r: number, h: number, color: string) {
  m.cylinder(x, y, z, r, h, color, 12, r, { metal: 0.3 });
  m.cylinder(x, y + h, z, r * 1.42, 0.035, tint(color, 12), 16, r * 0.55, { metal: 0.3 });
}

/** x/z is the roof's local northwest corner, y its cornice top. Keeps every
 * fixture inside that rectangle, including narrow roofs on shallow lots. */
export function drawCommercialRoof(m: Mesh, options: RoofOptions) {
  const { x, y, z, w, d, seed = 0, parapets = true, surfaceColor = null } = options,
    plan = commercialRoofPlan(options),
    start = m.data.length;
  const margin = Math.min(0.11, w * 0.07, d * 0.07),
    W = w - margin * 2,
    D = d - margin * 2,
    S = Math.min(1.2, Math.max(0.35, Math.min(W / 2.5, D / 1.4))),
    deck = 0.035;
  const unit = (u: number, v: number, uw: number, vd: number, h = 0.22) => ({
    x: margin + W * u,
    z: margin + D * v,
    w: W * uw,
    d: D * vd,
    h: h * S,
  });
  pose(m, x, y, z, 0, () => {
    const color = surfaceColor ? roofPaint(surfaceColor, plan.seed) : plan.color;
    m.box(
      0,
      0,
      0,
      w,
      0.035,
      d,
      color,
      plan.style === 'terrace' ? 'wood' : plan.style === 'gravel' ? 'dirt' : 'roof',
    );
    if (parapets) {
      for (const xx of [0, w - 0.035] satisfies [number, number])
        m.box(xx, deck, 0, 0.035, 0.14, d, plan.trim, 'stone');
      for (const zz of [0, d - 0.035] satisfies [number, number])
        m.box(0.035, deck, zz, w - 0.07, 0.14, 0.035, plan.trim, 'stone');
    }
    const hvac = (u: number, v: number, uw: number, vd: number, h = 0.22) => {
      const q = unit(u, v, uw, vd, h);
      roofHVAC(m, q.x, deck, q.z, q.w, q.d, q.h, plan.metal);
    };
    const bulkhead = (u: number, v: number, uw: number, vd: number, h = 0.52) => {
      const q = unit(u, v, uw, vd, h);
      m.box(q.x, deck, q.z, q.w, q.h, q.d, plan.trim, 'stucco');
      m.box(q.x - 0.015, deck + q.h, q.z - 0.015, q.w + 0.03, 0.035, q.d + 0.03, plan.accent, {
        metal: 0.2,
      });
      const doorW = q.w * 0.48;
      m.box(q.x + q.w * 0.2, deck + 0.025, q.z + q.d + 0.008, doorW, q.h * 0.77, 0.012, '#52676a');
      m.box(q.x + q.w * 0.59, deck + q.h * 0.4, q.z + q.d + 0.023, 0.012, 0.015, 0.008, '#c6bb8e');
    };
    const vent = (u: number, v: number) =>
      roofVent(
        m,
        margin + W * u,
        deck,
        margin + D * v,
        Math.min(0.055 * S, W * 0.045, D * 0.065),
        0.19 * S,
        plan.metal,
      );
    if (plan.style === 'mechanical') {
      hvac(0.05, 0.16, 0.35, 0.43, 0.28);
      hvac(0.54, 0.43, 0.37, 0.37, 0.24);
      const duct = unit(0.31, 0.5, 0.32, 0.12, 0.12);
      m.box(duct.x, deck + 0.08 * S, duct.z, duct.w, 0.1 * S, duct.d, plan.metal, { metal: 0.3 });
      vent(0.8, 0.16);
      vent(0.9, 0.23);
    } else if (plan.style === 'cool-roof') {
      bulkhead(0.06, 0.07, 0.32, 0.33, 0.6);
      hvac(0.57, 0.55, 0.3, 0.32, 0.2);
      for (const u of [0.56, 0.76, 0.9] satisfies [number, number, number]) vent(u, 0.15);
      const q = unit(0.12, 0.62, 0.3, 0.22);
      m.box(q.x, deck, q.z, q.w, 0.018, q.d, '#aab9ad');
    } else if (plan.style === 'copper-shed') {
      const q = unit(0.07, 0.1, 0.62, 0.68, 0.45),
        ridge = q.z + q.d * 0.46;
      m.box(q.x, deck, q.z, q.w, 0.12 * S, q.d, plan.trim, 'stone');
      for (const side of [-1, 1] satisfies [number, number]) {
        const zz = side < 0 ? q.z : q.z + q.d,
          points = [
            [q.x, deck + 0.12 * S, zz] satisfies [number, number, number],
            [q.x + q.w, deck + 0.12 * S, zz] satisfies [number, number, number],
            [q.x + q.w, deck + q.h, ridge] satisfies [number, number, number],
            [q.x, deck + q.h, ridge] satisfies [number, number, number],
          ];
        if (side < 0) points.reverse();
        m.quad(
          points[0],
          points[1],
          points[2],
          points[3],
          side < 0 ? plan.accent : tint(plan.accent, -13),
          'roof',
        );
      }
      for (const xx of [q.x, q.x + q.w] satisfies [number, number]) {
        const points = [
          [xx, deck + 0.12 * S, q.z] satisfies [number, number, number],
          [xx, deck + 0.12 * S, q.z + q.d] satisfies [number, number, number],
          [xx, deck + q.h, ridge] satisfies [number, number, number],
        ];
        if (xx !== q.x) points.reverse();
        m.tri(points[0], points[1], points[2], plan.trim, 'stucco');
      }
      for (let i = 1; i < 6; i++)
        for (const zz of [q.z, q.z + q.d] satisfies [number, number])
          m.rod(
            [q.x + (q.w * i) / 6, deck + 0.125 * S, zz] satisfies [number, number, number],
            [q.x + (q.w * i) / 6, deck + q.h + 0.005, ridge] satisfies [number, number, number],
            0.007,
            plan.metal,
            4,
          );
      vent(0.84, 0.25);
      vent(0.84, 0.69);
    } else if (plan.style === 'northlights') {
      const q = unit(0.08, 0.1, 0.78, 0.7, 0.32),
        count = W > 3.5 ? 4 : 2,
        run = q.d / count;
      for (let i = 0; i < count; i++) {
        const zz = q.z + i * run,
          top = deck + q.h,
          shoulder = zz + run * 0.7;
        m.quad(
          [q.x, top, shoulder] satisfies [number, number, number],
          [q.x + q.w, top, shoulder] satisfies [number, number, number],
          [q.x + q.w, deck, zz] satisfies [number, number, number],
          [q.x, deck, zz] satisfies [number, number, number],
          plan.accent,
          'roof',
        );
        m.quad(
          [q.x, deck, zz + run] satisfies [number, number, number],
          [q.x + q.w, deck, zz + run] satisfies [number, number, number],
          [q.x + q.w, top, shoulder] satisfies [number, number, number],
          [q.x, top, shoulder] satisfies [number, number, number],
          '#6c9298',
          'glass',
        );
        for (const xx of [q.x, q.x + q.w] satisfies [number, number]) {
          const points = [
            [xx, deck, zz] satisfies [number, number, number],
            [xx, deck, zz + run] satisfies [number, number, number],
            [xx, top, shoulder] satisfies [number, number, number],
          ];
          if (xx !== q.x) points.reverse();
          m.tri(points[0], points[1], points[2], plan.trim);
        }
        for (let j = 0; j <= 3; j++)
          m.rod(
            [q.x + (q.w * j) / 3, top + 0.006, shoulder] satisfies [number, number, number],
            [q.x + (q.w * j) / 3, deck + 0.006, zz + run] satisfies [number, number, number],
            0.009,
            plan.trim,
            4,
          );
      }
      vent(0.93, 0.55);
    } else if (plan.style === 'gravel') {
      const q = unit(0.08, 0.17, 0.27, 0.48, 0.13);
      m.box(q.x, deck, q.z, q.w, q.h, q.d, plan.trim, 'stone');
      m.box(
        q.x + 0.018,
        deck + q.h,
        q.z + 0.018,
        q.w - 0.036,
        0.025,
        q.d - 0.036,
        '#789c9b',
        'glass',
      );
      hvac(0.55, 0.12, 0.29, 0.34, 0.2);
      for (const u of [0.56, 0.74, 0.9] satisfies [number, number, number]) vent(u, 0.78);
      for (let i = 0; i < 8; i++) {
        const u = margin + W * (0.1 + rand(seed, i, 8) * 0.8),
          v = margin + D * (0.05 + rand(seed, i, 9) * 0.07);
        m.box(u, deck, v, 0.025, 0.012, 0.02, tint(plan.color, i % 2 ? 12 : -12), 'stone');
      }
    } else if (plan.style === 'solar') {
      const columns = W > 3 ? 3 : 2,
        rows = D > 1.3 ? 2 : 1,
        panelW = (W * 0.63) / columns,
        panelD = (D * 0.54) / rows;
      for (let row = 0; row < rows; row++)
        for (let column = 0; column < columns; column++) {
          const xx = margin + W * 0.06 + column * panelW,
            zz = margin + D * 0.08 + row * panelD,
            width = panelW * 0.88,
            depth = panelD * 0.8,
            low = deck + 0.08 * S,
            high = low + 0.15 * S;
          for (const u of [xx + 0.02, xx + width - 0.02] satisfies [number, number]) {
            m.rod(
              [u, deck, zz + depth] satisfies [number, number, number],
              [u, high, zz + depth] satisfies [number, number, number],
              0.01,
              plan.metal,
              5,
            );
            m.rod(
              [u, deck, zz] satisfies [number, number, number],
              [u, low, zz] satisfies [number, number, number],
              0.01,
              plan.metal,
              5,
            );
          }
          m.quad(
            [xx, low, zz] satisfies [number, number, number],
            [xx, high, zz + depth] satisfies [number, number, number],
            [xx + width, high, zz + depth] satisfies [number, number, number],
            [xx + width, low, zz] satisfies [number, number, number],
            '#365c78',
            { metal: 0.28 },
          );
          for (let j = 1; j < 4; j++) {
            const u = xx + (width * j) / 4;
            m.rod(
              [u, low + 0.005, zz] satisfies [number, number, number],
              [u, high + 0.005, zz + depth] satisfies [number, number, number],
              0.004,
              '#97b3bd',
              4,
            );
          }
        }
      hvac(0.76, 0.53, 0.2, 0.32, 0.2);
      vent(0.83, 0.2);
    } else if (plan.style === 'terrace') {
      bulkhead(0.06, 0.07, 0.25, 0.27, 0.55);
      for (const v of [0.67, 0.82] satisfies [number, number]) {
        const q = unit(0.12, v, 0.64, 0.1, 0.13);
        m.box(q.x, deck, q.z, q.w, q.h, q.d, '#9b7760', 'wood');
        for (let i = 0; i < 4; i++)
          m.sphere(
            q.x + (q.w * (i + 0.5)) / 4,
            deck + q.h + 0.045 * S,
            q.z + q.d / 2,
            Math.min(q.w / 9, 0.1 * S),
            0.08 * S,
            Math.min(q.d * 0.43, 0.07),
            '#6d935f',
            10,
            5,
          );
      }
      const q = unit(0.53, 0.25, 0.24, 0.22);
      m.box(q.x, deck + 0.23 * S, q.z, q.w, 0.028, q.d, plan.trim, 'wood');
      for (const u of [0.1, 0.85] satisfies [number, number])
        m.box(q.x + q.w * u, deck, q.z + q.d * 0.45, 0.018, 0.23 * S, 0.018, plan.metal);
      vent(0.9, 0.8);
    } else {
      bulkhead(0.12, 0.14, 0.52, 0.6, 0.73);
      hvac(0.73, 0.57, 0.21, 0.3, 0.2);
      const q = unit(0.17, 0.22, 0.42, 0.42);
      m.box(q.x, deck + 0.75 * S, q.z, q.w, 0.05, q.d, plan.accent, { metal: 0.25 });
      vent(0.87, 0.22);
    }
  });
  let top = y;
  for (let i = start; i < m.data.length; i += 11) top = Math.max(top, m.data[i + 1]);
  return { ...plan, height: top - y };
}
