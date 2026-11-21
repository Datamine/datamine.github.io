import type { SignAtlas } from './types/world.ts';
import type { Parcel, ParcelTerrain } from './types/parcels.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { planEstate, estateStyleFor, estatePoint, estateRectangle } from './estate-design.ts';
import { drawEstateHome, drawEstateGarden } from './estate-homes.ts';

function estateHipRoof(m: Mesh, w: number, d: number, y: number, rise: number, color: string) {
  const a = [-w / 2, y, -d / 2] satisfies [number, number, number],
    b = [w / 2, y, -d / 2] satisfies [number, number, number],
    c = [w / 2, y, d / 2] satisfies [number, number, number],
    e = [-w / 2, y, d / 2] satisfies [number, number, number],
    left = [-w * 0.24, y + rise, 0] satisfies [number, number, number],
    right = [w * 0.24, y + rise, 0] satisfies [number, number, number];
  m.quad(a, left, right, b, color, 'shingles');
  m.quad(c, right, left, e, color, 'shingles');
  m.tri(e, left, a, color, 'shingles');
  m.tri(b, right, c, color, 'shingles');
}

/** Restrained country-house architecture: limestone, slate, bronze, recessed
 * glazing and a shallow colonnade. All details stay inside the authored lot. */
function drawCapitalEstate(
  m: Mesh,
  { w, d, seed = 0, capital = false }: { w: number; d: number; seed?: number; capital?: boolean },
  signs: SignAtlas | null = null,
  title: string | null = null,
) {
  const width = w - 0.18,
    depth = d - 0.45,
    h = capital ? 3.25 : 2.35 + seed * 0.45,
    wall = capital
      ? '#ded4bb'
      : (['#c7c3af', '#d8ccb5', '#b8c5bc'] satisfies [string, string, string])[
          Math.floor(seed * 3) % 3
        ],
    trim = '#e9e0cb',
    roof = seed > 0.65 ? '#586565' : '#3e5057',
    front = depth / 2;
  m.box(
    -width / 2,
    0,
    -depth / 2,
    width,
    h,
    depth,
    wall,
    capital || seed < 0.45 ? 'stone' : 'stucco',
  );
  for (const y of [0.12, h - 0.18] satisfies [number, number])
    m.box(
      -width / 2 - 0.025,
      y,
      -depth / 2 - 0.025,
      width + 0.05,
      0.11,
      depth + 0.05,
      trim,
      'stone',
    );
  for (const x of [-width / 2, width / 2 - 0.13] satisfies [number, number])
    for (const z of [-depth / 2, front - 0.13] satisfies [number, number])
      for (let i = 0; i < 6; i++)
        m.box(x - 0.02, 0.24 + (i * (h - 0.5)) / 6, z - 0.02, 0.17, 0.12, 0.17, trim, 'stone');
  const bays = Math.max(2, Math.floor(width / 1.05));
  for (const side of [-1, 1] satisfies [number, number])
    for (let i = 0; i < bays; i++) {
      const x = -width / 2 + 0.23 + (i * (width - 0.35)) / bays;
      if (side > 0 && Math.abs(x + 0.24) < 0.68) continue;
      drawFacadeWindow(m, {
        plane: side * (depth / 2 + 0.012),
        far: side < 0,
        along: x,
        y: 0.45,
        w: Math.min(0.65, (width - 0.8) / bays),
        h: capital ? 1.75 : 1.3,
        style: 'sash',
        trim,
        seed: i + seed * 13,
      });
    }
  const sideBays = Math.max(1, Math.floor(depth / 0.95));
  for (const side of [-1, 1] satisfies [number, number])
    for (let i = 0; i < sideBays; i++)
      drawFacadeWindow(m, {
        isX: true,
        plane: side * (width / 2 + 0.012),
        far: side < 0,
        along: -depth / 2 + 0.2 + (i * (depth - 0.3)) / sideBays,
        y: 0.48,
        w: Math.min(0.6, (depth - 0.5) / sideBays),
        h: capital ? 1.6 : 1.25,
        style: 'sash',
        trim,
        seed: i + seed * 17,
      });
  m.box(-0.32, 0.05, front + 0.015, 0.64, capital ? 2 : 1.65, 0.035, '#3d514d', 'wood');
  m.rod(
    [0.18, 0.8, front + 0.07] satisfies [number, number, number],
    [0.18, 1.03, front + 0.07] satisfies [number, number, number],
    0.014,
    '#c8ae73',
    8,
    { metal: 0.5 },
  );
  for (const x of [-0.65, 0.65] satisfies [number, number]) {
    m.cylinder(x, 0.12, front + 0.13, 0.055, capital ? 2.25 : 1.85, trim, 20, 0.048, 'stone');
    m.cylinder(x, 0.08, front + 0.13, 0.1, 0.1, trim, 20);
    m.cylinder(x, capital ? 2.28 : 1.88, front + 0.13, 0.105, 0.1, trim, 20);
  }
  const top = capital ? 2.4 : 2;
  m.box(-0.85, top, front - 0.02, 1.7, 0.12, 0.35, trim, 'stone');
  m.tri(
    [-0.85, top + 0.12, front + 0.34] satisfies [number, number, number],
    [0.85, top + 0.12, front + 0.34] satisfies [number, number, number],
    [0, top + 0.55, front + 0.34] satisfies [number, number, number],
    trim,
    'stone',
  );
  m.box(-0.84, 0.01, front + 0.025, 1.68, 0.1, 0.3, '#b6b2a0', 'stone');
  estateHipRoof(m, width + 0.12, depth + 0.15, h, 0.65 + seed * 0.3, roof);
  for (const x of [-width * 0.33, width * 0.3] satisfies [number, number]) {
    m.box(
      x - 0.12,
      h + 0.2,
      -depth * 0.21,
      0.24,
      0.73,
      0.3,
      capital ? '#bdac91' : '#9d8b76',
      'brick',
    );
    m.box(x - 0.15, h + 0.91, -depth * 0.21 - 0.035, 0.3, 0.07, 0.37, trim, 'stone');
  }
  if (capital) {
    for (const x of [-width * 0.3, width * 0.3] satisfies [number, number]) {
      m.box(x - 0.28, h + 0.08, front * 0.4, 0.56, 0.44, 0.45, wall, 'stone');
      drawFacadeWindow(m, {
        plane: front * 0.4 + 0.46,
        along: x - 0.18,
        y: h + 0.15,
        w: 0.36,
        h: 0.3,
        trim,
        seed: x,
      });
      pose(m, x, 0, front * 0.4 + 0.225, 0, () =>
        estateHipRoof(m, 0.68, 0.65, h + 0.53, 0.25, roof),
      );
    }
    const uv = title ? signs?.get(title) : undefined;
    m.box(-width * 0.46, 3.03, front + 0.04, width * 0.92, 0.39, 0.025, '#34483e');
    if (uv)
      m.quad(
        [-width * 0.44, 3.08, front + 0.075] satisfies [number, number, number],
        [width * 0.44, 3.08, front + 0.075] satisfies [number, number, number],
        [width * 0.44, 3.38, front + 0.075] satisfies [number, number, number],
        [-width * 0.44, 3.38, front + 0.075] satisfies [number, number, number],
        '#eee1ba',
        uv,
      );
    for (const x of [-1.17, 1.17] satisfies [number, number]) {
      m.rod(
        [x, 1.4, front + 0.04] satisfies [number, number, number],
        [x, 1.6, front + 0.16] satisfies [number, number, number],
        0.018,
        '#8c815d',
        8,
      );
      m.sphere(x, 1.69, front + 0.16, 0.055, 0.1, 0.055, '#e8dcb3', 12, 8, { emissive: 0.28 });
    }
  }
}

