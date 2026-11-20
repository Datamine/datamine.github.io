import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegionalRoad } from '../regional-road.js';
import { createFerrari } from '../ferrari.js';
import { createFerrariCityRoads } from '../ferrari-roads.js';

export function roadFixture() {
  const road = createRegionalRoad({
    route: [
      [0, 1, 0],
      [20, 2, 0],
      [20, 3, -20],
      [40, 4, -20],
    ],
  });
  // An L-shaped city road and an isolated road across an otherwise walkable park.
  const traffic = {
    nodes: [
      { x: 0, z: 0, neighbors: [1] },
      { x: 0, z: 10, neighbors: [0, 2] },
      { x: 10, z: 10, neighbors: [1] },
      { x: 8, z: 5, neighbors: [4] },
      { x: 10, z: 5, neighbors: [3] },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 3, to: 4 },
    ],
  };
  const cityDriving = createFerrariCityRoads({ road, traffic, ground: () => 1 });
  return { road, traffic, cityDriving };
}
function finish(car, cityDriving, road) {
  for (let i = 0; i < 1000; i++) {
    const result = car.update(0.025),
      p = car.position;
    assert.ok(
      cityDriving.contains(p.x, p.z) || road.contains(p.x, p.z),
      'every simulated position must remain on a road',
    );
    if (result === 'arrived') return;
    if (result === 'empty') car.refuel();
  }
  assert.fail('drive did not finish');
}
test('off-road clicks select the closest connected city road or regional centerline', () => {
  const { road, cityDriving } = roadFixture(),
    car = createFerrari(road, {}, () => {}, { cityDriving });
  assert.equal(car.destinationFor(NaN, 0), null);
  assert.deepEqual(
    [car.destinationFor(9, 5.1).x, car.destinationFor(9, 5.1).z],
    [9, 10],
    'an isolated street cannot strand the car',
  );
  assert.deepEqual([car.destinationFor(25, -8).x, car.destinationFor(25, -8).z], [20, -8]);
  assert.deepEqual(
    [car.destinationFor(200, -30).x, car.destinationFor(200, -30).z],
    [40, -20],
    'clicks beyond the map snap to a road endpoint',
  );
});
test('city drives follow street adjacency rather than cutting diagonally across grass', () => {
  const { road, cityDriving } = roadFixture(),
    car = createFerrari(road, {}, () => {}, { cityDriving });
  car.mount();
  assert.equal(car.driveTo(10, 9), true);
  assert.deepEqual(car.state.destination, { x: 10, y: 1, z: 10 });
  assert.ok(
    car.state.localPath.some((p) => p.x === 0 && p.z === 10),
    'keep the corner instead of taking a pedestrian shortcut',
  );
  finish(car, cityDriving, road);
  assert.equal(car.position.x, 10);
  assert.equal(car.position.z, 10);
  car.refuel();
  assert.equal(car.driveTo(25, -18), true);
  finish(car, cityDriving, road);
  assert.equal(car.position.x, 25);
  assert.equal(car.position.z, -20);
  assert.equal(car.state.localPosition, null);
});
test('highway travel and repeated off-road clicks retain road bends in both directions', () => {
  const { road, cityDriving } = roadFixture(),
    car = createFerrari(road, {}, () => {}, { cityDriving });
  car.mount();
  for (const [x, z] of [
    [200, -40],
    [18, -8],
    [31, -16],
    [2, 3],
    [-80, 18],
  ]) {
    car.refuel();
    assert.equal(car.driveTo(x, z), true);
    const goal = { ...car.state.destination };
    finish(car, cityDriving, road);
    assert.ok(Math.hypot(car.position.x - goal.x, car.position.z - goal.z) < 1e-7);
  }
});
test('a saved off-road car migrates onto the road without changing its gas', () => {
  const { road, cityDriving } = roadFixture();
  let saved;
  const car = createFerrari(
    road,
    { owned: true, fuel: 0.37, localPosition: { x: 7, y: 1, z: 8, angle: 0 } },
    (s) => (saved = s),
    { cityDriving },
  );
  assert.deepEqual([car.position.x, car.position.z], [7, 10]);
  assert.equal(car.state.fuel, 0.37);
  car.mount();
  car.park();
  const restored = createFerrari(road, saved, () => {}, { cityDriving });
  assert.deepEqual(restored.position, car.position);
  assert.equal(restored.state.fuel, 0.37);
});
test('lazy city graph initialization preserves a parked car until streets are ready', () => {
  const { road, traffic } = roadFixture();
  let current = null;
  const cityDriving = createFerrariCityRoads({ road, traffic: () => current, ground: () => 1 }),
    car = createFerrari(road, { localPosition: { x: 7, y: 1, z: 8, angle: 0 } }, () => {}, {
      cityDriving,
    });
  assert.equal(car.position.z, 8);
  current = traffic;
  assert.equal(car.position.z, 10);
  assert.equal(car.position.x, 7);
});
