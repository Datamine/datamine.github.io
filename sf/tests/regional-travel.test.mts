import { mapTuple } from './helpers/geometry.mts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle } from '../geometry.ts';
import { BAY_BRIDGE_WIDTH, DOWNTOWN, drawBayBridge } from '../downtown.ts';
import { createRegionalRoad, EAST_BAY_DEALERSHIP } from '../regional-road.ts';
import { createFerrari } from '../ferrari.ts';
import { createHighwaySites } from '../adventure-sites.ts';
import { EAST_BAY_COAST_X } from '../geography.ts';
import {
  createRocketTravel,
  drawReusableRocket,
  drawRocketPad,
  ROCKET_CABIN_HEIGHT,
} from '../rocket.ts';
import { TAHOE_VILLAGE, createTahoe, regionalGroundHeight } from '../tahoe.ts';
import { SF_SPACEPORT, SPACEPORT_HOUSES, TAX_HQ } from '../southern-district.ts';
import { createAirship, AIRSHIP_TERMINAL, AIRSHIP_ACCESS } from '../airship.ts';

test('the island crossing reaches the Ferrari in under nine seconds of walking', () => {
  const road = createRegionalRoad(),
    car = createFerrari(road),
    island = DOWNTOWN.bridge.end.map((v) => v * 1.5);
  const index = road.points.findIndex((p) => Math.hypot(p.x - island[0], p.z - island[1]) < 1e-7);
  assert.ok(index >= 0);
  const distance = car.dealer - car.distances[index];
  assert.ok(distance > 25 && distance < 40, 'the former 99-tile approach should be a short walk');
  assert.ok(distance / 4.6 < 9);
  const dealer = car.sample(car.dealer);
  assert.equal(dealer.x, EAST_BAY_DEALERSHIP.x);
  assert.equal(dealer.z, EAST_BAY_DEALERSHIP.z);
  for (const site of createHighwaySites(car).filter((s) =>
    (['burger', 'dealership'] satisfies [string, string]).includes(s.kind),
  )) {
    assert.ok(
      site.entry.x + 0.5 > EAST_BAY_COAST_X + 4,
      'roadside shops must sit past the compressed shoreline',
    );
    assert.ok(regionalGroundHeight(site.entry.x + 0.5, site.entry.y + 0.5) > 0);
  }
  const from = { x: island[0] - 0.5, y: island[1] - 0.5 },
    to = { x: dealer.x - 0.5, y: dealer.z - 0.5 };
  for (const [a, b] of [
    [from, to],
    [to, from],
  ]) {
    let previous = a;
    for (const next of requiredFixture(road.along(a, b))) {
      assert.ok(road.segment(previous, next));
      previous = next;
    }
    assert.deepEqual(previous, b);
  }
});

test('the highway connects the Bay Bridge to Tahoe continuously in both directions', () => {
  const road = createRegionalRoad(),
    tahoe = createTahoe(),
    services = {
      cityPath: (
        a: import('../types/geometry.ts').Point,
        b: import('../types/geometry.ts').Point,
      ) => [{ ...b }],
      tahoePath: (a: { x: number; y: number }, b: { x: number; y: number }) => tahoe.path(a, b),
    };
  assert.ok(road.points.length < 1500);
  assert.ok(
    Math.hypot(
      requiredFixture(road.points.at(-1)).x - TAHOE_VILLAGE.arrival.x,
      requiredFixture(road.points.at(-1)).z - TAHOE_VILLAGE.arrival.z,
    ) < 1e-8,
  );
  for (const [from, to] of [
    [road.gate('city'), road.gate('tahoe')],
    [road.gate('tahoe'), road.gate('city')],
  ]) {
    const route = road.path(from, to, services);
    assert.ok(route && route.length > 100);
    let p = from;
    for (const q of requiredFixture(route)) {
      assert.ok(
        road.segment(p, q),
        'the highway route must never cut a corner into the bay or countryside',
      );
      p = q;
    }
    assert.deepEqual(requiredFixture(route).at(-1), to);
  }
  const route = road.path(road.gate('city'), tahoe.spaceport.entry, services);
  assert.ok(route && route.length > 100);
  assert.deepEqual(requiredFixture(route).at(-1), tahoe.spaceport.entry);
  const toStation = road.path(tahoe.spaceport.entry, tahoe.baseEntry, services);
  let previous = tahoe.spaceport.entry;
  for (const point of requiredFixture(toStation)) {
    assert.ok(
      Math.hypot(point.x - previous.x, point.y - previous.y) > 1e-7,
      'shared regional gates must not leave duplicate arrival waypoints',
    );
    previous = point;
  }
  assert.deepEqual(previous, tahoe.baseEntry);
  assert.deepEqual(road.path(tahoe.baseEntry, tahoe.baseEntry, services), []);
});

