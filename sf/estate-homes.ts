import type { planEstate } from './estate-design.ts';
type EstatePlan = ReturnType<typeof planEstate>;
import type { Mesh } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';

const estateIvory = '#e9dfc7',
  estateBronze = '#584e3e',
  estateGlass = '#758f8d';
const estateVariant = (p: { seed: number; w: number; d: number }) =>
  Math.abs(Math.floor((p.seed + p.w * 0.17 + p.d * 0.13) * 9)) % 3;
function estatePane(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  side = false,
  far = false,
) {
  const p = side
    ? [
        [x, y, z] satisfies [number, number, number],
        [x, y + h, z] satisfies [number, number, number],
        [x, y + h, z + w] satisfies [number, number, number],
        [x, y, z + w] satisfies [number, number, number],
      ]
    : [
        [x, y, z] satisfies [number, number, number],
        [x + w, y, z] satisfies [number, number, number],
        [x + w, y + h, z] satisfies [number, number, number],
        [x, y + h, z] satisfies [number, number, number],
      ];
  if (far) p.reverse();
  m.quad(p[0], p[1], p[2], p[3], estateGlass, { window: 0.12 });
  const frame = '#494b40';
  if (side) {
    for (const zz of [z, z + w] satisfies [number, number])
      m.box(x - 0.015, y, zz - 0.012, 0.03, h, 0.024, frame);
    for (const yy of [y, y + h] satisfies [number, number])
      m.box(x - 0.015, yy - 0.012, z, 0.03, 0.024, w, frame);
  } else {
    for (const xx of [x, x + w] satisfies [number, number])
      m.box(xx - 0.012, y, z - 0.015, 0.024, h, 0.03, frame);
    for (const yy of [y, y + h] satisfies [number, number])
      m.box(x, yy - 0.012, z - 0.015, w, 0.024, 0.03, frame);
  }
}
function estateTileRoof(
  m: Mesh,
  x: number,
  z: number,
  w: number,
  d: number,
  y: number,
  rise: number,
  color = '#b57958',
) {
  const ridge = z + d * 0.5,
    e = 0.055;
  m.quad(
    [x - e, y, z - e] satisfies [number, number, number],
    [x - e, y + rise, ridge] satisfies [number, number, number],
    [x + w + e, y + rise, ridge] satisfies [number, number, number],
    [x + w + e, y, z - e] satisfies [number, number, number],
    color,
    'roofTile',
  );
  m.quad(
    [x - e, y + rise, ridge] satisfies [number, number, number],
    [x - e, y, z + d + e] satisfies [number, number, number],
    [x + w + e, y, z + d + e] satisfies [number, number, number],
    [x + w + e, y + rise, ridge] satisfies [number, number, number],
    color,
    'roofTile',
  );
  for (const xx of [x - e, x + w + e] satisfies [number, number])
    m.tri(
      [xx, y, z - e] satisfies [number, number, number],
      [xx, y + rise, ridge] satisfies [number, number, number],
      [xx, y, z + d + e] satisfies [number, number, number],
      estateIvory,
      'stucco',
    );
  m.rod(
    [x - e, y + rise + 0.015, ridge] satisfies [number, number, number],
    [x + w + e, y + rise + 0.015, ridge] satisfies [number, number, number],
    0.035,
    '#bf8763',
    10,
    'roofTile',
  );
}
function estateRail(
  m: Mesh,
  x: number,
  z: number,
  w: number,
  y: number,
  color = estateIvory,
  classic = false,
) {
  m.box(x, y + 0.36, z, w, 0.045, 0.055, color, classic ? 'travertine' : null);
  const n = Math.max(2, Math.round(w / 0.23));
  for (let i = 0; i <= n; i++) {
    const xx = x + (w * i) / n;
    m.cylinder(
      xx,
      y,
      z + 0.025,
      classic ? 0.025 : 0.012,
      0.36,
      color,
      classic ? 10 : 6,
      classic ? 0.019 : 0.012,
      classic ? 'travertine' : null,
    );
    if (classic) {
      m.cylinder(xx, y + 0.11, z + 0.025, 0.04, 0.1, color, 10, 0.025, 'travertine');
      m.cylinder(xx, y + 0.21, z + 0.025, 0.025, 0.06, color, 10, 0.04, 'travertine');
    }
  }
}
function estatePergola(m: Mesh, x: number, z: number, w: number, d: number, y: number) {
  for (const xx of [x + 0.05, x + w - 0.05] satisfies [number, number])
    for (const zz of [z + 0.04, z + d - 0.04] satisfies [number, number])
      m.box(xx - 0.025, 0.1, zz - 0.025, 0.05, y - 0.1, 0.05, '#8c805e', 'cedar');
  for (const zz of [z, z + d] satisfies [number, number])
    m.box(x - 0.03, y, zz - 0.035, w + 0.06, 0.07, 0.07, '#948362', 'cedar');
  const n = Math.ceil(w / 0.15);
  for (let i = 0; i <= n; i++)
    m.box(x + (w * i) / n - 0.018, y + 0.07, z - 0.05, 0.036, 0.055, d + 0.1, '#b2a080', 'cedar');
}
function estateArcade(
  m: Mesh,
  x: number,
  z: number,
  w: number,
  y: number,
  height: number,
  n: number,
) {
  const bay = w / n,
    r = bay * 0.39,
    spring = y + height - r;
  for (let i = 0; i <= n; i++) {
    const xx = x + (w * i) / n;
    m.cylinder(xx, y, z, 0.045, height - r, estateIvory, 16, 0.04, 'travertine');
    m.cylinder(xx, spring - 0.04, z, 0.075, 0.065, estateIvory, 16, 0.075, 'travertine');
  }
  for (let i = 0; i < n; i++) {
    const cx = x + bay * (i + 0.5),
      outer = bay * 0.5;
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 12,
        b = ((j + 1) * Math.PI) / 12;
      const P = (t: number) =>
          [cx + Math.cos(t) * r, spring + Math.sin(t) * r, z + 0.05] satisfies [
            number,
            number,
            number,
          ],
        Q = (t: number) =>
          [cx + Math.cos(t) * outer, spring + Math.sin(t) * outer, z + 0.05] satisfies [
            number,
            number,
            number,
          ];
      m.quad(P(a), Q(a), Q(b), P(b), estateIvory, 'travertine');
      const p = P(a),
        q = P(b);
      m.quad(
        [p[0], p[1], z - 0.05] satisfies [number, number, number],
        p,
        q,
        [q[0], q[1], z - 0.05] satisfies [number, number, number],
        '#c3b69a',
        'travertine',
      );
      m.quad(
        Q(a),
        [Q(a)[0], y + height + 0.04, z + 0.05] satisfies [number, number, number],
        [Q(b)[0], y + height + 0.04, z + 0.05] satisfies [number, number, number],
        Q(b),
        estateIvory,
        'travertine',
      );
    }
  }
}
function drawCaliforniaEstate(m: Mesh, p: EstatePlan) {
  const { x, z, w, d } = p.house,
    h = 1.58,
    wing = Math.max(0.62, w * 0.26),
    front = z + d,
    v = estateVariant(p),
    plaster = (['#e9d5b7', '#efdfca', '#dcc7aa'] satisfies [string, string, string])[v],
    tile = (['#b57958', '#a5684e', '#b38b64'] satisfies [string, string, string])[v];
  m.box(x, 0.08, z, w, h, d * 0.61, plaster, 'stucco');
  for (const xx of [x, x + w - wing]) {
    m.box(xx, 0.08, z, wing, h, d, plaster, 'stucco');
    estateTileRoof(m, xx, z, wing, d, h + 0.08, 0.32, tile);
  }
  estateTileRoof(m, x + wing, z, w - wing * 2, d * 0.61, h + 0.08, 0.26, '#a66e51');
  m.box(x + wing, 0.09, z + d * 0.61, w - wing * 2, 0.018, d * 0.39, '#ddd5b7', 'glazedTile');
  for (let i = 0; i < 3; i++) {
    const xx = x + wing + ((w - 2 * wing) * (i + 0.5)) / 3;
    estatePane(m, xx - 0.13, 0.35, z + d * 0.61 + 0.012, 0.26, 0.96);
  }
  for (const xx of [x + 0.12, x + w - wing + 0.1])
    drawFacadeWindow(m, {
      plane: front + 0.012,
      along: xx,
      y: 0.48,
      w: wing - 0.22,
      h: 0.72,
      trim: estateIvory,
      seed: xx,
    });
  for (let i = 0; i < 3; i++)
    drawFacadeWindow(m, {
      plane: z - 0.014,
      far: true,
      along: x + 0.15 + (i * (w - 0.2)) / 3,
      y: 0.46,
      w: Math.min(0.55, w / 3 - 0.25),
      h: 0.72,
      trim: estateIvory,
      seed: i + p.seed,
    });
  for (const side of [-1, 1] satisfies [number, number])
    drawFacadeWindow(m, {
      isX: true,
      plane: side < 0 ? x - 0.014 : x + w + 0.014,
      far: side < 0,
      along: z + d * 0.32,
      y: 0.48,
      w: d * 0.34,
      h: 0.7,
      trim: estateIvory,
      seed: side + p.seed,
    });
  estateArcade(
    m,
    x + wing,
    front - 0.04,
    w - wing * 2,
    0.1,
    1.16,
    Math.max(2, Math.round((w - wing * 2) / 0.55)),
  );
  m.box(x + w - wing * 0.45, h, z + d * 0.25, 0.19, 0.66, 0.26, '#d8b996', 'stucco');
  m.box(
    x + w - wing * 0.45 - 0.035,
    h + 0.62,
    z + d * 0.25 - 0.03,
    0.26,
    0.07,
    0.32,
    estateIvory,
    'travertine',
  );
  for (const xx of [x + 0.1, x + w - 0.1]) {
    m.cylinder(xx, 0.09, front + 0.1, 0.09, 0.15, '#b87e5a', 12, 0.12, 'glazedTile');
    m.sphere(xx, 0.37, front + 0.1, 0.12, 0.21, 0.12, '#637b48', 12, 6);
  }
}
function drawEichlerEstate(m: Mesh, p: EstatePlan) {
  const { x, z, w, d } = p.house,
    h = 1.25,
    front = z + d,
    v = estateVariant(p),
    wall = (['#b3a185', '#b29b77', '#bdb49b'] satisfies [string, string, string])[v],
    atrium = Math.min(0.65, w * 0.23);
  // Low post-and-beam volumes flank an open-to-sky central garden.
  m.box(x, 0.08, z, w, h, 0.12, wall, 'cedar');
  m.box(x, 0.08, z, 0.12, h, d, wall, 'cedar');
  m.box(x + w - 0.12, 0.08, z, 0.12, h, d, '#d5d0bb', 'stucco');
  for (let i = 0; i < 4; i++) {
    const ww = (w - 0.22) / 4;
    estatePane(m, x + 0.11 + i * ww, 0.13, front - 0.015, ww - 0.025, h - 0.12);
  }
  m.box(
    x + w * 0.48,
    0.12,
    front + 0.01,
    0.34,
    1.06,
    0.05,
    (['#a36e43', '#5e8580', '#b7774b'] satisfies [string, string, string])[v],
    'cedar',
  );
  m.rod(
    [x + w * 0.75, 0.67, front + 0.07],
    [x + w * 0.75, 0.81, front + 0.07],
    0.01,
    '#c7b285',
    8,
    { metal: 0.5 },
  );
  for (const xx of [x + 0.08, x + w * 0.5, x + w - 0.08])
    m.box(xx - 0.025, 0.09, z - 0.04, 0.05, h + 0.05, d + 0.08, estateBronze, 'cedar');
  const mid = x + w * 0.5,
    ay = z + d * 0.35,
    roof = (['#68746f', '#7d8172', '#696f75'] satisfies [string, string, string])[v];
  // Separate roof planes and a real atrium opening; no generic flat slab.
  for (const [a, b] of [
    [x - 0.05, mid - atrium / 2] satisfies [number, number],
    [mid + atrium / 2, x + w + 0.05],
  ]) {
    m.quad(
      [a, h + 0.13, z - 0.06],
      [a, h + 0.13, front + 0.06],
      [b, h + 0.32, front + 0.06],
      [b, h + 0.32, z - 0.06],
      roof,
      'roof',
    );
    m.box(a, h + 0.08, front + 0.035, b - a, 0.1, 0.045, '#d9d1b9', 'cedar');
  }
  m.box(mid - atrium / 2, h + 0.25, z - 0.06, atrium, 0.07, d * 0.18, estateBronze, 'cedar');
  m.box(mid - atrium / 2, h + 0.25, z + d * 0.68, atrium, 0.07, d * 0.35, estateBronze, 'cedar');
  m.box(mid - atrium / 2, 0.09, ay, atrium, 0.035, d * 0.3, '#6d8051', 'grass');
  m.cylinder(mid, 0.12, ay + d * 0.13, 0.026, 0.72, '#88775a', 8);
  m.sphere(mid, 0.91, ay + d * 0.13, 0.23, 0.25, 0.24, '#78945e', 14, 8);
  // Clerestory glazing and honest structural beams under the roof edge.
  for (const zz of [z + 0.02, front - 0.1])
    m.box(x, h - 0.02, zz, w, 0.07, 0.06, estateBronze, 'cedar');
  estatePane(m, x + w + 0.012, 0.34, z + 0.18, d - 0.36, 0.69, true);
  for (let i = 0; i < 3; i++)
    estatePane(
      m,
      x + 0.14 + (i * (w - 0.2)) / 3,
      0.91,
      z - 0.014,
      (w - 0.2) / 3 - 0.07,
      0.22,
      false,
      true,
    );
}
function drawFallingwaterEstate(m: Mesh, p: EstatePlan) {
  const { x, z, w, d } = p.house,
    v = estateVariant(p),
    stone = (['#b1ac8d', '#a8a99b', '#b9af95'] satisfies [string, string, string])[v],
    concrete = (['#e1d3ad', '#dfd9bf', '#ddd2b6'] satisfies [string, string, string])[v];
  m.box(x + w * 0.35, 0.04, z + 0.08, w * 0.3, 2.55, d * 0.57, stone, 'travertine');
  for (const [level, shift, ww, dd] of [
    [0, 0, w, d],
    [1, 0.18, w * 0.83, d * 0.76] satisfies [number, number, number, number],
  ]) {
    const y = 0.19 + level * 1.02,
      xx = x + shift,
      zz = z + level * 0.06;
    m.box(xx, y, zz, ww, 0.14, dd, concrete, 'boardConcrete');
    m.box(xx + 0.1, y + 0.14, zz + 0.08, ww - 0.2, 0.66, dd * 0.55, '#898c77', 'travertine');
    for (let i = 0; i < 4; i++) {
      const paneW = (ww - 0.24) / 4;
      estatePane(m, xx + 0.12 + i * paneW, y + 0.21, zz + dd * 0.55 + 0.095, paneW - 0.022, 0.58);
    }
    estatePane(m, xx + ww - 0.085, y + 0.22, zz + 0.14, dd * 0.42, 0.55, true);
    estatePane(m, xx + 0.085, y + 0.22, zz + 0.14, dd * 0.42, 0.55, true, true);
    for (const end of [0, 1] satisfies [number, number])
      estatePane(m, xx + 0.13 + end * ww * 0.66, y + 0.22, zz + 0.065, ww * 0.2, 0.53, false, true);
    m.box(xx - 0.035, y + 0.85, zz - 0.025, ww + 0.07, 0.105, dd * 0.69, concrete, 'boardConcrete');
    estateRail(m, xx + 0.025, zz + dd - 0.045, ww - 0.05, y + 0.14, '#9a8763');
    m.box(xx + 0.015, y + 0.14, zz + dd - 0.08, ww - 0.03, 0.12, 0.1, concrete, 'boardConcrete');
  }
  m.box(
    x + w * 0.35 - 0.03,
    2.55,
    z + 0.05,
    w * 0.3 + 0.06,
    0.1,
    d * 0.6,
    concrete,
    'boardConcrete',
  );
  // A water stair spills from a stone scupper into a small reflecting basin.
  const xx = x + w - 0.28,
    zz = z + d * 0.82;
  m.box(xx, 0.06, zz, 0.23, 0.1, 0.26, '#829c91', 'poolMosaic');
  for (let i = 0; i < 4; i++) {
    m.box(xx, 0.13 + i * 0.11, zz - 0.08 - i * 0.04, 0.2, 0.06, 0.11, stone, 'travertine');
    m.quad(
      [xx + 0.04, 0.19 + i * 0.11, zz + 0.03 - i * 0.04] satisfies [number, number, number],
      [xx + 0.16, 0.19 + i * 0.11, zz + 0.03 - i * 0.04] satisfies [number, number, number],
      [xx + 0.16, 0.08 + i * 0.11, zz + 0.075 - i * 0.04] satisfies [number, number, number],
      [xx + 0.04, 0.08 + i * 0.11, zz + 0.075 - i * 0.04] satisfies [number, number, number],
      '#a4d4cd',
      { window: 0.3 },
    );
  }
}
function drawHearstEstate(m: Mesh, p: EstatePlan) {
  const { x, z, w, d } = p.house,
    tower = Math.min(0.74, w * 0.25),
    h = 1.75,
    front = z + d,
    body = (['#e4d5b4', '#e8dbc4', '#daceb6'] satisfies [string, string, string])[estateVariant(p)];
  m.box(x, 0.08, z, w, h, d * 0.72, body, 'travertine');
  estateArcade(m, x + 0.1, front - 0.08, w - 0.2, 0.14, 1.23, Math.max(3, Math.floor(w / 0.55)));
  m.box(x - 0.02, 1.46, front - 0.25, w + 0.04, 0.12, 0.32, estateIvory, 'travertine');
  estateRail(m, x + 0.02, front - 0.05, w - 0.04, 1.58, estateIvory, true);
  estateTileRoof(m, x + tower * 0.6, z, w - tower * 1.2, d * 0.72, h + 0.08, 0.44, '#b67c58');
  for (const xx of [x, x + w - tower]) {
    m.box(xx, 0.08, z, tower, 2.5, d * 0.62, body, 'travertine');
    for (const y of [0.6, 1.57, 2.18] satisfies [number, number, number])
      drawFacadeWindow(m, {
        plane: z + d * 0.62 + 0.013,
        along: xx + 0.16,
        y,
        w: tower - 0.32,
        h: y > 2 ? 0.27 : 0.46,
        trim: estateIvory,
        seed: xx + y,
      });
    for (const y of [0.6, 1.63] satisfies [number, number])
      drawFacadeWindow(m, {
        plane: z - 0.013,
        far: true,
        along: xx + 0.16,
        y,
        w: tower - 0.32,
        h: 0.46,
        trim: estateIvory,
        seed: xx + y,
      });
    m.box(
      xx - 0.035,
      2.49,
      z - 0.035,
      tower + 0.07,
      0.12,
      d * 0.62 + 0.07,
      estateIvory,
      'travertine',
    );
    // Belvedere caps, finials and a layered cornice break the silhouette.
    estateTileRoof(m, xx - 0.035, z - 0.025, tower + 0.07, d * 0.62 + 0.05, 2.61, 0.34, '#af7955');
    m.cylinder(xx + tower / 2, 2.95, z + d * 0.31, 0.025, 0.16, '#baa77c', 10);
    m.sphere(
      xx + tower / 2,
      3.12,
      z + d * 0.31,
      0.055,
      0.07,
      0.055,
      estateIvory,
      12,
      6,
      'travertine',
    );
  }
  // Ornamental glazed frieze, carved medallion and cypress-lined forecourt.
  m.box(x + tower, 1.17, front - 0.12, w - tower * 2, 0.16, 0.025, '#e0d4ae', 'glazedTile');
  for (const side of [-1, 1] satisfies [number, number])
    drawFacadeWindow(m, {
      isX: true,
      plane: side < 0 ? x - 0.013 : x + w + 0.013,
      far: side < 0,
      along: z + d * 0.18,
      y: 0.67,
      w: d * 0.24,
      h: 0.63,
      trim: estateIvory,
      seed: side,
    });
  m.cylinder(x + w / 2, 0.1, front - 0.38, 0.18, 0.06, estateIvory, 24, 0.18, 'travertine');
  m.cylinder(x + w / 2, 0.16, front - 0.38, 0.035, 0.36, estateIvory, 12);
  m.cylinder(x + w / 2, 0.51, front - 0.38, 0.13, 0.045, '#b3c6b5', 24, 0.13, 'poolMosaic');
}
export function drawEstateHome(m: Mesh, p: EstatePlan) {
  const builders = {
    california: drawCaliforniaEstate,
    eichler: drawEichlerEstate,
    fallingwater: drawFallingwaterEstate,
    hearst: drawHearstEstate,
  };
  builders[p.style as keyof typeof builders](m, p);
}

