import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorldModel } from '../../world.js';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { player, latestResult } from './fixtures.mjs';
import { cowSpawns, COW_PEN } from '../../jurassic-layout.js';

const geometry = createWorldModel(),
  game = await createGame({ geometry, store: createMemoryStore(), random: () => 0.5 });
after(() => game.close());

test('all eight cows have reachable melee and ranged approaches in the actual pasture, accepted by the server', async () => {
  assert.equal(game.shared.cows.length, 8);
  assert.deepEqual(
    game.shared.cows.map((c) => [c.id, c.x, c.z]),
    cowSpawns().map((c) => [c.id, c.x, c.z]),
  );
  let id = 25000;
  for (const cow of game.shared.cows)
    for (const weapon of ['unarmed', 'railgun']) {
      assert.ok(
        geometry.landClearAt(cow.x - 0.5, cow.z - 0.5),
        cow.id + ' has an obstructed spawn',
      );
      const point = geometry.approaches.combat(cow, weapon, COW_PEN.entry);
      assert.ok(point, cow.id + ' has no ' + weapon + ' approach');
      const path = geometry.pathTo(point.x, point.y, COW_PEN.entry);
      assert.ok(path, cow.id + ' is unreachable through the gate');
      let previous = COW_PEN.entry;
      for (const step of path) {
        assert.ok(geometry.canTravel(previous.x, previous.y, step.x, step.y, true));
        previous = step;
      }
      const a = await player(game, ++id);
      Object.assign(a.p, {
        x: point.x + 0.5,
        z: point.y + 0.5,
        y: geometry.characterGround(point.x + 0.5, point.y + 0.5),
      });
      game.receive(a.p, {
        type: 'command',
        request: id,
        action: 'attack',
        args: { id: cow.id, weapon },
      });
      await a.p.queue;
      const result = latestResult(a.messages);
      assert.equal(result.ok, true, cow.id + ' ' + weapon + ': ' + result.message);
      assert.ok(result.damage > 0);
    }
});

test('the country scenery does not block cow sight lines while its actual barn remains solid', () => {
  const cow = game.shared.cows[3],
    from = { x: cow.x - 0.9, z: cow.z, base: geometry.characterGround(cow.x - 0.9, cow.z) };
  assert.equal(geometry.lineClear(from, cow), true);
  const z = COW_PEN.z,
    base = geometry.characterGround(43.5, z);
  assert.equal(
    geometry.lineClear({ x: 41, z, base }, { x: 46, z, base }),
    false,
    'the barn must still obstruct attacks',
  );
});
