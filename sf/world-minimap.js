const compiledMinimapDrawings = new WeakMap();
/** Record immutable road outlines during the build, rather than reconstructing
 * southern road tiles or allocating 147,456 tile views at browser startup. */
export function compileMinimapRoads(map, southernTiles, project) {
  const city = { road: [], path: [], sidewalk: [] },
    south = { road: [], path: [], sidewalk: [] };
  const add = (target, type, points) => {
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
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        },
      ])
        if (city[patch.type])
          add(
            city,
            patch.type,
            patch.polygon.map((p) => [(x + p[0]) * map.step, (z + p[1]) * map.step]),
          );
    }
  for (const { x, z, step, tile } of southernTiles)
    for (const patch of tile.patches || [
      {
        type: tile.type,
        polygon: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      },
    ])
      if (south[patch.type])
        add(
          south,
          patch.type,
          patch.polygon.map((p) => [x + p[0] * step, z + p[1] * step]),
        );
  return Object.fromEntries(
    Object.entries({ city, south }).map(([key, paths]) => [
      key,
      Object.fromEntries(Object.entries(paths).map(([type, parts]) => [type, parts.join('')])),
    ]),
  );
}
export function drawCompiledMinimapRoads(ctx, paths, colors) {
  let drawings = compiledMinimapDrawings.get(paths);
  if (!drawings) {
    drawings = Object.entries(paths).map(([type, source]) => [type, new Path2D(source)]);
    compiledMinimapDrawings.set(paths, drawings);
  }
  for (const [type, path] of drawings) {
    ctx.fillStyle = colors[type];
    ctx.fill(path);
  }
}
