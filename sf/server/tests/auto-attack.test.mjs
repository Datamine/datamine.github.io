import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command, latestResult } from './fixtures.mjs';
import { ITEM_STATS } from '../../item-stats.js';

const hits = (person, id) =>
  person.messages.filter(
    (m) => m.type === 'sharedHit' && m.attacker === person.p.id && m.target === id,
  );
const gear = {
  'sf-purse-v1': '{"coins":25,"ownedEquipment":["battleaxe"]}',
  'sf-quests-v1': '{"theyLive":{"started":true,"evidence":true,"permit":true,"bayonet":true}}',
  'sf-expeditions-v1': '{"railgun":true,"equipped":true}',
};
const tick = (game, seconds) => {
  for (let i = 0; i < Math.round(seconds * 20); i++) game.tick(0.05);
};

test('one Attack command repeats at each weapon interval through full server ticks without further client messages', async () => {
  for (const [index, weapon] of ['unarmed', 'bayonet', 'battleaxe', 'railgun'].entries()) {
    const game = await createGame({
        geometry: fixtureGeometry(),
        store: createMemoryStore(),
        random: () => 0.5,
      }),
      a = await player(game, 8100 + index, {
        ...gear,
        'sf-character-v1': JSON.stringify({ weapon }),
      }),
      cow = game.shared.cows[0];
    try {
      cow.hp = cow.max = 100000;
      Object.assign(a.p, { x: cow.x - 0.9, z: cow.z });
      await command(game, a.p, 'attack', { id: cow.id, weapon });
      assert.equal(latestResult(a.messages).ok, true);
      tick(game, 4.2);
      assert.equal(
        hits(a, cow.id).length,
        Math.floor(4.2 / ITEM_STATS[weapon].interval + 1e-8) + 1,
        weapon + ' repeats at its own rate',
      );
      assert.ok(hits(a, cow.id).every((hit) => hit.weapon === weapon));
      assert.equal(a.p.attack, cow.id);
    } finally {
      await game.close();
    }
  }
});

test('wilderness engagements pause for range or cover and resume without another click or accumulated burst', async () => {
  let blocked = false;
  const geometry = fixtureGeometry();
  geometry.canTravel = () => false;
  geometry.lineClear = () => !blocked;
  geometry.wilderness = { actors: [{ id: 'giant', combatKind: 'ice-giant', x: 95, z: 120 }] };
  const game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 }),
    a = await player(game, 8110, gear),
    giant = game.shared.wilderness.actors[0];
  try {
    giant.hp = giant.max = 100000;
    Object.assign(a.p, { x: giant.x - 4, z: giant.z });
    await command(game, a.p, 'attack', { id: giant.id, weapon: 'railgun' });
    assert.equal(hits(a, giant.id).length, 1);
    giant.x = a.p.x + 6;
    tick(game, 2);
    assert.equal(a.p.attack, giant.id);
    assert.equal(hits(a, giant.id).length, 1, 'no shots out of range');
    giant.x = a.p.x + 4;
    tick(game, 0.05);
    assert.equal(hits(a, giant.id).length, 2);
    blocked = true;
    tick(game, 2);
    assert.equal(a.p.attack, giant.id);
    assert.equal(hits(a, giant.id).length, 2, 'no hits through cover');
    blocked = false;
    tick(game, 0.05);
    assert.equal(hits(a, giant.id).length, 3, 'resume with one shot, never catch up missed swings');
    tick(game, 0.75);
    assert.equal(hits(a, giant.id).length, 3);
    tick(game, 0.05);
    assert.equal(hits(a, giant.id).length, 4);
    assert.equal(a.p.hp, a.p.max, 'a trapped monster cannot deal melee damage');
  } finally {
    await game.close();
  }
});

