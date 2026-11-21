import { legacySourceAST, isSourceNode, sourceChildren, sourcePropertyKey } from './source-ast.mts';
import type { SourceEdit } from './source-ast.mts';
import type { AnyNode, Property } from 'acorn';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import 'espree';

const root = fileURLToPath(new URL('../', import.meta.url));
const astOf = legacySourceAST;
const key = sourcePropertyKey;
const meta = (p: AnyNode): p is Property =>
  p.type === 'Property' &&
  (key(p) === 'contentNodeId' || key(p) === 'actionId' || /Text(?:Id|Values)$/.test(key(p) || ''));
async function walk(dir: string) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    if (
      (
        ['node_modules', 'server', 'tests', 'content', 'editor', 'world-cache'] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(f.name)
    )
      continue;
    const path = resolve(dir, f.name);
    if (f.isDirectory()) await walk(path);
    else if (f.name.endsWith('.js')) await relocate(path);
  }
}
async function relocate(path: string) {
  const source = await readFile(path, 'utf8');
  if (!source.includes('// CONTENT-BINDINGS-MIGRATED')) return;
  const ast = astOf(source),
    edits: SourceEdit[] = [];
  function visit(n: unknown): void {
    if (!isSourceNode(n)) return;
    if (n.type === 'ObjectExpression') {
      const leading: Property[] = [];
      for (const p of n.properties) {
        if (!meta(p)) break;
        leading.push(p);
      }
      if (leading.length) {
        const end = leading.at(-1)!.end,
          tail = n.properties.at(-1)!;
        edits.push({ start: n.start + 1, end: end + (source[end] === ',' ? 1 : 0), text: '' });
        const comma =
          n.properties.length === leading.length
            ? ''
            : source.slice(tail.end, n.end - 1).includes(',')
              ? ''
              : ',';
        edits.push({
          start: n.end - 1,
          end: n.end - 1,
          text: comma + leading.map((p) => source.slice(p.start, p.end)).join(','),
        });
      }
    }
    for (const child of sourceChildren(n)) visit(child);
  }
  visit(ast);
  let result = source;
  for (const e of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, e.start) + e.text + result.slice(e.end);
  astOf(result);
  await writeFile(path, result);
}
await walk(root);

const path = resolve(root, 'world/interactions.js');
let source = await readFile(path, 'utf8');
if (!source.includes('// MENU-ACTION-IDS')) {
  const ast = astOf(source),
    edits: SourceEdit[] = [];
  let serial = 0;
  function visit(n: unknown, scope = ''): void {
    if (!isSourceNode(n)) return;
    if (n.type === 'FunctionDeclaration') scope = n.id?.name || scope;
    if (
      scope === 'showMenu' &&
      n.type === 'CallExpression' &&
      n.callee.type === 'Identifier' &&
      n.callee.name === 'add' &&
      n.arguments.length === 2
    ) {
      const label = source.slice(n.arguments[0].start, n.arguments[0].end),
        callback = source.slice(n.arguments[1].start, n.arguments[1].end);
      let id;
      if (callback.includes('interactCitizen(npc, verb)')) id = "'npc.' + verb";
      else if (label.startsWith("'Follow '") || label.startsWith('"Follow "')) id = "'npc.follow'";
      else if (label.includes('Stop following')) id = "'npc.unfollow'";
      else if (callback.includes('duelMenu.open')) id = "'npc.duel'";
      else if (callback.includes('actorWalkPoint') || callback === '() => walkToActor(npc)')
        id = "'npc.walk'";
      else if (label.includes('Walk here') && label.includes('npc')) id = "'npc.walk'";
      else if (label.includes('Examine') && label.includes('npc')) id = "'npc.examine'";
      else if (callback.includes('exercise.id')) id = "'gym.' + exercise.id";
      else if (callback.includes('trick.id')) id = "'trick.' + trick.id";
      else if (label.includes('Walk here') || label.includes('Walk to entrance')) id = "'walk'";
      else if (label.includes('Examine')) id = "'examine'";
      else id = JSON.stringify('interaction.' + ++serial);
      edits.push({ start: n.arguments[1].end, end: n.arguments[1].end, text: ',' + id });
    }
    for (const child of sourceChildren(n)) visit(child, scope);
  }
  visit(ast);
  for (const e of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, e.start) + e.text + source.slice(e.end);
  source = '// MENU-ACTION-IDS\n' + source;
  await writeFile(path, source);
}
