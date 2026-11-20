import { pose, tint } from './geometry.js';
import { drawFacadeWindow } from './windows.js';
import { drawCraftGround } from './southern-craft.js';
import {
  BAYVIEW_COMMON,
  AIRPORT_GARDEN_DISTRICT,
  AIRPORT_GARDEN_OFFICES,
} from './south-bay-layout.js';

const rect = (x, z, w, d) => [
  [x - w / 2, z - d / 2],
  [x + w / 2, z - d / 2],
  [x + w / 2, z + d / 2],
  [x - w / 2, z + d / 2],
];
function bounds(m, start) {
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return { start, count: m.data.length - start, lo, hi };
}
function planter(m, x, y, z, color = '#c0a58a') {
  m.cylinder(x, y, z, 0.15, 0.21, color, 14, 0.18, 'limewash');
  m.cylinder(x, y + 0.195, z, 0.183, 0.035, tint(color, 12), 16);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.8;
    m.rod(
      [x, y + 0.22, z],
      [x + Math.cos(a) * 0.18, y + 0.45 + (i % 2) * 0.07, z + Math.sin(a) * 0.18],
      0.018,
      '#668f62',
      6,
    );
    m.sphere(
      x + Math.cos(a) * 0.13,
      y + 0.43,
      z + Math.sin(a) * 0.13,
      0.09,
      0.045,
      0.055,
      '#82a268',
      10,
      5,
    );
  }
}
function seat(m, x, y, z, angle = 0, w = 0.65) {
  pose(m, x, y, z, angle, () => {
    for (const xx of [-w * 0.38, w * 0.38])
      m.box(xx - 0.02, 0, -0.09, 0.04, 0.3, 0.2, '#526d69', { metal: 0.2 });
    for (let i = 0; i < 4; i++)
      m.box(-w / 2, 0.3, -0.14 + i * 0.075, w, 0.035, 0.055, '#b69673', 'cedar');
    for (let i = 0; i < 3; i++)
      m.box(-w / 2, 0.38 + i * 0.065, -0.15, w, 0.045, 0.025, '#ad8965', 'cedar');
  });
}

/** Small terraced office buildings, rather than another apartment block.
 * The solid body, glazing, pergola and retaining skirt share one parcel. */
