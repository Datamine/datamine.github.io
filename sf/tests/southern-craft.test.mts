import { registerFixtureObject, mapTuple } from './helpers/geometry.mts';

import { VILLAGE_PAVILIONS } from '../southern-village-layout.ts';
import { drawSouthernHouseDetails } from '../southern-house-details.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle } from '../geometry.ts';
import { SOUTHERN_CRAFT, craftSiteFits, craftFootprint } from '../southern-craft-layout.ts';
import { SOUTHERN_PALETTES } from '../neighborhood-palette.ts';
import { SOUTHERN_GREENWAYS, COASTAL_GARDEN_HOMES } from '../southern-greenways.ts';
import { drawCraftGround, drawSouthernCraftSite, CRAFT_SHOPS } from '../southern-craft.ts';
import { createHousing } from '../housing.ts';
import { MATERIAL_IDS } from '../materials.ts';

test('curated southern gardens clear every authored home, protected facility, road and public trail', () => {
  assert.ok(SOUTHERN_CRAFT.length + VILLAGE_PAVILIONS.length >= 8);
  const placed: Readonly<import('../southern-craft-layout.ts').CraftPlot>[] = [];
  for (const p of SOUTHERN_CRAFT) {
    assert.ok(craftSiteFits(p, placed), p.id);
    assert.ok(Math.abs(p.rotation / (Math.PI / 2) - Math.round(p.rotation / (Math.PI / 2))) < 1e-8);
    placed.push(p);
  }
  assert.equal(COASTAL_GARDEN_HOMES.length, 6);
  assert.equal(SOUTHERN_GREENWAYS.length, 2);
});
test('courtyard paving is clipped to the terrain triangles instead of hovering over the hills', () => {
  // Piecewise planar terrain includes the same cell diagonal as the world.
  const height = (x: number, z: number) => {
    const i = Math.floor(x * 2) / 2,
      j = Math.floor(z * 2) / 2,
      u = (x - i) * 2,
      v = (z - j) * 2,
      f = (x: number, z: number) => 1 + x * 0.11 + z * 0.07 + Math.sin(x * 3.7 + z * 1.2) * 0.16,
      a = f(i, j),
      b = f(i + 0.5, j),
      c = f(i + 0.5, j + 0.5),
      d = f(i, j + 0.5);
    return u >= v ? a + (b - a) * u + (c - b) * v : a + (c - d) * u + (d - a) * v;
  };
  const polygon = [
      [0.13, 0.21] satisfies [number, number],
      [2.37, 0.21] satisfies [number, number],
      [2.37, 1.66] satisfies [number, number],
      [0.13, 1.66] satisfies [number, number],
    ],
    m = new Mesh();
  drawCraftGround(m, { height }, polygon);
  assert.ok(m.data.every(Number.isFinite));
  for (const [x, z] of [
    [0.32, 0.43] satisfies [number, number],
    [0.88, 0.73] satisfies [number, number],
    [1.63, 1.12] satisfies [number, number],
    [2.13, 1.47] satisfies [number, number],
  ]) {
    const ray = {
        origin: [x, 10, z] satisfies [number, number, number],
        dir: [0, -1, 0] satisfies [number, number, number],
      },
      hits: number[] = [];
    for (let i = 0; i < m.data.length; i += 33) {
      const t = rayTriangle(
        ray,
        ...mapTuple([0, 11, 22] satisfies [number, number, number], (k) =>
          m.data.slice(i + k, i + k + 3),
        ),
      );
      if (t !== null) hits.push(t);
    }
    assert.ok(hits.length);
    assert.ok(Math.abs(10 - Math.min(...hits) - height(x, z) - 0.012) < 1e-7);
  }
});
test('five southern house families have distinct silhouettes, coordinated colors and finite textured meshes', () => {
  const roofs = new Set();
  for (const kind of Object.keys(SOUTHERN_PALETTES)) {
    const m = new Mesh(),
      housing = createHousing({
        terrainHeight: () => 1.15,
        naturalHeight: () => 1.15,
        cutHousePlot: () => {},
        getSceneMesh: () => m,
        registerObject: registerFixtureObject,
        rectangle: () => [],
        sashWindow: () => {},
      });
    const o = housing.makeTownhomeRow(10, 10, 4.8, 2.6, 2, 0.43, 0, kind);
    assert.ok(m.data.every(Number.isFinite), kind);
    assert.ok(m.data.length / 33 < 12000);
    assert.equal(o.district, kind);
    assert.ok('houses' in o);
    assert.ok(o.houses.every((h: { storeys: number; H: number }) => h.storeys === 2 && h.H < 3.2));
    o.houses.forEach((h: { roof: unknown }) => roofs.add(h.roof));
  }
  assert.ok(roofs.size >= 3);
  for (const name of ['limewash', 'herringbone', 'fishscale', 'canvasWeave'] satisfies [
    string,
    string,
    string,
    string,
  ])
    assert.ok(Number.isInteger(MATERIAL_IDS[name]));
});
test('markets, creative workshops and arcades share clear entrances and bounded static geometry', () => {
  const terrain = { height: (x: number, z: number) => 1.15 + x * 0.015 + z * 0.008 };
  for (const [i, kind] of (
    ['market', 'studio', 'arcade', 'garden'] satisfies [string, string, string, string]
  ).entries()) {
    const p = {
        id: 'test-' + kind,
        x: 20,
        z: 115,
        w: 3.3,
        d: 2.7,
        rotation: (i * Math.PI) / 2,
        kind,
        index: i,
        palette: SOUTHERN_PALETTES.coastal,
        entry: { x: 20, y: 118 },
      },
      m = new Mesh(),
      s = drawSouthernCraftSite(m, p, terrain, new Map(), CRAFT_SHOPS[i % 3]);
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 6000);
    assert.ok(s.navigationPolygons.length > 0);
    assert.ok(s.count > 0);
    assert.deepEqual(s.footprint, craftFootprint(p));
    assert.ok(s.lo.every(Number.isFinite) && s.hi.every(Number.isFinite));
  }
});

test('hillside houses shortened to one floor do not retain floating upper-storey shutters', () => {
  const m = new Mesh(),
    p = {
      left: 0,
      width: 1.4,
      face: 1,
      floor: 2,
      H: 1.65,
      storeys: 1,
      shape: 0.4,
      door: 0.14,
      dw: 0.32,
      color: '#78aaa4',
      bx: 0.98,
      bw: 0.65,
    };
  drawSouthernHouseDetails(m, 'coastal', p);
  for (let i = 1; i < m.data.length; i += 11)
    assert.ok(m.data[i] < p.floor + p.H, 'decoration floats above the shortened house');
});
