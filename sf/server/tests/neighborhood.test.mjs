import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command, latestResult } from './fixtures.mjs';
import { makeNeighborhoodBench } from '../../neighborhood-interactions.js';
import { worldRecord, worldPatch, applyWorldPatches } from '../../world-deltas.js';

async function setup() {
  const geometry = fixtureGeometry(),
    bench = makeNeighborhoodBench({
      id: 'test-bench',
      x: 94,
      z: 120,
      base: 1.15,
      height: 0.43,
      start: 0,
      count: 0,
    });
  geometry.sights = [bench];
  geometry.landClearAt = (x, y) => Math.hypot(x + 0.5 - bench.seat.x, y + 0.5 - bench.seat.z) > 0.3;
  geometry.merchants = [
    { id: 'tea', x: 92.2, z: 120, base: 1.15, neighborhoodService: 'tea' },
    { id: 'flowers', x: 92.2, z: 120, base: 1.15, neighborhoodService: 'flowers' },
    { id: 'books', x: 92.2, z: 120, base: 1.15, neighborhoodService: 'books' },
    { id: 'jurassic-scientist', x: 92.2, z: 120, base: 1.15 },
  ];
  const game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 });
  return { game, geometry, bench };
}

test('shopkeepers validate proximity, prices and options; tea heals and sobers, bouquets persist and books are free', async () => {
  const { game } = await setup(),
    a = await player(game, 28100, { 'sf-purse-v1': '{"coins":5}', 'sf-inebriation-v1': '40' });
  try {
    a.p.hp = 10;
    await command(game, a.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'tea',
      offer: 'jasmine',
      price: 0,
    });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.hp, 15);
    assert.equal(a.p.inventory.economy.state.coins, 4);
    assert.equal(game.personal.runtime(a.p).inebriation.state.percent, 30);
    await command(game, a.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'flowers',
      offer: 'bouquet',
    });
    assert.equal(a.p.inventory.economy.state.coins, 2);
    assert.equal(a.p.inventory.economy.state.bouquets, 1);
    await command(game, a.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'books',
      offer: 'garden',
    });
    assert.match(latestResult(a.messages).message, /conversation with the weather/);
    assert.equal(a.p.inventory.economy.state.coins, 2);
    await command(game, a.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'tea',
      offer: 'forged',
    });
    assert.equal(latestResult(a.messages).ok, false);
    a.p.x += 20;
    await command(game, a.p, 'playerAction', {
      verb: 'neighborhoodService',
      id: 'flowers',
      offer: 'bouquet',
    });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, 2);
    await game.flush();
    const saved = await game.store.get('player:' + a.p.owner);
    assert.equal(JSON.parse(saved.privateState['sf-purse-v1']).bouquets, 1);
  } finally {
    await game.close();
  }
});

test('benches have exclusive server-owned seated poses, double sobering and a safe walkable exit', async () => {
  const { game, bench, geometry } = await setup(),
    a = await player(game, 28101, { 'sf-inebriation-v1': '40' }),
    b = await player(game, 28102);
  try {
    for (const person of [a, b])
      Object.assign(person.p, { x: bench.entry.x + 0.5, z: bench.entry.y + 0.5 });
    await command(game, a.p, 'activity', { mode: 'sit', seat: bench.id });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.mode, 'bench');
    assert.equal(a.p.x, bench.seat.x);
    assert.equal(a.p.angle, bench.seat.angle);
    await command(game, b.p, 'activity', { mode: 'sit', seat: bench.id });
    assert.equal(latestResult(b.messages).ok, false);
    game.tick(3);
    assert.equal(game.personal.runtime(a.p).inebriation.state.percent, 38);
    assert.equal(a.p.x, bench.seat.x);
    const saved = game.movement.savePosition(a.p, {});
    assert.ok(geometry.landClearAt(saved.x - 0.5, saved.z - 0.5));
    await command(game, a.p, 'moveTo', { x: 98, z: 123 });
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.seat, null);
    game.tick(0.5);
    assert.equal(a.p.mode, 'walk');
    assert.ok(geometry.landClearAt(a.p.x - 0.5, a.p.z - 0.5));
    await command(game, b.p, 'activity', { mode: 'sit', seat: bench.id });
    assert.equal(latestResult(b.messages).ok, true);
    await command(game, b.p, 'activity', { mode: 'walk' });
    assert.equal(b.p.seat, null);
  } finally {
    await game.close();
  }
});

test('raptor remains survive the compact world channel as shared loot and advance the personal recovery quest durably', async () => {
  const { game } = await setup(),
    a = await player(game, 28103);
  try {
    await command(game, a.p, 'playerAction', { verb: 'startRaptor' });
    assert.equal(latestResult(a.messages).ok, true);
    Object.assign(game.shared.raptor, {
      phase: 'loose',
      hp: 1,
      x: a.p.x + 0.5,
      z: a.p.z,
      path: [],
    });
    await command(game, a.p, 'attack', { id: game.shared.raptor.id, weapon: 'railgun' });
    assert.equal(latestResult(a.messages).ok, true);
    const item = [...game.shared.loot.values()].find((n) => n.lootKind === 'raptor');
    assert.ok(item);
    const packed = worldPatch(item.id, worldRecord('loot', item)),
      decoded = applyWorldPatches({}, { loot: [packed] }).loot[0];
    assert.equal(decoded.network, true);
    await command(
      game,
      a.p,
      decoded.network ? 'collect' : 'playerAction',
      decoded.network ? { id: decoded.id } : { verb: 'collectPersonal', id: decoded.id },
    );
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(game.personal.runtime(a.p).expeditions.state.raptor, 'carrying');
    assert.equal(game.shared.loot.has(item.id), false);
    await game.flush();
    const saved = await game.store.get('player:' + a.p.owner);
    assert.equal(JSON.parse(saved.privateState['sf-expeditions-v1']).raptor, 'carrying');
  } finally {
    await game.close();
  }
});
