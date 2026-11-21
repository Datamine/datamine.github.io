import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSurfaceTile, validateTileMap, tileArea, tilePolygonOverlap } from '../tiles.ts';
import { createWaterTiles, applyWaterTile } from '../water-tiles.ts';
import type { TileMap } from '../types/tiles.ts';

function waterFixture(
  coast: number[][],
  lakes: { x: number; z: number; rx: number; rz: number; level: number }[] | undefined = [],
  size = 12,
  step = 1,
) {
  const water = createWaterTiles({ size, step, coast, lakes }),
    tiles: import('../types/tiles.ts').SurfaceTile[] = [];
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      const cell = water.boundaries.get(z * size + x),
        region = water.regionAt((x + 0.5) * step, (z + 0.5) * step);
      const tile = applyWaterTile(
        buildSurfaceTile(
          cell ? 'grass' : region.type || 'grass',
          Array.from({ length: 4 }, () => [10, 10] satisfies [number, number]),
        ),
        cell,
      );
      if (region.type) tile.waterLevel = region.level;
      tiles.push(tile);
    }
  return { size, step, tiles, water };
}

function checkCoverage(map: Pick<TileMap, 'size' | 'tiles'>) {
  const result = validateTileMap(map);
  assert.ok(result.ok, result.errors.slice(0, 8).join('; '));
  assert.ok(result.water.edges > 0, 'water edges must be checked');
  for (const tile of map.tiles)
    if (tile.patches) {
      assert.ok(Math.abs(tile.patches.reduce((s, p) => s + tileArea(p.polygon), 0) - 1) < 1e-7);
      for (let i = 0; i < tile.patches.length; i++)
        for (let j = i + 1; j < tile.patches.length; j++)
          assert.ok(tilePolygonOverlap(tile.patches[i].polygon, tile.patches[j].polygon) < 1e-8);
    }
  return result;
}

test('diagonal shorelines tile continuously in either polygon winding', () => {
  const coast = [
    [1.13, 10.87] satisfies [number, number],
    [2.2, 1.17] satisfies [number, number],
    [8.83, 2.36] satisfies [number, number],
    [10.47, 10.81] satisfies [number, number],
  ];
  for (const outline of [coast, [...coast].reverse()]) {
    const map = waterFixture(outline);
    const result = checkCoverage(map);
    assert.ok(result.water.shorelineTiles > 20);
    const land = map.tiles.reduce((s, t) => s + (t.areas.grass || 0), 0);
    assert.ok(
      Math.abs(land - tileArea(coast)) < 1e-7,
      'clipped tiles preserve the actual land area',
    );
  }
});

test('concave coves and thin inlets never get filled by a triangle fan', () => {
  const coast = [
    [1, 1] satisfies [number, number],
    [11, 1] satisfies [number, number],
    [11, 11] satisfies [number, number],
    [7.2, 11] satisfies [number, number],
    [7.2, 3.3] satisfies [number, number],
    [6.8, 3.3] satisfies [number, number],
    [6.8, 11] satisfies [number, number],
    [1, 11] satisfies [number, number],
  ];
  const map = waterFixture(coast);
  checkCoverage(map);
  assert.ok(
    Math.abs(map.tiles.reduce((s, t) => s + (t.areas.grass || 0), 0) - tileArea(coast)) < 1e-7,
  );
  const inlet = map.tiles[7 * 12 + 7];
  assert.ok(inlet.areas.sea > 0.19 && inlet.areas.sea < 0.21);
  assert.equal(map.water.regionAt(7, 7).type, 'sea');
});

test('a narrow coastal sliver with every cell corner offshore is preserved', () => {
  const coast = [
      [2.05, 2.3] satisfies [number, number],
      [2.95, 2.3] satisfies [number, number],
      [2.5, 2.45] satisfies [number, number],
    ],
    map = waterFixture(coast);
  checkCoverage(map);
  assert.ok(Math.abs(map.tiles[2 * 12 + 2].areas.grass - tileArea(coast)) < 1e-8);
});

test('grid-aligned coast edges require a matching boundary on both neighbors', () => {
  const map = waterFixture([
    [0, 0] satisfies [number, number],
    [6, 0] satisfies [number, number],
    [6, 12] satisfies [number, number],
    [0, 12] satisfies [number, number],
  ]);
  checkCoverage(map);
  const land = map.tiles[5 * 12 + 5];
  land.waterBorders = undefined;
  const result = validateTileMap(map);
  assert.ok(!result.ok);
  assert.ok(result.errors.some((e) => e.includes('water edge')));
});

test('lake banks share complete coverage and connected lobes have one water level', () => {
  const coast = [
      [-1, -1] satisfies [number, number],
      [13, -1] satisfies [number, number],
      [13, 13] satisfies [number, number],
      [-1, 13] satisfies [number, number],
    ],
    lakes = [
      { x: 5, z: 6, rx: 2.4, rz: 3, level: 1.25 },
      { x: 7, z: 7, rx: 2.4, rz: 2, level: 1.25 },
    ];
  const map = waterFixture(coast, lakes);
  checkCoverage(map);
  assert.ok(map.tiles.some((t) => t.variant === 'shoreline' && t.areas.water));
  for (const tile of map.tiles)
    for (const patch of tile.patches || [])
      if (patch.type === 'water') assert.equal(patch.level, 1.25);
  const full = map.tiles.find((t) => t.type === 'water' && !t.patches);
  assert.ok(full);
  full.waterLevel = 2;
  const result = validateTileMap(map);
  assert.ok(!result.ok);
  assert.ok(result.errors.some((e) => e.includes('water height')));
});

test('water-edge checks reject a missing coastal fragment even if coverage is replaced', () => {
  const map = waterFixture([
    [1.13, 10.87] satisfies [number, number],
    [2.2, 1.17] satisfies [number, number],
    [8.83, 2.36] satisfies [number, number],
    [10.47, 10.81] satisfies [number, number],
  ]);
  checkCoverage(map);
  const id = map.tiles.findIndex(
    (t) => t.variant === 'shoreline' && t.edges.some((e) => e.some((s) => s.type === 'sea')),
  );
  map.tiles[id] = buildSurfaceTile(
    'grass',
    Array.from({ length: 4 }, () => [10, 10] satisfies [number, number]),
  );
  assert.ok(
    !validateTileMap(map).ok,
    'the validator must catch a full land tile covering the water',
  );
});
