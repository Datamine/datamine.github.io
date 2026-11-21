import { buildSurfaceTile, TILE_TYPES } from '../tiles.ts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createNavigationGrid,
  buildTileNavigation,
  navigationObstacles,
  auditNavigationGrid,
} from '../navigation.ts';

const uniform = (size: number, type = 'grass'): import('../types/tiles.ts').TileMap => ({
  size,
  step: 1,
  tiles: Array.from({ length: size * size }, () => ({
    ...buildSurfaceTile(
      type,
      Array.from({ length: 4 }, () => [1, 1]),
    ),
    patches: null,
  })),
});
// Independent four-neighbor BFS is a reachability oracle. A permitted diagonal
// always has a two-step orthogonal alternative, so it cannot change connectivity.
function reachable(mask: Uint8Array, width: number, start: number, goal: number) {
  if (!mask[start] || !mask[goal]) return false;
  const seen = new Set([start]),
    queue = [start];
  for (const id of queue) {
    if (id === goal) return true;
    const x = id % width,
      z = Math.floor(id / width);
    for (const [xx, zz] of [
      [x - 1, z] satisfies [number, number],
      [x + 1, z] satisfies [number, number],
      [x, z - 1] satisfies [number, number],
      [x, z + 1] satisfies [number, number],
    ]) {
      const n = zz * width + xx;
      if (xx < 0 || xx >= width || zz < 0 || n >= mask.length || !mask[n] || seen.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return false;
}

test('all 512 three-by-three maps agree with an independent reachability oracle for every pair', () => {
  for (let bits = 0; bits < 512; bits++) {
    const mask = Uint8Array.from({ length: 9 }, (_, i) => (bits >> i) & 1),
      g = createNavigationGrid({ width: 3, mask });
    assert.equal(auditNavigationGrid(g).ok, true);
    for (let a = 0; a < 9; a++)
      for (let b = 0; b < 9; b++) {
        const from = g.pointAt(a),
          to = g.pointAt(b),
          expected = reachable(mask, 3, a, b);
        assert.equal(g.connected(from, to), expected, `map ${bits}, ${a} -> ${b}`);
        const path = g.path(from, to);
        assert.equal(path !== null, expected);
        if (path) {
          let previous = from;
          for (const p of path) {
            assert.ok(g.segment(previous, p));
            previous = p;
          }
          assert.deepEqual(previous, to);
        }
      }
  }
});

test('every tile type has an explicit walking rule and material changes change the graph', () => {
  for (const type of Object.values(TILE_TYPES)) assert.equal(typeof type.walkable, 'boolean');
  const map = uniform(3),
    types = { ...TILE_TYPES, grass: { ...TILE_TYPES.grass, walkable: false } };
  assert.equal(buildTileNavigation(map).free(1, 1), true);
  assert.equal(buildTileNavigation(map, { types }).free(1, 1), false);
  assert.throws(() => buildTileNavigation(uniform(1, 'unknown')), /Missing navigation rule/);
});

test('partial shoreline material, rather than a separate ellipse approximation, blocks walking', () => {
  const map = uniform(2);
  map.tiles[0] = {
    ...map.tiles[0],
    type: 'grass',
    patches: [
      {
        type: 'grass',
        polygon: [
          [0, 0] satisfies [number, number],
          [0.4, 0] satisfies [number, number],
          [0.4, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      },
      {
        type: 'water',
        polygon: [
          [0.4, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0.4, 1] satisfies [number, number],
        ],
      },
    ],
  };
  const g = buildTileNavigation(map);
  assert.equal(g.free(0, 0), false);
  assert.equal(g.describe(0, 0).type, 'water');
  assert.equal(g.describe(0, 0).blockedBy, 'terrain');
  assert.equal(g.free(1, 0), true);
});

test('a blocked diagonal and a wall cannot be bypassed by line-of-sight smoothing', () => {
  const g = createNavigationGrid({
    width: 3,
    mask: Uint8Array.from([1, 0, 1, 0, 1, 1, 1, 1, 1] satisfies [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]),
  });
  assert.equal(g.segment({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }), false);
  assert.equal(g.path({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }), null);
  assert.equal(g.stats.expanded, 0);
  const room = createNavigationGrid({
    width: 5,
    mask: Uint8Array.from([
      1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1,
    ]),
  });
  const from = { x: 0.5, y: 0.5 },
    to = { x: 4.5, y: 0.5 },
    route = room.path(from, to);
  assert.ok(route != null, 'Missing test fixture: route');
  assert.ok(route.length > 1);
  assert.equal(room.segment(from, to), false);

  assert.ok(route.some((p) => p.y >= 4));
});

test('shop interiors connect through their actual door, including rotated buildings', () => {
  const resolution = 4,
    map = {
      size: 40,
      step: 1 / resolution,
      tiles: Array.from({ length: 1600 }, () =>
        buildSurfaceTile(
          'building',
          Array.from({ length: 4 }, () => [1, 1]),
        ),
      ),
    };
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      place = {
        name: 'Shop',
        label: 'Shop',
        h: 3,
        height: 3,
        color: '#aaaaaa',
        entry: { x: 4, y: 6 },
        inside: { x: 4, y: 5 },
        id: 'shop',
        x: 3,
        y: 3,
        w: 3,
        d: 3,
        localDoor: 4,
        rotation: a,
      },
      g = buildTileNavigation(map, { obstacles: navigationObstacles([{ ...place, place }]) });
    const rotate = (x: number, z: number) => ({
      x: 4.5 + (x - 4.5) * Math.cos(a) - (z - 4.5) * Math.sin(a) - 0.5,
      y: 4.5 + (x - 4.5) * Math.sin(a) + (z - 4.5) * Math.cos(a) - 0.5,
    });
    const inside = rotate(4.5, 5.2),
      outside = rotate(4.5, 6.6),
      rear = rotate(4.5, 3.05);
    assert.ok(g.path(inside, outside), `door at rotation ${i}`);
    assert.equal(g.free(rear.x, rear.y), false);
    assert.match(requiredFixture(g.describe(rear.x, rear.y).blockedBy), /shop:wall/);
  }
});

test('logical coordinates, borders, invalid points and circular snapping use one convention', () => {
  const g = createNavigationGrid({
    width: 8,
    resolution: 4,
    offset: 0.5,
    mask: new Uint8Array(64).fill(1),
  });
  assert.equal(g.cellAt(-0.5, -0.5), 0);
  assert.equal(g.cellAt(1.5, 0), -1);
  assert.equal(g.free(NaN, 0), false);
  assert.equal(g.path({ x: 0, y: 0 }, { x: Infinity, y: 0 }), null);
  assert.equal(g.nearest(5, 5, 1), null);
  assert.equal(g.nearest(0, 0, 0.01), null);
  const p = g.nearest(0, 0, 0.2);
  assert.ok(p != null, 'Missing test fixture: p');
  assert.ok(Math.hypot(p.x, p.y) <= 0.2);
  assert.deepEqual(g.path(p, p), []);
  const to = { x: 0.49, y: 0.37 };
  assert.deepEqual(requiredFixture(g.path(p, to)).at(-1), to);
});

test('disconnected queries do not search, and reused search buffers do not leak earlier parents', () => {
  const g = createNavigationGrid({
    width: 5,
    mask: Uint8Array.from([
      1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
    ]),
  });
  for (let i = 0; i < 100; i++) {
    const from = { x: 0.5, y: 0.5 },
      to = { x: 1.5, y: 4.5 };
    assert.ok(g.path(from, to));
    assert.equal(g.path(from, { x: 4.5, y: 0.5 }), null);
    assert.equal(g.stats.expanded, 0);
  }
  assert.equal(g.stats.disconnected, 100);
});

test('negative-going clicks ending at an exact grid corner remain reversible', () => {
  const g = createNavigationGrid({
    width: 8,
    height: 8,
    resolution: 4,
    mask: new Uint8Array(64).fill(1),
  });
  for (const [from, to] of [
    [
      { x: 1.375, y: 0.875 },
      { x: 1, y: 1 },
    ],
    [
      { x: 0.875, y: 1.375 },
      { x: 1, y: 1 },
    ],
    [
      { x: 1.375, y: 1.375 },
      { x: 1, y: 1 },
    ],
  ]) {
    assert.ok(g.segment(from, to));
    assert.ok(g.segment(to, from));
    assert.deepEqual(requiredFixture(g.path(from, to)).at(-1), to);
  }
});
