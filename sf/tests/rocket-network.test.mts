import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRocketTravel,
  sampleRocketPresentation,
  ROCKET_ACCESS,
  ROCKET_CABIN_HEIGHT,
} from '../rocket.ts';
import { createRocketPresentation } from '../multiplayer-actions.ts';
import { SF_SPACEPORT } from '../southern-district.ts';
import { createTahoe } from '../tahoe.ts';

const distance = (
  a: { x: number; y: number; z: number } | null,
  b: { x: number; y: number; z: number } | null,
) =>
  Math.hypot(
    requiredFixture(a).x - requiredFixture(b).x,
    requiredFixture(a).y - requiredFixture(b).y,
    requiredFixture(a).z - requiredFixture(b).z,
  );
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('5 Hz rocket snapshots animate one coherent ladder/cabin frame at display frequency in both directions', () => {
  const tahoe = createTahoe().spaceport;
  for (const [from, to] of [
    [SF_SPACEPORT, tahoe],
    [tahoe, SF_SPACEPORT],
  ]) {
    let now = 0;
    const server = createRocketTravel(),
      view = createRocketPresentation({ now: () => now }),
      stages = new Set();
    const entry = { x: from.x + 0.37, y: from.base + 0.04, z: from.z - 3.1 };
    server.start(from, to, entry);
    let snapshot = structuredClone(server.state),
      reference = createRocketTravel();
    reference.start(from, to, entry);
    view.accept(snapshot);
    let previous: ReturnType<typeof view.sample> = null,
      subframes = 0;
    for (let frame = 0; frame < Math.floor(server.duration * 60) - 20; frame++) {
      now = (frame * 1000) / 60;
      if (frame % 12 === 0) {
        if (frame) server.update(0.2);
        snapshot = structuredClone(server.state);
        view.accept(snapshot);
      }
      const visual = view.sample();
      assert.ok(visual?.pose != null, 'Missing test fixture: visual.pose');
      stages.add(visual.phase + ':' + visual.pose.stage);
      const expected = sampleRocketPresentation(snapshot, (frame % 12) / 60 - 0.2);
      assert.ok(visual != null, 'Missing test fixture: visual');
      assert.ok(expected != null, 'Missing test fixture: expected');
      assert.ok(distance(visual.position, expected.position) < 1e-7);
      assert.ok(expected?.pose != null, 'Missing test fixture: expected.pose');
      near(visual.pose.phase, expected.pose.phase);

      near(visual.pose.motion, expected.pose.motion);

      assert.equal(visual.pose.mode, expected.pose.mode);
      if (visual.pose.stage === 'ladder') {
        assert.ok(visual?.position != null, 'Missing test fixture: visual.position');
        assert.ok(visual?.vehicle != null, 'Missing test fixture: visual.vehicle');
        near(visual.position.x, visual.vehicle.x);

        near(visual.position.z, visual.vehicle.z + ROCKET_ACCESS.riderZ);
        assert.ok(visual?.pose != null, 'Missing test fixture: visual.pose');
        assert.equal(visual.pose.mode, 'climb');

        assert.ok(visual.pose.motion > 0);
        if (
          previous?.pose?.stage === 'ladder' &&
          previous.position &&
          Math.abs(visual.position.y - previous.position.y) > 1e-5 &&
          frame % 12 !== 0
        ) {
          assert.ok(visual?.pose != null, 'Missing test fixture: visual.pose');
          assert.notEqual(visual.pose.phase, previous.pose.phase);
          subframes++;
        }
      }
      if (visual.pose.stage === 'cabin') {
        assert.ok(visual?.position != null, 'Missing test fixture: visual.position');
        assert.ok(visual?.vehicle != null, 'Missing test fixture: visual.vehicle');
        near(visual.position.x, visual.vehicle.x);

        near(visual.position.z, visual.vehicle.z);

        near(visual.position.y, visual.vehicle.y + ROCKET_CABIN_HEIGHT);
      }
      if (previous) {
        assert.ok(visual != null, 'Missing test fixture: visual');
        assert.ok(
          distance(visual.position, previous.position) < 20,
          'frame jumped at a travel phase boundary',
        );
      }
      previous = visual;
    }
    assert.ok(subframes > 100, 'limbs must move between network samples');
    for (const stage of [
      'boarding:ladder',
      'boarding:hatch',
      'ascending:cabin',
      'cruising:cabin',
      'descending:cabin',
      'disembarking:ladder',
    ] satisfies [string, string, string, string, string, string])
      assert.ok(stages.has(stage), stage);
    assert.equal(server.state.active, true, 'sampling must not finish authoritative travel');
    const before = JSON.stringify(snapshot),
      frozen = view.sample();
    now += 60000;
    const held = view.sample();
    now += 60000;
    assert.deepEqual(view.sample(), held, 'do not continue indefinitely on a stale packet');
    assert.equal(JSON.stringify(snapshot), before);
    assert.ok(frozen != null, 'Missing test fixture: frozen');
    assert.ok(held != null, 'Missing test fixture: held');
    assert.ok(frozen.active && held.active);
    view.accept(null);
    assert.equal(view.sample(), null);
  }
});

test('sampling preserves the live boarding origin and does not anticipate an authorized arrival', () => {
  const rocket = createRocketTravel(),
    entry = { x: SF_SPACEPORT.x + 1.4, y: SF_SPACEPORT.base + 0.04, z: SF_SPACEPORT.z - 3 };
  rocket.start(SF_SPACEPORT, createTahoe().spaceport, entry);
  const snapshot = structuredClone(rocket.state);
  assert.deepEqual(requiredFixture(sampleRocketPresentation(snapshot, -0.2)).position, entry);
  assert.deepEqual(snapshot.entry, entry);
  assert.equal(requiredFixture(sampleRocketPresentation(snapshot, 999)).active, true);
  assert.equal(rocket.state.elapsed, 0);
  assert.equal(rocket.state.phase, 'boarding');
});
