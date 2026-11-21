import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { drawStreetLamp } from '../lighting.ts';

test('larger curved models have smooth, outward-facing ellipsoid normals', () => {
  const mesh = new Mesh();
  mesh.sphere(3, 4, 5, 0.6, 0.9, 0.4, '#ffffff', 8, 4);
  assert.ok(mesh.data.length / 33 >= 12 * 6 * 2);
  for (let i = 0; i < mesh.data.length; i += 11) {
    const n = mesh.data.slice(i + 3, i + 6),
      gradient = [
        (mesh.data[i] - 3) / 0.36,
        (mesh.data[i + 1] - 4) / 0.81,
        (mesh.data[i + 2] - 5) / 0.16,
      ] satisfies [number, number, number],
      length = Math.hypot(...gradient);
    assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-8);
    assert.ok(n.reduce((sum, v, k) => sum + (v * gradient[k]) / length, 0) > 0.99999);
  }
});

test('round columns gain detail while deliberately square structures retain their edges', () => {
  const round = new Mesh(),
    square = new Mesh();
  round.cylinder(0, 0, 0, 0.3, 1, '#ffffff', 8);
  square.cylinder(0, 0, 0, 0.3, 1, '#ffffff', 4);
  assert.ok(round.data.length / 33 >= 48);
  assert.equal(square.data.length / 33, 12);
  for (let i = 0; i < round.data.length; i += 11)
    assert.ok(Math.abs(Math.hypot(...round.data.slice(i + 3, i + 6)) - 1) < 1e-8);
});

test('lamp glass and metal use separate GPU styles and their lights rotate with the actual fixtures', () => {
  for (let style = 0; style < 5; style++) {
    const mesh = new Mesh(),
      rotated = new Mesh(),
      a = drawStreetLamp(mesh, 8, 2, 9, 0, style),
      b = drawStreetLamp(rotated, 8, 2, 9, Math.PI / 2, style);
    assert.equal(a.length, style === 0 || style === 4 ? 2 : 1);
    for (let i = 0; i < a.length; i++) {
      assert.ok(Math.abs(b[i].x - (8 - (a[i].z - 9))) < 1e-8);
      assert.ok(Math.abs(b[i].z - (9 + (a[i].x - 8))) < 1e-8);
      assert.equal(a[i].y, b[i].y);
      assert.ok(a[i].y > 4 && a[i].y < 5);
    }
    const tags = new Set();
    for (let i = 0; i < mesh.data.length; i += 11) tags.add(mesh.data[i + 9]);
    assert.ok(tags.has(-1.25) && tags.has(-1.4));
    assert.ok(mesh.data.every(Number.isFinite));
    assert.ok(mesh.data.length / 33 < 5000);
    if (style >= 3)
      assert.ok(
        mesh.data.length / 33 < 1200,
        'modern silhouettes should keep the expanded lighting mesh inexpensive',
      );
    if (style === 3)
      assert.ok(a[0].color[2] > a[0].color[0], 'cobra heads use a distinct cool-white light');
  }
});
