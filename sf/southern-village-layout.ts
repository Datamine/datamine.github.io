// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** A connected southern village: perimeter roads, quiet campus greens and a
 * bay-facing promenade. Reservations precede procedural housing and planting. */
export const SOUTHERN_VILLAGE = Object.freeze({ west: 50.8, east: 80, north: 165.4, south: 179.9 });
export const VILLAGE_ROADS = Object.freeze([
  {
    name: contentText('southern-village-layout.module.name-1', {}),
    points: [
      [50, 164.5] satisfies [number, number],
      [50, 175.5] satisfies [number, number],
      [62, 175.5] satisfies [number, number],
      [75.5, 175.5] satisfies [number, number],
      [83, 175.5] satisfies [number, number],
    ],
  },
  {
    name: contentText('southern-village-layout.module.name-2', {}),
    points: [[72.5, 164.5] satisfies [number, number], [72.5, 175.5] satisfies [number, number]],
  },
]);
export const VILLAGE_PATHS = Object.freeze([
  {
    name: contentText('southern-village-layout.module.name-3', {}),
    halfWidth: 0.28,
    points: [
      [50, 166] satisfies [number, number],
      [62, 166] satisfies [number, number],
      [75.5, 166] satisfies [number, number],
    ],
  },
  {
    name: contentText('southern-village-layout.module.name-4', {}),
    halfWidth: 0.32,
    points: [
      [50, 177.3] satisfies [number, number],
      [62, 177.3] satisfies [number, number],
      [73.2, 177.3] satisfies [number, number],
      [75.5, 178] satisfies [number, number],
    ],
  },
  {
    name: contentText('southern-village-layout.module.name-5', {}),
    halfWidth: 0.27,
    points: [[50, 175.5] satisfies [number, number], [50, 177.3] satisfies [number, number]],
  },
  {
    name: contentText('southern-village-layout.module.name-6', {}),
    halfWidth: 0.27,
    points: [[62, 175.5] satisfies [number, number], [62, 177.3] satisfies [number, number]],
  },
  {
    name: contentText('southern-village-layout.module.name-7', {}),
    halfWidth: 0.3,
    points: [
      [72.5, 174.9] satisfies [number, number],
      [77, 174.9] satisfies [number, number],
      [77, 173.5] satisfies [number, number],
    ],
  },
]);
export const VILLAGE_PAVILIONS = Object.freeze([
  {
    id: 'campus-tea-room',
    label: contentText('southern-village-layout.module.label-8', {}),
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
    label: contentText('southern-village-layout.module.label-9', {}),
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
export function inSouthernVillage(x: number, z: number, pad = 0) {
  const b = SOUTHERN_VILLAGE;
  return x > b.west - pad && x < b.east + pad && z > b.north - pad && z < b.south + pad;
}
