import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeleportTablets,
  tabletCounts,
  tabletTeleportPose,
  TABLET_TELEPORT_SECONDS,
} from '../teleport-tablets.ts';
import { createEconomy } from '../economy.ts';
import { drawTabletTeleport } from '../teleport-models.ts';
import { Mesh } from '../geometry.ts';
import { sampleCharacterPose } from '../characters.ts';

const targets = { downtown: { x: 10, y: 2, z: 20 }, tahoe: { x: 100, y: 12, z: -200 } };
test('tablet purchases and use cannot fall back to local inventory or local travel', async () => {
  const saved = new Map([
      ['sf-tablets-v1', JSON.stringify({ tahoe: 10 })] satisfies [string, string],
    ]),
    storage = {
      getItem: (k: string) => saved.get(k),
      setItem: () => assert.fail('client wrote tablet inventory'),
    },
    economy = createEconomy({ coins: 45 });
  let arrivals = 0;
  const t = createTeleportTablets({
    ...{ storage, economy, destinations: targets },
    onArrive: () => arrivals++,
  });
  assert.equal((await t.buy('tahoe')).ok, false);
  assert.equal((await t.use('tahoe')).ok, false);
  assert.deepEqual(t.inventory(), { downtown: 0, tahoe: 0 });
  assert.equal(economy.state.coins, 45);
  assert.equal(arrivals, 0);
  assert.deepEqual(tabletCounts({ downtown: -1, tahoe: Infinity }), { downtown: 0, tahoe: 0 });
});
test('teleport raises both arms, swooshes up with finite purple geometry, then settles at the fixed destination', () => {
  const flight = { from: { x: 1, y: 2, z: 3 }, to: targets.tahoe };
  for (const seconds of [0, 0.6, 1.2, 1.5, 2.2, TABLET_TELEPORT_SECONDS] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
  ]) {
    const p = tabletTeleportPose(flight, seconds),
      m = new Mesh();
    drawTabletTeleport(m, p, seconds * 1000);
    assert.ok(m.data.length > 0 && m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 1800);
  }
  assert.deepEqual(tabletTeleportPose(flight, 0).position, flight.from);
  assert.deepEqual(tabletTeleportPose(flight, 2.8).position, targets.tahoe);
  const pose = sampleCharacterPose('idle', 0, { action: 'teleport', actionT: 1 });
  assert.ok(pose.matrices.every(Number.isFinite));
});
test('network tablets wait for the server arrival, and reject local double use during a flight', async () => {
  let subscriber!: (message: import('../teleport-tablets.ts').TabletMessage) => void,
    time = 10000,
    arrivals = 0;
  const calls: unknown[][] = [],
    client = {
      state: {
        connected: true,
        serverOffset: 0,
        inventory: { tablets: { tahoe: 1, downtown: 1 } },
      },
      subscribe: (f: (message: import('../teleport-tablets.ts').TabletMessage) => void) => {
        subscriber = f;
        return () => {};
      },
      command: async (...a: unknown[]) => {
        calls.push(a);
        return { ok: true };
      },
    };
  const t = createTeleportTablets({
    client,
    ...{ economy: createEconomy(), destinations: targets },
    now: () => time,
    onArrive: () => arrivals++,
  });
  await t.use('tahoe');
  assert.equal(calls[0][0], 'useTablet');
  subscriber({
    type: 'tabletTeleport',
    flight: {
      from: { x: 1, y: 2, z: 3 },
      to: targets.tahoe,
      startedAt: time,
      destination: 'tahoe',
    },
  });
  time += 5000;
  t.update();
  assert.equal(t.state.active, true);
  assert.equal(arrivals, 0);
  assert.equal((await t.use('downtown')).ok, false);
  subscriber({ type: 'tabletArrived', position: targets.tahoe, message: 'Arrived' });
  assert.equal(arrivals, 1);
  assert.equal(t.state.active, false);
  client.state.connected = false;
  assert.equal((await t.buy('tahoe')).ok, false);
  assert.equal((await t.use('downtown')).ok, false);
  assert.equal(calls.length, 1);
});
