import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { sampleCharacterPose } from '../characters.ts';
import {
  GYM_EXERCISES,
  gymExercise,
  drawGymExercise,
  gymExercisePosition,
} from '../gym-exercises.ts';
import { SF_FITNESS, gymWalkable } from '../southern-layout.ts';

test('all four exercises have safe positions, distinct animated geometry, and stationary reduced-motion poses', () => {
  assert.deepEqual(
    GYM_EXERCISES.map((e) => e.id),
    ['bench', 'curls', 'squats', 'press'] satisfies [string, string, string, string],
  );
  const signatures: string[] = [];
  for (const e of GYM_EXERCISES) {
    const p = gymExercisePosition(e.id);
    assert.ok(gymWalkable(p.x, p.z));
    const a = new Mesh(),
      b = new Mesh(),
      still = new Mesh(),
      later = new Mesh();
    drawGymExercise(a, e.id, 0, {});
    drawGymExercise(b, e.id, 800, {});
    drawGymExercise(still, e.id, 0, {}, { reduced: true });
    drawGymExercise(later, e.id, 800, {}, { reduced: true });
    assert.ok(a.data.every(Number.isFinite));
    assert.ok(b.data.every(Number.isFinite));
    assert.notDeepEqual(a.data, b.data, e.label + ' must animate');
    assert.deepEqual(still.data, later.data);
    assert.ok(a.data.length / 33 < 6000);
    signatures.push(JSON.stringify(a.data));
    if (e.id !== 'bench')
      for (let i = 0; i < a.data.length; i += 11) {
        assert.ok(a.data[i + 1] >= SF_FITNESS.base, 'feet and weights must stay above the floor');
        assert.ok(Math.abs(a.data[i] - SF_FITNESS.x) < 2, 'the weights must stay inside the gym');
      }
  }
  assert.equal(new Set(signatures).size, 4);
  assert.equal(gymExercise('unknown').id, 'bench');
});

test('curls, squats, and presses preserve arm and leg lengths through the entire rep', () => {
  for (const action of ['curl', 'squat', 'press'] satisfies [string, string, string])
    for (let time = 0; time < Math.PI * 2; time += 0.1) {
      const p = sampleCharacterPose('idle', 0, { action, time }),
        joint = (i: number) => p.joints.slice(i * 3, i * 3 + 3),
        distance = (a: number, b: number) => Math.hypot(...joint(a).map((v, i) => v - joint(b)[i]));
      assert.ok(p.matrices.every(Number.isFinite));
      for (const arm of [4, 7] satisfies [number, number]) {
        assert.ok(Math.abs(distance(arm, arm + 1) - 0.31) < 1e-5);
        assert.ok(Math.abs(distance(arm + 1, arm + 2) - 0.275) < 1e-5);
      }
      for (const leg of [10, 13] satisfies [number, number]) {
        assert.ok(Math.abs(distance(leg, leg + 1) - 0.41) < 1e-5);
        assert.ok(Math.abs(distance(leg + 1, leg + 2) - 0.38) < 1e-5);
      }
    }
});
