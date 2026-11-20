import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command, latestResult } from './fixtures.mjs';
import { MONSTER_STATS } from '../../monster-drops.js';

function geometry() {
  const g = fixtureGeometry();
  g.wilderness = {
    actors: [
      { id: 'outlaw', combatKind: 'outlaw', x: 94, z: 120 },
      { id: 'pirate', combatKind: 'lost-pirate', x: 106, z: 120 },
    ],
  };
  return g;
}

test('snow and ice giants acquire players within five tiles and attack without any client combat command', async () => {
  for (const [index, kind] of ['snow-giant', 'ice-giant'].entries()) {
    const g = fixtureGeometry();
    g.wilderness = { actors: [{ id: kind, combatKind: kind, x: 95, z: 120 }] };
    const game = await createGame({ geometry: g, store: createMemoryStore(), random: () => 0.5 }),
      a = await player(game, 760 + index),
      giant = game.shared.wilderness.actors[0];
    try {
      Object.assign(a.p, { x: giant.x + 5.1, z: giant.z });
      game.tick(0.01);
      assert.equal(giant.enemy, null);
      a.p.x = giant.x + 4.8;
      game.tick(0.05);
      assert.equal(giant.enemy, a.p.id);
      assert.ok(giant.motion > 0);
      for (let i = 0; i < 60; i++) game.tick(0.05);
      assert.ok(a.p.hp < 30);
      assert.ok(a.messages.some((m) => m.type === 'damage' && m.attacker === giant.id));
      a.p.x = giant.home.x + 13;
      game.tick(0.05);
      assert.equal(giant.enemy, null, 'running beyond the home leash releases aggression');
    } finally {
      await game.close();
    }
  }
});

test('server-driven aggression selects nearby eligible players and causes shared pursuit and damage without a client attack', async () => {
  const game = await createGame({
      geometry: geometry(),
      store: createMemoryStore(),
      random: () => 0.5,
    }),
    a = await player(game, 751),
    b = await player(game, 752),
    outlaw = game.shared.wilderness.actors[0];
  try {
    Object.assign(a.p, { x: outlaw.x + 5.1, z: outlaw.z });
    Object.assign(b.p, { x: outlaw.x + 0.5, z: outlaw.z, personalJailed: true });
    game.tick(0.01);
    assert.equal(outlaw.enemy, null, 'detained players cannot draw aggression');
    a.p.x = outlaw.x + 4.8;
    game.tick(0.05);
    assert.equal(outlaw.enemy, a.p.id);
    assert.ok(outlaw.motion > 0);
    for (let i = 0; i < 60; i++) game.tick(0.05);
    assert.ok(a.p.hp < 30);
    assert.ok(a.messages.some((m) => m.type === 'damage' && m.attacker === outlaw.id));
    assert.equal(b.p.hp, 30);
    a.p.x = outlaw.home.x + 30;
    game.tick(0.7);
    assert.equal(outlaw.enemy, null);
  } finally {
    await game.close();
  }
});

test('one shared defeat yields exact coins, a wearable rare hat and durable ownership, with cow-timed respawns across restarts', async () => {
  const store = createMemoryStore(),
    g = geometry(),
    game = await createGame({ geometry: g, store, random: () => 0 }),
    a = await player(game, 753),
    b = await player(game, 754);
  let restored;
  try {
    for (const creature of game.shared.wilderness.actors) {
      Object.assign(a.p, { x: creature.x - 1.2, z: creature.z, y: 1.15, shotAt: 0 });
      creature.hp = 1;
      await command(game, a.p, 'attack', { id: creature.id, weapon: 'railgun' });
      assert.equal(latestResult(a.messages).ok, true);
      assert.equal(creature.hp, 0);
      const drops = [...game.shared.loot.values()].filter(
          (l) => l.x === creature.x && l.z === creature.z,
        ),
        coin = drops.find((l) => l.lootKind === 'coins');
      assert.equal(coin.amount, creature.combatKind === 'outlaw' ? 10 : 8);
      Object.assign(b.p, { x: coin.x, z: coin.z, y: coin.base });
      await command(game, b.p, 'collect', { id: coin.id });
      assert.equal(latestResult(b.messages).ok, false, 'hunter owns the first claim');
      Object.assign(a.p, { x: coin.x, z: coin.z, y: coin.base });
      const before = a.p.inventory.economy.state.coins;
      await command(game, a.p, 'collect', { id: coin.id });
      assert.equal(latestResult(a.messages).ok, true);
      assert.equal(a.p.inventory.economy.state.coins, before + coin.amount);
      await command(game, a.p, 'collect', { id: coin.id });
      assert.equal(latestResult(a.messages).ok, false, 'coins cannot be collected twice');
      if (creature.combatKind === 'lost-pirate') {
        const hat = drops.find((l) => l.lootKind === 'hat');
        assert.equal(hat.hatId, 'pirate');
        await command(game, a.p, 'collect', { id: hat.id });
        assert.equal(latestResult(a.messages).ok, true);
        assert.ok(a.p.inventory.economy.state.ownedHats.includes('pirate'));
        game.receive(a.p, {
          type: 'checkpoint',
          inventoryEpoch: a.p.inventory.meta.epoch,
          privateState: { 'sf-character-v1': '{"hat":"pirate"}' },
        });
        await a.p.queue;
        assert.equal(a.p.appearance.hat, 'pirate');
      }
    }
    assert.equal(a.p.inventory.economy.state.coins, 43);
    game.tick(3);
    await game.flush();
    const profile = await store.get('player:' + a.p.owner);
    assert.ok(JSON.parse(profile.privateState['sf-purse-v1']).ownedHats.includes('pirate'));
    for (const n of (await store.get('world')).shared.wilderness)
      assert.equal(n.respawn, MONSTER_STATS.cow.respawn - 3);
    await game.close();
    restored = await createGame({ geometry: geometry(), store, random: () => 0.5 });
    for (const n of restored.shared.wilderness.actors) assert.equal(n.hp, 0);
    restored.tick(6.9);
    for (const n of restored.shared.wilderness.actors) assert.equal(n.hp, 0);
    restored.tick(0.11);
    for (const n of restored.shared.wilderness.actors) {
      assert.equal(n.hp, n.max);
      assert.deepEqual({ x: n.x, z: n.z }, n.home);
    }
  } finally {
    await restored?.close();
    await game.close();
  }
});

