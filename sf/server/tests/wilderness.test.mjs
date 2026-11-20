import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, latestResult } from './fixtures.mjs';
import { TAHOE, TAHOE_TREES, TAHOE_COMBAT_TRUNKS, createTahoe, tahoeHeight } from '../../tahoe.js';
import { wildernessSpawns } from '../../wilderness.js';
import { combatLineClear } from '../../combat-navigation.js';

async function setup(random = () => 0) {
  let time = 1000000;
  const geometry = fixtureGeometry();
  geometry.wilderness = {
    actors: [
      { id: 'test-bear', combatKind: 'bear', x: 92.7, z: 120 },
      { id: 'test-giant', combatKind: 'ice-giant', x: 94, z: 120 },
    ],
  };
  geometry.merchants = [
    { id: 'industrial-armorer', x: 92.2, z: 120 },
    { id: 'in-n-out-clerk', x: 92.2, z: 120 },
  ];
  const store = createMemoryStore(),
    game = await createGame({ geometry, store, now: () => time, random });
  return { game, store, advance: (ms) => (time += ms) };
}
async function act(game, p, action, args = {}, privateState) {
  game.receive(p.p, {
    type: 'command',
    request: Math.random(),
    action,
    args,
    privateState,
    inventoryEpoch: p.p.inventory.meta.epoch,
  });
  await p.p.queue;
  return latestResult(p.messages);
}
test('the authoritative server accepts five-tile shots on Tahoe slopes and tree safespots without moving the player', async () => {
  const tahoe = createTahoe(),
    geometry = fixtureGeometry(),
    spawn = wildernessSpawns({ marin: { x: 0, y: 0 }, tahoe: TAHOE.base })[1];
  Object.assign(geometry, {
    wilderness: { actors: [spawn] },
    spawn: { x: spawn.x + 4.5, y: spawn.z - 0.5 },
    characterGround: tahoeHeight,
    landClearAt: (x, y) => tahoe.walkable(x + 0.5, y + 0.5),
    canTravel: (ax, az, bx, bz) => tahoe.segment({ x: ax, y: az }, { x: bx, y: bz }),
    pathTo: (x, y, from) => tahoe.path(from, { x, y }),
    lineClear: (a, b) => combatLineClear(a, b, TAHOE_COMBAT_TRUNKS, tahoeHeight),
  });
  const game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 }),
    a = await player(game, 721),
    giant = game.shared.wilderness.actors[0];
  try {
    const before = { x: a.p.x, z: a.p.z };
    assert.ok(Math.abs(a.p.y - giant.base) > 3);
    assert.equal((await act(game, a, 'attack', { id: giant.id, weapon: 'railgun' })).ok, true);
    assert.ok(giant.hp < giant.max);
    assert.deepEqual({ x: a.p.x, z: a.p.z }, before);
    a.p.x = giant.x + 5.02;
    a.p.y = tahoeHeight(a.p.x, a.p.z);
    a.p.shotAt = 0;
    assert.equal(
      (await act(game, a, 'attack', { id: giant.id, weapon: 'railgun' })).ok,
      false,
      'five-tile range is still enforced',
    );
    const tree = TAHOE_TREES.find(
      (p) => Math.abs(p.x - TAHOE.base.x + 13) < 0.1 && Math.abs(p.z - TAHOE.base.z + 7) < 0.1,
    );
    Object.assign(giant, {
      x: tree.x - 2,
      z: tree.z + 0.6,
      base: tahoeHeight(tree.x - 2, tree.z + 0.6),
      hp: giant.max,
    });
    Object.assign(a.p, {
      x: tree.x + 2,
      z: tree.z + 0.6,
      y: tahoeHeight(tree.x + 2, tree.z + 0.6),
      hp: 30,
      shotAt: 0,
    });
    assert.equal((await act(game, a, 'attack', { id: giant.id, weapon: 'railgun' })).ok, true);
    for (let i = 0; i < 160; i++) game.tick(0.05);
    assert.equal(a.p.hp, a.p.max);
    assert.ok(giant.hp < giant.max && giant.hp > 0);
    assert.ok(giant.x < tree.x - 0.4);
    assert.ok(Math.hypot(giant.x - a.p.x, giant.z - a.p.z) > 2);
    assert.ok(
      a.messages.filter((m) => m.type === 'sharedHit' && m.target === giant.id).length >= 8,
      'the server keeps applying repeated ranged attacks while the giant is trapped',
    );
  } finally {
    await game.close();
  }
});
test('shared bear kill has one peptide roll, a first-claim owner and durable collection', async () => {
  const { game, store } = await setup(),
    a = await player(game, 701),
    b = await player(game, 702);
  const bear = game.shared.wilderness.actors[0];
  a.p.x = bear.x - 1.2;
  assert.equal((await act(game, a, 'petBear', { id: bear.id })).ok, true);
  assert.equal(bear.enemy, null);
  assert.equal((await act(game, a, 'attack', { id: bear.id, weapon: 'railgun' })).ok, true);
  for (let i = 0; bear.hp && i < 20; i++) game.tick(0.8);
  assert.equal(bear.hp, 0);
  assert.equal(game.shared.loot.size, 1);
  const loot = [...game.shared.loot.values()][0];
  assert.equal(loot.lootKind, 'peptides');
  assert.equal((await act(game, b, 'collect', { id: loot.id })).ok, false);
  assert.equal((await act(game, a, 'collect', { id: loot.id })).ok, true);
  assert.equal(a.p.inventory.meta.peptides, 1);
  assert.equal((await act(game, a, 'collect', { id: loot.id })).ok, false);
  await game.flush();
  assert.equal((await store.get('player:' + a.p.owner)).inventory.peptides, 1);
  await game.close();
});
test('the server rejects petting on the bear tile and authorizes a facing pet gesture only from beside it', async () => {
  const { game } = await setup(),
    a = await player(game, 720),
    bear = game.shared.wilderness.actors[0];
  try {
    Object.assign(a.p, { x: bear.x, z: bear.z });
    assert.equal((await act(game, a, 'petBear', { id: bear.id })).ok, false);
    assert.equal(bear.affection, 0);
    Object.assign(a.p, { x: bear.x - 1.2, z: bear.z });
    assert.equal((await act(game, a, 'moveTo', { x: a.p.x - 5, z: a.p.z })).ok, true);
    assert.equal((await act(game, a, 'petBear', { id: bear.id })).ok, true);
    assert.equal(a.p.gesture, 'pet-bear');
    assert.equal(a.p.angle, 0);
    assert.equal(bear.angle, Math.PI);
    assert.equal(bear.motion, 0);
    const before = { x: bear.x, z: bear.z },
      person = { x: a.p.x, z: a.p.z };
    game.tick(0.3);
    assert.deepEqual({ x: bear.x, z: bear.z }, before, 'the bear pauses while being petted');
    assert.deepEqual({ x: a.p.x, z: a.p.z }, person, 'petting stops an existing walking route');
  } finally {
    await game.close();
  }
});
test('giants are shared, retaliate, persist HP and drop equippable ice items only once', async () => {
  const { game, store } = await setup(),
    a = await player(game, 703),
    b = await player(game, 704);
  const giant = game.shared.wilderness.actors[1];
  Object.assign(a.p, { x: 93.8, z: 120 });
  assert.equal(
    (await act(game, a, 'attack', { id: giant.id, weapon: 'battleaxe' })).ok,
    false,
    'unowned weapon is rejected',
  );
  assert.equal((await act(game, a, 'attack', { id: giant.id, weapon: 'railgun' })).ok, true);
  game.tick(0.8);
  assert.ok(a.p.hp < 30);
  assert.ok(b.messages.some((m) => m.type === 'sharedHit' && m.target === giant.id));
  await game.flush();
  assert.ok((await store.get('world')).shared.wilderness.find((n) => n.id === giant.id).hp < 180);
  // Finish a nearly defeated giant without allowing retaliation to kill the tester.
  giant.hp = 1;
  a.p.shotAt = 0;
  assert.equal((await act(game, a, 'attack', { id: giant.id, weapon: 'railgun' })).ok, true);
  const loot = [...game.shared.loot.values()].find((l) => l.lootKind === 'equipment');
  assert.equal(loot.itemId, 'ice-top');
  Object.assign(a.p, { x: loot.x, z: loot.z, y: loot.base });
  assert.equal((await act(game, a, 'collect', { id: loot.id })).ok, true);
  assert.ok(a.p.inventory.economy.state.ownedEquipment.includes('ice-top'));
  assert.equal((await act(game, b, 'attack', { id: giant.id })).ok, false);
  await game.close();
});
test('battleaxe is quest/proximity gated, costs 50 exactly once, and cannot be forged by checkpoints', async () => {
  const { game } = await setup(),
    a = await player(game, 705, { 'sf-purse-v1': '{"coins":200}' });
  assert.equal((await act(game, a, 'buyBattleaxe')).ok, false);
  const quest = { 'sf-quests-v1': '{"theyLive":{"completed":true,"bayonet":true}}' };
  a.p.x += 10;
  assert.equal((await act(game, a, 'buyBattleaxe', {}, quest)).ok, false);
  a.p.x -= 10;
  assert.equal(
    (await act(game, a, 'buyBattleaxe', {}, quest)).ok,
    false,
    'client quest claims cannot unlock equipment',
  );
  a.p.profile.privateState['sf-quests-v1'] = quest['sf-quests-v1'];
  assert.equal((await act(game, a, 'buyBattleaxe')).ok, true);
  assert.equal(a.p.inventory.economy.state.coins, 150);
  assert.equal((await act(game, a, 'buyBattleaxe')).ok, false);
  game.receive(a.p, {
    type: 'checkpoint',
    privateState: { 'sf-purse-v1': '{"coins":999,"ownedEquipment":["ice-top"]}' },
  });
  await a.p.queue;
  assert.deepEqual(a.p.inventory.economy.state.ownedEquipment, ['battleaxe']);
  await game.close();
});
test('In-N-Out pickup gives the food ledger a sandwich for two coins, requiring the counter', async () => {
  const { game } = await setup(),
    a = await player(game, 706, { 'sf-purse-v1': '{"coins":5}' });
  assert.equal((await act(game, a, 'inventory', { op: 'pickup', store: 'in-n-out' })).ok, true);
  assert.equal(a.p.inventory.economy.state.coins, 3);
  assert.equal(a.p.inventory.meta.sandwiches, 1);
  a.p.x += 10;
  assert.equal((await act(game, a, 'inventory', { op: 'pickup', store: 'in-n-out' })).ok, false);
  assert.equal(a.p.inventory.economy.state.coins, 3);
  await game.close();
});

