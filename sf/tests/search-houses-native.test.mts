import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldModel } from '../world.ts';
import { SEARCH_HOMES } from '../search-houses.ts';
import { navigationObstacles } from '../navigation.ts';

const world = createWorldModel({ retainInteriors: true });
test('the park has one bison on clear grass and Yohji has an accessible room at the southern edge', () => {
  const bison = world.wilderness.actors.filter((n) => n.combatKind === 'bison');
  assert.equal(bison.length, 1);
  const b = bison[0];
  assert.equal(world.groundSurfaceAt(b.x, b.z), 'grass');
  assert.ok(b.x > 13 && b.x < 48 && b.z > 43 && b.z < 51);
  assert.ok(world.landClearAt(b.x - 0.5, b.z - 0.5));
  const y = world.merchants.find((n) => n.kind === 'yohji');
  assert.ok(y && y.z > 230);
  assert.equal(world.placeAt(y.x - 0.5, y.z - 0.5), y.interior);
  const entry = world.approaches.merchant(y);
  assert.ok(entry);
  assert.equal(world.placeAt(entry.x, entry.y), y.interior);
  assert.ok(y?.interior != null, 'Missing test fixture: y.interior');
  assert.ok(world.pathTo(entry.x, entry.y, y.interior.entry));
});
test('Goose Corp books have reachable reading spots in four houses and the lodge', () => {
  assert.equal(world.loreSites.length, 5);
  assert.equal(new Set(world.loreSites.map((s) => s.bookId)).size, 5);
  for (const site of world.loreSites) {
    const room = world.places.find((p) => p.id === site.houseId);
    assert.ok(room?.object);
    assert.equal(
      world.placeAt(site.entry.x, site.entry.y),
      room,
      site.id + ' reading spot belongs to the room',
    );
    assert.ok(
      world.pathTo(site.entry.x, site.entry.y, room.inside),
      site.id + ' reading spot is accessible',
    );
    assert.ok(site?.object?.count != null, 'Missing test fixture: site.object.count');
    assert.ok(site.object.count > 0);
    assert.ok(site?.object?.lo != null, 'Missing test fixture: site.object.lo');
    assert.ok(site?.object?.hi != null, 'Missing test fixture: site.object.hi');
    assert.ok(site.object.lo.every(Number.isFinite) && site.object.hi.every(Number.isFinite));
    assert.ok(site?.object != null, 'Missing test fixture: site.object');
    assert.ok(site?.base != null, 'Missing test fixture: site.base');
    assert.ok(site.object.lo[1] > site.base + 0.4, 'a book rests on its furniture');

    assert.ok(site.object.hi[1] - site.object.lo[1] < 0.1);
    assert.equal(
      world.sights.find((s) => s.id === site.id),
      site,
    );

    assert.equal(site.object.sight, site);

    assert.equal(site.object.interior, room);
  }
});
test('all eight homes have connected doorways, walkable interiors and reachable storage', () => {
  assert.equal(world.searchSites.length, 8);
  for (const home of SEARCH_HOMES) {
    const house = world.places.find((p) => p.id === home.id),
      site = world.searchSites.find((s) => s.id === home.search.id);
    assert.ok(house?.object && site);
    assert.ok(house?.entry != null, 'Missing test fixture: house.entry');
    assert.ok(world.pathTo(house.entry.x, house.entry.y, world.spawn), home.id + ' outside');
    assert.ok(house?.inside != null, 'Missing test fixture: house.inside');
    assert.ok(world.pathTo(house.inside.x, house.inside.y, house.entry), home.id + ' door');
    assert.ok(world.pathTo(site.entry.x, site.entry.y, house.inside), home.id + ' storage');
    assert.equal(world.placeAt(site.entry.x, site.entry.y), house);
    assert.ok(site?.base != null, 'Missing test fixture: site.base');
    assert.ok(
      Math.abs(world.characterGround(site.entry.x + 0.5, site.entry.y + 0.5) - site.base) < 0.1,
    );
    const c = Math.cos(requiredFixture(house.rotation)),
      s = Math.sin(requiredFixture(house.rotation)),
      cx = house.x + house.w / 2,
      cz = house.y + house.d / 2;
    for (const o of world.objects) {
      if (o === house.object || o.interior === house || (!o.solid && !o.arch)) continue;
      for (const obstacle of navigationObstacles([o])) {
        const center = obstacle.polygon.reduce(
            (a, p) =>
              [
                a[0] + p[0] / obstacle.polygon.length,
                a[1] + p[1] / obstacle.polygon.length,
              ] satisfies [number, number],
            [0, 0] satisfies [number, number],
          ),
          dx = center[0] - cx,
          dz = center[1] - cz,
          u = dx * c + dz * s,
          v = -dx * s + dz * c;
        assert.ok(
          Math.abs(u) >= house.w / 2 - 0.12 || Math.abs(v) >= house.d / 2 - 0.12,
          home.id + ' has foreign decor inside: ' + obstacle.id,
        );
      }
    }
  }
});
