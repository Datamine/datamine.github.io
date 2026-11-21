import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { createEconomy, TRADE_PRICES } from '../economy.ts';
import {
  createFishing,
  FISHING_DURATION,
  drawFishingSpot,
  drawFishingRod,
  drawFishBucket,
} from '../fishing.ts';
import { configuredDialogue } from '../dialogue-config.ts';
import { drawCharacter, sampleCharacterPose } from '../characters.ts';

const site = { entry: { x: 2, y: 3 }, water: { x: 2.5, z: 1.5 }, base: 1 };
test('a timed catch fills exactly one live-fish slot, survives reload, and sells for five coins', () => {
  let saved;
  const purse = createEconomy({}, (s) => (saved = s)),
    fishing = createFishing(purse);
  assert.equal(purse.state.fish, 0);
  assert.ok(fishing.start(site).ok);
  assert.equal(fishing.start(site).ok, false);
  assert.equal(fishing.update(FISHING_DURATION - 0.01), null);
  assert.equal(purse.state.fish, 0);
  assert.ok(requiredFixture(fishing.update(0.01)).ok);
  assert.equal(purse.state.fish, 1);
  assert.equal(fishing.state.active, false);
  assert.equal(fishing.update(100), null);
  assert.equal(purse.trade('catch-fish').ok, false);
  assert.equal(fishing.start(site).ok, false);
  assert.equal(purse.state.fish, 1);
  const restored = createEconomy(saved),
    chef = configuredDialogue(
      'chef',
      {},
      { buyTinfoil: () => assert.fail('Selling fish must not buy tinfoil') },
    );
  assert.equal(restored.state.fish, 1);
  assert.equal(TRADE_PRICES.fish, 5);
  assert.ok(chef?.choices != null, 'Missing test fixture: chef.choices');
  assert.ok(restored.trade(requiredFixture(chef.choices[0].trade)).ok);
  assert.equal(restored.state.fish, 0);
  assert.equal(restored.state.coins, 30);

  assert.equal(restored.trade(requiredFixture(chef.choices[0].trade)).ok, false);
  assert.equal(restored.state.coins, 30);
  const again = createFishing(restored);
  assert.ok(again.start(site).ok);
  assert.ok(requiredFixture(again.update(FISHING_DURATION)).ok);

  assert.ok(restored.trade(requiredFixture(chef.choices[0].trade)).ok);
  assert.equal(restored.state.coins, 35);
});
test('paused and cancelled casts grant nothing, old saves start empty, and taxes keep the live fish', () => {
  const purse = createEconomy({ coins: 10 }),
    fishing = createFishing(purse);
  fishing.start(site);
  fishing.update(1);
  for (const dt of [0, -1, NaN, Infinity] satisfies [number, number, number, number])
    assert.equal(fishing.update(dt), null);
  assert.equal(fishing.state.elapsed, 1);
  fishing.cancel();
  assert.equal(fishing.update(10), null);
  assert.equal(purse.state.fish, 0);
  assert.ok(fishing.start(site).ok);
  for (let i = 0; i < 64; i++) fishing.update(0.05);
  assert.equal(purse.state.fish, 1);
  purse.trade('tax');
  assert.equal(purse.state.coins, 0);
  assert.equal(purse.state.fish, 1);
  assert.ok(purse.trade('fish-sale').ok);
  assert.equal(purse.state.coins, 5);
  for (const fish of [-1, NaN, Infinity, 1.5, '1'] satisfies [
    number,
    number,
    number,
    number,
    string,
  ])
    assert.equal(createEconomy({ fish }).state.fish, 0);
  assert.equal(
    createEconomy({ fish: 7 }).state.fish,
    1,
    'even a corrupted save cannot carry more than one fish',
  );
});
test('the chef, fishing pose, rod, live fish and carrying bucket have finite small meshes', () => {
  for (const progress of [0, 0.2, 0.5, 0.8, 1] satisfies [number, number, number, number, number]) {
    const m = new Mesh();
    drawFishingSpot(m, site, progress * 1000);
    drawFishingRod(m, { x: 2.5, z: 3.5, site }, 1, progress);
    drawFishBucket(m, 2, 1, 3, 0, progress * 3);
    drawCharacter(m, 0, 0, 0, 0, 0, false, '#b38c6d', '#e3e2d5', {
      chef: true,
      coat: true,
      backpack: false,
    });
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 10000);
    const pose = sampleCharacterPose('move', 0, { motion: 0, action: 'fish', actionT: progress });
    assert.ok([...pose.matrices, ...pose.joints].every(Number.isFinite));
  }
  const carry = sampleCharacterPose('move', 1.2, { motion: 1, carryingFish: true });
  assert.ok(
    Math.abs(carry.joints[6 * 3 + 1] - 0.86) < 1e-6,
    'the left hand holds the bucket handle while walking',
  );
});
