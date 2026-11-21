import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_THRESHOLDS, skillStatus, hitpointMaximum } from '../progression.ts';
import { strengthStatus, createStrength } from '../strength.ts';
import { weaponDamageRange } from '../combat.ts';
import { TERMINATOR_FACTORY } from '../encounter-layout.ts';
import { SOUTHERN_STREETS } from '../southern-layout.ts';
import { actorLevel } from '../levels.ts';
import { MERCHANTS } from '../config/npcs.ts';
import { configuredDialogue } from '../dialogue-config.ts';
import { ITEM_STATS } from '../item-stats.ts';
import { rollMonsterDrops } from '../monster-drops.ts';
import { COLLECTION_ITEMS } from '../config/collection.ts';
import { Mesh } from '../geometry.ts';
import { drawWildMonster } from '../wilderness-models.ts';
import { drawCharacter } from '../characters.ts';

test('both skills share a monotonic fifty-level curve, retaining level ten at twelve thousand XP', () => {
  assert.equal(actorLevel({ networkPlayer: true, level: 50 }), 50);
  assert.equal(SKILL_THRESHOLDS.length, 50);
  assert.equal(SKILL_THRESHOLDS[9], 12000);
  for (let i = 0; i < 50; i++) {
    const xp = SKILL_THRESHOLDS[i];
    assert.deepEqual(strengthStatus(xp), skillStatus(xp));
    assert.equal(skillStatus(xp).level, i + 1);
    if (i) assert.ok(xp > SKILL_THRESHOLDS[i - 1]);
  }
  assert.equal(skillStatus(Infinity).level, 1);
  assert.equal(skillStatus(requiredFixture(SKILL_THRESHOLDS.at(-1)) + 1e9).level, 50);
  assert.equal(hitpointMaximum(0), 30);
  assert.equal(hitpointMaximum(SKILL_THRESHOLDS.at(-1)), 79);
  const gym = createStrength({ xp: 12000 });
  gym.train(1);
  assert.ok(gym.state.xp > 12000);
  gym.gain(1e9);
  assert.equal(gym.status.level, 50);
});
test('Akibo has railgun damage and attack speed at every level, with seven-tile range and a one-in-twenty drop', () => {
  for (let level = 1; level <= 50; level++)
    assert.deepEqual(weaponDamageRange(level, 'akibo'), weaponDamageRange(level, 'railgun'));
  assert.equal(ITEM_STATS.akibo.range, 7);
  assert.equal(ITEM_STATS.akibo.interval, ITEM_STATS.railgun.interval);
  assert.ok(weaponDamageRange(50, 'railgun').max > weaponDamageRange(10, 'railgun').max);
  const rolls = [0, 0, 0.05 - Number.EPSILON] satisfies [number, number, number];
  let loot = rollMonsterDrops('terminator', () => requiredFixture(rolls.shift()));
  assert.ok(loot.some((l) => l.itemId === 'akibo'));
  assert.ok(loot.some((l) => l.lootKind === 'peptides'));
  assert.ok(!rollMonsterDrops('terminator', () => 0.1).some((l) => l.lootKind === 'peptides'));
  assert.ok(!rollMonsterDrops('terminator', () => 0.05).some((l) => l.itemId === 'akibo'));
});
test('collection entries use stable IDs, names and optional discovery clues, and cover all equipment', () => {
  assert.equal(new Set(COLLECTION_ITEMS.map((i) => i.id)).size, COLLECTION_ITEMS.length);
  for (const item of COLLECTION_ITEMS)
    assert.ok(
      Object.keys(item).every((key) =>
        (['id', 'name', 'hint'] satisfies [string, string, string]).includes(key),
      ),
    );
  for (const id of [
    'akibo',
    'railgun',
    'backpack',
    'ice-top',
    'ice-pants',
    'hat:stetson',
    'hat:pirate',
    'peptides',
  ] satisfies [string, string, string, string, string, string, string, string])
    assert.ok(COLLECTION_ITEMS.some((i) => i.id === id));
});
test('Terminator and dual-wielded guns use finite animated native character geometry', () => {
  const m = new Mesh();
  drawWildMonster(m, {
    combatKind: 'terminator',
    x: 0,
    z: 0,
    base: 0,
    angle: 0,
    phase: 1,
    motion: 1,
  });
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(m.data.length / 33 < 5000);
  const a = new Mesh(),
    b = new Mesh();
  drawCharacter(a, 0, 0, 0, 0, 0, false, undefined, undefined, { backpack: false });
  drawCharacter(b, 0, 0, 0, 0, 0, false, undefined, undefined, {
    backpack: false,
    akibo: true,
    action: 'attack',
    actionT: 0.4,
  });
  assert.ok(b.data.length > a.data.length && b.data.every(Number.isFinite));
});

test('the hiking supplier is registered as a merchant with a configured purchase action', () => {
  assert.ok(MERCHANTS['hiking-supplier']);
  let calls = 0;
  const d = configuredDialogue('hiking-supplies', MERCHANTS['hiking-supplier'], {
    buy: () => {
      calls++;
    },
  });
  assert.ok(d?.choices != null, 'Missing test fixture: d.choices');
  requiredFixture(d.choices[0].accept)();
  assert.equal(calls, 1);
});

test('the abandoned factory occupies a full block without covering a street', () => {
  const p = TERMINATOR_FACTORY,
    west = p.x - p.w / 2 - 0.1,
    east = p.x + p.w / 2 + 0.1,
    north = p.z - p.d / 2 - 0.1,
    south = p.z + p.d / 2 + 0.1;
  for (const r of SOUTHERN_STREETS)
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1],
        b = r.points[i],
        rw = 0.68;
      if (a[0] === b[0] || a[1] === b[1])
        assert.ok(
          east < Math.min(a[0], b[0]) - rw ||
            west > Math.max(a[0], b[0]) + rw ||
            south < Math.min(a[1], b[1]) - rw ||
            north > Math.max(a[1], b[1]) + rw,
          r.name + ' crosses the abandoned factory',
        );
    }
});
