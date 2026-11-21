import type { Point } from './geometry.ts';
import type { WorldObject, Site, Place, InteractiveActor, InteractionSight } from './world.ts';
import type { CharacterDraw } from './rendering.ts';
import type { Mesh } from '../geometry.ts';
export interface CityParcel {
  polygon: number[][];
  kind: string;
  object?: WorldObject;
  place?: import('./buildings.ts').DestinationBuilding;
  street?: string;
  rotation?: number;
}
export interface Lake {
  x: number;
  z: number;
  rx: number;
  rz: number;
  level: number;
}
export interface LightSource {
  x: number;
  y: number;
  z: number;
  radius: number;
  strength: number;
  poolStrength: number;
  color: number[];
}
export interface ActorTag {
  x: number;
  z: number;
  base?: number;
  height?: number;
  label?: string;
  chasing?: boolean;
  player?: boolean;
  police?: boolean;
  pvp?: boolean;
  speech?: string;
  speechUntil?: number;
  speechFor?: number;
  id?: string;
  speechBubble?: boolean;
}
export interface ActorLabel {
  el: HTMLDivElement;
  speech: HTMLSpanElement;
  arrow: HTMLSpanElement;
  name: HTMLSpanElement;
}
export interface TargetMetadata {
  npc?: InteractiveActor;
  sight?: InteractionSight | null;
  place?: Place;
}
export interface PickTarget
  extends
    TargetMetadata,
    Partial<
      Omit<WorldObject, 'mesh' | 'start' | 'count' | 'lo' | 'hi' | 'sight' | 'place' | 'characters'>
    > {
  mesh: Mesh;
  start: number;
  count: number;
  lo: number[];
  hi: number[];
  characters?: CharacterDraw[];
}
export interface ActorTarget extends PickTarget {
  characters: CharacterDraw[];
}
export interface MinimapIcon extends Point {
  place: Place;
  anchorX: number;
  anchorY: number;
}
export interface PlaceMarkerView {
  place: Place;
  button: HTMLButtonElement;
  lastCheck: number;
  version: number;
  blocked: boolean;
}

export interface BeachBillboard {
  x: number;
  z: number;
  angle: number;
  polygon: number[][];
  base: number;
  art: string;
  sight: Site;
  object: WorldObject;
}

export type SceneObject = WorldObject | PickTarget;
