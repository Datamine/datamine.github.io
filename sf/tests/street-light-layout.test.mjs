import test from 'node:test';
import assert from 'node:assert/strict';
import { planBlockStreetLights, SOUTHERN_STREET_LIGHT_POLICY } from '../street-light-layout.js';

test('lighting follows actual junctions, removes duplicate road runs, and clears entrances', () => {
  const roads = [
    {
      name: 'Main',
      points: [
        [0, 100],
        [24, 100],
      ],
    },
    {
      name: 'Duplicate',
      points: [
        [24, 100],
        [0, 100],
      ],
    },
    {
      name: 'First',
      points: [
        [8, 96],
        [8, 108],
      ],
    },
    {
      name: 'Second',
      points: [
        [16, 96],
        [16, 108],
      ],
    },
  ];
  const surfaceType = (x, z) => {
    const distance = Math.min(Math.abs(z - 100), Math.abs(x - 8), Math.abs(x - 16));
    return distance < 0.5 ? 'road' : distance < 0.75 ? 'sidewalk' : 'grass';
  };
  const avoid = [{ x: 4, z: 99.375 }],
    plan = planBlockStreetLights({ roads, surfaceType, avoid });
  assert.equal(plan.blocks.length, 7, 'crossings split the long street into three blocks');
  assert.deepEqual(plan.unlit, []);
  for (const block of plan.blocks) assert.ok(block.fixtures.length > 0);
  for (const lamp of plan.lamps) {
    assert.equal(surfaceType(lamp.x, lamp.z), 'sidewalk');
    assert.ok(Math.hypot(lamp.x - 4, lamp.z - 99.375) >= 0.75);
  }
  assert.deepEqual(
    plan,
    planBlockStreetLights({ roads, surfaceType, avoid }),
    'lamp positions must be stable between builds',
  );
});

test('the southern policy budgets one lamp per normal block and shares close corners', () => {
  const roads = [];
  for (const x of [0, 6, 12, 18])
    roads.push({
      name: 'Avenue ' + x,
      points: [
        [x, 100],
        [x, 118],
      ],
    });
  for (const z of [100, 106, 112, 118])
    roads.push({
      name: 'Street ' + z,
      points: [
        [0, z],
        [18, z],
      ],
    });
  const surfaceType = (x, z) => {
    const d = Math.min(
      ...[0, 6, 12, 18].map((p) => Math.abs(x - p)),
      ...[100, 106, 112, 118].map((p) => Math.abs(z - p)),
    );
    return d < 0.5 ? 'road' : d < 0.75 ? 'sidewalk' : 'grass';
  };
  const dense = planBlockStreetLights({ roads, surfaceType, maxSpacing: 5.5 }),
    plan = planBlockStreetLights({ roads, surfaceType, ...SOUTHERN_STREET_LIGHT_POLICY });
  assert.deepEqual(plan.unlit, []);
  assert.ok(
    plan.lamps.length < dense.lamps.length * 0.7,
    'normal blocks should not retain a pair of poles',
  );
  assert.ok(
    plan.lamps.some((l) => l.blocks?.length > 1),
    'short neighboring blocks should share a corner fixture',
  );
  for (const b of plan.blocks) {
    assert.equal(b.targetFixtures, 1);
    assert.equal(b.fixtures.length, 1);
  }
  for (const [i, a] of plan.lamps.entries())
    for (const b of plan.lamps.slice(i + 1))
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= plan.minSeparation - 1e-8);
  const long = planBlockStreetLights({
    roads: [
      {
        name: 'Long avenue',
        points: [
          [0, 100],
          [30, 100],
        ],
      },
    ],
    surfaceType: () => 'sidewalk',
    ...SOUTHERN_STREET_LIGHT_POLICY,
  });
  assert.equal(long.blocks[0].targetFixtures, 3);
  assert.equal(long.lamps.length, 3, 'long blocks receive one fixture per 12 tiles');
});

test('city lighting clips continuous roads at regional boundaries and covers east-west crossings', () => {
  const roads = [
    {
      name: 'North-south avenue',
      points: [
        [8, 4],
        [8, 110],
      ],
    },
    {
      name: 'Middle east-west street',
      points: [
        [0, 52],
        [40, 52],
      ],
    },
  ];
  const plan = planBlockStreetLights({
    roads,
    surfaceType: () => 'sidewalk',
    minZ: 32,
    maxZ: 78,
    maxSpacing: 6,
  });
  assert.equal(plan.blocks.length, 4);
  assert.deepEqual(plan.unlit, []);
  assert.ok(plan.lamps.length > 12);
  for (const block of plan.blocks) {
    assert.ok(block.fixtures.length);
    for (const p of [block.a, block.b]) assert.ok(p[1] >= 32 && p[1] <= 78);
  }
  assert.ok(plan.lamps.filter((l) => l.street === 'Middle east-west street' && l.x < 8).length);
  assert.ok(plan.lamps.filter((l) => l.street === 'Middle east-west street' && l.x > 8).length);
  assert.deepEqual(
    plan,
    planBlockStreetLights({
      roads,
      surfaceType: () => 'sidewalk',
      minZ: 32,
      maxZ: 78,
      maxSpacing: 6,
    }),
  );
});
