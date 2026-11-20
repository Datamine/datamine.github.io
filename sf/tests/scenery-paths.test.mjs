import test from 'node:test';
import assert from 'node:assert/strict';
import { createCityLife } from '../life.js';
import { buildTileNavigation } from '../navigation.js';
import { createWilderness } from '../wilderness.js';
import { createTahoe, TAHOE_TREES } from '../tahoe.js';

const tree = {
  polygon: [
    [5, 4.6],
    [5.3, 4.6],
    [5.3, 5.4],
    [5, 5.4],
  ],
  id: 'tree-trunk',
};
const graph = buildTileNavigation(
  { size: 48, step: 0.25, tiles: Array.from({ length: 48 * 48 }, () => ({ type: 'grass' })) },
  { obstacles: [tree] },
);
const free = (x, z) => graph.free(x - 0.5, z - 0.5),
  travel = (ax, az, bx, bz) =>
    graph.segment({ x: ax - 0.5, y: az - 0.5 }, { x: bx - 0.5, y: bz - 0.5 });

test('pedestrians and bicycles split patrols at solid scenery, including thin obstacles between clear endpoints', () => {
  const blocked = (a, b) => (a < 10 && b > 10) || (b < 10 && a > 10);
  const life = createCityLife({
    routes: [
      {
        name: 'Park promenade',
        kind: 'path',
        halfWidth: 0,
        points: [
          [0, 5],
          [20, 5],
        ],
      },
    ],
    surfaceType: () => 'sidewalk',
    lamps: [],
    terrainHeight: () => 0,
    scale: 1,
    human() {},
    bicycle() {},
    walkable: (x, z) => !(x > 9.98 && x < 10.02),
    canTravel: (ax, az, bx, bz) => !blocked(ax, bx),
    maxWalkers: 10,
    maxRiders: 10,
    waterTraffic: false,
  });
  assert.ok(life.people.some((n) => n.rider));
  assert.ok(life.people.some((n) => !n.rider));
  for (const npc of life.people)
    for (let i = 1; i < npc.points.length; i++)
      assert.ok(!blocked(npc.points[i - 1][0], npc.points[i][0]));
  for (let i = 0; i < 1000; i++) {
    life.update(0.05);
    for (const npc of life.people) assert.ok(npc.x < 9.98 || npc.x > 10.02);
  }
});

test('players and pursuing monsters use the same adjacency to go around a tree', () => {
  assert.equal(free(5.15, 5), false);
  assert.equal(travel(2.5, 5, 9.5, 5), false);
  const route = (a, b) =>
    graph
      .path({ x: a.x - 0.5, y: a.z - 0.5 }, { x: b.x - 0.5, y: b.z - 0.5 })
      ?.map((p) => ({ x: p.x + 0.5, z: p.y + 0.5 }));
  const path = route({ x: 2.5, z: 5 }, { x: 9.5, z: 5 });
  assert.ok(path?.length > 1);
  let previous = { x: 2.5, z: 5 };
  for (const p of path) {
    assert.ok(travel(previous.x, previous.z, p.x, p.z));
    previous = p;
  }
  const world = createWilderness({
      spawns: [{ id: 'bear', combatKind: 'bear', x: 2.5, z: 5 }],
      ground: () => 0,
      canTravel: (a, b) => travel(a.x, a.z, b.x, b.z),
      route,
      onDamage() {},
    }),
    bear = world.actors[0],
    target = { id: 1, x: 9.5, z: 5 };
  bear.enemy = target.id;
  for (let i = 0; i < 180; i++) {
    const before = { x: bear.x, z: bear.z };
    world.update(0.05, [target]);
    assert.ok(free(bear.x, bear.z));
    assert.ok(travel(before.x, before.z, bear.x, bear.z));
  }
  assert.ok(
    Math.hypot(bear.x - target.x, bear.z - target.z) < 1.6,
    'bear should reach the target around the tree',
  );
});

test('Tahoe evergreen models have solid trunks in the native walking rules', () => {
  const tahoe = createTahoe();
  assert.ok(TAHOE_TREES.length > 20);
  for (const tree of TAHOE_TREES) {
    assert.equal(tahoe.walkable(tree.x, tree.z), false);
    assert.equal(
      tahoe.segment({ x: tree.x - 1, y: tree.z - 0.5 }, { x: tree.x, y: tree.z - 0.5 }),
      false,
    );
  }
});

test('three stroller families can share a checked promenade without adding blocked routes', () => {
  const life = createCityLife({
    routes: [
      {
        name: 'Short safe promenade',
        kind: 'road',
        halfWidth: 0,
        points: [
          [0, 0],
          [7, 0],
        ],
      },
    ],
    surfaceType: () => 'sidewalk',
    lamps: [],
    terrainHeight: () => 0,
    scale: 1,
    human() {},
    bicycle() {},
    strollers: true,
    maxWalkers: 3,
    maxRiders: 0,
    walkable: (x, z) => Math.abs(z) < 0.4,
    waterTraffic: false,
  });
  assert.equal(life.people.length, 3);
  assert.equal(new Set(life.people.map((n) => n.seed)).size, 3);
  life.update(0);
  assert.equal(new Set(life.people.map((n) => n.x)).size, 3);
});
