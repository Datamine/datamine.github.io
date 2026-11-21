import { storedPlayerFixture, fixtureGeometry, player, latestResult } from './fixtures.mts';
import type { TestGame, TestPlayer, CapturedMessage } from './fixtures.mts';
import { requiredFixture } from '../../tests/helpers/required.mts';
import '../../jurassic-layout.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';

import { ILLUMINATI_CAVE, ILLUMINATI_INSTANCE, CAVE_NAVIGATION } from '../../map-instances.ts';
import { decodePlayerFrame } from '../../multiplayer-protocol.ts';
import {
  BOMB_COOLDOWN_MS,
  BOMB_FALL_MS,
  bombTileArea,
  monsterInBombArea,
} from '../../stealth-bomber.ts';
import type { ServerPlayer } from '../../types/server.ts';

async function fixture() {
  let time = 1000000;
  const geometry = fixtureGeometry(),
    store = createMemoryStore();
  geometry.places = [{ id: 'freemasons-guild', x: 90, y: 118, w: 4.4, d: 3.8 }];
  geometry.expeditions = { ship: { home: { x: 87, z: 120 } } };
  geometry.merchants = [
    { id: 'captain-ahab', label: 'Captain Ahab', x: 92.2, z: 120, base: 1.15 },
    { id: 'test-spectre', label: 'Man', alienId: 'test', x: 35.5, z: 175.5, base: 1.15, hp: 36 },
  ];
  const game = await createGame({ geometry, store, now: () => time, random: () => 0.5 });
  return { game, geometry, store, advance: (ms: number) => (time += ms), now: () => time };
}
async function act(
  game: TestGame,
  person: TestPlayer,
  action: string,
  args: Record<string, unknown> = {},
) {
  game.receive(person.p, {
    type: 'command',
    request: Math.random(),
    action,
    args,
    inventoryEpoch: person.p.inventory.meta.epoch,
  });
  await person.p.queue;
  return latestResult(person.messages);
}
async function member(game: TestGame, id: number, coins = 250100) {
  const a = await player(game, id, {
    'sf-purse-v1': JSON.stringify({ coins }),
    'sf-expeditions-v1': '{"raptor":"escaped","railgun":true,"equipped":true}',
  });
  a.p.profile.guild = { version: 2, visits: 24, member: true, lastVisitAt: 1 };
  return a;
}
async function initiate(
  game: import('./fixtures.mts').TestGame,
  a: {
    p: ServerPlayer;
    messages: CapturedMessage[];
    transport: {
      open: boolean;
      bufferedAmount: number;
      send: (value: string | ArrayBuffer) => number;
      close(code?: number, reason?: string): void;
    };
    token: string;
  },
) {
  assert.equal(requiredFixture(await act(game, a, 'joinIlluminati')).ok, true);
  assert.equal(
    requiredFixture(await act(game, a, 'instanceEnter', { kind: 'illuminati' })).ok,
    true,
  );
}

