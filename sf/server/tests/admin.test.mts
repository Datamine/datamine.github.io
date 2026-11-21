import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer as createNetServer, connect } from 'node:net';
import { request } from 'node:http';
import { openAdminStore, startAdmin } from '../admin.mts';
import { fileURLToPath } from 'node:url';
import type { RedisClientType } from 'redis';

const credentials = { username: 'test-admin', password: 'a-long-test-password:with-colon' };
const authorization =
  'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');

async function fixture(t: test.TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'loeberland-admin-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filename = join(dir, 'world.sqlite'),
    db = new DatabaseSync(filename);
  db.exec(
    'CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE usernames (owner TEXT PRIMARY KEY, canonical TEXT UNIQUE NOT NULL, name TEXT NOT NULL, changed INTEGER NOT NULL)',
  );
  const set = db.prepare('INSERT INTO state VALUES (?, ?)');
  set.run('world', '{"serial":2,"shared":{}}');
  set.run('player:alice', '{"inventory":{"coins":5},"privateState":{}}');
  db.prepare('INSERT INTO usernames VALUES (?, ?, ?, ?)').run('alice', 'baypilot', 'BayPilot', 123);
  db.prepare('INSERT INTO usernames VALUES (?, ?, ?, ?)').run(
    'bob',
    'coastwalker',
    'CoastWalker',
    456,
  );
  db.close();
  return { filename };
}

test('SQLite editor persists state, rejects stale saves and preserves username ownership/uniqueness', async (t) => {
  const { filename } = await fixture(t),
    store = await openAdminStore({ filename, redisURL: '' });
  t.after(() => store.close());
  assert.equal(store.kind, 'sqlite');
  const list = await store.list();
  assert.deepEqual(list.keys, ['player:alice', 'world'] satisfies [string, string]);
  assert.equal(list.names[0].name, 'BayPilot');
  const raw = await store.get('state', 'player:alice');
  await store.save('state', 'player:alice', raw, { inventory: { coins: 99 }, privateState: {} });
  await assert.rejects(
    store.save('state', 'player:alice', raw, { inventory: { coins: 0 } }),
    /changed or was deleted/,
  );
  await assert.rejects(store.save('state', 'missing', '{}', {}), /changed or was deleted/);
  await assert.rejects(store.save('state', 'world', '{}', null), /JSON object/);
  await assert.rejects(store.get('invalid', 'world'), /existing record/);
  await assert.rejects(store.get('state', 'missing'), /not found/);
  const old = await store.get('usernames', 'alice');
  const row = JSON.parse(old);
  await assert.rejects(
    store.save('usernames', 'alice', old, { ...row, owner: 'bob' }),
    /owner unchanged/,
  );
  await assert.rejects(
    store.save('usernames', 'alice', old, {
      ...row,
      name: 'CoastWalker',
      canonical: 'coastwalker',
    }),
    /already taken/,
  );
  await assert.rejects(store.save('usernames', 'alice', old, { ...row, changed: -1 }), /timestamp/);
  await store.save('usernames', 'alice', old, {
    ...row,
    name: 'HarborPilot',
    canonical: 'harborpilot',
  });
  await assert.rejects(store.save('usernames', 'alice', old, row), /changed or was deleted/);
  const persisted = new DatabaseSync(filename, { readOnly: true });
  try {
    assert.equal(
      JSON.parse(
        String(
          requiredFixture(
            requiredFixture(
              persisted.prepare('SELECT value FROM state WHERE key=?').get('player:alice'),
            ).value,
          ),
        ),
      ).inventory.coins,
      99,
    );
    assert.equal(
      requiredFixture(persisted.prepare('SELECT name FROM usernames WHERE owner=?').get('alice'))
        .name,
      'HarborPilot',
    );
  } finally {
    persisted.close();
  }
});

test('SQLite editor refuses to create a database when the path is wrong', async (t) => {
  const { filename } = await fixture(t),
    missing = filename + '-missing';
  await assert.rejects(openAdminStore({ filename: missing, redisURL: '' }), /database not found/);
  await assert.rejects(stat(missing), { code: 'ENOENT' });
});

