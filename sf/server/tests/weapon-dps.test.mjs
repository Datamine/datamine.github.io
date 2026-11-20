import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command, latestResult } from './fixtures.mjs';
import { ITEM_STATS } from '../../item-stats.js';
import { rollWeaponDamage } from '../../combat.js';
import { strengthStatus, STRENGTH_THRESHOLDS } from '../../strength.js';

test('the authoritative attack loop honors each weapon interval and Strength Level without tick-rounding DPS loss', async () => {
  let serial = 41000;
  for (const level of [1, 5, 10, 25, 50])
    for (const weapon of ['unarmed', 'bayonet', 'battleaxe', 'railgun', 'akibo']) {
      const game = await createGame({
        geometry: fixtureGeometry(),
        store: createMemoryStore(),
        random: () => 0.5,
      });
      try {
        const a = await player(game, ++serial, {
          'sf-strength-v1': JSON.stringify({ xp: STRENGTH_THRESHOLDS[level - 1] }),
          'sf-purse-v1': '{"coins":25,"ownedEquipment":["battleaxe","akibo"]}',
          'sf-quests-v1':
            '{"theyLive":{"started":true,"evidence":true,"permit":true,"bayonet":true}}',
          'sf-expeditions-v1': '{"railgun":true,"equipped":true}',
          'sf-character-v1': JSON.stringify({ weapon }),
        });
        const target = game.shared.cows[0];
        target.hp = target.max = 1000000;
        Object.assign(a.p, { x: target.x - 0.9, z: target.z });
        await command(game, a.p, 'attack', { id: target.id, weapon });
        assert.equal(
          latestResult(a.messages).ok,
          true,
          weapon + ' at Strength ' + level + ': ' + JSON.stringify(latestResult(a.messages)),
        );
        const duration = 84;
        for (let tick = 0; tick < duration * 20; tick++) game.shared.tick(0.05);
        const hits = a.messages.filter((m) => m.type === 'sharedHit' && m.target === target.id),
          expectedCount = Math.floor(duration / ITEM_STATS[weapon].interval + 1e-8) + 1;
        assert.equal(hits.length, expectedCount, weapon + ' Strength ' + level + ' attack count');
        let xp = STRENGTH_THRESHOLDS[level - 1];
        for (const hit of hits) {
          assert.equal(hit.weapon, weapon);
          assert.equal(
            hit.damage,
            rollWeaponDamage(strengthStatus(xp).level, weapon, () => 0.5),
          );
          xp += hit.damage * 10;
        }
        assert.equal(
          1000000 - target.hp,
          hits.reduce((sum, hit) => sum + hit.damage, 0),
        );
      } finally {
        await game.close();
      }
    }
});

test('neighbor labor pays one coin, animates, and keeps its three-minute cooldown across reconnects', async () => {
  const geometry = fixtureGeometry();
  geometry.merchants = [
    {
      id: 'chair-restorer',
      siteId: 'chair-shop',
      label: 'Furniture restorer',
      neighborhoodService: 'workshop',
      x: 92.2,
      z: 120,
      base: 1.15,
    },
  ];
  let time = 1000000;
  const store = createMemoryStore(),
    game = await createGame({ geometry, store, now: () => time });
  try {
    const a = await player(game, 41900),
      work = { verb: 'neighborhoodService', id: 'chair-restorer', offer: 'repair' };
    await command(game, a.p, 'playerAction', work);
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.inventory.economy.state.coins, 26);
    assert.equal(a.p.gesture, 'work');
    await command(game, a.p, 'playerAction', work);
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, 26);
    await game.disconnect(a.p);
    const b = await player(game, 41900);
    await command(game, b.p, 'playerAction', work);
    assert.equal(latestResult(b.messages).ok, false);
    time += 180000;
    await command(game, b.p, 'playerAction', work);
    assert.equal(latestResult(b.messages).ok, true);
    assert.equal(b.p.inventory.economy.state.coins, 27);
  } finally {
    await game.close();
  }
});

test('PvP uses Fist when selected even if the player owns an equipped railgun', async () => {
  const game = await createGame({
    geometry: fixtureGeometry(),
    store: createMemoryStore(),
    random: () => 0.5,
  });
  try {
    const a = await player(game, 41901, {
        'sf-character-v1': '{"weapon":"unarmed"}',
        'sf-expeditions-v1': '{"railgun":true,"equipped":true}',
      }),
      b = await player(game, 41902);
    for (const person of [a, b]) await command(game, person.p, 'pvp', { enabled: true });
    await command(game, a.p, 'pvpAttack', { id: b.p.id });
    game.tick(0.05);
    const hit = b.messages.find((m) => m.type === 'pvpHit');
    assert.equal(hit.weapon, 'unarmed');
    assert.equal(
      hit.damage,
      rollWeaponDamage(1, 'unarmed', () => 0.5),
    );
  } finally {
    await game.close();
  }
});

test('spectres take bayonet damage and zero railgun damage when both weapons are owned', async () => {
  const geometry = fixtureGeometry();
  geometry.merchants = [{ id: 'spectre', alienId: 'alien-civic', x: 92.7, z: 120, base: 1.15 }];
  const game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 });
  try {
    const a = await player(game, 41903, {
      'sf-sunglasses-v1': '{"owned":true}',
      'sf-character-v1': '{"weapon":"bayonet","sunglasses":true}',
      'sf-quests-v1': '{"theyLive":{"started":true,"evidence":true,"permit":true,"bayonet":true}}',
      'sf-expeditions-v1': '{"railgun":true,"equipped":true}',
    });
    await command(game, a.p, 'playerAction', {
      verb: 'attackPersonal',
      id: 'spectre',
      weapon: 'bayonet',
    });
    assert.equal(latestResult(a.messages).ok, true);
    game.personal.tick(0.3);
    assert.ok(
      a.messages.some((m) => m.type === 'sharedHit' && m.weapon === 'bayonet' && m.damage > 0),
    );
    await command(game, a.p, 'playerAction', {
      verb: 'attackPersonal',
      id: 'spectre',
      weapon: 'railgun',
    });
    game.personal.tick(1.05);
    const hit = a.messages.filter((m) => m.type === 'sharedHit').at(-1);
    assert.equal(hit.weapon, 'railgun');
    assert.equal(hit.damage, 0);
  } finally {
    await game.close();
  }
});
