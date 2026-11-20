import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientControllerFactory } from '../client/controllers.js';
import { createEconomy } from '../economy.js';
import { createMultiplayerInventory } from '../multiplayer-inventory.js';
import { interpolateGamePresentation } from '../multiplayer-actions.js';
test('online purchases cannot change local money or HP before the server receipt', async () => {
  const source = createEconomy({ coins: 25 }),
    listeners = [];
  let resolve, request;
  const client = {
      state: {},
      command: (action, args) => {
        request = { action, args };
        return new Promise((r) => (resolve = r));
      },
      subscribe: (fn) => listeners.push(fn),
    },
    economy = createClientControllerFactory({ client })('economy', source),
    deli = { state: {} },
    health = { state: { hp: 10 } };
  createMultiplayerInventory({
    client,
    economy,
    deli,
    health,
    apply: (s) => Object.assign(economy.state, s.purse),
    announce: () => {},
  });
  const result = economy.trade('equity');
  assert.equal(result.pending, true);
  assert.equal(economy.state.coins, 25);
  assert.equal(economy.state.equity, 0);
  assert.deepEqual(request, { action: 'inventory', args: { op: 'trade', kind: 'equity' } });
  assert.equal(economy.credit(1000).ok, false);
  assert.equal(economy.state.coins, 25);
  listeners[0]({
    type: 'inventory',
    inventory: { purse: { ...economy.state, coins: 15, equity: 1 } },
  });
  resolve({ ok: true });
  await result.promise;
  assert.equal(economy.state.coins, 15);
  assert.equal(economy.state.equity, 1);
  assert.equal(health.state.hp, 10);
});
test('presentation interpolation smooths server poses without mutating either snapshot', () => {
  const a = {
      rocket: { phase: 'cruising', position: { x: 0, y: 20, z: 4 }, heading: Math.PI - 0.1 },
    },
    b = {
      rocket: { phase: 'cruising', position: { x: 10, y: 24, z: 6 }, heading: -Math.PI + 0.1 },
    };
  const middle = interpolateGamePresentation(a, b, 0.5);
  assert.deepEqual(middle.rocket.position, { x: 5, y: 22, z: 5 });
  assert.ok(Math.abs(middle.rocket.heading - Math.PI) < 1e-8);
  assert.equal(a.rocket.position.x, 0);
  assert.equal(b.rocket.position.x, 10);
  assert.deepEqual(interpolateGamePresentation(b, { rocket: null }, 0.5), { rocket: null });
});
