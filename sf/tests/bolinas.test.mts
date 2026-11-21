import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import {
  BOLINAS,
  BOLINAS_COTTAGES,
  BOLINAS_PATH,
  EMF_WARRIOR,
  bolinasBlocks,
  drawBolinas,
} from '../bolinas.ts';
import { MARIN_OUTLINE, marinElevation } from '../geography.ts';
import { createMarinLand } from '../marin-land.ts';
import { createDetentionSite } from '../encounters.ts';
import { minimapActors, minimapShops } from '../minimap-layers.ts';
import { characterAppearance, normalizeCharacter } from '../character-config.ts';
import { drawCharacter } from '../characters.ts';

test('Bolinas and its warrior are connected to Marin, with cottages blocking their footprints and a continuous trail', () => {
  const detention = createDetentionSite(1.5),
    gate = { x: 28, y: -2 },
    land = createMarinLand({
      polygon: MARIN_OUTLINE.map((p) => p.map((v) => v * 1.5)),
      detention,
      gate,
    });
  assert.ok(land.contains(EMF_WARRIOR.x, EMF_WARRIOR.z));
  assert.ok(land.path(gate, BOLINAS.entry, () => null));
  assert.ok(
    land.path(BOLINAS.entry, { x: EMF_WARRIOR.x - 0.5, y: EMF_WARRIOR.z - 0.5 }, () => null),
  );
  for (const h of BOLINAS_COTTAGES) {
    assert.equal(bolinasBlocks(h.x, h.z), true);
    assert.equal(land.contains(h.x, h.z), false);
  }
  for (const [x, z] of BOLINAS_PATH) assert.ok(land.onLand(x, z));
  const mesh = new Mesh();
  drawBolinas(mesh, (x, z) => marinElevation(x / 1.5, z / 1.5));
  assert.ok(mesh.data.length > 1000);
  assert.ok(mesh.data.every(Number.isFinite));
});

test('minimap NPC layer includes citizens, merchants and monsters, while shop layer selects services', () => {
  const citizen = { x: 1, z: 2 },
    vendor = { x: 3, z: 4, kind: 'battery-seller' },
    armorer = { x: 5, z: 6, questRole: 'armorer' },
    monster = { x: 7, z: 8, hp: 10 },
    dead = { x: 9, z: 10, hp: 0 };
  const actors = minimapActors({
    cityLife: { people: [citizen] },
    merchants: [vendor, armorer],
    wilderness: { actors: [monster, dead] },
  });
  assert.deepEqual(actors, [vendor, armorer, citizen, monster]);
  assert.deepEqual(minimapShops(actors), [vendor, armorer]);
});

test('the equipped tinfoil suit survives normalization and has a finite full-body silver model', () => {
  const look = characterAppearance(normalizeCharacter({ torso: 'tinfoil-suit' }));
  assert.equal(look.tinfoil, true);
  const mesh = new Mesh();
  drawCharacter(mesh, 0, 0, 0, 0, 0, false, '#bd9369', '#556644', look);
  assert.ok(mesh.data.length > 0);
  assert.ok(mesh.data.every(Number.isFinite));
});