test('clicking a walk destination cancels attacks before moving and they never resume merely by returning to range', async () => {
  const geometry = fixtureGeometry(),
    game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 }),
    a = await player(game, 8120, gear),
    cow = game.shared.cows[0];
  try {
    cow.hp = cow.max = 100000;
    Object.assign(a.p, { x: cow.x - 1, z: cow.z });
    await command(game, a.p, 'attack', { id: cow.id, weapon: 'railgun' });
    tick(game, 0.8);
    assert.equal(hits(a, cow.id).length, 2);
    const before = cow.hp;
    await command(game, a.p, 'moveTo', { x: a.p.x - 0.25, z: a.p.z });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.attack, null);
    tick(game, 3);
    assert.equal(cow.hp, before);
    assert.ok(
      Math.hypot(a.p.x - cow.x, a.p.z - cow.z) < 5,
      'the player stayed in range, but walking still disengaged',
    );
    await command(game, a.p, 'attack', { id: cow.id, weapon: 'railgun' });
    assert.equal(latestResult(a.messages).ok, true);
    geometry.pathTo = () => null;
    await command(game, a.p, 'moveTo', { x: a.p.x + 2, z: a.p.z });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.attack, null, 'an unreachable ground click still stops combat');
    const stopped = cow.hp;
    tick(game, 2);
    assert.equal(cow.hp, stopped);
  } finally {
    await game.close();
  }
});

test('repeated clicks cannot bypass cooldowns and rejected targets cannot be armed during a cooldown', async () => {
  const game = await createGame({
      geometry: fixtureGeometry(),
      store: createMemoryStore(),
      random: () => 0.5,
    }),
    a = await player(game, 8130, gear),
    cow = game.shared.cows[0];
  try {
    cow.hp = cow.max = 100000;
    Object.assign(a.p, { x: cow.x - 1, z: cow.z });
    await command(game, a.p, 'attack', { id: cow.id, weapon: 'railgun' });
    for (let i = 0; i < 10; i++)
      await command(game, a.p, 'attack', { id: cow.id, weapon: 'railgun' });
    assert.equal(hits(a, cow.id).length, 1);
    await command(game, a.p, 'attack', { id: 'missing-monster', weapon: 'railgun' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.attack, cow.id);
    tick(game, 0.75);
    assert.equal(hits(a, cow.id).length, 1);
    tick(game, 0.05);
    assert.equal(hits(a, cow.id).length, 2);
    await command(game, a.p, 'stopAttack');
    tick(game, 2);
    assert.equal(hits(a, cow.id).length, 2);
  } finally {
    await game.close();
  }
});

test('a defeat immediately clears the target and does not restart combat when that monster respawns', async () => {
  const game = await createGame({
      geometry: fixtureGeometry(),
      store: createMemoryStore(),
      random: () => 0.5,
    }),
    a = await player(game, 8140, gear),
    cow = game.shared.cows[0];
  try {
    cow.hp = 1;
    Object.assign(a.p, { x: cow.x - 1, z: cow.z });
    await command(game, a.p, 'attack', { id: cow.id, weapon: 'railgun' });
    assert.equal(cow.hp, 0);
    assert.equal(a.p.attack, null);
    tick(game, 10.1);
    assert.equal(cow.hp, cow.max);
    assert.equal(hits(a, cow.id).length, 1);
  } finally {
    await game.close();
  }
});

test('a walk command also cancels private spectre combat and PvP without a separate stop packet', async () => {
  const geometry = fixtureGeometry();
  geometry.merchants = [{ id: 'spectre', alienId: 'alien-civic', x: 92.7, z: 120, base: 1.15 }];
  const game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 }),
    a = await player(game, 8150, {
      ...gear,
      'sf-sunglasses-v1': '{"owned":true}',
      'sf-character-v1': '{"weapon":"bayonet","sunglasses":true}',
    }),
    b = await player(game, 8151);
  try {
    await command(game, a.p, 'playerAction', {
      verb: 'attackPersonal',
      id: 'spectre',
      weapon: 'bayonet',
    });
    assert.equal(latestResult(a.messages).ok, true);
    tick(game, 0.3);
    const before = hits(a, 'spectre').length,
      hp = a.p.hp;
    assert.ok(before > 0);
    await command(game, a.p, 'moveTo', { x: a.p.x - 0.1, z: a.p.z });
    assert.equal(a.p.personalBattle, null);
    tick(game, 2);
    assert.equal(hits(a, 'spectre').length, before);
    assert.equal(a.p.hp, hp);
    for (const person of [a, b]) await command(game, person.p, 'pvp', { enabled: true });
    await command(game, a.p, 'pvpAttack', { id: b.p.id });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.pvpTarget, b.p.id);
    await command(game, a.p, 'moveTo', { x: a.p.x - 0.1, z: a.p.z });
    assert.equal(a.p.pvpTarget, null);
    game.tick(0.05);
    assert.equal(b.p.hp, 30);
  } finally {
    await game.close();
  }
});
