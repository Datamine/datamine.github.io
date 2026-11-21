import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotMotion, createActorMotionGroup } from '../snapshot-motion.ts';
import { createPursuitPresentation } from '../pursuit-presentation.ts';

test('5 Hz server samples produce steady 60 Hz motion and gait despite delivery jitter', () => {
  let time = 0;
  const track = createSnapshotMotion({ now: () => time }),
    pending: { sent: number; arrival: number }[] = [];
  for (let i = 0; i <= 100; i++)
    pending.push({
      sent: i * 200,
      arrival:
        i * 200 +
        ([0, 30, 10, 45, 20, 0] satisfies [number, number, number, number, number, number])[i % 6],
    });
  let previous = null,
    frames = 0,
    maxStepError = 0;
  for (let frame = 0; frame <= 1170; frame++) {
    time = (frame * 1000) / 60;
    while (pending[0]?.arrival <= time) {
      const { sent } = requiredFixture(pending.shift());
      track.accept({ x: sent * 0.0046, z: 1, phase: sent * 0.0322, angle: 0, moving: true }, sent);
    }
    const p = track.sample();
    if (time < 600) continue;
    if (previous) {
      const distance = requiredFixture(requiredFixture(p).x) - requiredFixture(previous.x),
        expected = 4.6 / 60;
      maxStepError = Math.max(maxStepError, Math.abs(distance - expected));
      assert.ok(requiredFixture(requiredFixture(p).phase) > requiredFixture(previous.phase));
    }
    previous = p;
    frames++;
    assert.ok(track.size <= 8);
  }
  assert.ok(frames > 1100);
  assert.ok(maxStepError < 1e-10, 'no packet-sized position jumps or repeated frames');
});

test('sampling stops at the last known point, wraps angles and snaps teleports and reset clocks', () => {
  let time = 0;
  const track = createSnapshotMotion({ now: () => time });
  track.accept({ x: 0, z: 0, angle: Math.PI - 0.1, phase: 0, travel: 0 });
  time = 200;
  track.accept({ x: 1, z: 0, angle: -Math.PI + 0.1, phase: 1, travel: 1 });
  time = 350;
  const p = track.sample();
  assert.equal(requiredFixture(p).x, 0.5);
  assert.ok(Math.abs(requiredFixture(requiredFixture(p).angle) - Math.PI) < 1e-10);
  time = 1000;
  assert.equal(requiredFixture(track.sample()).x, 1, 'no guessed continuation through obstacles');
  track.accept({ x: 30, z: 0, angle: 0, travel: 2 });
  assert.equal(requiredFixture(track.sample()).x, 30);
  time = 1100;
  track.accept({ x: 31, z: 0, angle: 0, travel: 0 });
  assert.equal(requiredFixture(track.sample()).x, 31, 'respawn resets the gait clock');
  track.accept({ x: 5, z: 0 }, 1);
  assert.equal(
    requiredFixture(track.sample()).x,
    5,
    'reconnecting to an earlier clock cannot blend through the city',
  );
});

test('metadata applies immediately without mutating snapshots or restarting unchanged delta records', () => {
  let time = 0;
  const target: Partial<{ x: number; z: number; phase: number; hp: number }> = {},
    group = createActorMotionGroup({ now: () => time }),
    a = { x: 0, z: 0, phase: 0, hp: 20 },
    b = { x: 1, z: 0, phase: 1, hp: 10 };
  group.accept('bear', target, a, 0);
  time = 200;
  group.accept('bear', target, b, 200);
  assert.equal(target.hp, 10);
  assert.equal(target.x, 0);
  time = 350;
  group.update(true);
  assert.equal(target.x, 0.5);
  time = 400;
  group.accept('bear', target, b, 400);
  group.update(true);
  assert.equal(target.x, 0.75, 'unrelated deltas cannot slow an existing segment');
  const paused = target.x;
  time = 800;
  group.update(false);
  assert.equal(target.x, paused);
  assert.deepEqual(a, { x: 0, z: 0, phase: 0, hp: 20 });
  assert.deepEqual(b, { x: 1, z: 0, phase: 1, hp: 10 });
  group.retain(new Set());
  assert.equal(group.size, 0);
  time = 1000;
  group.update(true);
  assert.equal(target.x, paused);
});

function pursuitFixture(now: () => number) {
  const police: { state: import('../pursuit-presentation.ts').PoliceView } = {
      state: { officers: [] },
    },
    keeper: { state: import('../pursuit-presentation.ts').KeeperView } = { state: { actor: {} } },
    zoo: { state: import('../pursuit-presentation.ts').ZooView } = {
      state: { tiger: {}, wardens: [] },
    },
    raptor: import('../pursuit-presentation.ts').PursuitActorView = {};
  return {
    police,
    keeper,
    zoo,
    raptor,
    view: createPursuitPresentation({ police, keeper, zoo, raptor, now }),
  };
}
function chaseSample(x: number) {
  return {
    personal: {
      police: {
        wanted: true,
        jailed: false,
        elapsed: x,
        officers: [{ index: 0, x, y: 2, angle: 0, phase: x * 10 }],
      },
      keeper: {
        phase: 'chasing',
        elapsed: x,
        actor: { x, y: 3, angle: 0, travel: x, moving: true },
      },
    },
    world: {
      tiger: {
        phase: 'loose',
        gate: 1,
        elapsed: x,
        tiger: { x, y: 4, angle: 0, travel: x, moving: true },
        wardens: [{ index: 0, x, y: 5, angle: 0, travel: x, moving: true }],
      },
      raptor: { x, z: 6, angle: 0, phase: 'loose', hp: 50 },
    },
  };
}

test('police, tiger, animal control, zookeeper and raptor all move between authoritative snapshots', () => {
  let time = 0;
  const { view, police, keeper, zoo, raptor } = pursuitFixture(() => time),
    a = chaseSample(0),
    b = chaseSample(1),
    saved = structuredClone(b);
  view.syncPersonal(a.personal, 0);
  view.syncWorld(a.world, 0);
  time = 200;
  view.syncPersonal(b.personal, 200);
  view.syncWorld(b.world, 200);
  const actors = [
    police.state.officers[0],
    keeper.state.actor,
    zoo.state.tiger,
    zoo.state.wardens[0],
    raptor,
  ];
  assert.ok(
    actors.every((n) => n.x === 0),
    'a received packet cannot snap any pursuer',
  );
  for (time = 300; time <= 450; time += 1000 / 60) {
    view.update(true);
    assert.ok(actors.every((n) => Math.abs(requiredFixture(n.x) - (time - 250) / 200) < 1e-10));
  }
  const paused = actors.map((n) => n.x);
  time = 600;
  view.update(false);
  assert.deepEqual(
    actors.map((n) => n.x),
    paused,
  );
  assert.deepEqual(b, saved, 'render objects cannot mutate client world or personal snapshots');
  assert.equal(police.state.wanted, true);
  assert.equal(keeper.state.phase, 'chasing');
  assert.equal(raptor.hp, 50);
  view.syncPersonal({ police: { wanted: false, jailed: true, officers: [] } }, 600);
  assert.equal(police.state.officers.length, 0);
  assert.equal(police.state.jailed, true);
  view.clear();
  time = 1000;
  view.update(true);
  assert.equal(actors[0].x, paused[0], 'removed or reset tracks cannot keep moving');
});
