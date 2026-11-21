interface RoundTripRoot {
  self: RoundTripRoot | null;
  object: { mesh: import('../geometry.ts').Mesh };
  again: { mesh: import('../geometry.ts').Mesh };
  mesh: import('../geometry.ts').Mesh;
  heights: Float64Array;
  map: Map<string, { mesh: import('../geometry.ts').Mesh }>;
  set: Set<{ mesh: import('../geometry.ts').Mesh }>;
}
type DecodedRoot = Omit<RoundTripRoot, 'mesh' | 'object' | 'again' | 'map' | 'set'> & {
  map: Map<string, { mesh: DecodedRoot['mesh'] }>;
  set: Set<{ mesh: DecodedRoot['mesh'] }>;
  mesh: { data: Float32Array; count: number; streamId: number };
  object: { mesh: DecodedRoot['mesh'] };
  again: { mesh: DecodedRoot['mesh'] };
};
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { Mesh } from '../geometry.ts';
import { compileMinimapRoads, drawCompiledMinimapRoads } from '../world-minimap.ts';
import {
  encodeWorldGraph,
  decodeWorldGraph,
  encodeWorldMetadata,
  decodeWorldMetadata,
  encodeWorldChunk,
  decodeWorldChunk,
} from '../world-codec.ts';
import { packWorldTiles, unpackWorldTiles } from '../world-tile-codec.ts';
import {
  createWorldStream,
  chunkDistance,
  worldViewPlanes,
  chunkInWorldView,
} from '../world-stream.ts';
import { batchInFrustum } from '../static-batches.ts';
import { createNavigationGrid } from '../navigation.ts';
import { createRegionalNavigation } from '../regional-navigation.ts';
import { createStreetTraffic } from '../street-traffic.ts';

test('compiled metadata preserves references, typed arrays and mesh identities without embedding their vertices', () => {
  const mesh = new Mesh();
  mesh.box(0, 0, 0, 1, 1, 1, '#aabbcc');
  const object = { mesh },
    root: RoundTripRoot = {
      self: null,
      object,
      again: object,
      mesh,
      heights: new Float64Array([1.23456789, Infinity] satisfies [number, number]),
      map: new Map([['a', object]]),
      set: new Set([object]),
    };
  root.self = root;
  const { graph, buffers, meshes } = encodeWorldGraph(root, { binary: true }),
    copy = decodeWorldMetadata(encodeWorldMetadata(graph, buffers)) as DecodedRoot;
  assert.equal(meshes.length, 1);
  assert.equal(copy.object, copy.again);
  assert.equal(copy.self, copy);
  assert.equal(copy.map.get('a'), copy.object);
  assert.ok(copy.set.has(copy.object));
  assert.deepEqual(copy.heights, root.heights);
  assert.equal(copy.mesh, copy.object.mesh);
  assert.equal(copy.mesh.count, 36);
  assert.equal(copy.mesh.data.length, 0);
  assert.equal(copy.mesh.streamId, 0);
  const legacy = decodeWorldGraph(encodeWorldGraph(root).graph) as DecodedRoot;
  assert.deepEqual(legacy.heights, root.heights);
});

test('chunk buffers preserve triangle order and original vertex ranges for picking and roof sections', () => {
  const data = Float32Array.from({ length: 66 }, (_, i) => i / 17),
    parts = [
      {
        mesh: 2,
        runs: [
          [30, 3, 0] satisfies [number, number, number],
          [90, 3, 3] satisfies [number, number, number],
        ],
        data,
      },
    ],
    decoded = decodeWorldChunk(encodeWorldChunk(parts));
  assert.deepEqual(decoded[0].data, data);
  assert.deepEqual(decoded[0].runs, parts[0].runs);
  assert.equal(decoded[0].mesh, 2);
});

