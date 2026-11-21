import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { packStaticMesh, batchInFrustum } from '../static-batches.ts';
const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] satisfies [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]);
test('static batching preserves every full triangle and the original picking data', () => {
  const m = new Mesh();
  for (const [x, z] of [
    [24, 18] satisfies [number, number],
    [0, 0] satisfies [number, number],
    [-6, 3] satisfies [number, number],
    [25, 19] satisfies [number, number],
    [1, 3] satisfies [number, number],
  ])
    m.box(x, 0, z, 1, 2, 1, '#94aa83', 'brick');
  const source = new Float32Array(m.data),
    before = source.slice(),
    packed = packStaticMesh(source, 12),
    triangles = (data: Float32Array<ArrayBuffer>) => {
      const a: string[] = [];
      for (let i = 0; i < data.length; i += 33) a.push([...data.subarray(i, i + 33)].join(','));
      return a.sort();
    };
  assert.deepEqual(source, before);
  assert.deepEqual(triangles(packed.data), triangles(source));
  assert.equal(
    packed.batches.reduce((n, b) => n + b.count, 0),
    source.length / 11,
  );
  assert.ok(packed.batches.length >= 3);
  for (const b of packed.batches)
    for (let i = b.start * 11; i < (b.start + b.count) * 11; i += 11)
      for (let k = 0; k < 3; k++)
        assert.ok(packed.data[i + k] >= b.lo[k] - 1e-6 && packed.data[i + k] <= b.hi[k] + 1e-6);
});
test('frustum culling keeps intersecting and spanning geometry, and rejects all six exterior directions', () => {
  assert.ok(
    batchInFrustum(
      {
        lo: [-0.5, -0.5, -0.5] satisfies [number, number, number],
        hi: [0.5, 0.5, 0.5] satisfies [number, number, number],
      },
      identity,
    ),
  );
  assert.ok(
    batchInFrustum(
      {
        lo: [-3, -3, -3] satisfies [number, number, number],
        hi: [3, 3, 3] satisfies [number, number, number],
      },
      identity,
    ),
  );
  assert.ok(
    batchInFrustum(
      {
        lo: [0.9, -0.1, -0.1] satisfies [number, number, number],
        hi: [2, 0.1, 0.1] satisfies [number, number, number],
      },
      identity,
    ),
  );
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1] satisfies [number, number]) {
      const lo = [-0.2, -0.2, -0.2] satisfies [number, number, number],
        hi = [0.2, 0.2, 0.2] satisfies [number, number, number];
      lo[axis] = sign > 0 ? 2 : -3;
      hi[axis] = sign > 0 ? 3 : -2;
      assert.equal(batchInFrustum({ lo, hi }, identity), false);
    }
});
