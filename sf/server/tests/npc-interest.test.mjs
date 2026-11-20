import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player } from './fixtures.mjs';
import { createNPCRoaming } from '../../npc-roaming.js';
test('a newly nearby vendor replaces farther pedestrians at the NPC interest limit', async () => {
  const geometry = fixtureGeometry(),
    x = geometry.spawn.x + 0.5,
    z = geometry.spawn.y + 0.5;
  geometry.merchants = [
    ...Array.from({ length: 32 }, (_, i) => ({
      id: 'crowd-' + i,
      label: 'Man',
      x: x + 1 + i * 0.1,
      z,
      base: 1.15,
      angle: 0,
    })),
    {
      id: 'gpu-vendor',
      kind: 'gpu-buyer',
      label: 'GPU Factory buyer',
      x: x + 25,
      z,
      base: 1.15,
      angle: 0,
    },
  ];
  const game = await createGame({ geometry, store: createMemoryStore() }),
    a = await player(game, 1120);
  try {
    game.tick(0.25);
    game.broadcast();
    assert.equal(a.p.entityVersions.npcs.has('gpu-vendor'), false);
    a.p.x = x + 25;
    game.tick(0.25);
    game.broadcast();
    assert.equal(a.p.entityVersions.npcs.has('gpu-vendor'), true);
    assert.equal(a.p.entityVersions.npcs.size, 32);
  } finally {
    await game.close();
  }
});

test('relocated academics ignore saved positions from their old campus, including legacy saves', async () => {
  for (const legacy of [false, true]) {
    const store = createMemoryStore(),
      geometry = fixtureGeometry();
    geometry.landClearAt = () => true;
    geometry.merchants = [
      {
        id: 'relocated-scholar',
        researcher: true,
        label: 'Professor',
        x: 35.5,
        z: 200.1,
        base: 1.6,
        points: [
          [34.9, 200.1],
          [36.1, 200.1],
          [36.1, 198.7],
          [34.9, 198.7],
        ],
        routeIndex: 1,
      },
    ];
    await store.batch([
      [
        'world',
        {
          shared: {
            npcs: [
              {
                id: 'relocated-scholar',
                x: 55.5,
                z: 173.2,
                ...(legacy ? {} : { layout: 'old-campus-layout' }),
              },
            ],
          },
        },
      ],
    ]);
    const game = await createGame({ geometry, store });
    try {
      const npc = game.shared.npcById.get('relocated-scholar');
      assert.equal(npc.x, 35.5);
      assert.equal(npc.z, 200.1);
      await game.flush();
      assert.ok((await store.get('world')).shared.npcs[0].layout);
    } finally {
      await game.close();
    }
  }
});

test('an unchanged NPC patrol resumes its saved position on restart', async () => {
  const store = createMemoryStore(),
    make = () => {
      const geometry = fixtureGeometry();
      geometry.merchants = [
        {
          id: 'same-scholar',
          researcher: true,
          label: 'Professor',
          x: 95,
          z: 120,
          base: 1.15,
          points: [
            [95, 120],
            [96, 120],
          ],
          routeIndex: 1,
        },
      ];
      return geometry;
    };
  const first = await createGame({ geometry: make(), store });
  first.shared.npcById.get('same-scholar').x = 95.3;
  await first.close();
  const second = await createGame({ geometry: make(), store });
  try {
    assert.equal(second.shared.npcById.get('same-scholar').x, 95.3);
  } finally {
    await second.close();
  }
});

function roamingGeometry() {
  const geometry = fixtureGeometry(),
    npc = {
      id: 'roaming-vendor',
      kind: 'gpu-buyer',
      label: 'Vendor',
      x: 95,
      z: 120,
      angle: 0,
      phase: 0,
      base: 1.15,
    };
  geometry.merchants = [npc];
  geometry.specialNPCLife = createNPCRoaming([npc], {
    eligible: () => true,
    walkable: () => true,
    canTravel: () => true,
    ground: () => 1.15,
    approachFor: () => ({ x: 94.5, y: 120.5 }),
  });
  return geometry;
}

test('changed patrols discard saved cursors even when their home and bounds are unchanged', async () => {
  for (const sameLength of [false, true]) {
    const store = createMemoryStore(),
      oldGeometry = roamingGeometry(),
      old = oldGeometry.merchants[0];
    if (sameLength) old.roam.points[1] = { ...old.roam.points[1], x: old.roam.points[1].x + 0.125 };
    else old.roam.points.push(...old.roam.points.slice(1));
    const first = await createGame({ geometry: oldGeometry, store });
    old.roam.index = old.roam.points.length - 1;
    old.roam.pause = 0;
    old.x += 0.1;
    await first.close();
    const geometry = roamingGeometry(),
      npc = geometry.merchants[0],
      game = await createGame({ geometry, store });
    try {
      assert.equal(npc.x, 95);
      assert.equal(npc.roam.index, 1);
      for (let i = 0; i < 200; i++) assert.doesNotThrow(() => game.tick(0.05));
      assert.ok(Number.isFinite(npc.x));
    } finally {
      await game.close();
    }
  }
});

test('invalid persisted cursors reset automatically without replacing authored patrol data', async () => {
  const initial = createMemoryStore(),
    first = await createGame({ geometry: roamingGeometry(), store: initial });
  await first.close();
  const saved = structuredClone(await initial.get('world'));
  for (const index of [1, -1, 0, 999, 1.5, '1', null, undefined]) {
    const store = createMemoryStore(),
      world = structuredClone(saved),
      record = world.shared.npcs[0];
    record.x = 95.1;
    record.roam.index = index;
    record.roam.pause = 0;
    record.roam.points = [];
    await store.batch([['world', world]]);
    const geometry = roamingGeometry(),
      npc = geometry.merchants[0],
      game = await createGame({ geometry, store });
    try {
      assert.equal(npc.x, index === 1 ? 95.1 : 95);
      assert.equal(npc.roam.index, 1);
      assert.ok(npc.roam.points.length >= 3);
      for (let i = 0; i < 30; i++) assert.doesNotThrow(() => game.tick(0.05));
    } finally {
      await game.close();
    }
  }
});
