import { pose, cutawayWallMask, rayTriangle } from './geometry.js';
function nightlifePlaque(m, signs, x, y, z) {
  const uv = signs.get('NIGHTLIFE');
  if (uv)
    m.quad(
      [x - 1.325, y, z],
      [x + 1.325, y, z],
      [x + 1.325, y + 0.3, z],
      [x - 1.325, y + 0.3, z],
      '#d7b7e9',
      uv,
    );
}

export const NIGHTLIFE = Object.freeze({
  x: 59.4,
  z: 90.5,
  w: 4,
  d: 3.7,
  entry: { x: 58.9, y: 92.5 },
  inside: { x: 58.9, y: 90.7 },
});
export function inNightlife(x, z) {
  const n = NIGHTLIFE;
  return Math.abs(x - n.x) < n.w / 2 && Math.abs(z - n.z) < n.d / 2;
}
export function nightlifeAccess(x, z) {
  return (
    (x >= 57.4 && x <= 61.4 && z >= 88.65 && z <= 92.35) ||
    (x >= 59.05 && x <= 59.75 && z >= 92.35 && z <= 93.8)
  );
}
export function nightlifeWalkable(x, z) {
  return (
    (x >= 57.72 && x <= 61.08 && z >= 89.6 && z <= 92.03) ||
    (x >= 59.05 && x <= 59.75 && z >= 92.03 && z <= 93.8)
  );
}
export const NIGHTLIFE_ROUTE_NODES = Object.freeze(
  [
    [59.4, 93.5],
    [59.4, 92],
    [59.4, 91.2],
    [58.2, 90.5],
    [60.6, 90.5],
  ].map(([x, z]) => Object.freeze({ x: x - 0.5, y: z - 0.5 })),
);
export function nightlifeHeight(x, z, base, ground) {
  const t = Math.max(0, Math.min(1, (z - 92.35) / 1.15));
  return base + (ground(x, 93.5) - base) * t;
}
export function nightlifeRebuff(gender) {
  return gender === 'woman' ? 'I have a girlfriend.' : 'I have a boyfriend.';
}

export function buildNightlife(m, terrain) {
  const n = NIGHTLIFE,
    start = m.data.length,
    base = terrain.naturalHeight(n.x, 92.6) + 0.12;
  terrain.cutPlot({ cx: n.x, cz: n.z, w: n.w, d: n.d, height: base - 0.035, onlyLower: true });
  let low = base - 0.12;
  for (const x of [57.4, 59.4, 61.4])
    for (const z of [88.65, 90.5, 92.35])
      low = Math.min(low, terrain.height(x, z) - 0.08, terrain.naturalHeight(x, z) - 0.08);
  m.box(57.4, low, 88.65, 4, base - low, 3.7, '#8e8b93', 'stone');
  const ramp = [
    [59.05, base, 92.35],
    [59.75, base, 92.35],
    [59.75, terrain.height(59.75, 93.5) + 0.01, 93.5],
    [59.05, terrain.height(59.05, 93.5) + 0.01, 93.5],
  ];
  m.quad(ramp[0], ramp[3], ramp[2], ramp[1], '#8e8b93', 'stone');
  const diners = [
    { label: 'Man', x: 58.3, z: 90.3, skin: '#a77a5b', shirt: '#758db8' },
    { label: 'Woman', x: 60.5, z: 90.3, skin: '#bd8b6b', shirt: '#c187bb' },
  ].map((p, i) => ({
    ...p,
    id: 'nightlife-patron-' + i,
    club: true,
    base: base + 0.025,
    height: 1.85,
    angle: i ? Math.PI : 0,
    index: i,
    seed: 0.24 + i * 0.4,
    hold: 0,
  }));
  return {
    sight: {
      id: 'nightlife',
      kind: 'nightlife',
      label: 'Nightlife',
      entry: { ...n.entry },
      inside: { ...n.inside },
      description:
        'A little nightclub in the South Mission, two blocks north of its former home. Mirror ball, colored dance floor, and two regulars with very firm relationship boundaries.',
      base,
      start,
      count: m.data.length - start,
      lo: [57.4, low, 88.65],
      hi: [61.4, base + 2.8, 92.35],
    },
    diners,
  };
}

