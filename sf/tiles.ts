import { isFiniteNumber } from './types/json.ts';
import type { SurfaceTile, TilePatch, TileType, TileEdge } from './types/tiles.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
// BEGIN TILE RULES — the only source of ground materials and their connections.
// Cell coordinates are on a 4 × 4 subdivision of each walking tile.
const TILE_CONFIG = {
  resolution: 4,
  curbWidth: 0.25,
  overrides: [] as { x: number; z: number; preset: keyof typeof TILE_PRESETS; rotation?: number }[],
};
const TILE_TYPES: Readonly<Record<string, TileType>> = Object.freeze({
  sea: { color: '#77a8ad', height: 0, group: 'water', walkable: false },
  water: { color: '#6f9f9b', height: 0, group: 'water', walkable: false },
  courtyard: { color: '#a6ad87', height: 0.012, group: 'ground', texture: 'grass', walkable: true },
  grass: { color: '#88a264', height: 0, group: 'ground', texture: 'grass', walkable: true },
  sand: { color: '#d8c89c', height: 0, group: 'ground', texture: 'sand', walkable: true },
  salt: { color: '#e1ddc9', height: 0, group: 'ground', texture: 'saltCrust', walkable: true },
  scrub: { color: '#a5a075', height: 0, group: 'ground', texture: 'dirt', walkable: true },
  rock: { color: '#b4b09b', height: 0, group: 'ground', texture: 'dirt', walkable: true },
  plaza: { color: '#c5bda6', height: 0.012, group: 'ground', texture: 'cobble', walkable: true },
  building: { color: '#b2ac97', height: 0.012, group: 'ground', texture: 'cobble', walkable: true },
  road: { color: '#7d827b', height: 0.018, group: 'road', texture: 'asphalt', walkable: true },
  path: { color: '#c4af85', height: 0.018, group: 'path', texture: 'dirt', walkable: true },
  sidewalk: {
    color: '#d1c8ad',
    height: 0.065,
    group: 'sidewalk',
    texture: 'sidewalk',
    walkable: true,
  },
});
// Corner order: NW, NE, SE, SW. Presets edit shared vertices, so the
// neighboring tiles update together. Positive distances lie outside a road.
// Overrides use base-cell coordinates; rotation is 0–3 clockwise quarter turns.
// Example override: {x:180,z:116,preset:'road-curb-right',rotation:0}.
const TILE_PRESETS: Readonly<Record<string, { type?: string; road?: number[]; path?: number[] }>> =
  Object.freeze({
    grass: {
      type: 'grass',
      road: [1, 1, 1, 1] satisfies [number, number, number, number],
      path: [1, 1, 1, 1] satisfies [number, number, number, number],
    },
    road: { road: [-0.25, -0.25, -0.25, -0.25] satisfies [number, number, number, number] },
    path: { path: [-0.25, -0.25, -0.25, -0.25] satisfies [number, number, number, number] },
    'road-curb-right': {
      road: [-0.13, 0.2, 0.2, -0.13] satisfies [number, number, number, number],
    },
    'road-curb-left': { road: [0.2, -0.13, -0.13, 0.2] satisfies [number, number, number, number] },
  });
const TILE_EDGES = [
  { name: contentText('tiles.module.name-1', {}), dx: 0, dz: -1, opposite: 2 },
  { name: contentText('tiles.module.name-2', {}), dx: 1, dz: 0, opposite: 3 },
  { name: contentText('tiles.module.name-3', {}), dx: 0, dz: 1, opposite: 0 },
  { name: contentText('tiles.module.name-4', {}), dx: -1, dz: 0, opposite: 1 },
];
const tileArea = (p: number[][]) =>
  Math.abs(
    p.reduce((a, v, i) => {
      const n = p[(i + 1) % p.length];
      return a + v[0] * n[1] - n[0] * v[1];
    }, 0),
  ) * 0.5;
