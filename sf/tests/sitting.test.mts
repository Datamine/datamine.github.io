import { createEconomy } from '../economy.ts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInebriation } from '../inebriation.ts';
import { createSocialBusiness } from '../sales-conference.ts';
import { sampleCharacterPose, drawCharacter } from '../characters.ts';
import { Mesh } from '../geometry.ts';
import { encodePlayerFrame, decodePlayerFrame } from '../multiplayer-protocol.ts';

test('resting doubles sobering without accelerating Twitter inebriation or going below zero', () => {
  const standing = createInebriation(40),
    resting = createInebriation(40);
  standing.update(3);
  resting.update(3, { sitting: true });
  assert.equal(standing.state.percent, 39);
  assert.equal(resting.state.percent, 38);
  resting.update(1.5, { sitting: true });
  assert.equal(resting.state.percent, 37);
  resting.update(1000, { sitting: true });
  assert.equal(resting.state.percent, 0);
  resting.update(3, { gainPerSecond: 3, sitting: true });
  assert.equal(resting.state.percent, 9);
  const social = createSocialBusiness({ inebriation: standing, economy: createEconomy() });
  social.update(3, { sitting: true });
  assert.equal(standing.state.percent, 37);
});

test('sitting lowers the hips smoothly, folds the knees and keeps animated meshes and limb lengths valid', () => {
  let previous = Infinity;
  for (let sitBlend = 0; sitBlend <= 1.0001; sitBlend += 0.05) {
    const p = sampleCharacterPose('rest', 0, { sitBlend, time: 1 }),
      joint = (i: number) => p.joints.slice(i * 3, i * 3 + 3),
      distance = (a: number, b: number) => Math.hypot(...joint(a).map((v, i) => v - joint(b)[i]));
    assert.ok(p.joints[1] <= previous + 1e-5);
    previous = p.joints[1];
    assert.ok(p.matrices.every(Number.isFinite));
    for (const leg of [10, 13] satisfies [number, number]) {
      assert.ok(Math.abs(distance(leg, leg + 1) - 0.41) < 1e-5);
      assert.ok(Math.abs(distance(leg + 1, leg + 2) - 0.38) < 1e-5);
      assert.ok(joint(leg + 2)[1] > 0.09);
    }
    const m = new Mesh();
    drawCharacter(m, 0, 0, 0, 0.6, 0, false, '#bd9369', '#707b4b', {
      mode: 'rest',
      sitBlend,
      time: 1,
      backpack: false,
    });
    assert.ok(m.data.every(Number.isFinite));
  }
  assert.ok(previous < 0.25);
  const seated = sampleCharacterPose('rest', 0),
    standing = sampleCharacterPose('idle', 0);
  assert.ok(standing.joints[1] - seated.joints[1] > 0.6);
  assert.ok(seated.joints[11 * 3 + 1] > 0.25, 'knees bend above the ground');
});

test('compact player frames preserve the seated mode without adding packet bytes', () => {
  const p = {
    id: 1,
    x: 2,
    y: 1,
    z: 3,
    angle: 0,
    phase: 0,
    motion: 0,
    mode: 'sit',
    hp: 30,
    max: 30,
    level: 1,
  };
  const frame = encodePlayerFrame([p], 1, 1000);
  assert.equal(frame.byteLength, 44);
  assert.equal(requiredFixture(decodePlayerFrame(frame)).players[0].mode, 'sit');
});
