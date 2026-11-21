import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { DOG_PONY_SHOW, dogPonyPose } from '../dog-pony-layout.ts';
import {
  drawDogPonyShowground,
  drawDogPonyAnimals,
  createDogPonyAdministrator,
} from '../dog-pony-show.ts';
import { SOUTHERN_HOUSING } from '../southern-layout.ts';
import { settlementParcelBounds, SETTLEMENT_PARCELS } from '../southern-settlement-layout.ts';
import { airportRoadDistance } from '../airship.ts';
import { NPC_DIALOGUES } from '../config/dialogue.ts';

test('showground replaces the low-detail clearing without occupying houses or the Foundry Lane roadway', () => {
  const terrain = { height: () => 1.6, cutPlot() {} },
    m = new Mesh(),
    site = drawDogPonyShowground(m, terrain, new Map());
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(site.navigationPolygons.length > 4);
  for (const shape of site.navigationPolygons)
    for (const [x, z] of shape) assert.ok(airportRoadDistance(x, z) > 0.4, 'prop overlaps a road');
  const s = DOG_PONY_SHOW;
  for (const p of SOUTHERN_HOUSING) {
    const b = settlementParcelBounds(p);
    assert.ok(
      b[2] <= s.west || b[0] >= s.east || b[3] <= s.north || b[1] >= s.south,
      'showground overlaps house ' + JSON.stringify(p),
    );
  }
  const npc = createDogPonyAdministrator(terrain.height);
  assert.equal(npc.label, 'Dog and Pony Administrator');
  assert.ok(Math.hypot(npc.x - 72, npc.z - 168) < 3);
  assert.equal(npc.neighborhoodService, 'dog-pony');
  assert.ok(
    requiredFixture(NPC_DIALOGUES['neighborhood-dog-pony'].choices).some((c) =>
      c.args?.includes('watch'),
    ),
  );
});

test('both animals complete one synchronized backflip and return to their exact resting models', () => {
  const start = 1000000,
    rest = new Mesh(),
    finish = new Mesh(),
    peak = new Mesh();
  drawDogPonyAnimals(rest, 0, start, () => 1.6);
  drawDogPonyAnimals(finish, start, start + 3001, () => 1.6);
  drawDogPonyAnimals(peak, start, start + 1125, () => 1.6);
  assert.deepEqual(rest.data, finish.data);
  assert.ok(peak.data.every(Number.isFinite));
  assert.equal(peak.data.length, rest.data.length);
  assert.equal(dogPonyPose(start, start + 1125).angle, Math.PI);
  assert.ok(dogPonyPose(start, start + 1125).height > 1.6);
  for (let ms = 0; ms <= 3000; ms += 50) {
    const p = dogPonyPose(start, start + ms);
    assert.ok(p.angle >= 0 && p.angle <= Math.PI * 2);
    assert.ok(p.height >= -1e-8);
  }
  assert.equal(dogPonyPose(start, start - 1).active, false);
  assert.equal(dogPonyPose(start, start + 3000).active, false);
});

test('southern residential streets sample northern SF styles while keeping rural single-storey homes', () => {
  const styles = new Set(SETTLEMENT_PARCELS.map((p) => ('district' in p ? p.district : undefined)));
  for (const style of ['victorian', 'telegraph', 'west', 'mission', 'warehouse'] satisfies [
    string,
    string,
    string,
    string,
    string,
  ])
    assert.ok(styles.has(style));
  const rural = SOUTHERN_HOUSING.filter((p) => p.z > 180 && p.lowRiseStyle);
  assert.ok(rural.length >= 25);
  assert.deepEqual(
    new Set(rural.map((p) => p.lowRiseStyle)),
    new Set(['bungalow', 'craftsman', 'eichler'] satisfies [string, string, string]),
  );
});
