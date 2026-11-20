import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import { makeSuburbanHome } from '../suburban-homes.js';
import {
  SUBURBAN_PARCELS,
  SUBURBAN_COURTS,
  suburbanPlan,
  suburbanGardenFences,
} from '../suburban-layout.js';
import { SOUTHERN_HOUSING, inSouthernHousePlot } from '../southern-layout.js';
import { airportRoadDistance } from '../airship.js';
import { RESEARCH_CAMPUSES } from '../research-layout.js';
import { drawResearchCampuses } from '../research-campuses.js';
import { JURASSIC } from '../jurassic-layout.js';
import { drawJurassicCampus, drawRaptorGate } from '../jurassic-models.js';

test('the southern residential district includes three individual single-storey house families and real garages', () => {
  const plots = SOUTHERN_HOUSING.filter((p) => p.lowRiseStyle);
  assert.ok(plots.length >= 28);
  assert.deepEqual(
    new Set(plots.map((p) => p.lowRiseStyle)),
    new Set(['eichler', 'bungalow', 'craftsman']),
  );
  const terrain = { height: (x, z) => 1.2 + x * 0.015 + z * 0.008, cutPlot: () => {} };
  let garages = 0;
  const silhouettes = new Map();
  for (const p of plots) {
    const m = new Mesh(),
      o = makeSuburbanHome(m, p, terrain, () => {});
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 7000);
    assert.equal(o.storeys, 1);
    assert.ok(o.houseHeight < 2);
    assert.equal(
      o.navigationPolygons.length,
      (o.plan.garage ? 2 : 1) + suburbanGardenFences(p).length,
    );
    if (o.plan.garage) garages++;
    silhouettes.set(o.suburbanStyle, m.data);
    for (const [x, z] of o.footprint)
      assert.ok(airportRoadDistance(x, z) > 0.3, 'house crosses a roadway');
  }
  assert.ok(garages >= 6);
  assert.notDeepEqual(silhouettes.get('eichler'), silhouettes.get('bungalow'));
});

test('the authored Palm Court homes face the lane and the green parts of their lots remain walkable', () => {
  for (const p of SUBURBAN_PARCELS) {
    const plan = suburbanPlan(p),
      c = Math.cos(p.rotation),
      s = Math.sin(p.rotation),
      point = (u, v) => [p.x + u * c - v * s, p.z + u * s + v * c];
    const body = point(plan.house.x + plan.house.w / 2, plan.house.z + plan.house.d / 2);
    assert.ok(inSouthernHousePlot(...body));
    const garden = point(-p.w / 2 + 0.03, p.d / 2 - 0.02);
    assert.equal(inSouthernHousePlot(...garden), false);
    assert.ok(SUBURBAN_COURTS.some((r) => r.points.some((q) => Math.abs(q[1] - p.z) < 2.1)));
  }
});

test('both institutes have substantially smaller usable floor plans with fitted roof geometry', () => {
  for (const c of RESEARCH_CAMPUSES) assert.ok(c.w * c.d < 22);
  const m = new Mesh(),
    sites = drawResearchCampuses(m, new Map());
  assert.ok(m.data.every(Number.isFinite));
  for (const [i, s] of sites.entries()) {
    assert.ok(s.hi[1] - RESEARCH_CAMPUSES[i].base < 4.9);
    assert.ok(s.hi[1] - RESEARCH_CAMPUSES[i].base > 3);
  }
});

test('Jurassic has a tall laboratory and a genuinely open fixed gate aperture with a matching swinging leaf', () => {
  const m = new Mesh(),
    site = drawJurassicCampus(m, new Map()),
    b = JURASSIC.base,
    c = JURASSIC.cage;
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(site.hi[1] - b > 6);
  assert.ok(m.data.length / 33 < 9000);
  for (let i = 0; i < m.data.length; i += 11) {
    const [x, y, z] = m.data.slice(i, i + 3);
    assert.ok(
      !(
        Math.abs(z - c.z - c.d / 2) < 0.04 &&
        Math.abs(x - c.x) < 0.49 &&
        y > b + 0.25 &&
        y < b + 2.4
      ),
      'fixed mesh must not put bars through the gate opening',
    );
  }
  const closed = new Mesh(),
    open = new Mesh();
  drawRaptorGate(closed, { raptor: { phase: 'caged' } });
  drawRaptorGate(open, { raptor: { phase: 'loose', release: 1 } });
  assert.ok(open.data.every(Number.isFinite));
  assert.ok(closed.data.length / 33 < 500);
  const maxX = (m) => Math.max(...m.data.filter((_, i) => i % 11 === 0));
  assert.ok(maxX(closed) - maxX(open) > 0.8);
});
