import test from 'node:test';
import assert from 'node:assert/strict';
import { createDynamicGeometry } from '../rendering/dynamic-buffer.js';
test('three reusable dynamic buffers avoid per-frame allocations after warming', () => {
  let serial = 0;
  const calls = [],
    gl = {
      ARRAY_BUFFER: 1,
      DYNAMIC_DRAW: 2,
      createBuffer: () => ++serial,
      bindBuffer: (...v) => calls.push(['bind', ...v]),
      bufferData: (...v) => calls.push(['allocate', ...v]),
      bufferSubData: (_t, _o, v) => calls.push(['upload', ...v]),
      deleteBuffer: (v) => calls.push(['delete', v]),
    },
    gpu = createDynamicGeometry(gl),
    vertices = Array.from({ length: 33 }, (_, i) => i),
    buffers = [];
  for (let frame = 0; frame < 9; frame++) {
    gpu.upload(vertices);
    buffers.push(gpu.buffer);
    assert.equal(gpu.count, 3);
    assert.equal(gpu.stats.uploadedBytes, 132);
  }
  assert.deepEqual(buffers, [1, 2, 3, 1, 2, 3, 1, 2, 3]);
  assert.equal(gpu.stats.allocations, 3);
  assert.equal(calls.filter((c) => c[0] === 'allocate').length, 3);
  assert.ok(
    calls.filter((c) => c[0] === 'upload').every((c) => c.slice(1).every((v, i) => v === i)),
  );
  gpu.upload([...vertices, ...vertices]);
  assert.equal(gpu.stats.allocations, 4);
  assert.equal(gpu.count, 6);
  gpu.dispose();
  assert.equal(calls.filter((c) => c[0] === 'delete').length, 3);
  assert.equal(gpu.stats.capacityBytes, 0);
});
