import { isFiniteNumber } from './types/json.ts';
import type { WorldPoint } from './types/geometry.ts';
import type { TrafficNode, TrafficEdge } from './types/roads.ts';
import type {
  SignalJunction,
  SignalFixture,
  SignalApproach,
  SignalledVehicle,
} from './types/traffic.ts';
// CONTENT-BINDINGS-MIGRATED
export const TRAFFIC_LIGHT_SECONDS = 10;
const signalAngle = (a: WorldPoint, b: WorldPoint) =>
  Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z)));

/** Junctions come from the same split road graph that vehicles drive on.
 * nodeIds limits fixtures and phases to the bus route's actual junctions.
 * Opposing approaches share a phase; distinct diagonal roads get their own. */
export function createTrafficSignals({
  nodes,
  edges,
  nodeIds = null,
  roadWidths = new Map(),
  canPlace = () => true,
  avoid = [],
}: {
  nodes: readonly TrafficNode[];
  edges: readonly TrafficEdge[];
  nodeIds?: Pick<ReadonlySet<number>, 'has'> | null;
  roadWidths?: Map<string, number>;
  canPlace?: (x: number, z: number) => boolean;
  avoid?: readonly (WorldPoint & { clearance?: number })[];
}) {
  const junctions: SignalJunction[] = [],
    byNode = new Map<number, SignalJunction>(),
    fixtures: SignalFixture[] = [],
    missing: number[] = [];
  const widthAt = (id: number, next: number) => {
    const edge = edges.find(
      (e) => (e.from === id && e.to === next) || (e.to === id && e.from === next),
    );
    return roadWidths.get(edge?.street || '') || 0.5;
  };
  for (const [id, node] of nodes.entries()) {
    if (nodeIds && !nodeIds.has(id)) continue;
    const approaches: SignalApproach[] = [];
    for (const next of node.neighbors) {
      const n = nodes[next],
        d = Math.hypot(n.x - node.x, n.z - node.z);
      if (d < 1e-7) continue;
      const a: SignalApproach = {
        x: (n.x - node.x) / d,
        z: (n.z - node.z) / d,
        next,
        width: widthAt(id, next),
        contentNodeId: 'traffic-signals.createTrafficSignals.node-1',
      };
      if (!approaches.some((b) => signalAngle(a, b) < 0.12)) approaches.push(a);
    }
    if (approaches.length < 3) continue;
    const axes: SignalApproach[] = [];
    for (const a of approaches) {
      let phase = axes.findIndex((b) => Math.abs(a.x * b.x + a.z * b.z) > Math.cos(0.12));
      if (phase < 0) {
        phase = axes.length;
        axes.push(a);
      }
      a.phase = phase;
    }
    if (axes.length < 2) continue;
    const junction: SignalJunction = {
      id,
      x: node.x,
      z: node.z,
      axes,
      approaches,
      offset: id % axes.length,
      fixtures: [],
    };
    junctions.push(junction);
    byNode.set(id, junction);
    for (const a of approaches) {
      let fixture: SignalFixture | null = null;
      for (const along of [1.05, 1.4, 1.8, 2.2] satisfies [number, number, number, number]) {
        for (const side of [1, -1] satisfies [number, number]) {
          for (const extra of [0.32, 0.18, 0.48, 0.7] satisfies [number, number, number, number]) {
            const across = a.width + extra,
              x = node.x + a.x * along - a.z * side * across,
              z = node.z + a.z * along + a.x * side * across;
            if (
              !canPlace(x, z) ||
              avoid.some((p) => Math.hypot(p.x - x, p.z - z) < (p.clearance ?? 0.55)) ||
              fixtures.some((p) => Math.hypot(p.x - x, p.z - z) < 0.24)
            )
              continue;
            fixture = { x, z, angle: Math.atan2(a.z, a.x), node: id, phase: a.phase! };
            break;
          }
          if (fixture) break;
        }
        if (fixture) break;
      }
      // Tight downtown corners use wire-hung heads above the roadway,
      // leaving narrow sidewalks and building entrances unobstructed.
      if (!fixture)
        fixture = {
          x: node.x + a.x * 0.65,
          z: node.z + a.z * 0.65,
          angle: Math.atan2(a.z, a.x),
          node: id,
          phase: a.phase!,
          overhead: true,
          width: a.width,
        };
      if (fixture) {
        junction.fixtures.push(fixtures.length);
        fixtures.push(fixture);
      }
    }
    if (!junction.fixtures.length) missing.push(id);
  }
  function phase(id: number, time: number) {
    const j = byNode.get(id);
    return j
      ? (Math.floor((Math.max(0, time) + 1e-9) / TRAFFIC_LIGHT_SECONDS) + j.offset) % j.axes.length
      : 0;
  }
  function approachPhase(id: number, from: { x: number; z: number }) {
    const j = byNode.get(id);
    if (!j) return 0;
    const dx = from.x - j.x,
      dz = from.z - j.z,
      d = Math.hypot(dx, dz) || 1;
    let best = -Infinity,
      index = 0;
    for (const [i, a] of j.axes.entries()) {
      const dot = Math.abs((dx * a.x + dz * a.z) / d);
      if (dot > best) {
        best = dot;
        index = i;
      }
    }
    return index;
  }
  function green(id: number, from: { x: number; z: number }, time: number) {
    return !byNode.has(id) || phase(id, time) === approachPhase(id, from);
  }
  function wait(id: number, from: { x: number; z: number }, time: number) {
    const j = byNode.get(id);
    if (!j || green(id, from, time)) return 0;
    const steps = (approachPhase(id, from) - phase(id, time) + j.axes.length) % j.axes.length,
      within = ((time % TRAFFIC_LIGHT_SECONDS) + TRAFFIC_LIGHT_SECONDS) % TRAFFIC_LIGHT_SECONDS;
    return TRAFFIC_LIGHT_SECONDS - within + (steps - 1) * TRAFFIC_LIGHT_SECONDS;
  }
  return {
    junctions,
    fixtures,
    missing,
    byNode,
    phase,
    green,
    wait,
    has: (id: number) => byNode.has(id),
  };
}

