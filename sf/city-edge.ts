// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.ts';
const edgeScale = WORLD_SIZE / STREET_LAYOUT_SIZE;
// Explicit crossings share their north/south coordinates with rendering,
// navigation adapters, lighting, and neighborhood frontage generation.
export const CITY_EDGE_STREETS = Object.freeze(
  [
    {
      name: contentText('city-edge.module.name-1', {}),
      points: [
        [12.5 * edgeScale, 89.5] satisfies [number, number],
        [14.5, 94.5] satisfies [number, number],
        [14.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('city-edge.module.name-2', {}),
      points: [
        [23.5 * edgeScale, 91.5] satisfies [number, number],
        [28.5, 94.5] satisfies [number, number],
        [28.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('city-edge.module.name-3', {}),
      points: [
        [29.5 * edgeScale, 89.5] satisfies [number, number],
        [35.5, 94.5] satisfies [number, number],
        [35.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('city-edge.module.name-4', {}),
      points: [
        [34.5 * edgeScale, 89.5] satisfies [number, number],
        [42.5, 94.5] satisfies [number, number],
        [42.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('city-edge.module.name-5', {}),
      points: [
        [40.5 * edgeScale, 89.5] satisfies [number, number],
        [49.5, 94.5] satisfies [number, number],
        [49.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('city-edge.module.name-6', {}),
      points: [
        [59.5 * edgeScale, 89.5] satisfies [number, number],
        [68.5, 94.5] satisfies [number, number],
        [68.5, 99.5] satisfies [number, number],
      ],
    },
    {
      name: contentText('city-edge.module.name-7', {}),
      points: [
        [28.5, 94.5] satisfies [number, number],
        [35.5, 94.5] satisfies [number, number],
        [42.5, 94.5] satisfies [number, number],
        [49.5, 94.5] satisfies [number, number],
        [62.5, 94.5] satisfies [number, number],
        [68.5, 94.5] satisfies [number, number],
        [64.5 * edgeScale, 94.5] satisfies [number, number],
        [70.5 * edgeScale, 94.5] satisfies [number, number],
      ],
    },
  ].map((r) =>
    Object.freeze({ ...r, points: Object.freeze(r.points.map((value) => Object.freeze(value))) }),
  ),
);
export const CITY_EDGE_GATES = Object.freeze(
  (
    [14.5, 28.5, 35.5, 42.5, 49.5, 68.5] satisfies [number, number, number, number, number, number]
  ).map((x) => Object.freeze({ x: x - 0.5, y: WORLD_SIZE - 1.5 })),
);
