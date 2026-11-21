import { isSafeInteger, isRecord, errorMessage } from '../types/json.ts';
import { DatabaseSync } from 'node:sqlite';
import { chmod, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';

type SnapshotRows = [string, ...[string, string][]];
interface BackupOptions {
  redisURL?: string;
  filename?: string;
}
// Read the registry and every checkpoint in one atomic, read-only Redis script.
// Keep documents as strings so Lua's JSON codec never rounds stored numbers.
const snapshotScript = `
local registry = redis.call('GET', KEYS[1])
if not registry then return redis.error_reply('No game checkpoints found; refusing an empty backup') end
local result = {registry}
for id, status in pairs(cjson.decode(registry)) do
    local document = redis.call('GET', ARGV[1] .. id)
    if not document then return redis.error_reply('Missing checkpoint for ' .. id) end
    table.insert(result, {id, document})
end
return result
`;

export function validateSnapshot(input: unknown): SnapshotRows {
  if (!Array.isArray(input) || typeof input[0] !== 'string')
    throw Error('Invalid checkpoint registry');
  for (const row of input.slice(1))
    if (
      !Array.isArray(row) ||
      row.length !== 2 ||
      typeof row[0] !== 'string' ||
      typeof row[1] !== 'string'
    )
      throw Error('Invalid checkpoint row');
  // Every tuple has been validated before parsing its checkpoint document.
  const rows = input as SnapshotRows;
  const registry: unknown = JSON.parse(rows[0]);
  if (!isRecord(registry) || !Object.keys(registry).length)
    throw Error('No game checkpoints found; refusing an empty backup');
  const seen = new Set<string>();
  for (const [id, raw] of rows.slice(1) as [string, string][]) {
    const game: unknown = JSON.parse(raw);
    if (
      !isRecord(game) ||
      seen.has(id) ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(id) ||
      game.id !== id ||
      game.schema !== 1 ||
      (game.status !== 'active' && game.status !== 'completed') ||
      registry[id] !== game.status ||
      !isSafeInteger(game.version) ||
      game.version < 1 ||
      !Array.isArray(game.records) ||
      !Array.isArray(game.names)
    )
      throw Error('Invalid checkpoint for ' + id);
    seen.add(id);
  }
  if (seen.size !== Object.keys(registry).length) throw Error('Incomplete checkpoint registry');
  return rows;
}

export async function backupRedis({
  redisURL = process.env.REDIS_URL,
  filename,
}: BackupOptions = {}) {
  if (!redisURL) throw Error('REDIS_URL is required');
  if (!filename) throw Error('An output SQLite filename is required');
  const client = createClient({
    url: redisURL,
    disableOfflineQueue: true,
    socket: { connectTimeout: 10000, reconnectStrategy: false },
  });
  client.on('error', (error) => console.error('Backup Redis:', error.message));
  let rows;
  try {
    await client.connect();
    rows = validateSnapshot(
      await client.evalRo(snapshotScript, {
        keys: ['loeberland:v1:checkpoint:games'],
        arguments: ['loeberland:v1:checkpoint:game:'],
      }),
    );
  } finally {
    if (client.isOpen) client.destroy();
  }
  const output = resolve(filename),
    temporary = output + '.' + randomUUID() + '.tmp';
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  let db;
  try {
    db = new DatabaseSync(temporary);
    await chmod(temporary, 0o600);
    // A single standalone file, with no WAL sidecar needed for recovery.
    db.exec(
      'PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; BEGIN IMMEDIATE; CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE usernames (owner TEXT PRIMARY KEY, canonical TEXT UNIQUE NOT NULL, name TEXT NOT NULL, changed INTEGER NOT NULL); CREATE TABLE backup_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
    const insert = db.prepare('INSERT INTO state(key,value) VALUES (?,?)');
    insert.run('checkpoint:games', rows[0]);
    for (const [id, raw] of rows.slice(1) as [string, string][])
      insert.run('checkpoint:game:' + id, raw);
    db.prepare('INSERT INTO backup_metadata(key,value) VALUES (?,?)').run(
      'created_at',
      new Date().toISOString(),
    );
    db.exec('COMMIT');
    if (db.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok')
      throw Error('SQLite integrity check failed');
    db.close();
    db = null;
    await rename(temporary, output);
    return { filename: output, games: rows.length - 1 };
  } finally {
    db?.close();
    await rm(temporary, { force: true });
  }
}

export async function restoreRedis({
  redisURL = process.env.REDIS_URL,
  filename,
}: BackupOptions = {}) {
  if (!redisURL || !filename) throw Error('REDIS_URL and an input SQLite filename are required');
  const db = new DatabaseSync(resolve(filename), { readOnly: true });
  let rows;
  try {
    if (db.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok')
      throw Error('SQLite integrity check failed');
    const state = db.prepare('SELECT key,value FROM state').all() as {
        key: string;
        value: string;
      }[],
      registry = state.find((row) => row.key === 'checkpoint:games');
    rows = validateSnapshot([
      registry?.value,
      ...state
        .filter((row) => row.key.startsWith('checkpoint:game:'))
        .map((row) => [row.key.slice('checkpoint:game:'.length), row.value]),
    ]);
  } finally {
    db.close();
  }
  const entries: [string, string][] = [
    ['loeberland:v1:checkpoint:games', rows[0]],
    ...(rows.slice(1) as [string, string][]).map(([id, raw]): [string, string] => [
      'loeberland:v1:checkpoint:game:' + id,
      raw,
    ]),
  ];
  const client = createClient({
    url: redisURL,
    disableOfflineQueue: true,
    socket: { connectTimeout: 10000, reconnectStrategy: false },
  });
  client.on('error', (error) => console.error('Restore Redis:', error.message));
  try {
    await client.connect();
    await client.eval(
      `
            if redis.call('DBSIZE') ~= 0 then return redis.error_reply('Restore requires an empty Redis database; refusing to overwrite existing state') end
            for i, key in ipairs(KEYS) do redis.call('SET', key, ARGV[i]) end
            return 1
        `,
      { keys: entries.map(([key]) => key), arguments: entries.map(([, value]) => value) },
    );
    return { filename: resolve(filename), games: rows.length - 1 };
  } finally {
    if (client.isOpen) client.destroy();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (
    process.argv.length !== 4 ||
    !(['--output', '--restore'] satisfies [string, string]).includes(process.argv[2])
  ) {
    console.error(
      'Usage: REDIS_URL=redis://localhost:6379 node backup.mjs --output /path/world.sqlite\n       REDIS_URL=redis://localhost:6379 node backup.mjs --restore /path/world.sqlite (empty Redis only)',
    );
    process.exitCode = 2;
  } else {
    process.umask(0o077);
    try {
      console.log(
        JSON.stringify(
          await (process.argv[2] === '--restore' ? restoreRedis : backupRedis)({
            filename: process.argv[3],
          }),
        ),
      );
    } catch (error) {
      console.error('Backup/restore failed:', errorMessage(error));
      process.exitCode = 1;
    }
  }
}
