import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, rayTriangle, unit, sub } from '../geometry.ts';
import {
  AIRPORT_ADS,
  AIRPORT_BILLBOARD_PLOT,
  planAirportBillboards,
  drawAirportBillboard,
} from '../airport-billboards.ts';
import { tilePolygonOverlap } from '../tiles.ts';

const road = {
  name: 'Third Street',
  kind: 'road',
  points: [[81.54, 78] satisfies [number, number], [81.54, 96] satisfies [number, number]],
  halfWidth: 0.5,
};
test('the airport approach has east–west ads on both verges and the former house column with independent clearings', () => {
  const plans = planAirportBillboards({ routes: [road], fits: () => true });
  assert.equal(plans.length, 9);
  assert.equal(new Set(plans.map((p) => p.id)).size, 9);
  for (const side of ['east', 'west'] satisfies [string, string]) {
    const group = plans.filter((p) => p.side === side);
    assert.equal(group.length, side === 'east' ? 6 : 3);
    assert.equal(new Set(group.map((p) => p.art)).size, 3);
    for (const p of group) {
      assert.equal(p.angle, 0);
      assert.equal(p.x > p.roadX, side === 'east');
      assert.ok(Math.abs(p.x - p.roadX) > road.halfWidth + p.width / 2 + 0.25);
    }
  }
  for (const [i, p] of plans.entries())
    for (const other of plans.slice(i + 1))
      assert.ok(tilePolygonOverlap(p.clearing, other.clearing) < 1e-8);
  const blocked = plans[0].clearing,
    shifted = planAirportBillboards({
      routes: [road],
      fits: (polygon) => tilePolygonOverlap(polygon, blocked) < 1e-8,
    });
  assert.ok(
    shifted.every((p) => tilePolygonOverlap(p.clearing, blocked) < 1e-8),
    'a reserved parcel must move the board, never overlap it',
  );
});

test('the full billboard model fits its collision plot and both faces can be seen from approaching traffic', () => {
  const signs = new Map(
    AIRPORT_ADS.map((ad) => [
      ad.art,
      [
        [0, 0] satisfies [number, number],
        [1, 0] satisfies [number, number],
        [1, 1] satisfies [number, number],
        [0, 1] satisfies [number, number],
      ],
    ]),
  );
  for (const p of planAirportBillboards({ routes: [road], fits: () => true })) {
    const m = new Mesh(),
      base = 1.2;
    drawAirportBillboard(m, signs, { ...p, base });
    assert.ok(m.data.every(Number.isFinite));
    for (let i = 0; i < m.data.length; i += 11) {
      assert.ok(Math.abs(m.data[i] - p.x) <= p.width / 2 + 1e-7);
      assert.ok(Math.abs(m.data[i + 2] - p.z) <= AIRPORT_BILLBOARD_PLOT.depth / 2 + 1e-7);
    }
    const faces: number[][][] = [];
    for (let i = 0; i < m.data.length; i += 33)
      if (m.data[i + 9] >= 0)
        faces.push(
          ([0, 11, 22] satisfies [number, number, number]).map((k) =>
            m.data.slice(i + k, i + k + 3),
          ),
        );
    assert.equal(faces.length, 4);
    for (const side of [-1, 1] satisfies [number, number]) {
      const target = [p.x, base + 1.95, p.z],
        origin = [road.points[0][0], base + 1.95, p.z + side * 8] satisfies [
          number,
          number,
          number,
        ],
        ray = { origin, dir: unit(sub(target, origin)) };
      assert.ok(
        faces.some((tri) => rayTriangle(ray, tri[0], tri[1], tri[2]) !== null),
        'the artwork must face approaching traffic',
      );
    }
  }
});
