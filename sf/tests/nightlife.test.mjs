import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle } from '../geometry.js';
import { sampleCharacterPose, drawCharacter } from '../characters.js';
import {
  CHARACTER_DEFAULTS,
  normalizeCharacter,
  characterAppearance,
} from '../character-config.js';
import { NIGHTLIFE, nightlifeWalkable, nightlifeRebuff, drawNightlife } from '../nightlife.js';

test('saved appearance accepts valid colors and gender while recovering from corrupt preferences', () => {
  assert.deepEqual(normalizeCharacter(null), CHARACTER_DEFAULTS);
  const settings = normalizeCharacter({
      gender: 'woman',
      skin: '#804f36',
      shirt: '#ff2288',
      pants: '#245566',
      hair: '#221144',
      shoes: '#ffeedd',
      hairstyle: 'curly',
    }),
    appearance = characterAppearance(settings);
  assert.equal(appearance.female, true);
  assert.equal(appearance.longHair, true);
  assert.equal(appearance.hairstyle, 'long');
  const man = normalizeCharacter({ ...settings, gender: 'man', hairstyle: 'long' });
  assert.equal(man.hairstyle, 'short');
  assert.equal(characterAppearance(man).longHair, false);
  assert.equal(
    normalizeCharacter({ shirt: 'red', gender: 'invalid' }).shirt,
    CHARACTER_DEFAULTS.shirt,
  );
  const a = new Mesh(),
    b = new Mesh();
  drawCharacter(a, 0, 0, 0, 0, 0, false, settings.skin, settings.shirt, appearance);
  drawCharacter(b, 0, 0, 0);
  assert.ok(a.data.every(Number.isFinite));
  assert.notDeepEqual(a.data, b.data);
});

test('dancing moves arms and hips while preserving every limb length and keeping feet above ground', () => {
  let first = null,
    changed = false;
  for (let t = 0; t < 5; t += 0.1) {
    const p = sampleCharacterPose('idle', 0, { action: 'dance', time: t }),
      joint = (i) => p.joints.slice(i * 3, i * 3 + 3),
      distance = (a, b) => Math.hypot(...joint(a).map((v, i) => v - joint(b)[i]));
    assert.ok(p.matrices.every(Number.isFinite));
    for (const arm of [4, 7]) {
      assert.ok(Math.abs(distance(arm, arm + 1) - 0.31) < 1e-5);
      assert.ok(Math.abs(distance(arm + 1, arm + 2) - 0.275) < 1e-5);
    }
    for (const leg of [10, 13]) {
      assert.ok(Math.abs(distance(leg, leg + 1) - 0.41) < 1e-5);
      assert.ok(Math.abs(distance(leg + 1, leg + 2) - 0.38) < 1e-5);
      assert.ok(joint(leg + 2)[1] > 0.09);
    }
    if (!first) first = p.joints.slice();
    else if (Math.abs(p.joints[0] - first[0]) > 0.02) changed = true;
  }
  assert.equal(changed, true);
});

test('the energetic dance has broad arm pumps, alternating high steps, and continuous motion', () => {
  const ranges = new Map(
    [0, 6, 9, 12, 15].map((i) => [
      i,
      { low: [Infinity, Infinity, Infinity], high: [-Infinity, -Infinity, -Infinity] },
    ]),
  );
  let leftLift = false,
    rightLift = false;
  for (let time = 0; time < 4; time += 1 / 120) {
    const p = sampleCharacterPose('idle', 0, { action: 'dance', time }),
      next = sampleCharacterPose('idle', 0, { action: 'dance', time: time + 1 / 120 });
    for (const [id, r] of ranges)
      for (let axis = 0; axis < 3; axis++) {
        const value = p.joints[id * 3 + axis];
        r.low[axis] = Math.min(r.low[axis], value);
        r.high[axis] = Math.max(r.high[axis], value);
        assert.ok(
          Math.abs(value - next.joints[id * 3 + axis]) < 0.06,
          'limbs should move smoothly between frames',
        );
      }
    leftLift ||= !p.feet[0].contact && p.feet[1].contact;
    rightLift ||= p.feet[0].contact && !p.feet[1].contact;
  }
  for (const hand of [6, 9]) {
    const r = ranges.get(hand);
    assert.ok(r.high[1] - r.low[1] > 0.65, 'hands need a broad vertical swing');
    assert.ok(r.high[2] - r.low[2] > 0.3, 'arms pump forward and back');
  }
  for (const foot of [12, 15]) {
    const r = ranges.get(foot);
    assert.ok(r.high[1] - r.low[1] > 0.2, 'each foot should lift clearly off the floor');
    assert.ok(r.high[2] - r.low[2] > 0.15, 'legs should kick forward');
  }
  assert.ok(
    ranges.get(0).high[0] - ranges.get(0).low[0] > 0.17,
    'hips shift weight between the legs',
  );
  assert.ok(leftLift && rightLift, 'each leg takes a turn supporting the dancer');
});

test('Nightlife has a real door and solid walls and keeps its DJ equipment off the walking floor', () => {
  assert.ok(nightlifeWalkable(NIGHTLIFE.inside.x + 0.5, NIGHTLIFE.inside.y + 0.5));
  for (let z = 90; z <= 93.5; z += 0.05) assert.ok(nightlifeWalkable(59.4, z));
  for (const [x, z] of [
    [57.5, 90],
    [61.3, 90],
    [58, 92.2],
    [60.5, 92.2],
    [59.4, 89.3],
  ])
    assert.equal(nightlifeWalkable(x, z), false);
  assert.equal(nightlifeRebuff('man'), 'I have a boyfriend.');
  assert.equal(nightlifeRebuff('woman'), 'I have a girlfriend.');
});

test('the roof comes off inside, and camera-facing walls disappear at every camera orientation', () => {
  const site = { base: 3 },
    signs = new Map();
  for (const eye of [
    [50, 15, 83],
    [70, 15, 83],
    [70, 15, 98],
    [50, 15, 98],
  ]) {
    const outside = new Mesh(),
      inside = new Mesh();
    drawNightlife(outside, site, signs, eye, 1000);
    drawNightlife(inside, site, signs, eye, 1000, { inside: true });
    assert.ok(inside.data.every(Number.isFinite));
    assert.ok(inside.data.length < outside.data.length);
    const ray = { origin: [58.5, 10, 91.4], dir: [0, -1, 0] },
      height = (mesh) => {
        let distance = Infinity;
        for (let i = 0; i < mesh.data.length; i += 33) {
          const t = rayTriangle(ray, ...[0, 11, 22].map((k) => mesh.data.slice(i + k, i + k + 3)));
          if (t !== null) distance = Math.min(distance, t);
        }
        return 10 - distance;
      };
    assert.ok(height(outside) > 5.6);
    assert.ok(height(inside) < 3.1);
  }
});
