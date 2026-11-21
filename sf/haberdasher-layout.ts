/** Vacant south-facing block frontage, across Research Neighborhood Connector
 * from the existing homes and just north of the GPU Factory. The shop faces north. */
export const HABERDASHER = Object.freeze({
  x: 79,
  z: 166.4,
  w: 3,
  d: 1.8,
  base: 1.6,
  rotation: Math.PI,
  entry: Object.freeze({ x: 78.5, y: 164.5 }),
});
export function inHaberdasherGrounds(x: number, z: number, margin = 0) {
  const h = HABERDASHER;
  return Math.abs(x - h.x) < h.w / 2 + 0.15 + margin && Math.abs(z - h.z) < h.d / 2 + 0.2 + margin;
}
