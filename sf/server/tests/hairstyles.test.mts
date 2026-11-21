import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, player } from './fixtures.mts';
import { HAIRSTYLES } from '../../config/hairstyles.ts';

test('server validates gender-specific hairstyles and persists them for reconnecting players', async () => {
  const { game, advance } = await fixture(),
    a = await player(game, 980);
  try {
    for (const [gender, styles] of Object.entries(HAIRSTYLES))
      for (const style of styles) {
        advance(1000);
        game.receive(a.p, {
          type: 'checkpoint',
          privateState: { 'sf-character-v1': JSON.stringify({ gender, hairstyle: style.id }) },
        });
        await a.p.queue;
        assert.equal(a.p.appearance.gender, gender);
        assert.equal(a.p.appearance.hairstyle, style.id);
      }
    await game.flush();
    game.disconnect(a.p);
    const b = await player(game, 980);
    assert.equal(b.p.appearance.hairstyle, 'braid');
    game.receive(b.p, {
      type: 'checkpoint',
      privateState: { 'sf-character-v1': '{"gender":"man","hairstyle":"braid"}' },
    });
    await b.p.queue;
    assert.equal(b.p.appearance.hairstyle, 'short');
  } finally {
    await game.close();
  }
});
