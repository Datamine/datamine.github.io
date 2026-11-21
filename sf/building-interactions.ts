// Building meshes, context menus and hover text share this rule. A building

import type { Point } from './types/geometry.ts';

// may describe its service; selecting it never selects the person providing it.
const buildingNPCsByID = Object.freeze({
  links: 'mazarine-clerk',
  cityhall: 'clerk',
  'lucindas-deli': 'deli',
  cotogna: 'chef',
  'shanghai-kelly': 'bartender',
  'ai-lab': 'recruiter',
});
const buildingNPCsByKind = Object.freeze({
  'stock-exchange': 'stockbroker',
  'duel-arena': 'duel-referee',
  'apple-campus': 'tim-apple',
  'robotaxi-dealer': 'robotaxi-sales',
  haberdasher: 'haberdasher',
  'salt-flats': 'salt-activist',
  'gpu-factory': 'gpu-buyer',
  'industrial-center': 'armorer',
  'esoteric-institute': 'esoteric',
  'research-institute': 'researcher',
  'tax-hq': 'tax',
  startup: 'founder',
  capital: 'capital',
  spaceport: 'crew',
  'ski-rental': 'lift',
  'hiking-supplies': 'hiking-supplier',
  fuel: 'fuel-attendant',
  dealership: 'fuel-attendant',
});
export function buildingNPCService(
  site: { id?: string | number; kind?: string } | null | undefined,
) {
  return site
    ? buildingNPCsByID[site.id as keyof typeof buildingNPCsByID] ||
        buildingNPCsByKind[site.kind as keyof typeof buildingNPCsByKind] ||
        null
    : null;
}

/** Staff stand on an actual reachable surface beside their service. The
 * caller supplies the world's native navigation, including highway and Tahoe. */
export function serviceStaffPosition(
  entry: Point,
  {
    walkable,
    canTravel,
  }: { walkable: (p: Point) => boolean; canTravel: (a: Point, b: Point) => boolean },
) {
  for (const [dx, dy] of [
    [0.25, 0.125] satisfies [number, number],
    [-0.25, 0.125] satisfies [number, number],
    [0, 0.25] satisfies [number, number],
    [0, -0.25] satisfies [number, number],
    [0.125, 0] satisfies [number, number],
    [-0.125, 0] satisfies [number, number],
    [0, 0] satisfies [number, number],
  ]) {
    const p = { x: entry.x + dx, y: entry.y + dy };
    if (walkable(p) && canTravel(entry, p)) return p;
  }
  throw new Error('Service needs a reachable staff position at ' + JSON.stringify(entry));
}
