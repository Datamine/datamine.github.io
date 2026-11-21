// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { instituteWalkable } from './institute-interiors.ts';
import { SOUTHERN_CAMPUS_SITES } from './southern-settlement-layout.ts';
export const RESEARCH_CAMPUSES = SOUTHERN_CAMPUS_SITES;
export function researchCampusAt(x: number, z: number) {
  return (
    RESEARCH_CAMPUSES.find((c) => x >= c.west && x <= c.east && z >= c.north && z <= c.south) ||
    null
  );
}
export function researchCampusWalkable(x: number, z: number) {
  const c = researchCampusAt(x, z);
  if (!c) return false;
  if (
    ([-1, 1] satisfies [number, number]).some(
      (side) => Math.hypot(x - c.x - side * 1.55, z - c.z - c.d / 2 - 0.48) < 0.2,
    )
  )
    return false;
  if (Math.abs(x - c.x) <= c.w / 2 + 0.25 && Math.abs(z - c.z) <= c.d / 2 + 0.25)
    return instituteWalkable(c, x, z);
  if (Math.abs(x - c.x - 2.25) < 0.56 && Math.abs(z - c.z - 3.3) < 0.56) return false;
  if (Math.abs(x - c.west - 0.65) < 0.53 && Math.abs(z - c.z - 4.5) < 0.48) return false;
  return true;
}
export const RESEARCH_ROADS = Object.freeze([
  {
    name: contentText('research-layout.module.name-1', {}),
    points: [
      [56.5, 154.5] satisfies [number, number],
      [56.5, 164.5] satisfies [number, number],
      [62, 164.5] satisfies [number, number],
      [62, 181.5] satisfies [number, number],
    ],
  },
]);
export const RESEARCH_PADS = Object.freeze(
  RESEARCH_CAMPUSES.map((c) => ({
    name: c.label,
    x: c.west - 0.3,
    z: c.north - 0.4,
    w: c.east - c.west + 0.6,
    d: c.south - c.north + 0.8,
    height: c.base,
    blend: 6,
  })),
);
export const RESEARCH_ROUTE_NODES = Object.freeze(
  RESEARCH_CAMPUSES.flatMap((c) =>
    [
      [c.x - 2.5, c.z + 3.8] satisfies [number, number],
      [c.x + 2.5, c.z + 3.8] satisfies [number, number],
      [c.x, c.z + 5.15] satisfies [number, number],
      [c.west + 0.6, c.z + 4.5] satisfies [number, number],
      [c.east - 0.6, c.z + 4.5] satisfies [number, number],
      [c.west + 0.6, c.north + 0.2] satisfies [number, number],
      [c.east - 0.6, c.north + 0.2] satisfies [number, number],
    ].map(([x, z]) => ({ x: x - 0.5, y: z - 0.5 })),
  ),
);
