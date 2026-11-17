import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer as createNetServer, connect} from 'node:net';
import {openAdminStore, startAdmin} from '../admin.mjs';

async function fixture(t) {
    const dir = await mkdtemp(join(tmpdir(), 'loeberland-admin-'));
    t.after(() => rm(dir, {recursive: true, force: true}));
    const filename = join(dir, 'world.sqlite'), db = new DatabaseSync(filename);
    db.exec('CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE usernames (owner TEXT PRIMARY KEY, canonical TEXT UNIQUE NOT NULL, name TEXT NOT NULL, changed INTEGER NOT NULL)');
    const set = db.prepare('INSERT INTO state VALUES (?, ?)');
    set.run('world', '{"serial":2,"shared":{}}');
    set.run('player:alice', '{"inventory":{"coins":5},"privateState":{}}');
    db.prepare('INSERT INTO usernames VALUES (?, ?, ?, ?)').run('alice', 'baypilot', 'BayPilot', 123);
    db.prepare('INSERT INTO usernames VALUES (?, ?, ?, ?)').run('bob', 'coastwalker', 'CoastWalker', 456);
    db.close();
    return {filename};
}

test('SQLite editor persists state, rejects stale saves and preserves username ownership/uniqueness', async t => {
    const {filename} = await fixture(t), store = await openAdminStore({filename, redisURL: ''});
    t.after(() => store.close());
    assert.equal(store.kind, 'sqlite');
    const list = await store.list();
    assert.deepEqual(list.keys, ['player:alice', 'world']);
    assert.equal(list.names[0].name, 'BayPilot');
    const raw = await store.get('state', 'player:alice');
    await store.save('state', 'player:alice', raw, {inventory: {coins: 99}, privateState: {}});
    await assert.rejects(store.save('state', 'player:alice', raw, {inventory: {coins: 0}}), /changed or was deleted/);
    await assert.rejects(store.save('state', 'missing', '{}', {}), /changed or was deleted/);
    await assert.rejects(store.save('state', 'world', '{}', null), /JSON object/);
    await assert.rejects(store.get('invalid', 'world'), /existing record/);
    await assert.rejects(store.get('state', 'missing'), /not found/);
    const old = await store.get('usernames', 'alice');
    const row = JSON.parse(old);
    await assert.rejects(store.save('usernames', 'alice', old, {...row, owner: 'bob'}), /owner unchanged/);
    await assert.rejects(store.save('usernames', 'alice', old, {...row, name: 'CoastWalker', canonical: 'coastwalker'}), /already taken/);
    await assert.rejects(store.save('usernames', 'alice', old, {...row, changed: -1}), /timestamp/);
    await store.save('usernames', 'alice', old, {...row, name: 'HarborPilot', canonical: 'harborpilot'});
    await assert.rejects(store.save('usernames', 'alice', old, row), /changed or was deleted/);
    const persisted = new DatabaseSync(filename, {readOnly: true});
    try {
        assert.equal(JSON.parse(persisted.prepare('SELECT value FROM state WHERE key=?').get('player:alice').value).inventory.coins, 99);
        assert.equal(persisted.prepare('SELECT name FROM usernames WHERE owner=?').get('alice').name, 'HarborPilot');
    } finally { persisted.close(); }
});

test('SQLite editor refuses to create a database when the path is wrong', async t => {
    const {filename} = await fixture(t), missing = filename + '-missing';
    await assert.rejects(openAdminStore({filename: missing, redisURL: ''}), /database not found/);
    await assert.rejects(stat(missing), {code: 'ENOENT'});
});

