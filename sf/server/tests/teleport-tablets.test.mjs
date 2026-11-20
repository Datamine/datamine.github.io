import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, latestResult } from './fixtures.mjs';

async function setup() {
  let time = 1000000;
  const geometry = fixtureGeometry();
  geometry.merchants = [{ id: 'tablet-wizard', x: 92.2, z: 120, base: 1.15 }];
  geometry.tabletDestinations = {
    downtown: { x: 75, y: 1.15, z: 40 },
    tahoe: { x: 150, y: 1.15, z: -50 },
  };
  const store = createMemoryStore(),
    game = await createGame({ geometry, store, now: () => time });
  return { game, store, advance: (ms) => (time += ms) };
}
async function act(game, a, action, args = {}, epoch = a.p.inventory.meta.epoch) {
  game.receive(a.p, {
    type: 'command',
    request: Math.random(),
    action,
    args,
    inventoryEpoch: epoch,
  });
  await a.p.queue;
  return latestResult(a.messages);
}
test('wizard validates proximity, destination and epoch, charges 20 exactly and durably consumes a tablet', async () => {
  const { game, store, advance } = await setup(),
    a = await player(game, 820, {
      'sf-purse-v1': '{"coins":45,"iphoneOwned":true,"iphoneEquipped":true}',
    });
  try {
    a.p.x += 10;
    assert.equal((await act(game, a, 'buyTablet', { destination: 'tahoe' })).ok, false);
    a.p.x -= 10;
    assert.equal((await act(game, a, 'buyTablet', { destination: 'elsewhere' })).ok, false);
    assert.equal((await act(game, a, 'buyTablet', { destination: 'tahoe' }, -1)).ok, false);
    assert.equal((await act(game, a, 'buyTablet', { destination: 'tahoe' })).ok, true);
    assert.equal(a.p.inventory.economy.state.coins, 25);
    assert.equal(a.p.inventory.snapshot().tablets.tahoe, 1);
    assert.equal((await act(game, a, 'buyTablet', { destination: 'downtown' })).ok, true);
    assert.equal(a.p.inventory.economy.state.coins, 5);
    assert.equal((await act(game, a, 'buyTablet', { destination: 'downtown' })).ok, false);
    assert.equal(
      (await act(game, a, 'useTablet', { destination: 'tahoe', x: 999, z: 999 })).ok,
      true,
    );
    assert.equal(a.p.mode, 'teleport');
    assert.equal(a.p.inventory.meta.tablets.tahoe, 0);
    assert.equal((await act(game, a, 'useTablet', { destination: 'downtown' })).ok, false);
    assert.equal((await act(game, a, 'instanceEnter', { kind: 'kraken' })).ok, false);
    const before = a.p.x;
    game.receive(a.p, {
      type: 'pose',
      pose: { x: 999, y: 1.15, z: 999, angle: 0, phase: 0, motion: 0, mode: 'walk' },
    });
    assert.equal(a.p.x, before);
    advance(1000);
    game.tick();
    assert.ok(a.p.y > 1.15);
    advance(1900);
    game.tick();
    assert.equal(a.p.x, 150);
    assert.equal(a.p.z, -50);
    assert.equal(a.p.y, 1.15);
    assert.equal(a.p.mode, 'walk');
    assert.ok(a.messages.some((m) => m.type === 'tabletArrived'));
    await game.flush();
    assert.equal((await store.get('player:' + a.p.owner)).inventory.tablets.tahoe, 0);
    assert.equal((await store.get('player:' + a.p.owner)).inventory.tablets.downtown, 1);
  } finally {
    await game.close();
  }
});
test('jail, private instances, vehicles and spoofed teleport poses cannot bypass tablet requirements', async () => {
  const { game } = await setup(),
    a = await player(game, 821);
  try {
    await act(game, a, 'buyTablet', { destination: 'downtown' });
    for (const fields of [
      { personalJailed: true },
      { instance: { kind: 'kraken' } },
      { mode: 'ferrari' },
      { airship: true },
      { hp: 0 },
    ]) {
      const before = {};
      for (const k of Object.keys(fields)) before[k] = a.p[k];
      Object.assign(a.p, fields);
      assert.equal((await act(game, a, 'useTablet', { destination: 'downtown' })).ok, false);
      Object.assign(a.p, before);
    }
    assert.equal(a.p.inventory.meta.tablets.downtown, 1);
    const from = a.p.x;
    game.receive(a.p, {
      type: 'pose',
      pose: { x: 110, y: 1.15, z: 110, angle: 0, phase: 0, motion: 0, mode: 'teleport' },
    });
    assert.equal(a.p.x, from);
    assert.equal(a.p.mode, 'walk');
  } finally {
    await game.close();
  }
});
test('disconnect during teleport saves a safe arrival and does not refund the consumed tablet', async () => {
  const { game, store } = await setup(),
    a = await player(game, 822);
  try {
    await act(game, a, 'buyTablet', { destination: 'tahoe' });
    await act(game, a, 'useTablet', { destination: 'tahoe' });
    game.disconnect(a.p);
    await game.flush();
    const profile = await store.get('player:' + a.p.owner);
    assert.equal(profile.position.x, 150);
    assert.equal(profile.position.z, -50);
    assert.equal(profile.inventory.tablets.tahoe, 0);
  } finally {
    await game.close();
  }
});
