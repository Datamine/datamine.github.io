import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_FIELDS, worldRecord, worldPatch, applyWorldPatches } from '../world-deltas.js';
test('field-mask deltas roundtrip partial changes, null removals, interest exits and re-entry', () => {
  const maps = {},
    npc = { id: 'npc-1', x: 2, z: 4, base: 1.15, angle: 0, phase: 1, motion: 1, level: 5 },
    first = worldRecord('npcs', npc);
  assert.deepEqual(applyWorldPatches(maps, { npcs: [worldPatch(npc.id, first)] }).npcs[0], npc);
  const changed = worldRecord('npcs', { ...npc, x: 2.5, phase: 2 }),
    patch = worldPatch(npc.id, changed, first);
  assert.equal(patch.length, 4);
  assert.equal(worldPatch(npc.id, changed, changed), null);
  let state = applyWorldPatches(maps, { npcs: [patch] });
  assert.equal(state.npcs[0].x, 2.5);
  assert.equal(state.npcs[0].level, 5);
  assert.equal(applyWorldPatches(maps, {}, { npcs: [npc.id] }).npcs.length, 0);
  assert.equal(applyWorldPatches(maps, { npcs: [worldPatch(npc.id, first)] }).npcs.length, 1);
});
test('moving NPC field patches are substantially smaller than repeated object JSON', () => {
  let previous,
    full = 0,
    delta = 0;
  for (let i = 0; i < 100; i++) {
    const n = {
        id: 'southern-person-17',
        x: 22 + i * 0.1,
        z: 120,
        base: 1.15,
        angle: 0,
        motion: 1,
        phase: i * 0.2,
        elapsed: 0,
        expeditionDead: false,
        hold: 0,
        level: 1,
      },
      next = worldRecord('npcs', n);
    full += JSON.stringify(n).length;
    delta += JSON.stringify(worldPatch(n.id, next, previous)).length;
    previous = next;
  }
  assert.ok(delta < full * 0.4, `${delta} / ${full}`);
  assert.ok(Object.values(WORLD_FIELDS).every((keys) => keys.length < 31));
});