/** Consume time at exact stop lines, optional mandatory stops, and phase changes. A green grants the
 * entire crossing, so a phase change cannot strand a vehicle in its center. */
export function advanceSignalledVehicle<T extends SignalledVehicle>(
  vehicle: T,
  dt: unknown,
  time: number,
  {
    nodes,
    signals,
    next,
    stopDistance = 1.25,
    signalStopSeconds = 0,
  }: {
    nodes: readonly WorldPoint[];
    signals?: Pick<ReturnType<typeof createTrafficSignals>, 'has' | 'wait' | 'green'> | null;
    next: (vehicle: T) => void;
    stopDistance?: number;
    signalStopSeconds?: number;
    contentNodeId?: string;
  },
) {
  if (!isFiniteNumber(dt) || dt <= 0 || vehicle.speed <= 0) return;
  let remaining = dt,
    clock = time,
    iterations = 0;
  vehicle.waitingForRed = false;
  while (remaining > 1e-8 && iterations++ < 10000) {
    if ((vehicle.dwell || 0) > 1e-8) {
      const wait = Math.min(remaining, vehicle.dwell!);
      vehicle.dwell = vehicle.dwell! - wait;
      remaining -= wait;
      clock += wait;
      continue;
    }
    const a = nodes[vehicle.from],
      b = nodes[vehicle.to],
      length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-8) {
      next(vehicle);
      vehicle.crossingCleared = false;
      vehicle.signalStopped = false;
      continue;
    }
    const stop = Math.max(0, length - Math.min(stopDistance, length * 0.45));
    if (signals?.has(vehicle.to) && !vehicle.crossingCleared && vehicle.distance >= stop - 1e-8) {
      if (signalStopSeconds > 0 && !vehicle.signalStopped) {
        vehicle.signalStopped = true;
        vehicle.signalStops = (vehicle.signalStops || 0) + 1;
        vehicle.dwell = signalStopSeconds;
        continue;
      }
      if (signals.green(vehicle.to, a, clock)) {
        vehicle.crossingCleared = true;
        vehicle.waitingForRed = false;
      } else {
        const wait = Math.min(remaining, Math.max(1e-8, signals.wait(vehicle.to, a, clock)));
        remaining -= wait;
        clock += wait;
        vehicle.redWait = (vehicle.redWait || 0) + wait;
        vehicle.waitingForRed = true;
        continue;
      }
    }
    const target = signals?.has(vehicle.to) && !vehicle.crossingCleared ? stop : length,
      distance = Math.min(Math.max(0, target - vehicle.distance), remaining * vehicle.speed),
      used = distance / vehicle.speed;
    vehicle.distance += distance;
    vehicle.travel += distance;
    remaining -= used;
    clock += used;
    if (vehicle.distance >= length - 1e-8) {
      next(vehicle);
      vehicle.distance = 0;
      vehicle.crossingCleared = false;
      vehicle.signalStopped = false;
    } else if (used < 1e-10 && vehicle.distance < target - 1e-8) break;
  }
}
