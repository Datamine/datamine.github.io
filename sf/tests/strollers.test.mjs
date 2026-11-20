import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { sampleCharacterPose, drawCharacter } from '../characters.js';
import { drawBabyStroller } from '../companions.js';
import { createCityLife } from '../life.js';
import { describeCharacter } from '../descriptions.js';

test('pushing a stroller holds both hands at its handle while the walking legs continue to move', () => {
  let first;
  for (let phase = 0; phase < Math.PI * 2; phase += 0.2) {
    const p = sampleCharacterPose('move', phase, { motion: 1, pushingStroller: true }),
      joint = (id) => Array.from(p.joints.slice(id * 3, id * 3 + 3));
    for (const hand of [6, 9]) {
      assert.ok(Math.abs(joint(hand)[1] - 0.94) < 1e-5);
      assert.ok(Math.abs(joint(hand)[2] - 0.34) < 1e-5);
    }
    if (!first) first = joint(12);
    else if (phase > 1) assert.notDeepEqual(joint(12), first);
    assert.ok(p.matrices.every(Number.isFinite));
  }
});

test('strollers have finite compact meshes, visible infants, and animated wheels at every heading', () => {
  for (const angle of [0, 0.7, Math.PI / 2, Math.PI]) {
    const parent = { x: 10, z: 20, angle, phase: 1.4 },
      m = new Mesh(),
      at = drawBabyStroller(m, parent, 1000, () => 2);
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 > 500 && m.data.length / 33 < 2500);
    assert.ok(Math.abs(Math.hypot(at.x - parent.x, at.z - parent.z) - 0.7) < 1e-8);
    for (let i = 0; i < m.data.length; i += 11) {
      assert.ok(Math.hypot(m.data[i] - parent.x, m.data[i + 2] - parent.z) < 1.2);
      assert.ok(m.data[i + 1] >= 2.02 && m.data[i + 1] < 3.1);
    }
    const next = new Mesh();
    drawBabyStroller(next, { ...parent, phase: 2 }, 1200, () => 2);
    assert.notDeepEqual(m.data, next.data);
  }
});

test('families stay paired, pause together, and expose a baby separately from the adult', () => {
  const life = createCityLife({
    routes: [
      {
        name: 'Noe promenade',
        kind: 'road',
        halfWidth: 0.5,
        points: [
          [0, 0],
          [12, 0],
        ],
      },
    ],
    surfaceType: () => 'sidewalk',
    lamps: [],
    terrainHeight: () => 0,
    walkable: () => true,
    scale: 1.5,
    human: drawCharacter,
    bicycle: () => {},
    maxWalkers: 1,
    maxRiders: 0,
    strollers: true,
    waterTraffic: false,
  });
  life.update(1);
  const m = new Mesh(),
    targets = [];
  life.draw(m, 1000, [6, 0], false, (_, npc) => targets.push(npc));
  assert.equal(life.people.length, 1);
  const p = life.people[0],
    baby = targets.find((n) => n.baby);
  assert.ok(p.stroller);
  assert.equal(p.child, false);
  assert.equal(p.dogWalker, false);
  assert.equal(baby.parent, p);
  assert.match(describeCharacter(baby), /Noe Valley/);
  assert.match(describeCharacter(p), /parent/);
  const before = { x: p.x, z: p.z };
  p.hold = 3;
  life.update(1);
  assert.deepEqual({ x: p.x, z: p.z }, before);
  life.draw(new Mesh(), 2000, [6, 0], true);
  assert.ok(Number.isFinite(baby.x));
});
