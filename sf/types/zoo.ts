import type { Point } from './geometry.ts';
import type { RouteTo } from './controllers.ts';
export interface PursuitActor extends Point {
  path: Point[];
  angle: number;
  travel: number;
  moving: boolean;
  repath: number;
  target: Point | null;
  index?: number;
}
export interface ZooWarden extends PursuitActor {
  home: Point;
  index: number;
  pace: number;
  netAt: number;
  speechFor?: number;
  speech?: string;
}
export interface TigerState {
  phase: string;
  elapsed: number;
  gate: number;
  tiger: PursuitActor;
  wardens: ZooWarden[];
  dispatchAt: number;
  attempts: number;
  deaths: number;
  grace: number;
}
export interface TigerSnapshot {
  state: TigerState;
  transition: number;
  transitionStart: Point | null;
  patrolDirection: number;
  lastTarget: Point | null;
  dispatched: boolean;
}
export interface TigerOptions {
  player: Point;
  home: Point;
  exit: Point;
  wardenStarts: readonly Point[];
  routeTo: RouteTo;
  canCapture: (actor: Point, target: Point) => boolean;
  canPursue?: () => boolean;
  onDeath?: () => void;
  onEvent?: (event: string, warden?: ZooWarden) => void;
  random?: () => number;
  speed?: number;
}