test('packed tiles retain precise mixed surfaces, edge matching and fractional texture orientation', () => {
  const tiles: import('../types/tiles.ts').SurfaceTile[] = [
    {
      type: 'grass',
      areas: { grass: 1 },
      base: 'grass',
      variant: 'grass',
      ports: 0,
      curbEdges: 0,
      frame: Math.PI / 4,
      patches: null,
      edges: Array.from({ length: 4 }, () => [{ type: 'grass', from: 0, to: 1 }]),
    },
    {
      type: 'road',
      areas: { road: 1 },
      base: 'grass',
      variant: 'mixed',
      ports: 3,
      curbEdges: 12,
      waterLevel: 1.25,
      patches: [
        {
          type: 'road',
          polygon: [
            [0, 0] satisfies [number, number],
            [1, 0] satisfies [number, number],
            [1, 0.5] satisfies [number, number],
            [0, 0.5] satisfies [number, number],
          ],
        },
        {
          type: 'grass',
          polygon: [
            [0, 0.5] satisfies [number, number],
            [1, 0.5] satisfies [number, number],
            [1, 1] satisfies [number, number],
            [0, 1] satisfies [number, number],
          ],
        },
      ],
      edges: Array.from({ length: 4 }, () => [
        { type: 'road', from: 0, to: 0.5 },
        { type: 'grass', from: 0.5, to: 1 },
      ]),
    },
  ];
  const restored = unpackWorldTiles(packWorldTiles(tiles), 1);
  assert.equal(restored.length, 2);
  assert.equal(restored[0].type, 'grass');
  assert.ok(Math.abs(requiredFixture(restored[0].frame) - Math.PI / 4) < 1e-7);
  assert.equal(restored[0].patches, null);
  assert.deepEqual(restored[1].patches, tiles[1].patches);
  assert.deepEqual(restored[1].edges, tiles[1].edges);
  assert.deepEqual(restored[1].areas, { road: 0.5, grass: 0.5 });
  assert.equal(restored[1].waterLevel, 1.25);
  assert.equal([...restored].length, 2);
  assert.equal(restored.map((t) => t.base).join(','), 'grass,grass');
});

test('prepared adjacency skips compilation while preserving all movement queries', () => {
  const mask = Uint8Array.from([1, 1, 1, 1, 0, 1, 1, 1, 1] satisfies [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]),
    g = createNavigationGrid({ width: 3, mask });
  let links = 0;
  const restored = createNavigationGrid({
    ...g,
    prepared: g,
    canLink: () => {
      links++;
      return true;
    },
  });
  assert.equal(links, 0);
  assert.deepEqual(restored.links, g.links);
  assert.deepEqual(restored.regions, g.regions);
  for (const a of [0, 1, 2, 3, 5, 6, 7, 8] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ])
    for (const b of [0, 2, 6, 8] satisfies [number, number, number, number])
      assert.deepEqual(
        restored.path(g.pointAt(a), g.pointAt(b)),
        g.path(g.pointAt(a), g.pointAt(b)),
      );
  const regional = createRegionalNavigation({
      west: 0,
      east: 5,
      north: 0,
      south: 5,
      walkable: () => true,
    }),
    snapshot = regional.graph,
    route = regional.path({ x: 0, y: 0 }, { x: 4, y: 4 });
  regional.setObstacles([]);
  regional.restore(snapshot);
  assert.deepEqual(regional.path({ x: 0, y: 0 }, { x: 4, y: 4 }), route);
});

test('cached traffic topology retains live driving rather than repeating its street intersection search', () => {
  const routes = [
      {
        name: 'Square',
        kind: 'road',
        points: [
          [0, 0] satisfies [number, number],
          [4, 0] satisfies [number, number],
          [4, 4] satisfies [number, number],
          [0, 4] satisfies [number, number],
          [0, 0] satisfies [number, number],
        ],
      },
    ],
    a = createStreetTraffic({ routes, isRoad: () => true, ground: () => 0, count: 2 }),
    prepared = structuredClone({
      nodes: a.nodes,
      edges: a.edges,
      components: a.components,
      cars: a.cars,
    }),
    b = createStreetTraffic({ routes: [], isRoad: () => true, ground: () => 0, prepared });
  assert.equal(b.edges.length, a.edges.length);
  for (let i = 0; i < 50; i++) {
    a.update(0.1);
    b.update(0.1);
  }
  assert.deepEqual(b.cars, a.cars);
});

