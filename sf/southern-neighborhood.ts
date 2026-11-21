import type { Mesh } from './geometry.ts';
import type { ParcelTerrain } from './types/parcels.ts';
import type { PlantTree, PlaceBench } from './types/scenery.ts';
import type { SignAtlas, WorldObject } from './types/world.ts';
import type { CraftPlot } from './southern-craft-layout.ts';
interface NeighborhoodOptions {
  mesh: Mesh;
  terrain: ParcelTerrain;
  makeTownhomeRow: ReturnType<typeof import('./housing.ts').createHousing>['makeTownhomeRow'];
  tree: PlantTree;
  bench: PlaceBench;
  roadDistance: (x: number, z: number) => number;
  signs: SignAtlas;
  entrances?: readonly { x: number; z: number }[];
  cityRoads?: Parameters<typeof planBlockStreetLights>[0]['roads'];
  cityBuildings?: readonly WorldObject[];
  surfaceType?: (x: number, z: number) => string;
  registerEstate?: (object: WorldObject) => unknown;
}
import { isWizardHousePlot } from './wizard-house.ts';
import { makeSuburbanHome } from './suburban-homes.ts';
import { inSouthernVillage } from './southern-village-layout.ts';
import { atDuelArena } from './duel-layout.ts';
import { drawGardenOffice, drawSouthBayPublicSpaces } from './south-bay-models.ts';
import { inSouthBayReserve } from './south-bay-layout.ts';
import { inArmoryGrounds } from './armory-layout.ts';
import { inAirportFieldBillboards } from './airport-billboards.ts';
import { drawSouthernStreetGardens } from './southern-street-gardens.ts';
import { southernHousingStyle } from './neighborhood-palette.ts';
import { inSouthernCraft } from './southern-craft-layout.ts';
import { CRAFT_SHOPS, drawSouthernCraftSite, drawSouthernPocketGardens } from './southern-craft.ts';
import { inSocialGrounds } from './social-layout.ts';
import { inTechGrounds } from './tech-layout.ts';
import { inHaberdasherGrounds } from './haberdasher-layout.ts';
import { inEstateDistrict } from './estate-layout.ts';
import { makeEstateHouse } from './estate-architecture.ts';
import { createEstateResidents } from './estate-life.ts';
import { drawWoodlandParks } from './woodland-park.ts';
import { rand } from './geometry.ts';
import { inPacificaPark, PACIFICA_PARK } from './southern-expansion.ts';
import { drawPeninsulaDetails } from './peninsula-details.ts';
import { researchCampusAt } from './research-layout.ts';
import { NIGHTLIFE } from './nightlife.ts';
import { drawTimesSquare } from './times-square.ts';
import {
  SOUTHERN_HOUSING,
  isSearchHousePlot,
  inSouthernHousePlot,
  inSearchHousePlot,
  southernTrailDistance,
  inTimesSquare,
  gymAccess,
} from './southern-layout.ts';
import { SOUTHERN_ROADS, airportSurfaceTypeAt } from './airship.ts';
import {
  planBlockStreetLights,
  houseDoorPositions,
  SOUTHERN_STREET_LIGHT_POLICY,
} from './street-light-layout.ts';
import { inSquareConstruction } from './square-construction-layout.ts';
import { inCivicGrounds } from './southern-district.ts';
import { inJurassicGrounds, inCowPen } from './jurassic-layout.ts';
import { inGPUFactoryGrounds } from './gpu-layout.ts';
import { inStartupGrounds } from './southern-countryside-layout.ts';