export function drawNightlife(m, site, signs, eye, time, { inside = false, reduced = false } = {}) {
  const n = NIGHTLIFE,
    mask = inside ? cutawayWallMask({ x: 57.4, y: 88.65, w: 4, d: 3.7 }, eye) : 0;
  pose(m, n.x, site.base, n.z, 0, () => {
    m.box(-2, 0, -1.85, 4, 0.035, 3.7, '#413b51');
    for (let x = 0; x < 6; x++)
      for (let z = 0; z < 4; z++) {
        const color = ['#9b789f', '#648d9f', '#ad9d72', '#788bae'][(x + z) % 4];
        m.box(-1.8 + x * 0.6, 0.036, -0.82 + z * 0.67, 0.56, 0.008, 0.63, color, {
          emissive: 0.12,
        });
      }
    for (let side = 0; side < 4; side++) {
      if (mask & (1 << side)) continue;
      if (side === 0) m.box(-2, 0, -1.85, 4, 2.6, 0.12, '#564d69', 'brick');
      if (side === 1) {
        m.box(-2, 0, 1.73, 1.45, 2.6, 0.12, '#564d69', 'brick');
        m.box(0.55, 0, 1.73, 1.45, 2.6, 0.12, '#564d69', 'brick');
        m.box(-0.55, 2, 1.73, 1.1, 0.6, 0.12, '#564d69', 'brick');
        nightlifePlaque(m, signs, 0, 2.14, 1.875);
      }
      if (side >= 2) m.box(side === 2 ? -2 : 1.88, 0, -1.85, 0.12, 2.6, 3.7, '#564d69', 'brick');
    }
    if (!inside) m.box(-2.07, 2.6, -1.92, 4.14, 0.14, 3.84, '#6e6680', 'roof');
    // DJ counter, twin turntables and a tiny mixer, safely behind the floor.
    m.box(-1.65, 0.04, -1.64, 3.3, 0.68, 0.62, '#34384a', 'wood');
    m.box(-1.68, 0.72, -1.67, 3.36, 0.07, 0.68, '#8c849e');
    for (const x of [-0.95, 0.95]) {
      m.cylinder(x, 0.8, -1.35, 0.24, 0.035, '#242c35', 24);
      m.cylinder(x, 0.837, -1.35, 0.07, 0.008, '#bca7be', 16);
    }
    for (let i = 0; i < 6; i++)
      m.box(-0.27 + i * 0.09, 0.8, -1.5, 0.025, 0.04, 0.21, i % 2 ? '#b4b6af' : '#765e8a');
    for (const x of [-1.75, 1.4]) {
      m.box(x, 0.1, -1.52, 0.35, 1.1, 0.4, '#262d37');
      for (const y of [0.37, 0.89])
        m.sphere(x + 0.175, y, -1.105, 0.12, 0.12, 0.018, '#687280', 16, 8);
    }
    m.rod([0, 2.6, 0], [0, 2.48, 0], 0.012, '#b4bec6', 6);
    pose(m, 0, 2.26, 0, reduced ? 0 : time * 0.0003, () => {
      m.sphere(0, 0, 0, 0.22, 0.22, 0.22, '#d0d8dd', 20, 12, { metal: 0.75 });
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        m.box(
          Math.cos(a) * 0.21 - 0.025,
          -0.025,
          Math.sin(a) * 0.21 - 0.025,
          0.05,
          0.05,
          0.05,
          i % 2 ? '#b2cbd8' : '#e6d5e5',
          { emissive: 0.18 },
        );
      }
    });
    for (const [x, color] of [
      [-1.65, '#b18ab9'],
      [1.65, '#6ba9b9'],
    ]) {
      m.box(x - 0.12, 2.3, -0.8, 0.24, 0.12, 0.24, '#343342');
      m.sphere(x, 2.28, -0.8, 0.07, 0.025, 0.07, color, 12, 6, { emissive: 0.55 });
    }
  });
}

export function raycastNightlife(ray, site, ground) {
  const floor = [
      [57.4, site.base, 88.65],
      [57.4, site.base, 92.35],
      [61.4, site.base, 92.35],
      [61.4, site.base, 88.65],
    ],
    ramp = [
      [59.05, site.base, 92.35],
      [59.05, ground(59.05, 93.5) + 0.01, 93.5],
      [59.75, ground(59.75, 93.5) + 0.01, 93.5],
      [59.75, site.base, 92.35],
    ];
  let distance = Infinity;
  for (const q of [floor, ramp])
    for (const tri of [
      [q[0], q[1], q[2]],
      [q[0], q[2], q[3]],
    ]) {
      const t = rayTriangle(ray, ...tri);
      if (t !== null) distance = Math.min(distance, t);
    }
  return Number.isFinite(distance)
    ? { distance, point: ray.origin.map((v, i) => v + ray.dir[i] * distance) }
    : null;
}

/** The city graph uses the same walls and DJ exclusion as the club floor. */
export function nightlifeObstacles() {
  const n = NIGHTLIFE,
    x = n.x - n.w / 2,
    z = n.z - n.d / 2;
  return [
    [x, z, n.w, 0.12],
    [x, z, 0.12, n.d],
    [x + n.w - 0.12, z, 0.12, n.d],
    [x, z + n.d - 0.12, 1.45, 0.12],
    [x + 2.55, z + n.d - 0.12, 1.45, 0.12],
    [x + 0.35, z + 0.15, 3.3, 0.85],
  ].map(([x, z, w, d], i) => ({
    id: 'nightlife-wall-' + i,
    polygon: [
      [x, z],
      [x + w, z],
      [x + w, z + d],
      [x, z + d],
    ],
  }));
}
