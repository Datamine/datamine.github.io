import type { SceneObject } from './scene-state.ts';
import type { Mesh } from '../geometry.ts';
import type { SignAtlas, Site, WorldObject } from './world.ts';
import type { BuildingModel, TerrainPad } from './buildings.ts';
import type { GeometryGPU, UploadMesh } from './rendering.ts';
export interface ModelContext {
  N: number;
  MAP_SCALE: number;
  mapTile: (value: number) => number;
  mapPosition: (value: number) => number;
  layoutPosition: (value: number) => number;
  terrainHeight: (x: number, z: number) => number;
  naturalHeight: (x: number, z: number) => number;
  cutHousePlot: (pad: TerrainPad) => void;
  occupy: (x: number, z: number, w?: number, d?: number) => void;
  upload: (mesh: UploadMesh, options?: { spatial?: boolean }) => GeometryGPU;
  objects: SceneObject[];
  signs: SignAtlas;
  buildingModels: BuildingModel[];
  sightById: (id: string) => Site | undefined;
  canPlaceScenery: (x: number, z: number, w?: number, d?: number) => boolean;
  isWalkable: (x: number, z: number) => boolean;
  pavingInArea: (x: number, z: number, w?: number, d?: number) => boolean;
  insidePolygon: (x: number, z: number, polygon: readonly (readonly number[])[]) => boolean;
  parcelFits: (polygon: number[][], options?: { park?: boolean }) => boolean;
  COAST: ReturnType<typeof import('../coastline.ts').createSFCoast>;
  MARIN: number[][];
  POND: { x: number; y: number; rx: number; ry: number };
  PANHANDLE: { west: number; east: number; north: number; south: number };
  lakes: readonly { level: number }[];
  getSceneMesh: () => Mesh;
  rectangle: (cx: number, cz: number, w: number, d: number, angle?: number) => number[][];
}
export interface ResidentFixture {
  start: number;
  end: number;
  x: number;
  z: number;
  base: number;
  fixture: { cx: number; cz: number; w: number; d: number };
}

export type RegisterObject = <T extends WorldObject>(
  mesh: Mesh,
  start: number,
  info: T,
  end?: number,
) => T & { mesh: Mesh; start: number; count: number; lo: number[]; hi: number[] };
export type SashWindow = (
  mesh: Mesh,
  isX: boolean,
  plane: number,
  along: number,
  y: number,
  w: number,
  h: number,
  far: boolean,
  bay?: boolean,
  trim?: string,
  seed?: number,
) => void;
