import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUTHERN_HOUSING,
  inSouthernHousePlot,
  isSearchHousePlot,
  SOUTHERN_TRAILS,
  southernTrailDistance,
  southernSegmentDistance,
} from '../southern-layout.ts';
import { suburbanSolidAt } from '../suburban-layout.ts';
import { isWizardHousePlot } from '../wizard-house.ts';
import { insideInstitute, instituteLocalPoint } from '../institute-interiors.ts';
import { createRegionalNavigation } from '../regional-navigation.ts';
import { airportRoadDistance, SOUTHERN_ROADS } from '../airship.ts';

test('spatially indexed southern lots match the original full scan, including fences and rotated/padded boundaries', () => {
  const original = (x: number, z: number, padding?: number | undefined) =>
    SOUTHERN_HOUSING.some((p) => {
      if (isWizardHousePlot(p) || isSearchHousePlot(p)) return false;
      const dx = x - p.x,
        dz = z - p.z,
        c = Math.cos(requiredFixture(p.rotation)),
        s = Math.sin(requiredFixture(p.rotation)),
        u = dx * c + dz * s,
        v = -dx * s + dz * c;
      assert.ok(padding != null, 'Missing test fixture: padding');
      return p.lowRiseStyle
        ? suburbanSolidAt(p, u, v, padding)
        : Math.abs(u) < p.w / 2 + padding && Math.abs(v) < p.d / 2 + padding;
    });
  for (const padding of [0, 0.16, 0.5, 1, 2, 3, -0.1] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]) {
    for (let i = 0; i < 500; i++) {
      const x = 10 + ((i * 23.731) % 100),
        z = 90 + ((i * 7.193) % 160);
      assert.equal(inSouthernHousePlot(x, z, padding), original(x, z, padding));
    }
    for (const p of SOUTHERN_HOUSING)
      for (const [dx, dz] of [
        [0, 0] satisfies [number, number],
        [p.w / 2 + 0.15, 0] satisfies [number, number],
        [0, p.d / 2 - 0.07] satisfies [number, number],
      ]) {
        const x =
            p.x +
            dx * Math.cos(requiredFixture(p.rotation)) -
            dz * Math.sin(requiredFixture(p.rotation)),
          z =
            p.z +
            dx * Math.sin(requiredFixture(p.rotation)) +
            dz * Math.cos(requiredFixture(p.rotation));
        assert.equal(inSouthernHousePlot(x, z, padding), original(x, z, padding));
      }
  }
});

test('fast institute rejection preserves rotated-room interior tests', () => {
  for (const rotation of [0, 0.2, Math.PI / 2, Math.PI] satisfies [number, number, number, number])
    for (let i = 0; i < 1000; i++) {
      const room = { x: 20, z: 30, w: 5, d: 3, base: 0, rotation },
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
    [-1, 1] satisfies [number, number],
    [1, -1] satisfies [number, number],
    [100, 100] satisfies [number, number],
    [1, 3] satisfies [number, number],
    [3, 1] satisfies [number, number],
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
