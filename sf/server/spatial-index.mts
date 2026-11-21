export interface SpatialActor {
  id: number | string;
  x: number;
  z: number;
  mode?: string;
}
interface Candidate<T> {
  actor: T;
  distance: number;
}
const idBefore = (a: Pick<SpatialActor, 'id'>, b: Pick<SpatialActor, 'id'>) =>
  typeof a.id === 'number' && typeof b.id === 'number' ? a.id < b.id : String(a.id) < String(b.id);
const before = <T extends SpatialActor>(a: Candidate<T>, b: Candidate<T>) =>
  a.distance < b.distance || (a.distance === b.distance && idBefore(a.actor, b.actor));
function closest<T extends SpatialActor>(
  actors: Iterable<T>,
  x: number,
  z: number,
  radius: number,
  cap: number,
) {
  const heap: Candidate<T>[] = [],
    rr = radius * radius;
  for (const actor of actors) {
    const distance = (actor.x - x) ** 2 + (actor.z - z) ** 2;
    if (distance > rr) continue;
    if (
      heap.length >= cap &&
      (distance > heap[0].distance ||
        (distance === heap[0].distance && !idBefore(actor, heap[0].actor)))
    )
      continue;
    const item = { actor, distance };
    if (heap.length < cap) {
      let i = heap.length;
      heap.push(item);
      while (i) {
        const parent = (i - 1) >> 1;
        if (!before(heap[parent], item)) break;
        heap[i] = heap[parent];
        i = parent;
      }
      heap[i] = item;
    } else {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && before(heap[child], heap[child + 1])) child++;
        if (!before(item, heap[child])) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = item;
    }
  }
  return heap;
}
/** Rebuilt once per simulation/broadcast, never once per observer. Half-tile
 * candidate caches are shared by neighboring observers; final distances are
 * exact, with bounded top-K selection instead of sorting the entire crowd. */
export class SpatialIndex<T extends SpatialActor = SpatialActor> {
  size: number;
  buckets: Map<string, T[]>;
  cache: Map<string, T[]>;
  stats: { queries: number; candidates: number; cacheHits: number };
  constructor(size = 24) {
    this.size = size;
    this.buckets = new Map();
    this.cache = new Map();
    this.stats = { queries: 0, candidates: 0, cacheHits: 0 };
  }
  rebuild(actors: Iterable<T>) {
    this.buckets.clear();
    this.cache.clear();
    for (const actor of actors) {
      const key = Math.floor(actor.x / this.size) + ',' + Math.floor(actor.z / this.size);
      let bucket = this.buckets.get(key);
      if (!bucket) this.buckets.set(key, (bucket = []));
      bucket.push(actor);
    }
  }
  *within(x: number, z: number, radius: number) {
    const rr = radius * radius;
    for (
      let iz = Math.floor((z - radius) / this.size);
      iz <= Math.floor((z + radius) / this.size);
      iz++
    )
      for (
        let ix = Math.floor((x - radius) / this.size);
        ix <= Math.floor((x + radius) / this.size);
        ix++
      )
        for (const actor of this.buckets.get(ix + ',' + iz) || []) {
          this.stats.candidates++;
          if (actor.mode !== 'hidden' && (actor.x - x) ** 2 + (actor.z - z) ** 2 <= rr) yield actor;
        }
  }
  near(x: number, z: number, radius: number, limit = Infinity, exclude: T | null = null) {
    this.stats.queries++;
    if (limit <= 0) return [];
    const qx = Math.floor(x * 2),
      qz = Math.floor(z * 2),
      cx = (qx + 0.5) / 2,
      cz = (qz + 0.5) / 2,
      delta = Math.SQRT2 / 4 + 1e-9,
      cap = limit === Infinity ? Infinity : limit + 1,
      key = qx + ',' + qz + ',' + radius + ',' + limit;
    let candidates = this.cache.get(key);
    if (candidates) this.stats.cacheHits++;
    else {
      const nearby = [...this.within(cx, cz, radius + delta)];
      if (nearby.length <= cap) candidates = nearby;
      else {
        const heap = closest(nearby, cx, cz, radius + delta, cap),
          threshold = Math.sqrt(heap[0].distance) + 2 * delta;
        // Each observer is at most delta from this center. Anything
        // farther than kth-distance + 2*delta cannot enter its top K.
        // Include boundary ties; never truncate arbitrary crowd ties.
        candidates = nearby.filter((a) => (a.x - cx) ** 2 + (a.z - cz) ** 2 <= threshold ** 2);
      }
      this.cache.set(key, candidates);
    }
    const found = closest(candidates, x, z, radius, cap);
    found.sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0));
    return found
      .filter((n) => n.actor !== exclude)
      .slice(0, limit)
      .map((n) => n.actor);
  }
}
