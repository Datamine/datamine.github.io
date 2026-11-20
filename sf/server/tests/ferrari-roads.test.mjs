import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerMovement } from '../movement.mjs';
import { createRegionalRoad } from '../../regional-road.js';

test('the server clamps raw off-road destinations and never routes a Ferrari through pedestrian grass', () => {
  const road = createRegionalRoad({
      route: [
        [0, 1, 0],
        [20, 1, 0],
        [20, 1, -20],
      ],
    }),
    traffic = {
      nodes: [
        { x: 0, z: 0, neighbors: [1] },
        { x: 0, z: 10, neighbors: [0, 2] },
        { x: 10, z: 10, neighbors: [1] },
      ],
      edges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
      ],
    };
  const p = {
      id: 'driver',
      x: 0,
      z: 0,
      y: 1,
      hp: 30,
      phase: 0,
      angle: 0,
      profile: { privateState: {} },
    },
    players = new Map([[p.id, p]]);
  const geometry = {
    regionalRoad: road,
    streetTraffic: traffic,
    characterGround: () => 1,
    pathTo: () => assert.fail('driving must never consult pedestrian navigation'),
  };
  const movement = createServerMovement({
    geometry,
    players,
    send: () => {},
    dirty: () => {},
    now: () => 0,
    following: { stop: () => {}, owns: () => false },
  });
  assert.equal(movement.activity(p, { mode: 'ferrari' }).ok, true);
  const result = movement.move(p, { x: 9, z: 9 });
  assert.deepEqual(result, { ok: true, goal: { x: 9, z: 10 } });
  for (let i = 0; i < 200 && movement.state(p).ferrari.state.target !== null; i++) {
    movement.tick(0.025);
    assert.ok(
      road.contains(p.x, p.z) ||
        (Math.abs(p.x) < 1e-8 && p.z >= 0 && p.z <= 10) ||
        (Math.abs(p.z - 10) < 1e-8 && p.x >= 0 && p.x <= 10),
      'the server pose must stay on streets',
    );
  }
  assert.equal(p.x, 9);
  assert.equal(p.z, 10);
  assert.equal(movement.move(p, { x: 25, z: -8 }).ok, true);
  movement.state(p).ferrari.refuel();
  for (let i = 0; i < 200; i++) {
    movement.tick(0.025);
    const car = movement.state(p).ferrari;
    if (car.state.empty) car.refuel();
    else if (car.state.target === null) break;
  }
  assert.equal(p.x, 20);
  assert.equal(p.z, -8);
});
