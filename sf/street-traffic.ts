import { isFiniteNumber } from './types/json.ts';
import type { WorldPoint } from './types/geometry.ts';
import type { Street } from './types/world.ts';
import type { TrafficNode } from './types/roads.ts';
import type { TrafficSnapshot, TrafficCar, RoadEdge, TrafficCircuit } from './types/traffic.ts';
import type { createTrafficSignals } from './traffic-signals.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { advanceSignalledVehicle } from './traffic-signals.ts';

const trafficCross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
/** Split authored road centerlines at intersections once, then drive through
 * their adjacency graph. Neither pixels nor pedestrian paths define a road. */
export function createStreetTraffic({
  routes,
  isRoad,
  ground,
  count = 4,
  robotaxiCount = 0,
  spawnPoints = [],
  prepared = null,
}: {
  routes: readonly Street[];
  isRoad: (x: number, z: number) => boolean;
  ground: (x: number, z: number) => number;
  count?: number;
  robotaxiCount?: number;
  spawnPoints?: readonly WorldPoint[];
  prepared?: TrafficSnapshot | null;
}) {
  let signals: ReturnType<typeof createTrafficSignals> | null = null,
    elapsed = 0;
  let nodes: TrafficNode[], edges: RoadEdge[], components: TrafficCircuit[], cars: TrafficCar[];
  if (prepared) ({ nodes, edges, components, cars } = prepared);
  else {
    const segments = routes
      .filter((r) => r.kind === 'road')
      .flatMap((r) =>
        r.points.slice(1).map((b, i) => ({
          a: r.points[i],
          b,
          cuts: [0, 1] satisfies [number, number],
          street: r.name || 'street',
        })),
      );
    for (let i = 0; i < segments.length; i++)
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i],
          b = segments[j],
          u = [a.b[0] - a.a[0], a.b[1] - a.a[1]] satisfies [number, number],
          v = [b.b[0] - b.a[0], b.b[1] - b.a[1]] satisfies [number, number],
          w = [b.a[0] - a.a[0], b.a[1] - a.a[1]] satisfies [number, number],
          cross = trafficCross(u, v);
        if (Math.abs(cross) < 1e-8) {
          // Overlapping continuations share junctions too, including where
          // the southern roads continue the city tile's clipped centerlines.
          if (Math.abs(trafficCross(w, u)) < 1e-8) {
            const split = (
              s: { b: number[]; a: number[]; cuts: number[] },
              points: readonly number[][],
            ) => {
              const dx = s.b[0] - s.a[0],
                dz = s.b[1] - s.a[1],
                length = dx * dx + dz * dz;
              if (length < 1e-12) return;
              for (const p of points) {
                const t = ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / length;
                if (t > 0 && t < 1) s.cuts.push(t);
              }
            };
            split(a, [b.a, b.b]);
            split(b, [a.a, a.b]);
          }
          continue;
        }
        const t = trafficCross(w, v) / cross,
          s = trafficCross(w, u) / cross;
        if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
          a.cuts.push(t);
          b.cuts.push(s);
        }
      }
    nodes = [];
    edges = [];
    const ids = new Map<string, number>();
    const node = (p: number[]) => {
      const key = p.map((v) => v.toFixed(4)).join(',');
      if (!ids.has(key)) {
        ids.set(key, nodes.length);
        nodes.push({ x: p[0], z: p[1], neighbors: [] });
      }
      return ids.get(key)!;
    };
    for (const s of segments) {
      const cuts = [...new Set(s.cuts)].sort((a, b) => a - b),
        at = (t: number) => [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
      for (let i = 1; i < cuts.length; i++) {
        const a = at(cuts[i - 1]),
          b = at(cuts[i]),
          length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (length < 0.1) continue;
        const steps = Math.ceil(length / 0.2);
        let safe = true;
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          if (!isRoad(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) {
            safe = false;
            break;
          }
        }
        if (!safe) continue;
        const from = node(a),
          to = node(b);
        if (nodes[from].neighbors.includes(to)) continue;
        nodes[from].neighbors.push(to);
        nodes[to].neighbors.push(from);
        edges.push({ from, to, length, street: s.street });
      }
    }
    components = [];
    const assigned = new Set();
    for (let start = 0; start < nodes.length; start++)
      if (!assigned.has(start)) {
        const ids = [start];
        assigned.add(start);
        for (let i = 0; i < ids.length; i++)
          for (const next of nodes[ids[i]].neighbors)
            if (!assigned.has(next)) {
              assigned.add(next);
              ids.push(next);
            }
        const members = new Set(ids),
          componentEdges = edges.filter((e) => members.has(e.from)),
          pending = new Map(ids.map((id) => [id, [...nodes[id].neighbors]])),
          stack = [start],
          tour: number[] = [];
        // An Euler circuit over both directions of every road guarantees that
        // cars eventually visit every junction, rather than repeating a local
        // turn pattern. This is built once, with no per-frame route search.
        while (stack.length) {
          const at = stack.at(-1)!,
            next = pending.get(at)!.pop();
          if (next === undefined) tour.push(stack.pop()!);
          else stack.push(next);
        }
        tour.reverse();
        const lengths = tour
          .slice(1)
          .map((to, i) =>
            Math.hypot(nodes[to].x - nodes[tour[i]].x, nodes[to].z - nodes[tour[i]].z),
          );
        components.push({
          nodes: ids,
          edges: componentEdges,
          tour,
          lengths,
          length: lengths.reduce((a, b) => a + b, 0),
        });
      }
    components.sort((a, b) => b.length - a.length);
    const fleetSize = Math.max(
        0,
        Math.min(Math.floor(count) + Math.max(0, Math.floor(robotaxiCount)), edges.length),
      ),
      districts = components
        .filter((c) => c.length >= Math.max(5, (components[0]?.length || 0) * 0.1))
        .slice(0, fleetSize);
    if (!districts.length && fleetSize) districts.push(components[0]);
    cars = Array.from({ length: fleetSize }, (_, i) => {
      const circuit = districts[i % districts.length];
      let distance = (circuit.length * (i + 0.2)) / fleetSize,
        tourIndex = 0;
      while (distance >= circuit.lengths[tourIndex]) {
        distance -= circuit.lengths[tourIndex];
        tourIndex++;
      }
      // Spread the live fleet across neighborhoods immediately, while each
      // car retains the same complete patrol after its chosen starting edge.
      const hint = spawnPoints[i];
      if (hint) {
        let best = Infinity;
        for (let j = 0; j < circuit.lengths.length; j++) {
          const a = nodes[circuit.tour[j]],
            b = nodes[circuit.tour[j + 1]],
            dx = b.x - a.x,
            dz = b.z - a.z,
            length = circuit.lengths[j],
            t = Math.max(
              0.02,
              Math.min(0.98, ((hint.x - a.x) * dx + (hint.z - a.z) * dz) / (length * length)),
            ),
            score = (a.x + dx * t - hint.x) ** 2 + (a.z + dz * t - hint.z) ** 2;
          if (score < best) {
            best = score;
            tourIndex = j;
            distance = length * t;
          }
        }
      }
      const from = circuit.tour[tourIndex],
        to = circuit.tour[tourIndex + 1],
        a = nodes[from],
        b = nodes[to],
        tesla = i >= count,
        id = (tesla ? 'tesla-robotaxi-' : 'waymo-') + (tesla ? i - count + 1 : i + 1);
      return {
        id,
        tesla,
        circuit,
        tourIndex,
        from,
        to,
        distance,
        turn: 0,
        angle: Math.atan2(b.z - a.z, b.x - a.x),
        speed: 1.7 + i * 0.16,
        x: a.x,
        z: a.z,
        travel: 0,
        sight: {
          id,
          kind: tesla ? 'robotaxi' : 'waymo',
          label: tesla
            ? contentText('street-traffic.createStreetTraffic.label-1.yes', {})
            : contentText('street-traffic.createStreetTraffic.label-1.no', {}),
          description: tesla
            ? contentText('street-traffic.createStreetTraffic.description-2.yes', {})
            : contentText('street-traffic.createStreetTraffic.description-2.no', {}),
        },
      };
    });
  }
  const nextCar = (car: TrafficCar) => {
    car.tourIndex = (car.tourIndex + 1) % car.circuit.lengths.length;
    car.from = car.circuit.tour[car.tourIndex];
    car.to = car.circuit.tour[car.tourIndex + 1];
    car.distance = 0;
    car.turn++;
  };
  function update(dt: unknown) {
    const stepTime = isFiniteNumber(dt) ? Math.max(0, dt) : 0;
    for (const car of cars) {
      if (signals)
        advanceSignalledVehicle(car, stepTime, elapsed, {
          nodes,
          signals,
          next: nextCar,
          contentNodeId: 'street-traffic.update.node-3',
        });
      else {
        let budget = stepTime * car.speed;
        while (budget > 0) {
          const a = nodes[car.from],
            b = nodes[car.to],
            length = Math.hypot(b.x - a.x, b.z - a.z),
            step = Math.min(budget, length - car.distance);
          car.distance += step;
          car.travel += step;
          budget -= step;
          if (car.distance >= length - 1e-8) nextCar(car);
          else break;
        }
      }
      const a = nodes[car.from],
        b = nodes[car.to],
        length = Math.hypot(b.x - a.x, b.z - a.z),
        t = car.distance / length,
        heading = Math.atan2(b.z - a.z, b.x - a.x);
      // Lane offset tapers at intersections to keep every turn on the road.
      let lane = 0.12 * Math.min(1, car.distance / 0.7, (length - car.distance) / 0.7);
      if (
        !isRoad(
          a.x + (b.x - a.x) * t - Math.sin(heading) * lane,
          a.z + (b.z - a.z) * t + Math.cos(heading) * lane,
        )
      )
        lane = 0;
      car.x = a.x + (b.x - a.x) * t - Math.sin(heading) * lane;
      car.z = a.z + (b.z - a.z) * t + Math.cos(heading) * lane;
      car.angle += Math.max(
        -stepTime * 3.5,
        Math.min(
          stepTime * 3.5,
          Math.atan2(Math.sin(heading - car.angle), Math.cos(heading - car.angle)),
        ),
      );
    }
    elapsed += stepTime;
  }
  update(0);
  return {
    nodes,
    edges,
    components,
    cars,
    update,
    get elapsed() {
      return elapsed;
    },
    setSignals(value: ReturnType<typeof createTrafficSignals>) {
      signals = value;
      for (const car of cars) {
        const a = nodes[car.from],
          b = nodes[car.to],
          length = Math.hypot(b.x - a.x, b.z - a.z);
        car.crossingCleared = car.distance > length - Math.min(1.25, length * 0.45);
      }
    },
    draw(
      m: Mesh,
      viewer: WorldPoint,
      addTarget: (start: number, car: TrafficCar) => void = () => {},
      visible: (x: number, z: number, base: number) => boolean = () => true,
    ) {
      for (const car of cars)
        if (
          Math.hypot(car.x - viewer.x, car.z - viewer.z) < 32 &&
          visible(car.x, car.z, ground(car.x, car.z))
        ) {
          const start = m.data.length;
          (car.tesla ? drawTeslaRobotaxi : drawWaymo)(m, {
            ...car,
            y: ground(car.x, car.z) + 0.045,
          });
          addTarget(start, car);
        }
    },
  };
}

