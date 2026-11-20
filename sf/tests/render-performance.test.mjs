import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, unit, rayTriangle, rayTriangleAt } from '../geometry.js';
import { worldAssetCacheKey, createWorldStream } from '../world-stream.js';
import { drawRestaurantDiners } from '../restaurants.js';
import { encodeWorldChunk } from '../world-codec.js';
import { gzipSync } from 'node:zlib';

function referenceSphere(x, y, z, rx, ry, rz, color, segments, rings, material) {
  const m = new Mesh();
  if (Math.max(rx, ry, rz) >= 0.25) {
    segments = Math.max(segments, 12);
    rings = Math.max(rings, 6);
  }
  const point = (i, j) => {
    const a = (i * Math.PI) / rings,
      b = (j * Math.PI * 2) / segments;
    return [
      x + Math.sin(a) * Math.cos(b) * rx,
      y + Math.cos(a) * ry,
      z + Math.sin(a) * Math.sin(b) * rz,
    ];
  };
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segments; j++) {
      const start = m.data.length;
      m.quad(point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1), color, material);
      for (let v = start; v < m.data.length; v += 11) {
        const n = unit([
          (m.data[v] - x) / (rx * rx || 1e-8),
          (m.data[v + 1] - y) / (ry * ry || 1e-8),
          (m.data[v + 2] - z) / (rz * rz || 1e-8),
        ]);
        for (let k = 0; k < 3; k++) m.data[v + 3 + k] = n[k];
      }
    }
  return m;
}

test('cached sphere templates preserve winding, smooth normals, UVs and translated ellipsoids', () => {
  for (const material of [
    null,
    'stucco',
    { glass: 0.2 },
    { emissive: 0.4 },
    { metal: 0.3 },
    { snow: true, groom: 0.6 },
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ]) {
    const args = [12.3, 4.1, -19.7, 0.31, 0.52, 0.2, '#9b7654', 14, 7, material],
      a = new Mesh(),
      b = referenceSphere(...args);
    a.sphere(...args);
    assert.equal(a.data.length, b.data.length);
    for (let i = 0; i < a.data.length; i++)
      assert.ok(Math.abs(a.data[i] - b.data[i]) < 1e-10, 'vertex field ' + i);
  }
});

test('allocation-free picking agrees with triangle-array picking, including misses and reverse faces', () => {
  const mesh = new Mesh();
  mesh.box(2, 0, 3, 1, 2, 1, '#bbbbbb');
  for (const origin of [
    [2.5, 1, 0],
    [2.5, 1, 8],
    [0, 1, 3.5],
    [2.5, 4, 3.5],
    [8, 8, 8],
  ])
    for (const direction of [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [0, -1, 0],
    ]) {
      const ray = { origin, dir: direction };
      for (let i = 0; i < mesh.data.length; i += 33) {
        const at = (n) => mesh.data.slice(i + n * 11, i + n * 11 + 3);
        assert.equal(rayTriangleAt(ray, mesh.data, i), rayTriangle(ray, at(0), at(1), at(2)));
      }
    }
});

test('map assets keep their disk-cache key across builds only when their content is unchanged', () => {
  const chunk = { id: '1,2', hash: 'same-content' };
  assert.equal(worldAssetCacheKey('old', chunk), worldAssetCacheKey('new', chunk));
  assert.notEqual(
    worldAssetCacheKey('new', chunk),
    worldAssetCacheKey('new', { ...chunk, hash: 'changed-content' }),
  );
  assert.equal(worldAssetCacheKey('legacy', { id: '1,2' }), 'legacy:1,2');
});

test('diners outside the camera generate no animated mesh or picking targets', () => {
  const diner = { id: 'diner', x: 0, z: 0, base: 0, angle: 0, label: 'Man', index: 0, seed: 0 },
    hidden = new Mesh(),
    shown = new Mesh();
  let targets = 0;
  drawRestaurantDiners(
    hidden,
    [diner],
    100,
    [0, 0],
    false,
    () => targets++,
    () => false,
  );
  assert.equal(hidden.data.length, 0);
  assert.equal(targets, 0);
  drawRestaurantDiners(
    shown,
    [diner],
    100,
    [0, 0],
    false,
    () => targets++,
    () => true,
  );
  assert.ok(shown.data.length > 0);
  assert.equal(targets, 1);
});

test('indexed mesh ranges preserve interleaved wall sections and discard unloaded chunks', async () => {
  const chunks = [
      { id: '0,0', lo: [0, 0, 0], hi: [12, 1, 12] },
      { id: '2,0', lo: [24, 0, 0], hi: [36, 1, 12] },
    ],
    gl = { createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, deleteBuffer() {} },
    manifest = { version: 'ranges', tileSize: 12, metadata: { id: 'metadata' }, chunks };
  const stream = await createWorldStream({
    gl,
    manifest,
    memoryLimitBytes: 1,
    assetSource: async (c) =>
      new Uint8Array(
        gzipSync(
          encodeWorldChunk([
            {
              mesh: 0,
              runs:
                c.id === '0,0'
                  ? [
                      [0, 3, 0],
                      [6, 3, 3],
                    ]
                  : [
                      [3, 3, 0],
                      [9, 3, 3],
                    ],
              data: new Float32Array(66),
            },
          ]),
        ),
      ),
  });
  try {
    await stream.ensure(1, 1, 30);
    assert.deepEqual(
      stream
        .ranges({ streamId: 0 }, 2, 6)
        .map((r) => [r.start, r.count, r.sourceStart, r.localStart]),
      [
        [2, 1, 0, 0],
        [3, 3, 3, 0],
        [6, 2, 6, 3],
      ],
    );
    const drawn = [];
    stream.draw({ stream: 0, count: 12 }, 2, 6, (p, start, count) =>
      drawn.push([p.chunk.id, start, count]),
    );
    assert.deepEqual(drawn, [
      ['0,0', 2, 1],
      ['2,0', 0, 3],
      ['0,0', 3, 2],
    ]);
    stream.update(100, 100, 0);
    assert.equal(stream.ranges({ streamId: 0 }, 0, 12).length, 0);
  } finally {
    stream.stop();
  }
});
