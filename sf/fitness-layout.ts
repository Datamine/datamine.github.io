/** The gym sits on the open block east of the zoo, below Lake Merced. */
export const SF_FITNESS = Object.freeze({
  x: 31.6,
  z: 92.2,
  w: 4,
  d: 2.6,
  base: 1.4,
  entry: Object.freeze({ x: 31.1, y: 93.5 }),
  bench: Object.freeze({ x: 31.6, z: 92.3 }),
});
export function gymAccess(x: number, z: number) {
  const g = SF_FITNESS;
  return (
    Math.abs(x - g.x) <= g.w / 2 + 0.15 && z >= g.z - g.d / 2 - 0.1 && z <= g.z + g.d / 2 + 0.8
  );
}
export function gymWalkable(x: number, z: number) {
  const g = SF_FITNESS;
  return (
    x >= g.x - g.w / 2 + 0.3 &&
    x <= g.x + g.w / 2 - 0.3 &&
    z >= g.z - 0.6 &&
    z <= g.z + g.d / 2 + 0.6
  );
}
export function fitnessObstacles() {
  const g = SF_FITNESS,
    rect = (x: number, z: number, w: number, d: number) => [
      [x, z] satisfies [number, number],
      [x + w, z] satisfies [number, number],
      [x + w, z + d] satisfies [number, number],
      [x, z + d] satisfies [number, number],
    ];
  return [
    rect(g.x - g.w / 2, g.z - g.d / 2, g.w, 0.12),
    rect(g.x - g.w / 2, g.z - g.d / 2, 0.12, g.d),
    rect(g.x + g.w / 2 - 0.12, g.z - g.d / 2, 0.12, g.d),
  ];
}
