import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_HOMES, searchHousePoint, preferHouseStorage } from '../search-houses.ts';
import { HOUSE_SEARCHES, pickSearchHouseParcels } from '../config/search-houses.ts';
import { SOUTHERN_HOUSING, SEARCH_HOUSE_PARCELS, inSouthernHousePlot } from '../southern-layout.ts';
import { equipmentOptions } from '../equipment-options.ts';
import { normalizeCharacter, characterAppearance } from '../character-config.ts';
import { drawCharacter } from '../characters.ts';
import { Mesh } from '../geometry.ts';
import { COLLECTION_ITEMS } from '../config/collection.ts';

test('eight distinct residential picks and stable reward IDs are deterministic across reloads', () => {
  assert.equal(SEARCH_HOMES.length, 8);
  assert.equal(new Set(SEARCH_HOUSE_PARCELS).size, 8);
  assert.deepEqual(pickSearchHouseParcels(SOUTHERN_HOUSING), SEARCH_HOUSE_PARCELS);
  assert.deepEqual(
    HOUSE_SEARCHES.filter((s) =>
      (['backpack', 'new-year-rocket', 'clock-amulet'] satisfies [string, string, string]).includes(
        s.reward.item,
      ),
    ).map((s) => s.reward.item),
    ['backpack', 'new-year-rocket', 'clock-amulet'] satisfies [string, string, string],
  );
  for (const h of SEARCH_HOMES) {
    assert.ok(SOUTHERN_HOUSING.includes(h.parcel));
    assert.equal(
      inSouthernHousePlot(h.parcel.x, h.parcel.z),
      false,
      'enterable houses use their actual walls and furniture instead of the old solid plot',
    );
    const at = searchHousePoint(h.parcel, 0, 0);
    assert.equal(at.x, h.parcel.x);
    assert.equal(at.z, h.parcel.z);
  }
});
test('wardrobe choices include only owned finds, with base clothes always available', () => {
  const blank = equipmentOptions();
  assert.deepEqual(
    blank.weapon.map((o) => o.value),
    ['unarmed'],
  );
  assert.deepEqual(
    blank.back.map((o) => o.value),
    ['none'],
  );
  assert.deepEqual(
    blank.neck.map((o) => o.value),
    ['none'],
  );
  assert.deepEqual(
    blank.hat.map((o) => o.value),
    ['none'],
  );
  assert.equal(blank.iceTop.length, 1);
  const owned = equipmentOptions(
    {
      ownedEquipment: [
        'new-year-rocket',
        'backpack',
        'clock-amulet',
        'akibo',
        'ice-top',
      ] satisfies [string, string, string, string, string],
      ownedHats: ['stetson'],
    },
    { railgun: true, cape: true },
  );
  assert.deepEqual(
    owned.back.map((o) => o.value),
    ['none', 'backpack', 'new-year-rocket', 'cape'] satisfies [string, string, string, string],
  );
  assert.deepEqual(
    owned.neck.map((o) => o.value),
    ['none', 'clock-amulet'] satisfies [string, string],
  );
  assert.ok(owned.weapon.some((o) => o.value === 'akibo'));
  assert.ok(!owned.weapon.some((o) => o.value === 'bayonet'));
  assert.equal(owned.iceTop.length, 2);
  assert.equal(owned.icePants.length, 1);
});
test('back accessories share one slot, preserve legacy capes, and render on the original animated rig', () => {
  assert.equal(normalizeCharacter({ cape: true }).back, 'cape');
  assert.equal(normalizeCharacter({ back: 'new-year-rocket', cape: true }).cape, false);
  assert.equal(characterAppearance(normalizeCharacter({ back: 'backpack' })).backpack, true);
  const settings = normalizeCharacter({
    back: 'new-year-rocket',
    neck: 'clock-amulet',
    rocketBurnUntil: 20000,
  });
  for (const action of [undefined, 'dance', 'attack', 'work']) {
    const m = new Mesh();
    drawCharacter(m, 0, 0, 0, 0.7, 1, false, undefined, undefined, {
      ...characterAppearance(settings),
      action,
      actionT: 0.5,
      time: 1.2,
      serverTime: 10000,
    });
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 6500);
  }
  const lit = new Mesh(),
    out = new Mesh();
  for (const [m, serverTime] of [[lit, 10000] as const, [out, 20001] as const])
    drawCharacter(m, 0, 0, 0, 0, 0, false, undefined, undefined, {
      ...characterAppearance(settings),
      time: 1,
      serverTime,
    });
  assert.ok(lit.data.length > out.data.length, 'active flame adds real emissive triangles');
  const clockA = new Mesh(),
    clockB = new Mesh();
  for (const [m, serverTime] of [[clockA, 10000] as const, [clockB, 11000] as const])
    drawCharacter(m, 0, 0, 0, 0, 0, false, undefined, undefined, {
      neck: 'clock-amulet',
      serverTime,
    });
  assert.notDeepEqual(clockA.data, clockB.data, 'the clock hands tick');
});
test('the collection catalog names finds without revealing their locations', () => {
  for (const id of ['backpack', 'new-year-rocket', 'clock-amulet'] satisfies [
    string,
    string,
    string,
  ])
    assert.equal(
      Reflect.get(requiredFixture(COLLECTION_ITEMS.find((i) => i.id === id)), 'hint'),
      undefined,
    );
});

test('storage faces inherit their search target while nearer walls still block selection', () => {
  const room = { id: 'room', searchHome: true },
    hit = { place: room },
    box = {
      lo: [0, 0, 0] satisfies [number, number, number],
      hi: [1, 1, 1] satisfies [number, number, number],
    },
    sites = [{ houseId: 'room', object: box }],
    ray = {
      origin: [0.5, 0.55, 3] satisfies [number, number, number],
      dir: [0, 0, -1] satisfies [number, number, number],
    };
  assert.equal(preferHouseStorage(ray, hit, 2, room, sites), box);
  assert.equal(
    preferHouseStorage(ray, hit, 1, room, sites),
    hit,
    'a nearer wall must not become searchable',
  );
  assert.equal(
    preferHouseStorage(ray, hit, 2, null, sites),
    hit,
    'storage cannot be selected through an unopened roof',
  );
});
