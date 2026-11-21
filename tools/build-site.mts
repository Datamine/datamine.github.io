import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

export async function buildSiteScript(): Promise<void> {
  const root = fileURLToPath(new URL('../', import.meta.url));
  await build({
    absWorkingDir: root,
    entryPoints: ['main.ts'],
    outfile: 'main.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: 'inline',
    minify: true,
    legalComments: 'none',
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildSiteScript();
