import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { renderExplore, renderDevelopment } from '../build.mjs';
import { readCompiledManifest, worldInputVersion } from '../build-world.mjs';

const pageURL = new URL('../../index.html', import.meta.url);

test('the built experience is a classic static client with embedded texture atlases', async () => {
  const source = await readFile(pageURL, 'utf8'),
    html = await renderExplore(source);
  assert.ok(html.includes('data-sf-entry="explore"'));
  assert.doesNotMatch(html, /<script[^>]*type="module"/);
  assert.doesNotMatch(html, /import\.meta/);
  assert.ok(html.includes('data:image/svg+xml;charset=utf-8,'));
  const runtime = html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/)?.[1];
  assert.ok(runtime, 'missing standalone runtime');
  assert.doesNotThrow(() => new Script(runtime));
  // Run scoped module initializers without exposing a browser DOM. This
  // catches import cycles/TDZ errors independently of the UI smoke test.
  assert.doesNotThrow(() =>
    new Script(runtime).runInNewContext(
      { URL, TextEncoder, TextDecoder, document: { baseURI: 'https://example.test/explore.html' } },
      { timeout: 5000 },
    ),
  );
  assert.match(html, /sourceMappingURL=sf\/explore\.js\.map/);
  assert.doesNotMatch(
    html,
    /sf-atlas|openCityMap|navigateFromMap|Press C to open/,
    'the larger map must not be present or reachable',
  );
  assert.ok(html.includes('id="sf-icon-legend"'));
  assert.ok(html.includes('id="sf-place-markers"'));
  for (const link of source.matchAll(/<a\b[^>]*href=["'][^"']+["'][^>]*>/g))
    assert.ok(html.includes(link[0]), `lost homepage link: ${link[0]}`);
});

test('the development view loads the source modules without changing the homepage', async () => {
  const source = await readFile(pageURL, 'utf8'),
    html = renderDevelopment(source);
  assert.ok(html.includes('data-sf-entry="explore"'));
  assert.ok(html.includes('<script type="module" src="./sf/world.js"></script>'));
  assert.ok(source.includes("new URL('./explore.html',window.location.href)"));
  assert.ok(!source.includes('data-sf-entry="explore"'));
});

test('the checked-in experience has been rebuilt from the current sources', async () => {
  const source = await readFile(pageURL, 'utf8'),
    built = await readFile(new URL('../../explore.html', import.meta.url), 'utf8');
  assert.equal(
    built,
    await renderExplore(source),
    'Run node sf/build.mjs after editing the homepage, world sources or graphics.',
  );
});

test('compiled map data matches the source version and uses one immutable generation', async () => {
  const manifest = await readCompiledManifest();
  assert.equal(
    manifest.version,
    await worldInputVersion(),
    'Run node sf/build.mjs to refresh map chunks.',
  );
  assert.equal(manifest.tileSize, 12);
  assert.ok(manifest.chunks.length > 20);
  assert.ok(manifest.metadata.bytes > 0);
  for (const chunk of [manifest.metadata, ...manifest.chunks])
    assert.ok(chunk.file.startsWith(manifest.version + '/'));
  assert.equal(new Set(manifest.chunks.map((c) => c.id)).size, manifest.chunks.length);
});
