import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrowthEquity } from '../growth-equity.js';
import { createEconomy } from '../economy.js';
test('growth purchases, listing fees, quotes and sales conserve principal without income multipliers', () => {
  let time = 10000;
  const economy = createEconomy({ coins: 20000, iphoneOwned: true, iphoneEquipped: true }),
    g = createGrowthEquity({ economy, now: () => time, random: () => 0.01 });
  assert.equal(g.buy(999).ok, false);
  assert.ok(g.buy(1000).ok);
  assert.ok(g.buy(5000).ok);
  assert.equal(g.snapshot().cost, 6000);
  assert.equal(economy.state.coins, 14000);
  assert.ok(g.list().ok);
  assert.equal(economy.state.coins, 13700);
  assert.equal(g.snapshot().value, 6000);
  time += 30000;
  g.update();
  assert.ok(g.snapshot().value > 7500);
  const quote = g.snapshot().value,
    r = g.sell();
  assert.ok(r.ok);
  assert.equal(economy.state.coins, 13700 + quote);
  assert.equal(g.snapshot(), null);
  assert.equal(g.sell().ok, false);
});
test('listed equity restores across visits, settles once on expiry and cannot forge a batch or sell private shares', () => {
  let time = 0,
    saved;
  const economy = createEconomy({ coins: 2000 }),
    g = createGrowthEquity({
      economy,
      now: () => time,
      onSave: (p) => (saved = p),
      random: () => 0.5,
    });
  assert.ok(g.buy(1000).ok);
  assert.equal(g.sell().ok, false);
  assert.ok(g.list().ok);
  time = 181000;
  const restored = createGrowthEquity({ saved, economy, now: () => time, random: () => 0.5 });
  restored.update();
  assert.equal(restored.snapshot(), null);
  const coins = economy.state.coins;
  restored.update();
  assert.equal(economy.state.coins, coins);
  assert.ok(coins >= 1350 && coins <= 2750);
});
