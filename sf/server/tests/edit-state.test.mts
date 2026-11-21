import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('../edit-state.sh', import.meta.url));

async function run(t: test.TestContext, options: NodeJS.ProcessEnv = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'loeberland-edit-state-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const log = join(dir, 'calls.jsonl');
  const envFile = join(dir, '.env');
  await writeFile(envFile, 'ADMIN_USERNAME=test-admin\nADMIN_PASSWORD=test-only-secret\n');
  await writeFile(
    join(dir, 'docker'),
    `#!/usr/bin/env node
const {appendFileSync} = require('node:fs');
const commands = ['config', 'images', 'run', 'up', 'ps', 'stop', 'start'];
const values = process.argv.slice(2);
const args = values.slice(values.findIndex(value => commands.includes(value)));
appendFileSync(process.env.MOCK_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'images') console.log('game-image');
if (args[0] === 'run' && args.at(-1) === '--help') {
    console.log(process.env.MOCK_OLD_IMAGE === '1' ? 'ADMIN_HOST' : 'ADMIN_HOST ADMIN_USERNAME');
    process.exit(0);
}
if (args[0] === 'run' && !values.some(value => value.endsWith('/admin.compose.yaml'))) process.exit(19);
if (args[0] === 'run' && args.at(-1) === '--check-auth') process.exit(process.env.MOCK_AUTH_FAIL === '1' ? 18 : 0);
if (args[0] === process.env.MOCK_FAIL) process.exit(17);
if (args[0] === 'ps' && process.env.MOCK_STOPPED !== '1') console.log('game-container');
`,
    { mode: 0o755 },
  );
  const { SCRIPT_VIEW, ...envOptions } = options;
  const result = spawnSync('bash', [script, ...(SCRIPT_VIEW === '1' ? ['--view'] : [])], {
    cwd: dir,
    env: {
      ...process.env,
      PATH: dir + delimiter + process.env.PATH,
      MOCK_LOG: log,
      MOCK_FAIL: '',
      MOCK_STOPPED: '',
      MOCK_OLD_IMAGE: '',
      MOCK_AUTH_FAIL: '',
      ADMIN_PORT: '8788',
      ADMIN_ENV_FILE: envFile,
      COMPOSE_ENV_FILE: envFile,
      ...envOptions,
    },
    encoding: 'utf8',
  });
  const calls = (
    await readFile(log, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    })
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((text) => JSON.parse(text));
  return { ...result, calls, commands: calls.map((args) => args[0]) };
}

test('Compose editor stops the running game, publishes only on loopback, and restarts after editing', async (t) => {
  const result = await run(t, { ADMIN_PORT: '9876' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, [
    'config',
    'images',
    'run',
    'run',
    'up',
    'ps',
    'stop',
    'run',
    'start',
  ] satisfies [string, string, string, string, string, string, string, string, string]);
  const args = result.calls.find((args) => args[0] === 'run' && args.at(-1) === 'admin.mjs');
  assert.ok(args.includes('127.0.0.1:9876:9876'));
  assert.ok(args.includes('ADMIN_HOST=0.0.0.0'));
  assert.ok(args.includes('ADMIN_PORT=9876'));
  assert.ok(args.includes('ADMIN_READ_ONLY=0'));
  assert.ok(!JSON.stringify(result.calls).includes('test-only-secret'));
  assert.deepEqual(args.slice(-3), ['game', 'node', 'admin.mjs'] satisfies [
    string,
    string,
    string,
  ]);
  assert.match(result.stdout, /127\.0\.0\.1:9876/);
});

test('Compose editor restarts the game after an editor failure or interrupted stop', async (t) => {
  for (const command of ['run', 'stop'] satisfies [string, string]) {
    await t.test(command, async (t) => {
      const result = await run(t, { MOCK_FAIL: command });
      assert.equal(result.status, 17, result.stderr);
      assert.equal(result.commands.at(-1), 'start');
      if (command === 'stop') assert.ok(!result.calls.some((args) => args.at(-1) === 'admin.mjs'));
    });
  }
});

test('Compose editor leaves an already stopped game stopped', async (t) => {
  const result = await run(t, { MOCK_STOPPED: '1' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, [
    'config',
    'images',
    'run',
    'run',
    'up',
    'ps',
    'run',
  ] satisfies [string, string, string, string, string, string, string]);
});

test('read-only Compose inspection leaves a running game running and enforces read-only mode', async (t) => {
  const result = await run(t, { SCRIPT_VIEW: '1' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.commands.includes('stop'));
  assert.ok(!result.commands.includes('start'));
  assert.ok(result.calls.find((args) => args.at(-1) === 'admin.mjs').includes('ADMIN_READ_ONLY=1'));
});

test('missing or invalid credentials fail before interrupting the game', async (t) => {
  const missing = await run(t, { ADMIN_ENV_FILE: '/nonexistent/loeberland-admin.env' });
  assert.equal(missing.status, 2);
  assert.deepEqual(missing.calls, []);
  const invalid = await run(t, { MOCK_AUTH_FAIL: '1' });
  assert.equal(invalid.status, 18);
  assert.ok(!invalid.commands.includes('stop'));
  assert.ok(!invalid.commands.includes('start'));
});

test('Compose editor fails before stopping the game if Redis cannot start or configuration is invalid', async (t) => {
  for (const command of ['config', 'up'] satisfies [string, string]) {
    await t.test(command, async (t) => {
      const result = await run(t, { MOCK_FAIL: command });
      assert.equal(result.status, 17, result.stderr);
      assert.ok(!result.commands.includes('stop'));
      assert.ok(!result.commands.includes('start'));
    });
  }
});

test('Compose editor rejects invalid ports before invoking Docker', async (t) => {
  const result = await run(t, { ADMIN_PORT: '65536' });
  assert.equal(result.status, 2);
  assert.deepEqual(result.calls, []);
});

test('Compose editor rejects an old image before interrupting the game', async (t) => {
  const result = await run(t, { MOCK_OLD_IMAGE: '1' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /build game/);
  assert.deepEqual(result.commands, ['config', 'images', 'run'] satisfies [string, string, string]);
});
