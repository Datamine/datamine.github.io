import { requiredFixture } from '../../tests/helpers/required.mts';
import {
  storedPlayerFixture,
  fixtureGeometry,
  player,
  command,
  requiredResult,
} from './fixtures.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';

test('bison hide is shared loot; Yohji checks proximity, consumes one hide and grants two permanent pieces', async () => {
  const geometry = fixtureGeometry();
  geometry.wilderness = { actors: [{ id: 'bison', combatKind: 'bison', x: 94, z: 120 }] };
  geometry.merchants = [
    { label: 'yohji', id: 'yohji', kind: 'yohji', name: 'Yohji', x: 110, z: 130, base: 1.15 },
  ];
  const store = createMemoryStore(),
    game = await createGame({ geometry, store, random: () => 0 }),
    a = await player(game, 8301),
    b = await player(game, 8302);
  try {
    await command(game, a.p, 'equipAppearance', {
      look: { torso: 'black-cloak-top', legs: 'black-cloak-bottom' },
    });
    assert.equal(a.p.appearance.torso, 'shirt');
    assert.equal(a.p.appearance.legs, 'trousers');
    await command(game, a.p, 'playerAction', { verb: 'tailorCloak' });
    assert.equal(requiredResult(a.messages).ok, false, 'cannot trade remotely');
    const bison = game.shared.wilderness.actors[0];
    bison.hp = 1;
    Object.assign(a.p, { x: bison.x - 1.2, z: bison.z });
    await command(game, a.p, 'attack', { id: bison.id, weapon: 'railgun' });
    assert.equal(bison.hp, 0);
    const hide = [...game.shared.loot.values()].find((d) => d.lootKind === 'bison-hide');
    assert.ok(hide);
    Object.assign(b.p, { x: hide.x, z: hide.z, y: hide.base });
    await command(game, b.p, 'collect', { id: hide.id });
    assert.equal(requiredResult(b.messages).ok, false);
    Object.assign(a.p, { x: hide.x, z: hide.z, y: hide.base });
    await command(game, a.p, 'collect', { id: hide.id });
    assert.equal(requiredResult(a.messages).ok, true);
    assert.equal(a.p.inventory.meta.bisonHides, 1);
    Object.assign(a.p, { x: 110, z: 130, y: 1.15 });
    await command(game, a.p, 'playerAction', { verb: 'tailorCloak' });
    assert.equal(requiredResult(a.messages).ok, true);
    assert.equal(a.p.inventory.meta.bisonHides, 0);
    for (const id of ['black-cloak-top', 'black-cloak-bottom'] satisfies [string, string])
      assert.ok(a.p.inventory.economy.state.ownedEquipment.includes(id));
    await command(game, a.p, 'equipAppearance', {
      look: { torso: 'black-cloak-top', legs: 'black-cloak-bottom' },
    });
    assert.equal(a.p.appearance.cloakTop, true);
    assert.equal(a.p.appearance.cloakBottom, true);
    assert.equal(a.p.appearance.iceTop, false);
    a.p.inventory.meta.bisonHides = 1;
    await command(game, a.p, 'playerAction', { verb: 'tailorCloak' });
    assert.equal(requiredResult(a.messages).ok, false);
    assert.equal(
      a.p.inventory.meta.bisonHides,
      1,
      'an already owned outfit does not consume another hide',
    );
    await game.flush();
    const saved = await storedPlayerFixture(store, 'player:' + a.p.owner);
    assert.equal(requiredFixture(saved.playerState.inventory.ledger).bisonHides, 1);
    assert.ok(saved.playerState.inventory.collection.includes('bison-hide'));
    assert.ok(saved.playerState.inventory.collection.includes('black-cloak-top'));
    game.disconnect(a.p);
    const returned = await player(game, 8301);
    assert.equal(returned.p.appearance.cloakTop, true);
    assert.equal(returned.p.appearance.cloakBottom, true);
  } finally {
    await game.close();
  }
});

test('Yohji will not create clothing without a real hide, and legacy ice gear retains its slots and defense flags', async () => {
  const geometry = fixtureGeometry();
  geometry.merchants = [
    { label: 'yohji', id: 'yohji', kind: 'yohji', x: 92.2, z: 120, base: 1.15 },
  ];
  const game = await createGame({ geometry, store: createMemoryStore() }),
    a = await player(game, 8303, {
      'sf-purse-v1': '{"coins":25,"ownedEquipment":["ice-top","ice-pants"]}',
      'sf-character-v1': '{"iceTop":true,"icePants":true}',
    });
  try {
    await command(game, a.p, 'playerAction', { verb: 'tailorCloak', hides: 999 });
    assert.equal(requiredResult(a.messages).ok, false);
    assert.equal(a.p.inventory.meta.bisonHides, 0);
    assert.equal(a.p.inventory.economy.state.ownedEquipment.length, 2);
    assert.equal(a.p.appearance.torso, 'ice-top');
    assert.equal(a.p.appearance.legs, 'ice-pants');
    assert.equal(a.p.appearance.iceTop, true);
    assert.equal(a.p.appearance.icePants, true);
  } finally {
    await game.close();
  }
});
