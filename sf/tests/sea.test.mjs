import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { createSeaSurface, drawOffshoreSea } from '../environment.js';
import { WATER_LEVEL } from '../water-tiles.js';

function rectangles(mesh) {
  const result = [];
  for (let i = 0; i < mesh.data.length; i += 66) {
    const x = mesh.data[i],
      z = mesh.data[i + 2],
      right = mesh.data[i + 22],
      bottom = mesh.data[i + 24];
    result.push({ x, z, right, bottom, area: (right - x) * (bottom - z) });
  }
  return result;
}

test('shallows share one flat sea surface with identical depths at shared vertices', () => {
  const mesh = new Mesh(),
    polygon = [
      [0, 0],
      [8, 0],
      [8, 8],
      [5, 8],
      [5, 3],
      [3, 3],
      [3, 8],
      [0, 8],
    ];
  const bounds = createSeaSurface(mesh, [{ polygon, width: 1.8 }], 0.5),
    vertices = new Map();
  for (let i = 0; i < mesh.data.length; i += 11) {
    const [x, y, z] = mesh.data.slice(i, i + 3),
      depth = mesh.data[i + 10],
      key = x.toFixed(7) + ',' + z.toFixed(7);
    assert.equal(y, WATER_LEVEL);
    assert.equal(mesh.data[i + 9], -1.75);
    assert.ok(Number.isFinite(depth) && depth >= 0 && depth <= 1);
    if (vertices.has(key)) assert.equal(depth, vertices.get(key));
    else vertices.set(key, depth);
    assert.ok(mesh.data[i + 4] > 0.999, 'water normals point upward');
  }
  let area = 0;
  const edges = new Map();
  const key = (p) => p.map((v) => v.toFixed(7)).join(',');
  for (let i = 0; i < mesh.data.length; i += 33) {
    const points = [0, 11, 22].map((j) => [mesh.data[i + j], mesh.data[i + j + 2]]);
    const [a, b, c] = points;
    area += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    for (let j = 0; j < 3; j++) {
      const a = points[j],
        b = points[(j + 1) % 3],
        id = [key(a), key(b)].sort().join('|');
      if (!edges.has(id)) edges.set(id, { a, b, count: 0 });
      edges.get(id).count++;
    }
  }
  assert.ok(Math.abs(area - (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ)) < 1e-8);
  for (const { a, b, count } of edges.values()) {
    const outside = [0, 1].some((axis) =>
      [axis ? bounds.minZ : bounds.minX, axis ? bounds.maxZ : bounds.maxX].some(
        (v) => Math.abs(a[axis] - v) < 1e-8 && Math.abs(b[axis] - v) < 1e-8,
      ),
    );
    assert.equal(count, outside ? 1 : 2, 'interior sea edges must match exactly, without T joins');
  }
  assert.ok([...vertices.values()].some((d) => d === 0));
  assert.ok([...vertices.values()].some((d) => d === 1));
});

test('the unlimited offshore sea meets the static boundary without overlap or gaps', () => {
  const bounds = { minX: 0, minZ: 0, maxX: 10, maxZ: 10 };
  for (const [x, z, radius] of [
    [5, 5, 2],
    [5, 5, 20],
    [-20, 5, 8],
    [30, 5, 8],
    [5, -20, 8],
    [5, 30, 8],
    [-6, -6, 8],
    [16, 16, 8],
    [1000000, -1000000, 100],
  ]) {
    const mesh = new Mesh();
    drawOffshoreSea(mesh, bounds, x, z, radius);
    const rects = rectangles(mesh);
    const overlap =
      Math.max(0, Math.min(x + radius, 10) - Math.max(x - radius, 0)) *
      Math.max(0, Math.min(z + radius, 10) - Math.max(z - radius, 0));
    assert.ok(
      Math.abs(rects.reduce((sum, r) => sum + r.area, 0) - (radius * radius * 4 - overlap)) < 1e-7,
    );
    for (const r of rects) {
      assert.ok(
        r.x >= x - radius && r.right <= x + radius && r.z >= z - radius && r.bottom <= z + radius,
      );
      assert.ok(
        r.right <= 0 || r.x >= 10 || r.bottom <= 0 || r.z >= 10,
        'offshore geometry must leave the static sea clear',
      );
    }
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i],
          b = rects[j];
        assert.ok(
          Math.min(a.right, b.right) <= Math.max(a.x, b.x) ||
            Math.min(a.bottom, b.bottom) <= Math.max(a.z, b.z),
        );
      }
    for (let i = 0; i < mesh.data.length; i += 11) {
      assert.equal(mesh.data[i + 1], WATER_LEVEL);
      assert.equal(mesh.data[i + 10], 1);
    }
  }
});
