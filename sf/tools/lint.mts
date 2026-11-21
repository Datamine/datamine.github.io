import { ESLint } from 'eslint';
import config from '../eslint.config.ts';

const engine = new ESLint({
  overrideConfigFile: true,
  overrideConfig: config,
  fix: process.argv.includes('--fix'),
});
const results = await engine.lintFiles(['.']);
if (process.argv.includes('--fix')) await ESLint.outputFixes(results);
console.log((await engine.loadFormatter('stylish')).format(results));
if (results.some((result) => result.errorCount || result.warningCount)) process.exitCode = 1;
