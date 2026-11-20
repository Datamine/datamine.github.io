import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { build } from 'esbuild';
import { parse } from 'espree';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Asset inlining edits initializer AST ranges, preserving module scope and
 * accepting ordinary formatting, comments and multiline imports. */
export function replaceInitializers(source, replacements) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true }),
    edits = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      Object.hasOwn(replacements, node.id.name)
    )
      edits.push({ name: node.id.name, range: node.init.range, value: replacements[node.id.name] });
    for (const [key, value] of Object.entries(node))
      if (!['range', 'loc', 'tokens', 'comments'].includes(key)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
  };
  visit(ast);
  for (const name of Object.keys(replacements))
    if (!edits.some((edit) => edit.name === name)) throw Error('Missing asset binding: ' + name);
  for (const edit of edits.sort((a, b) => b.range[0] - a.range[0]))
    source = source.slice(0, edit.range[0]) + edit.value + source.slice(edit.range[1]);
  return source;
}

export async function bundleClient({
  manifest,
  materialAtlas,
  alpineArtwork,
  billboards,
  researchArtwork,
}) {
  const patches = {
    'world-stream.js': {
      COMPILED_WORLD: JSON.stringify(manifest),
      worldCacheBase: "new URL('./sf/world-cache/',document.baseURI).href",
    },
    'materials.js': {
      atlasURL: JSON.stringify({
        href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(materialAtlas),
      }),
    },
    'alpine-materials.js': {
      alpineAtlasURL: JSON.stringify({
        href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(alpineArtwork),
      }),
    },
    'billboards.js': { billboardAssetURL: 'name=>(' + JSON.stringify(billboards) + ')[name]' },
    'research-art.js': {
      researchAssetURL:
        "name=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent((" +
        JSON.stringify(researchArtwork) +
        ')[name])',
    },
  };
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['sf/world.js'],
    outfile: 'sf/explore.js',
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
          builder.onLoad({ filter: /\.js$/ }, async (args) => {
            const name = relative(root, args.path).replace(/^sf[\\/]/, '');
            if (!patches[name]) return;
            return {
              contents: replaceInitializers(await readFile(args.path, 'utf8'), patches[name]),
              loader: 'js',
            };
          });
        },
      },
    ],
  });
  return {
    code: result.outputFiles.find((file) => file.path.endsWith('.js')).text,
    map: result.outputFiles.find((file) => file.path.endsWith('.map')).text,
    metafile: result.metafile,
  };
}
