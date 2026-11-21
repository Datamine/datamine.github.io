import type { Mesh } from '../geometry.ts';
import type { Point } from './geometry.ts';
import type { Site, WorldObject } from './world.ts';
export interface RoomGeometry {
  x: number;
  z: number;
  w: number;
  d: number;
  base: number;
  rotation?: number;
  front?: number;
  id?: string;
}
export interface InteriorSection {
  kind: string;
  side: number | null;
  start: number;
  count: number;
}
export interface InteriorDefinition {
  start: number;
  end: number;
  parts: InteriorSection[];
  spec: RoomGeometry;
}
export interface DetachedInterior {
  mesh: Mesh;
  sections: InteriorSection[];
  spec: RoomGeometry;
  lo: number[];
  hi: number[];
}
export interface InstituteRoom extends RoomGeometry {
  sight: Site;
  entry: Point;
  inside?: Point;
  object?: WorldObject;
}
export interface WallOpening {
  x: number;
  y: number;
  w: number;
  h: number;
  arch?: boolean;
  ellipse?: boolean;
  segments?: number;
}

export type InteriorBuilding = Pick<
  import('./buildings.ts').BuildingBase,
  | 'x'
  | 'y'
  | 'w'
  | 'd'
  | 'rotation'
  | 'loreBook'
  | 'searchContainer'
  | 'searchDefinition'
  | 'searchIndex'
  | 'interiorObstacles'
  | 'neuralLab'
>;
