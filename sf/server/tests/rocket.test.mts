import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry, player, requiredResult } from './fixtures.mts';
import { SF_SPACEPORT } from '../../southern-district.ts';
import { createTahoe } from '../../tahoe.ts';
import { createRocketTravel } from '../../rocket.ts';
import { decodePlayerFrame } from '../../multiplayer-protocol.ts';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('authoritative rocket boarding carries the limb phase, facing and motion; both flights finish without browser input', async (t) => {
  const geometry = fixtureGeometry(),
    tahoe = createTahoe();
  geometry.tahoe = tahoe;
  geometry.merchants = [
    ['sf-spaceport', SF_SPACEPORT] as const,
    ['tahoe-spaceport', tahoe.spaceport] as const,
  ].map(([id, site]) => ({
    id: id + '-attendant',
    label: 'Attendant',
    kind: 'crew',
    siteId: id,
    x: site.entry.x + 0.5,
    z: site.entry.y + 0.5,
    base: site.base + 0.04,
  }));
  const game = await createGame({ geometry, store: createMemoryStore() });
  t.after(() => game.close());
  const a = await player(game, 4811, { 'sf-purse-v1': '{"coins":25}' }),
    observer = await player(game, 4812);
  for (const [from, to] of [
    [SF_SPACEPORT, tahoe.spaceport],
    [tahoe.spaceport, SF_SPACEPORT],
  ]) {
    Object.assign(a.p, {
      x: from.entry.x + 0.5,
      z: from.entry.y + 0.5,
      y: from.base + 0.04,
      angle: -2.1,
      phase: 18,
      motion: 0,
      moving: false,
    });
    Object.assign(observer.p, { x: a.p.x + 1, z: a.p.z, y: a.p.y });
    game.broadcast();
    assert.ok(observer.p.seen.has(a.p.id));
    const entry = { x: a.p.x, y: a.p.y, z: a.p.z };
    game.receive(a.p, {
      type: 'command',
      request: 1,
      action: 'travel',
      args: { kind: 'rocket' },
      inventoryEpoch: a.p.inventory.meta.epoch,
    });
    await a.p.queue;
    assert.equal(requiredResult(a.messages).ok, true);
    const rocket = game.movement.state(a.p).rocket,
      reference = createRocketTravel();
    reference.start(from, to, entry);
    assert.deepEqual(rocket.state.entry, entry);
    let climbing = 0,
      previousPhase = null;
    for (let tick = 0; tick < Math.ceil(rocket.duration * 20) + 2; tick++) {
      game.tick(0.05);
      reference.update(0.05);
      const pose = rocket.state.pose;
      assert.ok(
        reference?.state?.position != null,
        'Missing test fixture: reference.state.position',
      );
      near(a.p.x, reference.state.position.x);

      near(a.p.y, reference.state.position.y);

      near(a.p.z, reference.state.position.z);
      near(a.p.angle, requiredFixture(pose).angle);
      near(a.p.phase, requiredFixture(pose).phase);
      near(a.p.motion, requiredFixture(pose).motion);
      assert.equal(a.p.moving, requiredFixture(pose).motion > 1e-5);
      if (rocket.state.active) {
        assert.equal(a.p.mode, 'hidden');
      }
      if (requiredFixture(pose).stage === 'ladder' && rocket.state.phase === 'boarding') {
        if (previousPhase !== null) assert.ok(a.p.phase > previousPhase);
        previousPhase = a.p.phase;
        climbing++;
      }
      if (tick === 30) {
        game.broadcast();
        assert.equal(
          observer.p.seen.has(a.p.id),
          false,
          'rocket traveler must disappear for peers',
        );
        const self = requiredFixture(
          decodePlayerFrame(
            requiredFixture(a.messages.filter((m) => m instanceof ArrayBuffer).at(-1)),
          ),
        ).players.find((n) => n.id === a.p.id);
        assert.ok(self != null, 'Missing test fixture: self');
        assert.equal(self.mode, 'hidden');

        assert.ok(self.motion > 0);

        assert.ok(self.phase > 0, 'binary self pose must include the climbing animation');
      }
      if (!rocket.state.active) break;
    }
    assert.ok(climbing > 70);
    assert.equal(rocket.state.active, false);
    assert.equal(a.p.mode, 'walk');
    near(a.p.x, to.entry.x + 0.5);
    near(a.p.z, to.entry.y + 0.5);
    Object.assign(observer.p, { x: a.p.x + 1, z: a.p.z, y: a.p.y });
    game.broadcast();
    assert.ok(observer.p.seen.has(a.p.id), 'traveler reappears on arrival');
  }
  assert.equal(a.p.inventory.economy.state.coins, 23);
  Object.assign(a.p, { x: 50, z: 50, y: 1.15 });
  game.receive(a.p, {
    type: 'command',
    request: 2,
    action: 'travel',
    args: { kind: 'rocket' },
    inventoryEpoch: a.p.inventory.meta.epoch,
  });
  await a.p.queue;
  assert.equal(
    requiredResult(a.messages).ok,
    false,
    'a missing attendant cannot default to the SF launch pad',
  );
  assert.equal(a.p.inventory.economy.state.coins, 23);
  assert.equal(game.movement.state(a.p).rocket.state.active, false);
});
