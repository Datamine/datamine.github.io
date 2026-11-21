import { requiredFixture } from './helpers/required.mts';
import { isSafeInteger } from '../types/json.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_STATS } from '../config/item-stats.ts';
import { MONSTER_DROPS, MONSTER_STATS } from '../config/monster-drops.ts';
import { HAT_CATALOG } from '../config/hats.ts';
import { TRADE_PRICES } from '../config/economy.ts';
test('editable catalogs contain valid balance values and resolvable drop references', () => {
  for (const [id, item] of Object.entries(ITEM_STATS)) {
    if (item.price !== undefined) assert.ok(isSafeInteger(item.price) && item.price >= 0, id);
    if (item.slot === 'weapon') {
      assert.ok(
        requiredFixture(item.range) > 0 &&
          requiredFixture(item.interval) > 0 &&
          requiredFixture(item.min) >= 0 &&
          requiredFixture(item.max) >= requiredFixture(item.min),
        id,
      );
      assert.ok(requiredFixture(item.accuracy) > 0 && requiredFixture(item.accuracyCap) <= 1, id);
    }
  }
  for (const [id, stats] of Object.entries(MONSTER_STATS))
    assert.ok(
      Number.isInteger(stats.hp) && stats.hp > 0 && stats.level >= 1 && stats.damage >= 0,
      id,
    );
  for (const [id, rules] of Object.entries(MONSTER_DROPS)) {
    assert.ok(MONSTER_STATS[id]);
    for (const rule of rules) {
      assert.ok(Number.isSafeInteger(rule.oneIn) && rule.oneIn >= 1);
      for (const item of rule.choose || [rule.item]) assert.ok(ITEM_STATS[item], id + ': ' + item);
      if (rule.amount !== undefined)
        assert.ok(Number.isSafeInteger(rule.amount) && rule.amount > 0);
    }
  }
  assert.equal(new Set(HAT_CATALOG.map((h) => h.id)).size, HAT_CATALOG.length);
  for (const hat of HAT_CATALOG) {
    assert.ok(
      hat.dropOnly ? hat.price === undefined : Number.isSafeInteger(hat.price) && hat.price >= 0,
    );
    assert.ok(hat.colors.every((c) => /^#[0-9a-f]{6}$/i.test(c)));
  }
  assert.ok(Object.values(TRADE_PRICES).every((n) => isSafeInteger(n) && n >= 0));
});
