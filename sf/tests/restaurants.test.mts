import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import {
  RESTAURANTS,
  restaurantPoint,
  createRestaurantPatio,
  drawRestaurantDiners,
} from '../restaurants.ts';
import type { CharacterPose } from '../characters.ts';
import { sampleCharacterPose } from '../characters.ts';
import type { WorldObject } from '../types/world.ts';

test('Rich Table has seated diners inside its patio and a clear door approach', () => {
  for (const rotation of [0, Math.PI / 4, Math.PI / 2, Math.PI] satisfies [
    number,
    number,
    number,
    number,
  ]) {
    const site = {
        ...requiredFixture(RESTAURANTS.find((r) => r.id === 'rich-table')),
        x: 12,
        y: 18,
        rotation,
        object: { x: 12, y: 18, w: 3, d: 3, h: 3, base: 1 },
      },
      mesh = new Mesh(),
      fixtures: WorldObject[] = [];
    const result = createRestaurantPatio(mesh, site, (_m, _start, fixture) =>
      fixtures.push(fixture),
    );
    assert.equal(result.tables.length, 1);
    assert.equal(result.diners.length, 2);
    assert.equal(fixtures.length, 1);
    assert.ok(mesh.data.every(Number.isFinite));
    const local = ([x, z]: readonly number[]) => {
      assert.ok(site?.w != null, 'Missing test fixture: site.w');
      assert.ok(site?.d != null, 'Missing test fixture: site.d');
      const dx = x - site.x - site.w / 2,
        dz = z - site.y - site.d / 2;
      return [
        dx * Math.cos(rotation) + dz * Math.sin(rotation),
        -dx * Math.sin(rotation) + dz * Math.cos(rotation),
      ] satisfies [number, number];
    };
    for (const diner of result.diners) {
      const [u, v] = local([diner.x, diner.z]);
      assert.ok(site?.w != null, 'Missing test fixture: site.w');
      assert.ok(Math.abs(u) < site.w / 2 - 0.1);
      assert.ok(site?.d != null, 'Missing test fixture: site.d');
      assert.ok(site?.patioDepth != null, 'Missing test fixture: site.patioDepth');
      assert.ok(v > site.d / 2 + 0.2 && v < site.d / 2 + site.patioDepth - 0.2);
    }
    for (const fixture of fixtures) {
      assert.equal(fixture.preserveGround, true);
      assert.equal(fixture.solid, true);
      const points = requiredFixture(fixture.footprint).map(local);
      assert.ok(
        points.every((p) => p[0] > 0),
        'furniture leaves the left-hand door approach open',
      );
      assert.ok(
        points.every(
          (p) =>
            p[1] >= requiredFixture(site.d) / 2 &&
            p[1] <= requiredFixture(site.d) / 2 + requiredFixture(site.patioDepth),
        ),
      );
    }
    const rendered = new Mesh();
    assert.ok(site?.d != null, 'Missing test fixture: site.d');
    drawRestaurantDiners(rendered, result.diners, 2000, restaurantPoint(site, 0, site.d / 2 + 1));
    assert.ok(rendered.data.length > 0 && rendered.data.every(Number.isFinite));
  }
});

test('the eating gesture lifts one hand without changing seated contacts or limb lengths', () => {
  const joint = (p: CharacterPose, i: number) => Array.from(p.joints.slice(i * 3, i * 3 + 3)),
    distance = (a: readonly number[], b: readonly number[]) =>
      Math.hypot(...a.map((v, i) => v - b[i]));
  const rest = sampleCharacterPose('sit', 0, { action: 'eat', actionT: 0 }),
    bite = sampleCharacterPose('sit', 0, { action: 'eat', actionT: 0.5 });
  assert.ok(joint(bite, 9)[1] - joint(rest, 9)[1] > 0.3);
  assert.deepEqual(joint(bite, 6), joint(rest, 6));
  assert.deepEqual(bite.feet, rest.feet);
  for (let t = 0; t <= 1; t += 0.025) {
    const pose = sampleCharacterPose('sit', 0, { action: 'eat', actionT: t });
    assert.ok(pose.matrices.every(Number.isFinite));
    for (const arm of [4, 7] satisfies [number, number]) {
      assert.ok(Math.abs(distance(joint(pose, arm), joint(pose, arm + 1)) - 0.31) < 1e-5);
      assert.ok(Math.abs(distance(joint(pose, arm + 1), joint(pose, arm + 2)) - 0.275) < 1e-5);
    }
  }
});
