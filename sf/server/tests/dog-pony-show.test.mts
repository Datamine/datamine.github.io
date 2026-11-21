import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry, player, command, requiredResult } from './fixtures.mts';
import { createDogPonyAdministrator } from '../../dog-pony-show.ts';
import { DOG_PONY_SHOW } from '../../dog-pony-layout.ts';
import { applyWorldPatches } from '../../world-deltas.ts';

test('payment starts one shared show, charges the server price, and rejects duplicate or remote purchases', async () => {
  let time = 1000000;
  const geometry = fixtureGeometry(),
    admin = createDogPonyAdministrator(geometry.characterGround);
  geometry.merchants = [admin];
  const game = await createGame({ geometry, store: createMemoryStore(), now: () => time }),
    a = await player(game, 9971),
    b = await player(game, 9972),
    args = { verb: 'neighborhoodService', id: admin.id, offer: 'watch' };
  try {
    for (const person of [a, b])
      Object.assign(person.p, { x: admin.x + 0.5, z: admin.z, y: admin.base });
    game.broadcast();
    a.messages.length = b.messages.length = 0;
    await command(game, a.p, 'playerAction', { ...args, price: 0, showStartedAt: 42 });
    assert.equal(requiredResult(a.messages).ok, true);
    assert.equal(a.p.inventory.economy.state.coins, 24);
    assert.equal(admin.showStartedAt, time);
    game.tick(0.25);
    game.broadcast();
    for (const person of [a, b]) {
      const maps: import('../../world-deltas.ts').WorldMaps = {};
      for (const m of person.messages.filter((m) => m.type === 'world'))
        applyWorldPatches(maps, m.patches, m.removed);
      assert.equal(requiredFixture(requiredFixture(maps.npcs).get(admin.id)).showStartedAt, time);
    }
    await command(game, b.p, 'playerAction', args);
    assert.equal(requiredResult(b.messages).ok, false);
    assert.equal(b.p.inventory.economy.state.coins, 25);
    time += DOG_PONY_SHOW.durationMs + 1;
    Object.assign(b.p, { x: 0, z: 0 });
    await command(game, b.p, 'playerAction', args);
    assert.equal(requiredResult(b.messages).ok, false);
    assert.equal(b.p.inventory.economy.state.coins, 25);
    Object.assign(b.p, { x: admin.x + 0.5, z: admin.z });
    b.p.inventory.economy.state.coins = 0;
    await command(game, b.p, 'playerAction', args);
    assert.equal(requiredResult(b.messages).ok, false);
    assert.equal(admin.showStartedAt, 1000000);
    b.p.inventory.economy.state.coins = 1;
    await command(game, b.p, 'playerAction', args);
    assert.equal(requiredResult(b.messages).ok, true);
    assert.equal(b.p.inventory.economy.state.coins, 0);
    assert.equal(admin.showStartedAt, time);
  } finally {
    await game.close();
  }
});
