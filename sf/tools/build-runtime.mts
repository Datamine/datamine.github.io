import { buildAuxiliary } from './build-auxiliary.mts';
import ts from 'typescript';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const gameRoot = fileURLToPath(new URL('../', import.meta.url));
export const runtimeRoot = resolve(gameRoot, '.build');
const diagnosticsHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (file) => file,
  getCurrentDirectory: () => gameRoot,
  getNewLine: () => '\n',
};
/** Emit an independent game runtime; no website sources or assets are required. */
export async function buildRuntime(): Promise<void> {
  const config = ts.getParsedCommandLineOfConfigFile(
    resolve(gameRoot, 'tsconfig.runtime.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (error) => {
        throw new Error(ts.formatDiagnosticsWithColorAndContext([error], diagnosticsHost));
      },
    },
  );
  if (!config) throw new Error('Unable to read the runtime TypeScript configuration.');
  const program = ts.createProgram(config.fileNames, config.options),
    diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length)
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticsHost));
  await buildAuxiliary();
  await rm(runtimeRoot, { recursive: true, force: true });
  const emitted = program.emit();
  if (emitted.emitSkipped || emitted.diagnostics.length)
    throw new Error(ts.formatDiagnosticsWithColorAndContext(emitted.diagnostics, diagnosticsHost));
  async function assets(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (
        [
          'node_modules',
          '.git',
          '.build',
          '.terraform',
          'data',
          'backups',
          'tests',
          'reports',
        ].includes(entry.name) ||
        entry.name.startsWith('.env')
      )
        continue;
      const source = resolve(directory, entry.name),
        local = relative(gameRoot, source);
      if (entry.isDirectory()) await assets(source);
      else if (
        !['.ts', '.mts', '.cts', '.map', '.tf', '.tftpl', '.csv'].includes(extname(source))
      ) {
        const target = resolve(runtimeRoot, local);
        await mkdir(resolve(target, '..'), { recursive: true });
        await cp(source, target);
      }
    }
  }
  await assets(gameRoot);
  await cp(resolve(gameRoot, 'server/node_modules'), resolve(runtimeRoot, 'server/node_modules'), {
    recursive: true,
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildRuntime();
  console.log('Built sf/.build/: type-checked game server JavaScript, source maps, and assets.');
}
