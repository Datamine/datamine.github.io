// Physical ground footprints only: the tall crane jibs leave headroom above
// streets and buildings. Placement, housing reservations and navigation share
// this plan rather than treating the entire construction skyline as solid.
export const SQUARE_DIGSITE = Object.freeze({
  west: 52.75,
  east: 55.5,
  north: 152.75,
  south: 157.5,
  entry: Object.freeze({ x: 55.5, y: 156 }),
  foreman: Object.freeze({ x: 54.15, z: 156.55 }),
  pit: Object.freeze({ x: 53.8, z: 155, w: 1.2, d: 1.4, depth: 0.72 }),
  excavator: Object.freeze({ x: 54.5, z: 153.75, angle: 0.35 }),
});
export const SQUARE_CRANES = Object.freeze([
  Object.freeze({ id: 'west-crane', x: 53.35, z: 153.3, height: 11.6, jib: 6.4, angle: 0 }),
  Object.freeze({ id: 'east-crane', x: 71.1, z: 158.2, height: 12.4, jib: 5.5, angle: Math.PI }),
]);
export const SQUARE_SITE_FENCES = Object.freeze(
  [
    { x: 52.8, z: 155.125, w: 0.06, d: 4.55 },
    { x: 54.125, z: 152.8, w: 2.65, d: 0.06 },
    { x: 54.125, z: 157.45, w: 2.65, d: 0.06 },
    { x: 55.45, z: 154.2, w: 0.06, d: 2.8 },
    { x: 55.45, z: 157.35, w: 0.06, d: 0.2 },
  ].map((value) => Object.freeze(value)),
);
export function squareConstructionPolygons() {
  const rect = (x: number, z: number, w: number, d: number, a = 0) =>
      [
        [-w / 2, -d / 2] satisfies [number, number],
        [w / 2, -d / 2] satisfies [number, number],
        [w / 2, d / 2] satisfies [number, number],
        [-w / 2, d / 2] satisfies [number, number],
      ].map(
        ([u, v]) =>
          [x + u * Math.cos(a) - v * Math.sin(a), z + u * Math.sin(a) + v * Math.cos(a)] satisfies [
            number,
            number,
          ],
      ),
    p = SQUARE_DIGSITE.pit,
    e = SQUARE_DIGSITE.excavator;
  const machine = { x: e.x - 0.53 * Math.sin(e.angle), z: e.z + 0.53 * Math.cos(e.angle) };
  return [
    ...SQUARE_SITE_FENCES.map((f) => rect(f.x, f.z, f.w, f.d)),
    ...SQUARE_CRANES.map((c) => rect(c.x, c.z, 1.05, 1.05)),
    rect(p.x, p.z, p.w + 0.2, p.d + 0.2),
    rect(machine.x, machine.z, 1.2, 2.3, e.angle),
    rect(71.1, 160.3, 0.8, 1.4),
    rect(53.3, 157.02, 0.7, 0.48),
  ];
}
export function inSquareConstruction(x: number, z: number, pad = 0) {
  const s = SQUARE_DIGSITE;
  return (
    (x >= s.west - pad && x <= s.east + pad && z >= s.north - pad && z <= s.south + pad) ||
    (Math.abs(x - 71.1) < 0.8 + pad && z > 157.3 - pad && z < 161.2 + pad)
  );
}
