import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle } from '../geometry.js';
import {
  PENINSULA_STREETS,
  PENINSULA_HOUSING,
  PACIFICA_PARK,
  PACIFICA_PARK_PATHS,
  pacificaParkWalkable,
} from '../southern-expansion.js';
import { SOUTHERN_ROADS, createAirship, drawAirportRoad } from '../airship.js';
import { SOUTHERN_TRAILS, SOUTHERN_LEVEL_PADS, southernTrailDistance } from '../southern-layout.js';
import { createSouthernTerrain } from '../southern-terrain.js';

test('new peninsula streets form connected blocks and every house stays clear of paths', () => {
  const a = createAirship(),
    from = { x: 62, y: 99 };
  assert.ok(PENINSULA_STREETS.length >= 12);
  assert.ok(PENINSULA_HOUSING.length >= 20);
  for (const r of PENINSULA_STREETS)
    for (const [x, z] of r.points) {
      if (z < 93.5) continue; // The city-side connection is checked against the production world below.
      const to = { x: x - 0.5, y: z - 0.5 },
        route = a.path(from, to, () => null);
      assert.ok(route, r.name + ' must join the network');
      let previous = from;
      for (const p of route) {
        assert.ok(a.segment(previous, p));
        previous = p;
      }
    }
  for (const p of PENINSULA_HOUSING)
    for (const x of [-p.w / 2, 0, p.w / 2])
      for (const z of [-p.d / 2, 0, p.d / 2]) {
        const c = Math.cos(p.rotation),
          s = Math.sin(p.rotation);
        assert.ok(
          southernTrailDistance(p.x + x * c - z * s, p.z + x * s + z * c) > 0.05,
          'a home must not cross a trail',
        );
      }
  assert.equal(pacificaParkWalkable(25, 131.4), false, 'the fountain is solid');
  for (const r of PACIFICA_PARK_PATHS)
    for (let i = 1; i < r.points.length; i++) {
      const from = { x: r.points[i - 1][0] - 0.5, y: r.points[i - 1][1] - 0.5 },
        to = { x: r.points[i][0] - 0.5, y: r.points[i][1] - 0.5 };
      assert.ok(a.segment(from, to), 'the park loop must remain unobstructed');
    }
  assert.ok(a.path(from, PACIFICA_PARK.entry, () => null));
});

test('merged peninsula paving preserves terrain heights on straight roads, junctions, and hills', () => {
  const t = createSouthernTerrain({ roads: SOUTHERN_ROADS, pads: SOUTHERN_LEVEL_PADS }),
    m = new Mesh();
  drawAirportRoad(m, 96, t.height);
  for (const [x, z] of [
    [28.5, 123.13],
    [35.5, 102.73],
    [49.5, 99.5],
    [25, 135.5],
    [53, 119.5],
  ]) {
    const ray = { origin: [x, 30, z], dir: [0, -1, 0] };
    let closest = Infinity;
    for (let i = 0; i < m.data.length; i += 33) {
      const d = rayTriangle(ray, ...[0, 11, 22].map((j) => m.data.slice(i + j, i + j + 3)));
      if (d !== null) closest = Math.min(closest, d);
    }
    assert.ok(Number.isFinite(closest));
    assert.ok(
      Math.abs(30 - closest - t.height(x, z) - 0.018) < 1e-7,
      'merged paving must stay on the terrain',
    );
  }
  assert.ok(SOUTHERN_TRAILS.length >= 4);
});
