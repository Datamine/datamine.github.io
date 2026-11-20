import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoliceChase, createDetentionSite } from '../encounters.js';
import { createWindsurfing } from '../windsurfing.js';
import { marinElevation } from '../geography.js';

function pursuit(overrides = {}) {
  const player = { x: 20, y: 20, angle: 0 };
  let arrests = 0;
  const chase = createPoliceChase({
    player,
    routeTo: (x, y) => [{ x, y }],
    nearest: (x, y) => ({ x, y }),
    canCapture: () => true,
    onArrest: () => arrests++,
    ...overrides,
  });
  return { player, chase, arrests: () => arrests };
}

test('police match a moving player, then catch a player who stops', () => {
  const { player, chase, arrests } = pursuit(),
    speed = 4.6,
    dt = 1 / 60;
  chase.start();
  assert.equal(chase.state.officers.length, 3);
  const initial = chase.state.officers.map((o) => player.x - o.x);
  for (let i = 0; i < 600; i++) {
    player.x += speed * dt;
    chase.update(dt, speed);
  }
  assert.equal(arrests(), 0);
  chase.state.officers.forEach((o, i) => assert.ok(Math.abs(player.x - o.x - initial[i]) < 1e-6));
  for (let i = 0; i < 180; i++) chase.update(dt, speed);
  assert.equal(arrests(), 1);
  assert.equal(chase.state.jailed, true);
  assert.equal(chase.state.wanted, false);
  const stopped = chase.state.officers.map((o) => [o.x, o.y]);
  chase.start();
  chase.update(20, speed);
  assert.equal(arrests(), 1);
  assert.deepEqual(
    chase.state.officers.map((o) => [o.x, o.y]),
    stopped,
  );
});

test('pursuit keeps moving on its existing route if replanning fails', () => {
  let planning = true;
  const { chase } = pursuit({ routeTo: (x, y) => (planning ? [{ x, y }] : null) });
  chase.start();
  planning = false;
  const before = chase.state.officers.map((o) => ({ x: o.x, y: o.y }));
  chase.update(0.6, 4.6);
  chase.state.officers.forEach((o, i) =>
    assert.ok(Math.abs(Math.hypot(o.x - before[i].x, o.y - before[i].y) - 2.76) < 1e-6),
  );
});

test('catching someone across an obstruction requires a clear route', () => {
  const { chase, arrests } = pursuit({ canCapture: () => false });
  chase.start();
  chase.update(3, 4.6);
  assert.equal(arrests(), 0);
  assert.equal(chase.state.wanted, true);
});

test('detention has a level interior without flattening the surrounding headlands', () => {
  const s = createDetentionSite(1.5);
  assert.ok(s.z < 0);
  for (const [dx, dz] of [
    [0, 0],
    [1.8, 1.8],
    [-1.8, -1.8],
  ])
    assert.equal(s.terrain(s.x + dx, s.z + dz), s.base);
  for (const [dx, dz] of [
    [4, 0],
    [0, 4],
    [-4, -4],
  ])
    assert.equal(s.terrain(s.x + dx, s.z + dz), marinElevation((s.x + dx) / 1.5, (s.z + dz) / 1.5));
});

test('windsurfing accepts open water beyond Crissy Field while refusing land', () => {
  const s = createWindsurfing({ scale: 1.5, isSea: (x, z) => z < 15 }),
    start = s.state.launch;
  assert.ok(s.water(start.x + 0.5, start.y + 0.5));
  assert.deepEqual(s.path(start, { x: 49, y: 10 }), [{ x: 49, y: 10 }]);
  assert.equal(s.path(start, { x: 49, y: 16 }), null);
  assert.deepEqual(s.path(start, { x: 100, y: 10 }), [{ x: 100, y: 10 }]);
  assert.equal(s.path(start, { x: NaN, y: 10 }), null);
});

test('open-water routes have no map bounds and go around even thin coast geometry', () => {
  const island = [
      [25, 8],
      [25.03, 8],
      [25.03, 9],
      [25, 9],
    ],
    s = createWindsurfing({ scale: 1, obstacles: [island] });
  const distant = { x: 1_000_000, y: -1_000_000 };
  assert.deepEqual(s.path(s.state.launch, distant), [distant]);
  assert.ok(s.water(-1_000_000, 1_000_000));
  const from = { x: 22, y: 8 },
    to = { x: 28, y: 8 },
    route = s.path(from, to);
  assert.ok(route && route.length > 1, 'a sub-tile strip of land must not be skipped');
  let p = from;
  for (const q of route) {
    for (let i = 0; i <= 1000; i++)
      assert.ok(
        s.water(p.x + ((q.x - p.x) * i) / 1000 + 0.5, p.y + ((q.y - p.y) * i) / 1000 + 0.5),
      );
    p = q;
  }
  assert.deepEqual(route.at(-1), to);
  assert.equal(s.path(from, { x: 24.515, y: 8 }), null, 'land remains unavailable');
});

test('detained walking routes stay inside the bars and go around the bunk', () => {
  const s = createDetentionSite(1.5),
    a = s.x - s.w / 2,
    b = s.z - s.d / 2;
  const from = { x: a + 1.4 - 0.5, y: b + 0.4 - 0.5 },
    to = { x: a + 0.5 - 0.5, y: b + 2.6 - 0.5 },
    route = s.path(from, to);
  assert.ok(route && route.length > 1);
  let p = from;
  for (const q of route) {
    for (let i = 0; i <= 100; i++)
      assert.ok(
        s.walkable(p.x + ((q.x - p.x) * i) / 100 + 0.5, p.y + ((q.y - p.y) * i) / 100 + 0.5),
      );
    p = q;
  }
  assert.deepEqual(route.at(-1), to);
  assert.equal(s.path(from, { x: s.x + s.w, y: s.z }), null, 'the bars cannot be crossed');
  assert.equal(s.path(from, { x: a + 0.5 - 0.5, y: b + 1 - 0.5 }), null, 'the bunk is an obstacle');
  assert.equal(s.path(from, { x: NaN, y: s.z }), null);
});

test('a sailing route goes offshore instead of crossing a headland', () => {
  const sea = (x, z) => z < (x >= 28 && x <= 30 ? 8 : 10),
    s = createWindsurfing({ scale: 1, isSea: sea }),
    from = { x: 25.5, y: 8.5 },
    to = { x: 33.5, y: 8.5 };
  const path = s.path(from, to);
  assert.ok(path && path.length > 1);
  let p = from;
  for (const q of path) {
    for (let i = 0; i <= 100; i++)
      assert.ok(sea(p.x + ((q.x - p.x) * i) / 100 + 0.5, p.y + ((q.y - p.y) * i) / 100 + 0.5));
    p = q;
  }
  assert.deepEqual(path.at(-1), to);
});

test('police finish the shore crossing instead of doubling back during replanning', () => {
  const s = createWindsurfing({ scale: 1, isSea: (x, z) => z < 10 });
  s.state.shore = { x: 28.7, y: 10.7 };
  const services = { landPath: (to) => [{ ...to }], clear: () => true };
  // Still on dry land, heading out: the next target must remain the water launch.
  const outward = s.pursuitRoute({ x: 28.7, y: 10.2 }, { x: 33, y: 6 }, services);
  assert.deepEqual(outward[0], s.state.launch);
  // Still at sea, heading in: the next target must remain the shore landing.
  const inward = s.pursuitRoute({ x: 28.7, y: 9 }, { x: 30, y: 12 }, services);
  assert.deepEqual(inward[0], s.state.shore);
  assert.deepEqual(inward.at(-1), { x: 30, y: 12 });
});
