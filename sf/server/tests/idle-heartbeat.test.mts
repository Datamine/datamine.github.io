import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry, player } from './fixtures.mts';

test('idle delta-only clients receive bounded application keepalives without repeated world snapshots', async () => {
  let now = 1000000;
  const game = await createGame({
      geometry: fixtureGeometry(),
      store: createMemoryStore(),
      now: () => now,
    }),
    a = await player(game, 9900);
  try {
    game.broadcast();
    a.messages.length = 0;
    const start = now;
    for (let i = 0; i < 120; i++) {
      now = start + (i + 1) * 100;
      game.broadcast();
    }
    const heartbeats = a.messages.filter((m) => m.type === 'heartbeat');
    assert.equal(heartbeats.length, 6);
    assert.equal(a.messages.filter((m) => m.type === 'world').length, 0);
    assert.equal(a.p.lastSentAt, now);
    assert.ok(
      a.messages.every((m) => m.type === 'heartbeat'),
      'idle connections need only tiny keepalives',
    );
  } finally {
    await game.close();
  }
});

test('normal outbound traffic suppresses redundant keepalives', async () => {
  let now = 1000000;
  const game = await createGame({
      geometry: fixtureGeometry(),
      store: createMemoryStore(),
      now: () => now,
    }),
    a = await player(game, 9901);
  try {
    game.broadcast();
    a.messages.length = 0;
    for (let i = 0; i < 60; i++) {
      now += 100;
      game.receive(a.p, { type: 'ping', time: now });
      game.broadcast();
    }
    assert.equal(a.messages.filter((m) => m.type === 'heartbeat').length, 0);
    assert.equal(a.messages.filter((m) => m.type === 'pong').length, 60);
  } finally {
    await game.close();
  }
});
