import { mapTuple } from './helpers/geometry.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle } from '../geometry.ts';
import { COMMERCIAL_ROOF_STYLES, commercialRoofPlan, drawCommercialRoof } from '../rooftops.ts';

test('all eight roof layouts fit shallow and broad building footprints within a small static mesh budget', () => {
  for (const style of COMMERCIAL_ROOF_STYLES)
    for (const [w, d] of [
      [1.46, 1.46] satisfies [number, number],
      [3.2, 0.95] satisfies [number, number],
      [4.6, 2.7] satisfies [number, number],
      [6, 4] satisfies [number, number],
    ]) {
      const m = new Mesh(),
        plan = drawCommercialRoof(m, { x: 10, y: 8, z: 20, w, d, seed: 0.73, style });
      assert.ok(m.data.every(Number.isFinite));
      assert.ok(m.data.length / 33 < 1600, style + ' exceeds the roof mesh budget');
      assert.ok(plan.height > 0.1 && plan.height < 1.2);
      assert.match(plan.color, /^#[a-f0-9]{6}$/);
      for (let i = 0; i < m.data.length; i += 11) {
        assert.ok(
          m.data[i] >= 10 - 1e-7 && m.data[i] <= 10 + w + 1e-7,
          style + ' extends off the side',
        );
        assert.ok(
          m.data[i + 2] >= 20 - 1e-7 && m.data[i + 2] <= 20 + d + 1e-7,
          style + ' extends over the street',
        );
        assert.ok(m.data[i + 1] >= 8 - 1e-7 && m.data[i + 1] <= 8 + plan.height + 1e-7);
      }
    }
});

test('roof designs and paint are repeatable but vary across building locations and seeds', () => {
  const styles = new Set(),
    colors = new Set(),
    meshes: number[][] = [];
  for (let i = 0; i < 80; i++) {
    const options = { x: i * 0.71, z: i * 0.37, w: 4, d: 2.5, seed: i * 0.13 },
      plan = commercialRoofPlan(options);
    assert.deepEqual(plan, commercialRoofPlan({ ...options }));
    styles.add(plan.style);
    colors.add(plan.color);
    if (i < 2) {
      const mesh = new Mesh();
      drawCommercialRoof(mesh, { ...options, y: 3 });
      meshes.push(mesh.data);
    }
  }
  assert.equal(styles.size, 8);
  assert.ok(colors.size > 60);
  assert.notDeepEqual(meshes[0], meshes[1]);
});

test('pitched copper and sawtooth surfaces face upward and remain visible with back-face culling', () => {
  for (const style of ['copper-shed', 'northlights'] satisfies [string, string]) {
    const m = new Mesh();
    drawCommercialRoof(m, { x: 0, y: 0, z: 0, w: 4, d: 2.5, style });
    const ray = {
        origin: [1.6, 10, 0.58] satisfies [number, number, number],
        dir: [0, -1, 0] satisfies [number, number, number],
      },
      heights: number[] = [];
    for (let i = 0; i < m.data.length; i += 33)
      if (m.data[i + 4] > 0.1) {
        const distance = rayTriangle(
          ray,
          ...mapTuple([0, 11, 22] satisfies [number, number, number], (k) =>
            m.data.slice(i + k, i + k + 3),
          ),
        );
        if (distance !== null) heights.push(10 - distance);
      }
    assert.ok(Math.max(...heights) > 0.18, style + ' only exposes the flat deck from above');
  }
});
