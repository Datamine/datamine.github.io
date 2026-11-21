import type { SQLiteRequest } from '../types/sqlite.ts';
import { requiredValue } from '../types/assert.ts';
import { errorMessage } from '../types/json.ts';
import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

if (workerData.filename !== ':memory:')
  mkdirSync(dirname(workerData.filename), { recursive: true });
const port = requiredValue(parentPort, 'SQLite persistence must run in a worker.');
const db = new DatabaseSync(workerData.filename);
db.exec(
  'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS usernames (owner TEXT PRIMARY KEY, canonical TEXT UNIQUE NOT NULL, name TEXT NOT NULL, changed INTEGER NOT NULL)',
);
const get = db.prepare('SELECT value FROM state WHERE key=?'),
  set = db.prepare(
    'INSERT INTO state(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
  );
port.on('message', ({ id, method, args }: SQLiteRequest) => {
  try {
    let result;
    if (method === 'get') result = get.get(args[0])?.value ?? null;
    else if (method === 'legacy')
      result = db
        .prepare("SELECT key,value FROM state WHERE key='world' OR key LIKE 'player:%'")
        .all();
    else if (method === 'batch') {
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const [key, value] of args[0]) set.run(key, value);
        db.exec('COMMIT');
        result = true;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    } else if (method === 'names') result = db.prepare('SELECT * FROM usernames').all();
    else if (method === 'rename') {
      db.prepare(
        'INSERT INTO usernames(owner,canonical,name,changed) VALUES (?,?,?,?) ON CONFLICT(owner) DO UPDATE SET canonical=excluded.canonical,name=excluded.name,changed=excluded.changed',
      ).run(...args);
      result = true;
    } else if (method === 'close') {
      db.close();
      result = true;
    } else throw Error('Unknown persistence operation');
    port.postMessage({ id, result });
  } catch (error) {
    port.postMessage({ id, error: errorMessage(error) });
  }
});
