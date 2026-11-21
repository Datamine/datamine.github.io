import type { WorldPoint } from './geometry.ts';
export type AircraftPoint = WorldPoint & { y: number; angle?: number };
export interface BomberDescent {
  from: AircraftPoint;
  to: AircraftPoint;
  heading: number;
  duration: number;
}
export interface BomberState {
  active: boolean;
  phase: string;
  position: AircraftPoint;
  heading: number;
  bank: number;
  rollAngle: number;
  rollElapsed: number | null;
  rollStart: number;
  speed: number;
  boost: boolean;
  target: WorldPoint | null;
  bombReadyAt: number;
  descent: BomberDescent | null;
  elapsed: number;
}
export interface BombFlight extends WorldPoint {
  id: number;
  attacker: number;
  from: AircraftPoint;
  halfWidth: number;
  impactAt: number;
}
export interface BomberCrash {
  from: AircraftPoint;
  to: AircraftPoint;
  heading: number;
}
export type VisibleBomb = BombFlight & { started: number; impacted: boolean };
export type VisibleCrash = BomberCrash & { started: number };
