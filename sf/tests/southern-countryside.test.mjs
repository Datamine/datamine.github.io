import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUTHERN_MAP_END,
  PENINSULA_HIGHWAY_X,
  STARTUP_SITE,
  SOUTHERN_LAKE,
  SOUTHERN_COUNTRY_HOMES,
  SOUTHERN_COUNTRY_ROADS,
  inSouthernLake,
  partitionSouthernLake,
} from '../southern-countryside-layout.js';
import { SOUTHERN_ROADS, airportRoadDistance, airportSurfaceTypeAt } from '../airship.js';
import { RESEARCH_CAMPUSES, researchCampusAt } from '../research-layout.js';
import { COW_PEN } from '../jurassic-layout.js';
import {
  SETTLEMENT_PARCELS,
  settlementParcelBounds,
  SETTLEMENT_ROADS,
} from '../southern-settlement-layout.js';
import { SOUTHERN_HOUSING, SOUTHERN_TRAILS, southernSegmentDistance } from '../southern-layout.js';
import { westernCoastX, westernCoastline } from '../coastline.js';
import { inCivicGrounds, inRailPit } from '../southern-district.js';

test('a straight airport highway continues past the startup side street to the extended southern edge', () => {
  assert.equal(SOUTHERN_MAP_END, 240, 'extend the previous 216-tile border by 24 tiles');
  const highway = SOUTHERN_ROADS.find((r) => r.name === 'Third Street south');
  assert.ok(highway.points.every((p) => p[0] === PENINSULA_HIGHWAY_X));
  assert.ok(highway.points.at(-1)[1] > SOUTHERN_MAP_END - 1);
  for (let z = 130; z < SOUTHERN_MAP_END - 1; z += 0.25)
    assert.equal(airportSurfaceTypeAt(PENINSULA_HIGHWAY_X, z), 'road', 'highway blocked at ' + z);
  assert.ok(Math.abs(STARTUP_SITE.x - PENINSULA_HIGHWAY_X) > 3.5);
  const lane = SOUTHERN_ROADS.find((r) => r.name === 'Startup garden lane');
  assert.equal(lane.points.at(-1)[0], PENINSULA_HIGHWAY_X);
  assert.ok(RESEARCH_CAMPUSES.every((c) => c.north > 190 && c.south < SOUTHERN_MAP_END));
  assert.ok(Math.abs(RESEARCH_CAMPUSES[0].x - RESEARCH_CAMPUSES[1].x) < 11);
  assert.equal(RESEARCH_CAMPUSES[0].z, RESEARCH_CAMPUSES[1].z);
  assert.ok(COW_PEN.z > SOUTHERN_COUNTRY_ROADS[0].points[0][1] && COW_PEN.z < 194.5);
});

test('southern neighborhood parcels clear all houses, public roads, paths, water and relocated campuses', () => {
  assert.ok(SETTLEMENT_PARCELS.filter((p) => p.z > 216).length >= 20);
  assert.ok(
    SETTLEMENT_PARCELS.some((p) => p.z > 225 && !p.lowRiseStyle),
    'urban flats also reach the far south',
  );
  assert.ok(
    SETTLEMENT_PARCELS.filter((p) => p.z < 148 && p.shop).length >= 3,
    'shops precede the Times Square towers',
  );
  for (const p of SETTLEMENT_PARCELS) {
    const box = settlementParcelBounds(p);
    for (const q of SOUTHERN_HOUSING) {
      if (p.id === q.id) continue;
      const other = settlementParcelBounds(q);
      assert.ok(
        box[2] <= other[0] || box[0] >= other[2] || box[3] <= other[1] || box[1] >= other[3],
        p.id + ' overlaps a home at ' + q.x + ',' + q.z,
      );
    }
    for (let x = box[0]; x <= box[2] + 1e-8; x += 0.2)
      for (let z = box[1]; z <= box[3] + 1e-8; z += 0.2) {
        assert.ok(airportRoadDistance(x, z) > 0.4, p.id + ' crosses a curb at ' + x + ',' + z);
        assert.equal(inSouthernLake(x, z, 0.2), false);
        assert.equal(researchCampusAt(x, z), null);
        assert.notEqual(airportSurfaceTypeAt(x, z), 'water');
        assert.equal(
          inCivicGrounds(x, z, 0.15),
          false,
          p.id + ' overlaps a civic building or the rail excavation',
        );
        for (const trail of SOUTHERN_TRAILS)
          for (let i = 1; i < trail.points.length; i++)
            assert.ok(
              southernSegmentDistance(x, z, trail.points[i - 1], trail.points[i]) >
                trail.halfWidth + 0.1,
              p.id + ' crosses ' + trail.name,
            );
      }
  }
  assert.ok(RESEARCH_CAMPUSES.every((c) => c.north > 216));
  assert.ok(
    RESEARCH_CAMPUSES[1].west > RESEARCH_CAMPUSES[0].east,
    'rival campuses are adjacent without overlapping',
  );
  assert.ok(
    RESEARCH_CAMPUSES[1].west - RESEARCH_CAMPUSES[0].east < 1,
    'shared promenade joins neighboring courts',
  );
  for (const road of SETTLEMENT_ROADS)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4);
      for (let j = 0; j <= steps; j++)
        assert.equal(
          inRailPit(a[0] + ((b[0] - a[0]) * j) / steps, a[1] + ((b[1] - a[1]) * j) / steps),
          false,
          road.name + ' crosses the rail excavation',
        );
    }
});

