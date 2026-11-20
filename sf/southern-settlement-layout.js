import { WORLD_SIZE, STREET_LAYOUT_SIZE } from './geography.js';

/** Authored neighborhood plans, in world tiles. Roads and parcels are shared
 * by the terrain, housing renderer, minimap and authoritative walking graph.
 * A rotation of zero faces south; Math.PI faces north. */
export const SOUTHERN_SETTLEMENT_END = 240;
const settlementHighwayX = (70.5 * WORLD_SIZE) / STREET_LAYOUT_SIZE;
export const SOUTHERN_CAMPUS_SITES = Object.freeze(
  [
    {
      id: 'centeredness-institute',
      label: 'California Institute for Consciousness Research',
      x: 27.5,
      z: 219.5,
      w: 5.4,
      d: 3.6,
      base: 1.6,
      west: 22.8,
      east: 32.2,
      north: 216.7,
      south: 224.6,
      entry: { x: 27, y: 224.5 },
    },
    {
      id: 'center-research-institute',
      label: 'California Institute for Consciousness Research · Field Station',
      x: 37.7,
      z: 219.5,
      w: 5.8,
      d: 3.6,
      base: 1.6,
      west: 32.7,
      east: 42.7,
      north: 216.7,
      south: 224.6,
      entry: { x: 37.2, y: 224.5 },
    },
  ].map((c) => Object.freeze({ ...c, entry: Object.freeze(c.entry) })),
);

export const SETTLEMENT_ROADS = Object.freeze(
  [
    {
      name: 'Times Square neighborhood approach',
      points: [
        [56.5, 137.5],
        [68.5, 137.5],
      ],
    },
    // The existing civic excavation sits between the two little high streets.
    // Keep that block intact; cross connections use its north/south streets.
    {
      name: 'Laurel High Street west',
      points: [
        [56.5, 141.5],
        [61.2, 141.5],
      ],
    },
    {
      name: 'Laurel High Street east',
      points: [
        [68.5, 141.5],
        [75.5, 141.5],
        [settlementHighwayX, 141.5],
      ],
    },
    {
      name: 'Laurel neighborhood link',
      points: [
        [68.5, 137.5],
        [68.5, 141.5],
        [68.5, 145.5],
      ],
    },
    {
      name: 'Laurel eastern link',
      points: [
        [75.5, 137.5],
        [75.5, 141.5],
        [75.5, 145.5],
      ],
    },
    {
      name: 'Birch Street',
      points: [
        [35.5, 194.5],
        [35.5, 199.5],
        [35.5, 205.5],
      ],
    },
    {
      name: 'Birch neighborhood lane',
      points: [
        [29.5, 199.5],
        [35.5, 199.5],
        [41.5, 199.5],
      ],
    },
    {
      name: 'Bay Laurel Street',
      points: [
        [66.5, 194.5],
        [66.5, 199.5],
        [66.5, 205.5],
      ],
    },
    {
      name: 'Bay Laurel neighborhood lane',
      points: [
        [61.5, 199.5],
        [66.5, 199.5],
        [71.5, 199.5],
      ],
    },
    {
      name: 'Orchard Road extension',
      points: [
        [21.5, 213.5],
        [21.5, 225.5],
        [21.5, 237.5],
      ],
    },
    {
      name: 'Alder Lane extension',
      points: [
        [43.5, 213.5],
        [43.5, 225.5],
        [43.5, 237.5],
      ],
    },
    {
      name: 'Meadow Way extension',
      points: [
        [56.5, 213.5],
        [56.5, 225.5],
        [56.5, 237.5],
      ],
    },
    {
      name: 'South Grove Avenue',
      points: [
        [21.5, 225.5],
        [43.5, 225.5],
        [56.5, 225.5],
        [settlementHighwayX, 225.5],
      ],
    },
    {
      name: 'South Coast neighborhood avenue',
      points: [
        [21.5, 237.5],
        [43.5, 237.5],
        [56.5, 237.5],
        [settlementHighwayX, 237.5],
      ],
    },
    {
      name: 'Orchard Mews',
      points: [
        [66.5, 237.5],
        [66.5, 231.5],
      ],
    },
  ].map((r) => Object.freeze({ ...r, points: Object.freeze(r.points.map(Object.freeze)) })),
);

