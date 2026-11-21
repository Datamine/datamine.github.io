import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHumanNPCAnimator, drawHumanNPC } from '../human-npc.ts';
import { CHARACTER_CLIPS, sampleCharacterPose } from '../characters.ts';
import { Mesh } from '../geometry.ts';

const frame = 1000 / 60;
test('human NPC steps stay continuous and distance-driven despite packet gait resets', () => {
  const animation = createHumanNPCAnimator(),
    npc = { x: 0, z: 0, angle: 0, motion: 1, phase: 1 };
  let previous = animation.sample(npc, 0).phase;
  for (let i = 1; i <= 600; i++) {
    npc.x = (i * 0.8) / 60;
    if (i % 12 === 0) npc.phase = i % 24 === 0 ? 0 : 100;
    const sample = animation.sample(npc, i * frame);
    assert.ok(
      Math.abs(sample.phase - previous - ((0.8 / 60) * Math.PI * 2) / CHARACTER_CLIPS.walk.stride) <
        1e-10,
    );
    previous = sample.phase;
  }
});

test('stopping retains the stride and blends the whole pose to rest without snapping the feet', () => {
  const animation = createHumanNPCAnimator(),
    npc = { x: 0, z: 0, angle: 0, motion: 1, phase: 2 };
  animation.sample(npc, 0);
  for (let i = 1; i <= 60; i++) {
    npc.x = i / 60;
    animation.sample(npc, i * frame);
  }
  const moving = { ...animation.sample(npc, 1000) },
    before = sampleCharacterPose(moving.mode, moving.phase, moving);
  npc.motion = 0;
  npc.phase = 0;
  const stopping = { ...animation.sample(npc, 1000 + frame) },
    after = sampleCharacterPose(stopping.mode, stopping.phase, stopping);
  assert.equal(stopping.phase, moving.phase);
  assert.ok(stopping.motion > 0.7 && stopping.motion < 1);
  let jump = 0;
  for (let i = 0; i < before.joints.length; i++)
    jump = Math.max(jump, Math.abs(before.joints[i] - after.joints[i]));
  assert.ok(jump < 0.05, 'one-frame joint displacement: ' + jump);
  for (let i = 2; i <= 90; i++) animation.sample(npc, 1000 + i * frame);
  const resting = animation.sample(npc, 2600);
  assert.equal(resting.motion, 0);
  assert.equal(resting.phase, moving.phase);
});

test('turns take the short arc; teleports and reappearing NPCs do not generate giant strides', () => {
  const animation = createHumanNPCAnimator(),
    npc = { x: 0, z: 0, angle: Math.PI - 0.05, motion: 1, phase: 0 };
  animation.sample(npc, 0);
  npc.angle = -Math.PI + 0.05;
  npc.x = 0.01;
  const turn = { ...animation.sample(npc, frame) };
  assert.ok(Math.abs(turn.angle - (Math.PI - 0.05)) < 0.1);
  npc.x = 30;
  npc.phase = 0.3;
  assert.equal(animation.sample(npc, frame * 2).phase, 0.3);
  npc.x = 32;
  npc.phase = 0.5;
  assert.equal(animation.sample(npc, 2000).phase, 0.5);
});

test('seated actions, cycling, reduced motion, and source actor state survive the shared renderer', () => {
  const animation = createHumanNPCAnimator(),
    npc = Object.freeze({ x: 0, z: 0, angle: 0, motion: 1, phase: 1, seated: true });
  assert.equal(animation.sample(npc, 0, { mode: 'sit' }).motion, 0);
  const cyclist = { ...npc };
  assert.equal(animation.sample(cyclist, 0, { mode: 'cycle' }).motion, 1);
  assert.equal(animation.sample(cyclist, frame, { mode: 'cycle', reduced: true }).phase, 0);
  let drawn!: Parameters<typeof import('../characters.ts').drawCharacter>;
  drawHumanNPC(new Mesh(), npc, 0, {
    appearance: { mode: 'sit', action: 'talk', actionT: 0.4 },
    draw: (...args) => (drawn = args),
  });
  assert.ok(drawn != null, 'Missing test fixture: drawn');
  assert.equal(requiredFixture(drawn[9]).mode, 'sit');

  assert.equal(requiredFixture(drawn[9]).action, 'talk');

  assert.equal(requiredFixture(drawn[9]).actionT, 0.4);
  assert.equal(npc.phase, 1);
});

test('slow merchants retain a full stride and a roaming clerk can animate despite an old stationary flag', () => {
  const animation = createHumanNPCAnimator(),
    npc = { x: 0, z: 0, angle: 0, motion: 1, phase: 0, stationary: true, roam: {} };
  animation.sample(npc, 0);
  for (let i = 1; i <= 120; i++) {
    npc.x = (i * 0.48) / 60;
    animation.sample(npc, i * frame);
  }
  const pose = animation.sample(npc, 120 * frame);
  assert.equal(pose.motion, 1);
  assert.ok(Math.abs(pose.phase - (0.96 * Math.PI * 2) / CHARACTER_CLIPS.walk.stride) < 1e-10);
});
