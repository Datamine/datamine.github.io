import type { Street } from './world.ts';
export interface TilePatch {
  type: string;
  polygon: number[][];
  level?: number;
}
export interface EdgeInterval {
  from: number;
  to: number;
}
export interface TileEdge extends EdgeInterval {
  type: string;
  level?: number;
}
export interface SurfaceTile {
  type: string;
  base: string;
  variant: string;
  ports: number;
  curbEdges: number;
  frame?: number;
  waterLevel?: number;
  patches?: TilePatch[] | null;
  edges: (readonly TileEdge[])[];
  areas: Record<string, number>;
  waterBorders?: EdgeInterval[][];
  borders?: (string | null)[];
}
export interface TileType {
  color: string;
  height: number;
  group: string;
  texture?: string;
  walkable: boolean;
}
export interface NavigationObstacle {
  id: string;
  polygon: number[][];
}
export interface TileValidation {
  ok: boolean;
  errors: string[];
  tiles?: number;
  counts?: Record<string, number>;
  components?: number;
  water?: { edges: number; shorelineTiles: number };
  regression?: { ok: boolean; checks: number };
  connectors?: number;
  dimensions?: { x: number; y: number; reference: number; scale: number };
  frontages?: object;
  geography?: object;
}
export interface TileMap {
  size: number;
  step: number;
  tiles: SurfaceTile[];
  validation?: TileValidation;
}
export interface WorldRoute extends Street {
  kind: string;
  halfWidth: number;
}
export interface WorldTileMap extends TileMap {
  blocked?: Uint8Array;
  clearance?: Float32Array;
  road?: Float32Array;
  path?: Float32Array;
  roadFrames?: Float32Array;
  routes: WorldRoute[];
  connectors?: number;
  waterTiles: ReturnType<typeof import('../water-tiles.ts').createWaterTiles>;
  overrideTypes?: Map<number, string>;
  passageCache?: Map<string, unknown>;
  packedTiles?: ReturnType<typeof import('../world-tile-codec.ts').packWorldTiles>;
}
export interface NavigationSnapshot {
  width: number;
  height: number;
  resolution: number;
  offset: number;
  mask: Uint8Array;
  links: Uint8Array;
  regions: Int32Array;
  blockedBy: Uint16Array;
  surface: Uint8Array;
  typeNames: string[];
  obstacles: NavigationObstacle[];
}

/** Fields available while compiling a map; compact runtime snapshots omit these grids. */
export type BuiltWorldTileMap = WorldTileMap &
  Required<
    Pick<WorldTileMap, 'blocked' | 'clearance' | 'road' | 'path' | 'roadFrames' | 'connectors'>
  >;
