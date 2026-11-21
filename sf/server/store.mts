import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type {
  CheckpointStore,
  GameplayStore,
  GameCheckpoint,
  StorageEntry,
  NameReservation,
} from '../types/storage.ts';
import type { SQLiteOperations, SQLiteResponse } from '../types/sqlite.ts';
import '../types/json.ts';

const gameIndex = 'checkpoint:games',
  gameKey = (id: string) => 'checkpoint:game:' + id;
type PersistenceAdapter = GameplayStore & {
  loadLegacy: NonNullable<CheckpointStore['loadLegacy']>;
  destroy: () => void;
  close: () => Promise<void>;
  leaseHealthy?: boolean;
};
function gamePersistence(adapter: PersistenceAdapter): CheckpointStore & PersistenceAdapter {
  const persistence = Object.assign(adapter, {
    loadGames: async (): Promise<GameCheckpoint[]> => [],
    saveGame: async (_id: string, _snapshot: GameCheckpoint): Promise<void> => {},
  });
  let saving = Promise.resolve();
  persistence.loadGames = async () => {
    const index = ((await adapter.get(gameIndex)) || {}) as Record<
      string,
      GameCheckpoint['status']
    >;
    return Promise.all(
      Object.keys(index).map(async (id) => {
        const document = (await adapter.get(gameKey(id))) as GameCheckpoint | null;
        if (!document || document.id !== id || document.status !== index[id])
          throw new Error('Missing or inconsistent checkpoint for saved game ' + id);
        return document;
      }),
    );
  };
  // Local adapters serialize registry updates as well as individual games.
  // Redis overrides this with one ownership-checked atomic Lua operation.
  persistence.saveGame = (id: string, snapshot: GameCheckpoint) => {
    const document = structuredClone(snapshot);
    const write = async () => {
      const index = ((await adapter.get(gameIndex)) || {}) as Record<
          string,
          GameCheckpoint['status']
        >,
        previous = (await adapter.get(gameKey(id))) as GameCheckpoint | null;
      if (previous && previous.version > document.version)
        throw new Error('Refusing an older game checkpoint.');
      if (previous?.status === 'completed' && document.status !== 'completed')
        throw new Error('A completed game cannot be resumed.');
      await adapter.batch([
        [gameKey(id), document],
        [gameIndex, { ...index, [id]: document.status }],
      ]);
    };
    const task = saving.then(write, write);
    saving = task.catch(() => {});
    return task;
  };
  return persistence;
}

/** Checkpoint storage only; gameplay uses the separate in-process RAM adapter.
 * SQLite remains a local-development fallback, with I/O in a worker. */
