import type { StreetNetwork, TrafficEdge } from './types/roads.ts';
import type { WorldPoint, Point } from './types/geometry.ts';
type ConnectedNetwork = StreetNetwork & { component: Int32Array };
interface CityRoad {
  points: readonly WorldPoint[];
  segments: readonly { a: WorldPoint & { y: number }; b: WorldPoint & { y: number } }[];
  along: (from: Point, to: Point) => Point[] | null | undefined;
  at: (x: number, z: number) => { height: number } | null;
}
/** Reuse the authored street adjacency used by city traffic. Vehicle routes
 * never consult the pedestrian graph, so parks and grass cannot be shortcuts. */
const ferrariStreetNetworks = new WeakMap<StreetNetwork, ConnectedNetwork>();
function ferrariStreetNetwork(source: StreetNetwork | null | undefined) {
  if (!source?.nodes?.length || !source.edges?.length) return null;
  if (ferrariStreetNetworks.has(source)) return ferrariStreetNetworks.get(source)!;
  const component = new Int32Array(source.nodes.length);
  component.fill(-1);
  let id = 0;
  for (let start = 0; start < component.length; start++)
    if (component[start] === -1) {
      const pending = [start];
      component[start] = id;
      for (let i = 0; i < pending.length; i++)
        for (const next of source.nodes[pending[i]].neighbors)
          if (component[next] === -1) {
            component[next] = id;
            pending.push(next);
          }
      id++;
    }
  const result = { ...source, component };
  ferrariStreetNetworks.set(source, result);
  return result;
}
function ferrariEdgePoint(
  a: { x: number; z: number },
  b: { x: number; z: number },
  x: number,
  z: number,
) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    length2 = dx * dx + dz * dz,
    t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length2));
  return {
    x: a.x + dx * t,
    z: a.z + dz * t,
    t,
    angle: Math.atan2(dz, dx),
    score: (x - a.x - dx * t) ** 2 + (z - a.z - dz * t) ** 2,
  };
}
function ferrariStreetNearest(
  network: ConnectedNetwork,
  x: number,
  z: number,
  component: number | null = null,
) {
  let best: (ReturnType<typeof ferrariEdgePoint> & { edge: TrafficEdge }) | null = null;
  for (const edge of network.edges) {
    if (component !== null && network.component[edge.from] !== component) continue;
    const point = ferrariEdgePoint(network.nodes[edge.from], network.nodes[edge.to], x, z);
    if (!best || point.score < best.score) best = { ...point, edge };
  }
  return best;
}
function ferrariStreetPath(
  network: ConnectedNetwork,
  from: { x: number; z: number },
  to: { x: number; z: number },
  component: number | null,
) {
  const a = ferrariStreetNearest(network, from.x, from.z, component),
    b = ferrariStreetNearest(network, to.x, to.z, component);
  if (!a || !b || a.score > 0.4 ** 2 || b.score > 0.4 ** 2) return null;
  if (a.edge === b.edge) return [a, b, to];
  const costs = new Float64Array(network.nodes.length);
  costs.fill(Infinity);
  const parents = new Int32Array(costs.length);
  parents.fill(-1);
  const heap: { id: number; cost: number }[] = [];
  const push = (id: number, cost: number) => {
    let i = heap.length;
    heap.push({ id, cost });
    while (i) {
      const p = (i - 1) >> 1;
      if (heap[p].cost <= cost) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = { id, cost };
  };
  const pop = () => {
    const result = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let c = i * 2 + 1;
        if (c + 1 < heap.length && heap[c + 1].cost < heap[c].cost) c++;
        if (last.cost <= heap[c].cost) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return result;
  };
  for (const id of [a.edge.from, a.edge.to]) {
    const n = network.nodes[id],
      cost = Math.hypot(n.x - a.x, n.z - a.z);
    costs[id] = cost;
    push(id, cost);
  }
  let finish = -1,
    best = Infinity;
  while (heap.length) {
    const { id, cost } = pop();
    if (cost > costs[id] + 1e-8) continue;
    if (cost > best) break;
    const n = network.nodes[id];
    if (id === b.edge.from || id === b.edge.to) {
      const total = cost + Math.hypot(n.x - b.x, n.z - b.z);
      if (total < best) {
        best = total;
        finish = id;
      }
    }
    for (const next of n.neighbors) {
      const q = network.nodes[next],
        candidate = cost + Math.hypot(q.x - n.x, q.z - n.z);
      if (candidate < costs[next]) {
        costs[next] = candidate;
        parents[next] = id;
        push(next, candidate);
      }
    }
  }
  if (finish < 0) return null;
  const middle = [];
  for (let id = finish; id !== -1; id = parents[id]) middle.push(network.nodes[id]);
  return [a, ...middle.reverse(), b, to];
}

/** City streets attach to the highway only at the Bay Bridge approach. The
 * regional part retains its exact centerline, deck heights and every bend. */
export function createFerrariCityRoads({
  road,
  traffic,
  ground,
}: {
  road: CityRoad;
  traffic: StreetNetwork | (() => StreetNetwork | null | undefined);
  ground: (x: number, z: number) => number;
}) {
  let current: ConnectedNetwork | null = null,
    component: number | null = null;
  const network = () => {
    const next = ferrariStreetNetwork(typeof traffic === 'function' ? traffic() : traffic);
    if (next !== current) {
      current = next;
      const entry = road.points[0],
        near = next && ferrariStreetNearest(next, entry.x, entry.z);
      component = near && near.score <= 0.4 ** 2 ? next!.component[near.edge.from] : null;
    }
    return current && component !== null ? current : null;
  };
  function regionalPoint(x: number, z: number) {
    let best: (ReturnType<typeof ferrariEdgePoint> & { y: number }) | null = null;
    for (const s of road.segments) {
      const p = ferrariEdgePoint(s.a, s.b, x, z);
      if (!best || p.score < best.score) best = { ...p, y: s.a.y + (s.b.y - s.a.y) * p.t };
    }
    return best;
  }
  function nearest(x: number, z: number) {
    const graph = network(),
      point = graph && ferrariStreetNearest(graph, x, z, component);
    return point
      ? {
          x: point.x,
          z: point.z,
          y: ground(point.x, point.z),
          angle: point.angle,
          score: point.score,
        }
      : null;
  }
  function route(from: WorldPoint, to: WorldPoint) {
    const graph = network();
    if (!graph) return null;
    const a = regionalPoint(from.x, from.z),
      b = regionalPoint(to.x, to.z),
      onA = a!.score < 1e-10,
      onB = b!.score < 1e-10,
      gate = road.points[0];
    const along = (p: { x: number; z: number }, q: { x: number; z: number }) =>
      road
        .along({ x: p.x - 0.5, y: p.z - 0.5 }, { x: q.x - 0.5, y: q.z - 0.5 })
        ?.map((n) => ({ x: n.x + 0.5, z: n.y + 0.5 }));
    let points;
    if (onA && onB) points = along(from, to);
    else if (onA) {
      const head = along(from, gate),
        tail = ferrariStreetPath(graph, gate, to, component);
      if (!head || !tail) return null;
      points = [...head, ...tail];
    } else if (onB) {
      const head = ferrariStreetPath(graph, from, gate, component),
        tail = along(gate, to);
      if (!head || !tail) return null;
      points = [...head, ...tail];
    } else points = ferrariStreetPath(graph, from, to, component);
    if (!points) return null;
    let previous = from;
    return points
      .filter((p) => {
        if (Math.hypot(p.x - previous.x, p.z - previous.z) < 1e-8) return false;
        previous = p;
        return true;
      })
      .map((p) => ({ x: p.x, z: p.z, y: road.at(p.x, p.z)?.height ?? ground(p.x, p.z) }));
  }
  return {
    ground,
    nearest,
    route,
    get ready() {
      return !!network();
    },
    contains: (x: number, z: number) => {
      const p = nearest(x, z);
      return !!p && p.score <= 0.35 ** 2;
    },
  };
}