test('editor reads and atomically edits checkpoint-backed players and names instead of stale legacy records', async (t) => {
  const { filename } = await fixture(t),
    db = new DatabaseSync(filename);
  const document = {
    schema: 1,
    id: 'world',
    status: 'active',
    version: 8,
    records: [
      ['world', { serial: 9 }],
      ['player:alice', { inventory: { coins: 20 } }],
    ],
    names: [
      { owner: 'alice', canonical: 'newpilot', name: 'NewPilot', changed: 200 },
      { owner: 'bob', canonical: 'bob', name: 'Bob', changed: 200 },
    ],
  };
  const set = db.prepare('INSERT INTO state VALUES (?,?)');
  set.run('checkpoint:games', '{"world":"active"}');
  set.run('checkpoint:game:world', JSON.stringify(document));
  db.close();
  const store = await openAdminStore({ filename, redisURL: '' });
  t.after(() => store.close());
  assert.deepEqual((await store.list()).keys, ['player:alice', 'world'] satisfies [string, string]);
  assert.equal((await store.list()).names[0].name, 'NewPilot');
  const raw = await store.get('state', 'player:alice');
  assert.equal(JSON.parse(raw).inventory.coins, 20);
  await store.save('state', 'player:alice', raw, { inventory: { coins: 40 } });
  await assert.rejects(
    store.save('state', 'player:alice', raw, { inventory: { coins: 0 } }),
    /changed or was deleted/,
  );
  const name = await store.get('usernames', 'alice'),
    row = JSON.parse(name);
  await assert.rejects(
    store.save('usernames', 'alice', name, { ...row, name: 'Bob', canonical: 'bob' }),
    /already taken/,
  );
  await store.save('usernames', 'alice', name, {
    ...row,
    name: 'RiverPilot',
    canonical: 'riverpilot',
  });
  const verify = new DatabaseSync(filename, { readOnly: true });
  try {
    const saved = JSON.parse(
      String(
        requiredFixture(
          requiredFixture(
            verify.prepare('SELECT value FROM state WHERE key=?').get('checkpoint:game:world'),
          ).value,
        ),
      ),
    );
    assert.equal(saved.version, 10);
    assert.equal(saved.records[1][1].inventory.coins, 40);
    assert.equal(saved.names[0].name, 'RiverPilot');
    assert.equal(
      JSON.parse(
        String(
          requiredFixture(
            requiredFixture(
              verify.prepare('SELECT value FROM state WHERE key=?').get('player:alice'),
            ).value,
          ),
        ),
      ).inventory.coins,
      5,
    );
  } finally {
    verify.close();
  }
});

