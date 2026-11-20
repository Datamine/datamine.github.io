import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command, latestResult } from './fixtures.mjs';
import { rollMonsterDrops } from '../../monster-drops.js';
import { COLLECTION_ITEMS } from '../../config/collection.js';

test('outlaw card has an independent one-in-five roll and preserves the guaranteed ten coins', () => {
  for (const [random, drops] of [
    [0, true],
    [0.2 - Number.EPSILON, true],
    [0.2, false],
    [0.99999, false],
  ]) {
    const loot = rollMonsterDrops('outlaw', () => random);
    assert.equal(loot.find((d) => d.lootKind === 'coins').amount, 10);
    assert.equal(
      loot.some((d) => d.lootKind === 'goose-membership-card'),
      drops,
    );
  }
  assert.equal(
    COLLECTION_ITEMS.some((i) => i.id === 'goose-membership-card'),
    false,
    'a disintegrating card is not a permanently unfinishable collection slot',
  );
});

test('a shared outlaw card obeys loot claims, disintegrates exactly once, and never enters saved inventory', async () => {
  const geometry = fixtureGeometry();
  geometry.wilderness = { actors: [{ id: 'outlaw', combatKind: 'outlaw', x: 94, z: 120 }] };
  const store = createMemoryStore(),
    game = await createGame({ geometry, store, random: () => 0 }),
    a = await player(game, 8101),
    b = await player(game, 8102);
  try {
    const outlaw = game.shared.wilderness.actors[0];
    outlaw.hp = 1;
    Object.assign(a.p, { x: outlaw.x - 1.2, z: outlaw.z, y: 1.15 });
    await command(game, a.p, 'attack', { id: outlaw.id, weapon: 'railgun' });
    assert.equal(outlaw.hp, 0);
    const card = [...game.shared.loot.values()].find((i) => i.lootKind === 'goose-membership-card');
    assert.ok(card);
    assert.equal(card.label, 'Goose Corp membership card');
    Object.assign(b.p, { x: card.x, z: card.z, y: card.base });
    await command(game, b.p, 'collect', { id: card.id });
    assert.equal(latestResult(b.messages).ok, false);
    assert.ok(game.shared.loot.has(card.id));
    const inventory = a.p.inventory.snapshot(),
      awards = structuredClone(a.p.profile.awards);
    Object.assign(a.p, { x: card.x, z: card.z, y: card.base });
    await command(game, a.p, 'collect', { id: card.id });
    const result = latestResult(a.messages);
    assert.equal(result.ok, true);
    assert.match(result.message, /disintegrates in your hands/);
    assert.equal(result.award, undefined);
    assert.equal(game.shared.loot.has(card.id), false);
    assert.deepEqual(a.p.inventory.snapshot(), inventory);
    assert.deepEqual(a.p.profile.awards, awards);
    await command(game, a.p, 'collect', { id: card.id });
    assert.equal(latestResult(a.messages).ok, false, 'a vanished card cannot be picked up twice');
    await game.flush();
    const saved = await store.get('world');
    assert.equal(
      saved.shared.loot.some((i) => i.id === card.id),
      false,
    );
    assert.doesNotMatch(
      JSON.stringify((await store.get('player:' + a.p.owner)).inventory),
      /goose-membership-card/,
    );
  } finally {
    await game.close();
  }
});
