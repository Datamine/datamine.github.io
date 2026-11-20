import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUTHERN_HOUSING,
  inSouthernHousePlot,
  isSearchHousePlot,
  SOUTHERN_TRAILS,
  southernTrailDistance,
  southernSegmentDistance,
} from '../southern-layout.js';
import { suburbanSolidAt } from '../suburban-layout.js';
import { isWizardHousePlot } from '../wizard-house.js';
import { insideInstitute, instituteLocalPoint } from '../institute-interiors.js';
import { createRegionalNavigation } from '../regional-navigation.js';
import { airportRoadDistance, SOUTHERN_ROADS } from '../airship.js';

test('spatially indexed southern lots match the original full scan, including fences and rotated/padded boundaries', () => {
  const original = (x, z, padding) =>
    SOUTHERN_HOUSING.some((p) => {
      if (isWizardHousePlot(p) || isSearchHousePlot(p)) return false;
      const dx = x - p.x,
        dz = z - p.z,
        c = Math.cos(p.rotation),
        s = Math.sin(p.rotation),
        u = dx * c + dz * s,
        v = -dx * s + dz * c;
      return p.lowRiseStyle
        ? suburbanSolidAt(p, u, v, padding)
        : Math.abs(u) < p.w / 2 + padding && Math.abs(v) < p.d / 2 + padding;
    });
  for (const padding of [0, 0.16, 0.5, 1, 2, 3, -0.1]) {
    for (let i = 0; i < 500; i++) {
      const x = 10 + ((i * 23.731) % 100),
        z = 90 + ((i * 7.193) % 160);
      assert.equal(inSouthernHousePlot(x, z, padding), original(x, z, padding));
    }
    for (const p of SOUTHERN_HOUSING)
      for (const [dx, dz] of [
        [0, 0],
        [p.w / 2 + 0.15, 0],
        [0, p.d / 2 - 0.07],
      ]) {
        const x = p.x + dx * Math.cos(p.rotation) - dz * Math.sin(p.rotation),
          z = p.z + dx * Math.sin(p.rotation) + dz * Math.cos(p.rotation);
        assert.equal(inSouthernHousePlot(x, z, padding), original(x, z, padding));
      }
  }
});

test('fast institute rejection preserves rotated-room interior tests', () => {
  for (const rotation of [0, 0.2, Math.PI / 2, Math.PI])
    for (let i = 0; i < 1000; i++) {
      const room = { x: 20, z: 30, w: 5, d: 3, rotation },
        x = 20 + Math.sin(i) * 20,
        z = 30 + Math.cos(i * 3) * 20,
        p = instituteLocalPoint(room, x, z);
      assert.equal(
        insideInstitute(room, x, z),
        Math.abs(p.u) < room.w / 2 - 0.12 && Math.abs(p.v) < room.d / 2 - 0.12,
      );
    }
});

test('outside regional-grid probes never evaluate expensive land classifiers', () => {
  let probes = 0;
  const nav = createRegionalNavigation({
    west: 0,
    east: 2.1,
    north: 0,
    south: 2.1,
    walkable: () => {
      probes++;
      return true;
    },
    clearance: 0,
  });
  assert.equal(nav.contains(1, 1), true);
  const initial = probes;
  for (const [x, z] of [
    [-1, 1],
    [1, -1],
    [100, 100],
    [1, 3],
    [3, 1],
  ])
    assert.equal(nav.contains(x, z), false);
  assert.equal(probes, initial);
  assert.equal(nav.contains(2.24, 2.24), true, 'keep the original rounded-up grid extent');
  assert.equal(nav.contains(2.25, 1), false);
});

test('indexed road and path distances exactly match full scans across the map and distant water', () => {
  for (let i = 0; i < 10000; i++) {
    const x = ((i * 3.719) % 130) - 10,
      z = (i * 7.113) % 300;
    let road = Infinity,
      trail = Infinity;
    for (const r of SOUTHERN_ROADS)
      for (let j = 1; j < r.points.length; j++)
        road = Math.min(road, southernSegmentDistance(x, z, r.points[j - 1], r.points[j]));
    for (const r of SOUTHERN_TRAILS)
      for (let j = 1; j < r.points.length; j++)
        trail = Math.min(
          trail,
          southernSegmentDistance(x, z, r.points[j - 1], r.points[j]) - r.halfWidth,
        );
    assert.equal(airportRoadDistance(x, z), road - 0.5);
    assert.equal(southernTrailDistance(x, z), trail);
  }
});
