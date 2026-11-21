import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

/** Native-module development and Node use the same browser-compatible validators. */
export async function buildContentValidator() {
  await build({
    entryPoints: [fileURLToPath(new URL('../content-validation.ts', import.meta.url))],
    outfile: fileURLToPath(new URL('validate.js', import.meta.url)),
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: ['es2022'],
    minify: true,
    legalComments: 'none',
    logLevel: 'silent',
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildContentValidator();
