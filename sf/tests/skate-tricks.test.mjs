import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import {
  SKATE_TRICKS,
  createSkateTricks,
  sampleSkateTrick,
  drawPlayerSkateboard,
} from '../skateboard.js';
import { sampleCharacterPose } from '../characters.js';

test('skate tricks take off, rotate the board, and return to a level landing', () => {
  for (const trick of SKATE_TRICKS) {
    const start = sampleSkateTrick(trick.id, 0),
      end = sampleSkateTrick(trick.id, 1),
      mid = sampleSkateTrick(trick.id, 0.5);
    assert.equal(start.height, 0);
    assert.ok(Math.abs(end.height) < 1e-8);
    assert.ok(mid.height > 0.6);
    assert.ok(Math.abs(Math.sin(end.yaw)) < 1e-8 && Math.abs(Math.sin(end.roll)) < 1e-8);
    if (trick.id === 'kickflip') assert.ok(mid.roll > 2 && mid.roll < 4);
    if (trick.id === 'shove-it') assert.ok(mid.yaw > 2 && mid.yaw < 4);
    for (let frame = 0; frame <= 20; frame++) {
      const sample = sampleSkateTrick(trick.id, frame / 20),
        mesh = new Mesh();
      drawPlayerSkateboard(mesh, 0, 0, sample.height, 0, 0, () => 0, sample);
      assert.ok(mesh.data.every(Number.isFinite));
      assert.ok(mesh.data.length / 33 < 3000);
      const pose = sampleCharacterPose('skate', 0, {
        action: 'skate-trick',
        actionT: sample.progress,
        motion: 0,
      });
      assert.ok([...pose.matrices, ...pose.joints].every(Number.isFinite));
    }
  }
});
test('tricks cannot stack, pause cleanly with menus, and can be cancelled when dismounting', () => {
  const tricks = createSkateTricks();
  assert.equal(tricks.start('invalid'), false);
  for (const t of SKATE_TRICKS) {
    assert.equal(tricks.start(t.id), true);
    assert.equal(tricks.start(t.id), false);
    tricks.update(t.duration / 2);
    const before = tricks.pose;
    tricks.update(0);
    assert.deepEqual(tricks.pose, before);
    assert.equal(tricks.update(t.duration / 2 + 0.001), t.id);
    assert.equal(tricks.state.active, false);
    assert.equal(tricks.pose, null);
  }
  tricks.start('ollie');
  tricks.cancel();
  assert.equal(tricks.state.active, false);
  assert.equal(tricks.pose, null);
});
