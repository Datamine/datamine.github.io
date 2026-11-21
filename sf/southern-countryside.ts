import type { HeightTerrain, PlantTree } from './types/scenery.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { makeNeighborhoodBench } from './neighborhood-interactions.ts';
import {
  SOUTHERN_LAKE,
  SOUTHERN_MAP_END,
  SOUTHERN_COUNTRY_HOMES,
  inSouthernLake,
} from './southern-countryside-layout.ts';
import {
  inSouthernHousePlot,
  inSearchHousePlot,
  southernTrailDistance,
} from './southern-layout.ts';
import { researchCampusAt } from './research-layout.ts';
import { COW_PEN, inCowPen } from './jurassic-layout.ts';
import { inSaltFlats } from './salt-layout.ts';
import { drawFacadeWindow } from './windows.ts';
import type { Mesh } from './geometry.ts';
import { rand, pose } from './geometry.ts';

const countryRect = (x: number, z: number, w: number, d: number) => [
  [x - w / 2, z - d / 2] satisfies [number, number],
  [x + w / 2, z - d / 2] satisfies [number, number],
  [x + w / 2, z + d / 2] satisfies [number, number],
  [x - w / 2, z + d / 2] satisfies [number, number],
];

/** Modest landscape details, deliberately leaving real clearings between
 * neighborhoods. No new businesses or quest buildings occupy the green belt. */
