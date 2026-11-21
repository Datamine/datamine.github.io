import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { startServer, installShutdownHooks } from '../index.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry } from './fixtures.mts';
import { MP_PROTOCOL } from '../../multiplayer-protocol.ts';

async function until(predicate: () => boolean) {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('Timed out waiting for server state');
}
async function join(port: number) {
  const ws = new WebSocket('ws://127.0.0.1:' + port + '/ws'),
    messages: import('../../types/network.ts').ServerEvent[] = [];
  ws.on('message', (data, binary) => {
    if (!binary) messages.push(JSON.parse(data.toString()));
  });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.send(
    JSON.stringify({
      type: 'hello',
      protocol: MP_PROTOCOL,
      token: 'c'.repeat(64),
      privateState: {},
    }),
  );
  await until(() => messages.some((m) => m.type === 'welcome'));
  return { ws, messages };
}

test('SIGTERM and SIGINT share one awaited shutdown hook without an async exit handler', async () => {
  const signals = new EventEmitter(),
    exits: number[] = [];
  let calls = 0,
    release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  const remove = installShutdownHooks(
    {
      close: () => {
        calls++;
        return pending;
      },
    },
    { signals, exit: (code) => exits.push(code) },
  );
  signals.emit('SIGTERM');
  signals.emit('SIGINT');
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(signals.listenerCount('exit'), 0);
  assert.deepEqual(exits, []);
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(exits, [0]);
  remove();
  assert.equal(signals.listenerCount('SIGTERM'), 0);
  assert.equal(signals.listenerCount('SIGINT'), 0);
});

test('periodic server checkpoints and graceful restart restore fresh WebSocket state before traffic is accepted', async () => {
  const store = createMemoryStore();
  let server = await startServer({
    port: 0,
    geometry: fixtureGeometry(),
    store,
    checkpointIntervalMs: 20,
    shutdownTimeoutMs: 1000,
  });
  let client!: Awaited<ReturnType<typeof join>>;
  try {
    client = await join(server.port);
    client.ws.send(
      JSON.stringify({
        type: 'command',
        action: 'rename',
        request: 1,
        args: { name: 'SavedPilot' },
      }),
    );
    await until(() => client.messages.some((m) => m.type === 'result' && m.request === 1 && m.ok));
    await until(() => server.checkpoints.list()[0].persistedVersion > 0);
    assert.ok((await store.loadGames())[0].records.some(([key]) => key.startsWith('player:')));
    const closing = server.close();
    assert.equal(server.close(), closing);
    assert.deepEqual(await closing, { flushed: true, timedOut: false });
    const version = (await store.loadGames())[0].version;
    server = await startServer({
      port: 0,
      geometry: fixtureGeometry(),
      store,
      checkpointIntervalMs: 1000,
    });
    assert.equal(server.checkpoints.list()[0].persistedVersion, version);
    client = await join(server.port);
    const welcome = requiredFixture(client.messages.find((m) => m.type === 'welcome'));
    assert.equal(welcome.name, 'SavedPilot');
    assert.equal(requiredFixture(welcome.shared.cows).length, 8);
  } finally {
    client?.ws.terminate();
    await server.close();
  }
});

test('server finishes shutdown when final checkpoint storage stalls', async () => {
  const store = createMemoryStore(),
    errors = [];
  let destroyed = false;
  store.saveGame = () => new Promise(() => {});
  store.destroy = () => {
    destroyed = true;
  };
  const server = await startServer({
    port: 0,
    geometry: fixtureGeometry(),
    store,
    checkpointIntervalMs: 10000,
    shutdownTimeoutMs: 30,
    logger: { error: (...args) => errors.push(args) },
  });
  const { ws } = await join(server.port);
  try {
    const start = performance.now(),
      result = await server.close();
    assert.deepEqual(result, { flushed: false, timedOut: true });
    assert.ok(performance.now() - start < 1000);
    assert.equal(destroyed, true);
    assert.equal(server.http.listening, false);
    assert.ok(errors.length);
  } finally {
    ws.terminate();
    await server.close();
  }
});

test('a completed restored world is rejected before opening the HTTP listener', async () => {
  const store = createMemoryStore();
  await store.saveGame('world', {
    schema: 1,
    id: 'world',
    status: 'completed',
    version: 5,
    records: [],
    names: [],
  });
  await assert.rejects(startServer({ port: 0, geometry: fixtureGeometry(), store }), /completed/);
});