test('HTTP editor lists, reads and saves records, and rejects unauthorized or invalid requests', async (t) => {
  const { filename } = await fixture(t),
    store = await openAdminStore({ filename, redisURL: '' });
  const admin = await startAdmin({ store, port: 0, ...credentials });
  t.after(() => admin.close());
  const headers = {
    Authorization: authorization,
    'X-Admin-Token': admin.token,
    'Content-Type': 'application/json',
  };
  for (const path of ['/', '/api/records', '/api/record?kind=state&key=world'] satisfies [
    string,
    string,
    string,
  ]) {
    const denied = await fetch(admin.origin + path);
    assert.equal(denied.status, 401);
    assert.match(requiredFixture(denied.headers.get('www-authenticate')), /^Basic realm=/);
    assert.equal(denied.headers.get('cache-control'), 'no-store');
    assert.ok(!(await denied.text()).includes(admin.token));
  }
  for (const value of [
    'Bearer bad',
    'Basic !!!',
    'Basic ' + Buffer.from('test-admin:wrong').toString('base64'),
    'Basic ' + Buffer.from('wrong:' + credentials.password).toString('base64'),
  ] satisfies [string, string, string, string]) {
    assert.equal((await fetch(admin.origin, { headers: { Authorization: value } })).status, 401);
  }
  const page = await fetch(admin.origin, { headers: { Authorization: authorization } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Loeberland database editor/);
  const records = await (await fetch(admin.origin + '/api/records', { headers })).json();
  assert.equal(
    records.records.find((row: { key: string }) => row.key === 'player:alice').label,
    'BayPilot',
  );
  assert.equal(
    (await fetch(admin.origin + '/api/records', { headers: { Authorization: authorization } }))
      .status,
    403,
  );
  assert.equal(
    (
      await fetch(admin.origin + '/api/records', {
        headers: { ...headers, Origin: 'https://example.com' },
      })
    ).status,
    403,
  );
  // fetch normalizes Host on recent Node versions; send the actual header.
  const wrongHost = await new Promise((resolve, reject) => {
    const req = request(
      admin.origin + '/api/records',
      { headers: { ...headers, Host: 'example.com' } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(wrongHost, 403);
  assert.equal(
    (
      await fetch(admin.origin + '/api/records', {
        headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' },
      })
    ).status,
    403,
  );
  const url = admin.origin + '/api/record';
  const { raw } = await (await fetch(url + '?kind=state&key=world', { headers })).json();
  const body = JSON.stringify({
    kind: 'state',
    key: 'world',
    original: raw,
    value: { serial: 3, shared: {} },
  });
  assert.equal(
    (
      await fetch(url, {
        method: 'PUT',
        headers: { 'X-Admin-Token': admin.token, 'Content-Type': 'application/json' },
        body,
      })
    ).status,
    401,
  );
  assert.equal(await store.get('state', 'world'), raw);
  const saved = await fetch(url, { method: 'PUT', headers, body });
  assert.equal(saved.status, 200);
  assert.equal(JSON.parse((await saved.json()).raw).serial, 3);
  assert.equal((await fetch(url, { method: 'PUT', headers, body })).status, 409);
  assert.equal((await fetch(url, { method: 'PUT', headers, body: '{oops' })).status, 400);
  assert.equal((await fetch(url, { method: 'PUT', headers, body: 'null' })).status, 400);
  assert.equal(
    (
      await fetch(url, {
        method: 'PUT',
        headers: { Authorization: authorization, 'X-Admin-Token': admin.token },
        body,
      })
    ).status,
    415,
  );
  assert.equal((await fetch(url + '?kind=state&key=missing', { headers })).status, 404);
});

test('admin fails closed before accessing storage when credentials are missing or invalid', async () => {
  const store = {
    kind: 'fixture',
    location: 'fixture',
    get: async () => '',
    save: async () => {},
    close: async () => {},
    async list() {
      throw Error('Storage must not be accessed');
    },
  };
  for (const invalid of [
    { username: '', password: 'secret' },
    { username: 'admin', password: '' },
    { username: 'bad:name', password: 'secret' },
    { username: 'admin', password: 'bad\npassword' },
  ]) {
    await assert.rejects(
      startAdmin({ store, port: 0, ...invalid }),
      /ADMIN_USERNAME and ADMIN_PASSWORD/,
    );
  }
});

test('read-only admin permits inspection but rejects authenticated writes', async (t) => {
  const { filename } = await fixture(t),
    store = await openAdminStore({ filename, redisURL: '' });
  const admin = await startAdmin({ store, port: 0, readOnly: true, ...credentials });
  t.after(() => admin.close());
  const headers = {
    Authorization: authorization,
    'X-Admin-Token': admin.token,
    'Content-Type': 'application/json',
  };
  const records = await (await fetch(admin.origin + '/api/records', { headers })).json();
  assert.equal(records.readOnly, true);
  const raw = await store.get('state', 'world');
  const response = await fetch(admin.origin + '/api/record', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ kind: 'state', key: 'world', original: raw, value: { serial: 99 } }),
  });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /read-only/);
  assert.equal(await store.get('state', 'world'), raw);
  const html = await (
    await fetch(admin.origin, { headers: { Authorization: authorization } })
  ).text();
  assert.match(html, /\breadOnly\s*=\s*true\b/);
  assert.match(html, /Read-only inspection/);
});

test('admin CLI loads a selected env file, honors environment overrides and validates without opening storage', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'loeberland-admin-env-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filename = join(dir, '.env');
  await writeFile(
    filename,
    'ADMIN_USERNAME=local-admin\nADMIN_PASSWORD="test-password:#with-specials"\n',
  );
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ADMIN_ENV_FILE: filename,
    STATE_FILE: join(dir, 'does-not-exist.sqlite'),
  };
  delete env.ADMIN_USERNAME;
  delete env.ADMIN_PASSWORD;
  const cli = fileURLToPath(new URL('../admin.mts', import.meta.url));
  const valid = spawnSync(
    process.execPath,
    [
      '--import',
      new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
      cli,
      '--check-auth',
    ] satisfies [string, string, string, string],
    { env, encoding: 'utf8' },
  );
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /authentication is configured/);
  assert.ok(!valid.stdout.includes('test-password'));
  const invalid = spawnSync(
    process.execPath,
    [
      '--import',
      new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
      cli,
      '--check-auth',
    ] satisfies [string, string, string, string],
    {
      env: { ...env, ADMIN_PASSWORD: '' },
      encoding: 'utf8',
    },
  );
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /ADMIN_USERNAME and ADMIN_PASSWORD/);
  const missing = spawnSync(
    process.execPath,
    [
      '--import',
      new URL('../../node_modules/tsx/dist/loader.mjs', import.meta.url).href,
      cli,
      '--check-auth',
    ] satisfies [string, string, string, string],
    {
      env: { ...env, ADMIN_ENV_FILE: join(dir, 'missing.env') },
      encoding: 'utf8',
    },
  );
  assert.equal(missing.status, 1);
});

