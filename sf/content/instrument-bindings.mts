import { legacySourceAST, isSourceNode, sourceChildren, sourcePropertyKey } from './source-ast.mts';
import type { SourceEdit } from './source-ast.mts';
import type { AnyNode, Node } from 'acorn';
import type { ContentBundle } from '../types/content.ts';
interface ConvertedExpression {
  value: string;
  id: string;
  values: string;
}
interface TextTemplate {
  template: string;
  values: string[];
}
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import 'espree';

// One-time source migration. Generated IDs become explicit code constants; they
// never depend on edited text, runtime branch indices or later line numbers.
const root = fileURLToPath(new URL('../', import.meta.url));
const textPath = resolve(root, 'content/texts.json');
const textData = JSON.parse(await readFile(textPath, 'utf8')) as ContentBundle['texts'];
const files: string[] = [];
async function walk(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      (
        ['node_modules', 'tests', 'server', 'content', 'editor', 'world-cache'] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(entry.name)
    )
      continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (
      entry.name.endsWith('.js') &&
      !(['content-runtime.js', 'world-edits.js'] satisfies [string, string]).includes(entry.name)
    )
      files.push(path);
  }
}
await walk(root);
for (const path of files) {
  const source = await readFile(path, 'utf8');
  if (source.includes('// CONTENT-BINDINGS-MIGRATED')) continue;
  const ast = legacySourceAST(source);
  const edits: SourceEdit[] = [],
    prefix = relative(root, path).replace(/\.js$/, '').replaceAll('/', '.');
  let serial = 0,
    usesText = false;
  const code = (node: Node) => source.slice(node.start, node.end);
  const key = sourcePropertyKey;
  function template(node: AnyNode, _id: string): TextTemplate | null {
    if (node.type === 'Literal' && typeof node.value === 'string')
      return { template: node.value, values: [] };
    if (node.type === 'TemplateLiteral') {
      return {
        template: node.quasis
          .map(
            (q, i) => String(q.value.cooked) + (i < node.expressions.length ? '{v' + i + '}' : ''),
          )
          .join(''),
        values: node.expressions.map(code),
      };
    }
    const hasText = (n: AnyNode): boolean =>
      (n.type === 'Literal' && typeof n.value === 'string') ||
      n.type === 'TemplateLiteral' ||
      (n.type === 'BinaryExpression' &&
        n.operator === '+' &&
        (hasText(n.left) || hasText(n.right)));
    if (node.type === 'BinaryExpression' && node.operator === '+' && hasText(node)) {
      const values: string[] = [];
      function part(n: AnyNode): string {
        if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
        if (n.type === 'BinaryExpression' && n.operator === '+' && hasText(n))
          return part(n.left) + part(n.right);
        const i = values.push(code(n)) - 1;
        return '{v' + i + '}';
      }
      return { template: part(node), values };
    }
    return null;
  }
  function convert(node: AnyNode, id: string): ConvertedExpression | null {
    if (node.type === 'ConditionalExpression') {
      const yes = convert(node.consequent, id + '.yes'),
        no = convert(node.alternate, id + '.no');
      if (yes && no)
        return {
          value: '(' + code(node.test) + ' ? ' + yes.value + ' : ' + no.value + ')',
          id: '(' + code(node.test) + ' ? ' + yes.id + ' : ' + no.id + ')',
          values: '(' + code(node.test) + ' ? ' + yes.values + ' : ' + no.values + ')',
        };
      return null;
    }
    const fn = node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement';
    const t = template(fn ? node.body : node, id);
    if (!t) return null;
    const values = '{' + t.values.map((v, i) => 'v' + i + ': (' + v + ')').join(',') + '}';
    textData.texts[id] = { template: t.template };
    usesText = true;
    return {
      value: (fn ? '() => ' : '') + 'contentText(' + JSON.stringify(id) + ',' + values + ')',
      id: JSON.stringify(id),
      values: fn ? '() => (' + values + ')' : values,
    };
  }
  function visit(node: unknown, parents: AnyNode[] = [], scope = 'module'): void {
    if (!isSourceNode(node)) return;
    if (node.type === 'FunctionDeclaration' && node.id) scope = node.id.name;
    if (
      node.type === 'VariableDeclarator' &&
      node.id?.type === 'Identifier' &&
      (['ArrowFunctionExpression', 'FunctionExpression'] satisfies [string, string]).includes(
        node.init?.type || '',
      )
    )
      scope = node.id.name;
    if (node.type === 'ObjectExpression') {
      const names = new Set(
        node.properties
          .filter((p) => p.type === 'Property')
          .map(key)
          .filter((key): key is string => key !== undefined),
      );
      const dialogue = [...names].some((n) =>
        (
          ['intro', 'choice', 'choices', 'receipt', 'accept', 'next'] satisfies [
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        ).includes(n),
      );
      const meta = [];
      if (dialogue && !names.has('contentNodeId'))
        meta.push('contentNodeId:' + JSON.stringify(prefix + '.' + scope + '.node-' + ++serial));
      for (const p of node.properties) {
        if (p.type !== 'Property' || p.method || p.shorthand) continue;
        const field = key(p);
        if (!field) continue;
        if (
          (
            [
              'intro',
              'question',
              'choice',
              'decline',
              'receipt',
              'label',
              'description',
              'name',
              'localLine',
            ] satisfies [string, string, string, string, string, string, string, string, string]
          ).includes(field)
        ) {
          const id = prefix + '.' + scope + '.' + field + '-' + ++serial;
          const result = convert(p.value, id);
          if (result) {
            edits.push({ start: p.value.start, end: p.value.end, text: result.value });
            if (dialogue)
              meta.push(field + 'TextId:' + result.id, field + 'TextValues:' + result.values);
          }
        }
        if (field === 'accept' && !names.has('actionId')) {
          const id = prefix + '.' + scope + '.action-' + ++serial;
          const candidates = [];
          for (const parent of parents) {
            if (
              parent.type === 'FunctionDeclaration' ||
              parent.type === 'ArrowFunctionExpression' ||
              parent.type === 'FunctionExpression'
            )
              for (const param of parent.params || []) {
                if (
                  param.type === 'Identifier' &&
                  (
                    ['op', 'id', 'kind', 'itemId', 'hatId', 'offerId', 'amount'] satisfies [
                      string,
                      string,
                      string,
                      string,
                      string,
                      string,
                      string,
                    ]
                  ).includes(param.name)
                )
                  candidates.push(param.name);
              }
            if (
              parent.type === 'ForOfStatement' &&
              parent.left.type === 'VariableDeclaration' &&
              parent.left.declarations[0]?.id.type === 'Identifier'
            ) {
              const name = parent.left.declarations[0].id.name;
              if (new RegExp('\\b' + name + '\\.id\\b').test(code(p.value)))
                candidates.push(name + '.id');
            }
            if (
              parent.type === 'ArrowFunctionExpression' &&
              parent.params?.[0]?.type === 'Identifier'
            ) {
              const name = parent.params[0].name;
              if (new RegExp('\\b' + name + '\\.id\\b').test(code(p.value)))
                candidates.push(name + '.id');
            }
          }
          meta.push(
            'actionId:' +
              JSON.stringify(id) +
              (candidates.length
                ? ' + ":" + [' + [...new Set(candidates)].join(',') + '].join(":")'
                : ''),
          );
        }
      }
      if (meta.length)
        edits.push({ start: node.start + 1, end: node.start + 1, text: meta.join(',') + ',' });
    }
    for (const child of sourceChildren(node)) visit(child, [...parents, node], scope);
  }
  visit(ast);
  // Text properties replace whole expressions. Ignore nested replacements inside
  // those expressions, keeping all remaining edits deterministic and disjoint.
  const selected = edits.filter(
    (e) =>
      !edits.some(
        (o) =>
          o !== e && o.start <= e.start && o.end >= e.end && (o.start < e.start || o.end > e.end),
      ),
  );
  if (!selected.length) continue;
  let result = source;
  for (const e of selected.sort((a, b) => b.start - a.start || b.end - a.end))
    result = result.slice(0, e.start) + e.text + result.slice(e.end);
  if (usesText)
    result =
      'import { contentText } from ' +
      JSON.stringify(
        relative(resolve(path, '..'), resolve(root, 'content-runtime.js')).startsWith('.')
          ? relative(resolve(path, '..'), resolve(root, 'content-runtime.js'))
          : './' + relative(resolve(path, '..'), resolve(root, 'content-runtime.js')),
      ) +
      ';\n' +
      result;
  result = '// CONTENT-BINDINGS-MIGRATED\n' + result;
  await writeFile(path, result);
  console.log(relative(root, path), selected.length);
}
await writeFile(textPath, JSON.stringify(textData, null, 2) + '\n');
