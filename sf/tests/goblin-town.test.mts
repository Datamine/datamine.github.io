import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { rollMonsterDrops, MONSTER_STATS } from '../monster-drops.ts';
import { createWilderness } from '../wilderness.ts';
import { drawWildMonster } from '../wilderness-models.ts';
import { drawBallChair, GOBLIN_SPAWNS } from '../goblin-town.ts';
import { equipmentOptions } from '../equipment-options.ts';
import { ownedEquipmentDefense } from '../item-stats.ts';
import { dogSurfingRound, drawDogSurfingCompetition } from '../dog-surfing.ts';
import { dialogueFixture } from './helpers/dialogue-fixture.mts';

test('goblins drop a few coins, boots use a 1/8 roll and the stronger maker has a separate 1/12 chair roll', () => {
  assert.deepEqual(
    rollMonsterDrops('goblin', () => 0.125).map((d) => d.lootKind),
    ['coins'],
  );
  const boots = rollMonsterDrops('goblin', () => 0.1249);
  assert.equal(boots[0].amount, 3);
  assert.equal(boots[1].itemId, 'combat-boots');
  assert.equal(
    rollMonsterDrops('goblin-maker', () => 1 / 12).some((d) => d.itemId === 'ball-chair'),
    false,
  );
  assert.equal(
    rollMonsterDrops('goblin-maker', () => 1 / 12 - 0.00001).some((d) => d.itemId === 'ball-chair'),
    true,
  );
  assert.ok(MONSTER_STATS['goblin-maker'].hp > MONSTER_STATS.goblin.hp);
  assert.ok(MONSTER_STATS.goblin.level <= 3);
  assert.match(MONSTER_STATS.goblin.description, /Mount Tam/);
});

test('a new unarmed player defeats a goblin with a few sandwiches; rewards roll once per kill', () => {
  let hp = 30,
    sandwiches = 0,
    drops = 0;
  const p = { id: 'p', owner: 'p', x: 0, z: 0, level: 1, weapon: 'unarmed', eligible: true },
    world = createWilderness({
      spawns: [{ id: 'g', combatKind: 'goblin', x: 0.5, z: 0 }],
      random: () => 0.5,
      onDamage: (_p, n: number) => {
        hp -= n;
        assert.ok(hp > 0);
      },
      onDrop: () => drops++,
    });
  for (let t = 0; t < 100 && world.actors[0].hp; t++) {
    if (hp < 16) {
      hp = Math.min(30, hp + 15);
      sandwiches++;
    }
    world.strike('g', p);
    world.update(1.05, [p]);
  }
  assert.equal(world.actors[0].hp, 0);
  assert.ok(sandwiches >= 1 && sandwiches <= 3);
  assert.equal(drops, 1);
  world.strike('g', p);
  assert.equal(drops, 1);
});

test('boots require ownership for defense and wardrobe availability; all new meshes have finite geometry', () => {
  assert.equal(ownedEquipmentDefense({ ownedEquipment: [] }, { boots: true }), 0);
  assert.equal(ownedEquipmentDefense({ ownedEquipment: ['combat-boots'] }, { boots: true }), 2);
  assert.equal(equipmentOptions().boots.length, 1);
  assert.equal(equipmentOptions({ ownedEquipment: ['combat-boots'] }).boots.length, 2);
  for (const combatKind of ['goblin', 'lost-goblin', 'goblin-maker', 'seagull'] satisfies [
    string,
    string,
    string,
    string,
  ]) {
    const m = new Mesh();
    drawWildMonster(m, { combatKind, x: 0, z: 0, base: 0, angle: 0, phase: 1, motion: 1 });
    assert.ok(m.data.length > 0 && m.data.every(Number.isFinite));
  }
  const chair = new Mesh();
  drawBallChair(chair, 0, 0, 0);
  assert.ok(chair.data.every(Number.isFinite));
  assert.equal(GOBLIN_SPAWNS.filter((p) => p.z < 0).length, 4);
});

test('dog surfing heats share deterministic scores and keep dogs and boards finite during surfing and judging', () => {
  const a = dogSurfingRound(100),
    b = dogSurfingRound(100);
  assert.deepEqual(a, b);
  assert.equal(a.scores.length, 3);
  assert.ok(a.scores.some((s) => s.name === a.winner.name));
  for (const t of [0, 12, 36, 47, 48] satisfies [number, number, number, number, number]) {
    const m = new Mesh();
    drawDogSurfingCompetition(m, t);
    assert.ok(m.data.every(Number.isFinite));
  }
});

test('conversation openings say Respond, offer one exit, and keep spoken receipts out of the guide', () => {
  const f = dialogueFixture();
  try {
    f.dialogue.open({
      name: 'Goblin',
      intro: 'Mount Tam is home.',
      choices: [
        { label: 'Tell me more.', receipt: 'The fog pays no rent.' },
        { label: 'I should get going.', receipt: 'Bye.' },
      ],
    });
    assert.deepEqual(
      f.buttons().map((b) => b.textContent),
      ['Respond', 'Leave'] satisfies [string, string],
    );
    f.click('Respond');
    assert.deepEqual(
      f.buttons().map((b) => b.textContent),
      ['Tell me more.', 'Leave'] satisfies [string, string],
    );
    f.click('Tell me more.');
    assert.deepEqual(f.messages, []);
    f.click('OK');
    assert.equal(f.dialogue.active, false);
  } finally {
    f.restore();
  }
});
