import {
  storedPlayerFixture,
  storedWorldFixture,
  fixture,
  fixtureGeometry,
  player,
  latestResult,
} from './fixtures.mts';
import type { TestGame, TestPlayer } from './fixtures.mts';
import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../game.mts';
import { AIRSHIP_TERMINAL } from '../../airship.ts';
import { AIRSHIP_RULES } from '../../config/airship.ts';

async function act(
  game: TestGame,
  person: TestPlayer,
  action: string,
  args: Record<string, unknown> = {},
  epoch: unknown = person.p.inventory.meta.epoch,
) {
  if ((['airshipBoard', 'airshipRecall'] satisfies [string, string]).includes(action))
    args = { price: game.shared.snapshot().airship.rentalPrice, ...args };
  game.receive(person.p, {
    type: 'command',
    request: Math.random(),
    action,
    args,
    inventoryEpoch: epoch,
  });
  await person.p.queue;
  return latestResult(person.messages);
}
function atAgent(person: TestPlayer) {
  Object.assign(person.p, {
    x: AIRSHIP_TERMINAL.entry.x + 0.5,
    z: AIRSHIP_TERMINAL.entry.y + 0.5,
    y: AIRSHIP_TERMINAL.base,
  });
}
function atDock(person: TestPlayer) {
  Object.assign(person.p, {
    x: AIRSHIP_TERMINAL.boarding.x + 0.5,
    z: AIRSHIP_TERMINAL.boarding.y + 0.5,
    y: AIRSHIP_TERMINAL.base,
  });
}
function fly(game: import('./fixtures.mts').TestGame) {
  Object.assign(game.shared.airship.state, {
    phase: 'flying',
    position: { x: 140, y: 30, z: 150 },
    speed: 3,
  });
}
const coins = (person: TestPlayer) => person.p.inventory.economy.state.coins;
const ship = (game: import('./fixtures.mts').TestGame) => game.shared.snapshot().airship;

test('renting costs 5, passengers board free, and a 10-coin takeover returns everyone safely without charging twice', async (t) => {
  const { game, store } = await fixture();
  t.after(() => game.close());
  const pilot = await player(game, 401),
    rider = await player(game, 402),
    payer = await player(game, 403),
    other = await player(game, 404),
    climber = await player(game, 405);
  assert.equal(ship(game).rentalPrice, 5);
  for (const p of [pilot, rider])
    assert.equal(requiredFixture(await act(game, p, 'airshipBoard')).ok, true);
  assert.equal(coins(pilot), 20);
  assert.equal(coins(rider), 25);
  assert.equal(ship(game).lastPrice, 5);
  fly(game);
  climber.p.grappling = { from: { x: 140, y: 1.15, z: 150 }, elapsed: 1, duration: 3 };
  climber.p.y = 20;
  game.shared.loot.set('ship-coin', {
    id: 'ship-coin',
    owner: pilot.p.owner,
    unlockAt: 0,
    kind: 'coins',
    lootKind: 'coins',
    label: 'Coin',
    description: 'A coin.',
    ship: true,
    deck: { x: 0.1, z: 0.2 },
    x: 140,
    z: 150,
    base: 30,
    amount: 1,
    expires: 999,
  });
  atAgent(payer);
  const resetAt = ship(game).resetAt;
  const result = await act(game, payer, 'airshipRecall', { price: 10 });
  assert.equal(requiredFixture(result).ok, true);
  assert.equal(requiredFixture(result).paid, 10);
  assert.equal(coins(payer), 15);
  assert.equal(ship(game).resetAt, resetAt);
  assert.equal(ship(game).lastPrice, 10);
  assert.equal(ship(game).rentalPrice, 15);
  assert.equal(ship(game).active, false);
  assert.equal(game.shared.passengers.size, 0);
  for (const person of [pilot, rider, climber]) {
    assert.equal(person.p.y, 1.15);
    assert.equal(person.p.x, 92.2);
    assert.equal(person.p.z, 120);
    assert.equal(person.p.airship, false);
    assert.equal(person.p.grappling, null);
    assert.equal(person.p.hp, 30);
    assert.ok(
      person.messages.some((m) => m.type === 'airshipReset' && m.position && m.reason === 'paid'),
    );
  }
  assert.equal(requiredFixture(game.shared.loot.get('ship-coin')).ship, false);
  assert.ok(
    Math.abs(requiredFixture(requiredFixture(game.shared.loot.get('ship-coin')).base) - 1.175) <
      1e-9,
  );
  assert.equal(
    requiredFixture(await act(game, pilot, 'airshipTarget', { x: 200, z: 200 })).ok,
    false,
  );
  assert.equal(
    requiredFixture(await act(game, other, 'airshipBoard')).ok,
    false,
    'a rival must outbid rather than boarding a reserved ship',
  );
  assert.equal(
    (await storedPlayerFixture(store, 'player:' + payer.p.owner)).playerState.inventory.economy
      .coins,
    15,
  );
  assert.equal((await storedWorldFixture(store, 'world')).shared.airshipLease.lastPrice, 10);
  atDock(payer);
  assert.equal(requiredFixture(await act(game, payer, 'airshipBoard', { price: 10 })).ok, true);
  assert.equal(coins(payer), 15);
  assert.equal(ship(game).captain, payer.p.id);
  assert.equal(ship(game).reservedUntil, 0);
  assert.equal((await storedWorldFixture(store, 'world')).shared.airshipLease.reservation, null);
});

