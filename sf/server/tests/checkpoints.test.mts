import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckpointManager } from '../checkpoints.mts';
import { createMemoryStore } from '../store.mts';
import { createGame } from '../game.mts';
import { fixtureGeometry, player, command, requiredResult } from './fixtures.mts';

const deferred = () => {
  let resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const turn = () => new Promise((resolve) => setImmediate(resolve));
function backend() {
  const documents = new Map<string, import('../../types/storage.ts').GameCheckpoint>(),
    writes: import('../../types/storage.ts').GameCheckpoint[] = [],
    errors: unknown[][] = [];
  return {
    documents,
    writes,
    errors,
    closed: false,
    destroyed: false,
    logger: { error: (...args: unknown[]) => errors.push(args) },
    async loadGames() {
      return structuredClone([...documents.values()]);
    },
    async saveGame(id: string, snapshot: import('../../types/storage.ts').GameCheckpoint) {
      writes.push(structuredClone(snapshot));
      documents.set(id, structuredClone(snapshot));
    },
    async close() {
      this.closed = true;
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

test('restores all discovered games, names, versions and completed status without gameplay storage reads', async () => {
  const store = createMemoryStore(),
    first = await createCheckpointManager({ store });
  assert.equal(first.intervalMs, 1000);
  assert.equal(first.shutdownTimeoutMs, 10000);
  const live = first.openGame('world'),
    done = first.openGame('finished');
  await live.batch([['player:alice', { coins: 27 }]]);
  await live.rename('alice', 'alice', 'Alice', 123);
  done.complete();
  await first.cycle();
  const savedVersion = live.version,
    restored = await createCheckpointManager({ store });
  // Everything needed for reads, writes and uniqueness is now in RAM.
  store.get = async () => {
    throw new Error('Gameplay must not read storage');
  };
  const ram = restored.openGame('world');
  assert.deepEqual(await ram.get('player:alice'), { coins: 27 });
  assert.equal((await ram.names())[0].name, 'Alice');
  assert.equal(ram.persistedVersion, savedVersion);
  await assert.rejects(ram.rename('bob', 'alice', 'Alice', 124), /already taken/);
  await ram.batch([['player:alice', { coins: 31 }]]);
  assert.ok(ram.version > savedVersion);
  assert.throws(() => restored.openGame('finished'), /completed/);
  assert.equal(
    requiredFixture(restored.list().find((g) => g.id === 'finished')).status,
    'completed',
  );
});

test('captures detached snapshots, serializes each writer, and coalesces changes made during a write', async () => {
  const store = backend(),
    gate = deferred();
  let active = 0,
    peak = 0;
  store.saveGame = async (id, snapshot) => {
    active++;
    peak = Math.max(peak, active);
    store.writes.push(snapshot);
    if (store.writes.length === 1) await gate.promise;
    store.documents.set(id, structuredClone(snapshot));
    active--;
  };
  const manager = await createCheckpointManager({ store, logger: store.logger }),
    ram = manager.openGame();
  const value = { nested: { coins: 10 } };
  await ram.batch([['player:alice', value]]);
  const first = manager.checkpoint('world');
  await turn();
  const version = store.writes[0].version;
  value.nested.coins = 999;
  await ram.batch([['player:alice', { nested: { coins: 20 } }]]);
  const read = (await ram.get('player:alice')) as typeof value;
  read.nested.coins = 888;
  for (let i = 21; i <= 30; i++) {
    await ram.batch([['player:alice', { nested: { coins: i } }]]);
    await manager.cycle();
  }
  assert.equal(manager.checkpoint('world'), first);
  assert.equal(store.writes.length, 1);
  assert.deepEqual(store.writes[0].records[0][1], { nested: { coins: 10 } });
  gate.resolve();
  await first;
  assert.equal(ram.persistedVersion, version);
  assert.ok(ram.version > version);
  await manager.cycle();
  assert.equal(peak, 1);
  assert.equal(store.writes.length, 2);
  assert.deepEqual(store.writes[1].records[0][1], { nested: { coins: 30 } });
  assert.equal(ram.persistedVersion, ram.version);
  await manager.cycle();
  assert.equal(store.writes.length, 2);
});

test('write failures retain dirty state and the following cycle retries the latest version', async () => {
  const store = backend(),
    save = store.saveGame.bind(store);
  let fail = true;
  store.saveGame = async (...args) => {
    if (fail) {
      fail = false;
      throw new Error('Redis unavailable');
    }
    return save(...args);
  };
  const manager = await createCheckpointManager({ store, logger: store.logger }),
    ram = manager.openGame();
  await ram.batch([['world', { coins: 5 }]]);
  await manager.cycle();
  assert.equal(ram.persistedVersion, 0);
  assert.equal(store.errors.length, 1);
  assert.ok(store.errors[0][1] instanceof Error);
  assert.match(store.errors[0][1].message, /Redis unavailable/);
  await ram.batch([['world', { coins: 9 }]]);
  await manager.cycle();
  assert.equal(ram.persistedVersion, ram.version);
  assert.deepEqual(requiredFixture(store.documents.get('world')).records[0][1], { coins: 9 });
});

test('shutdown drains mutations, waits for an older write, saves the latest state and only then closes storage', async () => {
  const store = backend(),
    gate = deferred(),
    save = store.saveGame.bind(store);
  let calls = 0;
  store.saveGame = async (...args) => {
    calls++;
    if (calls === 1) await gate.promise;
    assert.equal(store.closed, false);
    return save(...args);
  };
  const manager = await createCheckpointManager({ store, logger: store.logger }),
    ram = manager.openGame();
  await ram.batch([['world', { coins: 1 }]]);
  const pending = manager.checkpoint('world');
  await turn();
  manager.attach('world', {
    drain: async () => {
      await ram.batch([['world', { coins: 2 }]]);
    },
  });
  manager.start();
  const closing = manager.shutdown();
  assert.equal(manager.shutdown(), closing);
  await turn();
  assert.equal(store.closed, false);
  assert.throws(() => manager.openGame(), /shutting down/);
  gate.resolve();
  await pending;
  assert.deepEqual(await closing, { flushed: true, timedOut: false });
  assert.equal(calls, 2);
  assert.deepEqual(requiredFixture(store.documents.get('world')).records[0][1], { coins: 2 });
  assert.equal(ram.persistedVersion, ram.version);
  assert.equal(store.closed, true);
  await manager.cycle();
  assert.equal(calls, 2);
});

test('a failed final write is logged without preventing other games from saving or storage from closing', async () => {
  const store = backend(),
    save = store.saveGame.bind(store);
  store.saveGame = async (id, snapshot) => {
    if (id === 'broken') throw new Error('Write failed');
    return save(id, snapshot);
  };
  const manager = await createCheckpointManager({ store, logger: store.logger });
  manager.openGame('broken');
  manager.openGame('healthy');
  assert.deepEqual(await manager.shutdown(), { flushed: false, timedOut: false });
  assert.ok(store.documents.has('healthy'));
  assert.equal(store.closed, true);
  assert.ok(store.errors.length >= 2);
});

test('shutdown timeout is bounded even with a frozen game clock and prevents late writes after disposal', async () => {
  const store = backend(),
    gate = deferred();
  const manager = await createCheckpointManager({
    store,
    logger: store.logger,
    shutdownTimeoutMs: 20,
    now: () => 1,
  });
  manager.openGame();
  manager.attach('world', { drain: () => gate.promise });
  const start = performance.now();
  assert.deepEqual(await manager.shutdown(), { flushed: false, timedOut: true });
  assert.ok(performance.now() - start < 1000);
  assert.equal(store.destroyed, true);
  assert.equal(store.closed, false);
  gate.resolve();
  await turn();
  assert.equal(store.writes.length, 0);
  assert.ok(store.errors.some((args) => /Shutdown checkpoint/.test(String(args[0]))));
});

test('shutdown destroys a stalled in-flight Redis writer instead of hanging indefinitely', async () => {
  const store = backend(),
    gate = deferred();
  store.saveGame = () => gate.promise;
  store.destroy = () => {
    store.destroyed = true;
    gate.reject(new Error('Socket destroyed'));
  };
  const manager = await createCheckpointManager({
    store,
    logger: store.logger,
    shutdownTimeoutMs: 20,
  });
  manager.openGame();
  const pending = manager.checkpoint('world');
  const observed = pending.catch(() => {});
  await turn();
  assert.deepEqual(await manager.shutdown(), { flushed: false, timedOut: true });
  await observed;
  await turn();
  assert.equal(store.destroyed, true);
  assert.equal(store.closed, false);
});

test('the shutdown deadline also bounds storage close after a successful final checkpoint', async () => {
  const store = backend();
  store.close = () => new Promise(() => {});
  const manager = await createCheckpointManager({
    store,
    logger: store.logger,
    shutdownTimeoutMs: 20,
  });
  manager.openGame();
  assert.deepEqual(await manager.shutdown(), { flushed: false, timedOut: true });
  assert.ok(store.documents.has('world'));
  assert.equal(store.destroyed, true);
  assert.ok(store.errors.some((args) => /Storage shutdown/.test(String(args[0]))));
});

test('configured periodic checkpoints run automatically and stop on shutdown', async () => {
  const store = backend(),
    manager = await createCheckpointManager({ store, logger: store.logger, intervalMs: 10 });
  const ram = manager.openGame();
  manager.start();
  try {
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.equal(store.writes.length, 1);
    await ram.batch([['world', { coins: 1 }]]);
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.equal(store.writes.length, 2);
  } finally {
    await manager.shutdown();
  }
  const count = store.writes.length;
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(store.writes.length, count);
});

test('invalid checkpoints fail startup instead of silently replacing saved progress', async () => {
  const store = backend();
  store.documents.set('world', {
    id: 'world',
    status: 'active',
    schema: 1,
    version: 0,
    records: [],
    names: [],
  });
  await assert.rejects(createCheckpointManager({ store }), /Invalid game checkpoint/);
  for (const intervalMs of [0, NaN, 1.5] satisfies [number, number, number])
    await assert.rejects(createCheckpointManager({ store, intervalMs }), /positive integer/);
});

test('real simulation mutations remain in RAM and checkpoint recovery sends a fresh authoritative snapshot', async () => {
  const store = createMemoryStore(),
    save = store.saveGame.bind(store);
  let writes = 0;
  store.saveGame = (...args) => {
    writes++;
    return save(...args);
  };
  let manager = await createCheckpointManager({ store }),
    ram = manager.openGame();
  let game = await createGame({
    geometry: fixtureGeometry(),
    store: ram,
    now: () => 1000000,
    random: () => 0.5,
    allowDebug: true,
  });
  manager.attach('world', { prepare: game.prepareCheckpoint, drain: game.close });
  const a = await player(game, 700, { 'sf-purse-v1': '{"coins":1234}' });
  await command(game, a.p, 'rename', { name: 'RamPilot' });
  assert.equal(requiredResult(a.messages).ok, true);
  const cow = game.shared.cows[0];
  await command(game, a.p, 'teleport', { x: cow.x, z: cow.z + 1 });
  await command(game, a.p, 'attack', { id: cow.id });
  // Controllers throttle their own saves. A checkpoint must still capture
  // the latest accumulated XP rather than the last throttled profile copy.
  const strength = game.personal.runtime(a.p).strength;
  strength.train(0.25);
  const xp = strength.state.xp;
  assert.equal(writes, 0);
  await manager.cycle();
  assert.equal(writes, 1);
  const savedVersion = ram.persistedVersion;
  // Simulate losing the process after this checkpoint, with later changes.
  a.p.inventory.economy.state.coins = 9999;
  manager = await createCheckpointManager({ store });
  ram = manager.openGame();
  assert.equal(ram.version, savedVersion);
  game = await createGame({ geometry: fixtureGeometry(), store: ram, now: () => 1001000 });
  manager.attach('world', { prepare: game.prepareCheckpoint, drain: game.close });
  const b = await player(game, 700),
    welcome = b.messages.find((m) => m.type === 'welcome');
  assert.equal(requiredFixture(welcome).name, 'RamPilot');
  assert.equal(b.p.inventory.economy.state.coins, 1234);
  assert.equal(JSON.parse(requiredFixture(welcome).privateState['sf-strength-v1']).xp, xp);
  assert.equal(game.shared.cows[0].hp, 10);
  assert.equal(requiredFixture(requiredFixture(welcome).shared.cows)[0].hp, 10);
  await manager.shutdown();
});

test('legacy records migrate once and cannot replace newer checkpoint state', async () => {
  const store = createMemoryStore();
  await store.batch([['world', { serial: 42 }]]);
  const first = await createCheckpointManager({ store }),
    ram = first.openGame();
  assert.deepEqual(await ram.get('world'), { serial: 42 });
  await ram.batch([['world', { serial: 43 }]]);
  await first.cycle();
  await store.batch([['world', { serial: 0 }]]);
  const restored = await createCheckpointManager({ store });
  assert.deepEqual(await restored.openGame().get('world'), { serial: 43 });
});

test('storage refuses stale versions and never resurrects completed games', async () => {
  const store = createMemoryStore(),
    manager = await createCheckpointManager({ store }),
    ram = manager.openGame();
  await manager.cycle();
  const [old] = await store.loadGames();
  ram.complete();
  await manager.cycle();
  await assert.rejects(store.saveGame('world', old), /older/);
  await assert.rejects(store.saveGame('world', { ...old, version: ram.version + 1 }), /completed/);
});
