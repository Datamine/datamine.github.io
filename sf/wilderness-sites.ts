// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { TERMINATOR_FACTORY } from './encounter-layout.ts';
import { westernCoastX } from './coastline.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

/** Authored encounter locations, shared by the server and browser. The outlaw
 * stays off the main road; the pirate occupies a beach beyond the lake woods. */
export const TERMINATOR_SITE = Object.freeze({
  id: 'abandoned-factory-terminator',
  combatKind: 'terminator',
  x: TERMINATOR_FACTORY.x,
  z: TERMINATOR_FACTORY.z,
});
export const LANDSHARK_SITE = Object.freeze({
  id: 'ocean-beach-landshark',
  combatKind: 'landshark',
  x: westernCoastX(70) + 1.5,
  z: 70,
});
export const OUTLAW_SITE = Object.freeze({
  id: 'south-grove-outlaw',
  combatKind: 'outlaw',
  x: 14.5,
  z: 219.5,
});
export const BISON_SITE = Object.freeze({
  id: 'golden-gate-park-bison',
  combatKind: 'bison',
  x: 22.5,
  z: 45.3,
});
export const LOST_PIRATE_SITE = Object.freeze({
  id: 'lost-pirate',
  combatKind: 'lost-pirate',
  x: westernCoastX(195.3) + 0.8,
  z: 195.3,
});
export const PIRATE_WRECK = Object.freeze({
  x: westernCoastX(192.2) + 0.18,
  z: 192.2,
  angle: 0.14,
  entry: Object.freeze({ x: LOST_PIRATE_SITE.x - 0.5, y: 195.9 }),
});

/** A listing hull, exposed ribs, snapped mast and ragged sail. This is a
 * native static mesh; its hull and salvage crates share collision footprints. */
