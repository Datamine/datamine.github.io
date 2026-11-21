import type { Point } from './types/geometry.ts';
import type { TileMap, SurfaceTile } from './types/tiles.ts';
export type CompiledMinimapRoads = Record<string, Record<string, string>>;
const compiledMinimapDrawings = new WeakMap<Record<string, string>, [string, Path2D][]>();
/** Record immutable road outlines during the build, rather than reconstructing
 * southern road tiles or allocating 147,456 tile views at browser startup. */
export function compileMinimapRoads(
  map: TileMap,
  southernTiles: readonly { x: number; z: number; step: number; tile: SurfaceTile }[],
  project: (x: number, z: number) => Point,
): CompiledMinimapRoads {
  const city: Record<string, string[]> = { road: [], path: [], sidewalk: [] },
    south: Record<string, string[]> = { road: [], path: [], sidewalk: [] };
  const add = (
    target: Record<string, string[]>,
    type: string,
    points: readonly (readonly number[])[],
  ) => {
    if (!target[type]) return;
    target[type].push(
      points
        .map(([x, z], i) => {
          const p = project(x, z);
          return (i ? 'L' : 'M') + p.x.toFixed(3) + ',' + p.y.toFixed(3);
        })
        .join('') + 'Z',
    );
  };
  for (let z = 0; z < map.size; z++)
    for (let x = 0; x < map.size; x++) {
      const tile = map.tiles[z * map.size + x];
      for (const patch of tile.patches || [
        {
          type: tile.type,
          polygon: [
            [0, 0] satisfies [number, number],
            [1, 0] satisfies [number, number],
            [1, 1] satisfies [number, number],
            [0, 1] satisfies [number, number],
          ],
        },
      ])
        if (city[patch.type])
          add(
            city,
            patch.type,
            patch.polygon.map(
              (p) => [(x + p[0]) * map.step, (z + p[1]) * map.step] satisfies [number, number],
            ),
          );
    }
  for (const { x, z, step, tile } of southernTiles)
    for (const patch of tile.patches || [
      {
        type: tile.type,
        polygon: [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      },
    ])
      if (south[patch.type])
        add(
          south,
          patch.type,
          patch.polygon.map((p) => [x + p[0] * step, z + p[1] * step] satisfies [number, number]),
        );
  return Object.fromEntries(
    Object.entries({ city, south }).map(([key, paths]) => [
      key,
      Object.fromEntries(
        Object.entries(paths).map(
          ([type, parts]) => [type, parts.join('')] satisfies [string, string],
        ),
      ),
    ]),
  );
}
export function drawCompiledMinimapRoads(
  ctx: CanvasRenderingContext2D,
  paths: Record<string, string>,
  colors: Readonly<Record<string, string>>,
) {
  let drawings = compiledMinimapDrawings.get(paths);
  if (!drawings) {
    drawings = Object.entries(paths).map(([type, source]): [string, Path2D] => [
      type,
      new Path2D(source),
    ]);
    compiledMinimapDrawings.set(paths, drawings);
  }
  for (const [type, path] of drawings) {
    ctx.fillStyle = colors[type];
    ctx.fill(path);
  }
}
