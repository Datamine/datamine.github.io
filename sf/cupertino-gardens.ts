import type { HeightTerrain, PlantTree } from './types/scenery.ts';
import type { Mesh } from './geometry.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { drawCraftGround } from './southern-craft.ts';
/** Garden details occupy measured pockets beside existing access routes. */
export function drawCupertinoGardens(
  m: Mesh,
  { terrain, tree }: { terrain: HeightTerrain; tree: PlantTree },
) {
  const start = m.data.length,
    solids: number[][][] = [],
    people = [],
    rect = (x: number, z: number, w: number, d: number) => [
      [x - w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z + d / 2] satisfies [number, number],
      [x - w / 2, z + d / 2] satisfies [number, number],
    ];
  function seat(x: number, z: number) {
    const y = terrain.height(x, z);
    drawCraftGround(m, terrain, rect(x, z, 1, 0.6), '#c4b998', 'flagstone');
    for (const u of [-0.31, 0.31] satisfies [number, number])
      m.box(x + u - 0.02, y, z - 0.1, 0.04, 0.32, 0.2, '#647e72');
    for (let i = 0; i < 4; i++)
      m.box(x - 0.42, y + 0.32, z - 0.13 + i * 0.075, 0.84, 0.035, 0.05, '#b7976c', 'cedar');
    m.box(x - 0.42, y + 0.38, z - 0.15, 0.84, 0.28, 0.035, '#a58460', 'cedar');
    solids.push(rect(x, z, 0.92, 0.4));
  }
  for (const [x, z] of [
    [39, 174.6] satisfies [number, number],
    [39.3, 176.8] satisfies [number, number],
    [40.4, 178.5] satisfies [number, number],
    [45, 178.5] satisfies [number, number],
    [46.9, 176.6] satisfies [number, number],
    [46.9, 173.5] satisfies [number, number],
    [40.2, 169.8] satisfies [number, number],
    [36.5, 163.5] satisfies [number, number],
    [33.9, 163.4] satisfies [number, number],
    [26.7, 155.5] satisfies [number, number],
  ])
    tree(x - 0.5, z - 0.5, false, true);
  for (const [x, z] of [
    [40.6, 177.8] satisfies [number, number],
    [45.2, 177.8] satisfies [number, number],
    [40.3, 170.3] satisfies [number, number],
    [46.8, 175.1] satisfies [number, number],
    [36.7, 164.0] satisfies [number, number],
    [33.7, 164] satisfies [number, number],
  ])
    seat(x, z);
  // Woodland clumps and flowers soften the ring campus and the court ends.
  for (const [x, z] of [
    [39.5, 177.7] satisfies [number, number],
    [46.4, 177.9] satisfies [number, number],
    [39.8, 170.2] satisfies [number, number],
    [46.8, 174.1] satisfies [number, number],
    [36.6, 163.0] satisfies [number, number],
    [33.8, 162.9] satisfies [number, number],
    [26.7, 156.1] satisfies [number, number],
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
    [
      39.6,
      177.6,
      'I came for a walk around the ring. Somehow that became my entire afternoon.',
    ] satisfies [number, number, string],
    [
      46.5,
      177.4,
      'There is a surprisingly good apple harvest here. The product launch is considerably quieter.',
    ] satisfies [number, number, string],
    [
      38.5,
      163.5,
      'The garage contains one bicycle, four chairs, and a very ambitious woodworking project.',
    ] satisfies [number, number, string],
    [32, 163.5, 'We kept the bungalow and planted the rest. The birds seem to approve.'] satisfies [
      number,
      number,
      string,
    ],
  ].entries())
    people.push({
      id: 'cupertino-garden-neighbor-' + i,
      label:
        i % 2
          ? contentText('cupertino-gardens.drawCupertinoGardens.label-1.yes', {})
          : contentText('cupertino-gardens.drawCupertinoGardens.label-1.no', {}),
      neighborhood: true,
      neighborLine: line,
      description: contentText('cupertino-gardens.drawCupertinoGardens.description-2', {}),
      female: i % 2 === 0,
      longHair: i % 2 === 0,
      x,
      z,
      base: terrain.height(x, z) + 0.025,
      shirt: (
        ['#9b879f', '#7c9c8e', '#a48a6d', '#7588a2'] satisfies [string, string, string, string]
      )[i],
      skin: (['#be9976', '#8d664e', '#a67a59'] satisfies [string, string, string])[i % 3],
      hair: '#4b3d30',
      height: 1.85,
      regional: true,
      angle: i * 0.8,
    });
  const lo = [35, 0, 162] satisfies [number, number, number],
    hi = [48, 7, 179] satisfies [number, number, number];
  return {
    people,
    site: {
      id: 'cupertino-orchard-gardens',
      kind: 'neighborhood-garden',
      label: contentText('cupertino-gardens.drawCupertinoGardens.label-3', {}),
      entry: { x: 38.2, y: 176.7 },
      start,
      count: m.data.length - start,
      lo,
      hi,
      footprint: [
        [38.5, 169] satisfies [number, number],
        [47.6, 169] satisfies [number, number],
        [47.6, 179] satisfies [number, number],
        [38.5, 179] satisfies [number, number],
      ],
      navigationPolygons: solids,
      description: contentText('cupertino-gardens.drawCupertinoGardens.description-4', {}),
    },
  };
}
