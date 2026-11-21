import type { Mesh } from '../geometry.ts';
import type { IndexArray } from './geometry.ts';
export interface SkinnedMesh {
  vertices: Float32Array;
  indices: Uint16Array;
  bonesA: Uint8Array;
  bonesB: Uint8Array;
  weights: Float32Array;
  slots: Uint8Array | Int8Array;
  shades: Float32Array;
  colors?: Float32Array;
  uv?: Float32Array;
  cacheKey?: string;
}
export interface CharacterDraw {
  mesh: SkinnedMesh;
  palette: Float32Array;
  indices: IndexArray;
  bones: Float32Array;
  root: Float32Array;
  normal: Float32Array;
  marker: number;
  pickMesh: { data: Float32Array; indices: IndexArray } | null;
  uvAngle: number;
  normalizeNormals: boolean;
}
export interface CharacterPlacement {
  x: number;
  z: number;
  base: number;
  angle: number;
  height?: number;
  indices?: IndexArray;
}
export type ShaderProgram = WebGLProgram & {
  position: number;
  normal: number;
  color: number;
  uv: number;
  vp: WebGLUniformLocation | null;
  eye: WebGLUniformLocation | null;
  focus: WebGLUniformLocation | null;
  light: WebGLUniformLocation | null;
  shadows: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  glassPass: WebGLUniformLocation | null;
};
export interface GeometryGPU {
  count: number;
  buffer?: WebGLBuffer | null;
  stream?: number;
  glass?: ReturnType<typeof import('../glazing.ts').meshGlassTriangles>;
  batches?: ReturnType<typeof import('../static-batches.ts').packStaticMesh>['batches'];
  indexBuffer?: WebGLBuffer | null;
  indexType?: number;
  indexStride?: number;
  walls?: { gpu: GeometryGPU; dx: number; dz: number; mesh: Mesh }[];
}
export interface UploadMesh {
  data: number[] | Float32Array;
  streamId?: number;
  count?: number;
}
export interface CameraState {
  yaw: number;
  pitch: number;
  cos: number;
  sin: number;
  version: number;
  matrix: Float32Array;
  eye: number[];
  target: number[];
  back: number[];
  right: number[];
  up: number[];
  tan: number;
  terrainRise: number;
}