test('HTTP editor lists, reads and saves records, and rejects unauthorized or invalid requests', async t => {
    const {filename} = await fixture(t), store = await openAdminStore({filename, redisURL: ''});
    const admin = await startAdmin({store, port: 0});
    t.after(() => admin.close());
    const headers = {'X-Admin-Token': admin.token, 'Content-Type': 'application/json'};
    const page = await fetch(admin.origin);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Loeberland database editor/);
    const records = await (await fetch(admin.origin + '/api/records', {headers})).json();
    assert.equal(records.records.find(row => row.key === 'player:alice').label, 'BayPilot');
    assert.equal((await fetch(admin.origin + '/api/records')).status, 403);
    assert.equal((await fetch(admin.origin + '/api/records', {headers: {...headers, Origin: 'https://example.com'}})).status, 403);
    assert.equal((await fetch(admin.origin + '/api/records', {headers: {...headers, Host: 'example.com'}})).status, 403);
    assert.equal((await fetch(admin.origin + '/api/records', {headers: {...headers, 'Sec-Fetch-Site': 'cross-site'}})).status, 403);
    const url = admin.origin + '/api/record';
    const {raw} = await (await fetch(url + '?kind=state&key=world', {headers})).json();
    const body = JSON.stringify({kind: 'state', key: 'world', original: raw, value: {serial: 3, shared: {}}});
    const saved = await fetch(url, {method: 'PUT', headers, body});
    assert.equal(saved.status, 200);
    assert.equal(JSON.parse((await saved.json()).raw).serial, 3);
    assert.equal((await fetch(url, {method: 'PUT', headers, body})).status, 409);
    assert.equal((await fetch(url, {method: 'PUT', headers, body: '{oops'})).status, 400);
    assert.equal((await fetch(url, {method: 'PUT', headers, body: 'null'})).status, 400);
    assert.equal((await fetch(url, {method: 'PUT', headers: {'X-Admin-Token': admin.token}, body})).status, 415);
    assert.equal((await fetch(url + '?kind=state&key=missing', {headers})).status, 404);
});

test('Redis editor saves existing JSON and names but refuses stale saves, duplicate names and active simulation leases', {skip: process.env.RUN_REDIS_TESTS !== '1'}, async t => {
    const {createClient} = await import('redis');
    const dir = await mkdtemp(join(tmpdir(), 'loeberland-admin-redis-'));
    t.after(() => rm(dir, {recursive: true, force: true}));
    const probe = createNetServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const child = spawn('redis-server', ['--bind', '127.0.0.1', '--port', String(port), '--save', '', '--appendonly', 'no', '--dir', dir], {stdio: 'ignore'});
    t.after(async () => { child.kill('SIGTERM'); await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)); });
    for (let i = 0; i < 100; i++) {
        const ready = await new Promise(resolve => {
            const socket = connect(port, '127.0.0.1');
            socket.once('connect', () => { socket.destroy(); resolve(true); });
            socket.once('error', () => resolve(false));
        });
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    const redisURL = 'redis://127.0.0.1:' + port, rawClient = createClient({url: redisURL});
    await rawClient.connect();
    t.after(() => rawClient.close());
    const prefix = 'loeberland:v1:', alice = {owner: 'alice', canonical: 'baypilot', name: 'BayPilot', changed: 1};
    await rawClient.set(prefix + 'world', '{"serial":1}');
    await rawClient.hSet(prefix + 'names', 'alice', JSON.stringify(alice));
    await rawClient.hSet(prefix + 'names', 'bob', JSON.stringify({owner: 'bob', canonical: 'coastwalker', name: 'CoastWalker', changed: 1}));
    const store = await openAdminStore({redisURL});
    t.after(() => store.close());
    assert.deepEqual((await store.list()).keys, ['world']);
    const original = await store.get('state', 'world');
    await rawClient.set(prefix + 'simulation-owner', 'active');
    await assert.rejects(store.save('state', 'world', original, {serial: 2}), /Stop the game server/);
    const nameRaw = await store.get('usernames', 'alice');
    await assert.rejects(store.save('usernames', 'alice', nameRaw, alice), /Stop the game server/);
    assert.deepEqual((await store.list()).keys, ['world']);
    await rawClient.del(prefix + 'simulation-owner');
    await store.save('state', 'world', original, {serial: 2});
    await assert.rejects(store.save('state', 'world', original, {serial: 3}), /changed or was deleted/);
    await assert.rejects(store.save('state', 'simulation-owner', '{}', {}), /internal Redis key/);
    await assert.rejects(store.save('usernames', 'alice', nameRaw, {...alice, canonical: 'coastwalker', name: 'CoastWalker'}), /already taken/);
    await store.save('usernames', 'alice', nameRaw, {...alice, canonical: 'harborpilot', name: 'HarborPilot'});
    await assert.rejects(store.save('usernames', 'alice', nameRaw, alice), /changed or was deleted/);
    assert.equal(JSON.parse(await rawClient.hGet(prefix + 'names', 'alice')).name, 'HarborPilot');
    assert.equal(JSON.parse(await rawClient.get(prefix + 'world')).serial, 2);
});
