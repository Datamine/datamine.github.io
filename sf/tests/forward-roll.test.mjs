import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { drawCharacter, sampleCharacterPose } from '../characters.js';
import {
  FORWARD_ROLL_DURATION,
  FORWARD_ROLL_SPEED,
  createForwardRoll,
  sampleForwardRoll,
  forwardRollTarget,
  applyForwardRollMesh,
} from '../forward-roll.js';

test('a forward roll is a single, cancellable three-quarter-second emote with a modest speed boost', () => {
  const roll = createForwardRoll();
  assert.equal(FORWARD_ROLL_SPEED, 1.18);
  assert.equal(FORWARD_ROLL_DURATION, 0.75);
  assert.ok(roll.start());
  assert.equal(roll.start(), false);
  roll.update(0.25);
  assert.ok(Math.abs(roll.progress - 1 / 3) < 1e-8);
  for (const dt of [0, -1, NaN, Infinity]) roll.update(dt);
  assert.ok(Math.abs(roll.progress - 1 / 3) < 1e-8);
  roll.update(0.5);
  assert.equal(roll.state.active, false);
  assert.equal(roll.progress, 1);
  roll.start();
  roll.update(0.1);
  roll.cancel();
  assert.equal(roll.state.active, false);
  assert.equal(roll.progress, 0);
  roll.start();
  for (let frame = 0; frame < 45; frame++) roll.update(1 / 60);
  assert.equal(roll.state.active, false);
});

test('the clip tucks before turning forward, completes one revolution, and returns to the standing rig', () => {
  assert.equal(sampleForwardRoll(0).pitch, 0);
  assert.equal(sampleForwardRoll(1).pitch, Math.PI * 2);
  assert.equal(sampleForwardRoll(0).tuck, 0);
  assert.equal(sampleForwardRoll(1).tuck, 0);
  assert.equal(sampleForwardRoll(0.5).tuck, 1);
  assert.ok(Math.abs(sampleForwardRoll(0.5).pitch - Math.PI) < 1e-8);
  const rest = sampleCharacterPose('idle', 0, { motion: 0, time: 0 }),
    joints = new Float32Array(rest.joints);
  const crouch = sampleCharacterPose('idle', 0, {
    motion: 0,
    time: 0,
    action: 'forward-roll',
    actionT: 0.5,
  });
  assert.ok(crouch.joints[1] < joints[1] - 0.2);
  assert.ok(crouch.joints[9 * 3 + 1] < joints[9 * 3 + 1]);
  const joint = (p, i) => Array.from(p.joints.slice(i * 3, i * 3 + 3)),
    distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  for (let frame = 0; frame <= 30; frame++) {
    const pose = sampleCharacterPose('idle', 0, {
      motion: 0,
      time: 0,
      action: 'forward-roll',
      actionT: frame / 30,
    });
    assert.ok(pose.matrices.every(Number.isFinite));
    for (const [bone, a, b] of [
      [4, 0.31, 0.275],
      [7, 0.31, 0.275],
      [10, 0.41, 0.38],
      [13, 0.41, 0.38],
    ]) {
      assert.ok(Math.abs(distance(joint(pose, bone), joint(pose, bone + 1)) - a) < 1e-5);
      assert.ok(Math.abs(distance(joint(pose, bone + 1), joint(pose, bone + 2)) - b) < 1e-5);
    }
  }
  for (const t of [0, 1])
    assert.deepEqual(
      sampleCharacterPose('idle', 0, { motion: 0, time: 0, action: 'forward-roll', actionT: t })
        .joints,
      joints,
    );
});

test('the roll stops before walls and water and cannot jump to clear ground across an obstruction', () => {
  const from = { x: 0, y: 0 },
    length = 4.6 * FORWARD_ROLL_SPEED * FORWARD_ROLL_DURATION,
    straight = forwardRollTarget(from, 0, length, () => true);
  assert.ok(Math.abs(straight.x - length) < 1e-8);
  assert.equal(straight.y, 0);
  const stopped = forwardRollTarget(from, 0, length, (_a, b) => b.x < 1.4);
  assert.ok(stopped.x < 1.4 && stopped.x > 1.2);
  assert.equal(
    forwardRollTarget(from, 0, length, () => false),
    null,
  );
  const gap = forwardRollTarget(from, 0, length, (_a, b) => b.x < 0.8 || b.x > 1.2);
  assert.ok(gap.x < 0.8);
  for (const bad of [0, -1, Infinity, NaN])
    assert.equal(
      forwardRollTarget(from, 0, bad, () => true),
      null,
    );
});

test('the native roll mesh rotates forward and stays grounded on slopes without changing topology or normal lengths', () => {
  const ground = (x, z) => 1 + x * 0.15 + z * 0.12,
    x = 3,
    z = 4,
    base = ground(x, z) + 0.07;
  for (const heading of [0, Math.PI / 4, Math.PI / 2, Math.PI])
    for (const t of [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 1]) {
      const m = new Mesh();
      m.box(-10, 0, -10, 1, 1, 1, '#ffffff');
      const start = m.data.length;
      drawCharacter(m, x, z, base, heading, 0, false, '#bd9369', '#707b4b', {
        mode: 'idle',
        motion: 0,
        time: 0,
        action: 'forward-roll',
        actionT: t,
        backpack: false,
      });
      const before = m.data.slice(),
        count = m.data.length;
      applyForwardRollMesh(m, start, x, base, z, heading, t, ground);
      assert.equal(m.data.length, count);
      assert.ok(m.data.every(Number.isFinite));
      assert.deepEqual(m.data.slice(0, start), before.slice(0, start));
      let lowest = Infinity;
      for (let i = start; i < m.data.length; i += 11) {
        lowest = Math.min(lowest, m.data[i + 1] - ground(m.data[i], m.data[i + 2]));
        assert.ok(
          Math.abs(
            Math.hypot(...m.data.slice(i + 3, i + 6)) - Math.hypot(...before.slice(i + 3, i + 6)),
          ) < 1e-6,
        );
      }
      assert.ok(Math.abs(lowest - 0.035) < 1e-6);
    }
});

test('the sea below a narrow bridge does not become the rolling character’s ground plane', () => {
  const z = 0.32,
    base = 5.07,
    ground = (_x, z) => (Math.abs(z) < 0.5 ? 5 : 0),
    walkable = (_x, z) => Math.abs(z) < 0.5;
  for (const t of [0.25, 0.5, 0.75]) {
    const m = new Mesh();
    drawCharacter(m, 0, z, base, 0, 0, false, '#bd9369', '#707b4b', {
      mode: 'idle',
      motion: 0,
      action: 'forward-roll',
      actionT: t,
    });
    applyForwardRollMesh(m, 0, 0, base, z, 0, t, ground, walkable);
    let low = Infinity,
      high = -Infinity;
    for (let i = 1; i < m.data.length; i += 11) {
      low = Math.min(low, m.data[i]);
      high = Math.max(high, m.data[i]);
    }
    assert.ok(Math.abs(low - 5.035) < 1e-6);
    assert.ok(high < 6.5);
  }
});
