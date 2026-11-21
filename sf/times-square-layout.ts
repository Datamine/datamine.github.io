/** Native prop footprints are shared by the renderer and walking graph. */
export const TIMES_SQUARE_PROPS = Object.freeze(
  [
    { id: 'coffee', x: 61, z: 156.5, w: 1.05, d: 0.8 },
    { id: 'books', x: 65, z: 152, w: 0.8, d: 0.6 },
    { id: 'table', x: 63.5, z: 156.7, w: 1.15, d: 1.3 },
    { id: 'garden', x: 63, z: 160, w: 3.2, d: 2.6 },
    { id: 'planter', x: 65.6, z: 158.1, w: 0.55, d: 0.7 },
    { id: 'west-planter', x: 59.8, z: 153, w: 0.46, d: 0.6 },
    { id: 'east-planter', x: 69.4, z: 155.8, w: 0.46, d: 0.6 },
    { id: 'west-bin', x: 57.2, z: 155.7, w: 0.22, d: 0.22 },
    { id: 'east-bin', x: 69.5, z: 153, w: 0.22, d: 0.22 },
  ].map((value) => Object.freeze(value)),
);
export function timesSquarePropAt(x: number, z: number, padding = 0.1) {
  return (
    TIMES_SQUARE_PROPS.find(
      (p) => Math.abs(x - p.x) < p.w / 2 + padding && Math.abs(z - p.z) < p.d / 2 + padding,
    ) || null
  );
}
