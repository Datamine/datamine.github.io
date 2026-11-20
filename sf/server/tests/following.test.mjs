import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, latestResult } from './fixtures.mjs';
import { decodePlayerFrame } from '../../multiplayer-protocol.js';
async function setup(geometry = fixtureGeometry()) {
  let time = 1000000;
  const game = await createGame({
    geometry,
    store: createMemoryStore(),
    now: () => time,
    random: () => 0.5,
    allowDebug: true,
  });
  return { game, advance: (ms) => (time += ms) };
}
async function act(game, a, action, args = {}) {
  game.receive(a.p, {
    type: 'command',
    request: Math.random(),
    action,
    args,
    inventoryEpoch: a.p.inventory.meta.epoch,
  });
  await a.p.queue;
  return latestResult(a.messages);
}
function idlePose(p) {
  return { x: p.x, y: p.y, z: p.z, angle: 0, phase: 0, motion: 0, mode: 'walk', hp: p.hp };
}
test('following advances on server ticks with no follower poses, continues through leader turns and publishes the walking phase to both players', async () => {
  const { game, advance } = await setup(),
    a = await player(game, 901),
    b = await player(game, 902);
  b.p.x += 7;
  try {
    assert.equal((await act(game, a, 'followPlayer', { id: b.p.id })).ok, true);
    const start = a.p.x;
    for (let i = 0; i < 20; i++) {
      advance(50);
      game.tick(0.05);
    }
    assert.ok(a.p.x > start + 4);
    assert.ok(a.p.moving);
    assert.ok(a.p.phase > 0);
    game.broadcast();
    for (const observer of [a, b]) {
      const frame = decodePlayerFrame(
          observer.messages.filter((m) => m instanceof ArrayBuffer).at(-1),
        ),
        follower = frame.players.find((p) => p.id === a.p.id);
      assert.ok(follower);
      assert.ok(follower.moving);
      assert.ok(follower.phase > 0);
    }
    b.p.z += 7;
    for (let i = 0; i < 50; i++) {
      advance(50);
      game.tick(0.05);
    }
    assert.ok(Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z) <= 1.3);
    assert.equal(a.p.following, b.p.id);
    const stale = { ...idlePose(a.p), x: start };
    game.receive(a.p, { type: 'pose', pose: stale });
    assert.notEqual(
      a.p.x,
      start,
      'a throttled or stale browser pose cannot overwrite authoritative following',
    );
    await act(game, a, 'stopFollowing');
    const stopped = { x: a.p.x, z: a.p.z };
    b.p.x += 4;
    for (let i = 0; i < 20; i++) game.tick(0.05);
    assert.deepEqual({ x: a.p.x, z: a.p.z }, stopped);
    assert.equal(a.p.following, null);
  } finally {
    await game.close();
  }
});
test('following respects obstacles, guild admission, disconnects, map instances and transport modes', async () => {
  const geometry = fixtureGeometry();
  let blocked = false;
  geometry.canTravel = () => !blocked;
  geometry.lineClear = () => assert.fail('ordinary following must not trace weapon rays');
  const { game } = await setup(geometry),
    a = await player(game, 903),
    b = await player(game, 904);
  b.p.x += 5;
  try {
    assert.equal((await act(game, a, 'followPlayer', { id: a.p.id })).ok, false);
    b.p.instance = { kind: 'kraken', id: 'private-b' };
    assert.equal((await act(game, a, 'followPlayer', { id: b.p.id })).ok, false);
    b.p.instance = { kind: 'world' };
    assert.equal((await act(game, a, 'followPlayer', { id: b.p.id })).ok, true);
    blocked = true;
    const x = a.p.x;
    game.tick(0.05);
    assert.equal(a.p.x, x);
    assert.equal(a.p.following, null);
    blocked = false;
    await act(game, a, 'followPlayer', { id: b.p.id });
    game.tick(0.05);
    const beforeRevision = a.p.x;
    blocked = true;
    geometry.navigationRevision = 1;
    game.tick(0.05);
    assert.equal(
      a.p.x,
      beforeRevision,
      'a changed tile graph must invalidate the route-edge cache',
    );
    assert.equal(a.p.following, null);
    blocked = false;
    await act(game, a, 'followPlayer', { id: b.p.id });
    b.p.mode = 'airship';
    game.tick();
    assert.equal(a.p.following, null);
    b.p.mode = 'walk';
    await act(game, a, 'followPlayer', { id: b.p.id });
    game.disconnect(b.p);
    game.tick();
    assert.equal(a.p.following, null);
  } finally {
    await game.close();
  }
});
test('server chase-to-attack continues to approach and fight without a focused client', async () => {
  const { game, advance } = await setup(),
    gear = {
      'sf-character-v1': '{"weapon":"bayonet"}',
      'sf-quests-v1': '{"theyLive":{"bayonet":true}}',
    },
    a = await player(game, 905, gear),
    b = await player(game, 906);
  b.p.x += 6;
  try {
    assert.equal((await act(game, a, 'followPlayer', { id: b.p.id, attack: true })).ok, false);
    await act(game, a, 'pvp', { enabled: true });
    await act(game, b, 'pvp', { enabled: true });
    assert.equal((await act(game, a, 'followPlayer', { id: b.p.id, attack: true })).ok, true);
    for (let i = 0; i < 35 && b.p.hp === 30; i++) {
      advance(50);
      game.tick(0.05);
    }
    assert.ok(b.p.hp < 30);
    assert.ok(a.p.x > b.p.x - 2);
    await act(game, a, 'personalTransit', { kind: 'jail' });
    assert.equal(a.p.following, null);
  } finally {
    await game.close();
  }
});
test('following never routes through members-only grounds and path planning stays bounded', async () => {
  const geometry = fixtureGeometry();
  let plans = 0;
  geometry.pathTo = (x, y) => {
    plans++;
    return [{ x, y }];
  };
  geometry.places = [{ id: 'freemasons-guild', x: 95, y: 118, w: 4, d: 4 }];
  const { game, advance } = await setup(geometry),
    a = await player(game, 907),
    b = await player(game, 908);
  b.p.x = 98;
  try {
    await act(game, a, 'followPlayer', { id: b.p.id });
    for (let i = 0; i < 100; i++) {
      advance(50);
      game.tick(0.05);
    }
    assert.ok(a.p.x < 95.05);
    assert.equal(a.p.following, null);
    assert.ok(plans <= 2, 'a stationary leader must not trigger repeated pathfinding');
  } finally {
    await game.close();
  }
});