function clipTilePolygon(poly: number[][], field: number, limit: number, less: boolean) {
  if (poly.length && poly.every((p) => Math.abs(p[field] - limit) < 1e-9)) return less ? poly : [];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length],
      va = (a[field] - limit) * (less ? 1 : -1),
      vb = (b[field] - limit) * (less ? 1 : -1),
      ia = va <= 1e-10,
      ib = vb <= 1e-10;
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = va / (va - vb);
      out.push(a.map((v, k) => v + (b[k] - v) * t));
    }
  }
  return out;
}
function tileEdgeSegments(tile: Pick<SurfaceTile, 'type' | 'patches'>, edge: number) {
  if (!tile.patches) return [{ from: 0, to: 1, type: tile.type }];
  const segments = [];
  for (const patch of tile.patches)
    for (let i = 0; i < patch.polygon.length; i++) {
      const a = patch.polygon[i],
        b = patch.polygon[(i + 1) % patch.polygon.length],
        on = (p: number[]) =>
          edge === 0
            ? Math.abs(p[1]) < 1e-7
            : edge === 1
              ? Math.abs(p[0] - 1) < 1e-7
              : edge === 2
                ? Math.abs(p[1] - 1) < 1e-7
                : Math.abs(p[0]) < 1e-7;
      if (!on(a) || !on(b)) continue;
      const from = Math.min(a[edge % 2 ? 1 : 0], b[edge % 2 ? 1 : 0]),
        to = Math.max(a[edge % 2 ? 1 : 0], b[edge % 2 ? 1 : 0]);
      if (to - from > 1e-7)
        segments.push({
          from,
          to,
          type: patch.type,
          ...(patch.level === undefined ? {} : { level: patch.level }),
        });
    }
  return segments.sort((a, b) => a.from - b.from);
}
const uniformTileData = new Map<
  string,
  { areas: Readonly<Record<string, number>>; edge: readonly TileEdge[] }
