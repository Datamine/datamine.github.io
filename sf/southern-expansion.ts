// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
// Authored blocks in world coordinates. Roads, plots, the park, and pedestrian
// routes share this data so rendered neighborhoods match their navigation.
import { CITY_EDGE_STREETS } from './city-edge.ts';
import { PENINSULA_INFILL_STREETS } from './peninsula-urbanism.ts';
import './geography.ts';
export const PENINSULA_STREETS = Object.freeze(
  [
    ...CITY_EDGE_STREETS,
    {
      name: contentText('southern-expansion.module.name-1', {}),
      points: [
        [42.5, 99.5] satisfies [number, number],
        [49.5, 99.5] satisfies [number, number],
        [56.5, 99.5] satisfies [number, number],
        [62.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-2', {}),
      points: [
        [28.5, 99.5] satisfies [number, number],
        [35.5, 99.5] satisfies [number, number],
        [42.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-3', {}),
      points: [
        [28.5, 105.5] satisfies [number, number],
        [35.5, 105.5] satisfies [number, number],
        [42.5, 105.5] satisfies [number, number],
        [49.5, 105.5] satisfies [number, number],
        [56.5, 105.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-4', {}),
      points: [[42.5, 99.5] satisfies [number, number], [42.5, 105.5] satisfies [number, number]],
    },
    {
      name: contentText('southern-expansion.module.name-5', {}),
      points: [[49.5, 99.5] satisfies [number, number], [49.5, 105.5] satisfies [number, number]],
    },
    {
      name: contentText('southern-expansion.module.name-6', {}),
      points: [[56.5, 99.5] satisfies [number, number], [56.5, 105.5] satisfies [number, number]],
    },
    {
      name: contentText('southern-expansion.module.name-7', {}),
      points: [
        [28.5, 99.5] satisfies [number, number],
        [28.5, 105.5] satisfies [number, number],
        [28.5, 111.7] satisfies [number, number],
        [28.5, 119.5] satisfies [number, number],
        [28.5, 127.5] satisfies [number, number],
        [28.5, 135.5] satisfies [number, number],
        [28.5, 143.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-8', {}),
      points: [
        [35.5, 99.5] satisfies [number, number],
        [35.5, 105.5] satisfies [number, number],
        [35.5, 111.7] satisfies [number, number],
        [35.5, 119.5] satisfies [number, number],
        [35.5, 127.5] satisfies [number, number],
        [35.5, 135.5] satisfies [number, number],
        [35.5, 143.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-9', {}),
      points: [
        [21.5, 119.5] satisfies [number, number],
        [28.5, 119.5] satisfies [number, number],
        [35.5, 119.5] satisfies [number, number],
        [42.5, 119.5] satisfies [number, number],
        [49.5, 119.5] satisfies [number, number],
        [56.5, 119.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-10', {}),
      points: [
        [21.5, 127.5] satisfies [number, number],
        [28.5, 127.5] satisfies [number, number],
        [35.5, 127.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-11', {}),
      points: [
        [21.5, 135.5] satisfies [number, number],
        [28.5, 135.5] satisfies [number, number],
        [35.5, 135.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-12', {}),
      points: [
        [21.5, 143.5] satisfies [number, number],
        [28.5, 143.5] satisfies [number, number],
        [35.5, 143.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-13', {}),
      points: [
        [21.5, 119.5] satisfies [number, number],
        [21.5, 127.5] satisfies [number, number],
        [21.5, 135.5] satisfies [number, number],
        [21.5, 143.5] satisfies [number, number],
      ],
    },
    ...PENINSULA_INFILL_STREETS,
  ].map((r) =>
    Object.freeze({ ...r, points: Object.freeze(r.points.map((value) => Object.freeze(value))) }),
  ),
);

const peninsulaRows = [];
for (const x of [32, 39, 46, 53] satisfies [number, number, number, number])
  for (const [z, rotation] of [
    [101.45, Math.PI] satisfies [number, number],
    [103.55, 0] satisfies [number, number],
  ])
    peninsulaRows.push({ x, z, w: 4.8, d: 2, rotation });
for (const x of [25, 32] satisfies [number, number])
  for (const [z, rotation] of [
    [121.8, Math.PI] satisfies [number, number],
    [125.2, 0] satisfies [number, number],
    [137.8, Math.PI] satisfies [number, number],
    [141.2, 0] satisfies [number, number],
  ])
    peninsulaRows.push({ x, z, w: 4.8, d: 2.7, rotation });
for (const [z, rotation] of [
  [129.8, Math.PI] satisfies [number, number],
  [133.2, 0] satisfies [number, number],
])
  peninsulaRows.push({ x: 32, z, w: 4.8, d: 2.7, rotation });
for (const x of [39, 46, 53] satisfies [number, number, number])
  peninsulaRows.push({ x, z: 122, w: 4.5, d: 2.8, rotation: Math.PI });
export const PENINSULA_HOUSING = Object.freeze(peninsulaRows.map((value) => Object.freeze(value)));

export const PACIFICA_PARK = Object.freeze({
  id: 'pacifica-park',
  label: contentText('southern-expansion.module.label-14', {}),
  west: 22.4,
  east: 27.6,
  north: 128.4,
  south: 134.6,
  entry: Object.freeze({ x: 24.5, y: 134.9 }),
});
export const PACIFICA_PARK_OBSTACLES = Object.freeze(
  [
    { x: 25, z: 131.4, w: 1.2, d: 1.2, kind: 'fountain' },
    { x: 23.9, z: 130.9, w: 0.9, d: 0.5, kind: 'bench' },
    { x: 26, z: 132.8, w: 0.9, d: 0.5, kind: 'bench' },
    { x: 25, z: 128.55, w: 1.84, d: 0.16, kind: 'sign' },
    ...[
      [22.6, 129] satisfies [number, number],
      [22.6, 133.5] satisfies [number, number],
      [27.4, 130] satisfies [number, number],
      [27.4, 133.5] satisfies [number, number],
    ].map(([x, z]) => ({ x, z, w: 0.28, d: 0.28, kind: 'tree' })),
  ].map((value) => Object.freeze(value)),
);
export function inPacificaPark(x: number, z: number) {
  const p = PACIFICA_PARK;
  return x >= p.west && x <= p.east && z >= p.north && z <= p.south;
}
export function pacificaParkWalkable(x: number, z: number) {
  return (
    inPacificaPark(x, z) &&
    !PACIFICA_PARK_OBSTACLES.some(
      (o) => Math.abs(x - o.x) < o.w / 2 + 0.17 && Math.abs(z - o.z) < o.d / 2 + 0.17,
    )
  );
}
export const PACIFICA_PARK_PATHS = Object.freeze(
  [
    {
      name: contentText('southern-expansion.module.name-15', {}),
      halfWidth: 0.22,
      points: [
        [23, 129] satisfies [number, number],
        [27, 129] satisfies [number, number],
        [27, 134] satisfies [number, number],
        [25, 134] satisfies [number, number],
        [23, 134] satisfies [number, number],
        [23, 129] satisfies [number, number],
      ],
    },
    {
      name: contentText('southern-expansion.module.name-16', {}),
      halfWidth: 0.24,
      points: [[25, 135.5] satisfies [number, number], [25, 134] satisfies [number, number]],
    },
  ].map((r) =>
    Object.freeze({ ...r, points: Object.freeze(r.points.map((value) => Object.freeze(value))) }),
  ),
);
export const PACIFICA_PARK_NODES = Object.freeze(
  [
    [23, 129] satisfies [number, number],
    [27, 129] satisfies [number, number],
    [27, 134] satisfies [number, number],
    [25, 134] satisfies [number, number],
    [23, 134] satisfies [number, number],
    [24, 130.4] satisfies [number, number],
    [26, 130.4] satisfies [number, number],
    [24, 132.4] satisfies [number, number],
    [26, 132.4] satisfies [number, number],
  ].map(([x, z]) => Object.freeze({ x: x - 0.5, y: z - 0.5 })),
);
export const PACIFICA_PARK_RESIDENTS = Object.freeze(
  [
    {
      id: 'commons-reader',
      label: contentText('southern-expansion.module.label-17', {}),
      x: 23.9,
      z: 130.9,
      skin: '#9c7259',
      shirt: '#ab8baf',
      hair: '#3e3537',
      female: true,
      longHair: true,
    },
    {
      id: 'commons-regular',
      label: contentText('southern-expansion.module.label-18', {}),
      x: 26,
      z: 132.8,
      skin: '#c4a17d',
      shirt: '#7e9ca1',
      hair: '#696158',
    },
  ].map((p) =>
    Object.freeze({
      ...p,
      regional: true,
      seated: true,
      angle: Math.PI / 2,
      height: 1.85,
      approach: Object.freeze({ x: p.x - 0.5, y: p.z + 0.8 - 0.5 }),
    }),
  ),
);
