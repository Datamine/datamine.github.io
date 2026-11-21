import type { TerrainPad } from './buildings.ts';
export interface Parcel {
  x: number;
  z: number;
  w: number;
  d: number;
  rotation?: number;
  seed?: number;
  lowRiseStyle?: string;
  settlement?: boolean;
  shop?: boolean;
  office?: boolean;
  street?: string;
  district?: string;
  infill?: boolean;
}
export interface ParcelRectangle {
  x: number;
  z: number;
  w: number;
  d: number;
}
export interface ParcelTerrain {
  height: (x: number, z: number) => number;
  cutPlot: (pad: Omit<TerrainPad, 'angle'> & { angle?: number }) => void;
}
