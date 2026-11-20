import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomy } from '../economy.js';
import { createAirshipRope, drawAirshipRope } from '../airship-rope.js';
import { createSFCoast, shorelineSegments } from '../coastline.js';
import { createWhales } from '../wildlife.js';
import { Mesh } from '../geometry.js';
import { drawStartupHQ } from '../commerce-world.js';
import { RESTAURANTS, createRestaurantPatio } from '../restaurants.js';

test('equity and grain trades conserve inventory and never overdraw the purse', () => {
  const saved = [],
    e = createEconomy({}, (s) => saved.push(s));
  assert.deepEqual(e.state, {
    coins: 25,
    equity: 0,
    grain: 0,
    bouquets: 0,
    fuelCans: 0,
    fish: 0,
    sand: 0,
    saltLetters: 0,
    saltLettersDelivered: 0,
    ownedHats: [],
    ownedEquipment: [],
    iphoneOwned: false,
    iphoneEquipped: false,
    robotaxiOwned: false,
    incomeQuarters: 0,
    softwareCopies: 0,
  });
  assert.equal(e.trade('secondary').ok, false);
  assert.equal(e.state.coins, 25);
  assert.equal(e.trade('equity').ok, true);
  assert.deepEqual(e.state, {
    coins: 15,
    equity: 1,
    grain: 0,
    bouquets: 0,
    fuelCans: 0,
    fish: 0,
    sand: 0,
    saltLetters: 0,
    saltLettersDelivered: 0,
    ownedHats: [],
    ownedEquipment: [],
    iphoneOwned: false,
    iphoneEquipped: false,
    robotaxiOwned: false,
    incomeQuarters: 0,
    softwareCopies: 0,
  });
  assert.equal(e.trade('secondary').ok, true);
  assert.deepEqual(e.state, {
    coins: 35,
    equity: 0,
    grain: 0,
    bouquets: 0,
    fuelCans: 0,
    fish: 0,
    sand: 0,
    saltLetters: 0,
    saltLettersDelivered: 0,
    ownedHats: [],
    ownedEquipment: [],
    iphoneOwned: false,
    iphoneEquipped: false,
    robotaxiOwned: false,
    incomeQuarters: 0,
    softwareCopies: 0,
  });
  assert.equal(e.trade('grain').ok, true);
  assert.deepEqual(e.state, {
    coins: 34,
    equity: 0,
    grain: 1,
    bouquets: 0,
    fuelCans: 0,
    fish: 0,
    sand: 0,
    saltLetters: 0,
    saltLettersDelivered: 0,
    ownedHats: [],
    ownedEquipment: [],
    iphoneOwned: false,
    iphoneEquipped: false,
    robotaxiOwned: false,
    incomeQuarters: 0,
    softwareCopies: 0,
  });
  assert.equal(e.trade('feed').ok, true);
  assert.equal(e.trade('feed').ok, false);
  assert.equal(e.state.grain, 0);
  const restored = createEconomy(saved.at(-1));
  assert.deepEqual(restored.state, e.state);
  const poor = createEconomy({ coins: 0 });
  assert.equal(poor.trade('grain').ok, false);
  assert.equal(poor.trade('equity').ok, false);
  assert.equal(poor.state.coins, 0);
});

test('rope descent and ascent are smooth, reversible at the ends, and fares happen once', () => {
  const rope = createAirshipRope(),
    top = { x: 4, y: 26, z: 8 },
    bottom = { x: 4, y: 1, z: 8 };
  assert.ok(rope.deploy(top, bottom));
  assert.ok(!rope.deploy(top, bottom));
  assert.ok(rope.invite());
  assert.ok(!rope.invite());
  assert.ok(rope.climb(true));
  assert.ok(!rope.retract());
  let paid = 0,
    last = top.y;
  for (let i = 0; i < 1600; i++) {
    if (rope.update(1 / 60) === 'passenger-aboard') paid++;
    assert.ok(Math.abs(rope.state.position.y - last) <= 3 / 60 + 1e-8);
    last = rope.state.position.y;
  }
  assert.equal(paid, 1);
  assert.equal(rope.onGround, true);
  assert.deepEqual(rope.state.position, bottom);
  assert.ok(!rope.invite());
  assert.ok(rope.climb(false));
  for (let i = 0; i < 1000; i++) rope.update(1 / 60);
  assert.equal(rope.state.phase, 'hanging');
  assert.deepEqual(rope.state.position, top);
  assert.ok(rope.retract());
  const mesh = new Mesh();
  rope.reset();
  assert.equal(rope.state.passenger, null);
  rope.deploy(top, bottom);
  drawAirshipRope(mesh, rope.state, 0);
  assert.ok(mesh.data.every(Number.isFinite));
});

test('northeastern coast expands while retaining every terrain-triangle boundary', () => {
  const coast = createSFCoast(),
    segments = shorelineSegments(coast);
  assert.ok(coast.some(([x, z]) => x > 47.4 * 1.5 + 1.9 && z < 11.7 * 1.5 - 1.9));
  let length = 0;
  for (const [a, b] of segments) {
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const axis of [(p) => p[0], (p) => p[1], (p) => p[0] - p[1]]) {
      const lo = Math.min(axis(a), axis(b)),
        hi = Math.max(axis(a), axis(b));
      assert.ok(
        Math.floor((hi - 1e-7) / 0.25) - Math.floor((lo + 1e-7) / 0.25) <= 0,
        'a shoreline curtain must stay on one terrain face',
      );
    }
  }
  const perimeter = coast.reduce(
    (sum, p, i) =>
      sum +
      Math.hypot(p[0] - coast[(i + 1) % coast.length][0], p[1] - coast[(i + 1) % coast.length][1]),
    0,
  );
  assert.ok(Math.abs(length - perimeter) < 1e-6);
});

test('whales remain offshore, move smoothly, and use bounded reusable meshes', () => {
  const whales = createWhales();
  assert.equal(whales.count, 3);
  for (let i = 0; i < 3; i++)
    for (let t = 0; t < 300000; t += 1000) {
      const a = whales.sample(t, i),
        b = whales.sample(t + 16, i);
      assert.ok(a.x < 0);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.01);
    }
  const m = new Mesh();
  let count = 0;
  whales.draw(m, 0, [-9, 60], false, () => count++);
  assert.equal(count, 3);
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(m.data.length / 33 < 15000);
});

test('the startup house and Cotogna dining group produce complete pickable geometry', () => {
  const m = new Mesh(),
    house = drawStartupHQ(m);
  assert.ok(house.count > 0 && house.start === 0);
  assert.ok(m.data.every(Number.isFinite));
  const definition = RESTAURANTS.find((r) => r.id === 'cotogna'),
    site = { ...definition, x: 10, y: 10, object: { base: 1 }, sight: {} };
  const patio = createRestaurantPatio(new Mesh(), site);
  assert.equal(patio.diners.length, 2);
  assert.equal(patio.tables.length, 1);
  for (const p of patio.tables[0].footprint)
    assert.ok(p[0] > site.x + site.w / 2 + 0.3, 'leave the central restaurant door clear');
});
