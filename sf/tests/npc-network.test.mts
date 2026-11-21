import test from 'node:test';
import assert from 'node:assert/strict';
import { createNPCPresentation } from '../npc-network.ts';
import type { LifeActor } from '../life.ts';
import { createCityLife } from '../life.ts';
import { Mesh } from '../geometry.ts';
test('wilderness motion and gait interpolate between server snapshots and stop on disconnect', () => {
  let time = 0;
  const bear = { id: 'bear', x: 0, z: 0, base: 0, angle: 0, phase: 0, motion: 0 },
    net = createNPCPresentation({ npcs: [bear], now: () => time });
  net.sync([{ ...bear, motion: 1 }]);
  time = 100;
  net.sync([{ ...bear, x: 0.1, phase: 0.6 }]);
  assert.equal(bear.x, 0, 'receipt must not snap to the new position');
  time = 300;
  net.update(true);
  assert.ok(bear.x > 0 && bear.x < 0.1);
  assert.ok(bear.phase > 0 && bear.phase < 0.6);
  const paused = { x: bear.x, phase: bear.phase };
  time = 2000;
  net.update(false);
  assert.deepEqual({ x: bear.x, phase: bear.phase }, paused);
});
test('pedestrians and service NPCs share one snapshot clock and freeze together on disconnect', () => {
  let time = 0;
  const drawn: unknown[] = [],
    life = createCityLife({
      routes: [
        {
          name: 'promenade',
          kind: 'road',
          halfWidth: 0.5,
          points: [[0, 0] satisfies [number, number], [12, 0] satisfies [number, number]],
        },
      ],
      surfaceType: () => 'sidewalk',
      lamps: [],
      terrainHeight: () => 1,
      groundHeight: () => 1,
      scale: 1.5,
      human: (m, x, z) => drawn.push([x, z]),
      bicycle: () => {},
      maxWalkers: 1,
      maxRiders: 0,
      waterTraffic: false,
    });
  life.update(0);
  const pedestrian = life.people[0],
    merchant = {
      label: 'gpu-buyer',
      id: 'gpu-buyer',
      x: 2,
      z: 1,
      base: 1,
      angle: 0,
      phase: 0,
      motion: 0,
    },
    net = createNPCPresentation({ npcs: [pedestrian, merchant], lives: [life], now: () => time });
  const sample = (n: Pick<LifeActor, 'id'>) => ({
    id: n.id,
    x: 3,
    z: 2,
    base: 1,
    angle: 0,
    phase: 1,
    motion: 1,
    elapsed: 2,
  });
  net.sync([sample(pedestrian), sample(merchant)]);
  time = 250;
  net.update(true);
  const before = [pedestrian.x, merchant.x];
  life.update(5);
  life.draw(new Mesh(), 5000, [3, 2] satisfies [number, number], false);
  assert.deepEqual([pedestrian.x, merchant.x], before);
  assert.deepEqual(drawn[0], [3, 2] satisfies [number, number]);
  net.sync([
    { ...sample(pedestrian), x: 4 },
    { ...sample(merchant), x: 4 },
  ]);
  time = 300;
  net.update(true);
  const paused = [pedestrian.x, merchant.x];
  time = 10000;
  net.update(false);
  life.update(10);
  life.draw(new Mesh(), 10000, [3, 2] satisfies [number, number], false);
  assert.deepEqual([pedestrian.x, merchant.x], paused);
  assert.equal(paused[0], paused[1]);
  net.sync([sample(merchant)]);
  assert.equal(pedestrian.networkVisible, false);
});