export function drawEstateGarden(m: Mesh, p: EstatePlan) {
  const { w, d, house: h, pool } = p;
  m.box(-w / 2 + 0.04, -0.03, -d / 2 + 0.04, w - 0.08, 0.1, d - 0.08, '#bcbaa0', 'flagstone');
  // A planted strip and low hedges soften the footprint without a huge plinth.
  for (const x of [-w / 2 + 0.13, w / 2 - 0.13] satisfies [number, number]) {
    m.box(x - 0.065, 0.07, -d / 2 + 0.13, 0.13, 0.055, d - 0.26, '#607d4a', 'dirt');
    const profile = [
        [-0.065, 0.11] satisfies [number, number],
        [-0.065, 0.23] satisfies [number, number],
        [-0.035, 0.29] satisfies [number, number],
        [0.035, 0.29] satisfies [number, number],
        [0.065, 0.23] satisfies [number, number],
        [0.065, 0.11] satisfies [number, number],
      ],
      back = -d / 2 + 0.15,
      front = d / 2 - 0.15;
    for (let i = 0; i < profile.length - 1; i++) {
      const a = profile[i],
        b = profile[i + 1];
      m.quad(
        [x + a[0], a[1], back] satisfies [number, number, number],
        [x + a[0], a[1], front] satisfies [number, number, number],
        [x + b[0], b[1], front] satisfies [number, number, number],
        [x + b[0], b[1], back] satisfies [number, number, number],
        '#69834d',
        'grass',
      );
    }
    for (const z of [back, front] satisfies [number, number])
      m.sphere(x, 0.2, z, 0.065, 0.1, 0.075, '#69834d', 8, 4);
  }
  if (pool) {
    const { x, z, w: pw, d: pd, water } = pool,
      lip = 0.09;
    for (const zz of [z - lip, z + pd])
      m.box(x - lip, 0.075, zz, pw + 2 * lip, 0.04, lip, estateIvory, 'travertine');
    for (const xx of [x - lip, x + pw])
      m.box(xx, 0.075, z, lip, 0.04, pd, estateIvory, 'travertine');
    m.box(x, 0.08, z, pw, 0.025, pd, '#64acb1', 'poolMosaic');
    // Pool surface has a dedicated shallow-water shader over visible mosaic.
    m.quad(
      [x, water, z],
      [x, water, z + pd],
      [x + pw, water, z + pd],
      [x + pw, water, z],
      '#8bc7c1',
      { water: 4 },
    );
    for (const xx of [x + pw - 0.27, x + pw - 0.12] satisfies [number, number]) {
      m.rod(
        [xx, 0.12, z + pd - 0.12] satisfies [number, number, number],
        [xx, 0.42, z + pd - 0.12] satisfies [number, number, number],
        0.014,
        '#bdc6bf',
        10,
        {
          metal: 0.5,
        },
      );
      m.rod(
        [xx, 0.42, z + pd - 0.12] satisfies [number, number, number],
        [xx, 0.42, z + pd + 0.08],
        0.014,
        '#bdc6bf',
        10,
        {
          metal: 0.5,
        },
      );
    }
    for (const zz of [z + pd - 0.17, z + pd - 0.08] satisfies [number, number])
      m.rod(
        [x + pw - 0.27, 0.22, zz] satisfies [number, number, number],
        [x + pw - 0.12, 0.22, zz] satisfies [number, number, number],
        0.012,
        '#bbc3b8',
        8,
      );
    // Two teak chaises, striped upholstery, rolled towels and a drinks table.
    for (const xx of [x + 0.22, x + 0.82]) {
      const zz = z + pd + 0.18;
      m.box(xx, 0.13, zz, 0.38, 0.08, 0.52, '#ac9067', 'cedar');
      m.box(xx + 0.025, 0.22, zz + 0.02, 0.33, 0.045, 0.34, '#dfdcc2', 'wood');
      m.quad(
        [xx + 0.025, 0.26, zz + 0.36],
        [xx + 0.355, 0.26, zz + 0.36],
        [xx + 0.355, 0.45, zz + 0.51],
        [xx + 0.025, 0.45, zz + 0.51],
        '#e7e1cb',
        'wood',
      );
      for (let i = 0; i < 3; i++)
        m.box(xx + 0.045 + i * 0.105, 0.267, zz + 0.02, 0.025, 0.006, 0.32, '#788d89');
      for (const dx of [0.04, 0.31] satisfies [number, number])
        m.box(xx + dx, 0.07, zz + 0.1, 0.025, 0.07, 0.36, '#7a7257', 'cedar');
      m.cylinder(xx + 0.16, 0.285, zz + 0.09, 0.035, 0.22, '#eee9d4', 10, 0.035, 'wood');
    }
    m.cylinder(x + 1.36, 0.12, z + pd + 0.4, 0.025, 0.27, estateBronze, 10);
    m.cylinder(x + 1.36, 0.39, z + pd + 0.4, 0.115, 0.035, estateIvory, 20, 0.115, 'travertine');
    m.cylinder(x + 1.36, 0.425, z + pd + 0.4, 0.025, 0.07, '#c7a375', 10, 0.03, { window: 0.3 });
    // Small shade structure behind the water, clear of the open swimming area.
    if (p.style === 'california' || p.style === 'hearst')
      estatePergola(m, x - 0.03, z - 0.12, pw + 0.06, 0.35, 1.42);
  } else {
    const x = h.x + h.w * 0.5,
      z = d / 2 - 0.19;
    for (const side of [-1, 1] satisfies [number, number]) {
      m.cylinder(x + side * 0.44, 0.08, z, 0.075, 0.13, '#b79370', 12, 0.1, 'glazedTile');
      m.sphere(x + side * 0.44, 0.34, z, 0.11, 0.22, 0.11, '#658052', 12, 6);
    }
  }
}
