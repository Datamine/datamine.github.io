import test from 'node:test';
import assert from 'node:assert/strict';
import { combatLineClear, combatApproach } from '../combat-navigation.ts';
import { cowSpawns, COW_PEN, inCowPen } from '../jurassic-layout.ts';
import { createExpeditions } from '../jurassic.ts';
import { createEconomy } from '../economy.ts';
import { createHitpoints } from '../combat.ts';
import type { ExpeditionEvent } from '../types/expeditions.ts';

test('a scenery batch does not obstruct attacks through its empty space; actual barn and wall footprints do', () => {
  const scenery = {
      arch: 'garden',
      lo: [0, 0, 0] satisfies [number, number, number],
      hi: [20, 8, 20] satisfies [number, number, number],
      navigationPolygons: [
        [
          [1, 1] satisfies [number, number],
          [3, 1] satisfies [number, number],
          [3, 3] satisfies [number, number],
          [1, 3] satisfies [number, number],
        ],
      ],
    },
    a = { x: 8, z: 10, base: 2 },
    b = { x: 9, z: 10, base: 2 };
  assert.equal(combatLineClear(a, b, [scenery]), true);
  assert.equal(combatLineClear({ x: 0, z: 2, base: 0 }, { x: 4, z: 2, base: 0 }, [scenery]), false);
  assert.equal(combatLineClear(a, b, [{ ...scenery, navigationPolygons: [] }]), true);
  assert.equal(
    combatLineClear(a, b, [
      {
        arch: 'building',
        lo: [8.4, 0, 9] satisfies [number, number, number],
        hi: [8.6, 8, 11] satisfies [number, number, number],
      },
    ]),
    false,
  );
});
test('creature approaches respect melee clearance, the selected weapon range and reachable paths', () => {
  const args = {
    from: { x: 0, y: 0 },
    target: { x: 5, z: 0.5 },
    range: 1.35,
    free: () => true,
    ground: () => 0,
    lineClear: () => true,
    pathTo: (x: number, y: number) => [{ x, y }],
    canTravel: () => true,
  };
  const p = combatApproach(args);
  assert.ok(p);
  assert.ok(Math.hypot(p.x + 0.5 - 5, p.y + 0.5 - 0.5) < 1.35);
  assert.equal(
    combatApproach({ ...args, canTravel: () => false }),
    null,
    'melee cannot reach through a fence',
  );
  assert.deepEqual(
    combatApproach({ ...args, range: 5, canTravel: () => false }),
    args.from,
    'ranged attacks can clear a low fence',
  );
  assert.equal(combatApproach({ ...args, pathTo: () => null }), null);
});
test('the block-sized pasture has eight matching client spawns, clear margins and a street-facing gate', () => {
  const spawns = cowSpawns(),
    g = createExpeditions();
  assert.equal(spawns.length, 8);
  assert.equal(new Set(spawns.map((c) => c.id)).size, 8);
  assert.deepEqual(
    g.cows.map((c) => [c.id, c.x, c.z] satisfies [string, number, number]),
    spawns.map((c) => [c.id, c.x, c.z] satisfies [string, number, number]),
  );
  assert.equal(COW_PEN.w, 14);
  assert.equal(COW_PEN.d, 11);
  assert.equal(COW_PEN.entry.y + 0.5, 194.5);
  for (const c of spawns) {
    assert.ok(inCowPen(c.x, c.z, -0.8));
    for (const other of spawns)
      if (c !== other) assert.ok(Math.hypot(c.x - other.x, c.z - other.z) > 2);
  }
});
test('enemy blows retain structured damage events without generating per-hit chat text', () => {
  const events: ExpeditionEvent[] = [],
    health = createHitpoints(),
    p = { x: 0, z: 0, eligible: false },
    g = createExpeditions({
      saved: { railgun: true },
      health,
      economy: createEconomy(),
      player: () => p,
      random: () => 0.5,
      onEvent: (e) => events.push(e),
    });
  g.setHarbor({ x: 0, z: 0 });
  g.board();
  g.update(6);
  p.x = g.ship.x;
  p.eligible = true;
  g.update(3.5);
  const hit = events.find((e) => e.type === 'damage');
  assert.ok(hit);
  assert.equal(hit.message, null);
  assert.equal(hit.damage, 30 - health.state.hp);
});