export function drawWaymo(m: Mesh, car: WorldPoint & { y: number; angle: number }) {
  pose(m, car.x, car.y, car.z, car.angle, () => {
    m.box(-0.58, 0.14, -0.245, 1.16, 0.25, 0.49, '#e8eeed', { metal: 0.12 });
    m.box(-0.47, 0.39, -0.235, 0.87, 0.12, 0.47, '#f7f6f0');
    m.box(-0.34, 0.48, -0.205, 0.63, 0.28, 0.41, '#476b78', 'glass');
    m.box(-0.3, 0.75, -0.215, 0.54, 0.055, 0.43, '#f4f4ec');
    for (const side of [-1, 1] satisfies [number, number]) {
      m.box(-0.36, 0.46, side * 0.213, 0.045, 0.3, 0.024, '#e4ece9');
      m.box(0.04, 0.46, side * 0.213, 0.035, 0.3, 0.024, '#e4ece9');
      m.box(-0.36, 0.38, side * 0.249, 0.65, 0.07, 0.008, '#62bdb9');
      // A small W in the turquoise door panel, drawn as geometry.
      for (const [a, b] of [
        [[-0.19, 0.4] satisfies [number, number], [-0.14, 0.365] satisfies [number, number]],
        [[-0.14, 0.365] satisfies [number, number], [-0.08, 0.4] satisfies [number, number]],
        [[-0.08, 0.4] satisfies [number, number], [-0.02, 0.365] satisfies [number, number]],
        [[-0.02, 0.365] satisfies [number, number], [0.03, 0.4] satisfies [number, number]],
      ])
        m.rod(
          [a[0], a[1], side * 0.258] satisfies [number, number, number],
          [b[0], b[1], side * 0.258] satisfies [number, number, number],
          0.009,
          '#f7ffff',
          5,
        );
      for (const x of [-0.36, 0.36] satisfies [number, number]) {
        m.sphere(x, 0.16, side * 0.255, 0.14, 0.14, 0.045, '#2f3c43', 12, 6);
        m.sphere(x, 0.16, side * 0.294, 0.075, 0.075, 0.008, '#b4c7cc', 12, 6);
      }
      m.box(0.583, 0.33, side * 0.15 - 0.055, 0.012, 0.065, 0.11, '#e8f7ee', { emissive: 0.5 });
      m.box(-0.591, 0.32, side * 0.17 - 0.04, 0.012, 0.055, 0.08, '#ca6053');
    }
    m.box(-0.17, 0.8, -0.13, 0.25, 0.035, 0.26, '#dce7e5');
    m.cylinder(-0.05, 0.835, 0, 0.09, 0.11, '#d9e5e4', 16, 0.075);
    m.cylinder(-0.05, 0.885, 0, 0.093, 0.025, '#416c7a', 16);
    for (const side of [-1, 1] satisfies [number, number])
      m.sphere(0.43, 0.48, side * 0.25, 0.055, 0.065, 0.045, '#527c86', 12, 6);
    m.box(0.594, 0.17, -0.18, 0.016, 0.05, 0.36, '#69818c');
  });
}

