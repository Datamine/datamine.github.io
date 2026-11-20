import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.js';
const edgeScale = WORLD_SIZE / STREET_LAYOUT_SIZE;
// Explicit crossings share their north/south coordinates with rendering,
// navigation adapters, lighting, and neighborhood frontage generation.
export const CITY_EDGE_STREETS = Object.freeze(
  [
    {
      name: 'Great Highway south',
      points: [
        [12.5 * edgeScale, 89.5],
        [14.5, 94.5],
        [14.5, 99.5],
      ],
    },
    {
      name: '19th Avenue south',
      points: [
        [23.5 * edgeScale, 91.5],
        [28.5, 94.5],
        [28.5, 99.5],
      ],
    },
    {
      name: 'Oceana Boulevard',
      points: [
        [29.5 * edgeScale, 89.5],
        [35.5, 94.5],
        [35.5, 99.5],
      ],
    },
    {
      name: '30th Avenue south',
      points: [
        [34.5 * edgeScale, 89.5],
        [42.5, 94.5],
        [42.5, 99.5],
      ],
    },
    {
      name: 'Stanyan south',
      points: [
        [40.5 * edgeScale, 89.5],
        [49.5, 94.5],
        [49.5, 99.5],
      ],
    },
    {
      name: 'Mission south',
      points: [
        [59.5 * edgeScale, 89.5],
        [68.5, 94.5],
        [68.5, 99.5],
      ],
    },
    {
      name: 'Geneva Avenue',
      points: [
        [28.5, 94.5],
        [35.5, 94.5],
        [42.5, 94.5],
        [49.5, 94.5],
        [62.5, 94.5],
        [68.5, 94.5],
        [64.5 * edgeScale, 94.5],
        [70.5 * edgeScale, 94.5],
      ],
    },
  ].map((r) => Object.freeze({ ...r, points: Object.freeze(r.points.map(Object.freeze)) })),
);
export const CITY_EDGE_GATES = Object.freeze(
  [14.5, 28.5, 35.5, 42.5, 49.5, 68.5].map((x) =>
    Object.freeze({ x: x - 0.5, y: WORLD_SIZE - 1.5 }),
  ),
);
