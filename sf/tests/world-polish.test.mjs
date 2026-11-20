import test from 'node:test';
import assert from 'node:assert/strict';
import { updateGrazingCow } from '../cow-roaming.js';
import { cowSpawns, COW_PEN } from '../jurassic-layout.js';
import {
  sampleRedwoodCanoe,
  sampleRedwoodGeese,
  drawRedwoodLakeLife,
} from '../redwood-lake-life.js';
import { SOUTHERN_LAKE, PENINSULA_HIGHWAY_X } from '../southern-countryside-layout.js';
import { SALT_FLATS } from '../salt-layout.js';
import { airportSurfaceTypeAt } from '../airship.js';
import { Mesh } from '../geometry.js';
import { setActionText } from '../context-menu.js';
import { WIZARD_HOUSE, isWizardHousePlot } from '../wizard-house.js';
import { SAND_HILL_CAPITAL } from '../southern-layout.js';

test('cows take small grazing walks inside their pen, pause during combat, and obey collision checks', () => {
  const spawn = cowSpawns()[2],
    cow = { ...spawn, home: { x: spawn.x, z: spawn.z }, hp: 20 };
  let moved = 0;
  for (let i = 0; i < 1200; i++) {
    const x = cow.x,
      z = cow.z;
    updateGrazingCow(cow, 0.05);
    moved += Math.hypot(cow.x - x, cow.z - z);
    assert.ok(Math.hypot(cow.x - cow.home.x, cow.z - cow.home.z) < 1.5);
    assert.ok(
      Math.abs(cow.x - COW_PEN.x) < COW_PEN.w / 2 && Math.abs(cow.z - COW_PEN.z) < COW_PEN.d / 2,
    );
  }
  assert.ok(moved > 2);
  const position = [cow.x, cow.z];
  for (let i = 0; i < 100; i++) updateGrazingCow(cow, 0.05, { blocked: true });
  assert.deepEqual([cow.x, cow.z], position);
  assert.equal(cow.motion, 0);
  const blocked = { ...spawn, home: { x: spawn.x, z: spawn.z }, hp: 20 };
  for (let i = 0; i < 1000; i++) updateGrazingCow(blocked, 0.05, { clear: () => false });
  assert.equal(blocked.x, spawn.x);
  assert.equal(blocked.z, spawn.z);
});
test('the canoe and geese follow moving routes on Redwood Lake and render finite geometry', () => {
  const lake = SOUTHERN_LAKE,
    inside = (p) => ((p.x - lake.x) / lake.rx) ** 2 + ((p.z - lake.z) / lake.rz) ** 2 < 1;
  for (let time = 0; time < 300000; time += 1000) {
    assert.ok(inside(sampleRedwoodCanoe(time)));
    assert.ok(sampleRedwoodGeese(time).every(inside));
  }
  assert.notDeepEqual(sampleRedwoodCanoe(0), sampleRedwoodCanoe(10000));
  const mesh = new Mesh(),
    targets = [];
  drawRedwoodLakeLife(mesh, 1200, (start, target) => targets.push(target));
  assert.ok(mesh.data.length > 0 && mesh.data.every(Number.isFinite));
  for (let i = 0; i < mesh.data.length; i += 11) {
    assert.ok(Math.abs(mesh.data[i] - lake.x) < lake.rx);
    assert.ok(Math.abs(mesh.data[i + 2] - lake.z) < lake.rz);
    assert.ok(
      mesh.data[i + 1] < lake.level + 2.5,
      'People must sit inside the canoe, not float above it.',
    );
  }
  assert.equal(targets.length, 7);
  assert.ok(targets.some((t) => t.sight.label === 'Canoeing couple'));
});
test('expanded salt ponds occupy the southeastern corner without blocking the through highway', () => {
  assert.ok((SALT_FLATS.east - SALT_FLATS.west) * (SALT_FLATS.south - SALT_FLATS.north) > 250);
  for (let z = SALT_FLATS.north; z < SALT_FLATS.south; z += 0.25)
    assert.notEqual(
      airportSurfaceTypeAt(PENINSULA_HIGHWAY_X, z),
      'water',
      'Highway submerged at ' + z,
    );
  assert.ok(WIZARD_HOUSE.x + WIZARD_HOUSE.w / 2 < SAND_HILL_CAPITAL.x - SAND_HILL_CAPITAL.w / 2);
  assert.ok(isWizardHousePlot(WIZARD_HOUSE));
});
test('context labels use separate text-only verb and typed target spans', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: () => ({ dataset: {}, textContent: '', className: '' }) };
  try {
    for (const kind of ['npc', 'item', 'object']) {
      const parts = [],
        element = {
          replaceChildren() {
            parts.length = 0;
          },
          append: (p) => parts.push(p),
        };
      setActionText(element, 'Examine <Target>', [{ label: '<Target>', kind }]);
      assert.equal(parts[0].className, 'sf-action-verb');
      assert.equal(parts[0].textContent, 'Examine ');
      assert.equal(parts[1].className, 'sf-action-target');
      assert.equal(parts[1].dataset.kind, kind);
      assert.equal(parts[1].textContent, '<Target>');
      assert.equal(parts[1].innerHTML, undefined);
    }
  } finally {
    globalThis.document = previous;
  }
});
