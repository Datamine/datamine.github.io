import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { buildRuntime, gameRoot, runtimeRoot } from './build-runtime.mts';

const [entry = 'index', ...args] = process.argv.slice(2);
if (
  !(['index', 'admin', 'backup', 'load-test'] satisfies [string, string, string, string]).includes(
    entry,
  )
)
  throw new Error('Unknown server entry point: ' + entry);
await buildRuntime();
const env: NodeJS.ProcessEnv = {
  ...process.env,
  STATE_FILE: process.env.STATE_FILE || resolve(gameRoot, 'server/data/world.sqlite'),
};
if (entry === 'admin') env.ADMIN_ENV_FILE ||= resolve(gameRoot, 'server/.env');
const child = spawn(
  process.execPath,
  ['--enable-source-maps', resolve(runtimeRoot, 'server', entry + '.mjs'), ...args],
  { stdio: 'inherit', env },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