test('each higher bid immediately replaces the last reservation or pilot: 5, 10, 15, 20', async (t) => {
  const { game } = await fixture();
  t.after(() => game.close());
  const pilot = await player(game, 411),
    a = await player(game, 412),
    b = await player(game, 413);
  await act(game, pilot, 'airshipBoard', { price: 5 });
  fly(game);
  atAgent(a);
  atAgent(b);
  const results = await Promise.all([
    act(game, a, 'airshipRecall', { price: 10 }),
    act(game, b, 'airshipRecall', { price: 10 }),
  ]);
  assert.equal(results.filter((r) => requiredFixture(r).ok).length, 1);
  assert.equal(coins(a) + coins(b), 40, 'only one competing 10-coin quote is charged');
  const winner = requiredFixture(results[0]).ok ? a : b,
    loser = winner === a ? b : a;
  assert.equal(ship(game).rentalPrice, 15);
  const status = await act(game, loser, 'airshipStatus');
  assert.equal(
    requiredFixture(requiredFixture(status).airship).canRecall,
    true,
    'reservations can be outbid immediately',
  );
  assert.equal(requiredFixture(await act(game, loser, 'airshipRecall', { price: 10 })).ok, false);
  assert.equal(coins(loser), 25);
  assert.equal(requiredFixture(await act(game, loser, 'airshipRecall', { price: 15 })).ok, true);
  assert.equal(coins(loser), 10);
  atDock(winner);
  assert.equal(requiredFixture(await act(game, winner, 'airshipBoard')).ok, false);
  atDock(loser);
  assert.equal(requiredFixture(await act(game, loser, 'airshipBoard')).ok, true);
  assert.equal(coins(loser), 10);
  fly(game);
  atAgent(pilot);
  assert.equal(requiredFixture(await act(game, pilot, 'airshipRecall', { price: 20 })).ok, true);
  assert.equal(coins(pilot), 0);
  assert.equal(ship(game).lastPrice, 20);
  assert.equal(ship(game).rentalPrice, 25);
  assert.equal(ship(game).reservedFor, pilot.p.id);
});

test('expired reservations and empty returns never lower the next price', async (t) => {
  const { game, advance } = await fixture();
  t.after(() => game.close());
  const pilot = await player(game, 416),
    payer = await player(game, 417),
    other = await player(game, 418);
  await act(game, pilot, 'airshipBoard');
  await act(game, pilot, 'airshipHome');
  for (let i = 0; i < 400; i++) game.tick(0.05);
  assert.equal(ship(game).active, false);
  assert.equal(ship(game).rentalPrice, 10);
  atDock(payer);
  assert.equal(requiredFixture(await act(game, payer, 'airshipBoard', { price: 10 })).ok, true);
  assert.equal(coins(payer), 15);
  fly(game);
  atAgent(other);
  assert.equal(requiredFixture(await act(game, other, 'airshipRecall', { price: 15 })).ok, true);
  advance(AIRSHIP_RULES.reservationMs);
  atDock(pilot);
  assert.equal(requiredFixture(await act(game, pilot, 'airshipBoard', { price: 5 })).ok, false);
  assert.equal(requiredFixture(await act(game, pilot, 'airshipBoard', { price: 20 })).ok, true);
  assert.equal(coins(pilot), 0);
  assert.equal(ship(game).rentalPrice, 25);
});