// These blocks replace former campus clearings, add a low-rise high street
// before Times Square, and mix SF-style flats with gardens farther south.
const settlementRows = [
  // x, z, frontage, depth, facing, architectural family (or suburban style).
  [59.2, 139.5, 3.2, 1.8, 0, 'deco', 'shop'],
  [59.2, 143.5, 3.5, 1.8, Math.PI, 'victorian'],
  [70.5, 139.5, 1.9, 1.8, 0, 'coastal'],
  [78.4, 139.5, 3.1, 1.8, 0, 'deco', 'shop'],
  [70.5, 143.5, 1.9, 1.8, Math.PI, 'west'],
  [78.4, 143.5, 3.1, 1.8, Math.PI, 'mediterranean', 'shop'],
  [31.6, 197.2, 3.3, 2.3, 0, 'coastal'],
  [39.4, 197.2, 3.3, 2.3, 0, 'craftsman', 'suburb'],
  [31.6, 202, 3.3, 2.3, Math.PI, 'bungalow', 'suburb'],
  [39.4, 202, 3.3, 2.3, Math.PI, 'victorian'],
  [62.4, 197.2, 3.1, 2.3, 0, 'garden'],
  [69.5, 197.2, 2.8, 2.3, 0, 'eichler', 'suburb'],
  [62.4, 202, 3.2, 2.3, Math.PI, 'craftsman', 'suburb'],
  [69.5, 202, 2.8, 2.3, Math.PI, 'coastal'],
  [18.1, 217.3, 3.5, 2.8, -Math.PI / 2, 'craftsman', 'suburb'],
  [18.1, 222, 3.5, 2.8, -Math.PI / 2, 'bungalow', 'suburb'],
  [63.4, 231.6, 3.7, 2.8, -Math.PI / 2, 'eichler', 'suburb'],
  [69.4, 231.6, 3.7, 2.8, Math.PI / 2, 'craftsman', 'suburb'],
  [47.1, 217.3, 3.5, 2.8, Math.PI / 2, 'eichler', 'suburb'],
  [47.1, 222, 3.5, 2.8, Math.PI / 2, 'craftsman', 'suburb'],
  [52.9, 217.3, 3.8, 2.8, -Math.PI / 2, 'west'],
  [52.9, 222, 3.8, 2.8, -Math.PI / 2, 'victorian'],
  [60.1, 217.3, 3.6, 2.8, Math.PI / 2, 'craftsman', 'suburb'],
  [60.1, 222, 3.6, 2.8, Math.PI / 2, 'bungalow', 'suburb'],
  [66, 210.6, 4.5, 3.0, 0, 'mission'],
  [66, 216.5, 4.5, 3.0, Math.PI, 'victorian'],
  [71.7, 222.7, 4.0, 2.5, 0, 'craftsman', 'suburb'],
  [77, 222.7, 3.8, 2.5, 0, 'eichler', 'suburb'],
  [18.1, 229.6, 3.4, 2.8, -Math.PI / 2, 'telegraph'],
  [18.1, 234.4, 3.6, 2.8, -Math.PI / 2, 'mediterranean'],
  [25, 229.6, 3.4, 2.8, Math.PI / 2, 'bungalow', 'suburb'],
  [25, 234.4, 3.6, 2.8, Math.PI / 2, 'craftsman', 'suburb'],
  [39.9, 229.6, 3.4, 2.8, -Math.PI / 2, 'victorian'],
  [39.9, 234.4, 3.6, 2.8, -Math.PI / 2, 'west'],
  [47, 229.6, 3.5, 2.8, Math.PI / 2, 'garden'],
  [47, 234.4, 3.7, 2.8, Math.PI / 2, 'warehouse'],
  [53, 229.6, 3.5, 2.8, -Math.PI / 2, 'eichler', 'suburb'],
  [53, 234.4, 3.7, 2.8, -Math.PI / 2, 'craftsman', 'suburb'],
  [31.3, 234.5, 4.8, 2.8, 0, 'victorian'],
  [73.7, 234.5, 2.7, 2.8, 0, 'telegraph'],
  [78, 234.5, 3.1, 2.8, 0, 'deco'],
];
export const SETTLEMENT_PARCELS = Object.freeze(
  settlementRows.map(([x, z, w, d, rotation, style, use], i) =>
    Object.freeze({
      id: 'peninsula-settlement-' + i,
      x,
      z,
      w,
      d,
      rotation,
      seed: (0.23 + i * 0.173) % 1,
      ...(use === 'suburb' ? { lowRiseStyle: style } : { district: style }),
      settlement: true,
      shop: use === 'shop',
      street:
        z < 180
          ? 'Laurel High Street'
          : z < 210
            ? 'Redwood neighborhood lanes'
            : 'South Grove neighborhood',
    }),
  ),
);
export function settlementParcelBounds(p, pad = 0) {
  const sideways = Math.abs(Math.sin(p.rotation)) > 0.5,
    w = sideways ? p.d : p.w,
    d = sideways ? p.w : p.d;
  return [p.x - w / 2 - pad, p.z - d / 2 - pad, p.x + w / 2 + pad, p.z + d / 2 + pad];
}
export const SETTLEMENT_RESERVES = Object.freeze([
  [57.4, 138, 61.2, 145],
  [69.5, 138, 73.4, 145],
  [76.6, 138, 80.2, 145],
  ...SETTLEMENT_PARCELS.map((p) => settlementParcelBounds(p, 0.2)),
  ...SOUTHERN_CAMPUS_SITES.map((c) => [c.west - 0.3, c.north - 0.3, c.east + 0.3, c.south + 0.3]),
]);