test(
  'Redis editor saves existing JSON and names but refuses stale saves, duplicate names and active simulation leases',
  { skip: process.env.RUN_REDIS_TESTS !== '1' },
  async (t) => {
    const { createClient } = await import('redis');
    const dir = await mkdtemp(join(tmpdir(), 'loeberland-admin-redis-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const probe = createNetServer();
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', () => resolve(undefined)));
    const port = (requiredFixture(probe.address()) as import('node:net').AddressInfo).port;
    await new Promise((resolve) => probe.close(resolve));
    const child = spawn(
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
      ] satisfies [string, string, string, string, string, string, string, string, string, string],
      { stdio: 'ignore' },
    );
    let rawClient: RedisClientType<{}, {}, {}, 3, {}>,
      store: Awaited<ReturnType<typeof openAdminStore>>;
    t.after(async () => {
      await store?.close();
      await rawClient?.close();
      child.kill('SIGTERM');
      await new Promise((resolve) =>
        child.exitCode !== null ? resolve(undefined) : child.once('exit', resolve),
      );
    });
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
    const redisURL = 'redis://127.0.0.1:' + port;
    rawClient = createClient({ url: redisURL });
    await rawClient.connect();
    const prefix = 'loeberland:v1:',
      alice = { owner: 'alice', canonical: 'baypilot', name: 'BayPilot', changed: 1 };
    await rawClient.set(prefix + 'world', '{"serial":1}');
    await rawClient.hSet(prefix + 'names', 'alice', JSON.stringify(alice));
    await rawClient.hSet(
      prefix + 'names',
      'bob',
      JSON.stringify({ owner: 'bob', canonical: 'coastwalker', name: 'CoastWalker', changed: 1 }),
    );
    store = await openAdminStore({ redisURL });
    assert.deepEqual((await store.list()).keys, ['world']);
    const original = await store.get('state', 'world');
    await rawClient.set(prefix + 'simulation-owner', 'active');
    await assert.rejects(
      store.save('state', 'world', original, { serial: 2 }),
      /Stop the game server/,
    );
    const nameRaw = await store.get('usernames', 'alice');
    await assert.rejects(store.save('usernames', 'alice', nameRaw, alice), /Stop the game server/);
    assert.deepEqual((await store.list()).keys, ['world']);
    await rawClient.del(prefix + 'simulation-owner');
    await store.save('state', 'world', original, { serial: 2 });
    await assert.rejects(
      store.save('state', 'world', original, { serial: 3 }),
      /changed or was deleted/,
    );
    await assert.rejects(store.save('state', 'simulation-owner', '{}', {}), /internal Redis key/);
    await assert.rejects(
      store.save('usernames', 'alice', nameRaw, {
        ...alice,
        canonical: 'coastwalker',
        name: 'CoastWalker',
      }),
      /already taken/,
    );
    await store.save('usernames', 'alice', nameRaw, {
      ...alice,
      canonical: 'harborpilot',
      name: 'HarborPilot',
    });
    await assert.rejects(
      store.save('usernames', 'alice', nameRaw, alice),
      /changed or was deleted/,
    );
    assert.equal(
      JSON.parse(requiredFixture(await rawClient.hGet(prefix + 'names', 'alice'))).name,
      'HarborPilot',
    );
    assert.equal(JSON.parse(requiredFixture(await rawClient.get(prefix + 'world'))).serial, 2);
  },
);
