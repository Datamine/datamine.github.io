import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNPCRoaming } from '../npc-roaming.ts';

const walkable = (x: number, y: number) =>
  Math.abs(x) < 1.5 && Math.abs(y) < 1.5 && !(x > 0.25 && Math.abs(y) < 0.55);
function canTravel(ax: number, ay: number, bx: number, by: number) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.025));
  for (let i = 0; i <= n; i++)
    if (!walkable(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
  return true;
}
type TestNPC = ReturnType<typeof createNPCRoaming>['people'][number];
// The accompanying create(npc) call initializes the route before every assertion.
const make = () =>
  ({
    label: 'Test merchant',
    id: 'test-merchant',
    x: 0.5,
    z: 0.5,
    base: 0,
    angle: 0,
    hold: Infinity,
  }) as TestNPC;
const create = (n: TestNPC) =>
  createNPCRoaming([n], {
    eligible: () => true,
    walkable,
    canTravel,
    ground: () => 0,
    approachFor: () => ({ x: 0, y: -0.8 }),
  });

test('small NPC patrols route around obstacles, stay bounded, and use distance-driven footfalls', () => {
  const npc = make(),
    life = create(npc);
  assert.deepEqual(life.unavailable, []);
  assert.equal(life.people.length, 1);
  const r = npc.roam;
  assert.ok(r.bounds.east - r.bounds.west <= 3);
  assert.ok(r.bounds.south - r.bounds.north <= 3);
  let previous = r.points[0];
  for (const next of r.points.slice(1)) {
    assert.ok(canTravel(previous.x, previous.y, next.x, next.y));
    previous = next;
  }
  let moving = 0,
    paused = 0;
  for (let frame = 0; frame < 1800; frame++) {
    const before = { x: npc.x, z: npc.z, phase: npc.phase };
    life.update(0.05);
    assert.ok(walkable(npc.x - 0.5, npc.z - 0.5));
    assert.ok(npc.x - 0.5 >= r.bounds.west && npc.x - 0.5 <= r.bounds.east);
    assert.ok(npc.z - 0.5 >= r.bounds.north && npc.z - 0.5 <= r.bounds.south);
    const d = Math.hypot(npc.x - before.x, npc.z - before.z);
    assert.ok(d <= r.speed * 0.05 + 1e-8);
    if (npc.moving) {
      moving++;
      assert.ok(npc.phase > before.phase);
    } else paused++;
    const to = requiredFixture(npc.approach);
    assert.ok(walkable(to.x, to.y));
    assert.ok(canTravel(npc.x - 0.5, npc.z - 0.5, to.x, to.y));
  }
  assert.ok(moving > 100 && paused > 100);
  assert.ok(r.stops > 4);
});
test('selected NPCs wait and face the player, remain still in dialogue, and resume without snapping', () => {
  const npc = make(),
    life = create(npc);
  life.update(3);
  npc.waiting = true;
  const p = { x: npc.x, z: npc.z };
  life.update(5, { lookAt: { x: npc.x, z: npc.z + 2 } });
  assert.deepEqual({ x: npc.x, z: npc.z }, p);
  assert.ok(Math.abs(npc.angle - Math.PI / 2) < 1e-7);
  npc.waiting = false;
  npc.hold = 2;
  life.update(10, { paused: true });
  assert.equal(npc.hold, 2);
  assert.deepEqual({ x: npc.x, z: npc.z }, p);
  life.update(1);
  assert.deepEqual({ x: npc.x, z: npc.z }, p);
  let previous = p;
  for (let i = 0; i < 200; i++) {
    life.update(0.05);
    assert.ok(Math.hypot(npc.x - previous.x, npc.z - previous.z) <= npc.roam.speed * 0.05 + 1e-7);
    previous = { x: npc.x, z: npc.z };
  }
  assert.ok(npc.phase > 0);
  assert.equal(npc.waiting, false);
});

test('invalid or stale patrol cursors recover to a native route without crashing the update', () => {
  for (const invalid of [-1, 0, 999, 1.5, '1', null, undefined, NaN, Infinity]) {
    const npc = make(),
      life = create(npc);
    life.update(3);
    // Exercise invalid persisted input through the serialization boundary.
    Object.assign(npc.roam, { index: invalid });
    npc.roam.pause = 0;
    assert.doesNotThrow(() => life.update(0.05));
    assert.ok(
      Number.isInteger(npc.roam.index) &&
        npc.roam.index >= 1 &&
        npc.roam.index < npc.roam.points.length,
    );
    assert.ok(walkable(npc.x - 0.5, npc.z - 0.5));
    for (let i = 0; i < 100; i++) life.update(0.05);
    assert.ok([npc.x, npc.z, npc.phase, npc.motion].every(Number.isFinite));
  }
});

test('a missing waypoint disables motion for that actor without breaking other NPCs', () => {
  const a = make(),
    b = { ...make(), id: 'other-merchant' },
    life = createNPCRoaming([a, b], {
      eligible: () => true,
      walkable,
      canTravel,
      ground: () => 0,
      approachFor: () => ({ x: 0, y: -0.8 }),
    });
  delete a.roam.points[a.roam.index];
  a.roam.pause = 0;
  assert.doesNotThrow(() => life.update(0.05));
  assert.equal(a.moving, false);
  for (let i = 0; i < 100; i++) life.update(0.05);
  assert.ok(b.phase > 0);
  assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z));
});

test('a newly blocked step stops a patrol before entering scenery', () => {
  let blocked: { x: number; y: number } | null = null;
  const npc = make();
  const safe = (x: number, y: number) =>
    walkable(x, y) && (!blocked || Math.hypot(x - blocked.x, y - blocked.y) > 0.04);
  const life = createNPCRoaming([npc], {
    eligible: () => true,
    walkable: safe,
    canTravel,
    ground: () => 0,
    approachFor: () => ({ x: 0, y: -0.8 }),
  });
  const next = npc.roam.points[1],
    from = { x: npc.x - 0.5, y: npc.z - 0.5 },
    d = Math.hypot(next.x - from.x, next.y - from.y);
  blocked = {
    x: from.x + ((next.x - from.x) * 0.1) / d,
    y: from.y + ((next.y - from.y) * 0.1) / d,
  };
  npc.roam.pause = 0;
  life.update(0.1 / npc.roam.speed);
  assert.ok(safe(npc.x - 0.5, npc.z - 0.5));
  assert.equal(npc.moving, false);
});

test('an authored home too close to scenery shifts to a nearby clear cell before patrol planning', () => {
  const npc = make(),
    life = createNPCRoaming([npc], {
      eligible: () => true,
      walkable: (x: number, y) => x < 0.01,
      canTravel: () => true,
      ground: () => 0,
      approachFor: () => ({ x: -0.8, y: 0 }),
    });
  assert.deepEqual(life.unavailable, []);
  assert.ok(npc.x < 0.5);
  assert.ok(Math.hypot(npc.x - 0.5, npc.z - 0.5) <= 0.5);
  for (let i = 0; i < 300; i++) {
    life.update(0.05);
    assert.ok(npc.x - 0.5 < 0.01);
  }
});