test('pirate-hat purchasing and cosmetic claims cannot bypass the server-owned drop', async () => {
  const g = geometry();
  g.merchants = [{ id: 'hatter', kind: 'haberdasher', x: 92.2, z: 120 }];
  const game = await createGame({ geometry: g, store: createMemoryStore() }),
    a = await player(game, 755);
  try {
    await command(game, a.p, 'inventory', { op: 'buyHat', id: 'pirate' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, 25);
    game.receive(a.p, {
      type: 'checkpoint',
      inventoryEpoch: a.p.inventory.meta.epoch,
      privateState: { 'sf-character-v1': '{"hat":"pirate"}' },
    });
    await a.p.queue;
    assert.equal(a.p.appearance.hat, 'none');
    assert.deepEqual(a.p.inventory.economy.state.ownedHats, []);
  } finally {
    await game.close();
  }
});

test('Landshark combat, Stetson and peptide loot are shared, authoritative, collectible and persistent', async () => {
  const g = fixtureGeometry();
  g.wilderness = { actors: [{ id: 'landshark', combatKind: 'landshark', x: 94, z: 120 }] };
  const store = createMemoryStore();
  let time = 1000000,
    game = await createGame({ geometry: g, store, random: () => 0, now: () => time });
  try {
    const a = await player(game, 756),
      b = await player(game, 757),
      shark = game.shared.wilderness.actors[0];
    assert.equal(shark.level, 10);
    assert.equal(shark.hp, 45);
    game.receive(a.p, {
      type: 'checkpoint',
      inventoryEpoch: a.p.inventory.meta.epoch,
      privateState: { 'sf-character-v1': '{"hat":"stetson"}' },
    });
    await a.p.queue;
    assert.equal(a.p.appearance.hat, 'none', 'a cosmetic claim cannot invent the drop');
    shark.hp = 1;
    Object.assign(a.p, { x: shark.x + 4.8, z: shark.z });
    await command(game, a.p, 'attack', { id: shark.id, weapon: 'railgun' });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(shark.hp, 0);
    assert.ok(b.messages.some((m) => m.type === 'sharedHit' && m.target === shark.id));
    const loot = [...game.shared.loot.values()];
    assert.deepEqual(
      loot.map((d) => d.lootKind),
      ['coins', 'hat', 'peptides'],
    );
    const hat = loot.find((d) => d.lootKind === 'hat');
    assert.equal(hat.hatId, 'stetson');
    Object.assign(a.p, { x: hat.x, z: hat.z });
    Object.assign(b.p, { x: hat.x, z: hat.z });
    await command(game, b.p, 'collect', { id: hat.id });
    assert.equal(
      latestResult(b.messages).ok,
      false,
      'the other player cannot steal the fresh drop',
    );
    for (const drop of loot) {
      await command(game, a.p, 'collect', { id: drop.id });
      assert.equal(latestResult(a.messages).ok, true);
    }
    assert.equal(a.p.inventory.economy.state.coins, 29);
    assert.equal(a.p.inventory.meta.peptides, 1);
    assert.ok(a.p.inventory.economy.state.ownedHats.includes('stetson'));
    await command(game, a.p, 'collect', { id: hat.id });
    assert.equal(latestResult(a.messages).ok, false);
    time += 1000;
    game.receive(a.p, {
      type: 'checkpoint',
      inventoryEpoch: a.p.inventory.meta.epoch,
      privateState: { 'sf-character-v1': '{"hat":"stetson"}' },
    });
    await a.p.queue;
    assert.equal(a.p.appearance.hat, 'stetson');
    await game.close();
    game = await createGame({ geometry: g, store, random: () => 0.5 });
    const returning = await player(game, 756);
    assert.equal(returning.p.appearance.hat, 'stetson');
    assert.equal(returning.p.inventory.meta.peptides, 1);
    assert.equal(game.shared.wilderness.actors[0].hp, 0);
    game.tick(10);
    assert.equal(game.shared.wilderness.actors[0].hp, 45);
  } finally {
    await game.close();
  }
});
