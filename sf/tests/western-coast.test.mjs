import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle } from '../geometry.js';
import { MATERIAL_IDS } from '../materials.js';
import { createSFCoast, westernCoastX, westernBeachWidth, westernShoreType } from '../coastline.js';
import { createSouthernTerrain } from '../southern-terrain.js';
import { createAirship, SOUTHERN_ROADS } from '../airship.js';
import { SOUTHERN_LEVEL_PADS, SOUTHERN_BOUNDS } from '../southern-layout.js';
import {
  createCoastalRocks,
  drawCoastalRocks,
  coastalSeagullFlight,
  COASTAL_GULL_COUNT,
} from '../western-coast-details.js';

test('one coastal contour meanders by a few tiles while keeping the coastal road clear', () => {
  let min = Infinity,
    max = -Infinity;
  for (let z = 44; z <= 180; z += 0.25) {
    const x = westernCoastX(z);
    min = Math.min(min, x);
    max = Math.max(max, x);
    assert.ok(x > 8.8 && x < 13.15);
    assert.ok(Math.abs(westernCoastX(z + 0.01) - x) < 0.012);
  }
  assert.ok(max - min > 3.3);
  assert.equal(westernCoastX(96), 12);
  assert.ok(
    Math.abs(westernCoastX(96) + westernBeachWidth(96) - 14.4) < 1e-8,
    'Ocean Beach must continue seamlessly into the southern region',
  );
  const city = createSFCoast(),
    whole = createSFCoast(1.5, 180);
  for (const [x, z] of whole.filter(([x, z]) => x < 14 && z >= 43.5))
    assert.ok(Math.abs(x - westernCoastX(z)) < 1e-8);
  for (const [x, z] of city.filter(([x, z]) => x < 14 && z >= 43.5))
    assert.ok(Math.abs(x - westernCoastX(z)) < 1e-8);
  assert.ok(whole.length > city.length);
  assert.ok(westernBeachWidth(130) > 0.3);
});

test('clipped coastal terrain, walking, picking, and sealed cliff tops share the exact boundary', () => {
  const terrain = createSouthernTerrain({ roads: SOUTHERN_ROADS, pads: SOUTHERN_LEVEL_PADS }),
    mesh = new Mesh(),
    walking = createAirship();
  terrain.drawLand(mesh);
  assert.ok(mesh.data.every(Number.isFinite));
  assert.ok(
    mesh.data.length / 33 < (SOUTHERN_BOUNDS.south - SOUTHERN_BOUNDS.north) * 800,
    'keep a fixed terrain triangle budget per north/south tile as the map grows',
  );
  for (let i = 0; i < mesh.data.length; i += 33) {
    const material = mesh.data[i + 9],
      beach = [MATERIAL_IDS.sand, MATERIAL_IDS.stone].some((id) => material === -2 - id),
      grass = material === -2 - MATERIAL_IDS.grass;
    if (!beach && !grass) continue;
    for (const j of [0, 11, 22]) {
      const x = mesh.data[i + j],
        z = mesh.data[i + j + 2],
        edge = x - westernCoastX(z) - westernBeachWidth(z);
      assert.ok(
        beach ? edge < 0.02 : edge > -0.02,
        'a whole terrain triangle straddles the beach material boundary',
      );
    }
  }
  for (const z of [99.37, 111.31, 127.67, 145.13, 171.29, 191.31, 210.13, 220.37, 232.13, 239.31]) {
    const shore = westernCoastX(z);
    assert.equal(terrain.contains(shore - 0.2, z), false);
    assert.equal(walking.contains(shore - 0.2, z), false);
    assert.equal(terrain.raycast({ origin: [shore - 0.2, 20, z], dir: [0, -1, 0] }), null);
    const x = shore + 0.6,
      ray = { origin: [x, 20, z], dir: [0, -1, 0] },
      hit = terrain.raycast(ray);
    assert.ok(hit);
    assert.ok(walking.contains(x, z));
    assert.ok(Math.abs(hit.point[1] - terrain.height(x, z)) < 1e-8);
    let closest = Infinity;
    for (let i = 0; i < mesh.data.length; i += 33) {
      const d = rayTriangle(ray, ...[0, 11, 22].map((j) => mesh.data.slice(i + j, i + j + 3)));
      if (d !== null) closest = Math.min(closest, d);
    }
    assert.ok(
      Math.abs(20 - closest - terrain.height(x, z)) < 1e-7,
      'rendered coastline differs from picking',
    );
  }
  for (const [a, b] of terrain.coastRim())
    for (const f of [0.25, 0.5, 0.75]) {
      const x = a[0] + (b[0] - a[0]) * f,
        z = a[2] + (b[2] - a[2]) * f,
        h = a[1] + (b[1] - a[1]) * f;
      assert.ok(
        Math.abs(h - terrain.height(x, z)) < 1e-8,
        'a cliff curtain separates from the clipped terrain',
      );
    }
});

test('the minimap clips to the same coves and shows both sandy and rocky shore bands', () => {
  const terrain = createSouthernTerrain(),
    colors = new Set();
  let points = [];
  const ctx = {
    beginPath() {
      points = [];
    },
    moveTo(x, z) {
      points.push([x, z]);
    },
    lineTo(x, z) {
      points.push([x, z]);
    },
    closePath() {},
    fill() {
      colors.add(this.fillStyle);
      for (const [x, z] of points)
        assert.ok(x >= westernCoastX(z) - 1e-7, 'minimap paints land out into the ocean');
    },
    stroke() {},
  };
  terrain.drawMinimap(ctx, (x, z) => ({ x, y: z }));
  assert.ok(colors.has('#c7b98d'));
  assert.ok(colors.has('#91988a'));
  const types = new Set();
  for (let z = 96; z < 180; z += 2) types.add(westernShoreType(westernCoastX(z) + 0.1, z));
  assert.ok(types.has('sand') && types.has('rock'));
});

test('coastal boulders are bounded static meshes and gulls glide smoothly along the western shore', () => {
  const rocks = createCoastalRocks(),
    mesh = new Mesh();
  drawCoastalRocks(
    mesh,
    rocks,
    () => 0.8,
    (x, z) => x >= westernCoastX(z),
  );
  assert.ok(rocks.length >= 40);
  assert.ok(mesh.data.every(Number.isFinite));
  assert.ok(mesh.data.length / 33 < 5000);
  for (let i = 0; i < mesh.data.length; i += 11)
    assert.ok(mesh.data[i] < 13.5, 'coastal rocks must leave the road and its curbs clear');
  for (let i = 0; i < COASTAL_GULL_COUNT; i++)
    for (let t = 0; t < 30000; t += 700) {
      const a = coastalSeagullFlight(t, i),
        b = coastalSeagullFlight(t + 10, i);
      assert.ok(Object.values(a).every(Number.isFinite));
      assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 0.02);
      assert.ok(Math.cos(a.angle) * (b.x - a.x) + Math.sin(a.angle) * (b.z - a.z) > 0);
      assert.ok(Math.abs(coastalSeagullFlight(t, i, true).flap) < 0.02);
    }
});