test('spawn tile is requested first, distant chunks prefetch only after play, and cutaways resolve loaded source ranges', async () => {
  const calls: string[] = [],
    deleted: WebGLBuffer[] = [],
    gl = {
      ARRAY_BUFFER: 34962,
      ELEMENT_ARRAY_BUFFER: 34963,
      STATIC_DRAW: 35044,
      UNSIGNED_INT: 5125,
      UNSIGNED_SHORT: 5123,
      createBuffer: () => ({}),
      bindBuffer() {},
      bufferData() {},
      deleteBuffer: (b: WebGLBuffer | null) => {
        if (b) deleted.push(b);
      },
    },
    data = new Float32Array(33);
  data[9] = -1;
  const chunks = [
      {
        id: '10,10',
        file: 'far',
        lo: [120, 0, 120] satisfies [number, number, number],
        hi: [132, 1, 132] satisfies [number, number, number],
      },
      {
        id: '0,0',
        file: 'home',
        lo: [0, 0, 0] satisfies [number, number, number],
        hi: [12, 1, 12] satisfies [number, number, number],
      },
    ],
    manifest = {
      version: 'fixture',
      tileSize: 12,
      metadata: { id: 'metadata', file: 'metadata' },
      chunks,
    };
  const stream = await createWorldStream({
    gl,
    manifest,
    memoryLimitBytes: 1,
    assetSource: async (c) => {
      calls.push(c.id);
      return new Uint8Array(
        gzipSync(
          encodeWorldChunk([
            { mesh: 0, runs: [[30, 3, 0] satisfies [number, number, number]], data },
          ]),
        ),
      );
    },
  });
  try {
    await stream.ensure(2, 2, 0);
    assert.deepEqual(calls, ['0,0']);
    assert.equal(stream.stats.resident, 1);
    assert.equal(stream.readyAt(125, 125), false);
    const ranges = stream.ranges({ streamId: 0 }, 30, 3);
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].sourceStart, 30);
    assert.equal(ranges[0].localStart, 0);
    assert.equal(stream.ranges({ streamId: 0 }, 0, 3).length, 0);
    stream.start();
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(calls.includes('10,10'));
    assert.equal(stream.stats.resident, 1, 'background downloads must not upload distant geometry');
    stream.update(125, 125, 0);
    await stream.ensure(125, 125, 0);
    assert.ok(deleted.length);
    assert.equal(stream.readyAt(125, 125), true);
    assert.equal(chunkDistance(chunks[0], 125, 125), 0);
    assert.equal(chunkDistance(chunks[0], 0, 0), Math.hypot(120, 120));
  } finally {
    stream.stop();
  }
});

test('compiled minimap roads reuse native paths and preserve city/southern coordinates', () => {
  const tile = {
      type: 'road',
      patches: null,
      base: 'road',
      variant: 'road',
      ports: 0,
      curbEdges: 0,
      areas: { road: 1 },
      edges: [],
    },
    paths = compileMinimapRoads(
      { size: 1, step: 0.25, tiles: [tile] },
      [{ x: 4, z: 7, step: 0.25, tile }],
      (x, z) => ({ x: 220 + x * 10, y: 640 + z * 9.5 }),
    );
  assert.ok(paths.city.road.startsWith('M220.000,640.000'));
  assert.ok(paths.south.road.startsWith('M260.000,706.500'));
  const previous = globalThis.Path2D,
    seen: string[] = [];
  globalThis.Path2D = class {
    constructor(source?: string | Path2D) {
      seen.push(String(source));
    }
  } as unknown as typeof Path2D;
  const ctx = { fill() {} } as unknown as CanvasRenderingContext2D;
  try {
    drawCompiledMinimapRoads(ctx, paths.city, { road: 'gray', path: 'tan', sidewalk: 'white' });
    drawCompiledMinimapRoads(ctx, paths.city, { road: 'gray', path: 'tan', sidewalk: 'white' });
    assert.equal(seen.length, 3);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, 'Path2D');
    else globalThis.Path2D = previous;
  }
});

