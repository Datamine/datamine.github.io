import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command as gameCommand, latestResult } from './fixtures.mjs';
import { SKILL_THRESHOLDS, skillStatus, hitpointMaximum } from '../../progression.js';

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
  const geometry = fixtureGeometry();
  geometry.wilderness = { actors: [{ id: 'terminator', combatKind: 'terminator', x: 96, z: 120 }] };
  const store = createMemoryStore();
  let time = 1000000;
  const game = await createGame({ geometry, store, now: () => time, random: () => 0 });
  return { game, store, geometry, advance: (ms) => (time += ms) };
}
test('actual shared damage awards 10 strength and 5 hitpoint XP, faces the monster and survives restart', async () => {
  const f = await setup();
  let game = f.game;
  try {
    const a = await player(game, 55001),
      monster = game.shared.wilderness.actors[0];
    monster.hp = 5;
    await command(game, a.p, 'attack', { id: monster.id, weapon: 'railgun' });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(monster.hp, 0);
    assert.equal(JSON.parse(a.p.profile.privateState['sf-strength-v1']).xp, 50);
    assert.equal(a.p.hitpointsXP, 25);
    assert.equal(a.p.angle, 0);
    assert.equal(a.p.gesture, 'attack');
    assert.ok(game.shared.loot.size >= 3);
    await game.close();
    game = await createGame({ geometry: f.geometry, store: f.store });
    const b = await player(game, 55001);
    assert.equal(JSON.parse(b.p.profile.privateState['sf-strength-v1']).xp, 50);
    assert.equal(b.p.hitpointsXP, 25);
    game.receive(b.p, {
      type: 'checkpoint',
      privateState: {
        'sf-strength-v1': '{"xp":999999}',
        'sf-hitpoints-v1': '{"xp":999999,"hp":255,"max":255}',
      },
    });
    await b.p.queue;
    assert.equal(b.p.hitpointsXP, 25);
    assert.equal(JSON.parse(b.p.profile.privateState['sf-strength-v1']).xp, 50);
  } finally {
    await game.close();
  }
});
test('Akibo is server-owned, fires at seven tiles with railgun damage and has a persistent collection entry', async () => {
  const f = await setup();
  try {
    const a = await player(f.game, 55002),
      t = f.game.shared.wilderness.actors[0];
    Object.assign(a.p, { x: t.x - 7, z: t.z });
    await command(f.game, a.p, 'attack', { id: t.id, weapon: 'akibo' });
    assert.equal(latestResult(a.messages).ok, false);
    f.game.receive(a.p, {
      type: 'checkpoint',
      privateState: { 'sf-character-v1': '{"weapon":"akibo"}' },
    });
    await a.p.queue;
    assert.equal(a.p.appearance.weapon, 'unarmed');
    assert.equal(
      a.p.inventory.receive({ lootKind: 'equipment', itemId: 'akibo', amount: 1 }).ok,
      true,
    );
    await command(f.game, a.p, 'attack', { id: t.id, weapon: 'akibo' });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(t.hp, 252);
    assert.equal(a.p.hitpointsXP, 40);
    a.p.x = t.x - 7.02;
    a.p.shotAt = 0;
    await command(f.game, a.p, 'attack', { id: t.id, weapon: 'akibo' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.ok(a.p.inventory.snapshot().collection.includes('akibo'));
    await f.game.flush();
    assert.ok((await f.store.get('player:' + a.p.owner)).collection.includes('akibo'));
  } finally {
    await f.game.close();
  }
});
test('level-50 skills restore derived maximum HP, heal beyond 30, and survive a death recovery', async () => {
  const f = await setup();
  try {
    const xp = SKILL_THRESHOLDS.at(-1),
      a = await player(f.game, 55003, {
        'sf-strength-v1': JSON.stringify({ xp }),
        'sf-hitpoints-v1': JSON.stringify({ xp, hp: 40 }),
      });
    assert.equal(a.p.level, 50);
    assert.equal(a.p.max, hitpointMaximum(xp));
    assert.equal(a.p.max, 79);
    a.p.hp = 40;
    a.p.inventory.receive({ lootKind: 'sandwich', amount: 1 });
    await command(f.game, a.p, 'inventory', { op: 'eat' });
    assert.equal(a.p.hp, 55);
    a.p.hp = 0;
    a.p.respawnAllowed = true;
    await command(f.game, a.p, 'respawn');
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.hp, 79);
    assert.equal(skillStatus(a.p.hitpointsXP).level, 50);
  } finally {
    await f.game.close();
  }
});
