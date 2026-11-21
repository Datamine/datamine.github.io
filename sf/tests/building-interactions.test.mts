import test from 'node:test';
import assert from 'node:assert/strict';
import { buildingNPCService, serviceStaffPosition } from '../building-interactions.ts';
import { sightPrimaryVerb } from '../descriptions.ts';

test('conversation services belong to NPCs; their building hover action is always Examine', () => {
  const sites: [Parameters<typeof sightPrimaryVerb>[0], string][] = [
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
    [{ id: 'sutro' }, 'Climb'] as const,
    [{ kind: 'gondola' }, 'Ride gondola'] as const,
    [{ kind: 'whale' }, 'Jump over'] as const,
    [{ kind: 'fishing' }, 'Fish at'] as const,
    [{ kind: 'gym' }, 'Perform exercises at'] as const,
    [{ kind: 'airship-rope' }, 'Climb'] as const,
    [{ kind: 'motorcycle', id: 'rental', rented: true }, 'Ride'] as const,
    [{ kind: 'motorcycle', id: 'rental', rented: false }, 'Examine'] as const,
  ]) {
    assert.equal(buildingNPCService(Object.assign({ id: undefined, kind: undefined }, site)), null);
    assert.equal(sightPrimaryVerb(site), verb);
  }
});

test('entering an institute is a physical action, independent of its NPC conversation service', () => {
  for (const kind of ['research-institute', 'esoteric-institute'] satisfies [string, string]) {
    const site = { kind, enterableInstitute: true };
    assert.ok(buildingNPCService(site));
    assert.equal(sightPrimaryVerb(site), 'Enter');
  }
});

test('new staff must have a real reachable position, rather than hiding inside their building or on water', () => {
  const entry = { x: 4, y: 8 },
    calls: unknown[] = [];
  const result = serviceStaffPosition(entry, {
    walkable: (p: { x: number }) => p.x <= 4,
    canTravel: (from, to: { y: number }) => {
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