export function drawPirateWreck(m: Mesh, ground: (x: number, z: number) => number) {
  const start = m.data.length,
    p = PIRATE_WRECK,
    base = Math.min(0.14, ground(p.x, p.z)),
    polygons = [];
  const at = (x: number, z: number) =>
    [
      p.x + x * Math.cos(p.angle) - z * Math.sin(p.angle),
      p.z + x * Math.sin(p.angle) + z * Math.cos(p.angle),
    ] satisfies [number, number];
  const rect = (x: number, z: number, w: number, d: number) =>
    [
      [x - w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z + d / 2] satisfies [number, number],
      [x - w / 2, z + d / 2] satisfies [number, number],
    ].map(([u, v]) => at(u, v));
  const stations = [
    [-2.15, 0.055] satisfies [number, number],
    [-1.65, 0.39] satisfies [number, number],
    [-0.7, 0.62] satisfies [number, number],
    [0.55, 0.64] satisfies [number, number],
    [1.5, 0.43] satisfies [number, number],
    [2.15, 0.045] satisfies [number, number],
  ];
  pose(m, p.x, base, p.z, p.angle, () => {
    for (let i = 1; i < stations.length; i++) {
      const [za, wa] = stations[i - 1],
        [zb, wb] = stations[i];
      for (const side of [-1, 1] satisfies [number, number]) {
        const tilt = side * 0.1;
        for (let board = 0; board < 4; board++) {
          const low = -0.22 + board * 0.165,
            high = low + 0.15;
          const a = [side * wa * (0.55 + board * 0.14), low + tilt, za] satisfies [
              number,
              number,
              number,
            ],
            b = [side * wb * (0.55 + board * 0.14), low + tilt, zb] satisfies [
              number,
              number,
              number,
            ],
            c = [b[0] + side * 0.025, high + tilt, zb] satisfies [number, number, number],
            d = [a[0] + side * 0.025, high + tilt, za] satisfies [number, number, number];
          m.quad(
            ...(side > 0 ? ([a, b, c, d] as const) : ([b, a, d, c] as const)),
            (
              ['#78634d', '#998267', '#8b7258', '#ab9374'] satisfies [
                string,
                string,
                string,
                string,
              ]
            )[(i + board) % 4],
            'cedar',
          );
        }
        m.rod(
          [side * wa, 0.43 + tilt, za] satisfies [number, number, number],
          [side * wb, 0.43 + tilt, zb] satisfies [number, number, number],
          0.033,
          '#b39b76',
          7,
          'wood',
        );
      }
    }
    // Broken floorboards leave the weathered frames visible beneath.
    for (let i = 0; i < 15; i++) {
      const z = -1.55 + i * 0.22,
        w = Math.max(0.12, 0.54 - Math.abs(z) * 0.15);
      if (i % 5 !== 2)
        m.box(
          -w,
          0.14,
          z,
          w * (i % 4 === 0 ? 1.15 : 2),
          0.055,
          0.19,
          i % 3 ? '#a58e6b' : '#8b775d',
          'cedar',
        );
    }
    for (const [z, w] of stations.slice(1, -1))
      for (const side of [-1, 1] satisfies [number, number])
        m.rod(
          [side * w * 0.45, -0.12, z] satisfies [number, number, number],
          [side * w, 0.64 + side * 0.1, z] satisfies [number, number, number],
          0.035,
          '#c2a77e',
          7,
          'wood',
        );
    m.rod(
      [0, 0.18, -0.45] satisfies [number, number, number],
      [-0.26, 1.66, -0.24] satisfies [number, number, number],
      0.065,
      '#8d7253',
      10,
      'wood',
    );
    m.rod(
      [-0.26, 1.66, -0.24] satisfies [number, number, number],
      [-0.36, 1.94, -0.18] satisfies [number, number, number],
      0.047,
      '#b89b72',
      8,
      'wood',
    );
    m.rod(
      [-0.45, 0.3, 0.15] satisfies [number, number, number],
      [-1.2, 0.07, 1.9] satisfies [number, number, number],
      0.052,
      '#8d7253',
      9,
      'wood',
    );
    m.rod(
      [-0.94, 1.38, -0.25] satisfies [number, number, number],
      [0.48, 1.53, -0.25] satisfies [number, number, number],
      0.03,
      '#9e8463',
      8,
      'wood',
    );
    for (const [a, b, c] of [
      [
        [-0.9, 1.38, -0.25] satisfies [number, number, number],
        [-0.3, 1.45, -0.25] satisfies [number, number, number],
        [-0.7, 0.64, -0.14] satisfies [number, number, number],
      ],
      [
        [-0.3, 1.45, -0.25] satisfies [number, number, number],
        [0.45, 1.53, -0.25] satisfies [number, number, number],
        [0.22, 0.85, -0.14] satisfies [number, number, number],
      ],
      [
        [-0.3, 1.45, -0.25] satisfies [number, number, number],
        [0.22, 0.85, -0.14] satisfies [number, number, number],
        [-0.23, 0.96, -0.13] satisfies [number, number, number],
      ],
    ]) {
      m.tri(a, b, c, '#d0c2a1', 'canvasWeave');
      m.tri(c, b, a, '#baad8d', 'canvasWeave');
    }
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [-0.26, 1.63, -0.24] satisfies [number, number, number],
        [side * 0.48, 0.35, 1.3] satisfies [number, number, number],
        0.009,
        '#bba783',
        5,
        'wood',
      );
    // A barrel and split crate sit on the dry side of the stranded bow.
    const barrelBase = ground(...at(0.95, 1.12)) - base + 0.015,
      crateBase = ground(...at(0.84, -1.03)) - base + 0.015;
    m.cylinder(0.95, barrelBase, 1.12, 0.19, 0.44, '#9e825e', 16, 0.17, 'cedar');
    for (const y of [0.08, 0.33] satisfies [number, number])
      m.cylinder(0.95, barrelBase + y, 1.12, 0.195, 0.035, '#66716d', 16, 0.195, { metal: 0.2 });
    m.box(0.63, crateBase, -1.25, 0.42, 0.32, 0.45, '#a48d69', 'cedar');
    m.rod(
      [0.65, crateBase + 0.045, -0.78] satisfies [number, number, number],
      [1.02, crateBase + 0.265, -0.78] satisfies [number, number, number],
      0.018,
      '#c8b48b',
      5,
      'wood',
    );
    m.rod(
      [-0.5, 0.09, -1.6] satisfies [number, number, number],
      [-0.67, 0.08, -2.12] satisfies [number, number, number],
      0.018,
      '#677d7b',
      8,
      { metal: 0.25 },
    );
    m.rod(
      [-0.67, 0.08, -2.12] satisfies [number, number, number],
      [-0.88, 0.08, -1.98] satisfies [number, number, number],
      0.024,
      '#677d7b',
      8,
      { metal: 0.25 },
    );
    m.rod(
      [-0.67, 0.08, -2.12] satisfies [number, number, number],
      [-0.42, 0.08, -2.03] satisfies [number, number, number],
      0.024,
      '#677d7b',
      8,
      { metal: 0.25 },
    );
  });
  polygons.push(
    stations
      .map(([z, w]) => at(-w - 0.05, z))
      .concat(
        stations
          .slice()
          .reverse()
          .map(([z, w]) => at(w + 0.05, z)),
      ),
    rect(0.95, 1.12, 0.42, 0.42),
    rect(0.84, -1.03, 0.46, 0.5),
  );
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return {
    id: 'lost-pirate-wreck',
    kind: 'shipwreck',
    label: contentText('wilderness-sites.drawPirateWreck.label-1', {}),
    entry: { ...p.entry },
    description: contentText('wilderness-sites.drawPirateWreck.description-2', {}),
    start,
    count: m.data.length - start,
    lo,
    hi,
    navigationPolygons: polygons,
    footprint: polygons[0],
  };
}
