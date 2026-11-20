import test from 'node:test';
import assert from 'node:assert/strict';
import { buildingNPCService, serviceStaffPosition } from '../building-interactions.js';
import { sightPrimaryVerb } from '../descriptions.js';

test('conversation services belong to NPCs; their building hover action is always Examine', () => {
  const sites = [
    [{ id: 'cityhall' }, 'clerk'],
    [{ id: 'cotogna', kind: 'restaurant' }, 'chef'],
    [{ id: 'lucindas-deli', kind: 'restaurant' }, 'deli'],
    [{ id: 'shanghai-kelly', kind: 'restaurant' }, 'bartender'],
    [{ id: 'ai-lab' }, 'recruiter'],
    [{ kind: 'esoteric-institute' }, 'esoteric'],
    [{ kind: 'industrial-center' }, 'armorer'],
    [{ kind: 'research-institute' }, 'researcher'],
    [{ kind: 'tax-hq' }, 'tax'],
    [{ kind: 'startup' }, 'founder'],
    [{ kind: 'capital' }, 'capital'],
    [{ kind: 'spaceport' }, 'crew'],
    [{ kind: 'ski-rental' }, 'lift'],
    [{ kind: 'fuel' }, 'fuel-attendant'],
    [{ kind: 'dealership' }, 'fuel-attendant'],
  ];
  for (const [site, service] of sites) {
    assert.equal(buildingNPCService(site), service);
    assert.equal(sightPrimaryVerb(site), 'Examine');
  }
  assert.equal(buildingNPCService(null), null);
});

test('non-conversational world actions remain available on their actual objects', () => {
  for (const [site, verb] of [
    [{ id: 'sutro' }, 'Climb'],
    [{ kind: 'gondola' }, 'Ride gondola'],
    [{ kind: 'whale' }, 'Jump over'],
    [{ kind: 'fishing' }, 'Fish at'],
    [{ kind: 'motorcycle', rented: true }, 'Ride'],
    [{ kind: 'motorcycle', rented: false }, 'Examine'],
  ]) {
    assert.equal(buildingNPCService(site), null);
    assert.equal(sightPrimaryVerb(site), verb);
  }
});

test('entering an institute is a physical action, independent of its NPC conversation service', () => {
  for (const kind of ['research-institute', 'esoteric-institute']) {
    const site = { kind, enterableInstitute: true };
    assert.ok(buildingNPCService(site));
    assert.equal(sightPrimaryVerb(site), 'Enter');
  }
});

test('new staff must have a real reachable position, rather than hiding inside their building or on water', () => {
  const entry = { x: 4, y: 8 },
    calls = [];
  const result = serviceStaffPosition(entry, {
    walkable: (p) => p.x <= 4,
    canTravel: (from, to) => {
      calls.push([from, to]);
      return to.y <= 8;
    },
  });
  assert.deepEqual(result, { x: 4, y: 7.75 });
  assert.ok(calls.length >= 2);
  assert.deepEqual(calls.at(-1), [entry, result]);
  assert.throws(
    () => serviceStaffPosition(entry, { walkable: () => false, canTravel: () => true }),
    /reachable staff/,
  );
});
