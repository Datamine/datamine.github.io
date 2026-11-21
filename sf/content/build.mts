import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { validateContent } from './validate.js';
import type { PathLike } from 'fs';
import type { ContentBundle } from '../types/content.ts';

export const contentFiles = ['entities', 'dialogues', 'texts'] as const;
export const gameRoot = new URL('../', import.meta.url).pathname;
export function contentRevision(bundle: ContentBundle) {
  return createHash('sha256')
    .update(JSON.stringify(contentFiles.map((key) => bundle[key])))
    .digest('hex')
    .slice(0, 20);
}
export async function readContent(root = gameRoot) {
  const values = await Promise.all(
    contentFiles.map(async (key) => [
      key,
      JSON.parse(await readFile(resolve(root, 'content', key + '.json'), 'utf8')),
    ]),
  );
  const bundle = validateContent(Object.fromEntries(values));
  return Object.assign(bundle, { revision: contentRevision(bundle) });
}
export async function atomicWrite(
  path: PathLike,
  text:
    | string
    | NodeJS.ArrayBufferView<ArrayBufferLike>
    | Iterable<string | NodeJS.ArrayBufferView<ArrayBufferLike>>
    | AsyncIterable<string | NodeJS.ArrayBufferView<ArrayBufferLike>>,
) {
  const temporary = path + '.' + randomBytes(6).toString('hex') + '.tmp';
  await writeFile(temporary, text);
  await rename(temporary, path);
}
export async function publishContent(input: unknown, root = gameRoot) {
  const bundle = validateContent(input);
  const revision = contentRevision(bundle);
  bundle.revision = revision;
  await atomicWrite(resolve(root, 'content/runtime.json'), JSON.stringify(bundle) + '\n');
  await atomicWrite(
    resolve(root, 'content/manifest.json'),
    JSON.stringify({ schema: 1, revision: bundle.revision }) + '\n',
  );
  return Object.assign(bundle, { revision });
}
