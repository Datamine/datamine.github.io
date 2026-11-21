import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameMeter } from '../debug-console.ts';
import { actorLevel } from '../levels.ts';
import { createPlayerFollower } from '../player-follow.ts';

test('FPS uses actual rendered-frame time and resets after a hidden-tab gap', () => {
  const meter = createFrameMeter();
  for (let i = 0; i <= 120; i++) meter.sample((i * 1000) / 60);
  assert.ok(Math.abs(meter.fps - 60) < 0.01);
  meter.sample(10000);
  assert.equal(meter.fps, 0);
  for (let i = 1; i <= 30; i++) meter.sample(10000 + (i * 1000) / 30);
  assert.ok(Math.abs(meter.fps - 30) < 0.01);
  meter.reset();
  assert.equal(meter.fps, 0);
});
test('player level is actual strength and NPC types have stable distinct difficulty', () => {
  assert.equal(actorLevel({ networkPlayer: true, level: 7 }), 7);
  assert.equal(actorLevel({ label: 'Man' }), 1);
  assert.equal(actorLevel({ combatKind: 'cow' }), 2);
  assert.ok(actorLevel({ combatKind: 'raptor' }) > actorLevel({ combatKind: 'cow' }));
  assert.equal(actorLevel({ alienId: 'alien-civic' }), 6);
});
test('following replans at a bounded cadence and stops without teleporting at an unreachable route', () => {
  const self = { x: 0, y: 0, z: 0 },
    target = { x: 5, y: 0, z: 0, mode: 'walk' };
  let plans = 0,
    stops = 0,
    lastRoute: import('../types/geometry.ts').Point[] = [];
  const follow = createPlayerFollower({
    getSelf: () => self,
    getTarget: () => target,
    routeTo: () => {
      plans++;
      return [
        { x: 1, y: 0 },
        { x: 5, y: 0 },
      ];
    },
    setPath: (path) => (lastRoute = path),
    stopMoving: () => stops++,
  });
  follow.start(4);
  for (let i = 0; i < 60; i++) follow.update(1 / 60);
  assert.ok(plans <= 3);
  assert.equal(self.x, 0);
  assert.equal(lastRoute.length, 2);
  self.x = 4.5;
  follow.update(0.1);
  assert.ok(stops > 0);
  assert.equal(follow.state.target, 4);
  target.mode = 'hidden';
  follow.update(1.1);
  assert.equal(follow.state.target, null);
  const blocked = createPlayerFollower({
    getSelf: () => ({ x: 0, y: 0, z: 0 }),
    getTarget: () => ({ x: 8, y: 0, z: 0 }),
    routeTo: () => null,
    setPath: () => assert.fail('must not create a path through obstacles'),
    stopMoving: () => {},
  });
  blocked.start(5);
  blocked.update(0.1);
  assert.equal(blocked.state.target, null);
});
