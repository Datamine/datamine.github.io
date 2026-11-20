import test from 'node:test';
import assert from 'node:assert/strict';
import { drawBison, drawBisonHide } from '../bison-model.js';
import { Mesh } from '../geometry.js';
import { drawCharacter } from '../characters.js';
import { normalizeCharacter, characterAppearance } from '../character-config.js';
import { equipmentOptions } from '../equipment-options.js';
import { equipmentDefense } from '../item-stats.js';
import { wildernessSpawns } from '../wilderness.js';

test('one bison spawns, and its animated model and hide remain finite and inexpensive', () => {
  assert.equal(
    wildernessSpawns({ marin: { x: 0, y: 0 }, tahoe: { x: 100, z: 100 } }).filter(
      (n) => n.combatKind === 'bison',
    ).length,
    1,
  );
  const idle = new Mesh(),
    walking = new Mesh();
  drawBison(idle, { x: 0, z: 0, base: 0, angle: 0 });
  drawBison(walking, { x: 0, z: 0, base: 0, angle: 0, motion: 1, phase: 1 });
  for (const m of [idle, walking]) {
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 5000);
  }
  assert.notDeepEqual(idle.data, walking.data);
  const hide = new Mesh();
  drawBisonHide(hide, 0, 0, 0);
  assert.ok(hide.data.every(Number.isFinite));
  assert.ok(hide.data.length / 33 < 250);
});

test('cloak pieces appear only when owned and occupy exclusive torso/leg slots', () => {
  assert.equal(equipmentOptions().torso.length, 1);
  assert.equal(equipmentOptions().legs.length, 1);
  const options = equipmentOptions({
    ownedEquipment: ['black-cloak-top', 'black-cloak-bottom', 'ice-top'],
  });
  assert.equal(options.torso.length, 3);
  assert.equal(options.legs.length, 2);
  const legacy = normalizeCharacter({ iceTop: true, icePants: true });
  assert.equal(legacy.torso, 'ice-top');
  assert.equal(legacy.legs, 'ice-pants');
  assert.equal(equipmentDefense(legacy), 4);
  const black = normalizeCharacter({
    ...legacy,
    torso: 'black-cloak-top',
    legs: 'black-cloak-bottom',
  });
  assert.equal(black.iceTop, false);
  assert.equal(black.icePants, false);
  assert.equal(equipmentDefense(black), 0);
});

test('oversized garments stay animated on the real rig, including sitting, dancing and climbing', () => {
  const look = characterAppearance(
    normalizeCharacter({ torso: 'black-cloak-top', legs: 'black-cloak-bottom' }),
  );
  for (const mode of ['idle', 'move', 'rest', 'climb', 'cycle'])
    for (const action of [null, 'dance', 'attack'])
      for (const phase of [0, 1, 3]) {
        const m = new Mesh();
        drawCharacter(m, 0, 0, 0, 0, phase, false, look.skin, look.shirt, {
          ...look,
          mode,
          motion: 1,
          action,
          actionT: 0.5,
          sitBlend: 0.7,
          time: phase,
        });
        assert.ok(m.data.every(Number.isFinite));
        assert.ok(m.data.length / 33 < 2400);
      }
  const bare = new Mesh(),
    black = new Mesh();
  drawCharacter(bare, 0, 0, 0, 0, 0, false, look.skin, look.shirt, { backpack: false });
  drawCharacter(black, 0, 0, 0, 0, 0, false, look.skin, look.shirt, look);
  const lowerSpan = (m) => {
    let lo = Infinity,
      hi = -Infinity;
    for (let i = 0; i < m.data.length; i += 11)
      if (m.data[i + 1] < 0.4) {
        lo = Math.min(lo, m.data[i + 2]);
        hi = Math.max(hi, m.data[i + 2]);
      }
    return hi - lo;
  };
  assert.ok(
    lowerSpan(black) > lowerSpan(bare) * 1.6,
    'the skirt has a much roomier silhouette than regular trousers',
  );
});