test('the Old Man charges exactly 250,000 coins once and requires physical guild membership', async () => {
  const { game, store } = await fixture(),
    a = await player(game, 501, { 'sf-purse-v1': '{"coins":999999}' });
  assert.equal(requiredFixture(await act(game, a, 'joinIlluminati')).ok, false);
  a.p.profile.guild = { member: true, visits: 24 };
  a.p.x = 80;
  assert.equal(requiredFixture(await act(game, a, 'joinIlluminati')).ok, false);
  a.p.x = 92.2;
  assert.equal(requiredFixture(await act(game, a, 'joinIlluminati')).ok, true);
  assert.equal(a.p.inventory.economy.state.coins, 749999);
  await act(game, a, 'joinIlluminati');
  assert.equal(a.p.inventory.economy.state.coins, 749999);
  assert.equal(
    (await storedPlayerFixture(store, 'player:' + a.p.owner)).playerState.quests.illuminatus
      .initiated,
    true,
  );
  const poor = await member(game, 502, 249999);
  assert.equal(requiredFixture(await act(game, poor, 'joinIlluminati')).ok, false);
  assert.equal(poor.p.inventory.economy.state.coins, 249999);
  await game.close();
});
test('initiates share the basement, movement and chat while surface players and city actions stay separate', async () => {
  const { game, advance } = await fixture(),
    a = await member(game, 503),
    b = await member(game, 504),
    surface = await member(game, 519);
  assert.equal(
    requiredFixture(await act(game, surface, 'instanceEnter', { kind: 'illuminati' })).ok,
    false,
  );
  await initiate(game, a);
  await initiate(game, b);
  assert.equal(a.p.instance.id, ILLUMINATI_INSTANCE.id);
  assert.equal(a.p.instance.id, b.p.instance.id);
  Object.assign(surface.p, { x: a.p.x, z: a.p.z });
  game.broadcast();
  assert.equal(a.p.seen.has(b.p.id), true);
  assert.equal(b.p.seen.has(a.p.id), true);
  assert.equal(a.p.seen.has(surface.p.id), false);
  assert.equal(surface.p.seen.has(a.p.id), false);
  assert.equal(requiredFixture(await act(game, a, 'releaseTiger')).ok, false);
  game.receive(a.p, { type: 'say', text: 'yo' });
  await a.p.queue;
  assert.ok(b.messages.some((m) => m.type === 'say' && m.id === a.p.id && m.text === 'yo'));
  assert.equal(
    surface.messages.some((m) => m.type === 'say' && m.id === a.p.id),
    false,
  );
  advance(1000);
  await act(game, a, 'moveTo', { x: 13.5, z: 23.5 });
  game.tick(0.3);
  game.broadcast();
  const frame = decodePlayerFrame(
    requiredFixture(b.messages.filter((m) => m instanceof ArrayBuffer).at(-1)),
  );
  assert.ok(frame != null, 'Missing test fixture: frame');
  assert.equal(requiredFixture(frame.players.find((p) => p.id === a.p.id)).z, 23.5);
  await act(game, a, 'pvp', { enabled: true });
  await act(game, b, 'pvp', { enabled: true });
  assert.equal(requiredFixture(await act(game, a, 'pvpAttack', { id: b.p.id })).ok, false);
  const update = a.messages.filter((m) => m.type === 'world').at(-1);
  assert.deepEqual(requiredFixture(update).patches, {});
  assert.equal(requiredFixture(await act(game, a, 'instanceLeave')).ok, true);
  game.broadcast();
  assert.equal(b.p.instance.id, ILLUMINATI_INSTANCE.id);
  assert.equal(b.p.seen.has(a.p.id), false);
  assert.equal(
    requiredFixture(await act(game, a, 'instanceEnter', { kind: 'illuminati' })).ok,
    true,
  );
  game.broadcast();
  assert.equal(b.p.seen.has(a.p.id), true);
  await game.close();
});
test('cave movement uses its own tile graph and exits return to the guild surface', async () => {
  const { game, advance } = await fixture(),
    a = await member(game, 505);
  await initiate(game, a);
  const initial = { x: a.p.x, z: a.p.z };
  advance(1000);
  assert.equal(requiredFixture(await act(game, a, 'moveTo', { x: 13.5, z: 23.5 })).ok, true);
  game.tick(0.3);
  assert.equal(a.p.z, 23.5);
  const snapped = await act(game, a, 'moveTo', { x: 1, z: 1 });
  assert.equal(requiredFixture(snapped).ok, true);
  assert.ok(
    CAVE_NAVIGATION.path(
      { x: a.p.x - 0.5, y: a.p.z - 0.5 },
      {
        x: requiredFixture(requiredFixture(snapped).goal).x - 0.5,
        y: requiredFixture(requiredFixture(snapped).goal).z - 0.5,
      },
    ),
  );
  assert.equal(a.p.z, 23.5);
  assert.ok(
    CAVE_NAVIGATION.path(
      { x: initial.x - 0.5, y: initial.z - 0.5 },
      { x: ILLUMINATI_CAVE.boarding.x - 0.5, y: ILLUMINATI_CAVE.boarding.z - 0.5 },
    ),
  );
  assert.equal(requiredFixture(await act(game, a, 'instanceLeave')).ok, true);
  assert.equal(a.p.instance.kind, 'world');
  assert.equal(a.p.x, 92.2);
  assert.equal(a.p.z, 120);
  await game.close();
});
test('personal bombers launch independently from the shared hangar and return to the other initiates', async () => {
  const { game } = await fixture(),
    a = await member(game, 506),
    b = await member(game, 507);
  assert.equal(requiredFixture(await act(game, a, 'bomberBoard')).ok, false);
  await initiate(game, a);
  await initiate(game, b);
  Object.assign(a.p, ILLUMINATI_CAVE.boarding);
  assert.equal(requiredFixture(await act(game, a, 'bomberBoard')).ok, true);
  assert.equal(a.p.instance.kind, 'world');
  assert.equal(a.p.mode, 'bomber');
  assert.ok(a.p.x < 0 && a.p.y === 20);
  assert.equal(b.p.profile.bomber, false);
  Object.assign(b.p, ILLUMINATI_CAVE.boarding);
  assert.equal(requiredFixture(await act(game, b, 'bomberBoard')).ok, true);
  assert.equal(a.p.bomberActive, true);
  assert.equal(b.p.bomberActive, true);
  assert.equal(requiredFixture(await act(game, b, 'bomberReturn')).ok, true);
  assert.equal(b.p.instance.id, ILLUMINATI_INSTANCE.id);
  assert.equal(requiredFixture(await act(game, b, 'bomberBomb')).ok, false);
  assert.equal(requiredFixture(await act(game, a, 'bomberReturn')).ok, true);
  assert.equal(a.p.instance.kind, 'illuminati');
  assert.equal(a.p.instance.id, b.p.instance.id);
  game.broadcast();
  assert.equal(a.p.seen.has(b.p.id), true);
  await game.close();
});
test('B-2 flight and Shift boost are advanced by server ticks, including barrel-roll rotation', async () => {
  const { game, advance } = await fixture(),
    a = await member(game, 512),
    b = await member(game, 513);
  await initiate(game, a);
  Object.assign(a.p, ILLUMINATI_CAVE.boarding);
  await act(game, a, 'bomberBoard');
  await act(game, a, 'moveTo', { x: 1000, z: a.p.z });
  game.tick(0.1);
  assert.equal(a.p.x, -23.2);
  await act(game, a, 'barrelRoll');
  game.tick(0.7);
  assert.ok(Math.abs(a.p.phase - Math.PI) < 1e-8);
  const before = a.p.x;
  game.receive(a.p, { type: 'controls', boost: true });
  advance(100);
  game.tick(0.1);
  assert.ok(a.p.x - before > 10);
  game.receive(b.p, {
    type: 'pose',
    pose: {
      x: b.p.x + 1,
      z: b.p.z,
      y: 25,
      angle: 0,
      phase: 0,
      motion: 0,
      moving: true,
      mode: 'bomber',
      boost: true,
      hp: 30,
    },
  });
  assert.equal(b.p.mode, 'walk');
  await game.close();
});
test('ejection is server-driven, rejects repeated exits and bombs, and saves a ground landing on disconnect', async () => {
  const { game, geometry, advance, store } = await fixture(),
    a = await member(game, 514),
    observer = await member(game, 515);
  await initiate(game, a);
  Object.assign(a.p, ILLUMINATI_CAVE.boarding);
  await act(game, a, 'bomberBoard');
  geometry.landClearAt = (x, z) => x >= 0 && z > 90 && z < 130;
  Object.assign(observer.p, { x: 1, z: 106 });
  const hp = a.p.hp,
    result = await act(game, a, 'bomberEject');
  assert.equal(requiredFixture(result).ok, true);
  assert.match(requiredFixture(requiredFixture(result).message), /Illuminati will pay/);
  assert.equal(a.p.mode, 'parachute');
  assert.ok(requiredFixture(a.p.parachute).to.x >= 0.5);
  assert.ok(observer.messages.some((m) => m.type === 'bomberEjected'));
  assert.equal(requiredFixture(await act(game, a, 'bomberEject')).ok, false);
  assert.equal(requiredFixture(await act(game, a, 'bomberBomb')).ok, false);
  assert.equal(requiredFixture(await act(game, a, 'bomberReturn')).ok, false);
  const before = a.p.x;
  game.receive(a.p, {
    type: 'pose',
    pose: {
      x: 100,
      z: 100,
      y: 1.15,
      angle: 0,
      phase: 0,
      motion: 1,
      moving: true,
      mode: 'walk',
      hp: 30,
    },
  });
  assert.equal(a.p.x, before);
  const flight = a.p.parachute;
  advance(requiredFixture(flight).duration * 500);
  game.tick(0.05);
  assert.ok(a.p.y > requiredFixture(flight).to.y && a.p.y < requiredFixture(flight).from.y);
  await game.flush();
  assert.equal(
    requiredFixture((await storedPlayerFixture(store, 'player:' + a.p.owner)).playerState.position)
      .y,
    requiredFixture(flight).to.y,
    'reconnect never strands a player in the air',
  );
  advance(requiredFixture(flight).duration * 500 + 1);
  game.tick(0.05);
  assert.equal(a.p.bomberActive, false);
  assert.equal(a.p.parachute, null);
  assert.equal(a.p.mode, 'walk');
  assert.equal(a.p.hp, hp);
  assert.equal(a.p.x, requiredFixture(flight).to.x);
  assert.ok(a.messages.some((m) => m.type === 'bomberLanded'));
  assert.equal(a.p.profile.illuminati, true);
  await game.close();
});
test('bombs land after a fall, damage creatures inside 3×3 tiles, and enforce a persisted 20-second cooldown', async () => {
  const { game, advance, store } = await fixture(),
    a = await member(game, 508),
    b = await member(game, 509);
  await initiate(game, a);
  Object.assign(a.p, ILLUMINATI_CAVE.boarding);
  await act(game, a, 'bomberBoard');
  const target = game.shared.cows[0];
  Object.assign(a.p, { x: target.x, z: target.z });
  Object.assign(b.p, { x: target.x, z: target.z });
  const area = bombTileArea(a.p.x, a.p.z),
    affected = game.shared.cows.filter((c) => monsterInBombArea(c, area));
  assert.ok(affected.length > 0);
  const result = await act(game, a, 'bomberBomb', { target: b.p.id });
  assert.equal(requiredFixture(result).ok, true);
  assert.equal(requiredFixture(await act(game, a, 'bomberBomb')).ok, false);
  advance(BOMB_FALL_MS - 1);
  game.tick(0.05);
  assert.ok(affected.every((c) => c.hp === 20));
  advance(1);
  game.tick(0.05);
  assert.ok(affected.every((c) => c.hp === 0));
  assert.equal(b.p.hp, 30);
  assert.equal(game.shared.raptor.hp, 50);
  assert.equal(requiredFixture(game.shared.npcById.get('test-spectre')).hp, 36);
  assert.equal(
    requiredFixture(
      b.messages.find(
        (m): m is Extract<typeof m, { type: 'sharedHit' }> =>
          m.type === 'sharedHit' && m.weapon === 'bomb',
      ),
    ).damage,
    20,
  );
  assert.equal(game.shared.loot.size, affected.length);
  assert.equal(
    (await storedPlayerFixture(store, 'player:' + a.p.owner)).playerState.vehicles.bomber
      .bombReadyAt,
    requiredFixture(requiredFixture(result).bomber).readyAt,
  );
  advance(BOMB_COOLDOWN_MS - BOMB_FALL_MS - 1);
  assert.equal(requiredFixture(await act(game, a, 'bomberBomb')).ok, false);
  advance(1);
  assert.equal(requiredFixture(await act(game, a, 'bomberBomb')).ok, true);
  await game.close();
});
test('boarding Ahab creates a personal instance and returning leaves the private tiles behind', async () => {
  const { game } = await fixture(),
    a = await member(game, 510),
    b = await member(game, 511);
  assert.equal(requiredFixture(await act(game, a, 'instanceEnter', { kind: 'kraken' })).ok, true);
  assert.equal(a.p.instance.kind, 'kraken');
  assert.equal(requiredFixture(await act(game, b, 'instanceEnter', { kind: 'kraken' })).ok, true);
  assert.notEqual(a.p.instance.id, b.p.instance.id);
  game.broadcast();
  assert.equal(a.p.seen.size, 0);
  assert.equal(requiredFixture(await act(game, a, 'collect', { id: 'shared-loot-1' })).ok, false);
  assert.equal(requiredFixture(await act(game, a, 'instanceLeave')).ok, true);
  assert.equal(a.p.instance.kind, 'world');
  await game.close();
});

