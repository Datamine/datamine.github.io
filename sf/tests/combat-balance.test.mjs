import test from 'node:test';
import assert from 'node:assert/strict';
import { rollEnemyDamage, createAlienBattle, createHitpoints } from '../combat.js';
import { ownedEquipmentDefense } from '../item-stats.js';
import { createExpeditions } from '../jurassic.js';
import { createEconomy } from '../economy.js';
import { MONSTER_STATS } from '../monster-drops.js';
import { monsterInBombArea, bombTileArea } from '../stealth-bomber.js';

test('ordinary creature bomb eligibility excludes quest species and uses the same 3×3 tile boundary', () => {
  const area = bombTileArea(10, 20);
  for (const combatKind of ['cow', 'bear', 'snow-giant', 'ice-giant'])
    assert.ok(monsterInBombArea({ combatKind, hp: 20, x: 10.5, z: 20.5 }, area));
  for (const combatKind of ['raptor', 'kraken', 'spectre', undefined])
    assert.equal(monsterInBombArea({ combatKind, hp: 600, x: 10.5, z: 20.5 }, area), false);
  assert.equal(monsterInBombArea({ combatKind: 'bear', hp: 20, x: 12, z: 20.5 }, area), false);
  assert.equal(monsterInBombArea({ combatKind: 'bear', hp: 0, x: 10, z: 20 }, area), false);
});
test('ice defense requires ownership and equipment, stacks and never turns a hit into healing', () => {
  assert.equal(
    ownedEquipmentDefense(
      { ownedEquipment: ['ice-top', 'ice-pants'] },
      { iceTop: true, icePants: true },
    ),
    4,
  );
  assert.equal(ownedEquipmentDefense({ ownedEquipment: [] }, { iceTop: true, icePants: true }), 0);
  assert.equal(ownedEquipmentDefense({ ownedEquipment: ['ice-top'] }, {}), 0);
  assert.equal(
    rollEnemyDamage(14, 1, () => 0.5, 4),
    rollEnemyDamage(14, 1, () => 0.5) - 4,
  );
  assert.equal(
    rollEnemyDamage(7, 1, () => 0, 4),
    0,
  );
  let defense = 0;
  const health = createHitpoints(),
    battle = createAlienBattle({ health, defense: () => defense, random: () => 0.5 });
  battle.update(0.85);
  assert.equal(health.state.hp, 25);
  defense = 4;
  battle.update(1.25);
  assert.equal(health.state.hp, 24);
});
test('the 600-HP kraken enrages once at half health, accelerates its attacks and hits harder', () => {
  const p = { x: 0, z: 0, eligible: false },
    events = [],
    health = {
      state: { hp: 1000, max: 1000 },
      damage(n) {
        this.state.hp -= n;
        return n;
      },
    },
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
  assert.equal(g.kraken.max, 600);
  g.ship.attackIn = 0.05;
  g.update(0.05);
  const normal = events.filter((e) => e.type === 'damage').at(-1).damage;
  g.kraken.hp = g.kraken.max / 2;
  g.ship.attackIn = 2.8;
  g.update(0.05);
  assert.equal(g.kraken.enraged, true);
  assert.ok(g.ship.attackIn <= MONSTER_STATS.kraken.enrageInterval);
  g.update(1.95);
  const enraged = events.filter((e) => e.type === 'damage').at(-1).damage;
  assert.ok(enraged > normal);
  const count = events.filter((e) => e.type === 'damage').length;
  g.update(2);
  assert.equal(events.filter((e) => e.type === 'damage').length, count + 1);
  assert.equal(events.filter((e) => e.type === 'kraken-enraged').length, 1);
  g.abandonShip();
  g.board();
  assert.equal(g.kraken.enraged, false);
  assert.equal(g.kraken.hp, 600);
});
