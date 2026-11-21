import type { GameCheckpoint, NameReservation } from '../types/storage.ts';
import { isRecord, errorMessage } from '../types/json.ts';
interface AdminBackend {
  kind: string;
  location: string;
  list: () => Promise<{ keys: string[]; names: NameReservation[] }>;
  get: (kind: string, key: string) => Promise<string | null | undefined>;
  save: (kind: string, key: string, original: string, value: object) => Promise<unknown>;
  close: () => Promise<unknown>;
}
interface AdminStore extends Omit<AdminBackend, 'get' | 'save'> {
  get: (kind: string, key: string) => Promise<string>;
  save: (kind: string, key: string, original: unknown, value: unknown) => Promise<unknown>;
}
interface AdminOptions {
  store?: AdminStore;
  port?: number;
  host?: string;
  username?: string;
  password?: string;
  readOnly?: boolean;
}
import { createServer } from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeUsername } from './usernames.mts';

import type { BinaryLike } from 'crypto';

const defaultFile = fileURLToPath(new URL('./data/world.sqlite', import.meta.url));
const prefix = 'loeberland:v1:';
const fail = (status: number, message: string | undefined) =>
  Object.assign(new Error(message), { status });

function adminAuthorization(username: string | undefined, password: string | undefined) {
  if (
    typeof username !== 'string' ||
    !username ||
    /[:\x00-\x1f\x7f]/.test(username) ||
    typeof password !== 'string' ||
    !password ||
    /[\x00-\x1f\x7f]/.test(password)
  ) {
    throw Error(
      'Set ADMIN_USERNAME and ADMIN_PASSWORD in server/.env (or ADMIN_ENV_FILE) before starting the admin panel. The username cannot contain a colon.',
    );
  }
  const digest = (value: BinaryLike | Buffer<ArrayBuffer>) =>
    createHash('sha256').update(value).digest();
  const expected = digest(username + ':' + password);
  return (header: string | undefined) =>
    typeof header === 'string' &&
    /^Basic [A-Za-z0-9+/]+={0,2}$/i.test(header) &&
    timingSafeEqual(expected, digest(Buffer.from(header.slice(6), 'base64')));
}

function validate(
  kind: string,
  key: string,
  value: unknown,
): asserts value is Record<string, unknown> {
  if (
    !(['state', 'usernames'] satisfies [string, string]).includes(kind) ||
    typeof key !== 'string' ||
    !key
  )
    throw fail(400, 'Choose an existing record.');
  if (!isRecord(value)) throw fail(400, 'The value must be a JSON object.');
  if (kind === 'usernames') {
    const name = normalizeUsername(value.name);
    if (!name.ok) throw fail(400, name.message);
    if (value.owner !== key || value.canonical !== name.canonical || value.name !== name.name)
      throw fail(400, 'Keep owner unchanged and canonical equal to the lowercase name.');
    if (
      typeof value.changed !== 'number' ||
      !Number.isSafeInteger(value.changed) ||
      value.changed < 0
    )
      throw fail(400, 'changed must be a nonnegative integer timestamp in milliseconds.');
    if (Object.keys(value).sort().join(',') !== 'canonical,changed,name,owner')
      throw fail(400, 'Username fields must be owner, canonical, name and changed.');
  }
}

