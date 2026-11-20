import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Script } from 'node:vm';
import { build } from 'esbuild';
import { replaceInitializers } from '../build-bundle.mjs';
import { BILLBOARD_ADS } from '../../billboards/catalog.js';
import { BILLBOARD_ART } from '../billboards.js';
import { billboardDataURL, readBillboardAssets } from '../build-billboards.mjs';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4nGP4z8DwHxkzkC4AADxAH+HggXe0AAAAAElFTkSuQmCC',
  'base64',
);

test('every normal ad is editable in the top-level directory, separate from its hidden message', async () => {
  const assets = await readBillboardAssets();
  assert.equal(BILLBOARD_ADS.length, 11);
  assert.equal(BILLBOARD_ART.length, BILLBOARD_ADS.length);
  for (const ad of BILLBOARD_ADS) {
    const art = BILLBOARD_ART.find((a) => a.id === ad.id);
    assert.ok(assets[ad.file]);
    assert.equal(
      new URL(art.src).pathname,
      new URL('../../billboards/' + ad.file, import.meta.url).pathname,
    );
    assert.ok(art.message);
    assert.equal(ad.message, undefined);
  }
});

test('a custom PNG and SVG survive the real standalone source embedding and keep They Live messages', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'sf-billboards-'));
  try {
    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><text>My ad: $ &amp; café</text></svg>',
      ads = [
        { id: 'ai-openai', file: 'my ad.png', color: '#123456' },
        { id: 'ts-cola', file: 'my-ad.svg', color: '#654321' },
      ];
    await Promise.all([
      writeFile(join(folder, ads[0].file), png),
      writeFile(join(folder, ads[1].file), svg),
    ]);
    const assets = await readBillboardAssets(ads, pathToFileURL(folder + '/')),
      source = replaceInitializers(
        await readFile(new URL('../billboards.js', import.meta.url), 'utf8'),
        { billboardAssetURL: 'name=>(' + JSON.stringify(assets) + ')[name]' },
      );
    const bundle = await build({
      stdin: { contents: source, sourcefile: 'billboards.js' },
      bundle: true,
      write: false,
      format: 'iife',
      globalName: 'Billboards',
      plugins: [
        {
          name: 'catalog-fixture',
          setup(builder) {
            builder.onResolve({ filter: /catalog\.js$/ }, () => ({
              path: 'catalog',
              namespace: 'fixture',
            }));
            builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
              contents: 'export const BILLBOARD_ADS=' + JSON.stringify(ads),
            }));
          },
        },
      ],
    });
    const output = bundle.outputFiles[0].text;
    assert.doesNotMatch(output, /import\.meta/);
    const art = new Script(output + '\nBillboards.BILLBOARD_ART;').runInNewContext();
    assert.ok(art[0].src.startsWith('data:image/png;base64,'));
    assert.deepEqual(Buffer.from(art[0].src.split(',')[1], 'base64'), png);
    assert.equal(art[0].message, 'BUY');
    assert.equal(decodeURIComponent(art[1].src.slice(art[1].src.indexOf(',') + 1)), svg);
    assert.equal(art[1].message, 'CONSUME');
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('asset mistakes fail the build with actionable errors', async () => {
  assert.throws(() => billboardDataURL('ad.svg', png), /not an SVG/);
  assert.throws(() => billboardDataURL('ad.png', Buffer.from('<svg/>')), /not a PNG/);
  assert.throws(() => billboardDataURL('ad.jpg', png), /\.svg or \.png/);
  await assert.rejects(
    readBillboardAssets([{ id: 'test', file: '../outside.svg' }]),
    /directly in billboards/,
  );
  await assert.rejects(
    readBillboardAssets([{ id: 'test', file: 'missing.png' }]),
    /Cannot read billboard missing.png/,
  );
  await assert.rejects(
    readBillboardAssets([
      { id: 'test', file: 'a.svg' },
      { id: 'test', file: 'b.svg' },
    ]),
    /unique/,
  );
});
