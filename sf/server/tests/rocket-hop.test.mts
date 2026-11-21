import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, player, command, requiredResult } from './fixtures.mts';

test('ignition authorizes a hop, subsequent hops need a burning owned rocket and cannot overlap', async () => {
  const { game, advance } = await fixture(),
    a = await player(game, 8401, {
      'sf-purse-v1': '{"coins":25,"ownedEquipment":["new-year-rocket"]}',
      'sf-character-v1': '{"back":"new-year-rocket"}',
    });
  try {
    const at = { x: a.p.x, y: a.p.y, z: a.p.z };
    await command(game, a.p, 'rocketHop', { hopStartedAt: 9e15 });
    assert.equal(requiredResult(a.messages).ok, false);
    await command(game, a.p, 'lightDecorativeRocket');
    assert.equal(requiredResult(a.messages).ok, true);
    const first = a.p.appearance.rocketHopAt;
    assert.ok(requiredFixture(first) > 0);
    assert.equal(
      requiredFixture(requiredResult(a.messages).inventory).decorativeRocket.hopStartedAt,
      first,
    );
    await command(game, a.p, 'rocketHop');
    assert.equal(requiredResult(a.messages).ok, false);
    assert.equal(a.p.appearance.rocketHopAt, first);
    advance(1100);
    await command(game, a.p, 'rocketHop');
    assert.equal(requiredResult(a.messages).ok, true);
    assert.equal(a.p.appearance.rocketHopAt, requiredFixture(first) + 1100);
    assert.deepEqual({ x: a.p.x, y: a.p.y, z: a.p.z }, at);
    await command(game, a.p, 'equipAppearance', {
      look: { back: 'new-year-rocket', rocketHopAt: 9e15 },
    });
    assert.equal(
      a.p.appearance.rocketHopAt,
      requiredFixture(first) + 1100,
      'a browser cannot set its own flight clock',
    );
    advance(10000);
    await command(game, a.p, 'rocketHop');
    assert.equal(requiredResult(a.messages).ok, false);
    await command(game, a.p, 'lightDecorativeRocket');
    assert.equal(requiredResult(a.messages).ok, false, 'the minute ignition cooldown is unchanged');
  } finally {
    await game.close();
  }
});

test('a flame cannot launch a vehicle, climb, private journey or dead player', async () => {
  const { game } = await fixture(),
    a = await player(game, 8402, {
      'sf-purse-v1': '{"coins":25,"ownedEquipment":["new-year-rocket"]}',
      'sf-character-v1': '{"back":"new-year-rocket"}',
    });
  try {
    await command(game, a.p, 'lightDecorativeRocket');
    for (const mode of [
      'bike',
      'ferrari',
      'climb',
      'hidden',
      'surf',
      'ski',
      'sit',
      'train',
    ] satisfies [string, string, string, string, string, string, string, string]) {
      a.p.mode = mode;
      await command(game, a.p, 'rocketHop');
      assert.equal(requiredResult(a.messages).ok, false, mode);
    }
    a.p.mode = 'walk';
    a.p.hp = 0;
    await command(game, a.p, 'rocketHop');
    assert.equal(requiredResult(a.messages).ok, false);
  } finally {
    await game.close();
  }
});
