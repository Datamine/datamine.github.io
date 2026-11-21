import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from 'redis';
import { backupRedis, restoreRedis, validateSnapshot } from '../backup.mts';
import { createStore } from '../store.mts';
import { createCheckpointManager } from '../checkpoints.mts';

test('backup rejects empty, incomplete and inconsistent checkpoint registries', () => {
  const game = { schema: 1, id: 'world', status: 'active', version: 1, records: [], names: [] };
  assert.throws(() => validateSnapshot(['{}']), /empty backup/);
  assert.throws(() => validateSnapshot(['{"world":"active"}']), /Incomplete/);
  assert.throws(
    () =>
      validateSnapshot([
        '{"world":"completed"}',
        ['world', JSON.stringify(game)] satisfies [string, string],
      ]),
    /Invalid/,
  );
  assert.throws(
    () =>
      validateSnapshot([
        '{"world":"active"}',
        ['world', JSON.stringify({ ...game, version: 0 })] satisfies [string, string],
      ]),
    /Invalid/,
  );
});

test(
  'live Redis backup restores all games, players and names through SQLite and Redis',
  { skip: process.env.RUN_REDIS_TESTS !== '1' },
  async () => {
    const probe = createServer();
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', () => resolve(undefined)));
    const port = (requiredFixture(probe.address()) as import('node:net').AddressInfo).port;
    await new Promise((resolve) => probe.close(resolve));
    const dir = await mkdtemp(join(tmpdir(), 'loeberland-backup-')),
      server = spawn(
        'redis-server',
        [
          '--bind',
          '127.0.0.1',
          '--port',
          String(port),
          '--save',
          '',
          '--appendonly',
          'no',
          '--dir',
          dir,
        ] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ],
        { stdio: 'ignore' },
      );
    let source, sqlite, raw;
    try {
      for (let i = 0; i < 100; i++) {
        const ready = await new Promise((resolve) => {
          const socket = connect(port, '127.0.0.1');
          socket.once('connect', () => {
            socket.destroy();
            resolve(true);
          });
          socket.once('error', () => resolve(false));
        });
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const redisURL = 'redis://127.0.0.1:' + port,
        filename = join(dir, 'world.sqlite');
      source = await createStore({ redisURL });
      const manager = await createCheckpointManager({ store: source }),
        world = manager.openGame();
      const profile = {
        coins: 123,
        secret: 'identity-token',
        inventory: { tablets: 7 },
        largeNumber: Number.MAX_SAFE_INTEGER,
      };
      await world.batch([
        ['world', { serial: 42 }],
        ['player:alice', profile],
      ]);
      await world.rename('alice', 'alice', 'Alice', 12345);
      manager.openGame('finished').complete();
      await manager.cycle();
      raw = createClient({ url: redisURL });
      raw.on('error', () => {});
      await raw.connect();
      const lease = await raw.get('loeberland:v1:simulation-owner'),
        expected = await source.loadGames();
      assert.equal((await backupRedis({ redisURL, filename })).games, 2);
      assert.equal(
        await raw.get('loeberland:v1:simulation-owner'),
        lease,
        'backup never takes or releases the live ownership lease',
      );
      assert.equal((await stat(filename)).mode & 0o777, 0o600);
      sqlite = await createStore({ redisURL: '', filename });
      assert.deepEqual(
        (await sqlite.loadGames()).sort((a: { id: string }, b: { id: string }) =>
          a.id.localeCompare(b.id),
        ),
        expected.sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)),
      );
      const recovered = await createCheckpointManager({ store: sqlite }),
        restored = recovered.openGame();
      assert.deepEqual(await restored.get('player:alice'), profile);
      assert.equal((await restored.names())[0].name, 'Alice');
      assert.deepEqual(await restored.get('world'), { serial: 42 });
      assert.throws(() => recovered.openGame('finished'), /completed/);
      await sqlite.close();
      sqlite = null;
      const original = await readFile(filename);
      await raw.del('loeberland:v1:checkpoint:game:finished');
      await assert.rejects(backupRedis({ redisURL, filename }), /Missing checkpoint/);
      assert.deepEqual(
        await readFile(filename),
        original,
        'failed export preserves the previous backup',
      );
      assert.equal(
        (await readdir(dir)).some((name) => name.endsWith('.tmp')),
        false,
      );
      await assert.rejects(restoreRedis({ redisURL, filename }), /empty Redis/);
      await source.close();
      source = null;
      await raw.flushDb(); // This Redis process exists only for this test.
      await assert.rejects(backupRedis({ redisURL, filename }), /No game checkpoints/);
      assert.deepEqual(await readFile(filename), original);
      assert.equal((await restoreRedis({ redisURL, filename })).games, 2);
      source = await createStore({ redisURL });
      assert.deepEqual(
        (await source.loadGames()).sort((a: { id: string }, b: { id: string }) =>
          a.id.localeCompare(b.id),
        ),
        expected,
      );
    } finally {
      await sqlite?.close();
      await source?.close();
      if (raw?.isOpen) raw.destroy();
      server.kill('SIGTERM');
      await new Promise((resolve) =>
        server.exitCode !== null
          ? resolve(undefined)
          : server.once('exit', () => resolve(undefined)),
      );
      await rm(dir, { recursive: true, force: true });
    }
  },
);