export async function createStore({
  redisURL = process.env.REDIS_URL,
  filename = process.env.STATE_FILE ||
    fileURLToPath(new URL('./data/world.sqlite', import.meta.url)),
} = {}): Promise<CheckpointStore> {
  if (redisURL) {
    const { createClient } = await import('redis'),
      client = createClient({
        url: redisURL,
        disableOfflineQueue: true,
        socket: { connectTimeout: 5000 },
      });
    client.on('error', (e) => console.error('Redis:', e.message));
    await client.connect();
    const prefix = 'loeberland:v1:',
      lease = prefix + 'simulation-owner',
      owner = randomUUID();
    if (!(await client.set(lease, owner, { NX: true, PX: 15000 }))) {
      await client.close();
      throw Error(
        'This Redis world already has a simulation owner. Run one server process for the common world.',
      );
    }
    let leaseHealthy = true;
    const timer = setInterval(async () => {
      try {
        leaseHealthy = !!(await client.eval(
          'if redis.call("GET",KEYS[1])==ARGV[1] then return redis.call("PEXPIRE",KEYS[1],15000) else return 0 end',
          { keys: [lease], arguments: [owner] },
        ));
      } catch {
        leaseHealthy = false;
      }
    }, 4000);
    timer.unref();
    let closed: Promise<void> | null = null;
    const adapter = gamePersistence({
      kind: 'redis',
      get leaseHealthy() {
        return leaseHealthy;
      },
      get: async (key: string) => {
        const value = await client.get(prefix + key);
        return value === null ? null : JSON.parse(value);
      },
      batch: async (entries) => {
        if (!entries.length) return;
        const result = await client.eval(
          'if redis.call("GET",KEYS[1])~=ARGV[1] then return 0 end; for i=2,#KEYS do redis.call("SET",KEYS[i],ARGV[i]) end; return 1',
          {
            keys: [lease, ...entries.map(([key]) => prefix + key)],
            arguments: [owner, ...entries.map(([, value]) => JSON.stringify(value))],
          },
        );
        if (!result) {
          leaseHealthy = false;
          throw Error('World ownership lease was lost. Writes stopped.');
        }
      },
      names: async () =>
        Object.values(await client.hGetAll(prefix + 'names')).map(
          (value) => JSON.parse(value) as NameReservation,
        ),
      rename: async (nameOwner: string, canonical: string, name: string, changed: number) => {
        const result = await client.eval(
          'if redis.call("GET",KEYS[1])~=ARGV[1] then return 0 end; redis.call("HSET",KEYS[2],ARGV[2],ARGV[3]); return 1',
          {
            keys: [lease, prefix + 'names'] satisfies [string, string],
            arguments: [
              owner,
              nameOwner,
              JSON.stringify({ owner: nameOwner, canonical, name, changed }),
            ],
          },
        );
        if (!result) throw Error('World ownership lease was lost.');
      },
      loadLegacy: async () => {
        const keys: string[] = [];
        for await (const batch of client.scanIterator({ MATCH: prefix + 'player:*', COUNT: 200 }))
          keys.push(...batch);
        const records: StorageEntry[] = [];
        const world = await client.get(prefix + 'world');
        if (world !== null) records.push(['world', JSON.parse(world)]);
        if (keys.length) {
          const values = await client.mGet(keys);
          for (let i = 0; i < keys.length; i++)
            if (values[i] !== null)
              records.push([keys[i].slice(prefix.length), JSON.parse(values[i]!)]);
        }
        return { records, names: await adapter.names() };
      },
      destroy() {
        clearInterval(timer);
        if (client.isOpen) client.destroy();
      },
      close() {
        if (!closed)
          closed = (async () => {
            clearInterval(timer);
            try {
              if (client.isReady)
                await client.eval(
                  'if redis.call("GET",KEYS[1])==ARGV[1] then return redis.call("DEL",KEYS[1]) else return 0 end',
                  { keys: [lease], arguments: [owner] },
                );
            } finally {
              if (client.isOpen) await client.close();
            }
          })();
        return closed;
      },
    });
    adapter.saveGame = async (id: string, snapshot: GameCheckpoint) => {
      const document = JSON.stringify(snapshot);
      const result = await client.eval(
        `
                if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
                local previous=redis.call('GET',KEYS[3])
                if previous then
                    local saved=cjson.decode(previous)
                    if saved.version>tonumber(ARGV[4]) then return -1 end
                    if saved.status=='completed' and ARGV[5]~='completed' then return -2 end
                end
                local index=cjson.decode(redis.call('GET',KEYS[2]) or '{}')
                index[ARGV[2]]=ARGV[5]
                redis.call('SET',KEYS[3],ARGV[3]); redis.call('SET',KEYS[2],cjson.encode(index))
                return 1
            `,
        {
          keys: [lease, prefix + gameIndex, prefix + gameKey(id)] satisfies [
            string,
            string,
            string,
          ],
          arguments: [owner, id, document, String(snapshot.version), snapshot.status],
        },
      );
      if (result === 0) {
        leaseHealthy = false;
        throw new Error('World ownership lease was lost. Writes stopped.');
      }
      if (result === -1) throw new Error('Refusing an older game checkpoint.');
      if (result === -2) throw new Error('A completed game cannot be resumed.');
    };
    return adapter;
  }
  const sourceWorker = import.meta.url.endsWith('.mts');
  const workerURL = new URL(
    sourceWorker ? './sqlite-worker.mts' : './sqlite-worker.mjs',
    import.meta.url,
  );
  // Workers need their own loader registration; production uses ordinary ESM.
  const workerEntry = sourceWorker
    ? new URL(
        'data:text/javascript,' +
          encodeURIComponent(
            `import {register} from ${JSON.stringify(import.meta.resolve('tsx/esm/api'))};register();await import(${JSON.stringify(workerURL.href)});`,
          ),
      )
    : workerURL;
  const worker = new Worker(workerEntry, { workerData: { filename } }),
    pending = new Map<
      number,
      { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
    >();
  let serial = 0;
  worker.on('message', ({ id, result, error }: SQLiteResponse) => {
    const task = pending.get(id);
    if (!task) return;
    pending.delete(id);
    error ? task.reject(Error(error)) : task.resolve(result);
  });
  worker.on('error', (error) => {
    for (const task of pending.values()) task.reject(error);
    pending.clear();
  });
  const call = <K extends keyof SQLiteOperations>(
    method: K,
    ...args: SQLiteOperations[K]['args']
  ): Promise<SQLiteOperations[K]['result']> =>
    new Promise<unknown>((resolve, reject) => {
      const id = ++serial;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, method, args });
    }) as Promise<SQLiteOperations[K]['result']>;
  let closed: Promise<void> | null = null;
  return gamePersistence({
    kind: 'sqlite',
    get: async (key: string) => {
      const value = await call('get', key);
      return value === null ? null : JSON.parse(value);
    },
    batch: (entries) =>
      call(
        'batch',
        entries.map(([key, value]) => [key, JSON.stringify(value)]),
      ),
    names: () => call('names'),
    rename: (...args) => call('rename', ...args),
    loadLegacy: async () => ({
      records: (await call('legacy')).map((row) => [row.key, JSON.parse(row.value)]),
      names: await call('names'),
    }),
    destroy() {
      for (const task of pending.values()) task.reject(new Error('Storage closed'));
      pending.clear();
      void worker.terminate().catch(() => {});
    },
    close() {
      if (!closed)
        closed = (async () => {
          await call('close');
          await worker.terminate();
        })();
      return closed;
    },
  });
}

export function createMemoryStore() {
  const values = new Map<string, unknown>(),
    names = new Map<string, NameReservation>();
  return gamePersistence({
    kind: 'memory',
    get: async (key: string) => values.get(key) ?? null,
    batch: async (entries) => {
      for (const [key, value] of entries) values.set(key, structuredClone(value));
    },
    names: async () => [...names.values()],
    rename: async (owner, canonical, name: string, changed) => {
      names.set(owner, { owner, canonical, name, changed });
    },
    loadLegacy: async () => ({
      records: structuredClone(
        [...values].filter(([key]) => key === 'world' || key.startsWith('player:')),
      ),
      names: structuredClone([...names.values()]),
    }),
    destroy() {},
    close: async () => {},
  });
}