export async function openAdminStore({
  filename = process.env.STATE_FILE || defaultFile,
  redisURL = process.env.REDIS_URL,
} = {}) {
  let adapter: AdminBackend;
  if (redisURL) {
    const { createClient } = await import('redis');
    const client = createClient({
      url: redisURL,
      socket: { connectTimeout: 5000, reconnectStrategy: false },
    });
    client.on('error', (error) => console.error('Admin Redis:', error.message));
    await client.connect();
    const namesKey = prefix + 'names',
      leaseKey = prefix + 'simulation-owner';
    adapter = {
      kind: 'redis',
      location: 'Redis · ' + prefix,
      async list() {
        const names = Object.values(await client.hGetAll(namesKey)).map(
            (value) => JSON.parse(value) as NameReservation,
          ),
          keys = [];
        for await (const batch of client.scanIterator({ MATCH: prefix + '*', COUNT: 200 })) {
          for (const key of batch)
            if (key !== namesKey && key !== leaseKey) keys.push(key.slice(prefix.length));
        }
        return { keys: [...new Set(keys)], names };
      },
      async get(kind: string, key: string) {
        return kind === 'state' ? client.get(prefix + key) : client.hGet(namesKey, key);
      },
      async save(kind: string, key: string, original: string, value: object) {
        const script =
          kind === 'state'
            ? `
                    if redis.call('EXISTS', KEYS[1]) == 1 then return -2 end
                    local current = redis.call('GET', KEYS[2])
                    if not current or current ~= ARGV[1] then return 0 end
                    redis.call('SET', KEYS[2], ARGV[2]); return 1
                `
            : `
                    if redis.call('EXISTS', KEYS[1]) == 1 then return -2 end
                    local current = redis.call('HGET', KEYS[2], ARGV[3])
                    if not current or current ~= ARGV[1] then return 0 end
                    local names = redis.call('HGETALL', KEYS[2])
                    for i = 1, #names, 2 do
                        if names[i] ~= ARGV[3] and cjson.decode(names[i+1]).canonical == ARGV[4] then return -3 end
                    end
                    redis.call('HSET', KEYS[2], ARGV[3], ARGV[2]); return 1
                `;
        const result = await client.eval(script, {
          keys: [leaseKey, kind === 'state' ? prefix + key : namesKey] satisfies [string, string],
          arguments: [
            original,
            JSON.stringify(value),
            key,
            'canonical' in value ? String(value.canonical) : '',
          ],
        });
        if (result === -2)
          throw fail(
            409,
            'Stop the game server first; its Redis ownership lease is still active. Wait up to 15 seconds after stopping.',
          );
        if (result === -3) throw fail(409, 'That username is already taken.');
        if (result !== 1)
          throw fail(409, 'This record changed or was deleted. Reload it before saving.');
      },
      close: () => client.close(),
    };
  } else {
    const { DatabaseSync } = await import('node:sqlite');
    // Refuse a typo instead of silently creating an empty database.
    const { stat } = await import('node:fs/promises');
    if (filename !== ':memory:')
      await stat(filename).catch(() => {
        throw Error(
          'SQLite database not found: ' + filename + '. Set STATE_FILE to the existing database.',
        );
      });
    const db = new DatabaseSync(filename);
    try {
      db.exec('PRAGMA busy_timeout=5000');
      db.prepare('SELECT key, value FROM state LIMIT 0').all();
      db.prepare('SELECT owner, canonical, name, changed FROM usernames LIMIT 0').all();
    } catch (error) {
      db.close();
      throw error;
    }
    adapter = {
      kind: 'sqlite',
      location: filename,
      async list() {
        return {
          keys: db
            .prepare('SELECT key FROM state ORDER BY key')
            .all()
            .map((row) => row.key as string),
          names: db
            .prepare('SELECT owner, canonical, name, changed FROM usernames ORDER BY name')
            .all() as unknown as NameReservation[],
        };
      },
      async get(kind: string, key: string) {
        if (kind === 'state')
          return (
            (db.prepare('SELECT value FROM state WHERE key=?').get(key)?.value as
              string | undefined) ?? null
          );
        const row = db
          .prepare('SELECT owner, canonical, name, changed FROM usernames WHERE owner=?')
          .get(key);
        return row ? JSON.stringify(row) : null;
      },
      async save(kind: string, key: string, original: string, value: object) {
        let result;
        try {
          if (kind === 'state')
            result = db
              .prepare('UPDATE state SET value=? WHERE key=? AND value=?')
              .run(JSON.stringify(value), key, original);
          else {
            const old = JSON.parse(original) as NameReservation,
              row = value as NameReservation;
            result = db
              .prepare(
                'UPDATE usernames SET canonical=?, name=?, changed=? WHERE owner=? AND canonical=? AND name=? AND changed=?',
              )
              .run(row.canonical, row.name, row.changed, key, old.canonical, old.name, old.changed);
          }
        } catch (error) {
          if (errorMessage(error).includes('UNIQUE constraint failed'))
            throw fail(409, 'That username is already taken.');
          throw error;
        }
        if (Number(result.changes) !== 1)
          throw fail(409, 'This record changed or was deleted. Reload it before saving.');
      },
      close: async () => db.close(),
    };
  }
  // Keep the editor's player/world view after migration. Legacy keys are
  // deliberately ignored: saving one would not change the restored game.
  const registry = JSON.parse((await adapter.get('state', 'checkpoint:games')) || 'null');
  if (registry?.world) {
    const backend = adapter,
      key = 'checkpoint:game:world';
    const read = async () => {
      const raw = await backend.get('state', key);
      if (!raw) throw fail(409, 'World checkpoint is missing.');
      return { raw, document: JSON.parse(raw) as GameCheckpoint };
    };
    const record = (document: GameCheckpoint, kind: string, id: string) =>
      kind === 'state'
        ? document.records.find(([key]) => key === id)?.[1]
        : document.names.find((row) => row.owner === id);
    adapter = {
      ...backend,
      async list() {
        const { document } = await read();
        return { keys: document.records.map(([key]) => key).sort(), names: document.names };
      },
      async get(kind: string, id: string) {
        const { document } = await read(),
          value = record(document, kind, id);
        return value === undefined ? null : JSON.stringify(value);
      },
      async save(kind: string, id: string, original: string, value: object) {
        const { raw, document } = await read();
        if (JSON.stringify(record(document, kind, id)) !== original)
          throw fail(409, 'This record changed or was deleted. Reload it before saving.');
        if (kind === 'usernames') {
          const rowValue = value as NameReservation;
          if (
            document.names.some((row) => row.owner !== id && row.canonical === rowValue.canonical)
          )
            throw fail(409, 'That username is already taken.');
          document.names = document.names.map((row) => (row.owner === id ? rowValue : row));
        } else
          document.records = document.records.map(([key, entry]) => [
            key,
            key === id ? value : entry,
          ]);
        if (document.version >= Number.MAX_SAFE_INTEGER)
          throw fail(409, 'Game state version exhausted.');
        document.version++;
        document.savedAt = Date.now();
        await backend.save('state', key, raw, document);
      },
    };
  }
  return {
    ...adapter,
    async get(kind: string, key: string) {
      if (
        !(['state', 'usernames'] satisfies [string, string]).includes(kind) ||
        typeof key !== 'string' ||
        !key
      )
        throw fail(400, 'Choose an existing record.');
      if (
        adapter.kind === 'redis' &&
        kind === 'state' &&
        (['names', 'simulation-owner'] satisfies [string, string]).includes(key)
      )
        throw fail(400, 'This is an internal Redis key.');
      const raw = await adapter.get(kind, key);
      if (raw == null) throw fail(404, 'Record not found.');
      return raw;
    },
    async save(kind: string, key: string, original: unknown, value: unknown) {
      validate(kind, key, value);
      if (typeof original !== 'string') throw fail(400, 'Reload the record before saving.');
      if (
        adapter.kind === 'redis' &&
        kind === 'state' &&
        (['names', 'simulation-owner'] satisfies [string, string]).includes(key)
      )
        throw fail(400, 'This is an internal Redis key.');
      await adapter.save(kind, key, original, value);
    },
  };
}

