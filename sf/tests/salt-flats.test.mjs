import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomy, TRADE_PRICES } from '../economy.js';
import {
  createSaltMail,
  saltActivistDialogue,
  saltClerkDialogue,
  SALT_LETTER_PAY,
} from '../salt-mail.js';
import { theyLiveDialogue, createTheyLiveQuest } from '../they-live.js';
import {
  SALT_FLATS,
  SALT_PONDS,
  SALT_FLATS_PATH,
  saltPondAt,
  saltSurfaceAt,
} from '../salt-layout.js';
import { RESEARCH_CAMPUSES } from '../research-layout.js';
import { createAirship, airportSurfaceTypeAt, SOUTHERN_ROADS } from '../airship.js';
import { createSouthernTerrain } from '../southern-terrain.js';
import { SOUTHERN_LEVEL_PADS, SOUTHERN_TRAILS } from '../southern-layout.js';
import { drawSaltFlats, SALT_FLATS_SIGNS } from '../salt-flats.js';
import { Mesh, rayTriangle } from '../geometry.js';
import { buildingNPCService } from '../building-interactions.js';

test('conservation letters pay exactly fifty on delivery, one at a time, with atomic persistent inventory', () => {
  const writes = [],
    e = createEconomy({}, (s) => writes.push(s)),
    mail = createSaltMail(e);
  assert.equal(mail.deliver().ok, false);
  assert.equal(e.state.coins, 25);
  assert.equal(mail.entries().length, 0);
  assert.equal(mail.collect().ok, true);
  assert.equal(e.state.coins, 25);
  assert.equal(mail.carrying, true);
  assert.equal(mail.collect().ok, false);
  assert.equal(e.state.saltLetters, 1);
  assert.equal(mail.entries()[0].stage, 'carrying');
  const restoredWrites = [],
    restored = createEconomy(writes.at(-1), (s) => restoredWrites.push(s)),
    restoredMail = createSaltMail(restored);
  assert.equal(restoredMail.carrying, true);
  assert.equal(restoredMail.deliver().ok, true);
  assert.equal(restored.state.coins, 75);
  assert.equal(restored.state.saltLetters, 0);
  assert.equal(restored.state.saltLettersDelivered, 1);
  assert.deepEqual(
    restoredWrites.at(-1),
    { ...restored.state },
    'letter removal and payment must persist in one snapshot',
  );
  assert.equal(restoredMail.deliver().ok, false);
  assert.equal(restored.state.coins, 75);
  for (let i = 0; i < 3; i++) {
    assert.equal(restoredMail.collect().ok, true);
    assert.equal(restoredMail.deliver().ok, true);
  }
  assert.equal(restored.state.coins, 225);
  assert.equal(restored.state.saltLettersDelivered, 4);
  assert.equal(restoredWrites.length, 7);
  assert.equal(restoredMail.entries()[0].stage, 'accepted');
  assert.equal(TRADE_PRICES.saltLetter, SALT_LETTER_PAY);
  assert.deepEqual(
    writes.at(-1),
    { ...e.state },
    'saved letter must be committed in the same purse snapshot',
  );
  const full = createEconomy({ coins: Number.MAX_SAFE_INTEGER, saltLetters: 1 });
  assert.equal(createSaltMail(full).deliver().ok, false);
  assert.equal(full.state.saltLetters, 1);
  for (const value of [-1, '1', NaN, Infinity])
    assert.equal(
      createEconomy({ saltLetters: value, saltLettersDelivered: value }).state.saltLetters,
      0,
    );
});

