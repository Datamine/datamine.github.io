import type { SceneObject, Lake, BeachBillboard } from './scene-state.ts';
import type { WorldTileMap, NavigationSnapshot } from './tiles.ts';
import type { Actor, Site, Street } from './world.ts';
import type { DestinationBuilding, BuildingModel, TerrainPad } from './buildings.ts';
import type { InstituteRoom } from './interiors.ts';

import type { Mesh } from '../geometry.ts';
import type { WorldPoint, Point } from './geometry.ts';
import type { HeightField, SouthernTerrainSnapshot } from '../southern-terrain.ts';
import type { LifeActor } from '../life.ts';
import type { NavigationGraphData } from './navigation.ts';
type Traffic = ReturnType<typeof import('../street-traffic.ts').createStreetTraffic>;
export interface StaticWorldSnapshot {
  searchSites: Site[];
  objects: SceneObject[];
  places: DestinationBuilding[];
  sights: Site[];
  instituteRooms: InstituteRoom[];
  buildingModels: BuildingModel[];
  streetLights: import('./scene-state.ts').LightSource[];
  streets: Street[];
  lakes: Lake[];
  heights: HeightField;
  naturalHeights: HeightField;
  occupied: Uint8Array;
  landMask: Uint8Array;
  reserved: Uint8Array;
  roadIndex: Int16Array;
  roadDistance: Float32Array;
  terrainPads: TerrainPad[];
  sceneMesh: Mesh;
  groundMesh: Mesh;
  highwayMesh: Mesh;
  tahoeMesh: Mesh;
  seaBounds: ReturnType<typeof import('../environment.ts').createSeaSurface>;
  cityLightPlan: ReturnType<typeof import('../street-light-layout.ts').planBlockStreetLights>;
  southernNeighborhood: ReturnType<
    typeof import('../southern-neighborhood.ts').populateSouthernNeighborhood
  >;
  restaurantDiners: import('../restaurants.ts').Diner[];
  restaurantSites: import('../restaurants.ts').RestaurantSite[];
  merchants: Actor[];
  parrots: Actor[];
  jailStaff: Actor[];
  airportAds: import('../airport-billboards.ts').AirportBillboard[];
  airportFieldAds: import('../airport-billboards.ts').AirportFieldBillboard[];
  beachBillboard: BeachBillboard;
  sunglassesSite: Site | null;
  fishingSite: Site | null;
  sandSite: Site | null;
  pacificaSurfSite: Site | null;
  zooBase: number;
  nightclub: Site | null;
  niaCitizen: Actor;
  highwaySites: ReturnType<typeof import('../adventure-sites.ts').createHighwaySites>;
  pequodSite: Site | null;
  ahabNPC: Actor | null;
  minimapRoadPaths: ReturnType<typeof import('../world-minimap.ts').compileMinimapRoads>;
  worldTiles: Pick<WorldTileMap, 'size' | 'step' | 'routes' | 'validation'> & {
    packedTiles: NonNullable<WorldTileMap['packedTiles']>;
  };
  cityNavigation: NavigationSnapshot;
  southernTerrain: SouthernTerrainSnapshot;
  traffic: Pick<Traffic, 'nodes' | 'edges' | 'components' | 'cars'> & {
    route: ReturnType<typeof import('../slow-bus.ts').createSlowBus>['route'];
  };
  lives: {
    city: LifeActor[];
    south: LifeActor[];
    noe: LifeActor[];
    square: LifeActor[];
    berkeley: LifeActor[];
  };
  regionalGraphs: {
    airship: NavigationGraphData | null;
    marin: NavigationGraphData | null;
    berkeley: NavigationGraphData;
  };
  airshipGate: Point;
  cityGate: Point;
  harbor: WorldPoint;
  spawn: Point;
  bike: Point;
  airshipObstacles: number[][][];
}
