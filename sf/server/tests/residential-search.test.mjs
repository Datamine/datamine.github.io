import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command, latestResult } from './fixtures.mjs';
import { SEARCH_HOMES } from '../../search-houses.js';

async function setup() {
  let time = 1000000;
  const geometry = fixtureGeometry();
  geometry.searchSites = SEARCH_HOMES.map((h) => ({
    id: h.search.id,
    houseId: h.id,
    label: h.search.label,
    x: h.target.x,
    z: h.target.z,
    entry: h.approach,
    base: 1.15,
  }));
  geometry.placeAt = (x, y) => {
    const s = geometry.searchSites.find((s) => Math.hypot(x - s.entry.x, y - s.entry.y) < 0.4);
    return s ? { id: s.houseId } : null;
  };
  const store = createMemoryStore(),
    game = await createGame({ geometry, store, now: () => time });
  return { game, store, geometry, now: () => time, advance: (ms) => (time += ms) };
}
function stand(a, site) {
  Object.assign(a.p, { x: site.entry.x + 0.5, z: site.entry.y + 0.5, y: site.base });
}
async function search(f, a, index) {
  const site = f.geometry.searchSites[index];
  stand(a, site);
  await command(f.game, a.p, 'searchHouse', { id: site.id });
  return latestResult(a.messages);
}
test('each character can keep each authored reward once; other players have their own containers', async () => {
  const f = await setup();
  try {
    const a = await player(f.game, 57001),
      b = await player(f.game, 57002);
    assert.equal((await search(f, a, 2)).ok, true);
    assert.ok(a.p.inventory.economy.state.ownedEquipment.includes('backpack'));
    for (const i of [0, 1, 3, 4, 5, 6, 7]) assert.equal((await search(f, a, i)).ok, true);
    assert.equal(a.p.profile.houseSearches.length, 8);
    assert.equal(a.p.inventory.meta.sandwiches, 6);
    assert.equal(a.p.inventory.economy.state.coins, 175);
    assert.ok(a.p.inventory.economy.state.ownedEquipment.includes('new-year-rocket'));
    assert.ok(a.p.inventory.economy.state.ownedEquipment.includes('clock-amulet'));
    assert.equal((await search(f, a, 1)).ok, false);
    assert.equal(a.p.inventory.economy.state.coins, 175);
    assert.equal((await search(f, b, 1)).ok, true);
    assert.equal(b.p.inventory.economy.state.coins, 50);
    await f.game.flush();
    const saved = await f.store.get('player:' + a.p.owner);
    assert.equal(saved.houseSearches.length, 8);
    assert.ok(saved.collection.includes('clock-amulet'));
  } finally {
    await f.game.close();
  }
});
test('distant, outside, invented and full-bag searches cannot claim rewards', async () => {
  const f = await setup();
  try {
    const a = await player(f.game, 57003),
      site = f.geometry.searchSites[0];
    await command(f.game, a.p, 'searchHouse', {
      id: site.id,
      reward: { item: 'coins', amount: 100000 },
    });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.inventory.meta.sandwiches, 0);
    stand(a, site);
    a.p.x += 1;
    await command(f.game, a.p, 'searchHouse', { id: site.id });
    assert.equal(
      latestResult(a.messages).ok,
      false,
      'outside the room must not reach through a wall',
    );
    await command(f.game, a.p, 'searchHouse', { id: 'invented' });
    assert.equal(latestResult(a.messages).ok, false);
    a.p.inventory.receive({ lootKind: 'sandwich', amount: 4 });
    assert.equal((await search(f, a, 0)).ok, false);
    assert.ok(!a.p.profile.houseSearches?.includes(site.id));
    a.p.inventory.meta.sandwiches = 0;
    a.p.inventory.save();
    assert.equal((await search(f, a, 0)).ok, true);
    assert.equal(a.p.inventory.meta.sandwiches, 3);
  } finally {
    await f.game.close();
  }
});
test('the rocket and amulet must be owned; ignition lasts ten seconds, cannot restart before one minute, and survives a restart', async () => {
  const f = await setup();
  let game = f.game;
  try {
    const a = await player(game, 57004);
    await command(game, a.p, 'equipAppearance', {
      look: { back: 'new-year-rocket', neck: 'clock-amulet', rocketBurnUntil: 9e15 },
    });
    assert.equal(a.p.appearance.back, 'none');
    assert.equal(a.p.appearance.neck, 'none');
    await command(game, a.p, 'lightDecorativeRocket');
    assert.equal(latestResult(a.messages).ok, false);
    await search(f, a, 5);
    await search(f, a, 7);
    await command(game, a.p, 'equipAppearance', {
      look: { back: 'new-year-rocket', neck: 'clock-amulet' },
    });
    assert.equal(a.p.appearance.back, 'new-year-rocket');
    assert.equal(a.p.appearance.neck, 'clock-amulet');
    await command(game, a.p, 'lightDecorativeRocket');
    assert.equal(latestResult(a.messages).ok, true);
    assert.equal(a.p.appearance.rocketBurnUntil, f.now() + 10000);
    assert.equal(a.p.profile.decorativeRocketReadyAt, f.now() + 60000);
    await command(game, a.p, 'lightDecorativeRocket');
    assert.equal(latestResult(a.messages).ok, false);
    f.advance(10000);
    game.tick(0.05);
    assert.equal(a.p.appearance.rocketBurnUntil, 0);
    await game.close();
    game = await createGame({ geometry: f.geometry, store: f.store, now: f.now });
    const b = await player(game, 57004);
    assert.equal(b.p.appearance.back, 'new-year-rocket');
    assert.equal(b.p.appearance.neck, 'clock-amulet');
    assert.equal(b.p.profile.houseSearches.length, 2);
    await command(game, b.p, 'lightDecorativeRocket');
    assert.equal(latestResult(b.messages).ok, false);
    f.advance(50000);
    await command(game, b.p, 'lightDecorativeRocket');
    assert.equal(latestResult(b.messages).ok, true);
  } finally {
    await game.close();
  }
});
