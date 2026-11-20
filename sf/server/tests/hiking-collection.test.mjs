import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command as gameCommand, latestResult } from './fixtures.mjs';

async function command(game, p, action, args) {
  if (action !== 'inventory') return gameCommand(game, p, action, args);
  game.receive(p, {
    type: 'command',
    request: Math.random(),
    action,
    args,
    inventoryEpoch: p.inventory.meta.epoch,
  });
  await p.queue;
}

async function setup() {
  let time = 1000000;
  const geometry = fixtureGeometry();
  geometry.merchants = [
    { id: 'hiking-supplier', kind: 'hiking-supplier', x: 92.2, z: 120, base: 1.15 },
    { id: 'deli', kind: 'deli', x: 92.2, z: 120 },
    { id: 'mazarine-clerk', neighborhoodService: 'mazarine', x: 92.2, z: 120 },
  ];
  const store = createMemoryStore(),
    game = await createGame({ geometry, store, now: () => time });
  return { game, store, geometry, advance: (ms) => (time += ms) };
}
test('five-sandwich capacity covers purchases and loot; the 100-coin backpack raises it to twenty', async () => {
  const f = await setup();
  try {
    const a = await player(f.game, 56001, { 'sf-purse-v1': '{"coins":500}' });
    for (let i = 0; i < 5; i++) {
      await command(f.game, a.p, 'inventory', { op: 'pickup' });
      assert.equal(latestResult(a.messages).ok, true);
    }
    const before = a.p.inventory.economy.state.coins;
    await command(f.game, a.p, 'inventory', { op: 'pickup' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, before);
    assert.equal(a.p.inventory.receive({ lootKind: 'sandwich', amount: 1 }).ok, false);
    a.p.x += 30;
    await command(f.game, a.p, 'inventory', { op: 'buyBackpack' });
    assert.equal(latestResult(a.messages).ok, false);
    a.p.x -= 30;
    await command(f.game, a.p, 'inventory', { op: 'buyBackpack' });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.inventory.economy.state.coins, before - 100);
    assert.equal(a.p.inventory.snapshot().capacity, 20);
    await command(f.game, a.p, 'inventory', { op: 'buyBackpack' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, before - 100);
    assert.equal(a.p.inventory.receive({ lootKind: 'sandwich', amount: 15 }).ok, true);
    assert.equal(a.p.inventory.meta.sandwiches, 20);
    assert.equal(a.p.inventory.receive({ lootKind: 'sandwich', amount: 1 }).ok, false);
    await command(f.game, a.p, 'inventory', { op: 'order' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, before - 100);
    const found = a.p.inventory.snapshot().collection;
    assert.ok(found.includes('sandwich') && found.includes('backpack'));
    a.p.inventory.meta.sandwiches = 0;
    a.p.inventory.save();
    assert.ok(a.p.inventory.snapshot().collection.includes('sandwich'));
    await f.game.flush();
    assert.ok((await f.store.get('player:' + a.p.owner)).collection.includes('backpack'));
  } finally {
    await f.game.close();
  }
});
test('a pending delivery reserves its sandwich slot so ground loot cannot overfill the bag', async () => {
  const f = await setup();
  try {
    const a = await player(f.game, 56002);
    a.p.inventory.receive({ lootKind: 'sandwich', amount: 4 });
    await command(f.game, a.p, 'inventory', { op: 'order' });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.inventory.meta.deliveryPending, true);
    assert.equal(a.p.inventory.receive({ lootKind: 'sandwich', amount: 1 }).ok, false);
  } finally {
    await f.game.close();
  }
});
test('Mazarine sweeping pays one coin, animates work, and retains its three-minute cooldown after restart', async () => {
  const f = await setup();
  let game = f.game;
  try {
    const a = await player(game, 56003);
    await command(game, a.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'mazarine-clerk',
      offer: 'sweep',
    });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.inventory.economy.state.coins, 26);
    assert.equal(a.p.gesture, 'work');
    await command(game, a.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'mazarine-clerk',
      offer: 'sweep',
    });
    assert.equal(latestResult(a.messages).ok, false);
    await game.close();
    game = await createGame({ geometry: f.geometry, store: f.store, now: () => 1000000 });
    const b = await player(game, 56003);
    await command(game, b.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'mazarine-clerk',
      offer: 'sweep',
    });
    assert.equal(latestResult(b.messages).ok, false);
    await game.close();
    game = await createGame({ geometry: f.geometry, store: f.store, now: () => 1180000 });
    const c = await player(game, 56003);
    await command(game, c.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'mazarine-clerk',
      offer: 'sweep',
    });
    assert.equal(latestResult(c.messages).ok, true);
    assert.equal(c.p.inventory.economy.state.coins, 27);
  } finally {
    await game.close();
  }
});
