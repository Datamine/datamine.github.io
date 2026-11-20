import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomy, TRADE_PRICES, MERCHANTS } from '../economy.js';
import { drawGPUFactory, drawBeachSand, GPU_FACTORY_SIGNS } from '../gpu-factory.js';
import { GPU_FACTORY } from '../gpu-layout.js';
import { Mesh } from '../geometry.js';
import { buildingNPCService } from '../building-interactions.js';

test('Ocean Beach sand stacks, survives reloads, and sells for exactly twenty coins per sack', () => {
  let saved;
  const e = createEconomy({}, (s) => (saved = s)),
    before = { ...e.state };
  assert.equal(e.trade('sand-sale').ok, false);
  assert.deepEqual(e.state, before);
  for (let i = 0; i < 3; i++) assert.equal(e.trade('collect-sand').ok, true);
  assert.equal(e.state.sand, 3);
  assert.equal(e.state.coins, 25);
  const restored = createEconomy(saved);
  assert.equal(restored.state.sand, 3);
  assert.equal(TRADE_PRICES.sand, 20);
  assert.equal(MERCHANTS['gpu-buyer'].choices[0].trade, 'sand-sale');
  for (let i = 0; i < 3; i++) {
    const coins = restored.state.coins;
    assert.equal(restored.trade('sand-sale').ok, true);
    assert.equal(restored.state.coins, coins + 20);
  }
  assert.equal(restored.state.sand, 0);
  assert.equal(restored.trade('sand-sale').ok, false);
  assert.equal(restored.state.coins, 85);
  for (const sand of [-1, '7', NaN, Infinity]) assert.equal(createEconomy({ sand }).state.sand, 0);
});
test('the factory is scenery with a distinct NPC service, not a building conversation proxy', () => {
  assert.equal(buildingNPCService({ kind: 'gpu-factory' }), 'gpu-buyer');
  assert.match(MERCHANTS['gpu-buyer'].intro, /Ocean Beach/);
  assert.equal(MERCHANTS['gpu-buyer'].repeat, true);
});
test('factory, roof glazing, cooling equipment and sand collection props use finite bounded geometry', () => {
  const m = new Mesh(),
    signs = new Map(
      GPU_FACTORY_SIGNS.map((s) => [
        s,
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ]),
    ),
    site = drawGPUFactory(m, signs, () => GPU_FACTORY.base);
  assert.ok(site.navigationPolygons.length >= 4);
  assert.deepEqual(site.entry, GPU_FACTORY.entry);
  drawBeachSand(m, { x: 0, z: 0 }, 0, signs);
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(m.data.length / 33 < 6000);
});