test('road picking, walking heights, and rendered geometry share the same surface', () => {
  const road = createRegionalRoad(),
    mesh = road.mesh();
  assert.ok(mesh.data.every(Number.isFinite));
  assert.ok(mesh.data.length / 33 < 40000);
  for (const s of road.segments) {
    for (const t of [0.15, 0.5, 0.85] satisfies [number, number, number]) {
      const x = s.a.x + s.dx * t,
        z = s.a.z + s.dz * t,
        p = road.at(x, z);
      assert.ok(p);
      assert.ok(Math.abs(p.height - (s.a.y + (s.b.y - s.a.y) * t)) < 1e-6);
      if (x > 160)
        assert.ok(p.height >= regionalGroundHeight(x, z) - 0.1, 'terrain cannot cover the highway');
    }
  }
  for (let i = 5; i < road.segments.length; i += 83) {
    const s = road.segments[i],
      x = (s.a.x + s.b.x) / 2,
      z = (s.a.z + s.b.z) / 2,
      height = requiredFixture(road.at(x, z)).height,
      hit = road.raycast({
        origin: [x, height + 10, z],
        dir: [0, -1, 0] satisfies [number, number, number],
      });
    assert.ok(hit);
    assert.ok(Math.abs(hit.point[1] - height) < 1e-6);
  }
});

test('the Bay Bridge deck and the entire road to Tahoe stay exactly one tile wide', () => {
  const road = createRegionalRoad();
  assert.equal(BAY_BRIDGE_WIDTH, 1);
  for (const s of road.segments) {
    assert.equal(s.w * 2, 1);
    for (const [a, b] of [
      [s.quad[0], s.quad[1]],
      [s.quad[3], s.quad[2]],
    ])
      assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[2] - b[2]) - 1) < 1e-8);
  }
  const m = new Mesh();
  drawBayBridge(m, 1.5, () => 1.15);
  const a = DOWNTOWN.bridge.abutment.map((v) => v * 1.5),
    b = DOWNTOWN.bridge.end.map((v) => v * 1.5),
    dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz),
    center = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] satisfies [number, number];
  for (const [offset, expected] of [
    [0.49, true] satisfies [number, boolean],
    [0.55, false] satisfies [number, boolean],
  ]) {
    const ray = {
      origin: [
        center[0] - (dz / length) * offset,
        4,
        center[1] + (dx / length) * offset,
      ] satisfies [number, number, number],
      dir: [0, -1, 0] satisfies [number, number, number],
    };
    let deck = false;
    for (let i = 0; i < m.data.length; i += 33)
      if (
        ([1, 12, 23] satisfies [number, number, number]).every(
          (j) => Math.abs(m.data[i + j] - 2.5) < 1e-8,
        ) &&
        rayTriangle(
          ray,
          ...mapTuple([0, 11, 22] satisfies [number, number, number], (j) =>
            m.data.slice(i + j, i + j + 3),
          ),
        ) !== null
      ) {
        deck = true;
        break;
      }
    assert.equal(deck, expected, 'rendered bridge deck must share the highway width');
  }
});

