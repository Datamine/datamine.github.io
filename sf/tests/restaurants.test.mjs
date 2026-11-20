import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import {
  RESTAURANTS,
  restaurantPoint,
  createRestaurantPatio,
  drawRestaurantDiners,
} from '../restaurants.js';
import { sampleCharacterPose } from '../characters.js';

test('Rich Table has seated diners inside its patio and a clear door approach', () => {
  for (const rotation of [0, Math.PI / 4, Math.PI / 2, Math.PI]) {
    const site = {
        ...RESTAURANTS.find((r) => r.id === 'rich-table'),
        x: 12,
        y: 18,
        rotation,
        object: { base: 1 },
        sight: {},
      },
      mesh = new Mesh(),
      fixtures = [];
    const result = createRestaurantPatio(mesh, site, (_m, _start, fixture) =>
      fixtures.push(fixture),
    );
    assert.equal(result.tables.length, 1);
    assert.equal(result.diners.length, 2);
    assert.equal(fixtures.length, 1);
    assert.ok(mesh.data.every(Number.isFinite));
    const local = ([x, z]) => {
      const dx = x - site.x - site.w / 2,
        dz = z - site.y - site.d / 2;
      return [
        dx * Math.cos(rotation) + dz * Math.sin(rotation),
        -dx * Math.sin(rotation) + dz * Math.cos(rotation),
      ];
    };
    for (const diner of result.diners) {
      const [u, v] = local([diner.x, diner.z]);
      assert.ok(Math.abs(u) < site.w / 2 - 0.1);
      assert.ok(v > site.d / 2 + 0.2 && v < site.d / 2 + site.patioDepth - 0.2);
    }
    for (const fixture of fixtures) {
      assert.equal(fixture.preserveGround, true);
      assert.equal(fixture.solid, true);
      const points = fixture.footprint.map(local);
      assert.ok(
        points.every((p) => p[0] > 0),
        'furniture leaves the left-hand door approach open',
      );
      assert.ok(points.every((p) => p[1] >= site.d / 2 && p[1] <= site.d / 2 + site.patioDepth));
    }
    const rendered = new Mesh();
    drawRestaurantDiners(rendered, result.diners, 2000, restaurantPoint(site, 0, site.d / 2 + 1));
    assert.ok(rendered.data.length > 0 && rendered.data.every(Number.isFinite));
  }
});

test('the eating gesture lifts one hand without changing seated contacts or limb lengths', () => {
  const joint = (p, i) => Array.from(p.joints.slice(i * 3, i * 3 + 3)),
    distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const rest = sampleCharacterPose('sit', 0, { action: 'eat', actionT: 0 }),
    bite = sampleCharacterPose('sit', 0, { action: 'eat', actionT: 0.5 });
  assert.ok(joint(bite, 9)[1] - joint(rest, 9)[1] > 0.3);
  assert.deepEqual(joint(bite, 6), joint(rest, 6));
  assert.deepEqual(bite.feet, rest.feet);
  for (let t = 0; t <= 1; t += 0.025) {
    const pose = sampleCharacterPose('sit', 0, { action: 'eat', actionT: t });
    assert.ok(pose.matrices.every(Number.isFinite));
    for (const arm of [4, 7]) {
      assert.ok(Math.abs(distance(joint(pose, arm), joint(pose, arm + 1)) - 0.31) < 1e-5);
      assert.ok(Math.abs(distance(joint(pose, arm + 1), joint(pose, arm + 2)) - 0.275) < 1e-5);
    }
  }
});
