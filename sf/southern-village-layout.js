/** A connected southern village: perimeter roads, quiet campus greens and a
 * bay-facing promenade. Reservations precede procedural housing and planting. */
export const SOUTHERN_VILLAGE = Object.freeze({ west: 50.8, east: 80, north: 165.4, south: 179.9 });
export const VILLAGE_ROADS = Object.freeze([
  {
    name: 'Campus Avenue',
    points: [
      [50, 164.5],
      [50, 175.5],
      [62, 175.5],
      [75.5, 175.5],
      [83, 175.5],
    ],
  },
  {
    name: 'Foundry Lane',
    points: [
      [72.5, 164.5],
      [72.5, 175.5],
    ],
  },
]);
export const VILLAGE_PATHS = Object.freeze([
  {
    name: 'College garden walk',
    halfWidth: 0.28,
    points: [
      [50, 166],
      [62, 166],
      [75.5, 166],
    ],
  },
  {
    name: 'Salt garden promenade',
    halfWidth: 0.32,
    points: [
      [50, 177.3],
      [62, 177.3],
      [73.2, 177.3],
      [75.5, 178],
    ],
  },
  {
    name: 'Campus west garden link',
    halfWidth: 0.27,
    points: [
      [50, 175.5],
      [50, 177.3],
    ],
  },
  {
    name: 'Campus central garden link',
    halfWidth: 0.27,
    points: [
      [62, 175.5],
      [62, 177.3],
    ],
  },
  {
    name: 'Foundry court',
    halfWidth: 0.3,
    points: [
      [72.5, 174.9],
      [77, 174.9],
      [77, 173.5],
    ],
  },
]);
export const VILLAGE_PAVILIONS = Object.freeze([
  {
    id: 'campus-tea-room',
    label: 'The Present Tense · Tea Room',
    x: 55.8,
    z: 177.9,
    w: 3.1,
    d: 1.7,
    height: 1.65,
    rotation: Math.PI,
    seed: 0.35,
    entry: { x: 55.3, y: 176.5 },
  },
  {
    id: 'qualia-bookshop',
    label: 'Qualia Books',
    x: 68.8,
    z: 177.9,
    w: 3,
    d: 1.7,
    height: 1.8,
    rotation: Math.PI,
    seed: 0.73,
    entry: { x: 68.3, y: 176.5 },
  },
]);
export function inSouthernVillage(x, z, pad = 0) {
  const b = SOUTHERN_VILLAGE;
  return x > b.west - pad && x < b.east + pad && z > b.north - pad && z < b.south + pad;
}