/** The capital partners retain their formal country-house frontage. Residential
 * estates use independent massing, materials and gardens for each style. */
export function drawEstateArchitecture(
  m: Mesh,
  options: Parameters<typeof planEstate>[0] & { capital?: boolean },
  signs: SignAtlas | null = null,
  title: string | null = null,
) {
  if (options.capital) return drawCapitalEstate(m, options, signs, title);
  const plan = planEstate(options);
  drawEstateGarden(m, plan);
  drawEstateHome(m, plan);
  return plan;
}

function drawGardenFooting(m: Mesh, plot: Readonly<Parcel>, base: number, terrain: ParcelTerrain) {
  const w = plot.w - 0.08,
    d = plot.d - 0.08,
    corners = [
      [-w / 2, -d / 2] satisfies [number, number],
      [w / 2, -d / 2] satisfies [number, number],
      [w / 2, d / 2] satisfies [number, number],
      [-w / 2, d / 2] satisfies [number, number],
    ];
  for (let side = 0; side < 4; side++) {
    const a = corners[side],
      b = corners[(side + 1) % 4],
      steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4);
    for (let i = 0; i < steps; i++) {
      const at = (t: number) => {
        const x = a[0] + (b[0] - a[0]) * t,
          z = a[1] + (b[1] - a[1]) * t,
          [wx, wz] = estatePoint(plot, x, z);
        return [x, Math.min(-0.03, terrain.height(wx, wz) - base - 0.025), z] satisfies [
          number,
          number,
          number,
        ];
      };
      const p = at(i / steps),
        q = at((i + 1) / steps);
      m.quad(
        p,
        q,
        [q[0], -0.025, q[2]] satisfies [number, number, number],
        [p[0], -0.025, p[2]] satisfies [number, number, number],
        '#bdb9a3',
        'boardConcrete',
      );
    }
  }
}

