import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, latestResult } from './fixtures.mjs';
import { bombTileArea, BOMB_FALL_MS, BOMB_COOLDOWN_MS } from '../../stealth-bomber.js';
import { MONSTER_STATS } from '../../monster-drops.js';

async function setup(t) {
  const geometry = fixtureGeometry();
  geometry.wilderness = {
    actors: [
      { id: 'bear', combatKind: 'bear', x: 92.2, z: 120 },
      { id: 'snow', combatKind: 'snow-giant', x: 92.6, z: 120 },
      { id: 'ice', combatKind: 'ice-giant', x: 93, z: 120 },
      { id: 'outside', combatKind: 'ice-giant', x: 97, z: 120 },
    ],
  };
  geometry.merchants = [
    { id: 'spectre', alienId: 'alien-civic', x: 92.7, z: 120, base: 1.15, hp: 36 },
    { id: 'professor', questRole: 'professor', x: 92.2, z: 120, base: 1.15, hp: 30 },
  ];
  let time = 1000000;
  const store = createMemoryStore(),
    game = await createGame({
      geometry,
      store,
      random: () => 0,
      allowDebug: true,
      now: () => time,
    });
  t.after(() => game.close());
  return { game, store, advance: (ms) => (time += ms) };
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

test('B-2 blasts damage cows, bears and both giant species, with normal shared drops, claim ownership and respawn', async (t) => {
  const { game, store } = await setup(t),
    pilot = await player(game, 23001),
    observer = await player(game, 23002);
  const cow = game.shared.cows[0];
  Object.assign(cow, { x: 92.2, z: 120 });
  Object.assign(game.shared.raptor, { x: 92.2, z: 120, phase: 'loose' });
  const bomb = {
      ...bombTileArea(92.2, 120),
      from: { x: 92.2, y: 20, z: 120 },
      attacker: pilot.p.id,
      owner: pilot.p.owner,
    },
    hp = observer.p.hp;
  game.shared.bombCreatures(bomb);
  const [bear, snow, ice, outside] = game.shared.wilderness.actors;
  assert.equal(cow.hp, 0);
  assert.equal(bear.hp, 0);
  assert.equal(snow.hp, 40);
  assert.equal(ice.hp, 80);
  assert.equal(outside.hp, 180);
  assert.equal(observer.p.hp, hp);
  assert.equal(game.shared.raptor.hp, 50);
  assert.equal(game.shared.npcById.get('spectre').hp, 36);
  assert.equal(game.shared.npcById.get('professor').hp, 30);
  assert.equal(game.shared.loot.size, 2);
  assert.ok([...game.shared.loot.values()].every((l) => l.owner === pilot.p.owner));
  assert.ok(
    observer.messages.some(
      (m) =>
        m.type === 'sharedHit' &&
        m.weapon === 'bomb' &&
        m.target === ice.id &&
        m.damage === 100 &&
        m.hp === 80,
    ),
  );
  game.shared.bombCreatures(bomb);
  assert.equal(snow.hp, 0);
  assert.equal(ice.hp, 0);
  assert.equal(game.shared.loot.size, 4);
  game.shared.bombCreatures(bomb);
  assert.equal(game.shared.loot.size, 4, 'dead creatures cannot drop twice');
  await game.flush();
  assert.equal((await store.get('world')).shared.wilderness.find((n) => n.id === 'ice').hp, 0);
  game.shared.wilderness.update(MONSTER_STATS['ice-giant'].respawn, []);
  assert.equal(ice.hp, 180);
  assert.equal(bear.hp, 20);
  assert.equal(snow.hp, 140);
});

test('owned, equipped ice armor consistently reduces spectre and kraken hits; cosmetic flags alone give no bonus', async (t) => {
  const geometry = fixtureGeometry();
  geometry.merchants = [
    { id: 'spectre', alienId: 'alien-civic', x: 92.7, z: 120, base: 1.15, hp: 36 },
  ];
  const game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 });
  t.after(() => game.close());
  const cases = [
    { owned: [], look: {}, blocked: 0 },
    { owned: ['ice-top'], look: { iceTop: true }, blocked: 2 },
    { owned: ['ice-top', 'ice-pants'], look: { iceTop: true, icePants: true }, blocked: 4 },
    { owned: ['ice-top', 'ice-pants'], look: {}, blocked: 0 },
    { owned: [], look: { iceTop: true, icePants: true }, blocked: 0 },
  ];
  for (const [i, c] of cases.entries()) {
    const a = await player(game, 23100 + i, {
      'sf-purse-v1': JSON.stringify({ coins: 25, ownedEquipment: c.owned }),
      'sf-character-v1': JSON.stringify({ ...c.look, sunglasses: true }),
      'sf-sunglasses-v1': '{"owned":true}',
      'sf-quests-v1': '{"theyLive":{"started":true,"evidence":true,"permit":true}}',
    });
    assert.equal(
      (
        await act(game, a, 'playerAction', {
          verb: 'attackPersonal',
          id: 'spectre',
          weapon: 'railgun',
        })
      ).ok,
      true,
    );
    game.personal.tick(0.9);
    assert.equal(a.p.hp, 30 - (5 - c.blocked));
    // Stop melee; the same owned armor must work in a personal boss instance.
    a.p.personalBattle = null;
    a.p.hp = 30;
    const r = game.personal.runtime(a.p);
    r.battle = null;
    r.expeditions.setHarbor({ x: a.p.x, z: a.p.z });
    r.expeditions.board();
    r.expeditions.ship.phase = 'fighting';
    a.p.instance = { id: 'kraken:' + a.p.owner, kind: 'kraken' };
    a.p.mode = 'hidden';
    game.personal.tick(3.5);
    assert.equal(a.p.hp, 30 - (11 - c.blocked), 'kraken armor: ' + JSON.stringify(c));
  }
});

