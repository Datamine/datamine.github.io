import test from 'node:test';
import assert from 'node:assert/strict';
import { HAIRSTYLES } from '../config/hairstyles.js';
import { normalizeCharacter, characterAppearance } from '../character-config.js';
import { getCharacterMesh, drawCharacter } from '../characters.js';
import { Mesh } from '../geometry.js';
import { npcOffersAttack, npcDisplayLabel, promoteWalkAction } from '../npc-interactions.js';

test('each gender has four distinct, animated hairstyles with safe saved-value fallbacks', () => {
  for (const [gender, styles] of Object.entries(HAIRSTYLES)) {
    assert.equal(styles.length, 4);
    const meshes = [];
    for (const style of styles) {
      const look = normalizeCharacter({ gender, hairstyle: style.id });
      assert.equal(look.hairstyle, style.id);
      const appearance = characterAppearance(look),
        mesh = getCharacterMesh(appearance);
      assert.equal(getCharacterMesh(appearance), mesh);
      meshes.push(mesh);
      const m = new Mesh();
      drawCharacter(m, 0, 0, 0, 0.7, 0.4, false, look.skin, look.shirt, {
        ...appearance,
        action: 'dance',
        time: 0.3,
      });
      assert.ok(m.data.every(Number.isFinite));
    }
    for (let i = 0; i < meshes.length; i++)
      for (let j = i + 1; j < meshes.length; j++)
        assert.notDeepEqual(meshes[i].vertices, meshes[j].vertices);
    assert.equal(normalizeCharacter({ gender, hairstyle: '<script>' }).hairstyle, styles[0].id);
    const other = HAIRSTYLES[gender === 'man' ? 'woman' : 'man'][2].id;
    assert.equal(normalizeCharacter({ gender, hairstyle: other }).hairstyle, styles[0].id);
  }
});

test('only NPCs with an Attack action display combat levels, and Examine never includes one', () => {
  for (const npc of [
    { police: true },
    { kind: 'founder' },
    { kind: 'burger-clerk' },
    { questRole: 'clerk' },
    { child: true },
    { researcher: true },
    { kind: 'banker' },
    { parrot: true },
  ]) {
    npc.label = 'Friendly local';
    assert.equal(npcOffersAttack(npc), false);
    assert.equal(npcDisplayLabel(npc, { level: 10 }), 'Friendly local');
  }
  for (const npc of [
    { label: 'Man' },
    { label: 'Cow', combatKind: 'cow' },
    { label: 'Friendly bear', wilderness: true },
  ]) {
    assert.equal(npcOffersAttack(npc), true);
    assert.match(npcDisplayLabel(npc, { level: 10 }), /Level 10/);
    assert.equal(npcDisplayLabel(npc, { combat: false, level: 10 }), npc.label);
  }
  assert.equal(
    npcDisplayLabel({ label: 'Woman' }, { revealed: true, combat: false, level: 10 }),
    'Green spectre',
  );
});

test('walking comes first in ordinary menus while ground items retain Take as their default', () => {
  const menu = (labels) => ({
    buttons: labels.map((textContent) => ({ textContent })),
    querySelectorAll() {
      return this.buttons;
    },
    insertBefore(item, before) {
      this.buttons.splice(this.buttons.indexOf(item), 1);
      this.buttons.splice(this.buttons.indexOf(before), 0, item);
    },
  });
  const citizen = menu(['Talk-To Ray', 'Examine Ray', 'Walk here']);
  promoteWalkAction(citizen);
  assert.equal(citizen.buttons[0].textContent, 'Walk here');
  const loot = menu(['Take Peptide', 'Examine Peptide', 'Walk here']);
  promoteWalkAction(loot);
  assert.equal(loot.buttons[0].textContent, 'Take Peptide');
});