export function drawSouthernCountryside(
  m: Mesh,
  {
    terrain,
    tree,
    roadDistance,
  }: { terrain: HeightTerrain; tree: PlantTree; roadDistance: (x: number, z: number) => number },
) {
  const start = m.data.length,
    solids = [],
    people = [],
    seats: ReturnType<typeof makeNeighborhoodBench>[] = [],
    lake = SOUTHERN_LAKE;
  function seat(x: number, z: number, angle: number) {
    const base = terrain.height(x, z) + 0.025,
      seatStart = m.data.length;
    pose(m, x, base, z, angle, () => {
      for (const xx of [-0.34, 0.34] satisfies [number, number])
        for (const zz of [-0.12, 0.12] satisfies [number, number])
          m.box(xx - 0.02, 0, zz - 0.02, 0.04, 0.38, 0.04, '#648174', { metal: 0.2 });
      for (let i = 0; i < 4; i++)
        m.box(-0.48, 0.38, -0.16 + i * 0.09, 0.96, 0.045, 0.065, '#c3a275', 'cedar');
      for (let i = 0; i < 3; i++)
        m.box(-0.48, 0.48 + i * 0.09, -0.19, 0.96, 0.055, 0.04, '#b39062', 'cedar');
    });
    seats.push(
      makeNeighborhoodBench({
        id: 'country-bench-' + seats.length,
        x,
        z,
        angle,
        base,
        height: 0.425,
        start: seatStart,
        count: m.data.length - seatStart,
      }),
    );
    solids.push(
      countryRect(
        x,
        z,
        Math.abs(Math.sin(angle)) > 0.5 ? 0.45 : 1.05,
        Math.abs(Math.sin(angle)) > 0.5 ? 1.05 : 0.45,
      ),
    );
  }
  // A weatherboard barn, rain barrel and hay store anchor the meadow.
  const barn = { x: 43.5, z: COW_PEN.z, w: 2.4, d: 2.7 },
    floor = terrain.height(barn.x, barn.z);
  pose(m, barn.x, floor, barn.z, 0, () => {
    m.box(-1.2, -0.04, -1.35, 2.4, 0.1, 2.7, '#b8ae91', 'stone');
    m.box(-1.16, 0.06, -1.3, 2.32, 1.55, 2.6, '#a57a61', 'cedar');
    for (const x of [-1.14, 0, 1.1] satisfies [number, number, number])
      m.box(x, 0.06, 1.31, 0.045, 1.55, 0.045, '#dfcba7', 'wood');
    m.box(-0.48, 0.08, 1.325, 0.96, 1.33, 0.04, '#536d60', 'cedar');
    m.rod(
      [-0.43, 0.12, 1.38] satisfies [number, number, number],
      [0.43, 1.34, 1.38] satisfies [number, number, number],
      0.022,
      '#c4b494',
      4,
    );
    for (const side of [-1, 1] satisfies [number, number]) {
      m.quad(
        [side * 1.3, 1.64, -1.45] satisfies [number, number, number],
        [side * 1.3, 1.64, 1.45] satisfies [number, number, number],
        [0, 2.33, 1.45] satisfies [number, number, number],
        [0, 2.33, -1.45] satisfies [number, number, number],
        side < 0 ? '#738878' : '#60786d',
        'shingles',
      );
      m.tri(
        [-1.16, 1.61, side * 1.3] satisfies [number, number, number],
        [1.16, 1.61, side * 1.3] satisfies [number, number, number],
        [0, 2.27, side * 1.3] satisfies [number, number, number],
        '#b48b6c',
        'cedar',
      );
    }
    drawFacadeWindow(m, {
      isX: true,
      plane: 1.175,
      along: -0.5,
      y: 0.67,
      w: 0.72,
      h: 0.55,
      trim: '#e4d5b6',
      seed: 3,
    });
    m.cylinder(1.52, 0, 0.8, 0.25, 0.58, '#7a9288', 16, 0.24, { metal: 0.12 });
    for (let i = 0; i < 3; i++)
      m.box(-1.05 + i * 0.39, 0.08, -1.8, 0.35, 0.36, 0.4, '#ccb77a', 'wood');
  });
  solids.push(
    countryRect(barn.x, barn.z, 2.5, 2.8),
    countryRect(barn.x + 1.52, barn.z + 0.8, 0.6, 0.6),
    countryRect(barn.x - 0.65, barn.z - 1.6, 1.3, 0.7),
  );
  // Reeds follow the actual water edge; no textured square is placed below.
  for (let i = 0; i < 42; i++) {
    const a = (i * Math.PI * 2) / 42,
      x = lake.x + Math.cos(a) * (lake.rx + 0.16),
      z = lake.z + Math.sin(a) * (lake.rz + 0.16);
    if (southernTrailDistance(x, z) < 0.6) continue;
    const y = terrain.height(x, z);
    for (let j = 0; j < 3; j++) {
      const xx = x + (j - 1) * 0.08,
        top = [xx + 0.04, y + 0.28 + rand(i, j) * 0.18, z + 0.03];
      m.rod([xx, y, z], top, 0.009, i % 3 ? '#829b68' : '#a3a27a', 5);
      if (j === 1) m.rod(top, [top[0], top[1] + 0.08, top[2]], 0.022, '#8b7254', 6);
    }
    if (i % 4 === 0) m.sphere(x, y + 0.04, z, 0.18, 0.1, 0.14, '#a4aa95', 10, 5, 'stone');
  }
  seat(38.7, 188.6, Math.PI / 2);
  seat(32, 183.4, Math.PI);
  seat(29.8, 192.2, 0);
  seat(58.1, 209, -Math.PI / 2);
  seat(39.3, 206.9, 0);
  seat(30.6, 228.5, Math.PI);
  seat(35.5, 230.5, Math.PI / 2);
  seat(59, 235.8, Math.PI / 2);

  const groves = [
    [72.1, 185.5, 1.2, 1.6] satisfies [number, number, number, number],
    [77, 189, 0.7, 1.5] satisfies [number, number, number, number],
    [16.4, 185.5, 2.8, 7] satisfies [number, number, number, number],
    [16.2, 201.7, 2.8, 10] satisfies [number, number, number, number],
    [36, 180, 5, 1.8] satisfies [number, number, number, number],
    [44, 177.8, 3.5, 2] satisfies [number, number, number, number],
    [46.5, 193, 4, 1] satisfies [number, number, number, number],
    [48.5, 207.5, 4.7, 1.8] satisfies [number, number, number, number],
    [75.5, 200.1, 2.5, 3.5] satisfies [number, number, number, number],
    [32.8, 207.8, 5.5, 1.1] satisfies [number, number, number, number],
    [15.5, 225, 1.6, 10] satisfies [number, number, number, number],
    [31.6, 229.5, 4.5, 2.7] satisfies [number, number, number, number],
    [49.7, 220.5, 1.1, 5] satisfies [number, number, number, number],
    [49.8, 232, 1.1, 4] satisfies [number, number, number, number],
    [71.5, 219.5, 5.4, 1.1] satisfies [number, number, number, number],
    [58.8, 231.5, 0.6, 3.5] satisfies [number, number, number, number],
    [76.5, 229.7, 3.7, 1.3] satisfies [number, number, number, number],
  ];
  const trees: { x: number; z: number }[] = [];
  for (let i = 0; i < 320; i++) {
    const [cx, cz, rx, rz] = groves[i % groves.length],
      a = rand(i, 91) * Math.PI * 2,
      r = Math.sqrt(rand(i, 28)),
      x = cx + Math.cos(a) * r * rx,
      z = cz + Math.sin(a) * r * rz;
    if (
      inSearchHousePlot(x, z, 0.9) ||
      x < 13.6 ||
      z > SOUTHERN_MAP_END - 1 ||
      inSouthernLake(x, z, 0.8) ||
      inSaltFlats(x, z, 0.6) ||
      researchCampusAt(x, z) ||
      inCowPen(x, z, 1) ||
      inSouthernHousePlot(x, z, 0.6) ||
      roadDistance(x, z) < 1.35 ||
      southernTrailDistance(x, z) < 0.72 ||
      solids.some(
        (p) => x > p[0][0] - 0.6 && x < p[2][0] + 0.6 && z > p[0][1] - 0.6 && z < p[2][1] + 0.6,
      ) ||
      trees.some((p) => Math.hypot(p.x - x, p.z - z) < 0.85)
    )
      continue;
    tree(x - 0.5, z - 0.5, i % 3 !== 0, true);
    trees.push({ x, z });
  }
  // Small orchards sit behind homes, with fruit rather than more buildings.
  for (const [x, z] of [
    [29.3, 199] satisfies [number, number],
    [29.3, 201.3] satisfies [number, number],
    [30.8, 199] satisfies [number, number],
    [30.8, 201.3] satisfies [number, number],
    [39.3, 208.1] satisfies [number, number],
    [40.7, 208.1] satisfies [number, number],
  ]) {
    if (
      inSearchHousePlot(x, z, 0.9) ||
      inSouthernHousePlot(x, z, 0.45) ||
      roadDistance(x, z) < 1.3 ||
      southernTrailDistance(x, z) < 0.7
    )
      continue;
    tree(x - 0.5, z - 0.5, 3, true);
    trees.push({ x, z });
  }
  const neighbors = [
    [
      72,
      188.5,
      'We are restoring the oak grove. The small green visitor insists these are very short redwoods.',
    ] satisfies [number, number, string],
    [
      76,
      185.5,
      'He says he walked here from Mount Tam. I think he has been holding the map upside down.',
    ] satisfies [number, number, string],
    [
      41,
      191,
      'We take the long way around the lake. The short way requires substantially better shoes.',
    ] satisfies [number, number, string],
    [48.7, 192, 'The cows have the nicest commute in the entire Bay Area.'] satisfies [
      number,
      number,
      string,
    ],
    [
      26.7,
      205.1,
      'A little orchard, a little porch, and absolutely no plans to turn either into a platform.',
    ] satisfies [number, number, string],
    [
      59.5,
      207.8,
      'The institutes disagree about consciousness. They agree that the walk here is lovely.',
    ] satisfies [number, number, string],
    [
      73,
      193.8,
      'There is a proper highway now. I still prefer the neighborhood streets.',
    ] satisfies [number, number, string],
    [
      40.7,
      211.8,
      'The roof is low, the garden is large, and the garage actually contains a car.',
    ] satisfies [number, number, string],
    [28, 226, 'The city did not end. It just acquired more front porches.'] satisfies [
      number,
      number,
      string,
    ],
    [
      37.8,
      230,
      'We argued about the neighborhood park for months. Now we argue about whose turn it is to water it.',
    ] satisfies [number, number, string],
    [
      49.7,
      226.7,
      'That little row of flats is new. The stained glass is a very old idea.',
    ] satisfies [number, number, string],
    [
      32.45,
      224.9,
      'The institutes share a path now. They are still arguing about whether it leads anywhere.',
    ] satisfies [number, number, string],
    [
      75,
      236.5,
      'The high street has a bakery, the lane has a garden, and this is an extremely satisfactory arrangement.',
    ] satisfies [number, number, string],
  ];
  for (const [i, [x, z, line]] of neighbors.entries())
    people.push({
      id: 'southern-country-neighbor-' + i,
      label:
        i % 2
          ? contentText('southern-countryside.drawSouthernCountryside.label-1.yes', {})
          : contentText('southern-countryside.drawSouthernCountryside.label-1.no', {}),
      neighborhood: true,
      neighborLine: line,
      description: contentText('southern-countryside.drawSouthernCountryside.description-2', {}),
      female: i % 2 === 0,
      shirt: (
        ['#91a48a', '#b49b79', '#9e8ca9', '#779fa0'] satisfies [string, string, string, string]
      )[i % 4],
      skin: (['#b88a67', '#91694e', '#c6a17c'] satisfies [string, string, string])[i % 3],
      hair: '#514136',
      height: 1.85,
      x,
      z,
      base: terrain.height(x, z) + 0.025,
      regional: true,
      angle: i * 0.7,
    });
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return {
    trees,
    people,
    homes: SOUTHERN_COUNTRY_HOMES,
    site: {
      id: 'southern-lake-meadows',
      seats,
      kind: 'neighborhood-garden',
      label: contentText('southern-countryside.drawSouthernCountryside.label-3', {}),
      entry: { x: 23.5, y: 182 },
      start,
      count: m.data.length - start,
      lo,
      hi,
      footprint: countryRect(48, (181 + SOUTHERN_MAP_END) / 2, 65, SOUTHERN_MAP_END - 181),
      navigationPolygons: solids,
      description: contentText('southern-countryside.drawSouthernCountryside.description-4', {}),
    },
  };
}