test('saved monsters relocate when their authored spawn moves, retaining hitpoints and respawn progress', async () => {
  const store = createMemoryStore(),
    geometry = fixtureGeometry();
  geometry.wilderness = { actors: [{ id: 'moved-giant', combatKind: 'ice-giant', x: 94, z: 120 }] };
  await store.batch([
    [
      'world',
      {
        shared: {
          wilderness: [
            {
              id: 'moved-giant',
              x: 104,
              z: 120,
              base: 1.15,
              home: { x: 104, z: 120 },
              hp: 83,
              max: 180,
              respawn: 7,
              enemy: 99,
            },
          ],
        },
      },
    ],
  ]);
  const game = await createGame({ geometry, store });
  try {
    const giant = game.shared.wilderness.actors[0];
    assert.equal(giant.x, 94);
    assert.equal(giant.z, 120);
    assert.deepEqual(giant.home, { x: 94, z: 120 });
    assert.equal(giant.hp, 83);
    assert.equal(giant.respawn, 7);
    assert.equal(giant.enemy, null);
    await game.flush();
    assert.deepEqual((await store.get('world')).shared.wilderness[0].home, { x: 94, z: 120 });
  } finally {
    await game.close();
  }
});

test('saved landsharks adopt level-ten stats and the smaller territory without reviving dead encounters', async () => {
  const geometry = fixtureGeometry();
  geometry.wilderness = { actors: [{ id: 'landshark', combatKind: 'landshark', x: 94, z: 120 }] };
  const store = createMemoryStore();
  await store.batch([
    [
      'world',
      {
        shared: {
          wilderness: [
            {
              id: 'landshark',
              combatKind: 'landshark',
              level: 20,
              hp: 110,
              max: 110,
              x: 99,
              z: 120,
              home: { x: 94, z: 120 },
              respawn: 0,
            },
          ],
        },
      },
    ],
  ]);
  let game = await createGame({ geometry, store });
  try {
    const actor = game.shared.wilderness.actors[0];
    assert.equal(actor.level, 10);
    assert.equal(actor.hp, 45);
    assert.equal(actor.max, 45);
    assert.deepEqual({ x: actor.x, z: actor.z }, actor.home);
    actor.hp = 0;
    actor.respawn = 4;
    await game.close();
    game = await createGame({ geometry, store });
    assert.equal(game.shared.wilderness.actors[0].hp, 0);
    assert.equal(game.shared.wilderness.actors[0].respawn, 4);
  } finally {
    await game.close();
  }
});