test('actual B-2 commands apply creature damage only on impact and require the full cooldown for a second giant hit', async (t) => {
  const { game, advance } = await setup(t),
    a = await player(game, 23120);
  Object.assign(a.p, { bomberActive: true, mode: 'bomber', y: 20 });
  a.p.profile.bomber = true;
  assert.equal((await act(game, a, 'bomberBomb')).ok, true);
  advance(BOMB_FALL_MS - 1);
  game.tick(0.05);
  assert.equal(game.shared.wilderness.actors[0].hp, 20);
  advance(1);
  game.tick(0.05);
  assert.equal(game.shared.wilderness.actors[0].hp, 0);
  assert.equal(game.shared.wilderness.actors[2].hp, 80);
  assert.equal((await act(game, a, 'bomberBomb')).ok, false);
  advance(BOMB_COOLDOWN_MS - BOMB_FALL_MS);
  assert.equal((await act(game, a, 'bomberBomb')).ok, true);
  advance(BOMB_FALL_MS);
  game.tick(0.05);
  assert.equal(game.shared.wilderness.actors[2].hp, 0);
  assert.ok([...game.shared.loot.values()].some((l) => l.lootKind === 'equipment'));
});

test('bombs never damage townspeople, pets, service characters or quest NPCs', async (t) => {
  const geometry = fixtureGeometry();
  geometry.merchants = [
    { id: 'pedestrian', label: 'Man', x: 92.2, z: 120, base: 1.15 },
    { id: 'pet', dog: true, x: 92.2, z: 120, base: 1.15 },
    { id: 'founder', kind: 'founder', x: 92.2, z: 120, base: 1.15 },
    { id: 'quest', questRole: 'clerk', x: 92.2, z: 120, base: 1.15 },
    { id: 'alien', alienId: 'alien-civic', label: 'Woman', x: 92.2, z: 120, base: 1.15 },
  ];
  const game = await createGame({ geometry, store: createMemoryStore() });
  t.after(() => game.close());
  const a = await player(game, 23201),
    bomb = {
      ...bombTileArea(a.p.x, a.p.z),
      from: { x: a.p.x, y: 20, z: a.p.z },
      owner: a.p.owner,
      attacker: a.p.id,
    };
  game.shared.bombCreatures(bomb);
  assert.ok(geometry.merchants.every((n) => !n.expeditionDead));
  assert.equal(game.shared.loot.size, 0);
  assert.equal(a.p.hp, 30);
});

test('ice armor does not reduce the iPhone doomscrolling penalty', async (t) => {
  const game = await createGame({ geometry: fixtureGeometry(), store: createMemoryStore() });
  t.after(() => game.close());
  const a = await player(game, 23203, {
    'sf-purse-v1':
      '{"coins":25,"iphoneOwned":true,"iphoneEquipped":true,"ownedEquipment":["ice-top","ice-pants"]}',
    'sf-character-v1': '{"iceTop":true,"icePants":true}',
  });
  game.personal.runtime(a.p).tech.update(120, { eligible: true });
  assert.equal(a.p.hp, 25);
});
