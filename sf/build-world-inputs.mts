import type { ExportNamedDeclaration, FunctionDeclaration, Statement } from 'acorn';
import { requiredValue } from './types/assert.ts';
import { executableSource } from './tools/typescript-source.mts';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const root = fileURLToPath(new URL('./', import.meta.url));
const runtimeModules = new Set([
  'sf/world/hud.ts',
  'sf/world/interactions.ts',
  'sf/world/runtime.ts',
  'sf/world/network.ts',
  'sf/world/rendering.ts',
  'sf/world/minimap.ts',
  'sf/config/dialogue.ts',
  'sf/config/world-lore.ts',
  'sf/rendering/character-gpu.ts',
  'sf/rendering/dynamic-buffer.ts',
  'sf/loading-screen.ts',
  'sf/loading-npc.ts',
  'sf/username-form.ts',
  'sf/server-connection.ts',
  'sf/debug-console.ts',
  'sf/dialogue.ts',
  'sf/dialogue-config.ts',
  'sf/research-dialogue.ts',
  'sf/rehabilitation.ts',
  'sf/world-edits.ts',
  'sf/content-runtime.ts',
  'sf/content-game.ts',
  'sf/content-conditions.ts',
  'sf/content-validation.ts',
  'sf/player-document.ts',
]);
const isRuntime = (file: string) =>
  runtimeModules.has(file) ||
  file.startsWith('sf/dialogues/') ||
  file.startsWith('sf/ui/') ||
  file.startsWith('sf/client/') ||
  file.startsWith('sf/multiplayer-') ||
  file.endsWith('-ui.ts') ||
  file.endsWith('-menu.ts');
const canonical = (node: unknown) =>
  JSON.stringify(node, (key: string, value: unknown) =>
    (
      ['start', 'end', 'range', 'loc', 'raw', 'comments', 'tokens'] satisfies [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    ).includes(key)
      ? undefined
      : value,
  );

/** UI/network/texture artwork are built independently. Geometry and authored
 * placement modules remain conservative inputs; semantic ASTs ignore formatting. */
export async function worldInputs({
  readSource = (file: string) => readFile(resolve(root, file.replace(/^sf\//, '')), 'utf8'),
} = {}) {
  const pending = ['sf/world/generation.ts', 'sf/world/navigation.ts'] satisfies [string, string],
    seen = new Set<string>(),
    inputs = new Map<string, string>();
  const composition = parse(executableSource(await readSource('sf/world/scene.ts')), {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  const scene = requiredValue(
    composition.body.find(
      (n): n is ExportNamedDeclaration & { declaration: FunctionDeclaration } =>
        n.type === 'ExportNamedDeclaration' &&
        n.declaration?.type === 'FunctionDeclaration' &&
        n.declaration.id?.name === 'createSFWorld',
    ),
    'The world factory is missing.',
  ).declaration;
  const factories = new Set([
    'createGeneration',
    'createRuntime',
    'createRendering',
    'createInteractions',
    'createMinimap',
    'createNavigation',
    'createHud',
    'createNetwork',
  ] satisfies [string, string, string, string, string, string, string, string]);
  const browserBindings = new Set([
    'context',
    '$',
    'world',
    'canvas',
    'map',
    'gl',
    'mc',
    'classic',
    'sections',
    'dialogue',
    'aiInterview',
    'connectionGate',
    'debugConsole',
    'frameMeter',
    'growthTicker',
    'clientController',
  ] satisfies [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]);
  const initialization: Statement[] = [];
  for (const node of scene.body.body) {
    if (
      node.type === 'IfStatement' &&
      node.test.type === 'Identifier' &&
      node.test.name === 'headless'
    )
      break;
    if (node.type === 'VariableDeclaration') {
      const declarations = node.declarations
        .filter((d) => d.id.type !== 'Identifier' || !browserBindings.has(d.id.name))
        .filter(
          (d) =>
            !(
              d.init?.type === 'CallExpression' &&
              d.init.callee.type === 'Identifier' &&
              factories.has(d.init.callee.name)
            ),
        );
      if (declarations.length) initialization.push({ ...node, declarations });
    } else if (
      (
        ['ExpressionStatement', 'ForStatement', 'ForOfStatement'] satisfies [string, string, string]
      ).includes(node.type)
    )
      initialization.push(node);
  }
  inputs.set('sf/world/scene.js#layout', canonical(initialization));
  for (const node of composition.body)
    if (node.type === 'ImportDeclaration') {
      const first = node.specifiers[0];
      if (
        first?.type === 'ImportSpecifier' &&
        first.imported.type === 'Identifier' &&
        factories.has(first.imported.name)
      )
        continue;
      if (typeof node.source.value === 'string' && node.source.value.startsWith('.'))
        pending.push(relative(root, resolve(root, 'sf/world', node.source.value)));
    }
  while (pending.length) {
    const file = pending.pop()!;
    if (seen.has(file) || isRuntime(file)) continue;
    seen.add(file);
    const ast = parse(executableSource(await readSource(file), file), {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });
    inputs.set(file, canonical(ast));
    for (const node of ast.body) {
      const source =
        node.type === 'ImportDeclaration' ||
        node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportAllDeclaration'
          ? node.source
          : null;
      if (source && typeof source.value === 'string' && source.value.startsWith('.'))
        pending.push(relative(root, resolve(dirname(resolve(root, file)), source.value)));
    }
  }
  // Changes to codecs or the compiler itself invalidate generated bytes.
  for (const file of [
    'sf/build-world.mts',
    'sf/build-world-inputs.mts',
    'sf/world-codec.ts',
    'sf/world-tile-codec.ts',
  ] satisfies [string, string, string, string])
    if (!inputs.has(file))
      inputs.set(
        file,
        canonical(
          parse(executableSource(await readSource(file), file), {
            ecmaVersion: 'latest',
            sourceType: 'module',
          }),
        ),
      );
  return inputs;
}
export async function worldInputVersion(
  options: { readSource?: ((file: string) => Promise<string>) | undefined } = {},
) {
  const inputs = await worldInputs(options),
    hash = createHash('sha256');
  for (const [file, source] of [...inputs].sort(([a], [b]) => a.localeCompare(b)))
    hash.update(file).update(source);
  return hash.digest('hex').slice(0, 20);
}
