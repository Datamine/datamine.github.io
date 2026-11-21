import type { Parcel } from './types/parcels.ts';
/** Authored mid-peninsula encounter parcel; shared terrain, infill and collision. */
export const TERMINATOR_FACTORY = Object.freeze({
  x: 78.5,
  z: 150,
  w: 4.4,
  d: 4.6,
  base: 1.15,
  entry: Object.freeze({ x: 78, y: 152.7 }),
});
export function overlapsTerminatorParcel(p: Readonly<Parcel>, padding = 0) {
  const r = TERMINATOR_FACTORY;
  return (
    Math.abs(p.x - r.x) < (p.w + r.w) / 2 + padding + 1 &&
    Math.abs(p.z - r.z) < (p.d + r.d) / 2 + padding + 1
  );
}
