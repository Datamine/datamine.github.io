import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_SIZE,
  REFERENCE_SIZE,
  PARK_BOUNDS,
  PANHANDLE,
  inBounds,
  boundsPolygon,
  SF_HILLS,
  sfElevation,
  sfHillCover,
  woodedHillPark,
  levelHeightField,
} from '../geography.js';

test('96-tile geography keeps the long, narrow Panhandle attached to Golden Gate Park', () => {
  assert.equal(WORLD_SIZE, 96);
  assert.equal(WORLD_SIZE / REFERENCE_SIZE, 1.5);
  assert.equal(PANHANDLE.west, PARK_BOUNDS.east);
  assert.ok(PANHANDLE.north > PARK_BOUNDS.north && PANHANDLE.south < PARK_BOUNDS.south);
  assert.ok((PANHANDLE.east - PANHANDLE.west) / (PANHANDLE.south - PANHANDLE.north) > 4.5);
  for (const [x, z] of boundsPolygon(PANHANDLE)) assert.ok(inBounds(x, z, PANHANDLE));
  assert.ok(!inBounds(34, PANHANDLE.north - 0.01, PANHANDLE));
  assert.ok(!inBounds(PANHANDLE.east + 0.01, 31.5, PANHANDLE));
});

test('central summits, northern hills and low valleys remain visibly distinct', () => {
  const elevations = Object.fromEntries(SF_HILLS.map((h) => [h.name, sfElevation(h.x, h.y)]));
  assert.ok(elevations['Mount Davidson'] > 9.5 && elevations['Mount Davidson'] < 11.5);
  assert.equal(Math.max(...Object.values(elevations)), elevations['Mount Davidson']);
  assert.ok(elevations['North Twin Peak'] > 9 && elevations['South Twin Peak'] > 9);
  assert.ok(
    elevations['North Twin Peak'] / elevations['Pacific Heights'] < 2,
    'central hills should blend into the northern neighborhoods',
  );
  const saddle = sfElevation(29, 42.9);
  assert.ok(elevations['North Twin Peak'] - saddle > 0.5);
  assert.ok(elevations['South Twin Peak'] - saddle > 0.5);
  for (const name of ['Nob Hill', 'Russian Hill', 'Telegraph Hill'])
    assert.ok(elevations[name] > 4, name);
  for (const [name, x, z] of [
    ['SoMa', 44, 34],
    ['Mission valley', 38, 43],
    ['Marina', 36, 11],
  ]) {
    assert.ok(sfElevation(x, z) < 2, name);
  }
  assert.ok(sfElevation(30, 31.5) > sfElevation(11, 31.5) + 0.5, 'park rises toward the east');
  assert.equal(sfHillCover(29.1, 41.6), 'rock');
  assert.equal(sfHillCover(29, 40), 'scrub');
  assert.equal(sfHillCover(22, 31), 'grass');
  assert.ok(woodedHillPark(25.6, 39.7) && woodedHillPark(42, 51));
});

test('unmodified relief is continuous and finite across the complete walking grid', () => {
  const scale = WORLD_SIZE / REFERENCE_SIZE,
    step = 0.5;
  let maxJump = 0;
  for (let z = 0; z < WORLD_SIZE; z += step)
    for (let x = 0; x < WORLD_SIZE; x += step) {
      const h = sfElevation(x / scale, z / scale);
      assert.ok(Number.isFinite(h) && h > 0 && h < 11.5);
      maxJump = Math.max(
        maxJump,
        Math.abs(h - sfElevation((x + step) / scale, z / scale)),
        Math.abs(h - sfElevation(x / scale, (z + step) / scale)),
      );
    }
  assert.ok(maxJump < 0.85, `abrupt terrain step: ${maxJump}`);
});

test('rotated building pads level interiors without flattening the surrounding hill', () => {
  const resolution = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      c = Math.cos(angle),
      s = Math.sin(angle),
      pad = { cx: 8, cz: 8, w: 4, d: 3, angle, height: 3 };
    const field = Array.from({ length: 33 }, (_, z) =>
      Array.from({ length: 33 }, (_, x) => 1 + x * 0.07 + z * 0.04),
    );
    const before = field.map((row) => [...row]),
      result = levelHeightField(field, resolution, pad);
    assert.ok(result.changed > 20 && result.maxChange > 0);
    for (let z = 0; z < field.length; z++)
      for (let x = 0; x < field.length; x++) {
        const dx = x / resolution - pad.cx,
          dz = z / resolution - pad.cz,
          u = dx * c + dz * s,
          v = -dx * s + dz * c;
        const outside = Math.hypot(
          Math.max(0, Math.abs(u) - pad.w / 2),
          Math.max(0, Math.abs(v) - pad.d / 2),
        );
        if (outside <= 0.15) assert.equal(field[z][x], pad.height);
        if (outside >= 0.6) assert.equal(field[z][x], before[z][x]);
        assert.ok(Number.isFinite(field[z][x]));
      }
  }
});
