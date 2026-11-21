import type { WorldPoint } from './geometry.ts';
import type { TrafficNode, TrafficEdge } from './roads.ts';
export interface SignalledVehicle {
  from: number;
  to: number;
  distance: number;
  speed: number;
  travel: number;
  dwell?: number;
  crossingCleared?: boolean;
  signalStopped?: boolean;
  signalStops?: number;
  redWait?: number;
  waitingForRed?: boolean;
}
export interface RoadEdge extends TrafficEdge {
  length: number;
  street: string;
}
export interface TrafficCircuit {
  nodes: number[];
  edges: RoadEdge[];
  tour: number[];
  lengths: number[];
  length: number;
}
export interface TrafficCar extends SignalledVehicle, WorldPoint {
  id: string;
  tesla: boolean;
  circuit: TrafficCircuit;
  tourIndex: number;
  turn: number;
  angle: number;
  sight: { id: string; kind: string; label: string; description: string };
}
export interface TrafficSnapshot {
  nodes: TrafficNode[];
  edges: RoadEdge[];
  components: TrafficCircuit[];
  cars: TrafficCar[];
}
export interface SignalApproach extends WorldPoint {
  next: number;
  width: number;
  phase?: number;
  contentNodeId: string;
}
export interface SignalFixture extends WorldPoint {
  base?: number;
  angle: number;
  node: number;
  phase: number;
  overhead?: boolean;
  width?: number;
}
export interface SignalJunction extends WorldPoint {
  id: number;
  axes: SignalApproach[];
  approaches: SignalApproach[];
  offset: number;
  fixtures: number[];
}
export interface BusRoute {
  points: (WorldPoint & { node: number | null })[];
  length: number;
  originStreet: string;
  originDistance: number;
  destinationStreet: string;
}
export interface SlowBus extends SignalledVehicle, WorldPoint {
  id: string;
  tourIndex: number;
  angle: number;
  dwell: number;
  redWait: number;
  signalStops: number;
  arrivals: number;
  destination: string;
  base?: number;
  sight: { id: string; kind: string; label: string; description: string };
}
