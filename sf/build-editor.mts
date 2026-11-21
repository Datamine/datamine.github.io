import type { ContentBundle } from './types/content.ts';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'esbuild';
import { projectCatalog } from './editor/project.mts';
import { readContent, publishContent } from './content/build.mts';
import { groupEditorRecords } from './editor/groups.ts';

const root = fileURLToPath(new URL('./', import.meta.url));
export async function sourceFingerprint() {
  return (await readContent()).revision;
}
export async function buildEditor({
  bundle: content = null,
  outputRoot = root,
}: { bundle?: ContentBundle | null; outputRoot?: string } = {}) {
  const data = await publishContent(content || (await readContent(outputRoot)), outputRoot);
  const fingerprint = data.revision;
  const catalog = projectCatalog(data, fingerprint);
  const [template, css, js] = await Promise.all([
    readFile(resolve(root, 'editor/template.html'), 'utf8'),
    readFile(resolve(root, 'editor/style.css'), 'utf8'),
    bundle({
      entryPoints: [resolve(root, 'editor/app.ts')],
      bundle: true,
      write: false,
      format: 'esm',
      minify: true,
      target: ['es2022'],
      logLevel: 'silent',
    }),
  ]);
  const html = template
    .replace('/* EDITOR:CSS */', () => css)
    .replace('/* EDITOR:DATA */', () => JSON.stringify(catalog).replace(/</g, '\\u003c'))
    .replace('/* EDITOR:JS */', () => js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
  const groups = groupEditorRecords(catalog.records);
  const meta = {
    fingerprint,
    objects: groups.filter((r) => r.group === 'object').length,
    npcs: groups.filter((r) => r.group === 'npc').length,
    entries: groups.length,
    records: catalog.records.length,
    sharedConversations: catalog.sharedDialogue.length,
  };
  await writeFile(resolve(outputRoot, 'editor.html'), html);
  await writeFile(
    resolve(outputRoot, 'editor/build-meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
  );
  return meta;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildEditor();
  console.log(
    `Built editor.html: ${result.objects} objects, ${result.npcs} NPCs, ${result.sharedConversations} shared conversations.`,
  );
}
