import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, player, command, requiredResult } from './fixtures.mts';

test('server resting stops movement and doubles sobering without any client clocks or pose updates', async () => {
  const { game } = await fixture(),
    a = await player(game, 990, { 'sf-inebriation-v1': '40' }),
    b = await player(game, 991, { 'sf-inebriation-v1': '40' });
  try {
    await command(game, a.p, 'moveTo', { x: a.p.x + 10, z: a.p.z });
    await command(game, a.p, 'activity', { mode: 'sit' });
    assert.ok(requiredResult(a.messages).ok);
    const x = a.p.x;
    game.tick(3);
    assert.equal(a.p.mode, 'sit');
    assert.equal(a.p.x, x);
    assert.equal(a.p.moving, false);
    assert.equal(game.personal.runtime(a.p).inebriation.state.percent, 38);
    assert.equal(game.personal.runtime(b.p).inebriation.state.percent, 39);
    await command(game, a.p, 'moveTo', { x: x + 2, z: a.p.z });
    assert.ok(requiredResult(a.messages).ok);
    game.tick(1.5);
    assert.equal(a.p.mode, 'walk');
    assert.ok(a.p.x > x);
    assert.equal(game.personal.runtime(a.p).inebriation.state.percent, 37.5);
  } finally {
    await game.close();
  }
});

test('following stands up, sitting cancels following, and seated mode is unavailable in flight', async () => {
  const { game } = await fixture(),
    a = await player(game, 992),
    b = await player(game, 993);
  try {
    await command(game, a.p, 'followPlayer', { id: b.p.id });
    await command(game, a.p, 'activity', { mode: 'sit' });
    assert.ok(requiredResult(a.messages).ok);
    assert.equal(game.following.owns(a.p), false);
    await command(game, b.p, 'activity', { mode: 'sit' });
    await command(game, a.p, 'followPlayer', { id: b.p.id });
    assert.ok(requiredResult(a.messages).ok);
    assert.equal(game.movement.state(a.p).mode, 'walk');
    a.p.mode = 'bomber';
    a.p.bomberActive = true;
    await command(game, a.p, 'activity', { mode: 'sit' });
    assert.equal(requiredResult(a.messages).ok, false);
    assert.equal(a.p.mode, 'bomber');
  } finally {
    await game.close();
  }
});
