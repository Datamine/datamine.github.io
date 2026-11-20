import test from 'node:test';
import assert from 'node:assert/strict';
import { npcInRange, nearbyServiceNPC, fuelCarInRange } from '../interaction-access.js';
import { auditInteractionApproaches } from '../interaction-audit.js';
import { createClientControllerFactory } from '../client/controllers.js';
import { estimatedWorldSeconds } from '../multiplayer-world.js';
import { createWhales, WHALE_JUMP_LEAD_MS } from '../wildlife.js';
import { createFuelDialogue } from '../fuel.js';

test('NPC services use live world coordinates and reject the wrong floor or a different service', () => {
  const p = { x: 12, y: 3, z: 18 },
    a = { id: 'a', kind: 'crew', x: 12.8, z: 18, base: 3 },
    b = { id: 'b', kind: 'crew', x: 12.2, z: 18, base: 9 };
  assert.ok(npcInRange(p, a));
  assert.equal(npcInRange(p, b), false);
  assert.equal(
    nearbyServiceNPC({ merchants: [b, a] }, p, (n) => n.kind === 'crew'),
    a,
  );
  a.x = 20;
  assert.equal(
    nearbyServiceNPC({ merchants: [a] }, p, () => true),
    null,
  );
});
test('the build audit catches a patrol stop whose client arrival no longer reaches the NPC and restores geometry', () => {
  const npc = { id: 'roaming-merchant', x: 1, z: 1, base: 0, roam: { points: [{ x: 10, y: 10 }] } },
    world = {
      merchants: [npc],
      characterGround: () => 0,
      approaches: { merchant: () => ({ x: 0.5, y: 0.5 }) },
    };
  const report = auditInteractionApproaches(world);
  assert.equal(report.ok, false);
  assert.match(report.errors[0], /outside server range/);
  assert.equal(report.checked, 2);
  assert.equal(npc.x, 1);
  assert.equal(npc.z, 1);
});
test('rejected gondola and ski requests leave local travel state untouched', async () => {
  const calls = [],
    controller = {
      state: { mode: 'ground' },
      gondola() {
        this.state.mode = 'gondola';
      },
      startSki() {
        this.state.mode = 'ski';
      },
    };
  const view = createClientControllerFactory({
    client: {
      state: {},
      command: async (action, args) => {
        calls.push({ action, args });
        return { ok: false, message: 'Too far away.' };
      },
    },
  })('tahoe', controller);
  view.gondola();
  view.startSki();
  await Promise.resolve();
  assert.equal(controller.state.mode, 'ground');
  assert.deepEqual(calls, [
    { action: 'travel', args: { kind: 'gondola' } },
    { action: 'travel', args: { kind: 'ski' } },
  ]);
});
test('whale targets depend on synchronized simulation time, independent of browser uptime', () => {
  const whales = createWhales(),
    a = estimatedWorldSeconds(7200, 1000, 1250),
    b = estimatedWorldSeconds(7200, 800000, 800250);
  assert.equal(a, b);
  assert.deepEqual(
    whales.sample(a * 1000 + WHALE_JUMP_LEAD_MS, 0),
    whales.sample(b * 1000 + WHALE_JUMP_LEAD_MS, 0),
  );
  assert.equal(estimatedWorldSeconds(7200, 1000, 900), 7200);
});
test('fuel UI and server share parking-bay geometry and show success only after the server receipt', async () => {
  let at = { x: 0, z: 0 },
    fuel = 0,
    localRefuels = 0,
    resolve;
  const car = {
      get position() {
        return at;
      },
      sample: () => ({ x: 0, z: 0 }),
      state: { distance: 0 },
      refuel: () => localRefuels++,
    },
    site = { distance: 0, paid: false },
    npc = { x: 10, z: 0 };
  assert.ok(fuelCarInRange(car, site, npc));
  at = { x: 100, z: 100 };
  assert.equal(fuelCarInRange(car, site, npc), false);
  at = { x: 10, z: 1 };
  assert.ok(fuelCarInRange(car, site, npc));
  const menu = createFuelDialogue(site, car, { state: { coins: 42 } }, () => {}, {
      npc,
      refuel: () => new Promise((r) => (resolve = r)),
    }),
    pending = menu.choices[0].accept();
  assert.equal(localRefuels, 0);
  assert.equal(fuel, 0);
  resolve({ ok: false, message: 'Server rejected' });
  assert.equal((await pending).ok, false);
  assert.equal(localRefuels, 0);
});