export function makeEstateHouse(m: Mesh, plot: Readonly<Parcel>, terrain: ParcelTerrain) {
  const start = m.data.length,
    base = terrain.height(plot.x, plot.z) + 0.04;
  const plan = planEstate({ ...plot, style: estateStyleFor(plot) });
  terrain.cutPlot({
    cx: plot.x,
    cz: plot.z,
    w: plot.w - 0.05,
    d: plot.d - 0.05,
    angle: plot.rotation,
    height: base - 0.04,
    onlyLower: true,
  });
  pose(m, plot.x, base, plot.z, plot.rotation || 0, () => {
    drawGardenFooting(m, plot, base, terrain);
    drawEstateGarden(m, plan);
    drawEstateHome(m, plan);
  });
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  const footprint = estateRectangle(plot, { x: -plot.w / 2, z: -plot.d / 2, w: plot.w, d: plot.d });
  const navigationPolygons = [estateRectangle(plot, plan.house)];
  if (plan.pool)
    navigationPolygons.push(
      estateRectangle(plot, {
        ...plan.pool,
        x: plan.pool.x - 0.1,
        z: plan.pool.z - 0.1,
        w: plan.pool.w + 0.2,
        d: plan.pool.d + 0.2,
      }),
    );
  const pool = plan.pool
    ? {
        ...plan.pool,
        center: estatePoint(plot, plan.pool.x + plan.pool.w / 2, plan.pool.z + plan.pool.d / 2),
        base: base + plan.pool.water,
      }
    : null;
  return {
    mesh: m,
    start: start / 11,
    count: (m.data.length - start) / 11,
    lo,
    hi,
    x: plot.x - plot.w / 2,
    y: plot.z - plot.d / 2,
    w: plot.w,
    d: plot.d,
    rotation: plot.rotation,
    base,
    arch: 'mansion',
    estateStyle: plan.style,
    plan,
    plot,
    pool,
    footprint,
    navigationPolygons,
    solid: true,
    preserveGround: true,
    homes: 1,
    storeys: plan.storeys,
    houses: [{ door: plan.entry.x - 0.32, dw: 0.64, entry: plot.d / 2 }],
  };
}
