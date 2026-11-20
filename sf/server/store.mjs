import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const gameIndex = 'checkpoint:games',
  gameKey = (id) => 'checkpoint:game:' + id;
function gamePersistence(adapter) {
  let saving = Promise.resolve();
  adapter.loadGames = async () => {
    const index = (await adapter.get(gameIndex)) || {};
    return Promise.all(
      Object.keys(index).map(async (id) => {
        const document = await adapter.get(gameKey(id));
        if (!document || document.id !== id || document.status !== index[id])
          throw new Error('Missing or inconsistent checkpoint for saved game ' + id);
        return document;
      }),
    );
  };
  // Local adapters serialize registry updates as well as individual games.
  // Redis overrides this with one ownership-checked atomic Lua operation.
  adapter.saveGame = (id, snapshot) => {
    const document = structuredClone(snapshot);
    const write = async () => {
      const index = (await adapter.get(gameIndex)) || {},
        previous = await adapter.get(gameKey(id));
      if (previous?.version > document.version)
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
  return adapter;
}

/** Checkpoint storage only; gameplay uses the separate in-process RAM adapter.
 * SQLite remains a local-development fallback, with I/O in a worker. */
export async function createStore({
  redisURL = process.env.REDIS_URL,
  filename = process.env.STATE_FILE ||
    fileURLToPath(new URL('./data/world.sqlite', import.meta.url)),
} = {}) {
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
    let closed = null;
    const adapter = gamePersistence({
      kind: 'redis',
      get leaseHealthy() {
        return leaseHealthy;
      },
      get: async (key) => {
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
      names: async () => Object.values(await client.hGetAll(prefix + 'names')).map(JSON.parse),
      rename: async (nameOwner, canonical, name, changed) => {
        const result = await client.eval(
          'if redis.call("GET",KEYS[1])~=ARGV[1] then return 0 end; redis.call("HSET",KEYS[2],ARGV[2],ARGV[3]); return 1',
          {
            keys: [lease, prefix + 'names'],
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
        const keys = [];
        for await (const batch of client.scanIterator({ MATCH: prefix + 'player:*', COUNT: 200 }))
          keys.push(...batch);
        const records = [];
        const world = await client.get(prefix + 'world');
        if (world !== null) records.push(['world', JSON.parse(world)]);
        if (keys.length) {
          const values = await client.mGet(keys);
          for (let i = 0; i < keys.length; i++)
            if (values[i] !== null)
              records.push([keys[i].slice(prefix.length), JSON.parse(values[i])]);
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
    adapter.saveGame = async (id, snapshot) => {
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
          keys: [lease, prefix + gameIndex, prefix + gameKey(id)],
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
  const worker = new Worker(new URL('./sqlite-worker.mjs', import.meta.url), {
      workerData: { filename },
    }),
    pending = new Map();
  let serial = 0;
  worker.on('message', ({ id, result, error }) => {
    const task = pending.get(id);
    if (!task) return;
    pending.delete(id);
    error ? task.reject(Error(error)) : task.resolve(result);
  });
  worker.on('error', (error) => {
    for (const task of pending.values()) task.reject(error);
    pending.clear();
  });
  const call = (method, ...args) =>
    new Promise((resolve, reject) => {
      const id = ++serial;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, method, args });
    });
  let closed = null;
  return gamePersistence({
    kind: 'sqlite',
    get: async (key) => {
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
  const values = new Map(),
    names = new Map();
  return gamePersistence({
    kind: 'memory',
    get: async (key) => values.get(key) ?? null,
    batch: async (entries) => {
      for (const [key, value] of entries) values.set(key, structuredClone(value));
    },
    names: async () => [...names.values()],
    rename: async (owner, canonical, name, changed) => {
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
