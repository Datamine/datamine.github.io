import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { Mesh, rayTriangleAt } from '../geometry.js';
import { indexStaticGeometry, expandIndexedVertices } from '../indexed-geometry.js';
import { meshGlassTriangles, GLASS_UV } from '../glazing.js';
import { encodeWorldChunk, decodeWorldChunk } from '../world-codec.js';
import { createWorldStream } from '../world-stream.js';
import { sceneryMemoryLimit } from '../config/rendering.js';

function box() {
  const mesh = new Mesh();
  mesh.box(2, 0, 3, 1, 2, 1, '#94aa83');
  return new Float32Array(mesh.data);
}
function fakeGL(extension = true) {
  const uploads = [],
    deleted = [];
  return {
    uploads,
    deleted,
    ARRAY_BUFFER: 1,
    ELEMENT_ARRAY_BUFFER: 2,
    UNSIGNED_SHORT: 3,
    UNSIGNED_INT: 4,
    getExtension: () => (extension ? {} : null),
    createBuffer: () => ({}),
    bindBuffer() {},
    bufferData: (target, data) => uploads.push({ target, bytes: data.byteLength }),
    deleteBuffer: (buffer) => deleted.push(buffer),
  };
}
async function waitFor(predicate) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'scenery did not finish warming');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
function fixture({
  memoryLimitBytes = 0,
  warmAll = false,
  gl = fakeGL(),
  parts = null,
  indexed = false,
} = {}) {
  const data = parts || [{ mesh: 0, runs: [[0, 36, 0]], data: box() }],
    bytes = encodeWorldChunk(data, { indexed }),
    packed = new Uint8Array(gzipSync(bytes)),
    calls = [];
  const chunks = [0, 100, 200].map((x) => ({ id: String(x), lo: [x, 0, 0], hi: [x + 12, 2, 12] }));
  return {
    gl,
    calls,
    cost:
      bytes.byteLength +
      decodeWorldChunk(bytes).reduce(
        (n, p) => n + p.data.byteLength + (p.indices?.byteLength || 0),
        0,
      ),
    create: () =>
      createWorldStream({
        gl,
        memoryLimitBytes,
        warmAll,
        manifest: { version: 'memory', tileSize: 12, metadata: { id: 'metadata' }, chunks },
        assetSource: async (c) => {
          calls.push(c.id);
          return packed;
        },
      }),
  };
}

test('vertex compaction preserves every field and triangle, including sharp normals and material seams', () => {
  const data = box(),
    packed = indexStaticGeometry(data);
  assert.ok(packed.indices instanceof Uint16Array);
  assert.ok(packed.data.byteLength + packed.indices.byteLength < data.byteLength);
  assert.deepEqual(
    new Uint32Array(expandIndexedVertices(packed.data, packed.indices).buffer),
    new Uint32Array(data.buffer),
  );
  // Identical positions with different UVs or normals must stay distinct.
  const variants = new Float32Array(66);
  variants[9] = GLASS_UV;
  variants[42] = GLASS_UV;
  variants[33 + 3] = 1;
  const indexed = indexStaticGeometry(variants);
  assert.deepEqual(expandIndexedVertices(indexed.data, indexed.indices), variants);
});

test('indexed chunks retain original source ranges, aligned 16-bit/32-bit arrays and legacy decoding', () => {
  const first = { mesh: 0, runs: [[30, 36, 0]], data: box() },
    second = { mesh: 1, runs: [[90, 3, 0]], data: new Float32Array(33) },
    third = {
      mesh: 2,
      runs: [[120, 3, 0]],
      data: box().subarray(0, 33),
      indices: new Uint32Array([0, 1, 2]),
    };
  for (const indexed of [false, true]) {
    const parts = decodeWorldChunk(encodeWorldChunk([first, second, third], { indexed }));
    for (const [i, source] of [first, second, third].entries()) {
      assert.deepEqual(parts[i].runs, source.runs);
      assert.deepEqual(
        parts[i].indices ? expandIndexedVertices(parts[i].data, parts[i].indices) : parts[i].data,
        source.data,
      );
    }
    assert.ok(parts[2].indices instanceof Uint32Array);
  }
});

test('large meshes use 32-bit indices without truncating vertices above 65535', () => {
  const unique = 70002,
    data = new Float32Array(unique * 2 * 11);
  for (let i = 0; i < unique; i++) {
    data[i * 11] = i;
    data[(unique + i) * 11] = i;
  }
  const packed = indexStaticGeometry(data);
  assert.ok(packed.indices instanceof Uint32Array);
  assert.equal(packed.indices[unique - 1], unique - 1);
  assert.equal(packed.indices.at(-1), unique - 1);
  assert.deepEqual(expandIndexedVertices(packed.data, packed.indices), data);
});

test('indexed picking and glass ordering match original triangles for roof and wall cutaways', () => {
  const data = box();
  for (let vertex = 0; vertex < 6; vertex++) data[vertex * 11 + 9] = GLASS_UV;
  const packed = indexStaticGeometry(data),
    rays = [
      { origin: [2.5, 1, 0], dir: [0, 0, 1] },
      { origin: [2.5, 4, 3.5], dir: [0, -1, 0] },
      { origin: [0, 1, 3.5], dir: [1, 0, 0] },
    ];
  for (const ray of rays)
    for (let i = 0; i < data.length; i += 33)
      assert.equal(
        rayTriangleAt(ray, packed.data, i, 11, packed.indices),
        rayTriangleAt(ray, data, i),
      );
  const original = meshGlassTriangles(data),
    indexed = meshGlassTriangles(packed.data, packed.indices);
  assert.equal(indexed.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.equal(indexed[i].start, original[i].start);
    assert.deepEqual(indexed[i].center, original[i].center);
    assert.deepEqual(indexed[i].data, original[i].data);
  }
});

