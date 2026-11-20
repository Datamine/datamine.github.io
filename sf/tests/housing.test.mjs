import test from 'node:test';
import assert from 'node:assert/strict';
import { planHouse, ROOF_STYLES } from '../housing.js';
import { cutBuildingPlot } from '../geography.js';

test('a steep uphill lot anchors its entrance to the street instead of a tall plinth', () => {
  const naturalHeight = (x, z) => 12 - z * 1.1,
    point = (x, z) => [x, z];
  const p = planHouse({ left: 0, width: 1.45, depth: 4, point, naturalHeight, seed: 0.45 });
  assert.ok(Math.abs(p.floor - naturalHeight(p.door + p.dw / 2, p.entry) - 0.24) < 1e-10);
  assert.ok(
    naturalHeight(0.7, p.fullBack) - p.floor > 3,
    'regression needs a genuinely steep back lot',
  );
  assert.ok(p.back > p.fullBack, 'house should leave a rear terrace on a steep plot');
  assert.ok(p.face - p.back >= 0.95);
});

test('curb-aligned houses retain their entrance height and varied roof silhouettes at every orientation', () => {
  const styles = new Set();
  for (let i = 0; i < 8; i++)
    for (const depth of [1.5, 2, 3.75])
      for (const seed of [0.04, 0.35, 0.65, 0.9]) {
        const angle = (i * Math.PI) / 4,
          point = (u, v) => [
            8 + u * Math.cos(angle) - v * Math.sin(angle),
            8 + u * Math.sin(angle) + v * Math.cos(angle),
          ];
        const p = planHouse({
          left: 0,
          width: 1.45,
          depth,
          point,
          naturalHeight: (x, z) => x * 0.4 + z * 0.7,
          seed,
        });
        assert.ok(Math.abs(p.floor - p.entryHeight - 0.24) < 1e-10);
        assert.ok(p.face > p.back && p.entry > p.face);
        assert.ok(p.H < 2.65 && p.storeys <= 2);
        styles.add(p.roof);
      }
  assert.deepEqual([...styles], ROOF_STYLES);
});

test('private excavations preserve every terrain vertex outside the rotated plot', () => {
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      c = Math.cos(angle),
      s = Math.sin(angle),
      pad = { cx: 4, cz: 4, w: 1.4, d: 2.7, angle, height: 2 };
    const field = Array.from({ length: 33 }, (_, z) =>
        Array.from({ length: 33 }, (_, x) => 4 + x * 0.04 + z * 0.08),
      ),
      before = field.map((row) => row.slice());
    cutBuildingPlot(field, 4, pad);
    let count = 0;
    for (let z = 0; z < 33; z++)
      for (let x = 0; x < 33; x++) {
        const dx = x / 4 - pad.cx,
          dz = z / 4 - pad.cz,
          inside =
            Math.abs(dx * c + dz * s) <= pad.w / 2 && Math.abs(-dx * s + dz * c) <= pad.d / 2;
        assert.equal(field[z][x], inside ? pad.height : before[z][x]);
        if (inside) count++;
      }
    assert.ok(count > 40);
  }
});

test('excavation leaves downhill ground intact instead of raising a giant building plinth', () => {
  for (const height of [2, 4]) {
    const field = Array.from({ length: 33 }, (_, z) =>
        Array.from({ length: 33 }, (_, x) => 1 + x * 0.12 + z * 0.03),
      ),
      before = field.map((row) => row.slice());
    cutBuildingPlot(field, 4, { cx: 4, cz: 4, w: 2, d: 3, angle: 0.7, height, onlyLower: true });
    for (let z = 0; z < 33; z++)
      for (let x = 0; x < 33; x++) {
        assert.ok(field[z][x] <= before[z][x]);
        if (before[z][x] < height) assert.equal(field[z][x], before[z][x]);
      }
  }
});
