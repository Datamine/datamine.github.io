import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from 'redis';
import { createStore } from '../store.mts';
import { createCheckpointManager } from '../checkpoints.mts';

test(
  'Redis snapshots persist, ownership is exclusive and losing a lease prevents stale writes',
  { skip: process.env.RUN_REDIS_TESTS !== '1' },
  async () => {
    const probe = createServer();
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', () => resolve(undefined)));
    const port = (requiredFixture(probe.address()) as import('node:net').AddressInfo).port;
    await new Promise((resolve) => probe.close(resolve));
    const dir = await mkdtemp(join(tmpdir(), 'loeberland-redis-')),
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
      ),
      stores: Awaited<ReturnType<typeof createStore>>[] = [];
    let raw;
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
        first = await createStore({ redisURL });
      stores.push(first);
      await first.batch([['test', { value: 42 }]]);
      await first.rename('owner', 'baypilot', 'BayPilot', 1000000);
      assert.deepEqual(await first.get('test'), { value: 42 });
      await assert.rejects(createStore({ redisURL }), /already has a simulation owner/);
      await first.close();
      stores.pop();
      const second = await createStore({ redisURL });
      stores.push(second);
      assert.deepEqual(await second.get('test'), { value: 42 });
      assert.equal((await second.names())[0].name, 'BayPilot');
      const manager = await createCheckpointManager({ store: second }),
        ram = manager.openGame();
      await ram.batch([
        ['world', { serial: 11 }],
        ['player:pilot', { coins: 123 }],
      ]);
      await ram.rename('pilot', 'pilot', 'Pilot', 123);
      const completed = manager.openGame('finished');
      completed.complete();
      await manager.cycle();
      const documents = await second.loadGames(),
        active = requiredFixture(documents.find((g) => g.id === 'world')),
        finished = requiredFixture(documents.find((g) => g.id === 'finished'));
      assert.equal(requiredFixture(finished).status, 'completed');
      const old = structuredClone(active);
      await ram.batch([['world', { serial: 12 }]]);
      await manager.cycle();
      await assert.rejects(second.saveGame('world', old), /older/);
      await assert.rejects(
        second.saveGame('finished', {
          ...finished,
          status: 'active',
          version: finished.version + 1,
        }),
        /completed/,
      );
      await second.close();
      stores.pop();
      const recovered = await createStore({ redisURL });
      stores.push(recovered);
      const restored = await createCheckpointManager({ store: recovered });
      assert.deepEqual(await restored.openGame().get('world'), { serial: 12 });
      assert.equal(
        requiredFixture((await restored.openGame().names()).find((row) => row.owner === 'pilot'))
          .name,
        'Pilot',
      );
      assert.throws(() => restored.openGame('finished'), /completed/);
      raw = createClient({ url: redisURL });
      raw.on('error', () => {});
      await raw.connect();
      await raw.del('loeberland:v1:simulation-owner');
      const third = await createStore({ redisURL });
      stores.push(third);
      await assert.rejects(recovered.batch([['test', { value: 0 }]]), /lease was lost/);
      await assert.rejects(recovered.saveGame('world', { ...old, version: 999 }), /lease was lost/);
      assert.deepEqual(await third.get('test'), { value: 42 });
      assert.deepEqual(
        requiredFixture(
          requiredFixture((await third.loadGames()).find((g) => g.id === 'world')).records.find(
            ([key]) => key === 'world',
          ),
        )[1],
        { serial: 12 },
      );
    } finally {
      for (const store of stores) await store.close();
      await raw?.close();
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
