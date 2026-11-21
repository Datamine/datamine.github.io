import { requiredFixture } from '../../tests/helpers/required.mts';
import { createWilderness } from '../../wilderness.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, player, command, latestResult, requiredResult } from './fixtures.mts';
import { AIRSHIP_TERMINAL } from '../../airship.ts';
import { MP_PROTOCOL } from '../../multiplayer-protocol.ts';

test('a genuinely new profile gets 25 coins and cannot equip a railgun or boots from client preferences', async () => {
  const { game } = await fixture(),
    messages: import('../../types/network.ts').ServerEvent[] = [],
    p = await game.connect(
      {
        protocol: MP_PROTOCOL,
        token: 'f'.repeat(64),
        privateState: {
          'sf-purse-v1': '{"coins":999}',
          'sf-character-v1': '{"weapon":"railgun","boots":true}',
        },
      },
      {
        open: true,
        bufferedAmount: 0,
        send: (v: string) => messages.push(typeof v === 'string' ? JSON.parse(v) : v),
        close() {},
      },
    );
  try {
    assert.equal(p.inventory.economy.state.coins, 25);
    assert.equal(p.appearance.weapon, 'unarmed');
    assert.equal(p.appearance.boots, false);
    await command(game, p, 'equipAppearance', { look: { weapon: 'railgun', boots: true } });
    assert.equal(p.appearance.weapon, 'unarmed');
    assert.equal(p.appearance.boots, false);
    const gear = game.personal.runtime(p).expeditions.state;
    gear.railgun = true;
    gear.raptor = 'not-started';
    game.personal.runtime(p).save('sf-expeditions-v1')({ railgun: true, raptor: 'not-started' });
    await command(game, p, 'equipAppearance', { look: { weapon: 'railgun' } });
    assert.equal(p.appearance.weapon, 'unarmed');
    await command(game, p, 'playerAction', { verb: 'equipRailgun', on: true });
    assert.equal(requiredResult(messages).ok, false);
  } finally {
    await game.close();
  }
});

test('the ball chair requires its drop and sitting survives ticks until movement clears it', async () => {
  const { game } = await fixture(),
    a = await player(game, 99001);
  try {
    await command(game, a.p, 'activity', { mode: 'sit', chair: true });
    assert.equal(requiredResult(a.messages).ok, false);
    a.p.inventory.receive({ amount: 1, lootKind: 'equipment', itemId: 'ball-chair' });
    await command(game, a.p, 'activity', { mode: 'sit', chair: true });
    assert.equal(requiredResult(a.messages).ok, true);
    game.tick(0.2);
    assert.equal(a.p.mode, 'sit');
    assert.equal(a.p.gesture, 'chair');
    await command(game, a.p, 'moveTo', { x: a.p.x + 1, z: a.p.z });
    assert.equal(a.p.mode, 'walk');
    assert.notEqual(a.p.gesture, 'chair');
  } finally {
    await game.close();
  }
});

test('a second player can climb a deployed airship rope without buying a grappling hook', async () => {
  const { game, geometry } = await fixture(),
    a = await player(game, 99002),
    b = await player(game, 99003),
    home = geometry.airship.home;
  try {
    Object.assign(a.p, {
      x: AIRSHIP_TERMINAL.boarding.x + 0.5,
      z: AIRSHIP_TERMINAL.boarding.y + 0.5,
      y: home.y,
    });
    game.receive(a.p, {
      type: 'command',
      request: 1,
      action: 'airshipBoard',
      args: { price: game.shared.snapshot().airship.rentalPrice },
      inventoryEpoch: a.p.inventory.meta.epoch,
    });
    await a.p.queue;
    assert.equal(requiredResult(a.messages).ok, true);
    Object.assign(game.shared.airship.state, {
      phase: 'flying',
      position: { x: 140, y: 30, z: 150 },
      speed: 0,
    });
    await command(game, a.p, 'airshipRope');
    assert.equal(requiredResult(a.messages).ok, true);
    const bottom = game.shared.snapshot().airship.rope.bottom;
    assert.ok(bottom != null, 'Missing test fixture: bottom');
    Object.assign(b.p, { x: bottom.x, z: bottom.z, y: bottom.y });
    assert.equal(b.p.profile.grapplingHook, false);
    await command(game, b.p, 'airshipClimbUp');
    assert.equal(requiredResult(b.messages).ok, true);
    for (let i = 0; i < 200; i++) game.tick(0.05);
    assert.ok(game.shared.snapshot().airship.passengers.includes(b.p.id));
  } finally {
    await game.close();
  }
});

test('blocked clicks choose the nearest reachable tile and return its actual goal', async () => {
  const { game, geometry } = await fixture(),
    a = await player(game, 99004);
  try {
    geometry.landClearAt = (x, y) => x >= 90 && x < 95 && y >= 118 && y <= 122;
    geometry.pathTo = (x, y) => (geometry.landClearAt(x, y) ? [{ x, y }] : null);
    await command(game, a.p, 'moveTo', { x: 100.5, z: 120.5 });
    const result = latestResult(a.messages);
    assert.equal(requiredFixture(result).ok, true);
    assert.deepEqual(requiredFixture(result).goal, { x: 95, z: 120.5 });
    for (let i = 0; i < 60; i++) game.tick(0.05);
    assert.ok(geometry.landClearAt(a.p.x - 0.5, a.p.z - 0.5));
    assert.equal(a.p.x, requiredFixture(requiredFixture(result).goal).x);
  } finally {
    await game.close();
  }
});

test('attacking a revealed alien without a permit raises the police alarm', async () => {
  const { game } = await fixture(),
    a = await player(game, 99005, {
      'sf-sunglasses-v1': '{"owned":true}',
      'sf-character-v1': '{"sunglasses":true}',
    });
  try {
    const target = {
      label: 'unpermitted-alien',
      id: 'unpermitted-alien',
      alienId: 'alien-civic',
      x: a.p.x + 0.5,
      z: a.p.z,
      base: a.p.y,
    };
    game.shared.npcById.set(target.id, target);
    await command(game, a.p, 'playerAction', {
      verb: 'attackPersonal',
      id: target.id,
      weapon: 'railgun',
    });
    assert.equal(requiredResult(a.messages).ok, false);
    assert.equal(game.personal.runtime(a.p).police.state.wanted, true);
  } finally {
    await game.close();
  }
});

test('waterfront seagulls award experience without turning zero damage into a combat hit', async () => {
  const { game } = await fixture(),
    a = await player(game, 99006);
  try {
    const bird = createWilderness({
      spawns: [{ id: 'test-seagull', combatKind: 'seagull', x: a.p.x + 0.5, z: a.p.z }],
    }).actors[0];
    game.shared.wilderness.actors.push(bird);
    const hp = a.p.hp;
    await command(game, a.p, 'attack', { id: bird.id, weapon: 'unarmed' });
    game.tick(0.7);
    assert.equal(a.p.hp, hp);
    assert.ok(a.p.hitpointsXP > 0);
  } finally {
    await game.close();
  }
});