test('visible distant hills and skyline chunks use the same frustum rules as the renderer', () => {
  const matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] satisfies [
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
    ]),
    planes = worldViewPlanes(matrix);
  for (let i = 0; i < 100; i++) {
    const x = Math.sin(i * 2) * 4,
      y = Math.cos(i * 3) * 4,
      z = Math.sin(i * 7) * 4,
      chunk = {
        lo: [x, y, z] satisfies [number, number, number],
        hi: [x + 0.6, y + 0.8, z + 0.9] satisfies [number, number, number],
      };
    assert.equal(chunkInWorldView(chunk, planes), batchInFrustum(chunk, matrix));
  }
  assert.equal(
    chunkInWorldView(
      {
        lo: [-0.5, -0.5, -0.5] satisfies [number, number, number],
        hi: [0.5, 0.5, 0.5] satisfies [number, number, number],
      },
      planes,
    ),
    true,
  );
  assert.equal(
    chunkInWorldView(
      {
        lo: [20, 20, 20] satisfies [number, number, number],
        hi: [22, 22, 22] satisfies [number, number, number],
      },
      planes,
    ),
    false,
  );
});

const streamTestGL = (): import('../types/world-stream.ts').StreamGL => ({
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  UNSIGNED_INT: 5125,
  UNSIGNED_SHORT: 5123,
  createBuffer: () => ({}),
  bindBuffer() {},
  bufferData() {},
  deleteBuffer() {},
});
const streamTestBytes = (meshes = [0]) =>
  new Uint8Array(
    gzipSync(
      encodeWorldChunk(
        meshes.map((mesh) => ({
          mesh,
          runs: [[0, 3, 0] satisfies [number, number, number]],
          data: new Float32Array(33),
        })),
      ),
    ),
  );
async function waitForStream(predicate: () => boolean) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'map streaming stopped making progress');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test('startup waits for every visible tile, including terrain beyond the initial player ring', async () => {
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
    ]),
    calls: string[] = [];
  const chunks = [
    {
      id: 'home',
      file: 'home',
      lo: [36, 0, 36] satisfies [number, number, number],
      hi: [48, 1, 48] satisfies [number, number, number],
    },
    {
      id: 'visible',
      file: 'visible',
      lo: [-0.5, 0, -0.5] satisfies [number, number, number],
      hi: [0.5, 1, 0.5] satisfies [number, number, number],
    },
    {
      id: 'hidden',
      file: 'hidden',
      lo: [120, 0, 120] satisfies [number, number, number],
      hi: [132, 1, 132] satisfies [number, number, number],
    },
  ];
  const stream = await createWorldStream({
    gl: streamTestGL(),
    manifest: {
      version: 'startup-view',
      tileSize: 12,
      metadata: { id: 'metadata', file: 'metadata' },
      chunks,
    },
    assetSource: async (c) => {
      calls.push(c.id);
      return streamTestBytes();
    },
  });
  try {
    await stream.ensure(40, 40, 0, () => {}, identity);
    assert.deepEqual(calls, ['home', 'visible'] satisfies [string, string]);
    assert.equal(stream.stats.resident, 2);
    assert.equal(stream.readyAt(0, 0), true);
  } finally {
    stream.stop();
  }
});

