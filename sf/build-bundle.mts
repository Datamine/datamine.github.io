import type { WorldManifest } from './types/world-stream.ts';
import { requiredValue } from './types/assert.ts';
interface ClientBundleOptions {
  manifest: WorldManifest | null;
  materialAtlas: string;
  alpineArtwork: string;
  billboards: Record<string, string>;
  researchArtwork: Record<string, string>;
}
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { build } from 'esbuild';
import ts from 'typescript';

const root = fileURLToPath(new URL('./', import.meta.url));

/** Asset inlining edits initializer AST ranges, preserving module scope and
 * accepting ordinary formatting, comments and multiline imports. */
export function replaceInitializers(source: string, replacements: Record<string, string>): string {
  const ast = ts.createSourceFile(
    'module.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const edits: { start: number; end: number; name: string; value: string }[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      Object.hasOwn(replacements, node.name.text)
    )
      edits.push({
        start: node.initializer.getStart(ast),
        end: node.initializer.end,
        name: node.name.text,
        value: replacements[node.name.text],
      });
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const name of Object.keys(replacements))
    if (!edits.some((e) => e.name === name)) throw new Error('Missing asset binding: ' + name);
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.value + source.slice(edit.end);
  return source;
}

export async function bundleClient({
  manifest,
  materialAtlas,
  alpineArtwork,
  billboards,
  researchArtwork,
}: ClientBundleOptions) {
  const patches: Record<string, Record<string, string>> = {
    'world-stream.ts': {
      COMPILED_WORLD: JSON.stringify(manifest),
      worldCacheBase: "new URL('./world-cache/',document.baseURI).href",
    },
    'materials.ts': {
      atlasURL: JSON.stringify({
        href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(materialAtlas),
      }),
    },
    'alpine-materials.ts': {
      alpineAtlasURL: JSON.stringify({
        href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(alpineArtwork),
      }),
    },
    'billboards.ts': { billboardAssetURL: 'name=>(' + JSON.stringify(billboards) + ')[name]' },
    'research-art.ts': {
      researchAssetURL:
        "name=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent((" +
        JSON.stringify(researchArtwork) +
        ')[name])',
    },
  };
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['world.ts'],
    outfile: 'explore.js',
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    write: false,
    sourcemap: 'external',
    sourcesContent: true,
    metafile: true,
    minifySyntax: true,
    minifyWhitespace: true,
    legalComments: 'none',
    banner: { js: "'use strict';" },
    plugins: [
      {
        name: 'inline-game-assets',
        setup(builder) {
          builder.onLoad({ filter: /\.(?:js|ts)$/ }, async (args) => {
            const name = relative(root, args.path).replace(/^sf[\\/]/, '');
            if (!patches[name]) return;
            return {
              contents: replaceInitializers(await readFile(args.path, 'utf8'), patches[name]),
              loader: 'ts',
            };
          });
        },
      },
    ],
  });
  return {
    code: requiredValue(
      result.outputFiles.find((file) => file.path.endsWith('.js')),
      'The client JavaScript bundle is missing.',
    ).text,
    map: requiredValue(
      result.outputFiles.find((file) => file.path.endsWith('.map')),
      'The client source map is missing.',
    ).text,
    metafile: result.metafile,
  };
}
