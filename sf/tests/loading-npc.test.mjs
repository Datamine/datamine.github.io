import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleLoadingNPC, createLoadingNPCMesh } from '../loading-npc.js';

const joint = (pose, id) => Array.from(pose.joints.subarray(id * 3, id * 3 + 3));
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test('the waiting cycle taps, checks a watch, wears and removes its hat, and sits before standing', () => {
  const idle = sampleLoadingNPC(0),
    tap = sampleLoadingNPC(0.175),
    watch = sampleLoadingNPC(4.9),
    worn = sampleLoadingNPC(10),
    seated = sampleLoadingNPC(15),
    standing = sampleLoadingNPC(17.7);
  assert.ok(joint(tap.pose, 15)[1] > joint(idle.pose, 15)[1] + 0.035);
  assert.ok(joint(watch.pose, 6)[1] > joint(idle.pose, 6)[1] + 0.3);
  assert.ok(worn.hat[1] > 1.7 && Math.abs(worn.hat[0]) < 0.01);
  assert.ok(sampleLoadingNPC(13.2).hat[1] < 0.8);
  assert.ok(joint(seated.pose, 0)[1] < joint(idle.pose, 0)[1] - 0.5);
  assert.ok(Math.abs(joint(standing.pose, 0)[1] - joint(idle.pose, 0)[1]) < 0.01);
  const before = sampleLoadingNPC(18 - 0.0001),
    after = sampleLoadingNPC(18 + 0.0001);
  assert.ok(distance(before.hat, after.hat) < 0.001);
  assert.ok(
    before.pose.joints.every((v, i) => Math.abs(v - after.pose.joints[i]) < 0.001),
    'the loop must not snap',
  );
});

test('waiting preserves the game rig limb lengths and stays within the small viewport geometry budget', () => {
  const mesh = createLoadingNPCMesh();
  for (let t = 0; t < 18; t += 0.17) {
    const { pose } = sampleLoadingNPC(t);
    assert.ok(pose.matrices.every(Number.isFinite));
    for (const [start, lengths] of [
      [4, [0.31, 0.275]],
      [7, [0.31, 0.275]],
      [10, [0.41, 0.38]],
      [13, [0.41, 0.38]],
    ])
      for (let k = 0; k < 2; k++)
        assert.ok(
          Math.abs(distance(joint(pose, start + k), joint(pose, start + k + 1)) - lengths[k]) <
            1e-5,
        );
  }
  for (const t of [0, 4.9, 8, 10, 12.5, 15, 17.7]) {
    const data = mesh(t).data;
    assert.ok(data.every(Number.isFinite));
    assert.ok(data.length / 33 > 1000 && data.length / 33 < 3000);
    for (let i = 0; i < data.length; i += 11) {
      assert.ok(Math.hypot(data[i], data[i + 2]) < 1.1);
      assert.ok(data[i + 1] > -0.04 && data[i + 1] < 2.25);
    }
  }
});