export function drawGardenOffice(m, p, terrain) {
  const start = m.data.length,
    a = p.rotation || 0,
    c = Math.cos(a),
    s = Math.sin(a),
    point = (x, z) => [p.x + x * c - z * s, p.z + x * s + z * c];
  const w = p.w - 0.12,
    d = p.d - 0.3,
    H = p.height || 2.15,
    back = -p.d / 2 + 0.07,
    front = back + d,
    poly = rect(0, 0, w, d).map(([x, z]) => point(x, z + (front + back) / 2));
  const base = Math.max(...poly.map((q) => terrain.height(...q))) + 0.045,
    palette = ['#b6c8bf', '#d5bea0', '#a5b9bd', '#c9ac9a'],
    paint = palette[Math.floor(p.seed * 7) % 4],
    trim = '#e7dfcf';
  pose(m, p.x, 0, p.z, a, () => {
    m.box(-w / 2, base, back, w, H, d, paint, p.seed > 0.5 ? 'limewash' : 'brick');
    const corners = [
      [-w / 2, back],
      [w / 2, back],
      [w / 2, front],
      [-w / 2, front],
    ];
    for (let i = 0; i < 4; i++) {
      const q = corners[i],
        r = corners[(i + 1) % 4],
        ground = (v) => terrain.height(...point(...v)) - 0.025;
      m.quad(
        [q[0], ground(q), q[1]],
        [r[0], ground(r), r[1]],
        [r[0], base, r[1]],
        [q[0], base, q[1]],
        tint(paint, -13),
        'stone',
      );
    }
    const levels = H > 2.3 ? 2 : 1,
      cols = Math.max(2, Math.floor(w / 0.65)),
      gap = w / cols;
    for (let level = 0; level < levels; level++)
      for (let i = 0; i < cols; i++) {
        const x = -w / 2 + i * gap + 0.08,
          y = base + 0.2 + level * 1.16;
        drawFacadeWindow(m, {
          plane: front + 0.012,
          along: x,
          y,
          w: gap - 0.16,
          h: level ? 0.69 : 0.94,
          style: 'storefront',
          seed: i + p.seed * 10,
          trim,
        });
        drawFacadeWindow(m, {
          plane: back - 0.012,
          along: x,
          y: y + 0.08,
          w: gap - 0.16,
          h: 0.61,
          far: true,
          style: 'office',
          seed: i + 9,
          trim,
        });
      }
    // Timber fins give the windows depth without covering their panes.
    for (let x = -w / 2 + 0.04; x < w / 2; x += gap)
      m.box(x, base + 0.16, front + 0.035, 0.035, H - 0.27, 0.13, '#9e7958', 'cedar');
    m.box(-w / 2 - 0.04, base + H - 0.08, back - 0.04, w + 0.08, 0.1, d + 0.08, trim, 'travertine');
    if (p.seed < 0.5) {
      const ridge = base + H + 0.27;
      m.quad(
        [-w / 2 - 0.04, base + H, back - 0.04],
        [w / 2 + 0.04, base + H, back - 0.04],
        [w / 2 + 0.04, ridge, front],
        [-w / 2 - 0.04, ridge, front],
        '#728b8a',
        'roof',
      );
      for (const x of [-w / 2, w / 2])
        m.tri([x, base + H, back], [x, ridge, front], [x, base + H, front], paint, 'limewash');
      for (let x = -w / 2 + 0.12; x < w / 2; x += 0.18)
        m.rod([x, base + H + 0.008, back - 0.04], [x, ridge + 0.008, front], 0.009, '#9cb0a9', 5);
      m.quad(
        [-w / 2, ridge - 0.16, front],
        [w / 2, ridge - 0.16, front],
        [w / 2, ridge, front],
        [-w / 2, ridge, front],
        '#9fc1c0',
        { window: 0.07 },
      );
    } else {
      m.box(-w / 2, base + H, back, w, 0.045, d, '#739485', 'roof');
      for (const x of [-w / 2 + 0.08, w / 2 - 0.12])
        m.box(x, base + H + 0.03, back + 0.05, 0.045, 0.16, d - 0.1, '#b7c4b5', 'stone');
      m.box(-w / 2 + 0.12, base + H + 0.04, back + 0.16, 0.4, 0.24, 0.38, '#849997', {
        metal: 0.2,
      });
      for (let i = 0; i < 6; i++)
        m.box(
          -w / 2 + 0.14,
          base + H + 0.08 + i * 0.026,
          back + 0.551,
          0.36,
          0.012,
          0.012,
          '#bac7bf',
        );
      m.rod(
        [-0.05, base + H + 0.06, back + 0.35],
        [0.2, base + H + 0.06, back + 0.35],
        0.035,
        '#aab8b0',
        10,
        { metal: 0.3 },
      );
      planter(m, w / 2 - 0.28, base + H + 0.06, front - 0.25, '#c3aa87');
    }
    // A projecting, slatted entrance canopy and a complete glazed door.
    const awningY = base + 1.12;
    for (const x of [-w * 0.35, w * 0.35])
      m.rod([x, base, front + 0.18], [x, awningY, front + 0.18], 0.022, '#6c8174', 8);
    for (let i = 0; i < 7; i++)
      m.box(
        -w * 0.45 + i * w * 0.13,
        awningY,
        front + 0.01,
        0.045,
        0.045,
        0.28,
        '#a38c66',
        'cedar',
      );
    m.box(-0.14, base + 0.02, front + 0.045, 0.28, 0.92, 0.035, '#4f7473');
    m.box(-0.105, base + 0.18, front + 0.084, 0.21, 0.68, 0.012, '#9cb9b4', { window: 0.06 });
    m.rod([0.09, base + 0.39, front + 0.1], [0.09, base + 0.57, front + 0.1], 0.012, '#cabd8d', 8);
  });
  return {
    ...p,
    ...bounds(m, start),
    kind: 'neighborhood-shop',
    base,
    footprint: poly,
    navigationPolygons: [poly],
    neighborLine:
      'We keep the courtyard open and the meetings short. The redwood siding is doing most of the recruiting.',
    description:
      'A garden office with recessed glass, redwood sunshades, planted terraces and a carefully fitted stone base.',
  };
}