test('Ahab sails to the kraken and returns to the saved beach with only authoritative ticks', async (t) => {
  const { PEQUOD } = await import('../../jurassic-layout.ts'),
    { game, geometry } = await fixture();
  t.after(() => game.close());
  const a = await member(game, 515),
    shore = { x: a.p.x, y: a.p.y, z: a.p.z };
  assert.equal(requiredFixture(await act(game, a, 'instanceEnter', { kind: 'kraken' })).ok, true);
  assert.equal(a.p.x, requiredFixture(requiredFixture(geometry.expeditions).ship.home).x);
  assert.equal(a.p.y, PEQUOD.deck);
  for (let i = 0; i < 121; i++) game.tick(0.05);
  const state = game.personal.transient(a.p) as {
    ship: { phase: string };
    kraken: { visible: boolean; hp: number };
  };
  assert.equal(state.ship.phase, 'fighting');
  assert.equal(state.kraken.visible, true);
  assert.equal(state.kraken.hp, 600);
  assert.equal(
    a.p.x,
    requiredFixture(requiredFixture(geometry.expeditions).ship.home).x - PEQUOD.travel,
  );
  assert.equal(a.p.y, PEQUOD.deck);
  assert.equal(a.p.mode, 'hidden');
  assert.equal(
    requiredFixture(await act(game, a, 'playerAction', { verb: 'returnShip' })).ok,
    true,
  );
  for (let i = 0; i < 101; i++) game.tick(0.05);
  assert.equal(a.p.instance.kind, 'world');
  assert.deepEqual({ x: a.p.x, y: a.p.y, z: a.p.z }, shore);
  assert.equal(game.personal.transient(a.p).ship, undefined);
  assert.equal(
    requiredFixture(await act(game, a, 'playerAction', { verb: 'returnShip' })).ok,
    false,
  );
});

test('Ahab rejects completed hunts before entering an instance instead of silently returning next tick', async (t) => {
  const { game } = await fixture();
  t.after(() => game.close());
  const a = await player(game, 516, {
      'sf-expeditions-v1': '{"raptor":"escaped","railgun":true,"krakenReward":true}',
    }),
    shore = { x: a.p.x, z: a.p.z };
  const result = await act(game, a, 'instanceEnter', { kind: 'kraken' });
  assert.equal(requiredFixture(result).ok, false);
  assert.match(requiredFixture(requiredFixture(result).message), /already claimed/);
  for (let i = 0; i < 5; i++) game.tick(0.05);
  assert.equal(a.p.instance.kind, 'world');
  assert.deepEqual({ x: a.p.x, z: a.p.z }, shore);
});