/** Smooth low canopy, full-width light bars and covered wheel arches. */
export function drawTeslaRobotaxi(
  m: Mesh,
  car: { x: number; y: number; z: number; angle: number },
) {
  pose(m, car.x, car.y, car.z, car.angle, () => {
    m.box(-0.6, 0.16, -0.25, 1.2, 0.23, 0.5, '#d5d5c9', { metal: 0.3 });
    const a = [
        [-0.6, 0.39, -0.25] satisfies [number, number, number],
        [0.6, 0.39, -0.25] satisfies [number, number, number],
        [0.27, 0.69, -0.21] satisfies [number, number, number],
        [-0.28, 0.69, -0.21] satisfies [number, number, number],
      ],
      b = a.map((p) => [p[0], p[1], -p[2]] satisfies [number, number, number]);
    m.quad(a[0], a[1], a[2], a[3], '#6c8990', 'glass');
    m.quad(b[3], b[2], b[1], b[0], '#6c8990', 'glass');
    m.quad(a[3], a[2], b[2], b[3], '#4b6973', 'glass');
    m.quad(a[1], b[1], b[2], a[2], '#658892', 'glass');
    m.quad(b[0], a[0], a[3], b[3], '#536f78', 'glass');
    for (const side of [-1, 1] satisfies [number, number]) {
      m.rod(
        [-0.6, 0.39, side * 0.25] satisfies [number, number, number],
        [-0.28, 0.69, side * 0.21] satisfies [number, number, number],
        0.017,
        '#e8e4d8',
        6,
        {
          metal: 0.2,
        },
      );
      m.rod(
        [0.6, 0.39, side * 0.25] satisfies [number, number, number],
        [0.27, 0.69, side * 0.21] satisfies [number, number, number],
        0.017,
        '#e8e4d8',
        6,
        {
          metal: 0.2,
        },
      );
      m.box(-0.01, 0.38, side * 0.25, 0.018, 0.27, 0.012, '#bbc5be');
      m.box(0.12, 0.37, side * 0.257, 0.12, 0.018, 0.012, '#535e61');
      for (const x of [-0.39, 0.39] satisfies [number, number]) {
        m.sphere(x, 0.16, side * 0.25, 0.145, 0.145, 0.045, '#28383d', 16, 7);
        m.sphere(x, 0.16, side * 0.29, 0.092, 0.092, 0.012, '#a8b4b1', 16, 7);
        for (let i = 0; i < 5; i++) {
          const t = (i * Math.PI * 2) / 5;
          m.rod(
            [x, 0.16, side * 0.304] satisfies [number, number, number],
            [x + Math.cos(t) * 0.08, 0.16 + Math.sin(t) * 0.08, side * 0.304] satisfies [
              number,
              number,
              number,
            ],
            0.008,
            '#d5d6c9',
            5,
          );
        }
      }
    }
    m.box(0.602, 0.35, -0.224, 0.012, 0.035, 0.448, '#d5f1ef', { emissive: 0.7 });
    m.box(-0.614, 0.34, -0.23, 0.012, 0.027, 0.46, '#bf5147', { emissive: 0.3 });
    m.box(0.604, 0.2, -0.17, 0.012, 0.04, 0.34, '#64777c');
    m.box(-0.61, 0.21, -0.08, 0.014, 0.05, 0.16, '#e5dfc5');
  });
}
