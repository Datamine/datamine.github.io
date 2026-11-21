import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TAHOE,
  TAHOE_TREES,
  TAHOE_COMBAT_TRUNKS,
  createTahoe,
  tahoeHeight,
  drawTahoeStructures,
} from '../tahoe.ts';
import { wildernessSpawns, createWilderness } from '../wilderness.ts';
import { combatApproach, combatInRange, combatLineClear } from '../combat-navigation.ts';
import { Mesh } from '../geometry.ts';

const tahoe = createTahoe(),
  spawns = wildernessSpawns({ marin: { x: 0, y: 0 }, tahoe: TAHOE.base }).filter((n) =>
    n.combatKind.endsWith('giant'),
  );
const travel = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  tahoe.segment({ x: a.x - 0.5, y: a.z - 0.5 }, { x: b.x - 0.5, y: b.z - 0.5 });
const cover = TAHOE_TREES.find(
  (p) => Math.abs(p.x - TAHOE.base.x + 13) < 0.1 && Math.abs(p.z - TAHOE.base.z + 7) < 0.1,
);

test('unprovoked aggression from both giant species still allows tree safespots', () => {
  for (const kind of ['snow-giant', 'ice-giant'] satisfies [string, string]) {
    assert.ok(cover != null, 'Missing test fixture: cover');
    const spawn = spawns.find((n) => n.combatKind === kind),
      person = { id: 'player', x: cover.x + 2, z: cover.z + 0.6 };
    let harm = 0;
    const game = createWilderness({
        spawns: [requiredFixture(spawn)],
        ground: tahoeHeight,
        canTravel: travel,
        onDamage: () => harm++,
      }),
      giant = game.actors[0];

    Object.assign(giant, { x: cover.x - 2, z: cover.z + 0.6 });
    for (let i = 0; i < 160; i++) game.update(0.05, [person]);
    assert.equal(giant.enemy, person.id);
    assert.equal(harm, 0);

    assert.ok(giant.x < cover.x - 0.4);
    assert.ok(combatLineClear(person, giant, TAHOE_COMBAT_TRUNKS, tahoeHeight));
  }
});

test('players can walk on the foothill tiles five tiles around every giant, with paths from the gondola', () => {
  for (const giant of spawns)
    for (const [dx, dz] of [
      [0, 0] satisfies [number, number],
      [5, 0] satisfies [number, number],
      [-5, 0] satisfies [number, number],
      [0, 5] satisfies [number, number],
      [0, -5] satisfies [number, number],
    ]) {
      const x = giant.x + dx,
        z = giant.z + dz;
      assert.ok(tahoe.walkable(x, z), giant.id + ' has an invisible boundary at ' + dx + ',' + dz);
      const route = tahoe.path(tahoe.baseEntry, { x: x - 0.5, y: z - 0.5 });
      assert.ok(route?.length);
      let previous = tahoe.baseEntry;
      for (const next of route) {
        assert.ok(tahoe.segment(previous, next));
        previous = next;
      }
    }
});

test('client combat keeps a five-tile firing position across Tahoe slopes while real ridges and trunks block shots', () => {
  const mesh = new Mesh(),
    structures = drawTahoeStructures(mesh, tahoe, new Map()).map((s) => ({
      arch: 'regional',
      ...s,
    })),
    objects = [...structures, ...TAHOE_COMBAT_TRUNKS];
  for (const target of spawns) {
    const from = { x: target.x + 4.5, y: target.z - 0.5 },
      origin = { x: from.x + 0.5, z: from.y + 0.5, base: tahoeHeight(from.x + 0.5, from.y + 0.5) };
    assert.ok(
      Math.abs(origin.base - tahoeHeight(target.x, target.z)) > 3,
      'exercise the former server height rejection',
    );
    assert.ok(combatInRange(origin, { ...target, base: tahoeHeight(target.x, target.z) }, 5));
    assert.deepEqual(
      combatApproach({
        from,
        target,
        range: 5,
        free: (x: number, y: number) => tahoe.walkable(x + 0.5, y + 0.5),
        ground: tahoeHeight,
        lineClear: (a, b) => combatLineClear(a, b, objects, tahoeHeight),
        pathTo: () => assert.fail('already in range: do not walk closer'),
        canTravel: () => false,
      }),
      from,
    );
  }
  assert.equal(combatInRange({ x: 0, z: 0, base: 0 }, { x: 5.02, z: 0, base: 5 }, 5), false);
  assert.equal(
    combatLineClear({ x: 0, z: 0, base: 0 }, { x: 5, z: 0, base: 0 }, [], (x: number) =>
      x > 2 && x < 3 ? 3 : 0,
    ),
    false,
    'a hill remains real cover',
  );
  assert.ok(cover != null, 'Missing test fixture: cover');
  assert.equal(
    combatLineClear(
      { x: cover.x - 2, z: cover.z, base: cover.h },
      { x: cover.x + 2, z: cover.z, base: cover.h },
      TAHOE_COMBAT_TRUNKS,
      () => cover.h,
    ),
    false,
    'solid trunks are not transparent to shots',
  );
});

test('a lured giant stops at a tree while the player shoots beside its trunk, and resumes when the player leaves cover', () => {
  assert.ok(cover);
  const person = { id: 'player', x: cover.x + 2, z: cover.z + 0.6, weapon: 'railgun', level: 1 };
  let damage = 0;
  const world = createWilderness({
      spawns: [spawns[0]],
      ground: tahoeHeight,
      canTravel: travel,
      route: () => assert.fail('a pursuing giant must not plot a detour around cover'),
      onDamage: () => damage++,
    }),
    giant = world.actors[0];
  Object.assign(giant, {
    x: cover.x - 2,
    z: cover.z + 0.6,
    base: tahoeHeight(cover.x - 2, cover.z + 0.6),
  });
  assert.ok(combatLineClear(person, giant, TAHOE_COMBAT_TRUNKS, tahoeHeight));
  assert.ok(world.strike(giant.id, person).ok);
  for (let i = 0; i < 160; i++) world.update(0.05, [person]);
  assert.equal(damage, 0);
  assert.ok(giant.x < cover.x - 0.4);
  assert.ok(giant.motion === 0);
  assert.ok(tahoe.walkable(giant.x, giant.z));
  assert.ok(Math.hypot(giant.x - person.x, giant.z - person.z) > 2);
  assert.ok(world.strike(giant.id, person).ok, 'safespot remains in railgun range');
  person.z += 3;
  for (let i = 0; i < 160; i++) world.update(0.05, [person]);
  assert.ok(damage > 0, 'moving out from behind cover allows the giant to close and retaliate');
});
