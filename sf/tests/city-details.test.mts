import { registerFixtureObject } from './helpers/geometry.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { drawSomaPyramid } from '../soma-pyramid.ts';
import { createBayShipping, drawTanker } from '../shipping.ts';
import { windowAppearance, MATERIAL_IDS } from '../materials.ts';
import { createHousing, varyHousePaint } from '../housing.ts';

test('the SoMa spire has recessed facade detail and remains inside its original parcel', () => {
  const m = new Mesh();
  drawSomaPyramid(m, 0, 0, 0);
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(m.data.length / 33 > 1000 && m.data.length / 33 < 6000);
  for (let i = 0; i < m.data.length; i += 11) {
    assert.ok(Math.abs(m.data[i]) < 0.51);
    assert.ok(m.data[i + 2] >= -0.51 && m.data[i + 2] <= 0.61);
    assert.ok(m.data[i + 1] >= 0 && m.data[i + 1] < 7.75);
  }
});

test('two tankers follow a continuous channel loop at steady speeds and stay separated', () => {
  const s = createBayShipping(1.5);
  assert.equal(s.count, 2);
  assert.ok(s?.length != null, 'Missing test fixture: s.length');
  assert.deepEqual(s.sample(0), s.sample(s.length / 0.43));
  for (let t = 0; t < s.length / 0.43; t += 1) {
    const a = s.sample(t),
      b = s.sample(t + 0.05),
      other = s.sample(t, 1);
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.z - b.z) - 0.43 * 0.05) < 0.001);
    assert.ok(Math.hypot(a.x - other.x, a.z - other.z) > 10);
  }
  for (let i = 0; i < 2; i++) {
    const mesh = new Mesh();
    drawTanker(mesh, i);
    assert.ok(mesh.data.every(Number.isFinite));
    assert.ok(mesh.data.length / 33 < 6000);
  }
});

test('residential windows use restrained ambient glazing with a minority of lit rooms', () => {
  let lit = 0;
  const colors = new Set();
  for (let i = 0; i < 1000; i++) {
    const appearance = windowAppearance(i * 0.37, 2.6, i * 0.89, 11);
    assert.deepEqual(appearance, windowAppearance(i * 0.37, 2.6, i * 0.89, 11));
    assert.ok(appearance.material.window >= 0 && appearance.material.window <= 0.35);
    if (appearance.lit) lit++;
    colors.add(appearance.color);
    const mesh = new Mesh();
    mesh.quad(
      [0, 0, 0] satisfies [number, number, number],
      [1, 0, 0] satisfies [number, number, number],
      [1, 1, 0] satisfies [number, number, number],
      [0, 1, 0] satisfies [number, number, number],
      appearance.color,
      appearance.material,
    );
    assert.equal(mesh.data[9], -1.05);
  }
  assert.ok(lit > 150 && lit < 280);
  assert.ok(colors.size >= 8);
});

test('bay window glass is separated from the opaque panels behind it', () => {
  const mesh = new Mesh();
  const housing = createHousing({
    terrainHeight: () => 1,
    naturalHeight: () => 1,
    cutHousePlot: () => {},
    getSceneMesh: () => mesh,
    registerObject: registerFixtureObject,
    rectangle: () => [],
    sashWindow: () => {},
  });
  housing.makeTownhomeRow(50, 30, 2.8, 2.5, 2, 0.8, 0);
  const panels: { normal: number[]; points: number[][] }[] = [],
    glass: { normal: number[]; points: number[][] }[] = [];
  for (let i = 0; i < mesh.data.length; i += 33) {
    const tri = {
      normal: mesh.data.slice(i + 3, i + 6),
      points: ([0, 11, 22] satisfies [number, number, number]).map((j) =>
        mesh.data.slice(i + j, i + j + 3),
      ),
    };
    if (mesh.data[i + 9] === -2 - MATERIAL_IDS.clapboard) panels.push(tri);
    if (mesh.data[i + 9] === -1.05) glass.push(tri);
  }
  assert.ok(
    glass.length > 0 && panels.length > 0,
    'fixture must contain bay glazing and opaque backing',
  );
  for (const pane of glass)
    for (const wall of panels) {
      const dot = pane.normal.reduce((s, n, k) => s + n * wall.normal[k], 0);
      if (Math.abs(dot) < 0.99999) continue;
      const distance = pane.normal.reduce(
        (s, n, k) => s + n * (pane.points[0][k] - wall.points[0][k]),
        0,
      );
      assert.ok(Math.abs(distance) > 0.001, 'glass must not share a plane with a wall panel');
    }
});

test('house paint varies saturation while retaining stable, restrained brightness', () => {
  const base = '#73a9c8',
    colors = new Set(),
    saturations: number[] = [];
  for (let i = 0; i < 100; i++) {
    const color = varyHousePaint(base, i * 0.71);
    assert.equal(color, varyHousePaint(base, i * 0.71));
    colors.add(color);
    const rgb = ([1, 3, 5] satisfies [number, number, number]).map(
      (k) => parseInt(color.slice(k, k + 2), 16) / 255,
    );
    saturations.push(Math.max(...rgb) - Math.min(...rgb));
    const luma = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    assert.ok(luma > 0.56 && luma < 0.7);
  }
  assert.ok(colors.size > 70);
  assert.ok(Math.max(...saturations) - Math.min(...saturations) > 0.25);
});
