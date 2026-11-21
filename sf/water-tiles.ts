import type { Lake } from './types/scene-state.ts';
import type { SurfaceTile, TilePatch, EdgeInterval } from './types/tiles.ts';
interface WaterPart {
  type: string | null;
  level?: number;
  polygon: number[][];
}
interface WaterCell {
  segments: number[][][];
  parts: WaterPart[];
  edges: EdgeInterval[][];
}
import { tileArea, intersectTilePolygons, surfaceTileFromPatches, TILE_TYPES } from './tiles.ts';

const WATER_LEVEL = 0.02;
const waterContains = (x: number, z: number, polygon: number[][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
};

// Clip a finite shoreline segment to a cell, including collinear grid edges.
function waterSegmentInCell(a: number[], b: number[], x: number, z: number, step: number) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  let lo = 0,
    hi = 1;
  for (const [p, q] of [
    [-dx, a[0] - x] satisfies [number, number],
    [dx, x + step - a[0]] satisfies [number, number],
    [-dz, a[1] - z] satisfies [number, number],
    [dz, z + step - a[1]] satisfies [number, number],
  ]) {
    if (Math.abs(p) < 1e-12) {
      if (q < -1e-9) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi + 1e-10) return null;
  }
  if (hi - lo < 1e-10) return null;
  return ([lo, hi] satisfies [number, number]).map(
    (t) => [(a[0] + dx * t - x) / step, (a[1] + dz * t - z) / step] satisfies [number, number],
  );
}

function splitWaterPolygon(polygon: number[][], a: number[], b: number[]) {
  const side = (p: number[]) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const values = polygon.map(side);
  if (Math.min(...values) >= -1e-10 || Math.max(...values) <= 1e-10) return [polygon];
  const halves: number[][][] = [[], []];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i],
      q = polygon[(i + 1) % polygon.length],
      u = values[i],
      v = values[(i + 1) % polygon.length];
    if (u >= -1e-10) halves[0].push(p);
    if (u <= 1e-10) halves[1].push(p);
    if (u * v < 0) {
      const t = u / (u - v),
        intersection = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] satisfies [
          number,
          number,
        ];
      halves[0].push(intersection);
      halves[1].push(intersection);
    }
  }
  return halves.filter((p) => p.length >= 3 && tileArea(p) > 1e-10);
}

export function lakeOutline(lake: Lake, segments = 64) {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i * Math.PI * 2) / segments;
    return [lake.x + Math.cos(a) * lake.rx, lake.z + Math.sin(a) * lake.rz];
  });
}

/** Precompute only cells touched by water boundaries. Splitting the two terrain
 * triangles by finite coastline edges handles concave coves, narrow inlets and
 * cells with no land corners. Every fragment stays convex and on one terrain
 * plane; land and water form a complete, nonoverlapping partition. */
export function createWaterTiles({
  size,
  step,
  coast,
  lakes = [],
}: {
  size: number;
  step: number;
  coast: number[][];
  lakes?: Lake[];
}) {
  const boundaries = new Map<number, WaterCell>(),
    lakeRegions = lakes.map((lake) => ({ ...lake, outline: lakeOutline(lake) }));
  const regionAt = (x: number, z: number) => {
    if (!waterContains(x, z, coast)) return { type: 'sea', level: WATER_LEVEL };
    const lake = lakeRegions.find((l) => waterContains(x, z, l.outline));
    return lake ? { type: 'water', level: lake.level } : { type: null };
  };
  for (const polygon of [coast, ...lakeRegions.map((l) => l.outline)])
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const minX = Math.max(0, Math.floor(Math.min(a[0], b[0]) / step - 1e-8)),
        maxX = Math.min(size - 1, Math.floor(Math.max(a[0], b[0]) / step + 1e-8));
      const minZ = Math.max(0, Math.floor(Math.min(a[1], b[1]) / step - 1e-8)),
        maxZ = Math.min(size - 1, Math.floor(Math.max(a[1], b[1]) / step + 1e-8));
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++) {
          const segment = waterSegmentInCell(a, b, x * step, z * step, step);
          if (!segment) continue;
          const id = z * size + x;
          if (!boundaries.has(id))
            boundaries.set(id, { segments: [], parts: [], edges: [[], [], [], []] });
          const cell = boundaries.get(id)!;
          cell.segments.push(segment);
          for (let edge = 0; edge < 4; edge++) {
            const axis = edge % 2 ? 0 : 1,
              value = edge === 1 || edge === 2 ? 1 : 0;
            if (segment.every((p) => Math.abs(p[axis] - value) < 1e-8))
              cell.edges[edge].push({
                from: Math.min(...segment.map((p) => p[1 - axis])),
                to: Math.max(...segment.map((p) => p[1 - axis])),
              });
          }
        }
    }
  for (const [id, cell] of boundaries) {
    const x = id % size,
      z = Math.floor(id / size);
    let polygons: number[][][] = [
      [
        [0, 0] satisfies [number, number],
        [1, 0] satisfies [number, number],
        [1, 1] satisfies [number, number],
      ],
      [
        [0, 0] satisfies [number, number],
        [1, 1] satisfies [number, number],
        [0, 1] satisfies [number, number],
      ],
    ];
    for (const [a, b] of cell.segments)
      polygons = polygons.flatMap((p) => splitWaterPolygon(p, a, b));
    cell.parts = polygons.map((p) => {
      const cx = p.reduce((s, v) => s + v[0], 0) / p.length,
        cz = p.reduce((s, v) => s + v[1], 0) / p.length;
      return { ...regionAt((x + cx) * step, (z + cz) * step), polygon: p };
    });
  }
  return { boundaries, regionAt, level: WATER_LEVEL };
}

export function applyWaterTile(tile: SurfaceTile, cell: WaterCell | undefined) {
  if (!cell) return tile;
  const source = tile.patches || [
      {
        type: tile.type,
        polygon: [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      },
    ],
    patches: TilePatch[] = [];
  for (const part of cell.parts)
    for (const patch of source) {
      const polygon = intersectTilePolygons(patch.polygon, part.polygon);
      if (polygon.length >= 3 && tileArea(polygon) > 1e-10)
        patches.push({
          type: part.type || patch.type,
          polygon,
          ...(part.level === undefined ? {} : { level: part.level }),
        });
    }
  const wet = patches.every((p) => TILE_TYPES[p.type].group === 'water'),
    base = wet ? patches[0].type : tile.base;
  const result = surfaceTileFromPatches(base, patches, { keepPolygons: true });
  result.borders = tile.borders;
  result.waterBorders = cell.edges;
  if (result.areas.sea || result.areas.water) result.variant = wet ? 'water' : 'shoreline';
  return result;
}

export { WATER_LEVEL };
