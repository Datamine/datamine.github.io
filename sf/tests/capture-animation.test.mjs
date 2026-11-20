import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { sampleCharacterPose, drawCharacter } from '../characters.js';
import {
  CAPTURE_DURATION,
  createCaptureAnimation,
  collapseCharacterMesh,
} from '../capture-animation.js';

test('both encounters raise hands, collapse, hold, and only then transfer once', () => {
  for (const kind of ['police', 'tiger']) {
    const animation = createCaptureAnimation();
    let transfers = 0;
    assert.ok(animation.start(kind, 4, () => transfers++));
    assert.equal(
      animation.start(kind, 4, () => transfers++),
      false,
    );
    animation.update(0.5);
    assert.equal(animation.pose.hands, 1);
    assert.equal(animation.pose.fall, 0);
    assert.equal(transfers, 0);
    animation.update(1);
    assert.equal(animation.pose.fall, 1);
    assert.equal(transfers, 0);
    animation.update(0);
    assert.equal(animation.state.elapsed, 1.5);
    animation.update(CAPTURE_DURATION - 1.5);
    assert.equal(animation.state.active, false);
    assert.equal(transfers, 1);
    animation.update(10);
    assert.equal(transfers, 1);
    assert.ok(
      animation.start(kind, 4, () => transfers++),
      'the animation can play again after respawning',
    );
  }
});

test('surrender raises both hands over the head without stretching limbs', () => {
  for (let t = 0; t <= 1; t += 0.1) {
    const p = sampleCharacterPose('idle', 0, { motion: 0, action: 'caught', actionT: t }),
      joint = (i) => Array.from(p.joints.slice(i * 3, i * 3 + 3));
    for (const arm of [4, 7]) {
      const distance = (a, b) => Math.hypot(...joint(a).map((v, i) => v - joint(b)[i]));
      assert.ok(Math.abs(distance(arm, arm + 1) - 0.31) < 1e-5);
      assert.ok(Math.abs(distance(arm + 1, arm + 2) - 0.275) < 1e-5);
      if (t > 0.9) assert.ok(joint(arm + 2)[1] > joint(3)[1] + 0.05);
    }
  }
});

test('the collapse stays on the ground with finite geometry in every facing direction', () => {
  for (const heading of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
    for (const fall of [0, 0.25, 0.5, 0.75, 1]) {
      const mesh = new Mesh();
      drawCharacter(mesh, 0, 0, 0, heading, 0, false, undefined, undefined, {
        mode: 'idle',
        action: 'caught',
        actionT: 1,
      });
      collapseCharacterMesh(mesh, 0, 0, 0, 0, heading, fall);
      assert.ok(mesh.data.every(Number.isFinite));
      let low = Infinity,
        high = -Infinity;
      for (let i = 0; i < mesh.data.length; i += 11) {
        low = Math.min(low, mesh.data[i + 1]);
        high = Math.max(high, mesh.data[i + 1]);
      }
      assert.ok(low >= -0.03, 'the falling body must not sink into the ground');
      if (fall === 1) assert.ok(high < 0.6, 'the final pose must lie flat');
    }
});