test('desktop retains visited scenery across travel, rotation and map-instance changes without extra uploads', async () => {
  const f = fixture({ indexed: true }),
    stream = await f.create();
  try {
    await stream.ensure(2, 2, 0);
    await stream.ensure(102, 2, 0);
    const uploads = f.gl.uploads.length;
    stream.update(1000, 1000, 0);
    stream.update(0, 0, 0, false);
    stream.update(2, 2, 0);
    await stream.ensure(2, 2, 0);
    assert.equal(stream.stats.resident, 2);
    assert.equal(stream.stats.evictions, 0);
    assert.equal(f.gl.deleted.length, 0);
    assert.equal(f.gl.uploads.length, uploads);
    assert.deepEqual(f.calls, ['0', '100']);
    assert.equal(stream.stats.residentBytes, 2 * f.cost);
    assert.ok(stream.stats.gpuBytes > 0 && stream.stats.cpuBytes > 0);
  } finally {
    stream.stop();
  }
});

test('memory caps evict the least recently used offscreen tile only when allocations exceed the cap', async () => {
  const cost = fixture().cost,
    f = fixture({ memoryLimitBytes: cost * 2.5 }),
    stream = await f.create();
  try {
    await stream.ensure(2, 2, 0);
    await stream.ensure(102, 2, 0);
    await stream.ensure(2, 2, 0);
    assert.equal(stream.stats.evictions, 0);
    await stream.ensure(202, 2, 0);
    assert.equal(stream.stats.evictions, 1);
    assert.equal(stream.readyAt(2, 2), true);
    assert.equal(stream.readyAt(102, 2), false);
    assert.equal(stream.readyAt(202, 2), true);
    assert.ok(stream.stats.residentBytes <= cost * 2.5);
  } finally {
    stream.stop();
  }
});

test('a budget smaller than the current view never removes visible geometry', async () => {
  const f = fixture({ memoryLimitBytes: 1 }),
    stream = await f.create();
  try {
    await stream.ensure(2, 2, 300);
    stream.update(2, 2, 300);
    assert.equal(stream.stats.resident, 3);
    assert.equal(stream.stats.evictions, 0);
    assert.ok(stream.stats.residentBytes > stream.stats.memoryLimitBytes);
  } finally {
    stream.stop();
  }
});

test('desktop warms all scenery into GPU buffers in the background and restores both indexed buffers', async () => {
  const f = fixture({ indexed: true, warmAll: true }),
    stream = await f.create();
  try {
    await stream.ensure(2, 2, 0);
    stream.start();
    await waitFor(() => stream.stats.resident === 3);
    assert.equal(stream.stats.evictions, 0);
    const bytes = stream.stats.residentBytes,
      uploads = f.gl.uploads.length;
    assert.equal(f.gl.uploads.filter((u) => u.target === f.gl.ELEMENT_ARRAY_BUFFER).length, 3);
    stream.restore();
    assert.equal(f.gl.uploads.length, uploads * 2);
    assert.equal(stream.stats.residentBytes, bytes);
    const drawn = [];
    stream.draw({ stream: 0, count: 36 }, 3, 6, (part, start, count) =>
      drawn.push({ part, start, count }),
    );
    assert.ok(drawn.every((r) => r.part.indices && r.start === 3 && r.count === 6));
  } finally {
    stream.stop();
  }
});

test('32-bit indexed geometry expands only its GPU copy on older WebGL devices', async () => {
  const data = box(),
    gl = fakeGL(false),
    f = fixture({
      gl,
      parts: [
        {
          mesh: 0,
          runs: [[0, 36, 0]],
          data,
          indices: Uint32Array.from({ length: 36 }, (_, i) => i),
        },
      ],
    }),
    stream = await f.create();
  try {
    await stream.ensure(2, 2, 0);
    const range = stream.ranges({ streamId: 0 }, 0, 36)[0];
    assert.ok(range.indices instanceof Uint32Array);
    assert.equal(range.part.indexBuffer, null);
    assert.equal(stream.stats.gpuBytes, data.byteLength);
    assert.equal(gl.uploads.filter((u) => u.target === gl.ELEMENT_ARRAY_BUFFER).length, 0);
    stream.restore();
    assert.equal(stream.stats.gpuBytes, data.byteLength);
  } finally {
    stream.stop();
  }
});

test('desktop defaults to session retention, constrained devices use a cap, and overrides remain explicit', () => {
  assert.equal(sceneryMemoryLimit({ deviceMemory: 8 }), 0);
  assert.equal(sceneryMemoryLimit(), 0);
  assert.equal(sceneryMemoryLimit({ deviceMemory: 4 }), 192 * 1048576);
  assert.equal(sceneryMemoryLimit({ coarsePointer: true }), 192 * 1048576);
  assert.equal(sceneryMemoryLimit({ override: '256' }), 256 * 1048576);
  assert.equal(sceneryMemoryLimit({ coarsePointer: true, override: '0' }), 0);
  assert.equal(sceneryMemoryLimit({ deviceMemory: 8, override: '-1' }), 0);
  assert.equal(sceneryMemoryLimit({ deviceMemory: 4, override: 'bad' }), 192 * 1048576);
});
