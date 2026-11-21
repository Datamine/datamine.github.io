// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { CENTRAL_PASTURE } from './southern-countryside-layout.ts';
// Mesh coordinates; navigation adapters subtract half a tile.
export const JURASSIC = Object.freeze({
  x: 45.8,
  z: 97.1,
  w: 5,
  d: 3.8,
  base: 1.45,
  entry: { x: 45.3, y: 99.6 },
  lab: { x: 44.3, z: 97.05, w: 1.8, d: 3.5 },
  cage: { x: 47.1, z: 97.05, w: 2.1, d: 3.5 },
  exit: { x: 47.1, z: 99.25 },
});
export const COW_PEN = CENTRAL_PASTURE;
const COW_GRAZING_SPOTS = Object.freeze(
  [
    [-2.4, -3.2] satisfies [number, number],
    [1, -3.3] satisfies [number, number],
    [4.5, -2.8] satisfies [number, number],
    [-1.3, 0.2] satisfies [number, number],
    [3, 0] satisfies [number, number],
    [5.2, 2.6] satisfies [number, number],
    [-4.6, 3.1] satisfies [number, number],
    [0.3, 3.2] satisfies [number, number],
  ].map((value) => Object.freeze(value)),
);
/** One authored herd layout supplies the server simulation and client models. */
export function cowSpawns() {
  return COW_GRAZING_SPOTS.map(([dx, dz], i) => ({
    id: 'south-cow-' + i,
    combatKind: 'cow',
    label: contentText('jurassic-layout.cowSpawns.label-1', {}),
    x: COW_PEN.x + dx,
    z: COW_PEN.z + dz,
    angle: 0.3 + i * 1.7,
  }));
}
export const PEQUOD = Object.freeze({ z: 110, offshore: 4.2, travel: 23, deck: 0.86 });
export const KRAKEN_CAPE_TEXT =
  'I killed the kraken with a railgun and all i got was this lousy cape';
export const KRAKEN_CAPE_LINES = Object.freeze([
  'I KILLED THE KRAKEN',
  'WITH A RAILGUN',
  'AND ALL I GOT WAS',
  'THIS LOUSY CAPE',
] satisfies [string, string, string, string]);
export function inJurassicGrounds(x: number, z: number, pad = 0) {
  return (
    Math.abs(x - JURASSIC.x) <= JURASSIC.w / 2 + pad &&
    z >= JURASSIC.z - JURASSIC.d / 2 - pad &&
    z <= JURASSIC.entry.y + 1 + pad
  );
}
export function inCowPen(x: number, z: number, pad = 0) {
  return (
    Math.abs(x - COW_PEN.x) <= COW_PEN.w / 2 + pad && Math.abs(z - COW_PEN.z) <= COW_PEN.d / 2 + pad
  );
}
