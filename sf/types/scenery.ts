import type { SignAtlas, WorldObject } from './world.ts';
export interface HeightTerrain {
  height: (x: number, z: number) => number;
}
export type PlantTree = (
  x: number,
  z: number,
  kind?: boolean | number,
  trunkOnly?: boolean,
) => WorldObject | null;
export type PlaceBench = (x: number, z: number) => unknown;
export interface LandscapeOptions {
  terrain: HeightTerrain;
  tree: PlantTree;
  bench: PlaceBench;
  roadDistance: (x: number, z: number) => number;
  signs: SignAtlas;
}
