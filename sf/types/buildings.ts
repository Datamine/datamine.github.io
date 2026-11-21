import type { Point } from './geometry.ts';
import type { Site, WorldObject, VertexRange } from './world.ts';
import type { GeometryGPU } from './rendering.ts';
import type { Mesh } from '../geometry.ts';
export interface BuildingBase {
  x: number;
  y: number;
  w: number;
  d: number;
  id?: string;
  name?: string;
  label?: string;
  category?: string;
  source?: string;
  color: string;
  style?: string;
  arch?: string;
  trim?: string;
  roof?: string;
  roofColor?: string;
  doorColor?: string;
  signText?: string;
  h?: number;
  worldHeight?: number;
  rotation?: number;
  base?: number;
  inside?: Point;
  entry?: Point;
  localDoor?: number;
  footprint?: number[][];
  interiorObstacles?: number[][][];
  sight?: Site | null;
  object?: WorldObject;
  description?: string;
  searchContainer?: { start: number; count: number };
  loreBook?: { id: string; start: number; count: number };
  searchDefinition?: (typeof import('../config/search-houses.ts').HOUSE_SEARCHES)[number];
  searchIndex?: number;
  match?: string;
  searchHome?: boolean;
  neuralLab?: boolean | ReturnType<typeof import('../ai-lab-interior.ts').neuralLabLayout>;
  activityBuilding?: boolean;
  researchSite?: boolean;
  detail?: boolean;
  rampStart?: number;
}
export type BuildingDefinition = BuildingBase & ({ h: number } | { worldHeight: number });
export type DestinationBuilding = BuildingDefinition & { id: string; name: string; label: string };
export type PlacedBuilding = DestinationBuilding & {
  entry: Point;
  inside: Point;
  localDoor: number;
  rotation?: number;
};
export interface WallSection extends VertexRange {
  side: number;
  windows?: import('../windows.ts').FacadeWindow[];
  mesh?: Mesh;
  gpu?: GeometryGPU;
}
export interface BuildingModel extends WorldObject {
  lo: number[];
  hi: number[];
  mesh: Mesh;
  gpu: GeometryGPU;
  walls?: WallSection[];
  hiddenWalls?: number;
}
export interface TerrainPad {
  cx: number;
  cz: number;
  w: number;
  d: number;
  angle: number;
  height: number;
  onlyLower?: boolean;
}
