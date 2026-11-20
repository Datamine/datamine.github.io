import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { createRegionalRoad } from '../regional-road.js';
import { createFerrari, FERRARI_SPEED, drawFerrari } from '../ferrari.js';
import { createStrength, STRENGTH_THRESHOLDS, STRENGTH_XP_RATE } from '../strength.js';
import { createEconomy } from '../economy.js';
import {
  drawTrainingSites,
  drawBenchPress,
  createHighwaySites,
  drawHighwaySites,
  ADVENTURE_SIGNS,
} from '../adventure-sites.js';

test('strength starts at 1, levels get harder, and level 10 takes twenty minutes of active training', () => {
  let saved;
  const gym = createStrength({}, (s) => (saved = s));
  assert.equal(gym.status.level, 1);
  assert.equal(gym.status.percent, 0);
  let previous = 0;
  for (let i = 1; i < STRENGTH_THRESHOLDS.length; i++) {
    const cost = STRENGTH_THRESHOLDS[i] - STRENGTH_THRESHOLDS[i - 1];
    assert.ok(cost > previous);
    previous = cost;
  }
  for (let second = 0; second < 1199; second++) gym.train(1);
  assert.equal(gym.status.level, 9);
  assert.ok(gym.status.percent > 99);
  gym.train(1);
  assert.equal(gym.status.level, 10);
  assert.equal(gym.status.percent, 0);
  assert.equal(createStrength(saved).status.level, 10);
  gym.train(100);
  assert.equal(gym.state.xp, 12000 + 100 * STRENGTH_XP_RATE);
  const idle = createStrength();
  idle.train(0);
  idle.train(-5);
  idle.train(NaN);
  assert.equal(idle.state.xp, 0);
});

test('Sand Hill funding requires level 10 and pays one thousand coins once across reloads', () => {
  const economy = createEconomy({ coins: 7 }),
    gym = createStrength();
  assert.equal(gym.claim(economy).ok, false);
  assert.equal(economy.state.coins, 7);
  gym.train(1200);
  assert.equal(gym.claim(economy).ok, true);
  assert.equal(economy.state.coins, 1007);
  assert.equal(gym.claim(economy).ok, false);
  assert.equal(createStrength(gym.state).claim(economy).ok, false);
  assert.equal(economy.state.coins, 1007);
});

test('a full Ferrari tank runs dry at the outbound pump at 56% and the return pump at 44%', () => {
  const road = createRegionalRoad(),
    car = createFerrari(road),
    money = createEconomy({ coins: 1000 });
  car.mount();
  assert.equal(FERRARI_SPEED, 4.6 * 20);
  assert.ok(car.trip > 2000);
  const outbound = car.stations.find((s) => s.id === 'fuel-outbound'),
    inbound = car.stations.find((s) => s.id === 'fuel-return');
  assert.ok(Math.abs((outbound.distance - car.dealer) / car.trip - 0.56) < 1e-10);
  assert.ok(Math.abs((inbound.distance - car.dealer) / car.trip - 0.44) < 1e-10);
  function advance(until) {
    for (let i = 0; i < 10000; i++) {
      const before = car.state.distance,
        event = car.update(1 / 60);
      assert.ok(Math.abs(car.state.distance - before) <= FERRARI_SPEED / 60 + 1e-8);
      assert.ok(car.state.fuel >= 0 && car.state.fuel <= 1);
      if (event === until) return;
    }
    assert.fail('drive did not finish');
  }
  let p = car.sample(car.length);
  car.driveTo(p.x, p.z);
  advance('empty');
  assert.ok(Math.abs(car.state.distance - outbound.distance) < 1e-6);
  assert.equal(car.state.fuel, 0);
  assert.equal(money.trade('extortion').ok, true);
  assert.equal(money.state.coins, 0);
  car.refuel();
  advance('arrived');
  assert.ok(Math.abs(car.state.distance - car.length) < 1e-6);
  car.refuel();
  p = car.sample(car.dealer);
  car.driveTo(p.x, p.z);
  advance('empty');
  assert.ok(Math.abs(car.state.distance - inbound.distance) < 1e-6);
  assert.equal(car.state.direction, -1);
  assert.equal(money.trade('extortion').ok, true, 'an empty purse must never soft-lock refueling');
  car.refuel();
  advance('arrived');
  assert.ok(Math.abs(car.state.distance - car.dealer) < 1e-6);
  car.refuel();
  assert.equal(car.state.fuel, 1);
  assert.equal(car.stations.filter((s) => !s.paid).length, 2);
});

test('parking and restoring a Ferrari retains position and gas without moving it off the road', () => {
  const road = createRegionalRoad();
  let saved;
  const car = createFerrari(road, {}, (s) => (saved = s));
  car.mount();
  const p = car.sample(car.length);
  car.driveTo(p.x, p.z);
  car.update(2);
  car.park();
  const restored = createFerrari(road, saved);
  assert.equal(restored.state.distance, car.state.distance);
  assert.equal(restored.state.fuel, car.state.fuel);
  assert.equal(restored.state.riding, false);
  assert.ok(road.contains(restored.position.x, restored.position.z));
});

test('Ferrari, highway amenities, and gym animation use finite bounded meshes', () => {
  const car = createFerrari(createRegionalRoad()),
    signs = new Map(
      ADVENTURE_SIGNS.map((s) => [
        s,
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ]),
    );
  for (const occupied of [false, true]) {
    const m = new Mesh();
    drawFerrari(m, car.position, { occupied, travel: 100 });
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 8000);
  }
  const m = new Mesh(),
    sites = [
      ...drawTrainingSites(m, signs),
      ...drawHighwaySites(m, car, createHighwaySites(car), signs),
    ];
  assert.ok(m.data.every(Number.isFinite));
  assert.equal(sites.length, 7);
  for (let t = 0; t < 3000; t += 125) {
    const bench = new Mesh();
    drawBenchPress(bench, t, { skin: '#bd9369', shirt: '#668599' });
    assert.ok(bench.data.every(Number.isFinite));
  }
});
