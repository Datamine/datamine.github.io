import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialIndex } from '../spatial-index.mjs';
import { createPlayerFrames } from '../player-frames.mjs';
import { createReplication } from '../replication.mjs';
import { createActionQueue } from '../action-queue.mjs';
import { createRoutePlanner } from '../routes.mjs';
import { createPerformanceMetrics } from '../performance.mjs';
import { createCheckpointManager } from '../checkpoints.mjs';
import { createMemoryStore } from '../store.mjs';
import { createGame } from '../game.mjs';
import { fixtureGeometry, player, command } from './fixtures.mjs';
import { encodePlayerFrame, decodePlayerFrame, MP_MODES } from '../../multiplayer-protocol.js';
import { createNavigationGrid } from '../../navigation.js';

test('bounded spatial queries match brute-force nearest neighbors, including exclusions and boundaries', () => {
  const actors = Array.from({ length: 2000 }, (_, id) => ({
      id,
      x: Math.sin(id * 7) * 45,
      z: Math.cos(id * 3) * 45,
      mode: id % 19 ? 'walk' : 'hidden',
    })),
    index = new SpatialIndex(12);
  index.rebuild(actors);
  for (let i = 0; i < 30; i++) {
    const x = i * 0.173,
      z = i * -0.253,
      exclude = actors[i],
      radius = 20,
      expected = actors
        .filter(
          (a) =>
            a !== exclude && a.mode !== 'hidden' && (a.x - x) ** 2 + (a.z - z) ** 2 <= radius ** 2,
        )
        .sort(
          (a, b) =>
            (a.x - x) ** 2 + (a.z - z) ** 2 - ((b.x - x) ** 2 + (b.z - z) ** 2) || a.id - b.id,
        )
        .slice(0, 32)
        .map((a) => a.id);
    assert.deepEqual(
      index.near(x, z, radius, 32, exclude).map((a) => a.id),
      expected,
    );
    assert.deepEqual(
      index.near(x, z, radius, 32, exclude).map((a) => a.id),
      expected,
    );
  }
  index.rebuild([
    { id: 'a', x: 1, z: 0 },
    { id: 'b', x: -1, z: 0 },
  ]);
  assert.deepEqual(
    index.near(0, 0, 1, 1).map((a) => a.id),
    ['a'],
  );
  assert.equal(index.near(0, 0, 0.99).length, 0);
});

test('encode-once player records preserve protocol bytes and every visible field', () => {
  const actors = MP_MODES.map((mode, i) => ({
      id: i + 1,
      x: i + 0.123,
      z: i - 0.321,
      y: 1,
      angle: 0.2,
      phase: 0.4,
      motion: 0.3,
      mode,
      hp: 30,
      max: 30,
      level: 10,
      moving: true,
      gesture: 'attack',
      profile: { pvp: { enabled: true } },
    })),
    frames = createPlayerFrames();
  frames.capture(actors);
  assert.deepEqual(
    new Uint8Array(frames.encode(actors, 123, 999)),
    new Uint8Array(encodePlayerFrame(actors, 123, 999)),
  );
  const version = frames.version(1);
  frames.capture(actors);
  assert.equal(frames.version(1), version);
  actors[0].x += 0.001;
  frames.capture(actors);
  assert.notEqual(
    frames.version(1),
    version,
    'sub-centimeter wire changes cannot be lost to a rounded JSON signature',
  );
  assert.deepEqual(
    new Uint8Array(frames.encode(actors.slice(0, 2), 124, 1000)),
    new Uint8Array(encodePlayerFrame(actors.slice(0, 2), 124, 1000)),
  );
  frames.capture(actors.slice(1));
  assert.equal(frames.version(1), undefined);
});

