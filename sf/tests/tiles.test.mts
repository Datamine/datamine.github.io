import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runTileRuleTests } from '../tiles.ts';
import { MATERIAL_IDS } from '../materials.ts';
import { MATERIAL_ATLAS, MATERIAL_CATALOG } from '../material-catalog.mts';
import { renderMaterialAssets } from '../build-materials.mts';

test('tile coverage, connections, curbs, junctions and exact boundaries pass their regression suite', () => {
  assert.deepEqual(runTileRuleTests(), { ok: true, checks: 27 });
});

test('the generated material atlas puts each named source in its catalog GPU slot', async () => {
  const svg = await readFile(new URL('../textures/sf-materials.svg', import.meta.url), 'utf8');
  assert.match(
    svg,
    new RegExp(
      '<svg[^>]*width="' +
        MATERIAL_ATLAS.columns * MATERIAL_ATLAS.cellSize +
        '"[^>]*height="' +
        MATERIAL_ATLAS.rows * MATERIAL_ATLAS.cellSize +
        '"',
    ),
  );
  const { columns, rows, cellSize } = MATERIAL_ATLAS;
  for (const [name, id] of Object.entries(MATERIAL_IDS)) {
    assert.ok(svg.includes(`id="${name}"`), `missing ${name} texture`);
    const swatch = `<g id="swatch-${name}" data-material="${name}" data-slot="${id}" transform="translate(${(id % columns) * cellSize} ${Math.floor(id / columns) * cellSize})">`;
    assert.ok(svg.includes(swatch), `${name} is in the wrong GPU atlas slot`);
  }
  assert.equal(new Set(Object.values(MATERIAL_IDS)).size, MATERIAL_CATALOG.length);
  assert.ok(MATERIAL_CATALOG.length <= columns * rows);
  for (const dimension of [columns * cellSize, rows * cellSize] satisfies [number, number])
    assert.equal(
      dimension & (dimension - 1),
      0,
      'mipmapped textures require power-of-two dimensions',
    );
  assert.equal(MATERIAL_IDS.concrete, 15, 'existing vertex material IDs must remain stable');
});

test('each material has a labeled standalone SVG and a visual reference entry', async () => {
  const preview = await readFile(
    new URL('../textures/materials/preview.html', import.meta.url),
    'utf8',
  );
  for (const material of MATERIAL_CATALOG) {
    const svg = await readFile(
      new URL('../textures/materials/' + material.source, import.meta.url),
      'utf8',
    );
    assert.match(svg, /<svg[^>]*width="256"[^>]*height="256"/);
    assert.ok(svg.includes('<title>' + material.label + '</title>'));
    assert.ok(svg.includes('<desc>'));
    assert.ok(preview.includes('src="' + material.source + '"'));
    assert.ok(preview.includes('<code>' + material.name + '</code> · slot ' + material.slot));
    assert.equal(MATERIAL_IDS[material.name], material.slot);
  }
});

test('the generated atlas and visual reference are current with the editable sources', async () => {
  const [atlas, preview, rendered] = await Promise.all([
    readFile(new URL('../textures/sf-materials.svg', import.meta.url), 'utf8'),
    readFile(new URL('../textures/materials/preview.html', import.meta.url), 'utf8'),
    renderMaterialAssets(),
  ]);
  assert.equal(atlas, rendered.atlas, 'Run npm run build after editing material sources.');
  assert.equal(preview, rendered.preview, 'Run npm run build after editing the material catalog.');
});
