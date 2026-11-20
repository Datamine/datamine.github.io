import { drawCraftGround } from './southern-craft.js';
/** Garden details occupy measured pockets beside existing access routes. */
export function drawCupertinoGardens(m, { terrain, tree }) {
  const start = m.data.length,
    solids = [],
    people = [],
    rect = (x, z, w, d) => [
      [x - w / 2, z - d / 2],
      [x + w / 2, z - d / 2],
      [x + w / 2, z + d / 2],
      [x - w / 2, z + d / 2],
    ];
  function seat(x, z) {
    const y = terrain.height(x, z);
    drawCraftGround(m, terrain, rect(x, z, 1, 0.6), '#c4b998', 'flagstone');
    for (const u of [-0.31, 0.31]) m.box(x + u - 0.02, y, z - 0.1, 0.04, 0.32, 0.2, '#647e72');
    for (let i = 0; i < 4; i++)
      m.box(x - 0.42, y + 0.32, z - 0.13 + i * 0.075, 0.84, 0.035, 0.05, '#b7976c', 'cedar');
    m.box(x - 0.42, y + 0.38, z - 0.15, 0.84, 0.28, 0.035, '#a58460', 'cedar');
    solids.push(rect(x, z, 0.92, 0.4));
  }
  for (const [x, z] of [
    [39, 174.6],
    [39.3, 176.8],
    [40.4, 178.5],
    [45, 178.5],
    [46.9, 176.6],
    [46.9, 173.5],
    [40.2, 169.8],
    [36.5, 163.5],
    [33.9, 163.4],
    [26.7, 155.5],
  ])
    tree(x - 0.5, z - 0.5, false, true);
  for (const [x, z] of [
    [40.6, 177.8],
    [45.2, 177.8],
    [40.3, 170.3],
    [46.8, 175.1],
    [36.7, 164.0],
    [33.7, 164],
  ])
    seat(x, z);
  // Woodland clumps and flowers soften the ring campus and the court ends.
  for (const [x, z] of [
    [39.5, 177.7],
    [46.4, 177.9],
    [39.8, 170.2],
    [46.8, 174.1],
    [36.6, 163.0],
    [33.8, 162.9],
    [26.7, 156.1],
  ]) {
    const y = terrain.height(x, z);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        xx = x + Math.cos(a) * 0.22,
        zz = z + Math.sin(a) * 0.17;
      m.sphere(xx, y + 0.12, zz, 0.12, 0.11, 0.1, '#7f9c6d', 10, 5);
      m.sphere(xx, y + 0.23, zz, 0.04, 0.04, 0.035, i % 2 ? '#dcac97' : '#ccbd7d', 8, 4);
    }
  }
  for (const [i, [x, z, line]] of [
    [39.6, 177.6, 'I came for a walk around the ring. Somehow that became my entire afternoon.'],
    [
      46.5,
      177.4,
      'There is a surprisingly good apple harvest here. The product launch is considerably quieter.',
    ],
    [
      38.5,
      163.5,
      'The garage contains one bicycle, four chairs, and a very ambitious woodworking project.',
    ],
    [32, 163.5, 'We kept the bungalow and planted the rest. The birds seem to approve.'],
  ].entries())
    people.push({
      id: 'cupertino-garden-neighbor-' + i,
      label: i % 2 ? 'Man' : 'Woman',
      neighborhood: true,
      neighborLine: line,
      description:
        'A neighbor taking the long way home, with a carefully maintained garden and no particular sense of urgency.',
      female: i % 2 === 0,
      longHair: i % 2 === 0,
      x,
      z,
      base: terrain.height(x, z) + 0.025,
      shirt: ['#9b879f', '#7c9c8e', '#a48a6d', '#7588a2'][i],
      skin: ['#be9976', '#8d664e', '#a67a59'][i % 3],
      hair: '#4b3d30',
      height: 1.85,
      regional: true,
      angle: i * 0.8,
    });
  const lo = [35, 0, 162],
    hi = [48, 7, 179];
  return {
    people,
    site: {
      id: 'cupertino-orchard-gardens',
      kind: 'neighborhood-garden',
      label: 'Cupertino Orchard Gardens',
      entry: { x: 38.2, y: 176.7 },
      start,
      count: m.data.length - start,
      lo,
      hi,
      footprint: [
        [38.5, 169],
        [47.6, 169],
        [47.6, 179],
        [38.5, 179],
      ],
      navigationPolygons: solids,
      description:
        'Orchard paths, shaded benches and flowering gardens make a quiet circuit around the ring campus. Short courts lead home to low roofs and gardens.',
    },
  };
}
