import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, player, command, latestResult } from './fixtures.mjs';
import { FORWARD_ROLL_DURATION, FORWARD_ROLL_SPEED } from '../../forward-roll.js';
import { GAMEPLAY } from '../../config/gameplay.js';
import { SF_FITNESS } from '../../southern-layout.js';

test('roll progress and its speed are authoritative and match the full client clip', async () => {
  const { game, advance } = await fixture(),
    a = await player(game, 5101),
    p = a.p,
    x = p.x;
  try {
    await command(game, p, 'activity', { mode: 'roll' });
    assert.equal(latestResult(a.messages).ok, true);
    await command(game, p, 'moveTo', { x: x + 20, z: p.z });
    let last = 0;
    for (let i = 1; i <= 15; i++) {
      advance(50);
      game.tick(0.05);
      assert.equal(p.mode, 'roll');
      assert.ok(p.phase > last);
      assert.ok(Math.abs(p.phase / (Math.PI * 2) - i / 15) < 1e-8);
      last = p.phase;
    }
    assert.ok(
      Math.abs(p.x - x - GAMEPLAY.walkSpeed * FORWARD_ROLL_SPEED * FORWARD_ROLL_DURATION) < 1e-7,
    );
    advance(50);
    game.tick(0.05);
    assert.equal(p.mode, 'walk');
  } finally {
    await game.close();
  }
});

test('another roll command cannot rewind an in-flight roll', async () => {
  const { game, advance } = await fixture(),
    a = await player(game, 5102);
  try {
    await command(game, a.p, 'activity', { mode: 'roll' });
    advance(200);
    game.tick(0.2);
    const phase = a.p.phase;
    await command(game, a.p, 'activity', { mode: 'roll' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.phase, phase);
  } finally {
    await game.close();
  }
});

test('gondola and ski snapshots carry their actual activity, heading and flip phase', async () => {
  const { game } = await fixture(),
    a = await player(game, 5103),
    t = game.movement.state(a.p).tahoe;
  try {
    Object.assign(a.p, { x: t.baseEntry.x + 0.5, z: t.baseEntry.y + 0.5 });
    await command(game, a.p, 'travel', { kind: 'gondola' });
    assert.equal(latestResult(a.messages).ok, true);
    game.tick(0.05);
    assert.equal(a.p.mode, 'gondola');
    assert.equal(a.p.angle, t.state.angle);
    await command(game, a.p, 'activity', { mode: 'dance' });
    assert.equal(latestResult(a.messages).ok, false);
    t.state.mode = 'ski';
    t.state.rented = true;
    t.state.angle = 0.7;
    t.state.flip = 0.25;
    game.tick(0.05);
    assert.equal(a.p.mode, 'ski');
    assert.equal(a.p.angle, t.state.angle);
    assert.equal(a.p.phase, t.state.flipAngle || 0);
  } finally {
    await game.close();
  }
});

test('exercise and eating actions replicate their presentation without client clocks', async () => {
  const { game, advance } = await fixture(),
    a = await player(game, 5104, { 'sf-deli-v1': '{"sandwiches":2}' });
  try {
    Object.assign(a.p, { x: SF_FITNESS.x, z: SF_FITNESS.z });
    for (const [exercise, gesture] of [
      ['bench', 'bench'],
      ['curls', 'curl'],
      ['squats', 'squat'],
      ['press', 'press'],
    ]) {
      await command(game, a.p, 'playerAction', { verb: 'train', exercise });
      assert.equal(latestResult(a.messages).ok, true);
      assert.equal(a.p.gesture, gesture);
      game.tick(0.05);
      assert.equal(a.p.mode, 'train');
      await command(game, a.p, 'playerAction', { verb: 'stopTraining' });
      assert.equal(a.p.gesture, '');
      Object.assign(a.p, { x: SF_FITNESS.x, z: SF_FITNESS.z });
    }
    a.p.hp = 10;
    game.receive(a.p, {
      type: 'command',
      request: 99,
      action: 'inventory',
      args: { op: 'eat' },
      inventoryEpoch: a.p.inventory.meta.epoch,
    });
    await a.p.queue;
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.gesture, 'eat');
    assert.equal(a.p.hp, 25);
    advance(901);
    game.tick(0.05);
    assert.equal(a.p.gesture, '');
  } finally {
    await game.close();
  }
});
