import type { BattleEvent } from '../combat.ts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHitpoints,
  createAlienBattle,
  weaponDamageRange,
  rollWeaponDamage,
  rollEnemyDamage,
} from '../combat.ts';
import {
  createCombatFeedback,
  COMBAT_SPLAT_SECONDS,
  COMBAT_BAR_SECONDS,
} from '../combat-feedback.ts';
import { createExpeditions } from '../jurassic.ts';
import { createEconomy } from '../economy.ts';
import type { ExpeditionEvent } from '../types/expeditions.ts';

const seeded = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
test('monster damage varies from glancing blows to heavy hits and includes misses', () => {
  for (const base of [4, 7, 10, 16] satisfies [number, number, number, number]) {
    const random = seeded(321),
      hits = Array.from({ length: 3000 }, () => rollEnemyDamage(base, 1, random));
    assert.ok(hits.every((n) => Number.isInteger(n) && n >= 0 && n <= Math.ceil(base * 1.25)));
    assert.ok(hits.includes(0));
    assert.ok(hits.some((n) => n > 0 && n < base * 0.5));
    assert.ok(hits.some((n) => n > base));
    const mean = hits.reduce((a, b) => a + b, 0) / hits.length;
    assert.ok(
      mean > base * 0.55 && mean < base * 0.85,
      'broad rolls retain the existing approximate average',
    );
  }
});
test('weapon rolls vary, include misses, and gain damage with strength and equipment', () => {
  const means: Record<string, number> = {};
  for (const level of [1, 10] satisfies [number, number])
    for (const weapon of ['unarmed', 'bayonet', 'railgun'] satisfies [string, string, string]) {
      const random = seeded(71),
        rolls = Array.from({ length: 2000 }, () => rollWeaponDamage(level, weapon, random)),
        range = weaponDamageRange(level, weapon);
      assert.ok(rolls.every((hit) => Number.isInteger(hit) && hit >= 0 && hit <= range.max));
      assert.ok(rolls.includes(0));
      assert.ok(new Set(rolls).size >= 3);
      means[level + weapon] = rolls.reduce((a, b) => a + b, 0) / rolls.length;
    }
  for (const weapon of ['unarmed', 'bayonet', 'railgun'] satisfies [string, string, string])
    assert.ok(means['10' + weapon] > means['1' + weapon] * 1.3);
  assert.ok(means['1railgun'] > means['1bayonet']);
  assert.ok(means['1bayonet'] > means['1unarmed']);
  const weak = seeded(17),
    strong = seeded(17);
  let weakDamage = 0,
    strongDamage = 0;
  for (let i = 0; i < 1000; i++) {
    weakDamage += rollEnemyDamage(7, 1, weak);
    strongDamage += rollEnemyDamage(7, 10, strong);
  }
  assert.ok(strongDamage < weakDamage);
});

test('random melee outcomes are independent of frame size and splat damage equals HP lost', () => {
  function run(step: number) {
    const health = createHitpoints(),
      battle = createAlienBattle({ health, level: () => 5, bayonet: true, random: seeded(29) }),
      events: BattleEvent[] = [];
    for (let i = 0; i < 2000 && !battle.state.ended; i++) events.push(...battle.update(step));
    assert.equal(
      events.filter((e) => e.type === 'player-hit').reduce((n, e) => n + e.damage, 0),
      36 - battle.state.hp,
    );
    assert.equal(
      events.filter((e) => e.type === 'alien-hit').reduce((n, e) => n + e.damage, 0),
      30 - health.state.hp,
    );
    return events;
  }
  const expected = run(1 / 120);
  for (const step of [0.2, 3] satisfies [number, number]) assert.deepEqual(run(step), expected);
});

test('ranged attacks roll damage from current strength, clamp overkill and preserve spectre immunity', () => {
  const health = createHitpoints();
  let level = 1;
  const events: ExpeditionEvent[] = [],
    game = createExpeditions({
      health,
      economy: createEconomy(),
      saved: { railgun: true },
      level: () => level,
      random: () => 0.5,
      onEvent: (e) => events.push(e),
    });
  const target = { id: 'test-cow', label: 'Cow', combatKind: 'cow', x: 0, z: 0, hp: 100, max: 100 };
  const weak = game.shoot(target).damage;
  game.state.cooldown = 0;
  level = 10;
  assert.ok(weak != null, 'Missing test fixture: weak');
  assert.ok(requiredFixture(game.shoot(target).damage) > weak);
  game.state.cooldown = 0;
  target.hp = 2;
  assert.equal(game.shoot(target).damage, 2);
  assert.equal(target.hp, 0);
  assert.equal(requiredFixture(events.filter((e) => e.type === 'shot').at(-1)).hp, 0);
  const spectre = {
    id: 'test-alien',
    label: 'Alien',
    combatKind: 'spectre',
    x: 0,
    z: 0,
    hp: 36,
    max: 36,
  };
  game.state.cooldown = 0;
  assert.equal(game.shoot(spectre).damage, 0);
  assert.equal(spectre.hp, 36);
});

test('health feedback follows actors, retains killing blows, bounds simultaneous splats and expires', () => {
  const feedback = createCombatFeedback<{ x: number; z: number }>(),
    player = { x: 0, z: 0 },
    npc = { x: 1, z: 0 };
  feedback.engage([
    { target: player, hp: 30, max: 30 },
    { target: npc, hp: 36, max: 36 },
  ]);
  feedback.hit(npc, 11, 25, 36);
  npc.x = 3;
  let entry = feedback.entries().find((a) => a.target === npc);
  assert.equal(requiredFixture(entry).target.x, 3);
  assert.equal(requiredFixture(entry).hp, 25);
  assert.equal(requiredFixture(entry).hits[0].damage, 11);
  feedback.hit(player, 0, 30, 30);
  assert.equal(
    requiredFixture(feedback.entries().find((a) => a.target === player)).hits[0].damage,
    0,
  );
  for (let i = 0; i < 20; i++) feedback.hit(npc, 1, 0, 36);
  feedback.engage([]);
  entry = feedback.entries().find((a) => a.target === npc);
  assert.equal(requiredFixture(entry).hp, 0);
  assert.equal(requiredFixture(entry).hits.length, 4);
  feedback.update(COMBAT_SPLAT_SECONDS + 0.01);
  assert.equal(requiredFixture(entry).hits.length, 0);
  assert.ok(feedback.entries().length > 0);
  feedback.update(COMBAT_BAR_SECONDS);
  assert.equal(feedback.entries().length, 0);
  feedback.show(player, 30, 30);
  feedback.clear();
  assert.equal(feedback.entries().length, 0);
});
