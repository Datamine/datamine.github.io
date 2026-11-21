import type { WorldPoint } from './geometry.ts';
export interface VehiclePosition extends WorldPoint {
  y: number;
  angle: number;
}
export interface RoadPoint extends WorldPoint {
  y: number;
  width?: number;
}
export interface RoadSegment {
  a: RoadPoint;
  b: RoadPoint;
  dx: number;
  dz: number;
  length: number;
  index: number;
  nx: number;
  nz: number;
  w: number;
  quad: number[][];
  lo: number[];
  hi: number[];
}
export interface FerrariRoad {
  segments: readonly Pick<RoadSegment, 'a' | 'b' | 'dx' | 'dz' | 'length' | 'index'>[];
  dealerIndex?: number;
  contains: (x: number, z: number) => boolean;
  at: (x: number, z: number) => { height: number } | null;
}
export interface FerrariCityDriving {
  ground: (x: number, z: number) => number;
  nearest: (x: number, z: number) => (VehiclePosition & { score: number }) | null;
  route: (from: WorldPoint, to: WorldPoint) => (WorldPoint & { y: number })[] | null;
  readonly ready?: boolean;
}
export interface FerrariSaved {
  owned: boolean;
  distance: number;
  fuel: number;
  localPosition?: VehiclePosition;
}
export interface FerrariState {
  owned: boolean;
  riding: boolean;
  distance: number;
  fuel: number;
  speed: number;
  target: number | null;
  resume: number | null;
  empty: boolean;
  travel: number;
  direction: number;
  localPosition: VehiclePosition | null;
  localPath: (WorldPoint & { y: number })[];
  destination?: (WorldPoint & { y: number }) | null;
}
export interface TrafficNode extends WorldPoint {
  neighbors: number[];
}
export interface TrafficEdge {
  from: number;
  to: number;
  length?: number;
  street?: string;
}
export interface StreetNetwork {
  nodes: TrafficNode[];
  edges: TrafficEdge[];
}
