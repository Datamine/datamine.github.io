import type { WorldChunkPart } from '../world-codec.ts';
import type { UploadMesh } from './rendering.ts';
export interface WorldAsset {
  id: string;
  file: string;
  hash?: string;
  bytes?: number;
}
export interface WorldChunk extends WorldAsset {
  lo: number[];
  hi: number[];
}
export interface CompiledNavigationSummary {
  destinations: number;
  routes: number;
  interactions: number;
}
export interface WorldManifest {
  schema?: number;
  version: string;
  tileSize: number;
  metadata: WorldAsset;
  chunks: WorldChunk[];
  compressedBytes?: number;
  triangles?: number;
  navigation?: CompiledNavigationSummary | null;
}
export interface StreamPart extends WorldChunkPart {
  count: number;
  chunk: WorldChunk;
  glass: ReturnType<typeof import('../glazing.ts').meshGlassTriangles>;
  buffer?: WebGLBuffer;
  indexBuffer?: WebGLBuffer | null;
  indexType?: number;
  indexStride?: number;
  gpuBytes?: number;
}
export interface ResidentChunk {
  chunk: WorldChunk;
  loading: boolean;
  parts: StreamPart[];
  buffers: WebGLBuffer[];
  cpuBytes: number;
  gpuBytes: number;
  lastUsed: number;
  ready: Promise<ResidentChunk> | null;
}
export interface StreamRange {
  data: number[] | Float32Array;
  indices?: WorldChunkPart['indices'];
  part?: StreamPart;
  sourceStart: number;
  localStart: number;
  start: number;
  count: number;
}
export interface StreamMesh {
  streamId?: number;
  count?: number;
  data?: UploadMesh['data'];
}
export interface RangeIndex {
  epoch: number;
  runs: { part: StreamPart; source: number; n: number; local: number }[];
}
export type StreamGL = Pick<
  WebGLRenderingContext,
  'createBuffer' | 'bindBuffer' | 'bufferData' | 'deleteBuffer'
> & {
  readonly ARRAY_BUFFER: number;
  readonly ELEMENT_ARRAY_BUFFER: number;
  readonly STATIC_DRAW: number;
  readonly UNSIGNED_INT: number;
  readonly UNSIGNED_SHORT: number;
} & { getExtension?: (name: 'OES_element_index_uint') => object | null };
export interface WorldStreamOptions {
  gl: StreamGL;
  onChange?: (chunk?: WorldChunk) => void;
  manifest?: WorldManifest | null;
  assetSource?: ((asset: WorldAsset) => Promise<Uint8Array<ArrayBuffer>>) | null;
  retryMs?: number;
  memoryLimitBytes?: number;
  warmAll?: boolean;
}
declare global {
  interface Window {
    __sfWorldAsset?: (version: string, id: string, payload: string) => void;
    __sfWorldManifest?: WorldManifest;
  }
}