export function drawSouthBayPublicSpaces(m, { terrain, tree }) {
  const sites = [],
    people = [],
    p = BAYVIEW_COMMON,
    start = m.data.length,
    footprint = [
      [p.west, p.north],
      [p.east, p.north],
      [p.east, p.south],
      [p.west, p.south],
    ],
    obstacles = [];
  drawCraftGround(
    m,
    terrain,
    [
      [59.2, p.north],
      [59.8, p.north],
      [59.8, p.south],
      [59.2, p.south],
    ],
    '#c5bda2',
    'herringbone',
  );
  drawCraftGround(
    m,
    terrain,
    [
      [p.west, 102.23],
      [p.east, 102.23],
      [p.east, 102.77],
      [p.west, 102.77],
    ],
    '#c5bda2',
    'herringbone',
  );
  // Planting beds stay off the north–south and east–west park paths.
  for (const [x, z] of [
    [57.85, 100.85],
    [61.1, 100.85],
    [57.85, 104.05],
    [61.1, 104.1],
  ]) {
    tree(x - 0.5, z - 0.5, false, true);
  }
  for (const [x, z, color] of [
    [58.05, 101.5, '#c89782'],
    [60.95, 103.6, '#afa883'],
  ]) {
    const y = terrain.height(x, z);
    m.box(x - 0.27, y + 0.01, z - 0.34, 0.54, 0.12, 0.68, color, 'stone');
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI * 0.75,
        xx = x + Math.cos(a) * 0.18,
        zz = z + Math.sin(a) * 0.22;
      m.sphere(xx, y + 0.19, zz, 0.1, 0.08, 0.1, '#739761', 10, 5);
      m.sphere(xx, y + 0.26, zz, 0.04, 0.04, 0.035, i % 2 ? '#d89b88' : '#c7b873', 8, 4);
    }
    obstacles.push(rect(x, z, 0.6, 0.75));
  }
  for (const [x, z, a] of [
    [58.1, 103.5, -Math.PI / 2],
    [60.85, 101.6, Math.PI / 2],
  ]) {
    seat(m, x, terrain.height(x, z) + 0.02, z, a, 0.78);
    obstacles.push(rect(x, z, 0.4, 0.85));
  }
  const cx = 60.65,
    cz = 103.65,
    base = terrain.height(cx, cz);
  m.cylinder(cx, base, cz, 0.26, 0.18, '#c8c4ae', 20, 0.28, 'travertine');
  m.cylinder(cx, base + 0.18, cz, 0.31, 0.06, '#c8c4ae', 24, 0.31, 'travertine');
  m.cylinder(cx, base + 0.24, cz, 0.245, 0.007, '#8db5ab', 24, 0.245, { water: 2 });
  m.sphere(cx, base + 0.33, cz, 0.045, 0.1, 0.045, '#b3cec2', 12, 7, { metal: 0.2 });
  obstacles.push(rect(cx, cz, 0.68, 0.68));
  sites.push({
    ...p,
    ...bounds(m, start),
    base: terrain.height(59.5, 102.5),
    kind: 'neighborhood-garden',
    minimapColor: '#83a374',
    footprint,
    navigationPolygons: obstacles,
    alwaysPopulated: true,
    neighborLine:
      'The bench in the afternoon sun is the best seat in Bayview. Please tell absolutely nobody.',
    description:
      'A neighborhood common with shade trees, flower beds, cedar benches, a drinking fountain and paths linking all four sides.',
  });
  const c = AIRPORT_GARDEN_DISTRICT;
  for (const z of [96.75, 99.7, 104.15])
    drawCraftGround(
      m,
      terrain,
      [
        [c.west, z - 0.21],
        [c.east, z - 0.21],
        [c.east, z + 0.21],
        [c.west, z + 0.21],
      ],
      '#c7bda5',
      'herringbone',
    );
  for (const [x, z] of [
    [75.7, 97.0],
    [80.45, 97.0],
    [75.65, 103.85],
    [80.45, 104.0],
  ])
    tree(x - 0.5, z - 0.5, true, true);
  for (const office of AIRPORT_GARDEN_OFFICES) sites.push(drawGardenOffice(m, office, terrain));
  for (const [i, [x, z, line]] of [
    [59.5, 101.5, 'A park is a perfectly good reason to take the long way home.'],
    [59.9, 102.5, 'I come here to do absolutely nothing, very thoroughly.'],
    [
      78.1,
      99.7,
      'These offices used to be a row of houses by the airport. The commute is now a courtyard.',
    ],
  ].entries())
    people.push({
      id: 'bayview-garden-neighbor-' + i,
      label: i % 2 ? 'Man' : 'Woman',
      x,
      z,
      neighborhood: true,
      neighborLine: line,
      skin: ['#a77b59', '#c9a17f', '#8f654c'][i],
      shirt: ['#9b8cb4', '#70988b', '#ba9277'][i],
      hair: '#453a32',
      female: i % 2 === 0,
      longHair: i % 2 === 0,
      height: 1.85,
      regional: true,
      angle: i,
    });
  return { sites, people };
}