test('crowded replication stays bounded, isolates private instances and re-enters with a full baseline', () => {
  const players = new Map(),
    messages = new Map(),
    metrics = { frames: 0, slowClients: 0 },
    npcs = Array.from({ length: 100 }, (_, i) => ({
      id: 'n' + i,
      x: i * 0.1,
      z: 0,
      base: 1,
      level: 1,
    }));
  for (let id = 1; id <= 2000; id++) {
    players.set(id, {
      id,
      x: 0,
      z: 0,
      y: 1,
      angle: 0,
      phase: 0,
      motion: 0,
      mode: 'walk',
      hp: 30,
      level: 1,
      revision: 1,
      seen: new Map(),
      transport: { bufferedAmount: 0 },
      profile: { privateState: {} },
      inventory: { meta: { epoch: 1, revision: 0 }, snapshot: () => ({}) },
    });
    messages.set(id, []);
  }
  const shared = {
      clock: 0,
      snapshot: () => ({
        npcs,
        cows: [],
        wilderness: [],
        loot: [],
        tiger: { tiger: { x: 0, y: 0 } },
        raptor: { x: 0, z: 0 },
        airship: null,
        peptideSpawnAt: 10,
      }),
    },
    replication = createReplication({
      players,
      shared,
      personal: { components: () => new Map() },
      send: (p, m) => messages.get(p.id).push(m),
      publicPlayer: (p) => ({ id: p.id, name: 'Player' + p.id, revision: p.revision }),
      now: () => 1000,
      metrics,
    });
  replication.broadcast(1);
  const a = players.get(1),
    initial = decodePlayerFrame(messages.get(1).find((m) => m instanceof ArrayBuffer));
  assert.equal(initial.players.length, 33);
  assert.equal(a.seen.size, 32);
  assert.equal(a.entityVersions.npcs.size, 32);
  for (const list of messages.values()) list.length = 0;
  replication.broadcast(2);
  assert.equal(
    messages.get(1).filter((m) => m instanceof ArrayBuffer).length,
    0,
    'idle actors send no redundant movement',
  );
  a.instance = { kind: 'kraken', id: 'private-1' };
  shared.clock = 0.2;
  replication.broadcast(3);
  assert.equal(a.seen.size, 0);
  assert.equal(a.entityVersions.npcs.size, 0);
  assert.equal(players.get(2).seen.has(1), false);
  a.instance = { kind: 'world', id: 'world' };
  shared.clock = 0.4;
  replication.broadcast(4);
  assert.equal(a.seen.size, 32);
  assert.equal(a.entityVersions.npcs.size, 32);
  assert.ok(messages.get(1).some((m) => m.type === 'interest' && m.enter.length === 32));
});

test('action batches yield to I/O without reordering mutations and continue after a rejection', async () => {
  let clock = 0,
    yields = 0;
  const seen = [],
    queue = createActionQueue({
      maxBatch: 2,
      sliceMs: 4,
      clock: () => clock,
      yieldTurn: async () => {
        yields++;
        clock = 0;
      },
    }),
    jobs = [];
  for (let i = 0; i < 7; i++)
    jobs.push(
      queue.enqueue(() => {
        seen.push(i);
        clock++;
        if (i === 3) throw Error('expected');
      }),
    );
  const results = await Promise.allSettled(jobs);
  await queue.drain();
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(results[3].status, 'rejected');
  assert.equal(yields, 3);
  assert.equal(queue.stats.pending, 0);
});

test('exact route cache protects mutable paths, expires failures, invalidates on map changes and bounds memory/replans', () => {
  let time = 0,
    revision = 0,
    calls = 0;
  const planner = createRoutePlanner({
    pathTo: (x, y) => {
      calls++;
      return x < 0 ? null : [{ x, y }];
    },
    revision: () => revision,
    now: () => time,
    maxEntries: 2,
    maxPoints: 2,
    ttlMs: 100,
    replansPerTick: 1,
  });
  const from = { x: 0, y: 0 },
    route = planner.pathTo(2, 3, from, true);
  route[0].x = 900;
  assert.deepEqual(planner.pathTo(2, 3, from, true), [{ x: 2, y: 3 }]);
  assert.equal(calls, 1);
  planner.pathTo(2.01, 3, from, true);
  assert.equal(calls, 2, 'nearby exact endpoints must not alias');
  planner.pathTo(-1, 3, from);
  planner.pathTo(-1, 3, from);
  assert.equal(calls, 3);
  assert.ok(planner.stats.entries <= 2);
  time = 101;
  planner.pathTo(-1, 3, from);
  assert.equal(calls, 4);
  revision++;
  planner.pathTo(-1, 3, from);
  assert.equal(calls, 5);
  planner.beginTick();
  assert.equal(planner.allowReplan(), true);
  assert.equal(planner.allowReplan(), false);
  planner.beginTick();
  assert.equal(planner.allowReplan(), true);
});