test('the expanded west coast has shared contour stations all the way to the new border', () => {
  const coast = westernCoastline(216, SOUTHERN_MAP_END);
  assert.ok(coast.length >= 12);
  assert.equal(coast.at(-1)[1], SOUTHERN_MAP_END);
  assert.ok(Math.max(...coast.map((p) => p[0])) - Math.min(...coast.map((p) => p[0])) > 2);
  for (const [x, z] of coast) assert.equal(westernCoastX(z), x);
});

test('new low-rise home parcels leave roads, lake water, campuses and one another clear', () => {
  assert.ok(SOUTHERN_COUNTRY_HOMES.length >= 20);
  assert.equal(new Set(SOUTHERN_COUNTRY_HOMES.map((p) => p.lowRiseStyle)).size, 3);
  const bounds = SOUTHERN_COUNTRY_HOMES.map((p) => {
    const sideways = Math.abs(Math.sin(p.rotation)) > 0.5;
    return { p, w: sideways ? p.d : p.w, d: sideways ? p.w : p.d };
  });
  for (const { p, w, d } of bounds)
    for (let x = p.x - w / 2; x <= p.x + w / 2 + 1e-8; x += 0.2)
      for (let z = p.z - d / 2; z <= p.z + d / 2 + 1e-8; z += 0.2) {
        assert.ok(airportRoadDistance(x, z) > 0.4, 'house over curb at ' + x + ',' + z);
        assert.equal(inSouthernLake(x, z, 0.2), false);
        assert.equal(researchCampusAt(x, z), null);
      }
  for (let i = 0; i < bounds.length; i++)
    for (let j = 0; j < i; j++) {
      const a = bounds[i],
        b = bounds[j];
      assert.ok(
        Math.abs(a.p.x - b.p.x) >= (a.w + b.w) / 2 || Math.abs(a.p.z - b.p.z) >= (a.d + b.d) / 2,
        'overlapping homes',
      );
    }
});

test('lake shore faces are a complete partition, sharing exact level vertices with the water', () => {
  const l = SOUTHERN_LAKE,
    area = (p) =>
      Math.abs(
        p.reduce((sum, a, i) => {
          const b = p[(i + 1) % p.length];
          return sum + a[0] * b[2] - b[0] * a[2];
        }, 0),
      ) / 2;
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      x = l.x + Math.cos(a) * l.rx,
      z = l.z + Math.sin(a) * l.rz;
    const face = [
        [x - 0.4, 1.9, z - 0.4],
        [x + 0.4, 1.6, z - 0.4],
        [x + 0.4, 1.4, z + 0.4],
      ],
      land = [],
      water = [];
    partitionSouthernLake(
      face,
      (p) => land.push(p),
      (p) => water.push(p),
    );
    assert.ok(Math.abs([...land, ...water].reduce((n, p) => n + area(p), 0) - area(face)) < 1e-8);
    for (const poly of water) assert.ok(poly.every((p) => p[1] === l.level));
    if (land.length && water.length) {
      const common = land[0].filter((a) => water[0].some((b) => a.every((v, k) => v === b[k])));
      assert.equal(common.length, 2);
      assert.ok(common.every((p) => p[1] === l.level));
    }
  }
  assert.equal(airportSurfaceTypeAt(l.x, l.z), 'water');
});
