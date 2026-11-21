import type {
  WorldAsset,
  WorldChunk,
  WorldManifest,
  WorldStreamOptions,
  StreamPart,
  ResidentChunk,
  StreamRange,
  StreamMesh,
  RangeIndex,
} from './types/world-stream.ts';
import { errorMessage } from './types/json.ts';
import { worldBytes, decodeWorldMetadata, decodeWorldChunk } from './world-codec.ts';
import { meshGlassTriangles } from './glazing.ts';
import { expandIndexedVertices } from './indexed-geometry.ts';

export const COMPILED_WORLD: WorldManifest | null = null;
const worldCacheBase = new URL('./world-cache/', import.meta.url).href;
const worldAssetRequests = new Map<
  string,
  { resolve: (value: Uint8Array<ArrayBuffer>) => void; reject: (error: unknown) => void }
>();
let worldCacheDatabase: Promise<IDBDatabase | null>;
export function openWorldCache() {
  if (worldCacheDatabase) return worldCacheDatabase;
  return (worldCacheDatabase = new Promise((resolve) => {
    try {
      const request = indexedDB.open('sf-static-world', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('assets');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));
}
async function worldCacheAction<T = unknown>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | true | null> {
  const db = await openWorldCache();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('assets', mode),
        request = action(tx.objectStore('assets'));
      tx.oncomplete = () => resolve(request ? (request.result ?? null) : true);
      tx.onerror = tx.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
export const clearWorldCache = () => worldCacheAction('readwrite', (store) => store.clear());
export async function refreshWorldMap() {
  await clearWorldCache();
  const url = new URL(location.href);
  url.searchParams.set('mapRefresh', String(Date.now()));
  location.href = url.href;
}
export function worldAssetCacheKey(version: string, descriptor: Pick<WorldAsset, 'id' | 'hash'>) {
  return descriptor.hash ? 'asset:' + descriptor.hash : version + ':' + descriptor.id;
}
async function pruneWorldCache(manifest: WorldManifest) {
  const keep = new Set(
    [manifest.metadata, ...manifest.chunks].map((d) => worldAssetCacheKey(manifest.version, d)),
  );
  await worldCacheAction('readwrite', (store) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (typeof cursor.key !== 'string' || !keep.has(cursor.key)) cursor.delete();
      cursor.continue();
    };
    return null;
  });
}
function worldScript(url: string) {
  return new Promise<void>((resolve, reject) => {
    const node = document.createElement('script'),
      fail = () => {
        node.remove();
        clearTimeout(timeout);
        reject(Error('Could not load map data. Check the connection or refresh the map.'));
      },
      timeout = setTimeout(fail, 15000);
    node.src = url;
    node.onload = () => {
      clearTimeout(timeout);
      node.remove();
      resolve();
    };
    node.onerror = fail;
    document.head.append(node);
  });
}
if (typeof window !== 'undefined')
  window.__sfWorldAsset = (version: string, id: string, payload: string) => {
    const request = worldAssetRequests.get(version + ':' + id);
    if (request) {
      worldAssetRequests.delete(version + ':' + id);
      request.resolve(worldBytes(payload));
    }
  };
async function inflateWorld(bytes: BlobPart) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export function chunkDistance(chunk: Pick<WorldChunk, 'lo' | 'hi'>, x: number, z: number) {
  const dx = Math.max(chunk.lo[0] - x, 0, x - chunk.hi[0]),
    dz = Math.max(chunk.lo[2] - z, 0, z - chunk.hi[2]);
  return Math.hypot(dx, dz);
}
export function worldViewPlanes(matrix: number[] | Float32Array<ArrayBuffer>) {
  const planes = [];
  for (const row of [0, 1, 2] satisfies [number, number, number])
    for (const side of [-1, 1] satisfies [number, number])
      planes.push([
        matrix[3] + side * matrix[row],
        matrix[7] + side * matrix[4 + row],
        matrix[11] + side * matrix[8 + row],
        matrix[15] + side * matrix[12 + row],
      ] satisfies [number, number, number, number]);
  return planes;
}
export function chunkInWorldView(chunk: Pick<WorldChunk, 'lo' | 'hi'>, planes: number[][] | null) {
  if (!planes) return false;
  for (const [a, b, c, d] of planes)
    if (
      a * (a >= 0 ? chunk.hi[0] : chunk.lo[0]) +
        b * (b >= 0 ? chunk.hi[1] : chunk.lo[1]) +
        c * (c >= 0 ? chunk.hi[2] : chunk.lo[2]) +
        d <
      0
    )
      return false;
  return true;
}
export async function loadWorldManifest() {
  if (COMPILED_WORLD) return COMPILED_WORLD;
  await worldScript(worldCacheBase + 'manifest.js?build=' + Date.now());
  if (!window.__sfWorldManifest) throw Error('Build the map first with npm run build.');
  return window.__sfWorldManifest;
}

export async function createWorldStream({
  gl,
  onChange = () => {},
  manifest: providedManifest = null,
  assetSource = null,
  retryMs = 5000,
  memoryLimitBytes = 0,
  warmAll = false,
}: WorldStreamOptions) {
  const manifest = providedManifest ?? (await loadWorldManifest());
  const url = new URL(
      typeof location === 'undefined' ? 'http://localhost/explore.html' : location.href,
    ),
    refresh = url.searchParams.get('mapRefresh');
  if (refresh) {
    url.searchParams.delete('mapRefresh');
    history.replaceState(null, '', url);
    await clearWorldCache();
  }
  const pending = new Map<string, Promise<Uint8Array<ArrayBuffer>>>(),
    resident = new Map<string, ResidentChunk>(),
    meshParts = new Map<number, StreamPart[]>(),
    gpuHandles = new Map<number, { stream: number; count: number }>(),
    cached = new Set<string>(),
    failures = new Map<string, number>(),
    ahead = new Set<string>(),
    rangeIndices = new Map<number, RangeIndex>(),
    remaining = new Set(manifest.chunks.map((c) => c.id));
  let focus: { x: number; z: number; radius: number; active?: boolean } = {
      x: 0,
      z: 0,
      radius: 24,
    },
    background = false,
    downloading = false,
    stopped = false,
    epoch = 0,
    timer: ReturnType<typeof setTimeout> | null = null,
    viewPlanes: number[][] | null = null,
    wantedPlan: WorldChunk[] | null = null,
    wantedKey = '';
  const loading = new Set();
  let useClock = 0,
    lastUsePlan: WorldChunk[] | null = null,
    uintElements = !!gl.getExtension?.('OES_element_index_uint');
  memoryLimitBytes =
    Number.isFinite(memoryLimitBytes) && memoryLimitBytes > 0 ? memoryLimitBytes : 0;
  const stats = {
    startup: [] as { stage: string; ms: number }[],
    version: manifest.version,
    chunks: manifest.chunks.length,
    resident: 0,
    cached: 0,
    cacheHits: 0,
    network: 0,
    triangles: 0,
    cachedBytes: 0,
    totalBytes: manifest.compressedBytes || 0,
    queuedVisible: 0,
    cacheAvailable: null as true | false | boolean | null,
    error: null as string | null,
    cpuBytes: 0,
    gpuBytes: 0,
    residentBytes: 0,
    peakBytes: 0,
    memoryLimitBytes,
    evictions: 0,
  };
  function noteCached(descriptor: WorldAsset) {
    remaining.delete(descriptor.id);
    if (!cached.has(descriptor.id)) {
      cached.add(descriptor.id);
      stats.cachedBytes += descriptor.bytes || 0;
      stats.cached = cached.size;
    }
  }
  // Read the small key index once. A warm session need not reread/decompress
  // the entire world just to discover which distant chunks are already saved.
  if (!assetSource) {
    const keys = await worldCacheAction('readonly', (store) => store.getAllKeys());
    if (Array.isArray(keys)) {
      stats.cacheAvailable = true;
      const present = new Set(keys);
      for (const descriptor of [manifest.metadata, ...manifest.chunks])
        if (present.has(worldAssetCacheKey(manifest.version, descriptor))) noteCached(descriptor);
    } else stats.cacheAvailable = false;
  }
  async function asset(descriptor: WorldAsset): Promise<Uint8Array<ArrayBuffer>> {
    const key = worldAssetCacheKey(manifest.version, descriptor);
    if (pending.has(key)) return pending.get(key)!;
    const promise = (async () => {
      if (assetSource) {
        stats.network++;
        const bytes = await assetSource(descriptor);
        noteCached(descriptor);
        return bytes;
      }
      const cachedBytes = await worldCacheAction<unknown>('readonly', (store) => store.get(key));
      if (cachedBytes instanceof Uint8Array || cachedBytes instanceof ArrayBuffer) {
        stats.cacheAvailable = true;
        stats.cacheHits++;
        noteCached(descriptor);
        return new Uint8Array(cachedBytes);
      }
      stats.network++;
      const requestKey = manifest.version + ':' + descriptor.id;
      const data = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) =>
        worldAssetRequests.set(requestKey, { resolve, reject }),
      );
      let bytes: Uint8Array<ArrayBuffer>;
      try {
        await worldScript(
          worldCacheBase + descriptor.file + (refresh ? '?refresh=' + refresh : ''),
        );
        if (worldAssetRequests.has(requestKey))
          throw Error('Map chunk did not register: ' + descriptor.id);
        bytes = await data;
      } catch (error) {
        worldAssetRequests.delete(requestKey);
        throw error;
      }
      const written = await worldCacheAction('readwrite', (store) => store.put(bytes, key));
      stats.cacheAvailable = written !== null;
      noteCached(descriptor);
      return bytes;
    })();
    pending.set(key, promise);
    try {
      return await promise;
    } finally {
      pending.delete(key);
    }
  }
  async function metadata() {
    const bytes = await asset(manifest.metadata);
    try {
      return decodeWorldMetadata(await inflateWorld(bytes));
    } catch (error) {
      await worldCacheAction('readwrite', (s) =>
        s.delete(worldAssetCacheKey(manifest.version, manifest.metadata)),
      );
      throw error;
    }
  }
  function gpu(mesh: { streamId: number; count: number }) {
    if (!gpuHandles.has(mesh.streamId))
      gpuHandles.set(mesh.streamId, { stream: mesh.streamId, count: mesh.count });
    return gpuHandles.get(mesh.streamId)!;
  }
  function preparePart(part: StreamPart, record: ResidentChunk) {
    const indexed = part.indices && (!(part.indices instanceof Uint32Array) || uintElements),
      vertices =
        part.indices && !indexed ? expandIndexedVertices(part.data, part.indices) : part.data;
    const allocate = (target: number, data: BufferSource) => {
      const buffer = gl.createBuffer();
      if (!buffer) throw Error('Could not prepare map graphics. Retrying…');
      record.buffers.push(buffer);
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return buffer;
    };
    part.buffer = allocate(gl.ARRAY_BUFFER, vertices);
    part.indexBuffer = indexed ? allocate(gl.ELEMENT_ARRAY_BUFFER, part.indices!) : null;
    part.indexType = part.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    part.indexStride = part.indices?.BYTES_PER_ELEMENT || 0;
    part.gpuBytes = vertices.byteLength + (indexed ? part.indices!.byteLength : 0);
    record.gpuBytes += part.gpuBytes;
  }
  function memoryStats() {
    stats.residentBytes = stats.cpuBytes + stats.gpuBytes;
    stats.peakBytes = Math.max(stats.peakBytes, stats.residentBytes);
  }
  function trim() {
    if (!memoryLimitBytes || stats.residentBytes <= memoryLimitBytes) return;
    const protectedTiles = new Set(wanted().map((c) => c.id)),
      candidates = [...resident.values()]
        .filter((r) => !r.loading && !protectedTiles.has(r.chunk.id))
        .sort((a, b) => a.lastUsed - b.lastUsed);
    let changed = false;
    for (const record of candidates) {
      if (stats.residentBytes <= memoryLimitBytes * 0.85) break;
      for (const buffer of record.buffers) gl.deleteBuffer(buffer);
      for (const part of record.parts) {
        meshParts.set(
          part.mesh,
          meshParts.get(part.mesh)!.filter((p) => p !== part),
        );
        stats.triangles -= part.count / 3;
      }
      resident.delete(record.chunk.id);
      stats.resident--;
      stats.evictions++;
      stats.cpuBytes -= record.cpuBytes;
      stats.gpuBytes -= record.gpuBytes;
      memoryStats();
      changed = true;
    }
    if (changed) {
      epoch++;
      rangeIndices.clear();
      onChange();
    }
  }
  function load(chunk: WorldChunk) {
    if (resident.has(chunk.id)) {
      const record = resident.get(chunk.id)!;
      record.lastUsed = ++useClock;
      return record.ready!;
    }
    const record: ResidentChunk = {
      chunk,
      loading: true,
      parts: [],
      buffers: [],
      cpuBytes: 0,
      gpuBytes: 0,
      lastUsed: ++useClock,
      ready: null,
    };
    resident.set(chunk.id, record);
    record.ready = (async () => {
      try {
        const bytes = await inflateWorld(await asset(chunk)),
          parts = decodeWorldChunk(bytes);
        record.cpuBytes = bytes.byteLength;
        for (const part of parts) {
          const item = {
            ...part,
            count: part.indices?.length ?? part.data.length / 11,
            glass: meshGlassTriangles(part.data, part.indices),
            chunk,
          };
          preparePart(item, record);
          record.parts.push(item);
          if (!meshParts.has(part.mesh)) meshParts.set(part.mesh, []);
          meshParts.get(part.mesh)!.push(item);
          stats.triangles += item.count / 3;
        }
        record.loading = false;
        stats.resident++;
        stats.cpuBytes += record.cpuBytes;
        stats.gpuBytes += record.gpuBytes;
        memoryStats();
        trim();
        failures.delete(chunk.id);
        if (!failures.size) stats.error = null;
        stats.queuedVisible = visiblePendingCount();
        epoch++;
        rangeIndices.clear();
        onChange(chunk);
        return record;
      } catch (error) {
        for (const buffer of record.buffers) gl.deleteBuffer(buffer);
        for (const part of record.parts) {
          meshParts.set(
            part.mesh,
            meshParts.get(part.mesh)!.filter((p) => p !== part),
          );
          stats.triangles -= part.count / 3;
        }
        if (!record.loading) {
          stats.resident--;
          stats.cpuBytes -= record.cpuBytes;
          stats.gpuBytes -= record.gpuBytes;
          memoryStats();
        }
        resident.delete(chunk.id);
        stats.queuedVisible = visiblePendingCount();
        epoch++;
        rangeIndices.clear();
        failures.set(chunk.id, Date.now() + retryMs);
        stats.error = errorMessage(error);
        remaining.add(chunk.id);
        if (cached.delete(chunk.id)) stats.cachedBytes -= chunk.bytes || 0;
        stats.cached = cached.size;
        await worldCacheAction('readwrite', (store) =>
          store.delete(worldAssetCacheKey(manifest.version, chunk)),
        );
        throw error;
      }
    })();
    return record.ready!;
  }
  function wanted(radius = focus.radius) {
    if (focus.active === false) return [];
    const key = [
      Math.floor(focus.x * 4),
      Math.floor(focus.z * 4),
      radius,
      ...(viewPlanes || []).flatMap(
        (p) => [p[0], p[1], p[2], Math.floor(p[3] * 8)] satisfies [number, number, number, number],
      ),
    ].join(':');
    if (wantedPlan && key === wantedKey) return wantedPlan;
    wantedKey = key;
    const core =
        Math.floor(focus.x / manifest.tileSize) + ',' + Math.floor(focus.z / manifest.tileSize),
      score = (c: WorldChunk) =>
        c.id === core ? -2 : c.id === 'global' ? -1 : chunkDistance(c, focus.x, focus.z);
    return (wantedPlan = manifest.chunks
      .filter(
        (c) => chunkDistance(c, focus.x, focus.z) <= radius || chunkInWorldView(c, viewPlanes),
      )
      .sort((a: WorldChunk, b: WorldChunk) => score(a) - score(b)));
  }
  async function ensure(
    x: number,
    z: number,
    radius = 12,
    progress: (done: number, total: number) => void = () => {},
    matrix: number[] | Float32Array | null = null,
  ) {
    focus = { x, z, radius };
    if (matrix) viewPlanes = worldViewPlanes(matrix);
    const chunks = wanted();
    let done = 0,
      index = 0;
    await Promise.all(
      ([0, 1] satisfies [number, number]).map(async () => {
        while (index < chunks.length) {
          const chunk = chunks[index++];
          await load(chunk);
          progress(++done, chunks.length);
        }
      }),
    );
    return chunks.length;
  }
  function ranges(mesh: StreamMesh, start = 0, count = Infinity): StreamRange[] {
    if (mesh.streamId === undefined)
      return [
        {
          data: mesh.data!,
          sourceStart: 0,
          localStart: 0,
          start,
          count: Math.min(count, mesh.data!.length / 11 - start),
        },
      ];
    let index = rangeIndices.get(mesh.streamId);
    if (!index || index.epoch !== epoch) {
      const runs = [];
      for (const part of meshParts.get(mesh.streamId) || [])
        for (const [source, n, local] of part.runs) runs.push({ part, source, n, local });
      runs.sort((a, b) => a.source - b.source);
      index = { epoch, runs };
      rangeIndices.set(mesh.streamId, index);
    }
    const { runs } = index;
    let lo = 0,
      hi = runs.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (runs[mid].source + runs[mid].n <= start) lo = mid + 1;
      else hi = mid;
    }
    const result = [],
      end = start + count;
    for (let i = lo; i < runs.length && runs[i].source < end; i++) {
      const { part, source, n, local } = runs[i],
        a = Math.max(start, source),
        b = Math.min(end, source + n);
      if (b > a)
        result.push({
          data: part.data,
          indices: part.indices,
          part,
          sourceStart: source,
          localStart: local,
          start: a,
          count: b - a,
        });
    }
    return result;
  }
  function draw(
    handle: { stream: number; count: number },
    start: number | undefined,
    count: number | undefined,
    drawPart: (part: StreamPart, start: number, count: number) => void,
  ) {
    if (start === 0 && count === handle.count) {
      for (const part of meshParts.get(handle.stream) || []) drawPart(part, 0, part.count);
      return;
    }
    for (const range of ranges({ streamId: handle.stream }, start, count))
      drawPart(range.part!, range.localStart + range.start - range.sourceStart, range.count);
  }
  function pendingVisible() {
    return wanted().filter((c) => !resident.has(c.id));
  }
  function visiblePendingCount() {
    return wanted().reduce(
      (n, c) => n + Number(!resident.has(c.id) || resident.get(c.id)!.loading),
      0,
    );
  }
  // Visible geometry has its own bounded workers. A slow background download
  // must never hold up the map, even if the camera stops producing frames.
  function pump() {
    if (stopped || !background) return;
    const visible = pendingVisible();
    stats.queuedVisible = visiblePendingCount();
    for (const chunk of visible) {
      if (loading.size >= 2) break;
      if ((failures.get(chunk.id) || 0) > Date.now()) continue;
      loading.add(chunk.id);
      load(chunk)
        .catch(() => {})
        .finally(() => {
          loading.delete(chunk.id);
          schedule();
        });
    }
    if (
      warmAll &&
      !memoryLimitBytes &&
      focus.active !== false &&
      !visible.length &&
      !loading.size
    ) {
      const next = manifest.chunks
        .filter((c) => !resident.has(c.id) && (failures.get(c.id) || 0) <= Date.now())
        .sort(
          (a: WorldChunk, b: WorldChunk) =>
            Number(ahead.has(b.id)) - Number(ahead.has(a.id)) ||
            chunkDistance(a, focus.x, focus.z) - chunkDistance(b, focus.x, focus.z),
        )[0];
      if (next) {
        loading.add(next.id);
        load(next)
          .catch(() => {})
          .finally(() => {
            loading.delete(next.id);
            schedule();
          });
        return;
      }
    }
    if (!visible.length && !loading.size && !downloading) {
      const distant = manifest.chunks
        .filter((c) => !cached.has(c.id) && (failures.get(c.id) || 0) <= Date.now())
        .sort(
          (a: WorldChunk, b: WorldChunk) =>
            Number(ahead.has(b.id)) - Number(ahead.has(a.id)) ||
            chunkDistance(a, focus.x, focus.z) - chunkDistance(b, focus.x, focus.z),
        )
        .slice(0, 4);
      if (distant.length) {
        downloading = true;
        Promise.all(
          distant.map(async (chunk) => {
            try {
              await asset(chunk);
              failures.delete(chunk.id);
            } catch (error) {
              failures.set(chunk.id, Date.now() + retryMs);
              stats.error = errorMessage(error);
            }
          }),
        ).finally(() => {
          downloading = false;
          schedule();
        });
      }
    }
    // Keep retrying without relying on the animation loop or on uncached
    // downloads being left. Fully disk-cached maps still need GPU uploads.
    if (visible.length || (remaining.size && !downloading && !loading.size)) schedule();
  }
  function schedule() {
    if (!timer && !stopped && background)
      timer = setTimeout(() => {
        timer = null;
        pump();
      }, 32);
  }
  function update(
    x: number,
    z: number,
    radius = 24,
    active = true,
    matrix: number[] | Float32Array | null = null,
  ) {
    focus = { x, z, radius, active };
    viewPlanes = matrix ? worldViewPlanes(matrix) : null;
    stats.queuedVisible = visiblePendingCount();
    // A camera turn or journey never evicts scenery on desktop. A bounded
    // cache updates recency only when its wanted set changes, and evicts
    // cold tiles only when actual geometry allocations exceed the cap.
    if (memoryLimitBytes) {
      const plan = wanted();
      if (plan !== lastUsePlan) {
        lastUsePlan = plan;
        for (const chunk of plan) {
          const record = resident.get(chunk.id)!;
          if (record) record.lastUsed = ++useClock;
        }
      }
      trim();
    }
    if (background && (stats.queuedVisible || remaining.size)) schedule();
  }
  function restore() {
    uintElements = !!gl.getExtension?.('OES_element_index_uint');
    stats.gpuBytes = 0;
    for (const record of resident.values())
      if (!record.loading) {
        record.buffers = [];
        record.gpuBytes = 0;
        for (const part of record.parts) preparePart(part, record);
        stats.gpuBytes += record.gpuBytes;
      }
    memoryStats();
    epoch++;
    onChange();
  }
  return {
    manifest,
    stats,
    metadata,
    gpu,
    ensure,
    ranges,
    draw,
    update,
    restore,
    prefetch(x: number, z: number) {
      for (const c of manifest.chunks) if (chunkDistance(c, x, z) <= 12) ahead.add(c.id);
      schedule();
    },
    get epoch() {
      return epoch;
    },
    start() {
      stopped = false;
      if (!background) {
        background = true;
        pruneWorldCache(manifest);
      }
      schedule();
    },
    stop() {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
    readyAt(x: number, z: number) {
      return manifest.chunks
        .filter((c) => chunkDistance(c, x, z) === 0)
        .every((c) => resident.has(c.id) && !resident.get(c.id)!.loading);
    },
  };
}
