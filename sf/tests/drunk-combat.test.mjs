import test from 'node:test';
import assert from 'node:assert/strict';
import {
  weaponDamageRange,
  rollWeaponDamage,
  createAlienBattle,
  createHitpoints,
  inebriationAccuracyMultiplier,
} from '../combat.js';
import { createExpeditions } from '../jurassic.js';
import { createWilderness } from '../wilderness.js';
import { createEconomy } from '../economy.js';

test('inebriation progressively reduces hit chance for every weapon while retaining strength and successful-hit damage', () => {
  for (const weapon of ['unarmed', 'bayonet', 'battleaxe', 'railgun'])
    for (const level of [1, 5, 10]) {
      const sober = weaponDamageRange(level, weapon),
        half = weaponDamageRange(level, weapon, 50),
        drunk = weaponDamageRange(level, weapon, 100);
      assert.equal(half.accuracy, sober.accuracy * 0.75);
      assert.equal(drunk.accuracy, sober.accuracy * 0.5);
      assert.equal(drunk.min, sober.min);
      assert.equal(drunk.max, sober.max);
      assert.ok(rollWeaponDamage(level, weapon, () => 0.6, 0) > 0);
      assert.equal(
        rollWeaponDamage(level, weapon, () => 0.6, 100),
        0,
      );
      assert.equal(
        rollWeaponDamage(level, weapon, () => 0.1, 100),
        rollWeaponDamage(level, weapon, () => 0.1, 0),
      );
    }
  assert.equal(inebriationAccuracyMultiplier(-20), 1);
  assert.equal(inebriationAccuracyMultiplier(200), 0.5);
  assert.equal(inebriationAccuracyMultiplier(NaN), 1);
});
test('personal spectre combat checks current inebriation on each swing and recovers as the player sobers', () => {
  let percent = 100;
  const battle = createAlienBattle({
    health: createHitpoints(),
    bayonet: true,
    random: () => 0.6,
    inebriation: () => percent,
  });
  assert.equal(battle.update(0.3).find((e) => e.type === 'player-hit').damage, 0);
  percent = 0;
  assert.ok(battle.update(1.1).find((e) => e.type === 'player-hit').damage > 0);
});
test('expedition and wilderness attacks use the same current inebriation penalty', () => {
  let percent = 100;
  const expedition = createExpeditions({
      saved: { railgun: true, equipped: true },
      health: createHitpoints(),
      economy: createEconomy(),
      random: () => 0.6,
      inebriation: () => percent,
    }),
    cow = expedition.cows[0],
    origin = { x: cow.x, z: cow.z, base: 0 };
  assert.equal(expedition.shoot(cow, origin).damage, 0);
  percent = 0;
  expedition.update(0.9);
  assert.ok(expedition.shoot(cow, origin).damage > 0);
  const wild = createWilderness({
      spawns: [{ id: 'bear', combatKind: 'bear', x: 0, z: 0 }],
      random: () => 0.6,
    }),
    attacker = { id: 'p', x: 0.5, z: 0, level: 1, weapon: 'railgun', inebriation: 100 };
  assert.equal(wild.strike('bear', attacker).damage, 0);
  attacker.inebriation = 0;
  assert.ok(wild.strike('bear', attacker).damage > 0);
});
