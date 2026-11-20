import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_STATS, itemById, selectedWeapon } from '../item-stats.js';
import { MONSTER_DROPS, MONSTER_STATS, rollMonsterDrops } from '../monster-drops.js';
import {
  createWilderness,
  wildernessSpawns,
  besideBear,
  bearPettingApproach,
} from '../wilderness.js';
import { drawWildMonster, sampleBearWalk } from '../wilderness-models.js';
import { Mesh } from '../geometry.js';
import { weaponDamageRange, createHitpoints } from '../combat.js';
import { createDeli } from '../deli.js';
import { createEconomy } from '../economy.js';
import { normalizeCharacter, characterAppearance } from '../character-config.js';
import { drawCharacter } from '../characters.js';
import { theyLiveDialogue, createTheyLiveQuest } from '../they-live.js';

const sequence = (values) => () => values.shift() ?? 0.5;
test('drop catalogs have exact 1/20 and 1/50 boundaries; giant success chooses one ice piece', () => {
  assert.equal(rollMonsterDrops('bear', () => 0.05).length, 0);
  assert.equal(rollMonsterDrops('bear', () => 0.05 - Number.EPSILON)[0].lootKind, 'peptides');
  for (const kind of ['snow-giant', 'ice-giant']) {
    assert.deepEqual(
      rollMonsterDrops(kind, () => 0.02),
      [],
    );
    assert.equal(rollMonsterDrops(kind, sequence([0.02 - Number.EPSILON, 0]))[0].itemId, 'ice-top');
    const pants = rollMonsterDrops(kind, sequence([0, 0.999999]));
    assert.equal(pants.length, 1);
    assert.equal(pants[0].itemId, 'ice-pants');
  }
  for (const rules of Object.values(MONSTER_DROPS))
    for (const rule of rules) {
      assert.ok(Number.isInteger(rule.oneIn) && rule.oneIn >= 1);
      for (const id of rule.choose || [rule.item]) assert.ok(itemById(id));
    }
  assert.equal(rollMonsterDrops('cow')[0].lootKind, 'sandwich');
});
test('weapon/food stats live in the item catalog and the axe fills the damage gap', () => {
  const average = (id) => {
    const r = weaponDamageRange(1, id);
    return (r.min + r.max) / 2;
  };
  assert.ok(average('bayonet') < average('battleaxe'));
  assert.ok(average('battleaxe') < average('railgun'));
  assert.equal(MONSTER_STATS.kraken.hp, 600);
  assert.equal(MONSTER_STATS.bear.level, 10);
  assert.equal(MONSTER_STATS.bear.hp, 20);
  assert.equal(selectedWeapon('battleaxe', {}), 'unarmed');
  assert.equal(selectedWeapon('battleaxe', { battleaxe: true }), 'battleaxe');
  assert.ok(ITEM_STATS.sandwich.inNOutPrice < ITEM_STATS.sandwich.pickupPrice);
});
test('a friendly bear never attacks unprovoked; petting makes peace and death rolls only once', () => {
  const hits = [],
    drops = [],
    game = createWilderness({
      spawns: [{ id: 'bear', combatKind: 'bear', x: 0, z: 0 }],
      random: () => 0,
      onDrop: (item) => drops.push(item),
      onDamage: (p, n) => hits.push(n),
    }),
    p = { id: 'p', x: 0.4, z: 0, weapon: 'railgun', level: 1 };
  game.update(10, [p]);
  assert.equal(hits.length, 0);
  const bear = game.actors[0];
  assert.ok(Math.hypot(bear.x, bear.z) > 1, 'the bear should wander');
  const beside = bearPettingApproach({
    from: { x: p.x - 0.5, y: p.z - 0.5 },
    bear,
    free: () => true,
    canTravel: () => true,
    pathTo: () => [{}],
  });
  Object.assign(p, { x: beside.x + 0.5, z: beside.y + 0.5 });
  assert.equal(game.pet('bear', p).ok, true);
  game.strike('bear', p);
  game.update(0.7, [p]);
  assert.ok(hits.length > 0);
  const again = bearPettingApproach({
    from: { x: p.x - 0.5, y: p.z - 0.5 },
    bear,
    free: () => true,
    canTravel: () => true,
    pathTo: () => [{}],
  });
  Object.assign(p, { x: again.x + 0.5, z: again.y + 0.5 });
  assert.equal(game.pet('bear', p).ok, true);
  const count = hits.length;
  game.update(3, [p]);
  assert.equal(hits.length, count);
  while (game.actors[0].hp) game.strike('bear', p);
  assert.equal(drops.length, 1);
  assert.equal(drops[0].lootKind, 'peptides');
  assert.equal(game.strike('bear', p).ok, false);
  game.update(MONSTER_STATS.bear.respawn, [p]);
  assert.equal(game.actors[0].hp, 20);
  assert.equal(game.actors[0].enemy, null);
});
test('petting requires a neighboring tile, a reachable approach and clearance to the bear', () => {
  const bear = { x: 3.2, z: 4.6 },
    from = { x: 2.7, y: 4.1 },
    base = { from, bear, free: () => true, canTravel: () => true, pathTo: () => [{}] };
  const point = bearPettingApproach(base);
  assert.ok(point);
  assert.ok(besideBear({ x: point.x + 0.5, z: point.y + 0.5 }, bear));
  assert.notDeepEqual(point, { x: 3, y: 4 });
  assert.equal(besideBear(bear, bear), false);
  assert.equal(besideBear({ x: 8, z: 4.6 }, bear), false);
  assert.equal(bearPettingApproach({ ...base, free: () => false }), null);
  assert.equal(bearPettingApproach({ ...base, canTravel: () => false }), null);
  assert.equal(bearPettingApproach({ ...base, pathTo: () => null }), null);
  const game = createWilderness({
    spawns: [{ id: 'bear', combatKind: 'bear', ...bear }],
    canTravel: () => false,
  });
  assert.equal(game.pet('bear', { x: 4.5, z: 4.5 }).ok, false);
  assert.equal(
    createWilderness({ spawns: [{ id: 'bear', combatKind: 'bear', ...bear }] }).pet('bear', bear)
      .ok,
    false,
  );
});
test('bear paws have staggered swing phases, planted stance and a continuous repeating gait', () => {
  const a = sampleBearWalk(0.1),
    b = sampleBearWalk(0.2),
    travel = (MONSTER_STATS.bear.walkStride * 0.1) / (Math.PI * 2);
  for (let i = 0; i < 4; i++)
    if (a.paws[i].contact && b.paws[i].contact)
      assert.ok(Math.abs(a.paws[i].z - b.paws[i].z - travel) < 1e-8);
  for (let phase = 0; phase < Math.PI * 2; phase += 0.07) {
    const pose = sampleBearWalk(phase);
    assert.ok(pose.paws.filter((p) => p.contact).length >= 2);
    assert.ok(pose.paws.every((p) => p.y >= 0.1));
  }
  const idle = sampleBearWalk(2, 0);
  assert.ok(idle.paws.every((p) => p.y === 0.1 && p.z === p.end * 0.39));
  const end = sampleBearWalk(Math.PI * 2);
  for (let i = 0; i < 4; i++)
    assert.ok(Math.abs(sampleBearWalk(0).paws[i].z - end.paws[i].z) < 1e-8);
  const mesh = new Mesh();
  drawWildMonster(mesh, { combatKind: 'bear', x: 0, z: 0, base: 0, angle: 0, motion: 0 });
  let forward = -Infinity,
    back = Infinity;
  for (let i = 0; i < mesh.data.length; i += 11) {
    forward = Math.max(forward, mesh.data[i]);
    back = Math.min(back, mesh.data[i]);
  }
  assert.ok(forward > -back, 'the snout faces the direction of travel');
});
test('giants require many hits, retaliate, leash to their home and respawn', () => {
  for (const kind of ['snow-giant', 'ice-giant']) {
    let count = 0,
      harm = 0;
    const game = createWilderness({
        spawns: [{ id: kind, combatKind: kind, x: 0, z: 0 }],
        random: () => 0.5,
        onDamage: () => harm++,
      }),
      p = { id: 'p', x: 0.5, z: 0, weapon: 'railgun', level: 1 };
    while (game.actors[0].hp) {
      game.strike(kind, p);
      game.update(0.8, [p]);
      count++;
    }
    assert.ok(count >= 14);
    assert.ok(harm > 3);
    game.update(MONSTER_STATS[kind].respawn, []);
    assert.equal(game.actors[0].hp, MONSTER_STATS[kind].hp);
    game.strike(kind, p);
    game.update(1, [{ ...p, x: 100 }]);
    assert.equal(game.actors[0].enemy, null);
  }
});
test('bear, giant, icy armor and battleaxe geometry is finite and changes the actual rigged mesh', () => {
  for (const combatKind of ['bear', 'snow-giant', 'ice-giant'])
    for (const phase of [0, 1.2, 3.1]) {
      const m = new Mesh();
      drawWildMonster(
        m,
        { combatKind, x: 0, z: 0, base: 0, angle: 0.4, motion: 1, phase, affection: 2 },
        800,
      );
      assert.ok(m.data.length > 0 && m.data.every(Number.isFinite));
      assert.ok(m.data.length / 33 < 5000);
    }
  const plain = new Mesh(),
    ice = new Mesh(),
    settings = normalizeCharacter({
      weapon: 'battleaxe',
      iceTop: true,
      icePants: true,
      gender: 'woman',
    });
  drawCharacter(plain, 0, 0, 0);
  drawCharacter(
    ice,
    0,
    0,
    0,
    0,
    1,
    false,
    settings.skin,
    settings.shirt,
    characterAppearance(settings),
  );
  assert.ok(ice.data.length > plain.data.length && ice.data.every(Number.isFinite));
});
test('In-N-Out sells the same healing food for two coins and preserves insufficient-funds behavior', () => {
  const economy = createEconomy({ coins: 5 }),
    health = createHitpoints({ hp: 1 }),
    deli = createDeli({
      economy,
      health,
      origin: { x: 0, y: 0 },
      routeTo: () => [],
      canTravel: () => true,
    });
  assert.equal(deli.pickup('in-n-out').ok, true);
  assert.equal(economy.state.coins, 3);
  assert.equal(deli.eat().ok, true);
  assert.equal(health.state.hp, 16);
  assert.equal(deli.pickup().ok, true);
  assert.equal(economy.state.coins, 0);
  assert.equal(deli.pickup('in-n-out').ok, false);
  assert.equal(deli.state.sandwiches, 1);
});
test('only a completed alien quest opens the battleaxe stock; its purchase survives economy restoration', () => {
  const quest = createTheyLiveQuest(),
    npc = { id: 'industrial-armorer', questRole: 'armorer' };
  assert.ok(!theyLiveDialogue(npc, quest).choices);
  quest.state.completed = true;
  const shop = theyLiveDialogue(npc, quest, { buyBattleaxe: () => ({ ok: true }) });
  assert.match(shop.choices[0].label, /50 coins/);
  const economy = createEconomy({ coins: 60 });
  assert.equal(economy.buyEquipment('battleaxe').ok, true);
  assert.equal(economy.state.coins, 10);
  assert.equal(economy.buyEquipment('battleaxe').ok, false);
  assert.ok(createEconomy(economy.state).state.ownedEquipment.includes('battleaxe'));
});

test('the Tahoe giants spawn about ten tiles farther from the spaceport while the bear stays put', () => {
  const tahoe = { x: 100, z: 100 },
    spaceport = { x: 107, z: 101.5 },
    marin = { x: 1, y: 2 },
    spawns = wildernessSpawns({ marin, tahoe, spaceport });
  assert.deepEqual({ x: spawns[0].x, z: spawns[0].z }, { x: 1.5, z: 2.5 });
  for (const [i, [dx, dz]] of [
    [-5, -2],
    [-8, 1],
    [-3, -6],
    [1, -7],
  ].entries()) {
    const oldDistance = Math.hypot(tahoe.x + dx - spaceport.x, tahoe.z + dz - spaceport.z),
      actor = spawns[i + 1];
    assert.ok(
      Math.abs(Math.hypot(actor.x - spaceport.x, actor.z - spaceport.z) - oldDistance - 10) < 1,
    );
  }
});
