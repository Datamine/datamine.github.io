import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { combatReport, weaponExpectation } from '../tools/combat-report.mts';
import { ITEM_STATS, selectedWeapon } from '../item-stats.ts';
import { PROGRESSION } from '../config/progression.ts';
import { normalizeCharacter } from '../character-config.ts';

test('five million seeded rolls match analytical average damage, accuracy and DPS at every Strength Level', () => {
  const rows = combatReport({
    levels: Array.from({ length: PROGRESSION.maxLevel }, (_, i) => i + 1),
    samples: 20000,
  });
  assert.equal(
    rows.length,
    PROGRESSION.maxLevel *
      Object.values(ITEM_STATS).filter((item) => item.slot === 'weapon').length,
  );
  for (const row of rows) {
    assert.ok(
      Math.abs(row.averageDamage - row.expectedAverageDamage) < 6 * row.standardError + 0.002,
      JSON.stringify(row),
    );
    assert.ok(Math.abs(row.observedAccuracy - row.expectedAccuracy) < 0.01, JSON.stringify(row));
    assert.equal(row.observedDPS, row.averageDamage / requiredFixture(row.attackSeconds));
  }
  for (let level = 1; level <= 10; level++) {
    const group = rows.filter((r) => r.strengthLevel === level && r.weaponId !== 'akibo');
    for (let i = 1; i < group.length; i++)
      assert.ok(group[i].expectedDPS > group[i - 1].expectedDPS, JSON.stringify(group));
  }
  for (let level = 1; level <= PROGRESSION.maxLevel; level++)
    assert.equal(
      weaponExpectation(level, 'akibo').dps,
      weaponExpectation(level, 'railgun').dps,
      'Akibo trades extra range for the same damage rate',
    );
  for (const id of ['unarmed', 'bayonet', 'battleaxe', 'railgun'] satisfies [
    string,
    string,
    string,
    string,
  ])
    for (let level = 2; level <= PROGRESSION.maxLevel; level++)
      assert.ok(weaponExpectation(level, id).dps >= weaponExpectation(level - 1, id).dps);
});
test('inebriation halves average DPS at 100%, while four armor defense reduces damage without increasing misses', () => {
  const sober = combatReport({ levels: [1, 5, 10] satisfies [number, number, number] }),
    drunk = combatReport({
      levels: [1, 5, 10] satisfies [number, number, number],
      inebriation: 100,
    }),
    armored = combatReport({ levels: [1, 5, 10] satisfies [number, number, number], defense: 4 });
  for (let i = 0; i < sober.length; i++) {
    assert.equal(drunk[i].expectedDPS, sober[i].expectedDPS * 0.5);
    assert.ok(armored[i].expectedDPS < sober[i].expectedDPS);
    assert.equal(armored[i].expectedAccuracy, sober[i].expectedAccuracy);
    assert.ok(
      Math.abs(drunk[i].averageDamage - drunk[i].expectedAverageDamage) <
        6 * drunk[i].standardError + 0.002,
    );
    assert.ok(
      Math.abs(armored[i].averageDamage - armored[i].expectedAverageDamage) <
        6 * armored[i].standardError + 0.002,
    );
  }
});
test('Fist is unarmed, including legacy Automatic saves, and never silently equips an owned weapon', () => {
  const gear = { railgun: true, bayonet: true, battleaxe: true };
  assert.equal(normalizeCharacter({ weapon: 'auto' }).weapon, 'unarmed');
  assert.equal(normalizeCharacter({}).weapon, 'unarmed');
  assert.equal(selectedWeapon('unarmed', gear), 'unarmed');
  assert.equal(selectedWeapon('auto', gear), 'unarmed');
  for (const id of ['railgun', 'bayonet', 'battleaxe'] satisfies [string, string, string])
    assert.equal(selectedWeapon(id, gear), id);
});
