import type { SurfaceTile, TilePatch, TileEdge } from './types/tiles.ts';
/** Packed tile data avoids shipping millions of tiny polygon/reference objects.
 * The browser materializes only the cells it samples; collision has its own
 * precompiled adjacency arrays and does not depend on visual residency. */
export function packWorldTiles(tiles: readonly SurfaceTile[]) {
  const names = [
      ...new Set(
        tiles.flatMap((t) => [
          t.type,
          t.base,
          ...(t.patches || []).map((p) => p.type),
          ...t.edges.flat().map((e) => e.type),
        ]),
      ),
    ],
    variants = [...new Set(tiles.map((t) => t.variant))],
    headers = new Uint32Array(tiles.length * 8),
    levels = new Float32Array(tiles.length),
    frames = new Float32Array(tiles.length),
    patches = [],
    edges = [];
  for (const [i, t] of tiles.entries()) {
    const at = i * 8;
    headers.set(
      [
        names.indexOf(t.type),
        names.indexOf(t.base),
        t.ports || 0,
        t.curbEdges || 0,
        patches.length,
        edges.length,
        variants.indexOf(t.variant),
        t.frame || 0,
      ],
      at,
    );
    levels[i] = t.waterLevel ?? NaN;
    frames[i] = t.frame || 0;
    patches.push(t.patches?.length || 0);
    for (const p of t.patches || []) {
      patches.push(names.indexOf(p.type), p.polygon.length);
      for (const point of p.polygon) patches.push(point[0], point[1]);
    }
    for (const side of t.edges) {
      edges.push(side.length);
      for (const e of side) edges.push(names.indexOf(e.type), e.from, e.to);
    }
  }
  return {
    names,
    variants,
    headers,
    levels,
    frames,
    patches: new Float32Array(patches),
    edges: new Float32Array(edges),
  };
}
export function unpackWorldTiles(packed: ReturnType<typeof packWorldTiles>, limit = 4096) {
  const { names, variants, headers, levels, frames, patches, edges } = packed,
    length = headers.length / 8,
    cache = new Map<number, SurfaceTile>();
  function tile(i: number) {
    if (cache.has(i)) return cache.get(i);
    const at = i * 8,
      type = names[headers[at]],
      base = names[headers[at + 1]];
    const t = {
      type,
      base,
      variant: variants[headers[at + 6]],
      ports: headers[at + 2],
      curbEdges: headers[at + 3],
      frame: frames?.[i] ?? headers[at + 7],
      waterLevel: Number.isNaN(levels[i]) ? undefined : levels[i],
    };
    const tile = t as SurfaceTile;
    let decodedPatches: TilePatch[] | null | undefined, decodedEdges: TileEdge[][] | undefined;
    Object.defineProperty(tile, 'patches', {
      enumerable: true,
      get() {
        if (decodedPatches !== undefined) return decodedPatches;
        let p = headers[at + 4],
          count = patches[p++];
        if (!count) return (decodedPatches = null);
        decodedPatches = [];
        for (let j = 0; j < count; j++) {
          const type = names[patches[p++]],
            n = patches[p++],
            polygon = [];
          for (let k = 0; k < n; k++) polygon.push([patches[p++], patches[p++]]);
          decodedPatches.push({ type, polygon });
        }
        return decodedPatches;
      },
    });
    Object.defineProperty(tile, 'edges', {
      enumerable: true,
      get() {
        if (decodedEdges) return decodedEdges;
        let p = headers[at + 5];
        decodedEdges = [];
        for (let j = 0; j < 4; j++) {
          const n = edges[p++],
            side = [];
          for (let k = 0; k < n; k++)
            side.push({ type: names[edges[p++]], from: edges[p++], to: edges[p++] });
          decodedEdges.push(side);
        }
        return decodedEdges;
      },
    });
    Object.defineProperty(tile, 'areas', {
      enumerable: true,
      get() {
        const result: Record<string, number> = {};
        if (!tile.patches) return { [type]: 1 };
        for (const p of tile.patches) {
          let area = 0;
          for (let j = 0; j < p.polygon.length; j++) {
            const a = p.polygon[j],
              b = p.polygon[(j + 1) % p.polygon.length];
            area += a[0] * b[1] - b[0] * a[1];
          }
          result[p.type] = (result[p.type] || 0) + Math.abs(area) / 2;
        }
        return result;
      },
    });
    if (cache.size >= limit) cache.delete(cache.keys().next().value!);
    cache.set(i, tile);
    return tile;
  }
  return new Proxy(new Array<SurfaceTile>(length), {
    has: (target, key: string | symbol) =>
      /^\d+$/.test(String(key)) ? Number(key) < length : key in target,
    get: (target, key: string | symbol, receiver) =>
      typeof key === 'string' && /^\d+$/.test(key)
        ? Number(key) < length
          ? tile(Number(key))
          : undefined
        : Reflect.get(target, key, receiver),
  });
}