test('a stalled distant download cannot block visible uploads after a single camera update', async () => {
  const chunks = [
    {
      id: 'home',
      file: 'home',
      lo: [0, 0, 0] satisfies [number, number, number],
      hi: [12, 1, 12] satisfies [number, number, number],
    },
    ...([200, 208, 216, 400] satisfies [number, number, number, number]).map((x) => ({
      id: String(x),
      file: String(x),
      lo: [x, 0, 0] satisfies [number, number, number],
      hi: [x + 4, 1, 4] satisfies [number, number, number],
    })),
  ];
  let release!: () => void,
    blocked = false;
  const gate = new Promise<void>((resolve) => (release = resolve)),
    calls: string[] = [];
  const stream = await createWorldStream({
    gl: streamTestGL(),
    manifest: {
      version: 'priority',
      tileSize: 12,
      metadata: { id: 'metadata', file: 'metadata' },
      chunks,
    },
    assetSource: async (c: { id: string }) => {
      calls.push(c.id);
      if (c.id === '400') {
        blocked = true;
        await gate;
      }
      return streamTestBytes();
    },
  });
  try {
    await stream.ensure(2, 2, 0);
    stream.start();
    await waitForStream(() => blocked && stream.stats.cached === 4);
    stream.update(208, 2, 12); // Deliberately no animation-frame updates afterward.
    await waitForStream(() =>
      ([202, 210, 218] satisfies [number, number, number]).every((x) => stream.readyAt(x, 2)),
    );
    assert.equal(calls.filter((id) => id === '400').length, 1);
    assert.equal(stream.stats.queuedVisible, 0);
  } finally {
    stream.stop();
    requiredFixture(release)();
  }
});

test('failed uploads remove partial geometry and retry autonomously without leaving false resident tiles', async () => {
  const deleted: WebGLBuffer[] = [],
    gl = streamTestGL();
  let uploads = 0;
  gl.createBuffer = () => ({ id: uploads + 1 });
  gl.bufferData = () => {
    if (++uploads === 2) throw Error('temporary GPU upload failure');
  };
  gl.deleteBuffer = (b: WebGLBuffer | null) => {
    if (b) deleted.push(b);
  };
  const chunk = {
      id: '0,0',
      file: '0,0',
      lo: [0, 0, 0] satisfies [number, number, number],
      hi: [12, 1, 12] satisfies [number, number, number],
    },
    stream = await createWorldStream({
      gl,
      manifest: {
        version: 'retry',
        tileSize: 12,
        metadata: { id: 'metadata', file: 'metadata' },
        chunks: [chunk],
      },
      assetSource: async () => streamTestBytes([0, 1] satisfies [number, number]),
      retryMs: 10,
    });
  try {
    await assert.rejects(stream.ensure(2, 2, 0), /temporary GPU/);
    assert.equal(stream.stats.resident, 0);
    assert.equal(stream.stats.triangles, 0);
    assert.equal(deleted.length, 2);
    assert.deepEqual(stream.ranges({ streamId: 0 }, 0, 3), []);
    stream.start();
    await waitForStream(() => stream.readyAt(2, 2));
    assert.equal(stream.stats.resident, 1);
    assert.equal(stream.stats.triangles, 2);
    assert.equal(stream.stats.error, null);
  } finally {
    stream.stop();
  }
});

test('streaming resumes after stopping without requiring another render frame', async () => {
  const chunks = [
    {
      id: 'home',
      file: 'home',
      lo: [0, 0, 0] satisfies [number, number, number],
      hi: [12, 1, 12] satisfies [number, number, number],
    },
    {
      id: 'destination',
      file: 'destination',
      lo: [100, 0, 100] satisfies [number, number, number],
      hi: [112, 1, 112] satisfies [number, number, number],
    },
  ];
  const stream = await createWorldStream({
    gl: streamTestGL(),
    manifest: {
      version: 'resume',
      tileSize: 12,
      metadata: { id: 'metadata', file: 'metadata' },
      chunks,
    },
    assetSource: async () => streamTestBytes(),
  });
  try {
    await stream.ensure(2, 2, 0);
    stream.start();
    stream.stop();
    stream.update(105, 105, 0);
    stream.start();
    await waitForStream(() => stream.readyAt(105, 105));
  } finally {
    stream.stop();
  }
});
