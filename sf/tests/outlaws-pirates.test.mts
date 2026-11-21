import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_STATS, rollMonsterDrops } from '../monster-drops.ts';
import { createWilderness } from '../wilderness.ts';
import { OUTLAW_SITE, LOST_PIRATE_SITE, drawPirateWreck } from '../wilderness-sites.ts';
import { westernCoastX, westernBeachWidth } from '../coastline.ts';
import { Mesh } from '../geometry.ts';
import { drawWildMonster } from '../wilderness-models.ts';
import { hatById, ownedHat } from '../hat-catalog.ts';
import { normalizeCharacter, characterAppearance } from '../character-config.ts';
import { getHatGeometry } from '../hat-models.ts';
import { createEconomy } from '../economy.ts';
import { haberdasherDialogue } from '../haberdashery.ts';

test('both hostiles acquire the nearest player within five tiles, pursue, attack, and release distant targets', () => {
  for (const kind of ['outlaw', 'lost-pirate'] satisfies [string, string]) {
    let harm = 0;
    const game = createWilderness({
        spawns: [{ id: kind, combatKind: kind, x: 0, z: 0 }],
        onDamage: () => harm++,
      }),
      actor = game.actors[0];
    game.update(0.01, [{ id: 'far', x: 5.01, z: 0 }]);
    assert.equal(actor.enemy, null);
    const close = { id: 'near', x: 2, z: 0 };
    game.update(0.01, [{ id: 'edge', x: 5, z: 0 }, close]);
    assert.equal(actor.enemy, close.id);
    assert.ok(actor.x > 0);
    for (let i = 0; i < 80; i++) game.update(0.05, [close]);
    assert.ok(harm > 0);
    close.x = 30;
    game.update(0.7, [close]);
    assert.equal(actor.enemy, null);
    const blocked = createWilderness({
      spawns: [{ id: kind, combatKind: kind, x: 0, z: 0 }],
      canTravel: () => false,
      route: () => null,
      onDamage: () => assert.fail('no hits through scenery'),
    });
    blocked.update(1, [{ id: 1, x: 0.8, z: 0 }]);
    assert.equal(blocked.actors[0].x, 0);
    const edge = createWilderness({ spawns: [{ id: kind, combatKind: kind, x: 0, z: 0 }] });
    edge.update(0.01, [{ id: 2, x: 5, z: 0 }]);
    assert.equal(edge.actors[0].enemy, 2);
  }
});

test('hostile defeats roll loot once, stay dead for the cow timer, and respawn at full health at home', () => {
  for (const kind of ['outlaw', 'lost-pirate'] satisfies [string, string]) {
    const drops: import('../types/monsters.ts').WildernessDrop[] = [],
      world = createWilderness({
        spawns: [{ id: kind, combatKind: kind, x: 0, z: 0 }],
        onDrop: (d) => drops.push(d),
        random: () => 0,
      }),
      actor = world.actors[0];
    assert.equal(MONSTER_STATS[kind].respawn, MONSTER_STATS.cow.respawn);
    const attacker = { id: 1, owner: 'owner', x: 0, z: 0, weapon: 'railgun', level: 10 };
    assert.ok(world.damage(kind, 1000, attacker).ok);
    assert.equal(actor.hp, 0);
    assert.equal(drops.length, 2);
    assert.equal(drops[1].lootKind, kind === 'outlaw' ? 'goose-membership-card' : 'hat');
    if (kind === 'lost-pirate') assert.equal(drops[1].hatId, 'pirate');
    assert.equal(world.strike(kind, attacker).ok, false);
    assert.equal(drops.filter((d) => d.lootKind === 'coins')[0].amount, kind === 'outlaw' ? 10 : 8);
    world.update(9.9);
    assert.equal(actor.hp, 0);
    world.update(0.101);
    assert.equal(actor.hp, actor.max);
    assert.deepEqual({ x: actor.x, z: actor.z }, actor.home);
  }
});

test('pirate hat is exactly a separate 1/20 roll alongside eight guaranteed coins and is wearable but not purchasable', () => {
  const miss = rollMonsterDrops('lost-pirate', () => 1 / 20),
    hit = rollMonsterDrops('lost-pirate', () => 1 / 20 - Number.EPSILON);
  assert.deepEqual(
    miss.map((d) => [d.lootKind, d.amount] satisfies [string, number]),
    [['coins', 8] satisfies [string, number]],
  );
  assert.equal(hit.length, 2);
  const hat = hit.find((d) => d.lootKind === 'hat');
  assert.ok(hat != null, 'Missing test fixture: hat');
  assert.equal(hat.hatId, 'pirate');

  assert.equal(hat.label, "Pirate's hat");

  assert.ok(requiredFixture(hatById(hat.hatId)).dropOnly);
  const economy = createEconomy({ coins: 100000, ownedHats: ['pirate'] });
  assert.ok(ownedHat(economy.state.ownedHats, 'pirate'));
  assert.equal(normalizeCharacter({ hat: 'pirate' }).hat, 'pirate');
  assert.equal(economy.buyHat('pirate').ok, false);
  assert.equal(economy.state.coins, 100000);
  assert.ok(
    !haberdasherDialogue({}, economy, () => {}).choices.some((c) =>
      c.label.includes("Pirate's hat"),
    ),
  );
  assert.ok(requiredFixture(getHatGeometry('pirate')).mesh.data.length > 0);
  assert.equal(characterAppearance(normalizeCharacter({ hat: 'pirate' })).hat, 'pirate');
});

test('encounter sites and detailed human models use the normal native art pipeline', () => {
  assert.ok(OUTLAW_SITE.z > 216 && OUTLAW_SITE.x < 18);
  const beach = LOST_PIRATE_SITE.x - westernCoastX(LOST_PIRATE_SITE.z);
  assert.ok(beach > 0.2 && beach < westernBeachWidth(LOST_PIRATE_SITE.z));
  const wreckMesh = new Mesh(),
    wreck = drawPirateWreck(wreckMesh, () => 0.2);
  assert.ok(wreckMesh.data.every(Number.isFinite));
  assert.ok(wreck.count / 33 > 200 && wreck.count / 33 < 1500);
  assert.equal(wreck.navigationPolygons.length, 3);
  for (const kind of ['outlaw', 'lost-pirate'] satisfies [string, string]) {
    const actor = createWilderness({ spawns: [{ id: kind, combatKind: kind, x: 0, z: 0 }] })
        .actors[0],
      mesh = new Mesh();
    drawWildMonster(mesh, { ...actor, motion: 1, phase: 1 }, 1000);
    assert.equal(actor.height, 1.85);
    assert.ok(mesh.data.every(Number.isFinite));
    assert.ok(mesh.data.length / 33 < 5000);
    assert.ok(!actor.description.includes('glacier'));
  }
});
