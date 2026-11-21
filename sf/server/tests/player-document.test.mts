import { storedPlayerFixture, fixtureGeometry, player } from './fixtures.mts';
import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';

import { MP_PROTOCOL } from '../../multiplayer-protocol.ts';
import { validatePlayerDocument } from '../../content/validate.js';

test('legacy quest markers survive migration, welcome snapshots, checkpoints and reconnects', async () => {
  const store = createMemoryStore();
  let game = await createGame({ geometry: fixtureGeometry(), store });
  try {
    const a = await player(game, 987001, {
      'sf-quests-v1': JSON.stringify({
        monkey: 'carrying',
        theyLive: {
          started: true,
          evidence: true,
          permit: true,
          bayonet: true,
          defeated: ['alien-civic'],
          completed: false,
        },
      }),
      'sf-expeditions-v1': JSON.stringify({
        raptor: 'completed',
        railgun: true,
        krakenStarted: true,
        krakenDefeated: true,
        krakenReward: true,
        cape: true,
      }),
    });
    a.p.profile.guild = { member: true, visits: 24 };
    a.p.profile.illuminati = true;
    const welcome = a.messages.find((m) => m.type === 'welcome');
    validatePlayerDocument(requiredFixture(welcome).playerState);
    assert.equal(
      requiredFixture(requiredFixture(welcome).playerState).quests.monkey.stage,
      'carrying',
    );
    await game.close();
    const persisted = await storedPlayerFixture(store, 'player:' + a.p.owner);
    validatePlayerDocument(persisted.playerState);
    assert.equal(Object.hasOwn(persisted, 'privateState'), false);
    assert.equal(Object.hasOwn(persisted, 'illuminati'), false);
    game = await createGame({ geometry: fixtureGeometry(), store });
    const b = await player(game, 987001);
    const q = b.p.profile.playerState.quests;
    assert.equal(q.monkey.stage, 'carrying');
    assert.deepEqual(q.theyLive.defeated, ['alien-civic']);
    assert.equal(q.theyLive.permit, true);
    assert.equal(q.expeditions.krakenReward, true);
    assert.equal(q.illuminatus.initiated, true);
  } finally {
    await game.close();
  }
});
test('client-provided JSON player state cannot grant quest progress or inventory', async () => {
  const store = createMemoryStore(),
    game = await createGame({ geometry: fixtureGeometry(), store });
  const messages: import('../../types/network.ts').ServerEvent[] = [];
  try {
    const forged = {
      schema: 2,
      quests: { monkey: { stage: 'completed' }, illuminatus: { initiated: true } },
      inventory: { economy: { coins: 999999 } },
    };
    const p = await game.connect(
      { protocol: MP_PROTOCOL, token: '9'.repeat(64), ...{ playerState: forged } },
      {
        open: true,
        bufferedAmount: 0,
        send: (value: string) =>
          messages.push(typeof value === 'string' ? JSON.parse(value) : value),
        close() {},
      },
    );
    assert.equal(p.profile.playerState.quests.monkey.stage, 'not-started');
    assert.equal(p.profile.playerState.quests.illuminatus.initiated, false);
    assert.equal(p.inventory.economy.state.coins, 25);
    game.receive(p, { type: 'checkpoint', ...{ playerState: forged } });
    await p.queue;
    assert.equal(p.inventory.economy.state.coins, 25);
    assert.equal(p.profile.playerState.quests.monkey.stage, 'not-started');
    validatePlayerDocument(requiredFixture(messages.find((m) => m.type === 'welcome')).playerState);
  } finally {
    await game.close();
  }
});
