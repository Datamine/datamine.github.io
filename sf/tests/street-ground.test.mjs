import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeStreetHeightField } from '../street-ground.js';
import { levelHeightField, cutBuildingPlot } from '../geography.js';

test('road and curb share a level cross-section without removing the hill along the street', () => {
  const resolution = 4,
    field = Array.from({ length: 81 }, (_, z) =>
      Array.from({ length: 81 }, (_, x) => 1 + (x / resolution) * 0.08 + (z / resolution) * 0.45),
    );
  const original = field.map((row) => row.slice());
  gradeStreetHeightField(field, resolution, {
    points: [
      [2, 10],
      [18, 10],
    ],
    halfWidth: 0.5,
    curbWidth: 0.25,
  });
  for (let x = 16; x <= 64; x++) {
    for (let z = 37; z <= 43; z++)
      assert.ok(
        Math.abs(field[z][x] - field[40][x]) < 1e-10,
        'road and curbs must sit on the same cross-section',
      );
    assert.ok(
      Math.abs(field[40][x] - (1 + (x / resolution) * 0.08 + 10 * 0.45)) < 1e-10,
      'the natural longitudinal grade remains',
    );
    assert.equal(
      field[24][x],
      original[24][x],
      'the neighborhood beyond the shoulder is unchanged',
    );
  }
});

test('landmark pad blending and house excavation cannot move protected paving vertices', () => {
  for (const edit of [levelHeightField, cutBuildingPlot]) {
    const field = Array.from({ length: 41 }, (_, z) =>
        Array.from({ length: 41 }, (_, x) => 1 + x * 0.03 + z * 0.04),
      ),
      before = field.map((row) => row.slice());
    edit(field, 4, { cx: 5, cz: 5, w: 4, d: 4, height: 0.5 }, { protect: (x, z) => z >= 5 });
    let changed = 0;
    for (let z = 0; z < 41; z++)
      for (let x = 0; x < 41; x++) {
        if (z / 4 >= 5)
          assert.equal(field[z][x], before[z][x], 'private ground edits must preserve the road');
        else if (field[z][x] !== before[z][x]) changed++;
      }
    assert.ok(changed > 0, 'private building pads still get their own foundations');
  }
});
