import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startServer } from '../index.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry } from './fixtures.mts';
import { createMultiplayerClient } from '../../multiplayer-client.ts';

test('the browser network client merges entity deltas, renders peers and claims each award only once', async () => {
  const server = await startServer({
      port: 0,
      geometry: fixtureGeometry(),
      store: createMemoryStore(),
    }),
    clients = [];
  const storage = () => {
    const map = new Map([['sf-purse-v1', '{"coins":25}'] satisfies [string, string]]);
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, String(v)),
      removeItem: (k: string) => map.delete(k),
    };
  };
  const endpoint = 'ws://127.0.0.1:' + server.port + '/ws';
  const until = async (predicate: () => boolean) => {
    for (let i = 0; i < 300; i++) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail('Network client timed out');
  };
  try {
    const a = createMultiplayerClient({
        endpoint,
        storage: storage(),
        WebSocketClass:
          WebSocket as unknown as import('../../multiplayer-client.ts').ConnectionSocketConstructor,
      }),
      b = createMultiplayerClient({
        endpoint,
        storage: storage(),
        WebSocketClass:
          WebSocket as unknown as import('../../multiplayer-client.ts').ConnectionSocketConstructor,
      });
    clients.push(a, b);
    await Promise.all([a.first, b.first]);
    await until(() => a.remotePlayers().length === 1 && b.remotePlayers().length === 1);
    const cowCount = server.game.shared.cows.length;
    assert.ok(a?.state?.world?.cows != null, 'Missing test fixture: a.state.world.cows');
    assert.equal(a.state.world.cows.length, cowCount);
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.equal(a.state.world.cows.length, cowCount, 'unchanged cows survive delta-only updates');
    const name = await a.command('rename', { name: 'ClientPilot' });
    assert.equal(name.ok, true);
    await until(() => b.remotePlayers()[0]?.name === 'ClientPilot');
    let rewards = 0;
    assert.equal(
      a.claimAward({ id: 1, kind: 'coins', amount: 5 }, () => rewards++),
      true,
    );
    assert.equal(
      a.claimAward({ id: 1, kind: 'coins', amount: 5 }, () => rewards++),
      false,
    );
    assert.equal(rewards, 1);
    assert.equal((await a.command('rename', { name: 'TooSoon' })).ok, false);
  } finally {
    for (const client of clients) client.stop();
    await server.close();
  }
});
