import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { seagullFlight, createCityLife } from '../life.js';

test('seagulls fly visible, smooth loops and face their direction of travel', () => {
  for (let i = 0; i < 7; i++) {
    const start = seagullFlight(0, i),
      later = seagullFlight(2000, i);
    assert.ok(
      Math.hypot(later.x - start.x, later.z - start.z) > 0.65,
      'gulls must visibly move while the player stands still',
    );
    for (let t = 0; t < 120000; t += 200) {
      const a = seagullFlight(t, i),
        b = seagullFlight(t + 10, i),
        dx = b.x - a.x,
        dz = b.z - a.z;
      assert.ok(Object.values(a).every(Number.isFinite));
      assert.ok(a.y >= 4 && a.y < 5.6);
      assert.ok(Math.hypot(dx, dz) < 0.04, 'no jumps across the flight loop');
      assert.ok(
        (Math.cos(a.angle) * dx + Math.sin(a.angle) * dz) / Math.hypot(dx, dz) > 0.999,
        'head points along the flight path',
      );
    }
  }
});

test('gulls keep gliding during reduced motion and use quieter wing poses', () => {
  for (let i = 0; i < 7; i++) {
    const a = seagullFlight(1000, i, 1.5, true),
      b = seagullFlight(3000, i, 1.5, true);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.2);
    assert.ok(Math.abs(a.flap) < 0.02);
  }
  const life = createCityLife({
    routes: [],
    surfaceType: () => null,
    lamps: [],
    terrainHeight: () => 1,
    groundHeight: () => 1,
    scale: 1.5,
    human: () => {},
    bicycle: () => {},
  });
  const first = new Mesh();
  life.draw(first, 1000, [86, 24], true);
  const start = life.gulls.map((p) => ({ ...p }));
  const second = new Mesh();
  life.draw(second, 3000, [86, 24], true);
  assert.equal(life.gulls.length, 7);
  assert.ok(life.gulls.every((p, i) => Math.hypot(p.x - start[i].x, p.z - start[i].z) > 0.2));
  assert.ok(first.data.every(Number.isFinite) && second.data.every(Number.isFinite));
  assert.notDeepEqual(first.data, second.data);
});
