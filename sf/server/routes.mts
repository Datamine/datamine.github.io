import type { Point } from '../types/geometry.ts';
interface RouteEntry {
  at: number;
  path?: Point[] | null;
  clear?: boolean;
  from?: Point;
  to?: Point;
}
interface RouteOptions {
  pathTo: (x: number, y: number, from: Point, ignoreCustody?: boolean) => Point[] | null;
  canTravel?: ((from: Point, to: Point, ignoreCustody: boolean) => boolean) | null;
  free?: ((point: Point) => boolean) | null;
  revision?: () => number;
  now?: () => number;
  maxEntries?: number;
  maxPoints?: number;
  ttlMs?: number;
  coreTtlMs?: number;
  replansPerTick?: number;
  replanMs?: number;
}
/** Exact destinations and collision-validated connectors keep shared route
 * cores safe even where several actors occupy different parts of one cell. */
export function createRoutePlanner({
  pathTo,
  canTravel = null,
  free = null,
  revision = () => 0,
  now = performance.now.bind(performance),
  maxEntries = 4096,
  maxPoints = 65536,
  ttlMs = 2000,
  coreTtlMs = 30000,
  replansPerTick = 32,
  replanMs = 4,
}: RouteOptions) {
  const cache = new Map<string, RouteEntry>(),
    exact = canTravel ? new Map<string, RouteEntry>() : cache,
    exactLimit = canTravel ? Math.min(256, Math.floor(maxEntries / 4)) : maxEntries,
    coreLimit = maxEntries - (canTravel ? exactLimit : 0),
    stats = {
      requests: 0,
      hits: 0,
      coreHits: 0,
      direct: 0,
      blocked: 0,
      searches: 0,
      evictions: 0,
      deferred: 0,
      searchMs: 0,
    };
  let points = 0,
    mapVersion = revision(),
    replans = 0,
    tickSearchMs = 0;
  function drop(key: string | null) {
    if (!key) return;
    const entry = cache.get(key);
    if (entry) {
      points -= entry.path?.length || 0;
      cache.delete(key);
    }
  }
  function save(key: string | null, entry: RouteEntry) {
    if (!key || (entry.path?.length || 0) > maxPoints) return;
    drop(key);
    cache.set(key, entry);
    points += entry.path?.length || 0;
    while (cache.size > coreLimit || points > maxPoints) {
      drop(cache.keys().next().value!);
      stats.evictions++;
    }
  }
  function saveExact(key: string | null, entry: RouteEntry) {
    if (exact === cache) {
      save(key, entry);
      return;
    }
    if (!key || !exactLimit) return;
    exact.delete(key!);
    exact.set(key, entry);
    while (exact.size > exactLimit) {
      exact.delete(exact.keys().next().value!);
      stats.evictions++;
    }
  }
  function route(x: number, y: number, from: { x: number; y: number }, ignoreCustody = false) {
    stats.requests++;
    const version = revision();
    if (version !== mapVersion) {
      cache.clear();
      exact.clear();
      points = 0;
      mapVersion = version;
    }
    const valid =
        from &&
        ([x, y, from.x, from.y] satisfies [number, number, number, number]).every(Number.isFinite),
      key = valid
        ? (
            [x, y, from.x, from.y, !!ignoreCustody] satisfies [
              number,
              number,
              number,
              number,
              boolean,
            ]
          ).join(',')
        : null,
      time = now(),
      saved = key && exact.get(key);
    if (saved && time - saved.at < ttlMs) {
      stats.hits++;
      exact.delete(key!);
      exact.set(key!, saved);
      return saved.clear ? [{ x, y }] : (saved.path?.map((n) => ({ ...n })) ?? null);
    }
    if (saved) {
      if (exact === cache) drop(key);
      else exact.delete(key!);
    }
    const started = now();
    let result,
      coreKey: string | null = null;
    try {
      if (valid && canTravel) {
        const to = { x, y };
        // A blocked exact endpoint cannot be made reachable by searching
        // other regional gates. Reject before any graph exploration.
        if (free && (!free(from) || !free(to))) {
          stats.blocked++;
          saveExact(key, { at: time, path: null });
          return null;
        }
        if (canTravel(from, to, ignoreCustody)) {
          stats.direct++;
          saveExact(key, { at: time, clear: true });
          return [to];
        }
        coreKey = (
          [
            'core',
            Math.floor(from.x * 4),
            Math.floor(from.y * 4),
            Math.floor(x * 4),
            Math.floor(y * 4),
            !!ignoreCustody,
          ] satisfies [string, number, number, number, number, boolean]
        ).join(',');
        const core = cache.get(coreKey);
        if (
          core &&
          core.from &&
          core.to &&
          core.path &&
          time - core.at < coreTtlMs &&
          canTravel(from, core.from, ignoreCustody) &&
          canTravel(core.to, to, ignoreCustody)
        ) {
          stats.coreHits++;
          cache.delete(coreKey);
          cache.set(coreKey, core);
          return [{ ...core.from }, ...core.path.map((n) => ({ ...n })), to];
        }
      }
      stats.searches++;
      result = pathTo(x, y, from, ignoreCustody);
      // Cache the successful route's actual anchors. Snapping anchors
      // first can choose the wrong regional doorway or side of a wall.
      if (coreKey && result)
        save(coreKey, {
          at: time,
          path: result.map((n) => ({ ...n })),
          from: { x: from.x, y: from.y },
          to: { x, y },
        });
      else saveExact(key, { at: time, path: result?.map((n) => ({ ...n })) ?? null });
      return result;
    } finally {
      const ms = now() - started;
      stats.searchMs += ms;
      tickSearchMs += ms;
    }
  }
  return {
    pathTo: route,
    beginTick() {
      replans = 0;
      tickSearchMs = 0;
    },
    allowReplan() {
      if (replans >= replansPerTick || tickSearchMs >= replanMs) {
        stats.deferred++;
        return false;
      }
      replans++;
      return true;
    },
    get stats() {
      return { ...stats, entries: cache.size + (exact === cache ? 0 : exact.size), points };
    },
  };
}
