import test from 'node:test';
import assert from 'node:assert/strict';
import { createSutroClimb, SUTRO_SITE, sutroLegRadius } from '../sutro.js';

const site = { x: 40.65, z: 60.6, base: 8 },
  entry = { x: 40.525, z: 58.375, y: 7.8 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('Sutro climbing follows its ladder, reaches the platform and descends to the trail', () => {
  const climb = createSutroClimb();
  assert.ok(climb.begin(site, entry));
  assert.deepEqual(climb.state.position, entry);
  let event = null,
    maxStep = 0,
    previous = entry;
  for (let frame = 0; frame < 600 && climb.state.phase !== 'top'; frame++) {
    event = climb.update(1 / 60);
    const p = climb.state.position;
    assert.ok(Object.values(p).every(Number.isFinite));
    maxStep = Math.max(maxStep, distance(previous, p));
    previous = { ...p };
    if (climb.state.pose.mode === 'climb')
      assert.ok(
        Math.abs(
          p.z -
            (site.z - (sutroLegRadius(p.y - site.base) + 0.13) * SUTRO_SITE.horizontalScale - 0.2),
        ) < 1e-9,
      );
  }
  assert.equal(event, 'top');
  assert.equal(climb.state.active, true);
  assert.ok(maxStep < 0.06);
  assert.deepEqual(climb.state.position, {
    x: site.x,
    y: site.base + SUTRO_SITE.platformHeight,
    z: site.z - 0.12,
  });
  const top = { ...climb.state.position };
  climb.update(10);
  assert.deepEqual(climb.state.position, top);
  assert.ok(climb.descend());
  for (let frame = 0; frame < 600 && climb.state.active; frame++) climb.update(1 / 60);
  assert.equal(climb.state.phase, 'ground');
  assert.equal(climb.state.active, false);
  assert.deepEqual(climb.state.position, entry);
  assert.equal(
    climb.cancel(),
    null,
    'leaving the mode later must not send a grounded player back to the tower',
  );
});

test('turning back halfway reverses the climb without a position jump', () => {
  const climb = createSutroClimb();
  climb.begin(site, entry);
  climb.update(3.6);
  const before = { ...climb.state.position };
  assert.ok(climb.descend());
  assert.deepEqual(climb.state.position, before);
  climb.update(1 / 60);
  assert.ok(distance(before, climb.state.position) < 0.06);
  while (climb.state.active) climb.update(1 / 60);
  assert.deepEqual(climb.state.position, entry);
});

test('a cancelled climb clears the elevation override and can be started again', () => {
  const climb = createSutroClimb();
  climb.begin(site, entry);
  climb.update(2);
  assert.deepEqual(climb.cancel(), entry);
  assert.equal(climb.state.active, false);
  assert.equal(climb.state.position, null);
  assert.equal(climb.state.pose, null);
  assert.equal(climb.update(10), null);
  assert.equal(climb.descend(), false);
  assert.ok(climb.begin(site, entry));
  assert.deepEqual(climb.state.position, entry);
});
