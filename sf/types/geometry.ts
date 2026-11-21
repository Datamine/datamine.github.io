/** Coordinates remain floating point; navigation cells and rendering share these units. */
export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type NumericVector = readonly number[] | Float32Array | Float64Array;
export type IndexArray = readonly number[] | Uint8Array | Uint16Array | Uint32Array;
export type Color = string | readonly number[];
export interface Ray {
  origin: NumericVector;
  dir: NumericVector;
}
export interface Point {
  x: number;
  y: number;
}
export interface WorldPoint {
  x: number;
  z: number;
}
export type TextureUV = readonly (readonly number[])[];
export interface MaterialDescriptor {
  material?: string;
  angle?: number;
  snow?: boolean;
  groom?: number;
  water?: number;
  envelope?: boolean;
  glass?: number;
  window?: number;
  emissive?: number;
  metal?: number;
}
export type Material = string | MaterialDescriptor | TextureUV | null;