test('consecutive queued destinations coalesce but an intervening action preserves ordering', async () => {
  const checkpoints = await createCheckpointManager({ store: createMemoryStore() }),
    store = checkpoints.openGame(),
    geometry = fixtureGeometry();
  let searches = 0;
  geometry.pathTo = (x, y) => {
    searches++;
    return [{ x, y }];
  };
  const game = await createGame({ geometry, store }),
    a = await player(game, 48001);
  checkpoints.attach('world', { prepare: game.prepareCheckpoint, drain: game.close });
  try {
    for (let request = 1; request <= 3; request++)
      game.receive(a.p, {
        type: 'command',
        request,
        action: 'moveTo',
        args: { x: 100 + request, z: 120 },
      });
    await a.p.queue;
    assert.equal(searches, 1);
    assert.equal(game.metrics.coalescedMoves, 2);
    assert.equal(a.p.moveGoal.x, 103);
    assert.equal(a.messages.filter((m) => m.superseded).length, 2);
    game.receive(a.p, { type: 'command', request: 4, action: 'moveTo', args: { x: 104, z: 120 } });
    game.receive(a.p, { type: 'command', request: 5, action: 'stopMoving' });
    game.receive(a.p, { type: 'command', request: 6, action: 'moveTo', args: { x: 106, z: 120 } });
    await a.p.queue;
    assert.equal(searches, 3);
    assert.equal(a.p.moveGoal.x, 106);
    assert.equal(a.p.pendingActions, 0);
    await command(game, a.p, 'stopMoving');
  } finally {
    await checkpoints.shutdown();
  }
});

test('performance samples use bounded rolling storage and report percentiles', () => {
  const metrics = createPerformanceMetrics({ capacity: 4 });
  for (let i = 1; i <= 8; i++) metrics.observe('tickMs', i);
  const sample = metrics.snapshot().tickMs;
  assert.equal(sample.samples, 8);
  assert.equal(sample.mean, 6.5);
  assert.equal(sample.p99, 8);
  assert.equal(sample.max, 8);
});

test('identical direct routes share validation without retaining mutable waypoint arrays', () => {
  let probes = 0;
  const planner = createRoutePlanner({
      pathTo: () => assert.fail('clear routes do not need A*'),
      canTravel: () => {
        probes++;
        return true;
      },
    }),
    from = { x: 1, y: 1 };
  for (let i = 0; i < 1000; i++) {
    const route = planner.pathTo(2, 2, from, true);
    assert.deepEqual(route, [{ x: 2, y: 2 }]);
    route[0].x = 99;
  }
  assert.equal(probes, 1);
  assert.equal(planner.stats.hits, 999);
  assert.equal(planner.stats.points, 0);
});

test('shared cell routes reuse searches only with safe exact-endpoint connectors', () => {
  const mask = new Uint8Array(144).fill(1);
  for (let z = 0; z < 7; z++) mask[z * 12 + 5] = 0;
  const grid = createNavigationGrid({ width: 12, mask });
  let searches = 0,
    denyConnectors = false;
  const planner = createRoutePlanner({
    pathTo: (x, y, from) => {
      searches++;
      return grid.path(from, { x, y });
    },
    canTravel: (a, b) =>
      !(
        denyConnectors &&
        Math.hypot(a.x - b.x, a.y - b.y) > 0 &&
        Math.hypot(a.x - b.x, a.y - b.y) < 0.1
      ) && grid.segment(a, b),
  });
  for (const shift of [0.01, 0.02, 0.03]) {
    const from = { x: 1.1 + shift, y: 2.1 + shift },
      to = { x: 8.1 + shift, y: 2.1 + shift },
      route = planner.pathTo(to.x, to.y, from, true);
    assert.ok(route?.length);
    let previous = from;
    for (const point of route) {
      assert.equal(grid.segment(previous, point), true);
      previous = point;
    }
    assert.deepEqual(route.at(-1), to);
  }
  assert.equal(searches, 1);
  assert.equal(planner.stats.coreHits, 2);
  denyConnectors = true;
  assert.ok(planner.pathTo(8.14, 2.14, { x: 1.14, y: 2.14 }, true));
  assert.equal(searches, 2, 'a rejected exact connector must force a fresh search');
  denyConnectors = false;
  for (let i = 0; i < 400; i++) planner.pathTo(-i - 1, 2.1, { x: 1.1, y: 2.1 }, true);
  const before = searches;
  assert.ok(planner.pathTo(8.15, 2.15, { x: 1.15, y: 2.15 }, true));
  assert.equal(searches, before, 'one-use failed endpoints must not evict the reusable core');
  assert.ok(planner.stats.entries <= 4096);
  const blocked = { x: 5.01, y: 2.1 };
  assert.equal(
    planner.pathTo(8.1, 2.1, blocked, true),
    null,
    'a matching cell cannot bypass a blocked exact origin',
  );
});

