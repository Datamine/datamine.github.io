import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_STATS, rollMonsterDrops } from '../monster-drops.ts';
import { createWilderness } from '../wilderness.ts';
import { LANDSHARK_SITE } from '../wilderness-sites.ts';
import { westernCoastX } from '../coastline.ts';
import { Mesh } from '../geometry.ts';
import { drawWildMonster } from '../wilderness-models.ts';
import { hatById } from '../hat-catalog.ts';
import { getHatGeometry } from '../hat-models.ts';
import { normalizeCharacter } from '../character-config.ts';

const drops = (hat: number, peptide: number) => {
  const rolls = [hat, peptide] satisfies [number, number];
  return rollMonsterDrops('landshark', () => requiredFixture(rolls.shift()));
};
test('Landshark drops four coins with exact independent one-in-ten Stetson and peptide rolls', () => {
  assert.deepEqual(
    drops(0.1, 0.1).map((d) => [d.lootKind, d.amount] satisfies [string, number]),
    [['coins', 4] satisfies [string, number]],
  );
  assert.deepEqual(
    drops(0.1 - Number.EPSILON, 0.1).map((d) => d.lootKind),
    ['coins', 'hat'] satisfies [string, string],
  );
  assert.deepEqual(
    drops(0.1, 0.1 - Number.EPSILON).map((d) => d.lootKind),
    ['coins', 'peptides'] satisfies [string, string],
  );
  assert.deepEqual(
    drops(0, 0).map((d) => d.lootKind),
    ['coins', 'hat', 'peptides'] satisfies [string, string, string],
  );
  let hats = 0,
    peptides = 0,
    coinsOnly = 0;
  for (let i = 0; i < 100; i++)
    for (let j = 0; j < 100; j++) {
      const loot = drops(i / 100, j / 100);
      hats += Number(loot.some((d) => d.lootKind === 'hat'));
      peptides += Number(loot.some((d) => d.lootKind === 'peptides'));
      coinsOnly += Number(loot.length === 1);
    }
  assert.equal(hats, 1000);
  assert.equal(peptides, 1000);
  assert.equal(coinsOnly, 8100);
  assert.equal(drops(0, 1)[1].hatId, 'stetson');
  assert.equal(requiredFixture(hatById('stetson')).dropOnly, true);
  assert.equal(normalizeCharacter({ hat: 'stetson' }).hat, 'stetson');
});
test('the level-10 Landshark guards a three-by-three territory, respects obstacles and respawns', () => {
  const harm: number[] = [],
    loot: import('../types/monsters.ts').WildernessDrop[] = [],
    world = createWilderness({
      spawns: [{ ...LANDSHARK_SITE, x: 0, z: 0 }],
      onDamage: (_p, n) => harm.push(n),
      onDrop: (d) => loot.push(d),
      random: () => 0,
    }),
    actor = world.actors[0],
    person = { id: 1, x: 1.4, z: 1.4 };
  assert.equal(actor.level, 10);
  assert.equal(actor.hp, 45);
  assert.ok(LANDSHARK_SITE.z > 43.5 && LANDSHARK_SITE.z < 96);
  assert.ok(LANDSHARK_SITE.x > westernCoastX(LANDSHARK_SITE.z));
  world.update(0.01, [{ id: 2, x: 1.51, z: 0 }]);
  assert.equal(actor.enemy, null);
  world.update(0.05, [person]);
  assert.equal(actor.enemy, 1);
  assert.ok(actor.x > 0);
  for (let i = 0; i < 80; i++) world.update(0.05, [person]);
  assert.ok(harm.length >= 2);
  assert.ok(harm.every((n) => n === 6));
  person.x = 1.51;
  world.update(0.05, [person]);
  assert.equal(actor.enemy, null);
  for (let i = 0; i < 100; i++) world.update(0.05, [person]);
  assert.ok(Math.max(Math.abs(actor.x), Math.abs(actor.z)) <= 1.5);
  assert.equal(world.damage(actor.id, 1000, person).ok, true);
  assert.equal(loot.length, 3);
  assert.equal(world.damage(actor.id, 1000, person).ok, false);
  assert.equal(loot.length, 3);
  world.update(9.9);
  assert.equal(actor.hp, 0);
  world.update(0.11);
  assert.equal(actor.hp, MONSTER_STATS.landshark.hp);
  assert.deepEqual({ x: actor.x, z: actor.z }, actor.home);
  const blocked = createWilderness({
    spawns: [{ ...LANDSHARK_SITE, x: 0, z: 0 }],
    canTravel: () => false,
    onDamage: () => assert.fail('No bites through obstacles'),
  });
  blocked.update(2, [{ id: 1, x: 1, z: 0 }]);
  assert.equal(blocked.actors[0].x, 0);
});
test('the fin-walking shark and cowboy hat have bounded, finite, distinct native geometry', () => {
  const meshes: number[][] = [];
  for (const phase of [0, 1.2, 3.1] satisfies [number, number, number]) {
    const mesh = new Mesh();
    drawWildMonster(mesh, {
      combatKind: 'landshark',
      x: 0,
      z: 0,
      base: 0,
      angle: 0,
      phase,
      motion: 1,
    });
    assert.ok(mesh.data.every(Number.isFinite));
    assert.ok(mesh.data.length / 33 > 500 && mesh.data.length / 33 < 2000);
    meshes.push(mesh.data);
  }
  assert.notDeepEqual(meshes[0], meshes[1]);
  const hat = getHatGeometry('stetson');
  assert.ok(requiredFixture(hat).mesh.data.every(Number.isFinite));
  assert.ok(requiredFixture(hat).channels.every((n) => n >= 0 && n <= 2));
  assert.notDeepEqual(
    requiredFixture(hat).mesh.data,
    requiredFixture(getHatGeometry('panama')).mesh.data,
  );
});
