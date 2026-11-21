import type { ModelContext, RegisterObject, SashWindow } from './types/model-context.ts';
import { requiredValue } from './types/assert.ts';
type HousePoint = (u: number, v: number) => [number, number];
interface HousePlanOptions {
  left: number;
  width: number;
  depth: number;
  point: HousePoint;
  naturalHeight: (x: number, z: number) => number;
  groundHeight?: (x: number, z: number) => number;
  seed: number;
}
type HousingPlan = ReturnType<typeof planHouse> & {
  color: string;
  roof: string;
  hasLift: boolean;
  frontRise: number;
};
import { SOUTHERN_PALETTES } from './neighborhood-palette.ts';
import { drawSouthernHouseDetails } from './southern-house-details.ts';
import type { Mesh } from './geometry.ts';
import { rand, tint, pose } from './geometry.ts';
import { marketSide } from './downtown.ts';
import { windowAppearance } from './materials.ts';
import { drawFacadeWindow } from './windows.ts';
import { drawCommercialRoof } from './rooftops.ts';
import type { Color } from './types/geometry.ts';

export const HOUSE_COLORS = Object.freeze([
  '#69ac9a',
  '#db8b7a',
  '#e7c46d',
  '#73a9c8',
  '#b099c7',
  '#9ab878',
  '#dda378',
  '#82bcae',
  '#8198c5',
  '#d38fa5',
  '#ead5a2',
  '#c79170',
] satisfies [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
]);
export function varyHousePaint(hex: string, seed: number) {
  const values = ([1, 3, 5] satisfies [number, number, number]).map(
      (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
    ),
    gray = values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  const saturation = 0.55 + rand(seed, 17, 36) * 1.05,
    light = (rand(seed, 31, 9) - 0.5) * 0.055;
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
export const ROOF_STYLES = Object.freeze(['gable', 'hip', 'mansard', 'flat'] satisfies [
  string,
  string,
  string,
  string,
]);

/** Door height follows the public street, rather than the uphill back corner. */
export function planHouse({
  left,
  width,
  depth,
  point,
  naturalHeight,
  groundHeight = naturalHeight,
  seed,
}: HousePlanOptions) {
  const face = depth / 2 - Math.min(0.55, depth * 0.25),
    entry = depth / 2 - 0.28,
    door = left + width * 0.1,
    dw = Math.min(0.35, width * 0.25);
  const entryHeight = groundHeight(...point(door + dw / 2, entry)),
    floor = entryHeight + 0.24;
  const fullBack = -depth / 2 + 0.08,
    available = face - fullBack;
  const grade =
    (naturalHeight(...point(left + width / 2, fullBack)) -
      naturalHeight(...point(left + width / 2, face))) /
    Math.max(0.5, available);
  let back = Math.max(fullBack, face - Math.max(0.95, 1.25 / (Math.abs(grade) + 0.2)));
  // Shorten the downhill body before resorting to a tall retaining skirt.
  while (
    face - back > 1 &&
    floor -
      Math.min(...[left + 0.05, left + width - 0.05].map((u) => naturalHeight(...point(u, back)))) >
      1.35
  )
    back += 0.1;
  const foundationExposure =
    floor -
    Math.min(
      ...[left + 0.05, left + width - 0.05].flatMap((u) =>
        ([face, back] satisfies [number, number]).map((v) => naturalHeight(...point(u, v))),
      ),
    );
  const oneStorey = seed < 0.09,
    storeys = oneStorey ? 1 : 2,
    H = (oneStorey ? 1.48 : 2.42) + (seed % 0.17);
  return {
    left,
    width,
    face,
    entry,
    door,
    dw,
    entryHeight,
    floor,
    fullBack,
    back,
    grade,
    foundationExposure,
    H,
    storeys,
    roof: ROOF_STYLES[Math.min(3, Math.floor(seed * 4))],
  };
}

/** Sunset rowhouses have two lived-in floors, broad bays and distinct roofs. */
export function sunsetHouseProfile(seed: number) {
  return {
    storeys: 2,
    H: 3.08 + seed * 0.35,
    roof: seed < 0.26 ? 'flat' : seed < 0.56 ? 'gable' : seed < 0.82 ? 'hip' : 'mansard',
  };
}

/** Housing meshes and private hillside details. All geometry stays in the
 * curb-aligned plot; terrain and public navigation remain owned by the world. */
export function createHousing({
  MAP_SCALE = 1.5,
  terrainHeight,
  naturalHeight,
  cutHousePlot,
  getSceneMesh,
  registerObject,
  rectangle,
  sashWindow,
}: Omit<
  Pick<
    ModelContext,
    'MAP_SCALE' | 'terrainHeight' | 'naturalHeight' | 'cutHousePlot' | 'getSceneMesh' | 'rectangle'
  >,
  'MAP_SCALE'
> & { MAP_SCALE?: number; registerObject: RegisterObject; sashWindow: SashWindow }) {
  const lifts: { points: number[][]; angle: number; seed: number; color: string }[] = [],
    housingDetails: HousingPlan[] = [];
  const trim = '#dcd9ca';
  function bay(
    m: Mesh,
    cx: number,
    y: number,
    z: number,
    w: number,
    h: number,
    panel: string,
    seed = 0,
    projection = 0.16,
  ) {
    const glazing = windowAppearance(cx, y, z, seed);
    const outline = [
      [cx - w / 2, z] satisfies [number, number],
      [cx - w * 0.32, z + projection] satisfies [number, number],
      [cx + w * 0.32, z + projection] satisfies [number, number],
      [cx + w / 2, z] satisfies [number, number],
    ];
    for (let i = 0; i < 3; i++) {
      const a = outline[i],
        b = outline[i + 1],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        at = (t: number, yy: number, offset = 0) =>
          [
            a[0] + (b[0] - a[0]) * t - ((b[1] - a[1]) / len) * offset,
            yy,
            a[1] + (b[1] - a[1]) * t + ((b[0] - a[0]) / len) * offset,
          ] satisfies [number, number, number];
      m.quad(
        at(0, y - 0.07),
        at(1, y - 0.07),
        at(1, y + h + 0.07),
        at(0, y + h + 0.07),
        panel,
        'clapboard',
      );
      m.quad(
        at(0.1, y, 0.022),
        at(0.9, y, 0.022),
        at(0.9, y + h, 0.022),
        at(0.1, y + h, 0.022),
        glazing.color,
        glazing.material,
      );
      for (const t of [0.04, 0.96] satisfies [number, number])
        m.rod(at(t, y - 0.02, 0.045), at(t, y + h + 0.02, 0.045), 0.016, trim, 4);
      for (const yy of [y - 0.03, y + h * 0.5, y + h + 0.03] satisfies [number, number, number])
        m.rod(at(0.03, yy, 0.045), at(0.97, yy, 0.045), 0.016, trim, 4);
      m.rod(at(0, y - 0.08), at(1, y - 0.08), 0.025, trim, 4);
    }
  }
  function roof(
    m: Mesh,
    style: string,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    seed: number,
    color: string,
    kind: (string | undefined) | null = null,
    roofPlans: ReturnType<typeof drawCommercialRoof>[] | null = null,
  ) {
    const rise = 0.32 + seed * 0.14,
      material = style === 'hip' && seed > 0.55 ? 'roofTile' : 'shingles',
      glazing = windowAppearance(x + w * 0.5, y + 0.2, z + d, seed);
    const roofColor = varyHousePaint(
      style === 'hip' && seed > 0.55
        ? '#ba7252'
        : (['#637e84', '#7e6a7e', '#5f7b68', '#96765f'] satisfies [string, string, string, string])[
            Math.floor(seed * 4) % 4
          ],
      seed * 173 + x * 7 + z * 0.13,
    );
    m.box(x - 0.025, y - 0.035, z - 0.025, w + 0.05, 0.04, d + 0.05, trim);
    let detailedRoof: ReturnType<typeof drawCommercialRoof> | null = null;
    if (style === 'flat' && kind === 'deco') {
      detailedRoof = drawCommercialRoof(m, {
        x: x + 0.025,
        y: y + 0.035,
        z: z + 0.025,
        w: w - 0.05,
        d: d - 0.05,
        seed: seed * 31 + x * 0.73 + z * 0.27,
      });
      roofPlans?.push(detailedRoof);
    } else if (style === 'flat') {
      m.box(
        x + 0.035,
        y + 0.035,
        z + 0.035,
        w - 0.07,
        0.035,
        d - 0.07,
        varyHousePaint('#828777', seed * 131 + x * 9 + z),
        'roof',
      );
      for (const xx of [x, x + w - 0.035] satisfies [number, number])
        m.box(xx, y + 0.055, z, 0.035, 0.13, d, trim);
      m.box(x - 0.02, y + 0.04, z + d - 0.02, w + 0.04, 0.16, 0.075, trim);
      m.box(x + w * 0.27, y + 0.08, z + d * 0.34, w * 0.42, 0.12, 0.35, '#d5cdb3');
      m.box(
        x + w * 0.3,
        y + 0.205,
        z + d * 0.36,
        w * 0.36,
        0.025,
        0.3,
        glazing.color,
        glazing.material,
      );
      if (seed > 0.8) {
        m.box(x + 0.11, y + 0.08, z + 0.15, w * 0.45, 0.15, 0.24, '#b16e48', 'wood');
        for (let i = 0; i < 3; i++)
          m.sphere(x + 0.18 + i * 0.12, y + 0.27, z + 0.25, 0.1, 0.1, 0.08, '#75944a', 6, 3);
      }
    } else if (style === 'gable') {
      const a = [x - 0.025, y, z - 0.025] satisfies [number, number, number],
        b = [x + w + 0.025, y, z - 0.025] satisfies [number, number, number],
        c = [x + w + 0.025, y, z + d + 0.025] satisfies [number, number, number],
        e = [x - 0.025, y, z + d + 0.025] satisfies [number, number, number],
        p = [x + w / 2, y + rise, z - 0.025] satisfies [number, number, number],
        q = [x + w / 2, y + rise, z + d + 0.025] satisfies [number, number, number];
      m.quad(a, e, q, p, roofColor, material);
      m.quad(p, q, c, b, tint(roofColor, -8), material);
      m.tri(
        e,
        c,
        q,
        tint(color, 8),
        kind === 'coastal' || kind === 'craftsman' ? 'fishscale' : 'clapboard',
      );
      m.tri(b, a, p, color, 'clapboard');
      for (const edge of [e, c]) m.rod(edge, q, 0.028, trim, 4);
      m.rod(p, q, 0.025, tint(roofColor, 15), 4);
      m.sphere(
        x + w / 2,
        y + rise * 0.42,
        z + d + 0.035,
        0.085,
        0.09,
        0.018,
        glazing.color,
        8,
        4,
        glazing.material,
      );
      for (const dx of [-0.09, 0.09] satisfies [number, number])
        m.rod(
          [x + w / 2 + dx, y + rise * 0.42, z + d + 0.055] satisfies [number, number, number],
          [x + w / 2, y + rise * 0.72, z + d + 0.055] satisfies [number, number, number],
          0.012,
          trim,
          4,
        );
    } else if (style === 'hip') {
      const a = [x - 0.025, y, z - 0.025] satisfies [number, number, number],
        b = [x + w + 0.025, y, z - 0.025] satisfies [number, number, number],
        c = [x + w + 0.025, y, z + d + 0.025] satisfies [number, number, number],
        e = [x - 0.025, y, z + d + 0.025] satisfies [number, number, number],
        p = [x + w / 2, y + rise, z + d * 0.27] satisfies [number, number, number],
        q = [x + w / 2, y + rise, z + d * 0.73] satisfies [number, number, number];
      m.tri(a, p, b, roofColor, material);
      m.tri(e, c, q, tint(roofColor, 8), material);
      m.quad(a, e, q, p, roofColor, material);
      m.quad(p, q, c, b, tint(roofColor, -8), material);
      m.rod(p, q, 0.026, tint(roofColor, 15), 4);
      if (d > 1.3) {
        m.box(x + w * 0.32, y + 0.05, z + d - 0.26, w * 0.36, 0.27, 0.22, color, 'stucco');
        m.box(
          x + w * 0.38,
          y + 0.12,
          z + d - 0.025,
          w * 0.24,
          0.16,
          0.018,
          glazing.color,
          glazing.material,
        );
      }
    } else {
      const inset = Math.min(0.19, w * 0.17),
        top = y + 0.57;
      const bottom = [
          [x, y, z] satisfies [number, number, number],
          [x + w, y, z] satisfies [number, number, number],
          [x + w, y, z + d] satisfies [number, number, number],
          [x, y, z + d] satisfies [number, number, number],
        ],
        upper = [
          [x + inset, top, z + inset] satisfies [number, number, number],
          [x + w - inset, top, z + inset] satisfies [number, number, number],
          [x + w - inset, top, z + d - inset] satisfies [number, number, number],
          [x + inset, top, z + d - inset] satisfies [number, number, number],
        ];
      for (let i = 0; i < 4; i++)
        m.quad(bottom[i], bottom[(i + 1) % 4], upper[(i + 1) % 4], upper[i], roofColor, 'shingles');
      m.box(
        x + inset - 0.02,
        top,
        z + inset - 0.02,
        w - inset * 2 + 0.04,
        0.035,
        d - inset * 2 + 0.04,
        trim,
      );
      m.box(
        x + inset + 0.025,
        top + 0.036,
        z + inset + 0.025,
        w - inset * 2 - 0.05,
        0.015,
        d - inset * 2 - 0.05,
        roofColor,
        'roof',
      );
      m.box(x + w * 0.31, y + 0.15, z + d - 0.16, w * 0.38, 0.3, 0.17, tint(color, 6), 'clapboard');
      m.box(
        x + w * 0.37,
        y + 0.2,
        z + d + 0.015,
        w * 0.26,
        0.19,
        0.018,
        glazing.color,
        glazing.material,
      );
      m.box(x + w * 0.28, y + 0.45, z + d - 0.18, w * 0.44, 0.045, 0.24, trim);
    }
    // Gutters, a downpipe and a capped chimney finish the roof silhouette.
    m.rod(
      [x, y - 0.03, z + d + 0.035] satisfies [number, number, number],
      [x + w, y - 0.03, z + d + 0.035] satisfies [number, number, number],
      0.018,
      '#c5c6b3',
      5,
    );
    m.rod(
      [x + w - 0.035, y - 0.05, z + d + 0.035] satisfies [number, number, number],
      [x + w - 0.035, y - 1.4, z + d + 0.035] satisfies [number, number, number],
      0.013,
      '#929f91',
      5,
    );
    const chimneyY = y + (style === 'flat' ? 0.1 : 0.25);
    m.box(x + w * 0.16, chimneyY, z + 0.16, 0.14, 0.28, 0.19, '#bd8166', 'brick');
    m.box(x + w * 0.15, chimneyY + 0.28, z + 0.15, 0.16, 0.05, 0.21, '#ddd0b3', 'stone');
    return detailedRoof ? detailedRoof.height + 0.08 : style === 'flat' ? 0.3 : rise + 0.22;
  }
  // One skirt ends exactly at the body's lower edge. A foundation box and
  // retaining overlays used to duplicate these planes with other materials.
  function groundSkirt(
    m: Mesh,
    left: number,
    back: number,
    w: number,
    d: number,
    top: number,
    point: HousePoint,
    colors: Color | Color[],
  ) {
    const right = left + w,
      face = back + d,
      edges = [
        [[left, face] satisfies [number, number], [right, face] satisfies [number, number]],
        [[left, back] satisfies [number, number], [left, face] satisfies [number, number]],
        [[right, face] satisfies [number, number], [right, back] satisfies [number, number]],
        [[right, back] satisfies [number, number], [left, back] satisfies [number, number]],
      ];
    for (const [side, [a, b]] of edges.entries()) {
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.3));
      for (let i = 0; i < steps; i++) {
        const at = (t: number) =>
            [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] satisfies [number, number],
          p = at(i / steps),
          q = at((i + 1) / steps);
        const bottom = (p: [number, number]) =>
          Math.min(naturalHeight(...point(...p)), terrainHeight(...point(...p)), top - 0.08) - 0.08;
        m.quad(
          [p[0], bottom(p), p[1]] satisfies [number, number, number],
          [q[0], bottom(q), q[1]] satisfies [number, number, number],
          [q[0], top, q[1]] satisfies [number, number, number],
          [p[0], top, p[1]] satisfies [number, number, number],
          Array.isArray(colors) ? colors[side] : colors,
          'stucco',
        );
      }
    }
  }
  function basementGarage(
    m: Mesh,
    left: number,
    width: number,
    plane: number,
    floor: number,
    point: HousePoint,
    far = false,
  ) {
    const w = width * 0.55,
      x = left + (far ? 0.2 : 0.41) * width,
      center = x + w / 2,
      ground =
        Math.max(naturalHeight(...point(center, plane)), terrainHeight(...point(center, plane))) +
        0.04,
      top = floor - 0.08,
      h = Math.min(1.35, top - ground);
    if (h < 0.62) return;
    const bottom = top - h,
      z = plane + (far ? -0.058 : 0.058),
      trim = '#b7b6a4';
    const panel = (xx: number, yy: number, ww: number, hh: number, col: string) => {
      const points = [
        [xx, yy, z] satisfies [number, number, number],
        [xx + ww, yy, z] satisfies [number, number, number],
        [xx + ww, yy + hh, z] satisfies [number, number, number],
        [xx, yy + hh, z] satisfies [number, number, number],
      ];
      if (far) points.reverse();
      m.quad(points[0], points[1], points[2], points[3], col);
    };
    panel(x - 0.025, bottom - 0.02, w + 0.05, h + 0.045, trim);
    // Recessed horizontal garage panels sit in front of the single skirt.
    for (let j = 0; j < 6; j++) {
      const yy = bottom + 0.025 + (j * (h - 0.05)) / 6,
        zz = z + (far ? -0.008 : 0.008),
        points = [
          [x + 0.02, yy, zz] satisfies [number, number, number],
          [x + w - 0.02, yy, zz] satisfies [number, number, number],
          [x + w - 0.02, yy + (h - 0.05) / 6 - 0.012, zz] satisfies [number, number, number],
          [x + 0.02, yy + (h - 0.05) / 6 - 0.012, zz] satisfies [number, number, number],
        ];
      if (far) points.reverse();
      m.quad(points[0], points[1], points[2], points[3], j % 2 ? '#697e7d' : '#718684');
    }
  }
  function gardenStair(
    m: Mesh,
    u: number,
    from: number,
    to: number,
    w: number,
    point: HousePoint,
    angle: number,
    startHeight: number,
  ) {
    const h0 = startHeight,
      h1 = naturalHeight(...point(u, to)),
      steps = Math.max(4, Math.ceil(Math.abs(h1 - h0) / 0.13)),
      run = (to - from) / steps;
    let previous = null;
    for (let i = 0; i < steps; i++) {
      const z = from + run * (i + 0.5),
        h = h0 + ((h1 - h0) * (i + 0.5)) / steps + 0.045,
        center = point(u, z),
        bottom = Math.min(h - 0.14, naturalHeight(...center) - 0.04);
      cutHousePlot({
        cx: center[0],
        cz: center[1],
        w,
        d: Math.abs(run) + 0.01,
        angle,
        height: h - 0.14,
        onlyLower: true,
      });
      m.box(
        u - w / 2,
        bottom,
        Math.min(z - run / 2, z + run / 2),
        w,
        h - bottom,
        Math.abs(run) + 0.012,
        '#d4c9a8',
        'stone',
      );
      const rail = [u + w * 0.48, h + 0.58, z];
      if (previous) m.rod(previous, rail, 0.014, '#476b60', 4);
      if (i % 3 === 0) m.rod([rail[0], h, z], rail, 0.013, '#476b60', 4);
      previous = rail;
    }
  }
  function gardenLift(
    m: Mesh,
    u: number,
    from: number,
    to: number,
    point: HousePoint,
    angle: number,
    seed: number,
    startHeight: number,
  ) {
    const points = [],
      h0 = startHeight + 0.13,
      h1 = naturalHeight(...point(u, to)) + 0.13;
    for (let i = 0; i <= 12; i++) {
      const z = from + ((to - from) * i) / 12,
        h = h0 + ((h1 - h0) * i) / 12,
        position = point(u, z);
      points.push([position[0], h, position[1]]);
      cutHousePlot({
        cx: position[0],
        cz: position[1],
        w: 0.48,
        d: Math.abs(to - from) / 12 + 0.02,
        angle,
        height: h - 0.12,
        onlyLower: true,
      });
      m.box(u - 0.25, h - 0.055, z - 0.035, 0.5, 0.045, 0.07, '#967552', 'wood');
      if (i % 3 === 0) {
        const ground = naturalHeight(...position);
        for (const side of [-0.18, 0.18] satisfies [number, number])
          m.rod(
            [u + side, Math.min(ground, h) - 0.04, z] satisfies [number, number, number],
            [u + side, h, z] satisfies [number, number, number],
            0.023,
            '#8b7656',
            5,
          );
      }
      if (i) {
        const last = from + ((to - from) * (i - 1)) / 12,
          previous = h0 + ((h1 - h0) * (i - 1)) / 12;
        for (const side of [-0.19, 0.19] satisfies [number, number])
          m.rod(
            [u + side, previous, last] satisfies [number, number, number],
            [u + side, h, z] satisfies [number, number, number],
            0.022,
            '#7a8e8b',
            5,
          );
        m.rod(
          [u, previous + 0.015, last] satisfies [number, number, number],
          [u, h + 0.015, z] satisfies [number, number, number],
          0.008,
          '#4f6965',
          4,
        );
      }
    }
    for (const [z, h] of [
      [from, h0 - 0.13] satisfies [number, number],
      [to, h1 - 0.13] satisfies [number, number],
    ]) {
      m.box(u - 0.29, h, z - 0.08, 0.58, 0.16, 0.16, '#a68461', 'stone');
      m.rod(
        [u - 0.28, h + 0.2, z] satisfies [number, number, number],
        [u + 0.28, h + 0.2, z] satisfies [number, number, number],
        0.025,
        '#d8bb7b',
        5,
      );
    }
    lifts.push({ points, angle, seed, color: seed > 0.5 ? '#d48942' : '#4eaa98' });
  }
  function district(x: number, z: number) {
    // Telegraph Hill keeps narrow Victorian frontages around Coit Tower.
    if (x > 41.5 && x < 53 && z > 8 && z < 17.3) return 'telegraph';
    if (x > 46 && z < 29) return 'downtown';
    if (x > 42 && z < 43 && marketSide(x, z) > 1) return 'soma';
    if (x > 46 && z >= 35 && z < 55) return 'warehouse';
    if (x < 31.5) return 'west';
    if (x > 33 && z > 40) return 'mission';
    return 'victorian';
  }
  function urbanBlock(
    x: number,
    z: number,
    w: number,
    d: number,
    front: number,
    seed: number,
    angle: number,
    kind: string,
  ) {
    const m = getSceneMesh(),
      start = m.data.length,
      cx = x + w / 2,
      cz = z + d / 2,
      point = (u: number, v: number) =>
        [
          cx + u * Math.cos(angle) - v * Math.sin(angle),
          cz + u * Math.sin(angle) + v * Math.cos(angle),
        ] satisfies [number, number];
    const floor = naturalHeight(...point(0, d / 2 - 0.15)) + 0.13,
      storeys =
        kind === 'downtown'
          ? 4 + Math.floor(seed * 2)
          : kind === 'mission'
            ? seed > 0.87
              ? 1
              : 2
            : 2 + Math.floor(seed * 2),
      H = 1.5 + (storeys - 1) * 1.05;
    const back = -d / 2 + 0.08,
      face = d / 2 - 0.28,
      ww = w - 0.08,
      dd = face - back,
      material = kind === 'soma' && seed > 0.55 ? 'concrete' : 'brick',
      color = (
        material === 'brick'
          ? (['#a0826c', '#a78e75', '#907a6b', '#b39c7d'] satisfies [
              string,
              string,
              string,
              string,
            ])
          : (['#b3b9b0', '#a3ada7', '#bdbbb0', '#9eaaa7'] satisfies [
              string,
              string,
              string,
              string,
            ])
      )[Math.floor(seed * 4)];
    const center = point(0, (face + back) / 2);
    cutHousePlot({
      cx: center[0],
      cz: center[1],
      w: ww,
      d: dd,
      angle,
      height: floor - 0.03,
      onlyLower: true,
    });
    let roofDetails;
    pose(m, cx, 0, cz, angle, () => {
      m.box(-ww / 2, floor - 0.08, back, ww, H + 0.08, dd, color, material);
      groundSkirt(m, -ww / 2, back, ww, dd, floor - 0.08, point, color);
      const columns = Math.max(3, Math.round(ww / 0.68)),
        gap = ww / columns;
      for (let level = 0; level < storeys; level++)
        for (let column = 0; column < columns; column++) {
          const u = -ww / 2 + (column + 0.5) * gap,
            yy = floor + (level ? 1.5 + (level - 1) * 1.05 : 0.15),
            windowW = gap * 0.61,
            windowH = level ? 0.72 : 1.12;
          for (const side of [-1, 1] satisfies [number, number]) {
            const plane = side < 0 ? back : face;
            drawFacadeWindow(m, {
              plane,
              along: u - windowW / 2,
              y: yy,
              w: windowW,
              h: windowH,
              far: side < 0,
              trim: material === 'brick' ? '#c6c5b6' : '#c5ccc1',
              seed: seed * 97 + column + level * 13 + side * 5,
              style: level ? (kind === 'warehouse' ? 'industrial' : 'office') : 'storefront',
            });
          }
        }
      for (let level = 1; level < storeys; level++)
        for (const side of [-1, 1] satisfies [number, number])
          m.box(
            -ww / 2,
            floor + 1.34 + (level - 1) * 1.05,
            side < 0 ? back - 0.045 : face,
            ww,
            0.055,
            0.045,
            '#bdbfae',
            'stone',
          );
      if (kind === 'soma' || kind === 'mission') {
        const awning = (
          ['#548e83', '#a86c61', '#687ca0', '#b38c4c'] satisfies [string, string, string, string]
        )[Math.floor(seed * 4) % 4];
        for (let stripe = 0; stripe < 10; stripe++) {
          const x = -ww * 0.43 + stripe * ww * 0.086;
          m.quad(
            [x, floor + 1.32, face + 0.015],
            [x + ww * 0.086, floor + 1.32, face + 0.015],
            [x + ww * 0.086, floor + 1.17, face + 0.255],
            [x, floor + 1.17, face + 0.255],
            stripe % 2 ? awning : '#e2d8b7',
          );
          m.box(
            x,
            floor + 1.09,
            face + 0.252,
            ww * 0.086,
            0.08,
            0.02,
            stripe % 2 ? awning : '#e2d8b7',
          );
        }
        m.box(-0.19, floor + 0.03, face + 0.035, 0.38, 1.03, 0.03, '#3c6665', 'glass');
        m.rod(
          [0.13, floor + 0.42, face + 0.08],
          [0.13, floor + 0.65, face + 0.08],
          0.012,
          '#d4b67b',
          6,
        );
      }
      // Piers and corner masonry establish complete bays on every face.
      for (const side of [-1, 1] satisfies [number, number])
        for (let column = 0; column <= columns; column += 2) {
          const u = Math.min(ww / 2 - 0.045, -ww / 2 + column * gap);
          m.box(
            u,
            floor + 1.42,
            side < 0 ? back - 0.035 : face,
            0.045,
            H - 1.47,
            0.035,
            tint(color, 12),
            material,
          );
        }
      const sideCount = Math.max(2, Math.floor(dd / 0.72)),
        sideGap = dd / sideCount;
      for (const side of [-1, 1] satisfies [number, number])
        for (let level = 0; level < storeys; level++)
          for (let j = 0; j < sideCount; j++) {
            const width = Math.min(0.42, sideGap * 0.57);
            drawFacadeWindow(m, {
              isX: true,
              plane: (side * ww) / 2,
              along: back + (j + 0.5) * sideGap - width / 2,
              y: floor + (level ? 1.5 + (level - 1) * 1.05 : 0.15),
              w: width,
              h: level ? 0.72 : 1.12,
              far: side < 0,
              trim: '#c5c6b7',
              seed: seed * 113 + j + level * 13 + side * 5,
              style: level ? (kind === 'warehouse' ? 'industrial' : 'office') : 'storefront',
            });
          }
      m.box(-ww / 2 - 0.015, floor + H, back - 0.015, ww + 0.03, 0.07, dd + 0.03, '#bfc1b1');
      roofDetails = drawCommercialRoof(m, {
        x: -ww / 2 + 0.03,
        y: floor + H + 0.07,
        z: back + 0.03,
        w: ww - 0.06,
        d: dd - 0.06,
        seed: seed + cx * 0.271 + cz * 0.137,
      });
      if (seed > 0.6) {
        m.box(-ww * 0.28, floor + 1.35, face + 0.025, ww * 0.56, 0.06, 0.28, '#7c8875', 'wood');
        for (const u of [-ww * 0.26, ww * 0.26] satisfies [number, number])
          m.rod(
            [u, floor + 0.03, face + 0.22],
            [u, floor + 1.35, face + 0.22],
            0.018,
            '#5d7169',
            6,
          );
      }
    });
    return registerObject(m, start, {
      x,
      y: z,
      w,
      d,
      h:
        H +
        0.1 +
        requiredValue<ReturnType<typeof drawCommercialRoof>>(
          roofDetails,
          'The house roof was not prepared',
        ).height,
      base: floor - 0.08,
      arch: 'urbanBlock',
      rotation: angle,
      footprint: rectangle(cx, cz, w, d, angle),
      homes: 0,
      storeys,
      district: kind,
      roofDetails,
    });
  }
  function makeTownhomeRow(
    x: number,
    z: number,
    w: number,
    d: number,
    front: number,
    seed: number,
    rotation: number | null = null,
    districtOverride: string | null = null,
  ) {
    const m = getSceneMesh(),
      start = m.data.length,
      angle =
        rotation ??
        ([Math.PI, -Math.PI / 2, 0, Math.PI / 2] satisfies [number, number, number, number])[front],
      cx = x + w / 2,
      cz = z + d / 2;
    const kind = districtOverride || district(cx / MAP_SCALE, cz / MAP_SCALE);
    if (
      w >= 2.9 &&
      ((['downtown', 'soma', 'warehouse'] satisfies [string, string, string]).includes(kind) ||
        (kind === 'mission' && w > 4.2 && seed > 0.6))
    )
      return urbanBlock(x, z, w, d, front, seed, angle, kind);
    const frontage = front % 2 ? d : w,
      depth = front % 2 ? w : d,
      homes = Math.max(1, Math.round((frontage - 0.08) / (kind === 'telegraph' ? 1.05 : 1.45))),
      unit = (frontage - 0.08) / homes;
    const point = (u: number, v: number) =>
      [
        cx + u * Math.cos(angle) - v * Math.sin(angle),
        cz + u * Math.sin(angle) + v * Math.cos(angle),
      ] satisfies [number, number];
    const plans: HousingPlan[] = [],
      roofPlans: ReturnType<typeof drawCommercialRoof>[] = [];
    let high = -Infinity,
      low = Infinity;
    pose(m, cx, 0, cz, angle, () => {
      for (let home = 0; home < homes; home++) {
        const shape = rand(x + home * 0.73, z, 71),
          p = planHouse({
            left: -frontage / 2 + 0.04 + home * unit,
            width: unit - 0.025,
            depth,
            point,
            naturalHeight,
            groundHeight: terrainHeight,
            seed: shape,
          });
        if (kind === 'west') Object.assign(p, sunsetHouseProfile(shape));
        if (kind === 'mission' && p.storeys === 2) p.H = 2.27 + shape * 0.1;
        if (SOUTHERN_PALETTES[kind as keyof typeof SOUTHERN_PALETTES])
          Object.assign(p, {
            H:
              kind === 'deco'
                ? 2.85 + shape * 0.18
                : kind === 'craftsman'
                  ? 2.3 + shape * 0.2
                  : 2.5 + shape * 0.25,
            storeys: 2,
            roof:
              kind === 'deco'
                ? 'flat'
                : kind === 'mediterranean'
                  ? 'hip'
                  : kind === 'craftsman'
                    ? 'gable'
                    : shape < 0.5
                      ? 'gable'
                      : shape < 0.8
                        ? 'hip'
                        : 'mansard',
          });
        if (kind === 'bayview')
          Object.assign(p, {
            H: 3.75 + shape * 0.25,
            storeys: 3,
            roof: shape > 0.55 ? 'mansard' : 'gable',
          });
        if (kind === 'telegraph')
          Object.assign(p, {
            H: 1.65 + shape * 0.14,
            storeys: 1,
            roof: shape < 0.6 ? 'gable' : 'hip',
          });
        if (p.foundationExposure > 1.45 && kind !== 'telegraph')
          Object.assign(p, { H: 1.65 + shape * 0.15, storeys: 1 });
        if (kind === 'mission' || kind === 'soma' || kind === 'downtown')
          p.roof = shape < 0.8 ? 'flat' : 'hip';
        const { left, width: ww, face, entry, door, dw, floor, H, storeys } = p;
        const hasLift =
          home === homes - 1 &&
          depth > 2.8 &&
          Math.abs(p.grade) > 0.32 &&
          shape > 0.48 &&
          lifts.length < 6;
        if (hasLift) p.back = Math.max(p.fullBack + 1.25, face - 1.05);
        const back = p.back,
          dd = face - back,
          palette =
            SOUTHERN_PALETTES[kind as keyof typeof SOUTHERN_PALETTES] ||
            (kind === 'telegraph'
              ? (['#9bbfaf', '#dca6b3', '#b4acd1', '#e7c78f', '#91b7d0'] satisfies [
                  string,
                  string,
                  string,
                  string,
                  string,
                ])
              : kind === 'west'
                ? ([
                    '#8cbcc1',
                    '#d2a18a',
                    '#b6bc88',
                    '#d8ba7d',
                    '#a6b6cf',
                    '#c5a6bd',
                    '#89b7a6',
                    '#d5b69b',
                  ] satisfies [string, string, string, string, string, string, string, string])
                : kind === 'mission'
                  ? (['#bda58e', '#a9b6a0', '#c0ad91', '#ad9d8f', '#9eada8'] satisfies [
                      string,
                      string,
                      string,
                      string,
                      string,
                    ])
                  : HOUSE_COLORS),
          color = varyHousePaint(
            tint(
              palette[
                (Math.floor(seed * palette.length) +
                  (kind === 'west' || kind === 'telegraph' ? home : Math.floor(home / 2))) %
                  palette.length
              ],
              Math.floor(shape * 12) - 6,
            ),
            shape * 107 + seed,
          ),
          panel = SOUTHERN_PALETTES[kind as keyof typeof SOUTHERN_PALETTES]
            ? kind === 'craftsman'
              ? 'cedar'
              : kind === 'coastal'
                ? 'clapboard'
                : 'limewash'
            : kind === 'west' || kind === 'mission'
              ? 'stucco'
              : shape > 0.5
                ? 'clapboard'
                : 'stucco',
          roofStyle = p.roof;
        const center = point(left + ww / 2, (back + face) / 2);
        cutHousePlot({
          cx: center[0],
          cz: center[1],
          w: ww,
          d: dd,
          angle,
          height: floor - 0.025,
          onlyLower: true,
        });
        const stairCenter = point(door + dw / 2, (face + entry) / 2);
        cutHousePlot({
          cx: stairCenter[0],
          cz: stairCenter[1],
          w: dw + 0.1,
          d: entry - face,
          angle,
          height: p.entryHeight,
        });
        m.box(left, floor + 0.125, back, ww, H - 0.125, dd, color, panel);
        groundSkirt(
          m,
          left,
          back,
          ww,
          dd,
          floor + 0.125,
          point,
          ([-14, -10, -10, -8] satisfies [number, number, number, number]).map((shade) =>
            tint(color, shade),
          ),
        );
        m.box(left - 0.006, floor + 0.15, face - 0.015, 0.028, H - 0.15, 0.04, trim);
        for (let storey = 1; storey < storeys; storey++)
          m.box(
            left,
            floor + (kind === 'west' ? 1.66 : 1.45 + (storey - 1) * 1.12),
            face + 0.008,
            ww,
            0.05,
            0.04,
            tint(color, 22),
          );
        const doorColor = (
          ['#306f6c', '#925d69', '#435d91', '#9c613a'] satisfies [string, string, string, string]
        )[home % 4];
        m.box(door - 0.028, floor + 0.09, face + 0.02, dw + 0.056, 1.45, 0.055, trim);
        m.box(door, floor + 0.11, face + 0.078, dw, 1.4, 0.026, doorColor);
        m.box(door + 0.035, floor + 1.03, face + 0.108, dw - 0.07, 0.31, 0.014, '#85b9ba');
        m.box(door + 0.03, floor + 0.29, face + 0.11, dw - 0.06, 0.48, 0.014, tint(doorColor, 12));
        m.sphere(door + dw - 0.04, floor + 0.8, face + 0.13, 0.016, 0.016, 0.016, '#d8b45e', 5, 3);
        for (let step = 0; step < 4; step++) {
          const zz = entry - ((step + 1) * (entry - face)) / 4,
            top = p.entryHeight + 0.055 + (step + 1) * 0.06;
          m.box(
            door - 0.045,
            p.entryHeight - 0.03,
            zz,
            dw + 0.09,
            top - p.entryHeight + 0.03,
            (entry - face) / 4 + 0.012,
            '#d0bd99',
            'stone',
          );
        }
        for (const u of [door - 0.055, door + dw + 0.055]) {
          m.rod(
            [u, p.entryHeight + 0.08, entry],
            [u, floor + 0.65, face + 0.06],
            0.014,
            '#41685f',
            4,
          );
          m.rod(
            [u, p.entryHeight + 0.08, entry],
            [u, p.entryHeight + 0.52, entry],
            0.014,
            '#41685f',
            4,
          );
        }
        if (kind === 'west') {
          m.box(
            door - 0.055,
            floor + 1.58,
            face - 0.01,
            dw + 0.11,
            0.075,
            0.27,
            tint(color, 24),
            'stucco',
          );
          m.box(door + 0.025, floor + 1.42, face + 0.11, dw - 0.05, 0.12, 0.015, '#87a5a5', {
            window: 0.12,
          });
          m.sphere(door - 0.07, floor + 1.2, face + 0.15, 0.032, 0.055, 0.035, '#ebd2a0', 10, 6, {
            emissive: 0.22,
          });
          for (const u of [left + 0.035, left + ww - 0.065])
            m.box(u, floor + 1.75, face + 0.018, 0.03, H - 1.8, 0.045, tint(color, 21));
        }
        const bx = left + ww * 0.7,
          bw = ww * 0.47;
        for (let storey = 0; storey < storeys; storey++) {
          const yy =
              floor +
              (kind === 'west' ? 0.66 : 0.57) +
              storey * (kind === 'west' ? 1.38 : kind === 'mission' ? 1 : 1.12),
            windowH = kind === 'west' ? 0.73 : 0.55;
          if (
            ((kind === 'victorian' || kind === 'bayview') && shape > 0.25) ||
            (kind === 'west' && (storey || shape > 0.38))
          ) {
            bay(
              m,
              bx,
              yy,
              face + 0.018,
              bw,
              windowH,
              tint(color, storey ? 8 : -5),
              seed * 997 + home,
            );
            if (kind === 'west')
              m.box(
                bx - bw / 2 - 0.025,
                yy + windowH + 0.07,
                face - 0.005,
                bw + 0.05,
                0.055,
                0.22,
                trim,
              );
          } else
            sashWindow(
              m,
              false,
              face + 0.02,
              bx - bw / 2,
              yy,
              bw,
              windowH,
              false,
              false,
              trim,
              seed * 997 + home,
            );
          if (storey)
            sashWindow(
              m,
              false,
              face,
              door + 0.01,
              yy + 0.02,
              dw - 0.02,
              kind === 'west' ? 0.65 : 0.48,
              false,
              false,
              trim,
              home,
            );
          for (const f of [0.26, 0.73] satisfies [number, number])
            sashWindow(
              m,
              false,
              back,
              left + ww * f - (kind === 'west' ? 0.17 : 0.11),
              yy,
              kind === 'west' ? 0.34 : 0.22,
              kind === 'west' ? 0.64 : 0.47,
              true,
              false,
              trim,
              home + storey,
            );
          if (home === 0 || home === homes - 1)
            for (const f of [0.32, 0.72] satisfies [number, number]) {
              const at = back + dd * f - 0.11;
              if (home === 0)
                sashWindow(
                  m,
                  true,
                  left,
                  at,
                  yy,
                  kind === 'west' ? 0.32 : 0.22,
                  kind === 'west' ? 0.62 : 0.45,
                  true,
                  false,
                  trim,
                  home,
                );
              if (home === homes - 1)
                sashWindow(
                  m,
                  true,
                  left + ww,
                  at,
                  yy,
                  kind === 'west' ? 0.32 : 0.22,
                  kind === 'west' ? 0.62 : 0.45,
                  false,
                  false,
                  trim,
                  home,
                );
            }
        }
        basementGarage(m, left, ww, face, floor, point);
        basementGarage(m, left, ww, back, floor, point, true);
        // Downhill façades become walk-out basements, with doors and
        // windows, rather than a featureless block of retaining brick.
        const rearGround = Math.max(
            naturalHeight(...point(left + 0.08, back)),
            naturalHeight(...point(left + ww - 0.08, back)),
          ),
          basement = floor - rearGround;
        if (basement > 0.8) {
          const bottom = Math.max(rearGround + 0.06, floor - 1.65),
            hh = Math.min(1.22, floor - bottom - 0.12);
          m.box(left + ww * 0.12, bottom, back - 0.035, 0.28, hh, 0.035, '#567f70', 'wood');
          sashWindow(
            m,
            false,
            back,
            left + ww * 0.63,
            bottom + hh * 0.36,
            0.25,
            Math.min(0.45, hh * 0.55),
            true,
            false,
            trim,
            home,
          );
          m.box(left + 0.018, bottom + hh + 0.05, back - 0.04, ww - 0.036, 0.045, 0.055, trim);
          if (back - p.fullBack > 0.3) {
            m.box(
              left + 0.06,
              floor - 0.035,
              back - 0.28,
              ww - 0.12,
              0.08,
              0.29,
              '#b5a17b',
              'wood',
            );
            m.rod(
              [left + 0.08, floor + 0.55, back - 0.27],
              [left + ww - 0.08, floor + 0.55, back - 0.27],
              0.018,
              '#466e61',
              4,
            );
            for (let u = left + 0.1; u < left + ww - 0.08; u += 0.2)
              m.rod(
                [u, floor + 0.05, back - 0.27],
                [u, floor + 0.55, back - 0.27],
                0.012,
                '#466e61',
                4,
              );
          }
        }
        // Front gardens, carved brackets and contrasting window boxes.
        if ((kind === 'victorian' && shape > 0.6) || (kind === 'west' && shape > 0.2)) {
          m.box(bx - bw * 0.4, floor + 0.44, face + 0.16, bw * 0.8, 0.1, 0.13, '#a66d48', 'wood');
          for (let i = 0; i < 4; i++) {
            m.sphere(
              bx - bw * 0.3 + i * bw * 0.2,
              floor + 0.57,
              face + 0.22,
              0.07,
              0.065,
              0.06,
              '#6e944e',
              6,
              3,
            );
            m.sphere(
              bx - bw * 0.3 + i * bw * 0.2,
              floor + 0.63,
              face + 0.22,
              0.035,
              0.035,
              0.03,
              (['#df907d', '#dec25e', '#b18cbd'] satisfies [string, string, string])[home % 3],
              5,
              3,
            );
          }
        }
        m.box(left - 0.01, floor + H - 0.12, face + 0.02, ww + 0.02, 0.075, 0.09, trim);
        if (kind === 'victorian')
          for (let j = 0.1; j < ww - 0.05; j += 0.24)
            m.box(left + j, floor + H - 0.23, face + 0.025, 0.045, 0.12, 0.07, trim);
        const rise = roof(
          m,
          roofStyle,
          left,
          floor + H,
          back,
          ww,
          dd,
          shape,
          color,
          kind,
          roofPlans,
        );
        if (SOUTHERN_PALETTES[kind as keyof typeof SOUTHERN_PALETTES])
          drawSouthernHouseDetails(m, kind, { ...p, width: ww, shape, color, bx, bw });
        if (back - p.fullBack > 0.25) {
          const gardenZ = (back + p.fullBack) / 2,
            gh = naturalHeight(...point(left + ww / 2, gardenZ));
          m.box(left + 0.04, gh - 0.04, gardenZ - 0.16, ww - 0.08, 0.1, 0.32, '#8c9d58', 'grass');
          for (const u of [left + 0.14, left + ww - 0.14]) {
            m.cylinder(u, gh + 0.05, gardenZ, 0.09, 0.14, '#c18359', 7);
            m.sphere(u, gh + 0.26, gardenZ, 0.14, 0.15, 0.13, '#739a55', 7, 3);
          }
          gardenStair(
            m,
            left + ww * 0.72,
            back - 0.07,
            p.fullBack + 0.12,
            ww * 0.3,
            point,
            angle,
            floor,
          );
          if (hasLift)
            gardenLift(
              m,
              left + ww * 0.26,
              back - 0.34,
              p.fullBack + 0.32,
              point,
              angle,
              shape,
              floor,
            );
        }
        const frontRise = floor - p.entryHeight;
        plans.push({ ...p, color, roof: roofStyle, hasLift, frontRise });
        housingDetails.push(plans[plans.length - 1]);
        low = Math.min(low, p.entryHeight - 0.08, floor - 0.08);
        high = Math.max(
          high,
          floor + H + rise,
          naturalHeight(...point(left + ww / 2, p.fullBack)) + 1.05,
        );
      }
    });
    return registerObject(m, start, {
      x,
      y: z,
      w,
      d,
      h: high - low,
      base: low,
      arch: 'townhomes',
      roofDetails: roofPlans[0],
      district: kind,
      orientation: front,
      rotation: angle,
      footprint: rectangle(cx, cz, frontage, depth, angle),
      homes,
      storeys: Math.max(...plans.map((p) => p.storeys)),
      houses: plans,
    });
  }
  /** Lincoln Way has shallow lots beside the park. Give them residential
   * proportions and details while keeping bays and steps within the parcel. */
  function makeParksideTownhome(
    cx: number,
    cz: number,
    w: number,
    d: number,
    angle: number,
    seed: number,
  ) {
    const m = getSceneMesh(),
      start = m.data.length,
      point = (u: number, v: number) =>
        [
          cx + u * Math.cos(angle) - v * Math.sin(angle),
          cz + u * Math.sin(angle) + v * Math.cos(angle),
        ] satisfies [number, number];
    const left = -w / 2 + 0.04,
      ww = w - 0.08,
      back = -d / 2 + 0.04,
      face = d / 2 - 0.14,
      dd = face - back,
      entry = d / 2 - 0.015;
    const entryHeight = naturalHeight(...point(left + 0.26, entry)),
      floor = entryHeight + 0.18,
      H = 3.15 + seed * 0.25;
    const color = varyHousePaint(
        (
          ['#87b9b2', '#d9a5b5', '#e2c181', '#a5b2d4', '#b7c894', '#c8a5ce'] satisfies [
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        )[Math.floor(seed * 6)],
        seed * 197,
      ),
      doorColor = (['#4b6f87', '#8d5266', '#436d59'] satisfies [string, string, string])[
        Math.floor(seed * 3)
      ];
    const roofStyle = seed < 0.36 ? 'gable' : seed < 0.7 ? 'hip' : 'mansard';
    cutHousePlot({
      cx,
      cz,
      w: w - 0.08,
      d: d - 0.1,
      angle,
      height: floor - 0.025,
      onlyLower: true,
    });
    pose(m, cx, 0, cz, angle, () => {
      m.box(left, floor + 0.12, back, ww, H - 0.12, dd, color, 'clapboard');
      groundSkirt(m, left, back, ww, dd, floor + 0.12, point, tint(color, -12));
      for (const y of [0.2, 1.66, H - 0.12] satisfies [number, number, number])
        m.box(left, floor + y, face + 0.003, ww, 0.065, 0.055, trim);
      for (const x of [left + 0.015, left + ww - 0.045] satisfies [number, number])
        m.box(x, floor + 0.267, face + 0.01, 0.03, H - 0.367, 0.035, tint(color, 20));
      const door = left + 0.075,
        dw = Math.min(0.36, ww * 0.28),
        bx = left + ww * 0.71,
        bw = ww * 0.46;
      m.box(door - 0.025, floor + 0.06, face + 0.02, dw + 0.05, 1.47, 0.04, trim);
      m.box(door, floor + 0.08, face + 0.061, dw, 1.41, 0.018, doorColor);
      m.box(door + 0.035, floor + 1.03, face + 0.081, dw - 0.07, 0.31, 0.009, '#a1c6c5', {
        window: 0.22,
      });
      m.sphere(door + dw - 0.045, floor + 0.76, face + 0.092, 0.014, 0.014, 0.012, '#d9ba73', 8, 5);
      for (let i = 0; i < 3; i++) {
        const z = entry - ((i + 1) * (entry - face)) / 3;
        m.box(
          door - 0.025,
          entryHeight - 0.015,
          z,
          dw + 0.05,
          0.075 + i * 0.055,
          (entry - face) / 3 + 0.003,
          '#c7bba6',
          'stone',
        );
      }
      m.box(door - 0.04, floor + 1.59, face - 0.015, dw + 0.08, 0.065, 0.12, trim);
      for (const y of [0.62, 2.03] satisfies [number, number]) {
        bay(m, bx, floor + y, face + 0.005, bw, 0.72, color, seed * 401 + y, 0.055);
        sashWindow(m, false, back, bx - bw / 2, floor + y, bw, 0.67, true, false, trim, seed + y);
      }
      sashWindow(
        m,
        false,
        face + 0.015,
        door + 0.015,
        floor + 2.06,
        dw - 0.03,
        0.65,
        false,
        false,
        trim,
        seed,
      );
      for (let x = left + 0.09; x < left + ww - 0.05; x += 0.2)
        m.box(x, floor + H - 0.24, face + 0.025, 0.04, 0.13, 0.065, trim);
      m.box(bx - bw * 0.42, floor + 0.44, face + 0.06, bw * 0.84, 0.1, 0.07, '#9c775e', 'wood');
      for (let i = 0; i < 3; i++) {
        const x = bx - bw * 0.28 + i * bw * 0.28;
        m.sphere(x, floor + 0.57, face + 0.09, 0.045, 0.045, 0.035, '#71984f', 8, 5);
        m.sphere(
          x,
          floor + 0.61,
          face + 0.09,
          0.025,
          0.025,
          0.022,
          seed > 0.5 ? '#e1b96c' : '#cf8ba6',
          8,
          5,
        );
      }
      roof(m, roofStyle, left, floor + H, back, ww, dd, seed, color);
    });
    return registerObject(m, start, {
      x: cx - w / 2,
      y: cz - d / 2,
      w,
      d,
      h: H + 0.8,
      base: floor - 0.08,
      arch: 'townhomes',
      district: 'parkside',
      rotation: angle,
      footprint: rectangle(cx, cz, w, d, angle),
      homes: 1,
      storeys: 2,
      houses: [
        { width: ww, H, storeys: 2, roof: roofStyle, color, entryHeight, floor, frontRise: 0.18 },
      ],
    });
  }
  function makeCurbShop(cx: number, cz: number, w: number, d: number, angle: number, seed: number) {
    const m = getSceneMesh(),
      start = m.data.length,
      poly = rectangle(cx, cz, w, d, angle),
      point = (u: number, v: number) =>
        [
          cx + u * Math.cos(angle) - v * Math.sin(angle),
          cz + u * Math.sin(angle) + v * Math.cos(angle),
        ] satisfies [number, number];
    const floor = naturalHeight(...point(0, d / 2 - 0.1)) + 0.1,
      H = w < 0.75 ? 0.78 : 1.18;
    cutHousePlot({ cx, cz, w: w - 0.05, d: d - 0.2, angle, height: floor - 0.025 });
    pose(m, cx, 0, cz, angle, () => {
      const color = (
        ['#c89171', '#8eaf9b', '#c3a16f', '#9a95b0'] satisfies [string, string, string, string]
      )[Math.floor(seed * 4)];
      m.box(
        -w / 2 + 0.025,
        floor - 0.05,
        -d / 2 + 0.025,
        w - 0.05,
        H + 0.05,
        d - 0.05,
        color,
        'stucco',
      );
      groundSkirt(
        m,
        -w / 2 + 0.025,
        -d / 2 + 0.025,
        w - 0.05,
        d - 0.05,
        floor - 0.05,
        point,
        tint(color, -20),
      );
      const z = d / 2 - 0.02;
      m.quad(
        [-w * 0.39, floor + 0.1, z],
        [w * 0.39, floor + 0.1, z],
        [w * 0.39, floor + H * 0.8, z],
        [-w * 0.39, floor + H * 0.8, z],
        seed > 0.5 ? '#6e9892' : '#787f9d',
        'wood',
      );
      for (const xx of [-w * 0.41, w * 0.39] satisfies [number, number])
        m.box(xx, floor + 0.08, z, 0.025, H * 0.74, 0.025, trim);
      m.box(-w * 0.43, floor + H * 0.86, z - 0.005, w * 0.86, 0.055, 0.04, trim);
      roof(
        m,
        seed > 0.5 ? 'gable' : 'flat',
        -w / 2 + 0.01,
        floor + H,
        -d / 2 + 0.01,
        w - 0.02,
        d - 0.02,
        seed,
        color,
      );
    });
    return registerObject(m, start, {
      x: cx - w / 2,
      y: cz - d / 2,
      w,
      d,
      h: H + 0.8,
      base: floor - 0.1,
      arch: 'shopfront',
      storeys: 1,
      rotation: angle,
      footprint: poly,
    });
  }
  function drawHillsideLifts(
    m: Mesh,
    time: number,
    reduced: boolean,
    visible: (x: number, z: number, base: number) => boolean = () => true,
  ) {
    for (const lift of lifts) {
      const t = reduced ? 0.35 : (1 - Math.cos(time * 0.00024 + lift.seed * 6.28)) / 2,
        index = Math.min(11, Math.floor(t * 12)),
        u = t * 12 - index,
        a = lift.points[index],
        b = lift.points[index + 1],
        position = a.map((v, i) => v + (b[i] - v) * u);
      if (!visible(position[0], position[2], position[1])) continue;
      pose(m, position[0], position[1], position[2], lift.angle, () => {
        m.box(-0.22, 0.02, -0.25, 0.44, 0.08, 0.5, '#536b69');
        m.box(-0.2, 0.1, -0.23, 0.4, 0.25, 0.46, lift.color, 'wood');
        for (const xx of [-0.18, 0.16] satisfies [number, number])
          for (const zz of [-0.21, 0.19] satisfies [number, number])
            m.box(xx, 0.35, zz, 0.025, 0.38, 0.025, '#e3d6af');
        for (const zz of [-0.22, 0.21] satisfies [number, number])
          m.quad(
            [-0.15, 0.39, zz] satisfies [number, number, number],
            [0.15, 0.39, zz] satisfies [number, number, number],
            [0.15, 0.65, zz] satisfies [number, number, number],
            [-0.15, 0.65, zz] satisfies [number, number, number],
            '#84bbc0',
          );
        m.box(-0.24, 0.73, -0.28, 0.48, 0.07, 0.56, '#e4cf9f');
        m.box(-0.13, 0.35, -0.13, 0.26, 0.09, 0.25, '#b8875a');
      });
    }
  }
  return { makeTownhomeRow, makeParksideTownhome, makeCurbShop, drawHillsideLifts, housingDetails };
}
