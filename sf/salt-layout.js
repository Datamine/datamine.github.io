/** Half-tile boundaries coincide with the southern terrain grid. Pond water,
 * levee access, picking and minimap artwork share these authored rectangles. */
export const SALT_FLATS = Object.freeze({
  west: 72.5,
  east: 84,
  north: 192,
  south: 216,
  base: 1.15,
  entry: Object.freeze({ x: 72.4, y: 193.7 }),
});
const saltColors = ['#a5bd98', '#c7a1a2', '#afc3b4', '#cfb093', '#b69ea8', '#b1c49e'];
export const SALT_PONDS = Object.freeze(
  [193, 196, 200.5, 203, 207, 210, 213].flatMap((z, row) =>
    [
      [74, 2.5],
      [77, 2.5],
      [83, 0.5],
    ].map(([x, w], col) =>
      Object.freeze({ x, z, w, d: 2, color: saltColors[(row + col * 2) % saltColors.length] }),
    ),
  ),
);
export const SALT_FLATS_PATH = Object.freeze({
  name: 'Salt conservation levee',
  halfWidth: 0.36,
  points: [
    [75.5, 205.5],
    [72.9, 205.5],
    [72.9, 193.7],
    [72.9, 215.5],
    [83, 215.5],
  ],
});
export function inSaltFlats(x, z, margin = 0) {
  const s = SALT_FLATS;
  return (
    x >= s.west - margin && x <= s.east + margin && z >= s.north - margin && z <= s.south + margin
  );
}
export function saltPondAt(x, z, margin = 0) {
  return (
    SALT_PONDS.find(
      (p) =>
        x > p.x - margin && x < p.x + p.w + margin && z > p.z - margin && z < p.z + p.d + margin,
    ) || null
  );
}
export function saltSurfaceAt(x, z) {
  return inSaltFlats(x, z) ? (saltPondAt(x, z) ? 'water' : 'salt') : null;
}