test('clicking road edges or rounded minimap pixels selects a safe point inside the rails', () => {
  const road = createRegionalRoad();
  for (const s of road.segments)
    for (const offset of [-0.61, -0.49, 0.49, 0.61] satisfies [number, number, number, number]) {
      const x = (s.a.x + s.b.x) / 2 + s.nx * offset,
        z = (s.a.z + s.b.z) / 2 + s.nz * offset,
        target = road.targetAt(x, z);
      assert.ok(target, 'edge click must still select the road');
      assert.ok(road.contains(target.x + 0.5, target.y + 0.5));
    }
  assert.equal(road.targetAt(5000, 5000), null);
  assert.equal(road.targetAt(NaN, NaN), null);
});

test('the rocket boards, flies geographically, lands, and disembarks for repeat journeys', () => {
  const tahoe = createTahoe(),
    rocket = createRocketTravel({ groundHeight: regionalGroundHeight });
  for (const [from, to] of [
    [SF_SPACEPORT, tahoe.spaceport],
    [tahoe.spaceport, SF_SPACEPORT],
  ]) {
    assert.ok(rocket.start(from, to));
    assert.equal(rocket.start(from, to), false);
    let previous = { ...rocket.state.position },
      highest = 0,
      arrived = false;
    for (let i = 0; i < 3000; i++) {
      const event = rocket.update(1 / 60),
        p = rocket.state.position;
      assert.ok(Object.values(requiredFixture(p)).every(Number.isFinite));
      assert.ok(p != null, 'Missing test fixture: p');
      assert.ok(
        Math.hypot(
          p.x - requiredFixture(previous.x),
          p.y - requiredFixture(previous.y),
          p.z - requiredFixture(previous.z),
        ) < 6,
      );
      previous = { ...p };

      highest = Math.max(highest, p.y);
      if (
        (['ascending', 'cruising', 'descending'] satisfies [string, string, string]).includes(
          rocket.state.phase,
        )
      )
        assert.ok(
          Math.abs(p.y - requiredFixture(rocket.state.vehicle).y - ROCKET_CABIN_HEIGHT) < 1e-7,
        );
      if (rocket.state.phase === 'cruising')
        assert.ok(requiredFixture(rocket.state.vehicle).y > regionalGroundHeight(p.x, p.z) + 10);
      if (event === 'arrived') {
        arrived = true;
        break;
      }
    }
    assert.ok(arrived);
    assert.ok(highest > 350);
    assert.equal(rocket.state.active, false);
    assert.deepEqual(rocket.state.position, {
      x: to.entry.x + 0.5,
      y: to.base + 0.04,
      z: to.entry.y + 0.5,
    });
  }
  rocket.start(SF_SPACEPORT, tahoe.spaceport);
  rocket.update(10);
  rocket.cancel();
  assert.equal(rocket.state.active, false);
  assert.equal(rocket.state.position, null);
});

test('rocket meshes remain bounded and the spaceport is an airport appendage in the bay', () => {
  for (const occupied of [false, true] satisfies [boolean, boolean]) {
    const m = new Mesh();
    drawReusableRocket(m, { x: 0, y: 0, z: 0 }, 0, { occupied, thrust: 1, cameraAngle: 0.3 });
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 12000);
  }
  const pad = new Mesh();
  drawRocketPad(pad, SF_SPACEPORT, new Map());
  assert.ok(pad.data.every(Number.isFinite));
  assert.ok(SF_SPACEPORT.x > 100);
  assert.ok(createAirship().path(AIRSHIP_TERMINAL.boarding, SF_SPACEPORT.entry, () => null));
  assert.ok(SPACEPORT_HOUSES.x > TAX_HQ.x + 2.7);
});

test('the jet terminal driveway opens directly from the street onto the boarding apron', () => {
  const airport = createAirship(),
    from = { x: AIRSHIP_ACCESS.points[0][0] - 0.5, y: 109 },
    apron = { x: 83.7, y: 109 };
  assert.ok(airport.segment(from, apron));
  assert.ok(airport.path(from, AIRSHIP_TERMINAL.entry, () => null));
  assert.ok(airport.path(AIRSHIP_TERMINAL.entry, AIRSHIP_TERMINAL.boarding, () => null));
  for (let i = 0; i <= 100; i++)
    assert.ok(
      airport.contains(from.x + ((apron.x - from.x) * i) / 100 + 0.5, 109.5),
      'no collision sliver may divide street and apron',
    );
});
