import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, unit, rayTriangle, rayTriangleAt } from '../geometry.ts';
import { worldAssetCacheKey, createWorldStream } from '../world-stream.ts';
import { drawRestaurantDiners } from '../restaurants.ts';
import { encodeWorldChunk } from '../world-codec.ts';
import { gzipSync } from 'node:zlib';
import type { Color, Material } from '../types/geometry.ts';

function referenceSphere(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  color: Color,
  segments: number,
  rings: number,
  material: Material,
) {
  const m = new Mesh();
  if (Math.max(requiredFixture(rx), ry, rz) >= 0.25) {
    segments = Math.max(requiredFixture(segments), 12);
    rings = Math.max(requiredFixture(rings), 6);
  }
  const point = (i: number, j: number) => {
    assert.ok(rings != null, 'Missing test fixture: rings');
    assert.ok(segments != null, 'Missing test fixture: segments');
    const a = (i * Math.PI) / rings,
      b = (j * Math.PI * 2) / segments;
    assert.ok(x != null, 'Missing test fixture: x');
    assert.ok(rx != null, 'Missing test fixture: rx');
    assert.ok(y != null, 'Missing test fixture: y');
    assert.ok(ry != null, 'Missing test fixture: ry');
    assert.ok(z != null, 'Missing test fixture: z');
    assert.ok(rz != null, 'Missing test fixture: rz');
    return [
      x + Math.sin(a) * Math.cos(b) * rx,
      y + Math.cos(a) * ry,
      z + Math.sin(a) * Math.sin(b) * rz,
    ];
  };
  for (let i = 0; i < requiredFixture(rings); i++)
    for (let j = 0; j < requiredFixture(segments); j++) {
      const start = m.data.length;
      m.quad(
        point(i, j),
        point(i + 1, j),
        point(i + 1, j + 1),
        point(i, j + 1),
        requiredFixture(color),
        material,
      );
      for (let v = start; v < m.data.length; v += 11) {
        assert.ok(x != null, 'Missing test fixture: x');
        assert.ok(rx != null, 'Missing test fixture: rx');
        assert.ok(y != null, 'Missing test fixture: y');
        assert.ok(ry != null, 'Missing test fixture: ry');
        assert.ok(z != null, 'Missing test fixture: z');
        assert.ok(rz != null, 'Missing test fixture: rz');
        const n = unit([
          (m.data[v] - x) / (rx * rx || 1e-8),
          (m.data[v + 1] - y) / (ry * ry || 1e-8),
          (m.data[v + 2] - z) / (rz * rz || 1e-8),
        ] satisfies [number, number, number]);
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
      [0, 0] satisfies [number, number],
      [1, 0] satisfies [number, number],
      [1, 1] satisfies [number, number],
      [0, 1] satisfies [number, number],
    ],
  ]) {
    const args: Parameters<typeof referenceSphere> = [
        12.3,
        4.1,
        -19.7,
        0.31,
        0.52,
        0.2,
        '#9b7654',
        14,
        7,
        material,
      ],
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
    [2.5, 1, 0] satisfies [number, number, number],
    [2.5, 1, 8] satisfies [number, number, number],
    [0, 1, 3.5] satisfies [number, number, number],
    [2.5, 4, 3.5] satisfies [number, number, number],
    [8, 8, 8] satisfies [number, number, number],
  ])
    for (const direction of [
      [0, 0, 1] satisfies [number, number, number],
      [0, 0, -1] satisfies [number, number, number],
      [1, 0, 0] satisfies [number, number, number],
      [0, -1, 0] satisfies [number, number, number],
    ]) {
      const ray = { origin, dir: direction };
      for (let i = 0; i < mesh.data.length; i += 33) {
        const at = (n: number) => mesh.data.slice(i + n * 11, i + n * 11 + 3);
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
    [0, 0] satisfies [number, number],
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
    [0, 0] satisfies [number, number],
    false,
    () => targets++,
    () => true,
  );
  assert.ok(shown.data.length > 0);
  assert.equal(targets, 1);
});

test('indexed mesh ranges preserve interleaved wall sections and discard unloaded chunks', async () => {
  const chunks = [
      {
        id: '0,0',
        file: '0,0',
        lo: [0, 0, 0] satisfies [number, number, number],
        hi: [12, 1, 12] satisfies [number, number, number],
      },
      {
        id: '2,0',
        file: '2,0',
        lo: [24, 0, 0] satisfies [number, number, number],
        hi: [36, 1, 12] satisfies [number, number, number],
      },
    ],
    gl = {
      ARRAY_BUFFER: 34962,
      ELEMENT_ARRAY_BUFFER: 34963,
      STATIC_DRAW: 35044,
      UNSIGNED_INT: 5125,
      UNSIGNED_SHORT: 5123,
      createBuffer: () => ({}),
      bindBuffer() {},
      bufferData() {},
      deleteBuffer() {},
    },
    manifest = {
      version: 'ranges',
      tileSize: 12,
      metadata: { id: 'metadata', file: 'metadata' },
      chunks,
    };
  const stream = await createWorldStream({
    gl,
    manifest,
    memoryLimitBytes: 1,
    assetSource: async (c: { id: string }) =>
      new Uint8Array(
        gzipSync(
          encodeWorldChunk([
            {
              mesh: 0,
              runs:
                c.id === '0,0'
                  ? [
                      [0, 3, 0] satisfies [number, number, number],
                      [6, 3, 3] satisfies [number, number, number],
                    ]
                  : [
                      [3, 3, 0] satisfies [number, number, number],
                      [9, 3, 3] satisfies [number, number, number],
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
        [2, 1, 0, 0] satisfies [number, number, number, number],
        [3, 3, 3, 0] satisfies [number, number, number, number],
        [6, 2, 6, 3] satisfies [number, number, number, number],
      ],
    );
    const drawn: [string, number, number][] = [];
    stream.draw({ stream: 0, count: 12 }, 2, 6, (p, start, count) =>
      drawn.push([p.chunk.id, start, count]),
    );
    assert.deepEqual(drawn, [
      ['0,0', 2, 1] satisfies [string, number, number],
      ['2,0', 0, 3] satisfies [string, number, number],
      ['0,0', 3, 2] satisfies [string, number, number],
    ]);
    stream.update(100, 100, 0);
    assert.equal(stream.ranges({ streamId: 0 }, 0, 12).length, 0);
  } finally {
    stream.stop();
  }
});
