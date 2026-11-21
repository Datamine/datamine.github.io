import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRSHIP_BASKET, createAirshipBasket } from '../airship-basket.ts';
import { createAirship } from '../airship.ts';

test('basket clicks invert the ship transform at every heading and reject the surrounding sky', () => {
  const basket = createAirshipBasket(),
    ship = { x: 80, y: 35, z: 110 };
  for (const heading of [0, 0.4, Math.PI / 2, Math.PI, Math.PI * 1.7] satisfies [
    number,
    number,
    number,
    number,
    number,
  ])
    for (const [x, z] of [
      [-1.2, 0] satisfies [number, number],
      [-2.7, -0.7] satisfies [number, number],
      [0.35, 0.7] satisfies [number, number],
    ]) {
      basket.reset(x, z);
      const p = basket.position(ship, heading),
        hit = basket.pick(
          {
            origin: [p.x, p.y + 10, p.z] satisfies [number, number, number],
            dir: [0, -1, 0] satisfies [number, number, number],
          },
          ship,
          heading,
        );
      assert.ok(hit);
      assert.ok(Math.abs(hit.x - x) < 1e-9);
      assert.ok(Math.abs(hit.z - z) < 1e-9);
      assert.equal(p.y, ship.y + AIRSHIP_BASKET.floor);
    }
  assert.equal(
    basket.pick(
      {
        origin: [80, 50, 120] satisfies [number, number, number],
        dir: [0, -1, 0] satisfies [number, number, number],
      },
      ship,
      0,
    ),
    null,
  );
  assert.equal(
    basket.pick(
      {
        origin: [80, 0, 110] satisfies [number, number, number],
        dir: [0, -1, 0] satisfies [number, number, number],
      },
      ship,
      0,
    ),
    null,
  );
  assert.equal(basket.walkTo(NaN, 0), false);
  assert.equal(basket.walkTo(20, 0), false);
});

test('walking spends a bounded distance, stays clear of the rim, and settles without drifting', () => {
  const basket = createAirshipBasket(),
    b = AIRSHIP_BASKET;
  for (const [x, z] of [
    [b.left, b.north] satisfies [number, number],
    [b.right, b.south] satisfies [number, number],
    [b.left, b.south] satisfies [number, number],
    [b.right, b.north] satisfies [number, number],
  ]) {
    assert.ok(basket.walkTo(x, z));
    let arrived = 0;
    for (let i = 0; i < 180; i++) {
      const before = { ...basket.state };
      if (basket.update(1 / 60)) arrived++;
      assert.ok(
        Math.hypot(basket.state.x - before.x, basket.state.z - before.z) <= 2.2 / 60 + 1e-9,
      );
      assert.ok(basket.state.x >= b.left + b.clearance && basket.state.x <= b.right - b.clearance);
      assert.ok(basket.state.z >= b.north + b.clearance && basket.state.z <= b.south - b.clearance);
    }
    assert.equal(arrived, 1);
    assert.equal(basket.state.target, null);
    assert.equal(basket.state.moving, false);
  }
  basket.walkTo(-1.2, 0);
  const before = { ...basket.state };
  basket.update(0);
  assert.equal(basket.state.x, before.x);
  assert.equal(basket.state.z, before.z);
});

test('flight and basket walking have independent destinations and carry the passenger through turns', () => {
  const ship = createAirship(),
    basket = createAirshipBasket();
  ship.board({ x: 83.7, y: 109.5 });
  for (let i = 0; i < 3000 && ship.state.phase === 'ascending'; i++) ship.update(1 / 60);
  ship.flyTo(100, 80);
  basket.walkTo(-2.5, 0.6);
  for (let i = 0; i < 120; i++) {
    ship.update(1 / 60);
    basket.update(1 / 60);
    const rider = basket.position(requiredFixture(ship.state.position), ship.state.heading);
    assert.ok(ship?.state?.position != null, 'Missing test fixture: ship.state.position');
    assert.ok(
      Math.abs(
        Math.hypot(rider.x - ship.state.position.x, rider.z - ship.state.position.z) -
          Math.hypot(basket.state.x, basket.state.z),
      ) < 1e-8,
    );
  }
  assert.deepEqual(ship.state.target, { x: 100, z: 80 });
  assert.equal(basket.state.target, null);
  const before = { ...ship.state.position };
  basket.walkTo(0.35, 0);
  basket.update(1);
  assert.deepEqual(ship.state.position, before, 'walking must not steer or translate the ship');
});
