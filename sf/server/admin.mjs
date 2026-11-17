import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {normalizeUsername} from './usernames.mjs';

const defaultFile = fileURLToPath(new URL('./data/world.sqlite', import.meta.url));
const prefix = 'loeberland:v1:';
const fail = (status, message) => Object.assign(new Error(message), {status});

function validate(kind, key, value) {
    if (!['state', 'usernames'].includes(kind) || typeof key !== 'string' || !key) throw fail(400, 'Choose an existing record.');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(400, 'The value must be a JSON object.');
    if (kind === 'usernames') {
        const name = normalizeUsername(value.name);
        if (!name.ok) throw fail(400, name.message);
        if (value.owner !== key || value.canonical !== name.canonical || value.name !== name.name) throw fail(400, 'Keep owner unchanged and canonical equal to the lowercase name.');
        if (!Number.isSafeInteger(value.changed) || value.changed < 0) throw fail(400, 'changed must be a nonnegative integer timestamp in milliseconds.');
        if (Object.keys(value).sort().join(',') !== 'canonical,changed,name,owner') throw fail(400, 'Username fields must be owner, canonical, name and changed.');
    }
}

export async function openAdminStore({filename = process.env.STATE_FILE || defaultFile, redisURL = process.env.REDIS_URL} = {}) {
    let adapter;
    if (redisURL) {
        const {createClient} = await import('redis');
        const client = createClient({url: redisURL, socket: {connectTimeout: 5000, reconnectStrategy: false}});
        client.on('error', error => console.error('Admin Redis:', error.message));
        await client.connect();
        const namesKey = prefix + 'names', leaseKey = prefix + 'simulation-owner';
        adapter = {
            kind: 'redis', location: 'Redis · ' + prefix,
            async list() {
                const names = Object.values(await client.hGetAll(namesKey)).map(JSON.parse), keys = [];
                for await (const batch of client.scanIterator({MATCH: prefix + '*', COUNT: 200})) {
                    for (const key of batch) if (key !== namesKey && key !== leaseKey) keys.push(key.slice(prefix.length));
                }
                return {keys: [...new Set(keys)], names};
            },
            async get(kind, key) { return kind === 'state' ? client.get(prefix + key) : client.hGet(namesKey, key); },
            async save(kind, key, original, value) {
                const script = kind === 'state' ? `
                    if redis.call('EXISTS', KEYS[1]) == 1 then return -2 end
                    local current = redis.call('GET', KEYS[2])
                    if not current or current ~= ARGV[1] then return 0 end
                    redis.call('SET', KEYS[2], ARGV[2]); return 1
                ` : `
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
                    keys: [leaseKey, kind === 'state' ? prefix + key : namesKey],
                    arguments: [original, JSON.stringify(value), key, value.canonical || ''],
                });
                if (result === -2) throw fail(409, 'Stop the game server first; its Redis ownership lease is still active. Wait up to 15 seconds after stopping.');
                if (result === -3) throw fail(409, 'That username is already taken.');
                if (result !== 1) throw fail(409, 'This record changed or was deleted. Reload it before saving.');
            },
            close: () => client.close(),
        };
    } else {
        const {DatabaseSync} = await import('node:sqlite');
        // Refuse a typo instead of silently creating an empty database.
        const {stat} = await import('node:fs/promises');
        if (filename !== ':memory:') await stat(filename).catch(() => { throw Error('SQLite database not found: ' + filename + '. Set STATE_FILE to the existing database.'); });
        const db = new DatabaseSync(filename);
        try {
            db.exec('PRAGMA busy_timeout=5000');
            db.prepare('SELECT key, value FROM state LIMIT 0').all();
            db.prepare('SELECT owner, canonical, name, changed FROM usernames LIMIT 0').all();
        } catch (error) { db.close(); throw error; }
        adapter = {
            kind: 'sqlite', location: filename,
            async list() {
                return {keys: db.prepare('SELECT key FROM state ORDER BY key').all().map(row => row.key), names: db.prepare('SELECT owner, canonical, name, changed FROM usernames ORDER BY name').all()};
            },
            async get(kind, key) {
                if (kind === 'state') return db.prepare('SELECT value FROM state WHERE key=?').get(key)?.value ?? null;
                const row = db.prepare('SELECT owner, canonical, name, changed FROM usernames WHERE owner=?').get(key);
                return row ? JSON.stringify(row) : null;
            },
            async save(kind, key, original, value) {
                let result;
                try {
                    if (kind === 'state') result = db.prepare('UPDATE state SET value=? WHERE key=? AND value=?').run(JSON.stringify(value), key, original);
                    else {
                        const old = JSON.parse(original);
                        result = db.prepare('UPDATE usernames SET canonical=?, name=?, changed=? WHERE owner=? AND canonical=? AND name=? AND changed=?')
                            .run(value.canonical, value.name, value.changed, key, old.canonical, old.name, old.changed);
                    }
                } catch (error) {
                    if (error.message.includes('UNIQUE constraint failed')) throw fail(409, 'That username is already taken.');
                    throw error;
                }
                if (Number(result.changes) !== 1) throw fail(409, 'This record changed or was deleted. Reload it before saving.');
            },
            close: async () => db.close(),
        };
    }
    return {
        ...adapter,
        async get(kind, key) {
            if (!['state', 'usernames'].includes(kind) || typeof key !== 'string' || !key) throw fail(400, 'Choose an existing record.');
            if (adapter.kind === 'redis' && kind === 'state' && ['names', 'simulation-owner'].includes(key)) throw fail(400, 'This is an internal Redis key.');
            const raw = await adapter.get(kind, key);
            if (raw == null) throw fail(404, 'Record not found.');
            return raw;
        },
        async save(kind, key, original, value) {
            validate(kind, key, value);
            if (typeof original !== 'string') throw fail(400, 'Reload the record before saving.');
            if (adapter.kind === 'redis' && kind === 'state' && ['names', 'simulation-owner'].includes(key)) throw fail(400, 'This is an internal Redis key.');
            await adapter.save(kind, key, original, value);
        },
    };
}

export async function startAdmin({store, port = Number(process.env.ADMIN_PORT || 8788)} = {}) {
    store ??= await openAdminStore();
    const token = randomBytes(32).toString('hex');
    const html = (await readFile(new URL('./admin.html', import.meta.url), 'utf8')).replace('__ADMIN_TOKEN__', token);
    let origin;
    const server = createServer(async (req, res) => {
        const send = (status, value, type = 'application/json') => {
            res.writeHead(status, {'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer'});
            res.end(type === 'application/json' ? JSON.stringify(value) : value);
        };
        try {
            if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Open the editor using its printed local URL.');
            const url = new URL(req.url, origin);
            if (req.method === 'GET' && url.pathname === '/') { send(200, html, 'text/html'); return; }
            if (req.headers['x-admin-token'] !== token) throw fail(403, 'Reload the editor page.');
            if (req.method === 'GET' && url.pathname === '/api/records') {
                const {keys, names} = await store.list(), owners = new Map(names.map(row => [row.owner, row.name]));
                const records = keys.map(key => ({kind: 'state', key, label: key.startsWith('player:') ? owners.get(key.slice(7)) || 'Unnamed player' : key}));
                records.push(...names.map(row => ({kind: 'usernames', key: row.owner, label: row.name})));
                send(200, {backend: store.kind, location: store.location, records}); return;
            }
            if (req.method === 'GET' && url.pathname === '/api/record') {
                send(200, {raw: await store.get(url.searchParams.get('kind'), url.searchParams.get('key'))}); return;
            }
            if (req.method === 'PUT' && url.pathname === '/api/record') {
                if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Send JSON.');
                const chunks = []; let bytes = 0;
                for await (const chunk of req) {
                    bytes += chunk.length;
                    if (bytes > 16 * 1024 * 1024) throw fail(413, 'Record exceeds the 16 MB editor limit.');
                    chunks.push(chunk);
                }
                let body;
                try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, 'Invalid JSON.'); }
                if (!body || typeof body !== 'object') throw fail(400, 'Send a record object.');
                await store.save(body.kind, body.key, body.original, body.value);
                send(200, {raw: JSON.stringify(body.value)}); return;
            }
            throw fail(404, 'Not found.');
        } catch (error) { send(error.status || 500, {error: error.message}); }
    });
    try {
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    } catch (error) { await store.close(); throw error; }
    origin = 'http://127.0.0.1:' + server.address().port;
    return {server, origin, token, async close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await store.close(); }};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    if (process.argv.includes('--help')) {
        console.log('Usage: node server/admin.mjs\n\nStop the game server before editing; restart it to load changes.\nSTATE_FILE selects an existing SQLite database (default: server/data/world.sqlite).\nREDIS_URL selects Redis instead. ADMIN_PORT defaults to 8788.');
    } else {
        try {
            const admin = await startAdmin();
            console.log('Database editor: ' + admin.origin + '\nStop the game server before editing. Restart it after saving to load changes.\nPress Ctrl+C to close the editor.');
            let closing = false;
            const close = async () => { if (closing) return; closing = true; try { await admin.close(); } catch (error) { console.error(error.message); process.exitCode = 1; } };
            process.on('SIGINT', close); process.on('SIGTERM', close);
        } catch (error) { console.error(error.message); process.exitCode = 1; }
    }
}
