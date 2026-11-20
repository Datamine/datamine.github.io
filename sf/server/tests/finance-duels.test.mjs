import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, player, command, latestResult } from './fixtures.mjs';
import { DUEL_ARENA } from '../../duel-layout.js';
test('growth equity validates NPC proximity and backend-only ownership; checkpointed positions are ignored', async () => {
  const { game, geometry, advance } = await fixture(),
    a = await player(game, 1100, { 'sf-purse-v1': '{"coins":20000}' });
  try {
    await command(game, a.p, 'growthBuy', { amount: 1000 });
    assert.equal(latestResult(a.messages).ok, false);
    geometry.merchants.push(
      { id: 'capital-test', kind: 'capital', x: a.p.x, z: a.p.z, base: a.p.y },
      { id: 'broker-test', kind: 'stockbroker', x: a.p.x, z: a.p.z, base: a.p.y },
    );
    await command(game, a.p, 'growthBuy', { amount: 5000 });
    assert.ok(latestResult(a.messages).ok);
    await command(game, a.p, 'growthList');
    assert.ok(latestResult(a.messages).ok);
    assert.equal(a.p.inventory.economy.state.coins, 14750);
    advance(1000);
    game.tick(0.05);
    assert.ok(a.messages.some((m) => m.type === 'finance' && m.position?.phase === 'listed'));
    game.receive(a.p, { type: 'checkpoint', privateState: { 'sf-growth-v1': '{"cost":9999999}' } });
    await a.p.queue;
    assert.equal(game.finance.account(a.p).snapshot().cost, 5000);
    await game.flush();
    assert.equal((await game.store.get('player:' + a.p.owner)).growth.cost, 5000);
    await command(game, a.p, 'growthSell');
    assert.ok(latestResult(a.messages).ok);
    const coins = a.p.inventory.economy.state.coins;
    await command(game, a.p, 'growthSell');
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, coins);
  } finally {
    await game.close();
  }
});
const atArena = (p) =>
  Object.assign(p, { x: DUEL_ARENA.x, z: DUEL_ARENA.z, y: DUEL_ARENA.base + 0.24, mode: 'walk' });
test('two explicit matching consents settle one wager, persist both balances and reject duplicate claims', async () => {
  const { game, store } = await fixture(),
    a = await player(game, 1101, { 'sf-purse-v1': '{"coins":1000}' }),
    b = await player(game, 1102, { 'sf-purse-v1': '{"coins":1000}' });
  try {
    atArena(a.p);
    atArena(b.p);
    await command(game, a.p, 'duelOffer', { id: b.p.id, stake: 200 });
    assert.ok(latestResult(a.messages).ok);
    assert.equal(a.p.inventory.economy.state.coins, 1000);
    const offer = b.messages.find((m) => m.type === 'duelOffer').offer;
    await command(game, b.p, 'duelAccept', { offer: offer.id, stake: 199 });
    assert.equal(latestResult(b.messages).ok, false);
    await Promise.all([
      command(game, b.p, 'duelAccept', { offer: offer.id, stake: 200 }),
      command(game, a.p, 'duelAccept', { offer: offer.id, stake: 200 }),
    ]);
    assert.equal(a.p.inventory.economy.state.coins + b.p.inventory.economy.state.coins, 2000);
    assert.deepEqual(
      [a.p.inventory.economy.state.coins, b.p.inventory.economy.state.coins].sort((a, b) => a - b),
      [800, 1200],
    );
    assert.equal(a.messages.filter((m) => m.type === 'duelSettled').length, 1);
    assert.equal(
      (await store.get('player:' + a.p.owner)).privateState['sf-purse-v1'],
      JSON.stringify(a.p.inventory.economy.state),
    );
    await command(game, b.p, 'duelAccept', { offer: offer.id, stake: 200 });
    assert.equal(latestResult(b.messages).ok, false);
  } finally {
    await game.close();
  }
});
test('leaving the arena, disconnecting or changing the stake cancels safely; self-wagers and forged balances fail', async () => {
  const { game } = await fixture(),
    a = await player(game, 1103),
    b = await player(game, 1104);
  try {
    atArena(a.p);
    atArena(b.p);
    await command(game, a.p, 'duelOffer', { id: a.p.id, stake: 1 });
    assert.equal(latestResult(a.messages).ok, false);
    await command(game, a.p, 'duelOffer', { id: b.p.id, stake: 26 });
    assert.equal(latestResult(a.messages).ok, false);
    await command(game, a.p, 'duelOffer', { id: b.p.id, stake: 10 });
    const offer = b.messages.find((m) => m.type === 'duelOffer').offer;
    b.p.x = 0;
    game.tick(0.05);
    await command(game, b.p, 'duelAccept', { offer: offer.id, stake: 10 });
    assert.equal(latestResult(b.messages).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, 25);
    assert.equal(b.p.inventory.economy.state.coins, 25);
  } finally {
    await game.close();
  }
});