test('the activist provides work and City Hall accepts mail without removing existing permit dialogue', () => {
  const e = createEconomy(),
    mail = createSaltMail(e),
    quest = createTheyLiveQuest(),
    npc = { name: 'Salt conservationist' },
    clerk = { name: 'City Hall clerk', questRole: 'clerk' };
  const ordinary = theyLiveDialogue(clerk, quest);
  assert.equal(saltClerkDialogue(ordinary, mail), ordinary);
  const work = saltActivistDialogue(npc, mail, e);
  assert.match(work.choice, /Take a letter/);
  assert.equal(work.accept().ok, true);
  assert.match(saltActivistDialogue(npc, mail, e).intro, /still have/);
  const delivery = saltClerkDialogue(ordinary, mail);
  assert.equal(delivery.choices.length, 2);
  assert.match(delivery.choices[0].label, /50 coins/);
  assert.equal(delivery.choices[1].label, ordinary.choice);
  assert.equal(delivery.choices[0].accept().ok, true);
  assert.equal(delivery.choices[0].accept().ok, false);
  assert.equal(saltClerkDialogue(ordinary, mail), ordinary);
  assert.match(saltActivistDialogue(npc, mail, e).intro, /Another letter/);
  quest.start();
  quest.certificate();
  mail.collect();
  const permit = theyLiveDialogue(clerk, quest),
    both = saltClerkDialogue(permit, mail);
  assert.equal(both.choices[1].accept().ok, true);
  assert.equal(quest.state.permit, true);
  assert.equal(mail.carrying, true, 'permit paperwork must not consume the letter');
  assert.equal(buildingNPCService({ kind: 'salt-flats' }), 'salt-activist');
});

test('salt ponds sit east of the relocated institutes and land/pond boundaries share exact half-tile coordinates', () => {
  for (const campus of RESEARCH_CAMPUSES) {
    assert.ok(SALT_FLATS.west > campus.east);
  }
  const ship = createAirship();
  for (const p of SALT_PONDS) {
    for (const n of [p.x, p.z, p.x + p.w, p.z + p.d]) assert.equal(n * 2, Math.round(n * 2));
    const x = p.x + p.w / 2,
      z = p.z + p.d / 2;
    assert.equal(saltSurfaceAt(x, z), 'water');
    assert.equal(airportSurfaceTypeAt(x, z), 'water');
    assert.equal(ship.contains(x, z), false);
    assert.equal(saltPondAt(p.x - 0.2, z), null);
  }
  assert.ok(SOUTHERN_TRAILS.some((t) => t.name === SALT_FLATS_PATH.name));
  assert.equal(airportSurfaceTypeAt(72.9, 202), 'path');
  assert.equal(airportSurfaceTypeAt(80, 215.5), 'path');
  assert.equal(airportSurfaceTypeAt(80, 197), 'salt');
  assert.ok((SALT_FLATS.east - SALT_FLATS.west) * (SALT_FLATS.south - SALT_FLATS.north) > 250);
  assert.ok(SALT_PONDS.length >= 18);
  assert.ok(ship.contains(72.9, SALT_FLATS.north + 2.2));
});

test('the rendered terrain owns pond surfaces without an overlapping paving layer or ocean tears', () => {
  const terrain = createSouthernTerrain({ roads: SOUTHERN_ROADS, pads: SOUTHERN_LEVEL_PADS }),
    m = new Mesh();
  terrain.drawLand(m);
  for (const p of SALT_PONDS) {
    for (const [x, z] of [
      [p.x, p.z],
      [p.x + p.w, p.z + p.d],
      [p.x + p.w / 2, p.z + 0.5],
    ])
      assert.equal(
        terrain.height(x, z),
        SALT_FLATS.base,
        'salt water must be level with its banks',
      );
    const ray = { origin: [p.x + p.w * 0.41, 5, p.z + p.d * 0.37], dir: [0, -1, 0] },
      hits = [];
    for (let i = 0; i < m.data.length; i += 33) {
      const d = rayTriangle(ray, ...[0, 11, 22].map((j) => m.data.slice(i + j, i + j + 3)));
      if (d !== null) hits.push({ d, kind: m.data[i + 9], water: m.data[i + 10] });
    }
    assert.equal(hits.length, 1);
    assert.equal(hits[0].kind, -1.75);
    assert.equal(hits[0].water, 10);
    assert.ok(Math.abs(5 - hits[0].d - terrain.height(ray.origin[0], ray.origin[2])) < 1e-8);
  }
  const fixtures = new Mesh(),
    signs = new Map(
      SALT_FLATS_SIGNS.map((s) => [
        s,
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ]),
    ),
    site = drawSaltFlats(fixtures, signs, terrain);
  assert.ok(fixtures.data.every(Number.isFinite));
  assert.ok(fixtures.data.length / 33 < 4000);
  assert.equal(site.navigationPolygons.length, SALT_PONDS.length + 3);
  assert.deepEqual(site.entry, SALT_FLATS.entry);
  assert.ok(m.data.every(Number.isFinite));
});
