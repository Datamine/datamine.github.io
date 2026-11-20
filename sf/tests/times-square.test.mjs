import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle } from '../geometry.js';
import { BILLBOARD_ART } from '../billboards.js';
import { TIMES_SQUARE, TIMES_SQUARE_BUILDINGS, timesSquareWalkable } from '../southern-layout.js';
import { drawTimesSquare, TIMES_SQUARE_SIGNS } from '../times-square.js';
import { createAirship, AIRSHIP_TERMINAL } from '../airship.js';

test('Times Square has illuminated billboards and the exact Hillsborough examination', () => {
  const mesh = new Mesh(),
    signs = new Map(
      [...TIMES_SQUARE_SIGNS, ...BILLBOARD_ART.map((a) => a.id)].map((s) => [
        s,
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ]),
    ),
    site = drawTimesSquare(mesh, signs);
  assert.equal(site.description, 'In my back yard?');
  assert.ok(mesh.data.every(Number.isFinite));
  assert.ok(mesh.data.length / 33 < 14000);
  let glow = 0;
  for (let i = 0; i < mesh.data.length; i += 11) if (mesh.data[i + 9] === -1.25) glow++;
  let artwork = 0;
  for (let i = 0; i < mesh.data.length; i += 11)
    if (mesh.data[i + 9] >= 0 && mesh.data[i + 6] > 1.05) artwork++;
  assert.ok(artwork > 150, 'billboard faces sample real artwork');
  assert.ok(glow > 100);
  assert.ok(site.hi[1] - site.base > 10);
  assert.ok(
    TIMES_SQUARE.x < AIRSHIP_TERMINAL.x && TIMES_SQUARE.z > AIRSHIP_TERMINAL.z,
    'Hillsborough belongs southwest of the airport',
  );
});

test('billboard artwork sits in front of covered windows on every facade', () => {
  const mesh = new Mesh(),
    signs = new Map(
      BILLBOARD_ART.map((a) => [
        a.id,
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ]),
    );
  drawTimesSquare(mesh, signs);
  const ads = [],
    windows = [];
  for (let i = 0; i < mesh.data.length; i += 33) {
    const triangle = {
      points: [0, 11, 22].map((j) => mesh.data.slice(i + j, i + j + 3)),
      normal: mesh.data.slice(i + 3, i + 6),
    };
    if (mesh.data[i + 9] === -1.05) windows.push(triangle);
    if (mesh.data[i + 6] > 1.05 && mesh.data[i + 9] >= 0) ads.push(triangle);
  }
  let covered = 0;
  const facades = new Set();
  for (const window of windows)
    for (const weights of [
      [1 / 3, 1 / 3, 1 / 3],
      [0.6, 0.2, 0.2],
      [0.2, 0.6, 0.2],
    ]) {
      const at = [0, 1, 2].map((k) =>
        window.points.reduce((sum, p, j) => sum + p[k] * weights[j], 0),
      );
      const ray = {
        origin: at.map((v, k) => v + window.normal[k] * 0.6),
        dir: window.normal.map((v) => -v),
      };
      const hits = ads
        .filter((ad) => ad.normal.reduce((sum, v, k) => sum + v * window.normal[k], 0) > 0.96)
        .map((ad) => rayTriangle(ray, ...ad.points))
        .filter((d) => d !== null && d < 0.8);
      if (!hits.length) continue;
      assert.ok(Math.min(...hits) < 0.6 - 0.02, 'a window projects through its covering billboard');
      covered++;
      facades.add(window.normal.map((v) => Math.round(v)).join(','));
    }
  assert.ok(covered > 60, 'sample many covered windows, including curved screens');
  assert.equal(facades.size, 4, 'check all four facade directions');
});

test('the square and its seating garden have coherent collision and continuous street access', () => {
  const airship = createAirship(),
    entry = TIMES_SQUARE.entry;
  for (const b of TIMES_SQUARE_BUILDINGS) assert.equal(timesSquareWalkable(b.x, b.z), false);
  assert.equal(timesSquareWalkable(63, 160), false, 'the seating garden has a solid footprint');
  for (const point of [
    { x: 60, y: 152 },
    { x: 65, y: 157 },
    { x: 62.5, y: 161.35 },
  ]) {
    const route = airship.path(entry, point, () => null);
    assert.ok(route?.length);
    let previous = entry;
    for (const p of route) {
      assert.ok(airship.segment(previous, p));
      previous = p;
    }
  }
  assert.ok(airship.path(AIRSHIP_TERMINAL.boarding, entry, () => null));
});