export async function startAdmin({
  store: providedStore,
  port = Number(process.env.ADMIN_PORT || 8788),
  host = process.env.ADMIN_HOST || '127.0.0.1',
  username = process.env.ADMIN_USERNAME,
  password = process.env.ADMIN_PASSWORD,
  readOnly = process.env.ADMIN_READ_ONLY === '1',
}: AdminOptions = {}) {
  const authorized = adminAuthorization(username, password);
  const store = providedStore || (await openAdminStore());
  const token = randomBytes(32).toString('hex');
  const html = (await readFile(new URL('./admin.html', import.meta.url), 'utf8'))
    .replace('__ADMIN_TOKEN__', token)
    .replace('__ADMIN_READ_ONLY__', JSON.stringify(readOnly))
    .replace(
      '__ADMIN_NOTICE__',
      readOnly
        ? 'Read-only inspection. The game can keep running. Stop it before opening an editing session.'
        : 'Stop the game server before editing. After saving, restart the game server to load your changes.',
    );
  let origin = '';
  const server = createServer(async (req, res) => {
    const send = (status: number, value: unknown, type = 'application/json') => {
      res.writeHead(status, {
        'Content-Type': type + '; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
      });
      res.end(type === 'application/json' ? JSON.stringify(value) : String(value));
    };
    try {
      if (!authorized(req.headers.authorization)) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Explore SF admin", charset="UTF-8"');
        send(401, { error: 'Admin authentication required.' });
        return;
      }
      if (
        req.headers.host !== new URL(origin).host ||
        (req.headers.origin && req.headers.origin !== origin) ||
        req.headers['sec-fetch-site'] === 'cross-site'
      )
        throw fail(403, 'Open the editor using its printed local URL.');
      const url = new URL(req.url || '/', origin);
      if (req.method === 'GET' && url.pathname === '/') {
        send(200, html, 'text/html');
        return;
      }
      if (req.headers['x-admin-token'] !== token) throw fail(403, 'Reload the editor page.');
      if (req.method === 'GET' && url.pathname === '/api/records') {
        const { keys, names } = await store.list(),
          owners = new Map(names.map((row) => [row.owner, row.name]));
        const records = keys.map((key) => ({
          kind: 'state',
          key,
          label: key.startsWith('player:') ? owners.get(key.slice(7)) || 'Unnamed player' : key,
        }));
        records.push(
          ...names.map((row) => ({ kind: 'usernames', key: row.owner, label: row.name })),
        );
        send(200, { backend: store.kind, location: store.location, readOnly, records });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/record') {
        send(200, {
          raw: await store.get(
            url.searchParams.get('kind') || '',
            url.searchParams.get('key') || '',
          ),
        });
        return;
      }
      if (req.method === 'PUT' && url.pathname === '/api/record') {
        if (readOnly)
          throw fail(
            403,
            'This panel is read-only. Stop the game and open an editing session to save changes.',
          );
        if (!req.headers['content-type']?.startsWith('application/json'))
          throw fail(415, 'Send JSON.');
        const chunks: Buffer[] = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 16 * 1024 * 1024) throw fail(413, 'Record exceeds the 16 MB editor limit.');
          chunks.push(chunk);
        }
        let body: unknown;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          throw fail(400, 'Invalid JSON.');
        }
        if (!isRecord(body)) throw fail(400, 'Send a record object.');
        if (typeof body.kind !== 'string' || typeof body.key !== 'string')
          throw fail(400, 'Choose an existing record.');
        await store.save(body.kind, body.key, body.original, body.value);
        send(200, { raw: JSON.stringify(body.value) });
        return;
      }
      throw fail(404, 'Not found.');
    } catch (error) {
      send(isRecord(error) && typeof error.status === 'number' ? error.status : 500, {
        error: errorMessage(error),
      });
    }
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
  } catch (error) {
    await store.close();
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Admin server did not bind a TCP port.');
  origin = 'http://127.0.0.1:' + address.port;
  return {
    server,
    origin,
    token,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await store.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--help')) {
    console.log(
      'Usage: node server/admin.mjs [--check-auth]\n\nLoads server/.env automatically; ADMIN_ENV_FILE selects another env file.\nADMIN_USERNAME and ADMIN_PASSWORD are required for HTTP Basic Auth.\nADMIN_READ_ONLY=1 allows inspection without writes while the game runs.\nStop the game server before editing; restart it to load changes.\nSTATE_FILE selects an existing SQLite database (default: server/data/world.sqlite).\nREDIS_URL selects Redis instead. ADMIN_PORT defaults to 8788.\nADMIN_HOST defaults to 127.0.0.1; use 0.0.0.0 inside a container with a loopback-only published port.',
    );
  } else {
    try {
      try {
        process.loadEnvFile(process.env.ADMIN_ENV_FILE || new URL('./.env', import.meta.url));
      } catch (error) {
        if (!isRecord(error) || error.code !== 'ENOENT' || process.env.ADMIN_ENV_FILE) throw error;
      }
      if (process.argv.includes('--check-auth')) {
        adminAuthorization(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        console.log('Admin authentication is configured.');
        process.exit(0);
      }
      const admin = await startAdmin();
      console.log(
        'Database editor: ' +
          admin.origin +
          '\nHTTP Basic Auth is required.\n' +
          (process.env.ADMIN_READ_ONLY === '1'
            ? 'Read-only inspection; the game can keep running.'
            : 'Stop the game server before editing. Restart it after saving to load changes.') +
          '\nPress Ctrl+C to close the editor.',
      );
      let closing = false;
      const close = async () => {
        if (closing) return;
        closing = true;
        try {
          await admin.close();
        } catch (error) {
          console.error(errorMessage(error));
          process.exitCode = 1;
        }
      };
      process.on('SIGINT', close);
      process.on('SIGTERM', close);
    } catch (error) {
      console.error(errorMessage(error));
      process.exitCode = 1;
    }
  }
}
