import { fixture, fixtureGeometry, player } from './fixtures.mts';
import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerMovement } from '../movement.mts';
import { createRegionalRoad } from '../../regional-road.ts';

test('the server clamps raw off-road destinations and never routes a Ferrari through pedestrian grass', async (t) => {
  const road = createRegionalRoad({
      route: [
        [0, 1, 0] satisfies [number, number, number],
        [20, 1, 0] satisfies [number, number, number],
        [20, 1, -20] satisfies [number, number, number],
      ],
    }),
    traffic = {
      nodes: [
        { x: 0, z: 0, neighbors: [1] },
        { x: 0, z: 10, neighbors: [0, 2] satisfies [number, number] },
        { x: 10, z: 10, neighbors: [1] },
      ],
      edges: [
        { from: 0, to: 1, length: 10, street: 'Test road' },
        { from: 1, to: 2, length: 10, street: 'Test road' },
      ],
    };
  const { game } = await fixture();
  t.after(() => game.close());
  const { p } = await player(game, 44001);
  Object.assign(p, {
    id: p.id,
    x: 0,
    z: 0,
    y: 1,
    hp: 30,
    phase: 0,
    angle: 0,
    profile: p.profile,
  });
  const players = new Map([[p.id, p]]);
  const geometry = {
    ...fixtureGeometry(),
    regionalRoad: road,
    streetTraffic: traffic,
    characterGround: () => 1,
    pathTo: () => assert.fail('driving must never consult pedestrian navigation'),
  };
  const movement = createServerMovement({
    geometry,
    routes: game.routes,
    players,
    send: () => {},
    dirty: () => {},
    now: () => 0,
    following: { ...game.following, stop: () => false, owns: () => false },
  });
  assert.equal(movement.activity(p, { mode: 'ferrari' }).ok, true);
  const result = movement.move(p, { x: 9, z: 9 });
  assert.deepEqual(result, { ok: true, goal: { x: 9, z: 10 } });
  for (
    let i = 0;
    i < 200 && requiredFixture(movement.state(p).ferrari).state.target !== null;
    i++
  ) {
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
  requiredFixture(movement.state(p).ferrari).refuel();
  for (let i = 0; i < 200; i++) {
    movement.tick(0.025);
    const car = movement.state(p).ferrari;
    if (requiredFixture(car).state.empty) requiredFixture(car).refuel();
    else if (requiredFixture(car).state.target === null) break;
  }
  assert.equal(p.x, 20);
  assert.equal(p.z, -8);
});