test('idle creature shuffles avoid global searches while active pursuit retains routing', async () => {
  const geometry = fixtureGeometry();
  let searches = 0;
  geometry.pathTo = (x, y) => {
    searches++;
    return [{ x, y }];
  };
  geometry.wilderness = { actors: [{ id: 'marin-bear', combatKind: 'bear', x: 20, z: 20 }] };
  const game = await createGame({ geometry, store: createMemoryStore() }),
    a = await player(game, 48002);
  try {
    for (let i = 0; i < 100; i++) game.tick(0.05);
    assert.equal(searches, 0);
    const bear = game.shared.wilderness.actors[0];
    a.p.x = bear.x + 1;
    a.p.z = bear.z;
    game.shared.wilderness.strike(bear.id, {
      id: a.p.id,
      x: a.p.x,
      z: a.p.z,
      weapon: 'unarmed',
      level: 1,
    });
    game.tick(0.05);
    assert.ok(searches > 0);
  } finally {
    await game.close();
  }
});

test('RAM purchases commit only the affected account and survive disconnect/checkpoint/recovery', async () => {
  const storage = createMemoryStore(),
    manager = await createCheckpointManager({ store: storage }),
    ram = manager.openGame(),
    game = await createGame({ geometry: fixtureGeometry(), store: ram });
  manager.attach('world', { prepare: game.prepareCheckpoint, drain: game.close });
  const a = await player(game, 48003),
    b = await player(game, 48004),
    batches = [],
    batch = ram.batch;
  ram.batch = async (entries) => {
    batches.push(entries.map(([key]) => key));
    return batch(entries);
  };
  try {
    await command(game, a.p, 'buyGrapple');
    assert.equal(a.p.inventory.economy.state.coins, 20);
    assert.deepEqual(batches, [['player:' + a.p.owner]]);
    await game.disconnect(a.p);
    await a.p.queue;
    await game.actionQueue.drain();
    await manager.checkpoint('world');
    const recovered = await createCheckpointManager({ store: storage }),
      profile = await recovered.openGame().get('player:' + a.p.owner);
    assert.equal(profile.grapplingHook, true);
    assert.equal(JSON.parse(profile.privateState['sf-purse-v1']).coins, 20);
    assert.equal(b.p.inventory.economy.state.coins, 25);
  } finally {
    await manager.shutdown();
  }
});

test('crowded speech goes only to observers that can see the speaker, including instance boundaries', async () => {
  const game = await createGame({ geometry: fixtureGeometry(), store: createMemoryStore() }),
    crowd = [];
  try {
    for (let i = 0; i < 35; i++) crowd.push(await player(game, 49000 + i));
    game.broadcast();
    for (const a of crowd) a.messages.length = 0;
    const speaker = crowd.at(-1);
    game.receive(speaker.p, { type: 'say', text: 'yo' });
    await speaker.p.queue;
    assert.equal(speaker.messages.filter((m) => m.type === 'say').length, 1);
    for (const a of crowd.slice(0, -1))
      assert.equal(
        a.messages.filter((m) => m.type === 'say').length,
        Number(a.p.seen.has(speaker.p.id)),
      );
    crowd[1].p.instance = { kind: 'kraken', id: 'personal' };
    game.receive(crowd[0].p, { type: 'say', text: 'ok' });
    await crowd[0].p.queue;
    assert.equal(
      crowd[1].messages.some((m) => m.type === 'say' && m.id === crowd[0].p.id),
      false,
    );
  } finally {
    await game.close();
  }
});