>();
function uniformSurfaceTile(type: string, base: string): SurfaceTile {
  if (!uniformTileData.has(type))
    uniformTileData.set(type, {
      areas: Object.freeze({ [type]: 1 }),
      edge: Object.freeze([Object.freeze({ from: 0, to: 1, type })]),
    });
  const shared = uniformTileData.get(type)!,
    flow = type === 'road' || type === 'path';
  return {
    type,
    base,
    variant: type === 'road' ? 'road-interior' : type,
    patches: null,
    areas: shared.areas,
    edges: TILE_EDGES.map(() => shared.edge),
    ports: flow ? 15 : 0,
    curbEdges: type === 'sidewalk' ? 15 : 0,
  };
}
function tilePolygonOverlap(a: number[][], b: number[][]) {
  return tileArea(intersectTilePolygons(a, b));
}
// Convex clipping preserves extra vertex fields (road/path distances).
function intersectTilePolygons(a: number[][], b: number[][]) {
  let polygon = a;
  const signed =
    b.reduce(
      (sum, p, i) => sum + p[0] * b[(i + 1) % b.length][1] - b[(i + 1) % b.length][0] * p[1],
      0,
    ) >= 0
      ? 1
      : -1;
  for (let j = 0; j < b.length && polygon.length; j++) {
    const c = b[j],
      d = b[(j + 1) % b.length],
      side = (p: number[]) =>
        signed * ((d[0] - c[0]) * (p[1] - c[1]) - (d[1] - c[1]) * (p[0] - c[0])),
      out = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i],
        q = polygon[(i + 1) % polygon.length],
        dp = side(p),
        dq = side(q);
      if (dp >= -1e-10) out.push(p);
      if (dp >= 0 !== dq >= 0) {
        const t = dp / (dp - dq);
        out.push(p.map((value, k) => value + (q[k] - value) * t));
      }
    }
    polygon = out;
  }
  return polygon.length >= 3 ? polygon : [];
}
function tileBorders(tile: SurfaceTile, values: number[][], width: number) {
  tile.borders = TILE_EDGES.map((_, edge) => {
    const a = values[edge],
      b = values[(edge + 1) % 4];
    if (Math.abs(a[0]) < 1e-6 && Math.abs(b[0]) < 1e-6) return 'road-curb';
    if (Math.abs(a[1]) < 1e-6 && Math.abs(b[1]) < 1e-6) return 'path-curb';
    if (Math.abs(Math.min(...a) - width) < 1e-6 && Math.abs(Math.min(...b) - width) < 1e-6)
      return 'curb-ground';
    return null;
  });
  return tile;
}
function buildSurfaceTile(base: string, values: number[][], curbWidth = TILE_CONFIG.curbWidth) {
  // Each terrain triangle is partitioned, never painted over another road.
  if (values.every((v) => v[0] < -1e-9))
    return tileBorders(uniformSurfaceTile('road', base), values, curbWidth);
  if (values.every((v) => v[0] > 1e-9 && v[1] < -1e-9))
    return tileBorders(uniformSurfaceTile('path', base), values, curbWidth);
  if (values.every((v) => v[0] > 1e-9 && v[1] > 1e-9 && Math.min(v[0], v[1]) < curbWidth - 1e-9))
    return tileBorders(uniformSurfaceTile('sidewalk', base), values, curbWidth);
  if (values.every((v) => Math.min(v[0], v[1]) > curbWidth + 1e-9))
    return tileBorders(uniformSurfaceTile(base, base), values, curbWidth);
  const corners = [
    [0, 0, ...values[0]],
    [1, 0, ...values[1]],
    [1, 1, ...values[2]],
    [0, 1, ...values[3]],
  ].map((p) => [...p, Math.min(p[2], p[3])]);
  const patches: TilePatch[] = [],
    add = (type: string, p: number[][]) => {
      if (p.length >= 3 && tileArea(p) > 1e-9) patches.push({ type, polygon: p });
    };
  for (const triangle of [
    [corners[0], corners[1], corners[2]],
    [corners[0], corners[2], corners[3]],
  ]) {
    add('road', clipTilePolygon(triangle, 2, 0, true));
    const outsideRoad = clipTilePolygon(triangle, 2, 0, false);
    add('path', clipTilePolygon(outsideRoad, 3, 0, true));
    const remaining = clipTilePolygon(outsideRoad, 3, 0, false);
    add('sidewalk', clipTilePolygon(remaining, 4, curbWidth, true));
    add(base, clipTilePolygon(remaining, 4, curbWidth, false));
  }
  const tile = surfaceTileFromPatches(base, patches);
  if (tile.areas.road && tile.areas.sidewalk) {
    const gx = values[1][0] + values[2][0] - values[0][0] - values[3][0],
      gz = values[2][0] + values[3][0] - values[0][0] - values[1][0];
    tile.variant =
      'road-curb-' +
      (Math.abs(gx) > Math.abs(gz) ? (gx > 0 ? 'right' : 'left') : gz > 0 ? 'bottom' : 'top');
  }
  return tileBorders(tile, values, curbWidth);
}
function surfaceTileFromPatches(
  base: string,
  patches: TilePatch[],
  { keepPolygons = false }: { keepPolygons?: boolean } | undefined = {},
) {
  const types = [...new Set(patches.map((p) => p.type))],
    areas: Record<string, number> = {};
  for (const p of patches) areas[p.type] = (areas[p.type] || 0) + tileArea(p.polygon);
  const type =
    types.length === 1
      ? types[0]
      : areas.road
        ? 'road'
        : areas.path
          ? 'path'
          : areas.sidewalk
            ? 'sidewalk'
            : base;
  const tile: SurfaceTile = {
    type,
    base,
    variant: type,
    patches: types.length === 1 && !keepPolygons ? null : patches,
    areas,
    edges: [],
    ports: 0,
    curbEdges: 0,
  };
  tile.edges = TILE_EDGES.map((_, i) => tileEdgeSegments(tile, i));
  for (let i = 0; i < 4; i++)
    if (tile.edges[i].some((e) => e.type === 'road' || e.type === 'path')) tile.ports |= 1 << i;
  const edgeNames = [];
  for (let i = 0; i < 4; i++)
    if (tile.edges[i].some((e) => e.type === 'sidewalk')) {
      edgeNames.push(TILE_EDGES[i].name);
      tile.curbEdges |= 1 << i;
    }
  if (types.includes('road') && types.includes('sidewalk')) tile.variant = 'road-curb';
  else if (types.includes('path') && types.includes('sidewalk'))
    tile.variant = 'path-curb-' + (edgeNames.join('-') || 'inside');
  else if (tile.type === 'road' && tile.ports === 15) tile.variant = 'road-interior';
  return tile;
}
function validateTileMap(
  map: Pick<import('./types/tiles.ts').TileMap, 'size' | 'tiles'>,
  { topology = true }: { topology?: boolean } = {},
) {
  let waterEdges = 0,
    shorelineTiles = 0;
  const errors = [],
    counts: Record<string, number> = {},
    flow = (t: SurfaceTile) => (t.areas.road || 0) + (t.areas.path || 0) > 1e-8,
    group = (type: string) => TILE_TYPES[type]?.group;
  if (map.tiles.length !== map.size * map.size) errors.push('Incomplete tile array');
  for (let z = 0; z < map.size; z++)
    for (let x = 0; x < map.size; x++) {
      const id = z * map.size + x,
        t = map.tiles[id];
      if (!t) {
        errors.push(`Missing tile ${x},${z}`);
        continue;
      }
      if (!TILE_TYPES[t.type] || !TILE_TYPES[t.base]) {
        errors.push(`Unknown material at ${x},${z}`);
        continue;
      }
      counts[t.type] = (counts[t.type] || 0) + 1;
      if (t.variant === 'shoreline') shorelineTiles++;
      const area = t.patches ? t.patches.reduce((sum, p) => sum + tileArea(p.polygon), 0) : 1;
      if (Math.abs(area - 1) > 1e-6)
        errors.push(`Incomplete or overlapping surface at ${x},${z}: ${area}`);
      if (
        (t.base === 'sea' || t.base === 'water' || t.base === 'building') &&
        (flow(t) || (t.areas.sidewalk || 0) > 1e-8)
      )
        errors.push(`Road intersects ${t.base} at ${x},${z}`);
      if (t.patches)
        for (const p of t.patches) {
          if (!TILE_TYPES[p.type]) errors.push(`Unknown patch at ${x},${z}`);
          for (const v of p.polygon)
            if (v[0] < -1e-7 || v[0] > 1.0000001 || v[1] < -1e-7 || v[1] > 1.0000001)
              errors.push(`Patch leaves tile ${x},${z}`);
        }
      if (t.patches)
        for (let i = 0; i < t.patches.length; i++)
          for (let j = i + 1; j < t.patches.length; j++)
            if (tilePolygonOverlap(t.patches[i].polygon, t.patches[j].polygon) > 1e-7)
              errors.push(`Overlapping materials at ${x},${z}`);
      for (let edge = 0; edge < 4; edge++) {
        if (
          t.edges[edge].some((s) => s.type === 'road' || s.type === 'path') !==
          !!(t.ports & (1 << edge))
        )
          errors.push(`Incorrect connection mask at ${x},${z}:${edge}`);
        if (t.edges[edge].some((s) => s.type === 'sidewalk') !== !!(t.curbEdges & (1 << edge)))
          errors.push(`Incorrect curb mask at ${x},${z}:${edge}`);
      }
      if ((t.areas.sidewalk || 0) > 1e-8) {
        let nearby = false;
        for (let dz = -2; dz <= 2; dz++)
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx,
              nz = z + dz;
            if (
              nx >= 0 &&
              nz >= 0 &&
              nx < map.size &&
              nz < map.size &&
              map.tiles[nz * map.size + nx] &&
              flow(map.tiles[nz * map.size + nx])
            )
              nearby = true;
          }
        if (!nearby) errors.push(`Curb has no neighboring road at ${x},${z}`);
      }
      for (const edge of [1, 2] satisfies [number, number]) {
        const dir = TILE_EDGES[edge],
          nx = x + dir.dx,
          nz = z + dir.dz;
        if (nx >= map.size || nz >= map.size) continue;
        const n = map.tiles[nz * map.size + nx];
        if (!n?.edges) continue;
        const a = t.edges[edge],
          b = n.edges[dir.opposite],
          cuts = [
            ...new Set([
              0,
              1,
              ...a.flatMap((s) => [s.from, s.to]),
              ...b.flatMap((s) => [s.from, s.to]),
            ]),
          ].sort((a, b) => a - b);
        for (let i = 1; i < cuts.length; i++) {
          if (cuts[i] - cuts[i - 1] < 1e-7) continue;
          const mid = (cuts[i] + cuts[i - 1]) / 2,
            A = a.find((s) => s.from - 1e-8 <= mid && s.to + 1e-8 >= mid),
            B = b.find((s) => s.from - 1e-8 <= mid && s.to + 1e-8 >= mid);
          if (!A || !B) {
            errors.push(`Gap at shared edge ${x},${z}:${edge}`);
            continue;
          }
          const ga = group(A.type),
            gb = group(B.type);
          if (ga === 'water' || gb === 'water') {
            waterEdges++;
            if (ga !== gb) {
              const onShore = (tile: SurfaceTile, side: number) =>
                (tile.waterBorders?.[side] || []).some(
                  (s) => mid >= s.from - 1e-8 && mid <= s.to + 1e-8,
                );
              if (!onShore(t, edge) || !onShore(n, dir.opposite))
                errors.push(`Mismatched ${A.type}/${B.type} water edge at ${x},${z}:${edge}`);
            } else {
              const aLevel = A.level ?? t.waterLevel,
                bLevel = B.level ?? n.waterLevel;
              if (
                !isFiniteNumber(aLevel) ||
                !isFiniteNumber(bLevel) ||
                Math.abs(aLevel - bLevel) > 1e-7
              )
                errors.push(`Mismatched water height at ${x},${z}:${edge}`);
            }
          }
          const border = t.borders?.[edge],
            pavedJoin =
              ((ga === 'road' && gb === 'path') || (ga === 'path' && gb === 'road')) &&
              border &&
              border === n.borders?.[dir.opposite],
            shared = border && border === n.borders?.[dir.opposite],
            transition =
              shared &&
              ((border === 'curb-ground' &&
                ((ga === 'sidewalk' && gb === 'ground') ||
                  (gb === 'sidewalk' && ga === 'ground'))) ||
                (border === 'road-curb' &&
                  ((ga === 'road' && gb === 'sidewalk') || (gb === 'road' && ga === 'sidewalk'))) ||
                (border === 'path-curb' &&
                  ((ga === 'path' && gb === 'sidewalk') || (gb === 'path' && ga === 'sidewalk'))));
          if (
            ga !== gb &&
            !transition &&
            !pavedJoin &&
            (ga === 'road' ||
              gb === 'road' ||
              ga === 'path' ||
              gb === 'path' ||
              ga === 'sidewalk' ||
              gb === 'sidewalk')
          )
            errors.push(`Mismatched ${A.type}/${B.type} edge at ${x},${z}:${edge}`);
        }
      }
    }
  let components = 0;
  if (topology) {
    const seen = new Uint8Array(map.tiles.length);
    for (let id = 0; id < map.tiles.length; id++)
      if (!seen[id] && map.tiles[id] && flow(map.tiles[id])) {
        components++;
        const queue = [id];
        seen[id] = 1;
        for (let i = 0; i < queue.length; i++) {
          const k = queue[i],
            x = k % map.size,
            z = Math.floor(k / map.size),
            t = map.tiles[k];
          for (let edge = 0; edge < 4; edge++) {
            if (!(t.ports & (1 << edge))) continue;
            const d = TILE_EDGES[edge],
              nx = x + d.dx,
              nz = z + d.dz;
            if (nx < 0 || nz < 0 || nx >= map.size || nz >= map.size) continue;
            const ni = nz * map.size + x + d.dx,
              n = map.tiles[ni];
            if (!seen[ni] && n && flow(n) && n.ports & (1 << d.opposite)) {
              seen[ni] = 1;
              queue.push(ni);
            }
          }
        }
      }
    if (components > 1) errors.push(`Disconnected road/path components: ${components}`);
  }
  return {
    ok: errors.length === 0,
    tiles: map.tiles.length,
    counts,
    components,
    water: { edges: waterEdges, shorelineTiles },
    errors,
  };
}
function runTileRuleTests() {
  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error('Tile regression: ' + message);
  };
  let checks = 0;
  const fixture = (
    road: (x: number, z: number) => number,
    path: (value0: number, value1: number) => number = () => 10,
  ) => {
    const size = 12,
      values = [];
    for (let z = 0; z <= size; z++)
      for (let x = 0; x <= size; x++) values.push([road(x, z), path(x, z)]);
    const tiles = [];
    for (let z = 0; z < size; z++)
      for (let x = 0; x < size; x++)
        tiles.push(
          buildSurfaceTile('grass', [
            values[z * (size + 1) + x],
            values[z * (size + 1) + x + 1],
            values[(z + 1) * (size + 1) + x + 1],
            values[(z + 1) * (size + 1) + x],
          ]),
        );
    return { size, tiles };
  };
  for (const f of [
    (x: number, z: number) => Math.abs(x - 6) - 1.2,
    (x: number, z: number) => Math.min(Math.abs(x - 6), Math.abs(z - 6)) - 1.2,
    (x: number, z: number) =>
      Math.min(Math.abs(x - 6) - 1.2, Math.hypot(Math.max(0, 6 - x), z - 6) - 1.2),
    (x: number, z: number) => Math.hypot(x - 6, z - 6) - 2.5,
    (x: number, z: number) => Math.abs(x - z) * 0.707 - 1.1,
  ]) {
    const result = validateTileMap(fixture(f));
    assert(result.ok, result.errors[0]);
    checks++;
  }
  for (const f of [
    (x: number, z: number) => Math.abs(x - 6) - 0.75,
    (x: number, z: number) => Math.min(Math.abs(x - 6), Math.abs(z - 6)) - 1,
    () => 0,
  ]) {
    const result = validateTileMap(fixture(f));
    assert(result.ok, 'Grid-aligned boundaries: ' + result.errors[0]);
    checks++;
  }
  assert(
    validateTileMap(
      fixture(
        (x, z) => x - 6,
        (x: number, z: number) => 6 - x,
      ),
    ).ok,
    'Exact road/path material join',
  );
  checks++;
  const crossing = fixture(
    (x, z) => Math.abs(x - 6) - 1.2,
    (x: number, z: number) => Math.abs(z - 6) - 0.8,
  );
  assert(validateTileMap(crossing).ok, 'Road/path crossing must merge');
  checks++;
  const broken = fixture((x, z) => Math.abs(x - 6) - 1.2);
  broken.tiles[6 * 12 + 6].type = 'unknown';
  assert(!validateTileMap(broken).ok, 'Unknown type was accepted');
  checks++;
  const missing = fixture(() => 10);
  delete missing.tiles[7];
  assert(!validateTileMap(missing).ok, 'Missing base tile was accepted');
  checks++;
  const gap = fixture((x, z) => Math.abs(x - 6) - 1.2);
  gap.tiles[6 * 12 + 6].edges[1] = [{ from: 0, to: 1, type: 'grass' }];
  assert(!validateTileMap(gap).ok, 'Broken shared edge was accepted');
  checks++;
  const obstacle = fixture((x, z) => Math.abs(x - 6) - 1.2);
  obstacle.tiles[6 * 12 + 6].base = 'building';
  assert(!validateTileMap(obstacle).ok, 'Road through building was accepted');
  checks++;
  const coverage = fixture((x, z) => Math.abs(x - 6) - 1.2),
    mixed = coverage.tiles.find((t) => t.patches)!;
  mixed.patches!.pop();
  assert(!validateTileMap(coverage).ok, 'Missing surface polygon was accepted');
  checks++;
  const duplicate = fixture((x, z) => Math.abs(x - 6) - 1.2),
    overlap = duplicate.tiles.find((t) => t.patches)!;
  overlap.patches!.push({ ...overlap.patches![0] });
  assert(!validateTileMap(duplicate).ok, 'Overlapping materials were accepted');
  checks++;
  const ports = fixture((x, z) => Math.abs(x - 6) - 1.2);
  ports.tiles[6 * 12 + 6].ports = 0;
  assert(!validateTileMap(ports).ok, 'Broken road ports were accepted');
  checks++;
  const curb = fixture(() => 10);
  curb.tiles[6 * 12 + 6] = buildSurfaceTile(
    'grass',
    Array.from({ length: 4 }, () => [0.05, 10] satisfies [number, number]),
  );
  assert(!validateTileMap(curb).ok, 'Isolated curb was accepted');
  checks++;
  const islands = fixture(
    (x, z) => Math.min(Math.hypot(x - 3, z - 6), Math.hypot(x - 9, z - 6)) - 0.9,
  );
  assert(!validateTileMap(islands).ok, 'Disconnected roads were accepted');
  checks++;
  const curbMask = fixture((x, z) => Math.abs(x - 6) - 1.2);
  curbMask.tiles.find((t) => t.curbEdges)!.curbEdges = 0;
  assert(!validateTileMap(curbMask).ok, 'Broken curb mask was accepted');
  checks++;
  const waterMap = fixture(() => 10);
  for (let z = 0; z < 12; z++)
    for (let x = 6; x < 12; x++) {
      const tile = buildSurfaceTile(
        'sea',
        Array.from({ length: 4 }, () => [10, 10] satisfies [number, number]),
      );
      tile.waterLevel = 0.02;
      waterMap.tiles[z * 12 + x] = tile;
    }
  assert(!validateTileMap(waterMap).ok, 'Unmatched land/water edge was accepted');
  checks++;
  for (let z = 0; z < 12; z++) {
    waterMap.tiles[z * 12 + 5].waterBorders = [[], [{ from: 0, to: 1 }], [], []];
    waterMap.tiles[z * 12 + 6].waterBorders = [[], [], [], [{ from: 0, to: 1 }]];
  }
  assert(validateTileMap(waterMap).ok, 'A shared, authored shoreline was rejected');
  checks++;
  waterMap.tiles[6 * 12 + 8].waterLevel = 0.3;
  assert(!validateTileMap(waterMap).ok, 'Inconsistent water levels were accepted');
  checks++;
  for (let rotation = 0; rotation < 4; rotation++) {
    const values = Array.from(
        { length: 4 },
        (_, i) =>
          [TILE_PRESETS['road-curb-right'].road![(i - rotation + 4) % 4], 10] satisfies [
            number,
            number,
          ],
      ),
      tile = buildSurfaceTile('grass', values);
    assert(
      tile.variant ===
        'road-curb-' +
          (['right', 'bottom', 'left', 'top'] satisfies [string, string, string, string])[rotation],
      'Curb preset rotation',
    );
    assert(
      Math.abs(Object.values(tile.areas).reduce((a, b) => a + b, 0) - 1) < 1e-8,
      'Curb preset must cover tile',
    );
    checks++;
  }
  return { ok: true, checks };
}

export {
  TILE_CONFIG,
  TILE_TYPES,
  TILE_PRESETS,
  TILE_EDGES,
  tileArea,
  clipTilePolygon,
  tilePolygonOverlap,
  intersectTilePolygons,
  surfaceTileFromPatches,
  buildSurfaceTile,
  validateTileMap,
  runTileRuleTests,
};