export function populateSouthernNeighborhood({
  mesh,
  terrain,
  makeTownhomeRow,
  tree,
  bench,
  roadDistance,
  signs,
  entrances = [],
  cityRoads = [],
  cityBuildings = [],
  surfaceType = airportSurfaceTypeAt,
  registerEstate = () => {},
}: NeighborhoodOptions) {
  const houses: Partial<WorldObject>[] = [],
    craftSites: import('./types/world.ts').RenderedSite[] = [];
  for (const [i, p] of SOUTHERN_HOUSING.entries()) {
    if (isWizardHousePlot(p) || isSearchHousePlot(p)) continue;
    if (!p.settlement && inEstateDistrict(p.x, p.z)) {
      const house = makeEstateHouse(mesh, p, terrain);
      registerEstate(house);
      houses.push(house);
    } else if (p.lowRiseStyle) {
      const home = makeSuburbanHome(mesh, p, terrain);
      registerEstate(home);
      houses.push(home);
    } else if (p.infill && p.w >= 3.15 && i % 11 === 3) {
      const entry = [
          p.x - Math.sin(p.rotation || 0) * (p.d / 2 + 0.28),
          p.z + Math.cos(p.rotation || 0) * (p.d / 2 + 0.28),
        ],
        site = drawGardenOffice(
          mesh,
          {
            ...p,
            id: 'peninsula-garden-office-' + i,
            label: (
              ['Cedar Design Offices', 'Garden Studios', 'Bayshore Workshop'] satisfies [
                string,
                string,
                string,
              ]
            )[i % 3],
            height: 1.6 + (i % 3) * 0.35,
            entry: { x: entry[0] - 0.5, y: entry[1] - 0.5 },
          },
          terrain,
        );
      craftSites.push(site);
      houses.push({ ...site, houses: [], homes: 0 });
    } else if (p.shop || (p.infill && p.w >= 3.15 && i % 4 === 1)) {
      const shop = CRAFT_SHOPS[craftSites.length % CRAFT_SHOPS.length],
        plot: CraftPlot = {
          ...p,
          rotation: p.rotation || 0,
          index: craftSites.length,
          id: 'southern-corner-' + i,
          kind: shop.kind,
          palette: ['#a4b8a1', '#d5ad90', '#9fbabc', '#c2a7b0', '#ddc58e'] satisfies [
            string,
            string,
            string,
            string,
            string,
          ],
        },
        entry = [
          p.x - Math.sin(p.rotation || 0) * (p.d / 2 + 0.28),
          p.z + Math.cos(p.rotation || 0) * (p.d / 2 + 0.28),
        ];
      plot.entry = { x: entry[0] - 0.5, y: entry[1] - 0.5 };
      const site = drawSouthernCraftSite(mesh, plot, terrain, signs, shop);
      craftSites.push(site);
      houses.push({ ...site, houses: [], homes: 0 });
    } else
      houses.push(
        makeTownhomeRow(
          p.x - p.w / 2,
          p.z - p.d / 2,
          p.w,
          p.d,
          2,
          p.seed ?? (0.17 + i * 0.083) % 1,
          p.rotation ?? null,
          p.district || southernHousingStyle(p),
        ),
      );
  }
  craftSites.push(...drawSouthernPocketGardens(mesh, terrain, signs));
  const bayGardens = drawSouthBayPublicSpaces(mesh, { terrain, tree });
  craftSites.push(...bayGardens.sites);
  // Coastal pines and broadleaf trees frame the streets and hill contours.
  // Every tree inherits the terrain below it; none brings a square of turf.
  const trees = [];
  for (let i = 0; i < 185; i++) {
    const x = 21 + rand(i, 11, 2) * 50,
      z = 99 + rand(i, 13, 7) * 70;
    if (
      inSearchHousePlot(x, z, 0.9) ||
      inSouthernVillage(x, z, 0.7) ||
      atDuelArena(x, z) ||
      inSouthBayReserve(x, z, 0.6) ||
      inArmoryGrounds(x, z, 1) ||
      inAirportFieldBillboards(x, z, 1) ||
      inSouthernCraft(x, z, 0.65) ||
      inSocialGrounds(x, z, 1) ||
      inTechGrounds(x, z, 1) ||
      inHaberdasherGrounds(x, z, 1) ||
      inGPUFactoryGrounds(x, z, 1) ||
      inJurassicGrounds(x, z, 1) ||
      inCowPen(x, z, 1) ||
      inCivicGrounds(x, z, 1.2) ||
      inSquareConstruction(x, z, 0.6) ||
      inPacificaPark(x, z) ||
      researchCampusAt(x, z) ||
      gymAccess(x, z) ||
      inTimesSquare(x, z) ||
      roadDistance(x, z) < 1.3 ||
      southernTrailDistance(x, z) < 0.95 ||
      inSouthernHousePlot(x, z, 1) ||
      (x > 60 && z < 107) ||
      (x > 64 && z > 128) ||
      x > 74
    )
      continue;
    if (terrain.height(x, z) < 2.5 && i % 3) continue;
    tree(x - 0.5, z - 0.5, i % 3 === 0 ? true : i % 7 === 0 ? 3 : false);
    trees.push({ x, z });
  }
  for (let i = 0; i < 360; i++) {
    const x = 54 + rand(i, 21, 4) * 26,
      z = 117 + rand(i, 19, 8) * 30;
    if (
      inSearchHousePlot(x, z, 0.9) ||
      inStartupGrounds(x, z, 0.6) ||
      inSouthernVillage(x, z, 0.7) ||
      atDuelArena(x, z) ||
      inSouthBayReserve(x, z, 0.6) ||
      inArmoryGrounds(x, z, 1) ||
      inAirportFieldBillboards(x, z, 1) ||
      inSouthernCraft(x, z, 0.65) ||
      inCivicGrounds(x, z, 1.2) ||
      roadDistance(x, z) < 1.15 ||
      southernTrailDistance(x, z) < 0.95 ||
      inSouthernHousePlot(x, z, 0.5) ||
      entrances.some((p) => Math.hypot(p.x - x, p.z - z) < 1.3)
    )
      continue;
    tree(x - 0.5, z - 0.5, true, true);
    trees.push({ x, z, evergreen: true });
  }
  for (const [x, z] of [
    [44.3, 112.1] satisfies [number, number],
    [47.6, 113.6] satisfies [number, number],
    [52.2, 109.4] satisfies [number, number],
  ])
    bench(x, z);
  for (let i = 0; i < 22; i++) {
    const x = 31 + rand(i, 7, 5) * 21,
      z = 107 + rand(i, 5, 4) * 42;
    if (
      inSearchHousePlot(x, z, 0.9) ||
      inSouthernHousePlot(x, z, 1) ||
      inPacificaPark(x, z) ||
      roadDistance(x, z) < 1.3 ||
      southernTrailDistance(x, z) < 0.9
    )
      continue;
    const h = terrain.height(x, z),
      r = 0.18 + rand(i, 8, 9) * 0.23;
    mesh.sphere(
      x,
      h + 0.07,
      z,
      r,
      0.17 + r * 0.2,
      r * 0.8,
      i % 2 ? '#a7ab93' : '#919b85',
      14,
      8,
      'dirt',
    );
    for (let j = 0; j < 3; j++)
      mesh.sphere(x + 0.32 + j * 0.1, h + 0.1, z + 0.18, 0.12, 0.13, 0.11, '#7a9252', 8, 5);
  }
  const woods = drawWoodlandParks(mesh, { terrain, tree, bench, roadDistance, signs });
  trees.push(...woods.trees);
  const avoid = [
    ...entrances,
    ...craftSites.map((s) => ({ x: s.entry.x + 0.5, z: s.entry.y + 0.5 })),
    ...[NIGHTLIFE.entry, PACIFICA_PARK.entry].map((p) => ({ x: p.x + 0.5, z: p.y + 0.5 })),
  ];
  avoid.push(...houseDoorPositions([...houses, ...cityBuildings]));
  const lightPlan = planBlockStreetLights({
      roads: [...cityRoads, ...SOUTHERN_ROADS],
      surfaceType,
      avoid,
      minZ: 78,
      ...SOUTHERN_STREET_LIGHT_POLICY,
    }),
    lamps = lightPlan.lamps;
  const streetGardens = drawSouthernStreetGardens(mesh, {
    terrain,
    entrances: avoid,
    lamps,
    register: registerEstate,
  });
  return {
    people: bayGardens.people,
    streetGardens,
    craftSites,
    houses,
    residents: createEstateResidents(houses),
    trees,
    lamps,
    lightPlan,
    sights: [
      ...craftSites,
      drawTimesSquare(mesh, signs),
      drawPeninsulaDetails(mesh, terrain, signs, tree),
      ...woods.sites,
    ],
    diners: [],
    cupertino: null as ReturnType<
      typeof import('./cupertino-gardens.ts').drawCupertinoGardens
    > | null,
    countryside: null as ReturnType<
      typeof import('./southern-countryside.ts').drawSouthernCountryside
    > | null,
    village: null as ReturnType<typeof import('./southern-village.ts').drawSouthernVillage> | null,
  };
}
