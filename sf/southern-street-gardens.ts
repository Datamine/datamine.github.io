import type { HeightTerrain } from './types/scenery.ts';
import type { WorldObject } from './types/world.ts';
interface StreetGardenOptions {
  terrain: HeightTerrain;
  entrances: readonly { x: number; z: number }[];
  lamps: readonly { x: number; z: number }[];
  register: (object: WorldObject) => unknown;
}
import type { Mesh } from './geometry.ts';
import { inSouthernVillage } from './southern-village-layout.ts';
import { atDuelArena } from './duel-layout.ts';
import { inSouthBayReserve } from './south-bay-layout.ts';
import { inAirportFieldBillboards } from './airport-billboards.ts';
import { SOUTHERN_ROADS, airportSurfaceTypeAt } from './airship.ts';
import {
  inSouthernHousePlot,
  inSearchHousePlot,
  southernTrailDistance,
  inTimesSquare,
} from './southern-layout.ts';
import { inSouthernCraft, craftFootprint } from './southern-craft-layout.ts';
import { inCivicGrounds } from './southern-district.ts';
import { inSocialGrounds } from './social-layout.ts';
import { researchCampusAt } from './research-layout.ts';
import { inTechGrounds } from './tech-layout.ts';
import { inGPUFactoryGrounds } from './gpu-layout.ts';
import { inJurassicGrounds, inCowPen } from './jurassic-layout.ts';
import { inSquareConstruction } from './square-construction-layout.ts';
import { westernCoastX } from './coastline.ts';
import { inStartupGrounds, SOUTHERN_MAP_END } from './southern-countryside-layout.ts';

/** A planted verge at most once per street segment. Real surfacing and parcel
 * tests leave the curb, sight lines, public paths and entrances unobstructed. */
export function drawSouthernStreetGardens(
  m: Mesh,
  { terrain, entrances, lamps, register }: StreetGardenOptions,
) {
  const beds: { x: number; z: number; w: number; d: number; rotation: number }[] = [];
  for (const [ri, road] of SOUTHERN_ROADS.entries())
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 4) continue;
      const ux = dx / len,
        uz = dz / len,
        side = (ri + i) % 2 ? 1 : -1;
      for (const f of [0.33, 0.67] satisfies [number, number]) {
        const x = a[0] + dx * f - uz * side * 1.1,
          z = a[1] + dz * f + ux * side * 1.1;
        if (inSearchHousePlot(x, z, 0.9) || inStartupGrounds(x, z, 0.4)) continue;
        if (
          inSearchHousePlot(x, z, 0.9) ||
          inSouthernVillage(x, z, 0.5) ||
          atDuelArena(x, z) ||
          inSouthBayReserve(x, z, 0.6) ||
          inAirportFieldBillboards(x, z, 0.6) ||
          inTimesSquare(x, z) ||
          z < 97 ||
          z > SOUTHERN_MAP_END - 1 ||
          x < westernCoastX(z) + 1.8 ||
          x > 82 ||
          airportSurfaceTypeAt(x, z) !== 'grass' ||
          inSouthernHousePlot(x, z, 0.4) ||
          southernTrailDistance(x, z) < 0.7 ||
          inSouthernCraft(x, z, 0.6) ||
          inCivicGrounds(x, z, 1.4) ||
          inSocialGrounds(x, z, 1) ||
          researchCampusAt(x, z) ||
          inTechGrounds(x, z, 1) ||
          inGPUFactoryGrounds(x, z, 1) ||
          inJurassicGrounds(x, z, 1) ||
          inCowPen(x, z, 1) ||
          inSquareConstruction(x, z, 1) ||
          entrances.some((p) => Math.hypot(p.x - x, p.z - z) < 1.6) ||
          lamps.some((p) => Math.hypot(p.x - x, p.z - z) < 0.8) ||
          beds.some((p) => Math.hypot(p.x - x, p.z - z) < 5)
        )
          continue;
        const start = m.data.length,
          y = terrain.height(x, z),
          rotation = Math.atan2(uz, ux),
          p = { x, z, w: 0.65, d: 0.26, rotation };
        const point = (u: number, v: number) =>
          [x + u * ux - v * uz, z + u * uz + v * ux] satisfies [number, number];
        for (let j = 0; j < 6; j++) {
          const u = -0.27 + j * 0.105,
            at = point(u, 0),
            h = terrain.height(...at);
          m.sphere(
            at[0],
            h + 0.13,
            at[1],
            0.085,
            0.13,
            0.08,
            (['#799763', '#8aa56b', '#6c8c67'] satisfies [string, string, string])[j % 3],
            8,
            4,
          );
          if (j % 2)
            m.sphere(
              at[0],
              h + 0.25,
              at[1],
              0.035,
              0.04,
              0.035,
              (['#ce9b88', '#d9bb72', '#b19bc1'] satisfies [string, string, string])[(ri + i) % 3],
              6,
              3,
            );
        }
        for (const side of [-1, 1] satisfies [number, number])
          for (let j = 0; j < 4; j++) {
            const at = point(-0.24 + j * 0.16, side * 0.16),
              h = terrain.height(...at);
            m.box(at[0] - 0.06, h - 0.02, at[1] - 0.04, 0.12, 0.1, 0.08, '#b9ad91', 'stone');
          }
        const footprint = craftFootprint(p);
        register({
          mesh: m,
          start: start / 11,
          count: (m.data.length - start) / 11,
          x: x - 0.4,
          y: z - 0.3,
          w: 0.8,
          d: 0.6,
          base: y,
          arch: 'street-garden',
          preserveGround: true,
          solid: true,
          footprint,
          lo: [x - 0.5, y - 0.1, z - 0.5] satisfies [number, number, number],
          hi: [x + 0.5, y + 0.5, z + 0.5],
        });
        beds.push(p);
        break;
      }
    }
  return beds;
}