test('invalid location, state, quotes, inventory epochs and insufficient funds never charge', async (t) => {
  const { game } = await fixture();
  t.after(() => game.close());
  const pilot = await player(game, 421),
    payer = await player(game, 422);
  assert.equal(requiredFixture(await act(game, pilot, 'airshipBoard', { price: null })).ok, false);
  assert.equal(coins(pilot), 25);
  assert.equal(requiredFixture(await act(game, pilot, 'airshipBoard', {}, 'stale')).ok, false);
  assert.equal(coins(pilot), 25);
  await act(game, pilot, 'airshipBoard');
  fly(game);
  payer.p.x = 0;
  assert.equal(requiredFixture(await act(game, payer, 'airshipRecall')).ok, false);
  atAgent(payer);
  for (const invalid of [
    { hp: 0 },
    { personalJailed: true },
    { detainAt: 1 },
    { bomberActive: true },
    { y: 30 },
    { instance: { kind: 'kraken' } },
    { mode: 'hidden' },
  ]) {
    const old = Object.fromEntries(Object.keys(invalid).map((k) => [k, Reflect.get(payer.p, k)]));
    Object.assign(payer.p, invalid);
    assert.equal(
      requiredFixture(await act(game, payer, 'airshipRecall')).ok,
      false,
      JSON.stringify(invalid),
    );
    Object.assign(payer.p, old);
  }
  for (const price of [0, 5, 15, -10, '10', null])
    assert.equal(requiredFixture(await act(game, payer, 'airshipRecall', { price })).ok, false);
  assert.equal(requiredFixture(await act(game, payer, 'airshipRecall', {}, 'stale')).ok, false);
  assert.equal(coins(payer), 25);
  payer.p.inventory.economy.state.coins = 9;
  assert.equal(requiredFixture(await act(game, payer, 'airshipRecall')).ok, false);
  assert.equal(coins(payer), 9);
  payer.p.inventory.economy.state.coins = 25;
  assert.equal(requiredFixture(await act(game, payer, 'airshipRecall')).ok, true);
  assert.equal(requiredFixture(await act(game, payer, 'airshipRecall')).ok, false);
  assert.equal(coins(payer), 15);
});

test('only the persisted hourly reset returns the next rental to 5 coins, including after downtime', async (t) => {
  const f = await fixture();
  let game = f.game;
  t.after(() => game.close());
  const pilot = await player(game, 431),
    payer = await player(game, 432);
  const deadline = ship(game).resetAt;
  await act(game, pilot, 'airshipBoard');
  fly(game);
  atAgent(payer);
  f.advance(AIRSHIP_RULES.resetIntervalMs - 1);
  game.tick(0.05);
  assert.equal(pilot.p.airship, true);
  assert.equal(ship(game).rentalPrice, 10);
  f.advance(1);
  game.tick(0.05);
  assert.equal(pilot.p.airship, false);
  assert.equal(pilot.p.y, 1.15);
  assert.equal(ship(game).resetAt, deadline + AIRSHIP_RULES.resetIntervalMs);
  assert.equal(ship(game).lastPrice, 0);
  assert.equal(ship(game).rentalPrice, 5);
  assert.equal(
    pilot.messages.filter(
      (m): m is Extract<typeof m, { type: 'airshipReset' }> =>
        m.type === 'airshipReset' && m.reason === 'hourly',
    ).length,
    1,
  );
  await act(game, pilot, 'airshipBoard');
  fly(game);
  assert.equal(requiredFixture(await act(game, payer, 'airshipRecall')).ok, true);
  const next = ship(game).resetAt;
  await game.close();
  let time = next - 1000;
  game = await createGame({
    geometry: fixtureGeometry(),
    store: f.store,
    now: () => time,
    allowDebug: true,
  });
  const again = await player(game, 432);
  atAgent(again);
  const status = await act(game, again, 'airshipStatus');
  assert.equal(requiredFixture(requiredFixture(status).airship).resetAt, next);
  assert.equal(requiredFixture(requiredFixture(status).airship).reservedForYou, false);
  assert.equal(requiredFixture(requiredFixture(status).airship).rentalPrice, 15);
  await game.close();
  time = next + 3 * AIRSHIP_RULES.resetIntervalMs + 100;
  game = await createGame({
    geometry: fixtureGeometry(),
    store: f.store,
    now: () => time,
    allowDebug: true,
  });
  assert.equal(ship(game).resetAt, next + 4 * AIRSHIP_RULES.resetIntervalMs);
  assert.equal(ship(game).rentalPrice, 5);
  assert.equal(ship(game).active, false);
});

test('a paid bid and price survive reconnect and restart without exposing the anonymous credential', async (t) => {
  const f = await fixture();
  let game = f.game;
  t.after(() => game.close());
  const pilot = await player(game, 441),
    payer = await player(game, 442);
  await act(game, pilot, 'airshipBoard');
  fly(game);
  atAgent(payer);
  assert.equal(requiredFixture(await act(game, payer, 'airshipRecall')).ok, true);
  await game.close();
  game = await createGame({
    geometry: fixtureGeometry(),
    store: f.store,
    now: () => 1001000,
    allowDebug: true,
  });
  const again = await player(game, 442);
  atAgent(again);
  const status = await act(game, again, 'airshipStatus');
  assert.equal(requiredFixture(requiredFixture(status).airship).reservedForYou, true);
  assert.equal(requiredFixture(requiredFixture(status).airship).reservedFor, again.p.id);
  assert.equal(requiredFixture(requiredFixture(status).airship).rentalPrice, 15);
  assert.equal(JSON.stringify(game.shared.snapshot()).includes(again.p.owner), false);
  atDock(again);
  assert.equal(requiredFixture(await act(game, again, 'airshipBoard', { price: 10 })).ok, true);
  assert.equal(coins(again), 15);
});
