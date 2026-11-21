import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomy } from '../economy.ts';
import { HAT_CATALOG, hatById, ownedHat } from '../hat-catalog.ts';
import { getHatGeometry } from '../hat-models.ts';
import { haberdasherDialogue } from '../haberdashery.ts';
import { getCharacterMesh, drawCharacter, CHARACTER_BONES } from '../characters.ts';
import {
  normalizeCharacter,
  characterAppearance,
  drawCharacterPreview,
} from '../character-config.ts';
import { Mesh } from '../geometry.ts';
import { drawHaberdasherShop, HABERDASHER_SIGNS } from '../haberdasher-shop.ts';
import { HABERDASHER } from '../haberdasher-layout.ts';
import { SOUTHERN_HOUSING } from '../southern-layout.ts';
import { airportRoadDistance } from '../airship.ts';
import { buildingNPCService } from '../building-interactions.ts';

test('the permanent hat catalog spans one to one hundred thousand coins and every purchase is atomic', () => {
  const sold = HAT_CATALOG.filter((h) => !h.dropOnly);
  assert.equal(sold.length, 11);
  assert.equal(sold[0].price, 1);
  assert.equal(requiredFixture(sold.at(-1)).price, 100000);
  assert.ok(HAT_CATALOG.every((h) => !('prestige' in h) || h.prestige === undefined));
  for (const h of sold) {
    const writes: import('../types/content.ts').EconomyState[] = [],
      e = createEconomy({ coins: h.price }, (s) => writes.push(s));
    assert.equal(e.buyHat(h.id).ok, true);
    assert.equal(e.state.coins, 0);
    assert.deepEqual(e.state.ownedHats, [h.id]);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].coins, 0);
    assert.deepEqual(writes[0].ownedHats, [h.id]);
    assert.equal(e.buyHat(h.id).ok, false);
    assert.equal(writes.length, 1);
    assert.deepEqual(createEconomy(writes[0]).state, e.state);
    const poor = createEconomy({ coins: h.price - 1 });
    assert.equal(poor.buyHat(h.id).ok, false);
    assert.equal(poor.state.coins, h.price - 1);
    assert.deepEqual(poor.state.ownedHats, []);
  }
  const e = createEconomy({ coins: 100, ownedHats: ['paper', 'paper', 'imaginary', null] });
  assert.deepEqual(e.state.ownedHats, ['paper']);
  assert.equal(e.buyHat('imaginary').ok, false);
  assert.equal(e.state.coins, 100);
  assert.equal(ownedHat(e.state.ownedHats, 'none'), true);
  assert.equal(ownedHat(e.state.ownedHats, 'paper'), true);
  assert.equal(ownedHat(e.state.ownedHats, 'crown'), false);
});

test('buying fits the hat, owned hats can be worn again for free, and unaffordable choices change nothing', () => {
  const e = createEconomy({ coins: 51 }),
    worn: string[] = [],
    npc = { name: 'Haberdasher' },
    open = () => haberdasherDialogue(npc, e, (id) => worn.push(id));
  assert.equal(open().choices[0].accept().ok, true);
  assert.equal(e.state.coins, 50);
  assert.equal(worn.at(-1), 'paper');
  assert.equal(
    requiredFixture(open().choices.find((c) => c.label.startsWith('Panama'))).accept().ok,
    true,
  );
  assert.equal(e.state.coins, 0);
  assert.equal(worn.at(-1), 'panama');
  assert.equal(open().choices[0].accept().ok, true);
  assert.equal(e.state.coins, 0);
  assert.equal(worn.at(-1), 'paper');
  const before = [...worn];
  assert.equal(requiredFixture(open().choices.at(-1)).accept().ok, false);
  assert.equal(e.state.coins, 0);
  assert.deepEqual(worn, before);
  assert.match(open().choices[0].label, /Wear owned/);
  assert.equal(buildingNPCService({ kind: 'haberdasher' }), 'haberdasher');
});

test('all hat meshes are distinct cached head-bone geometry for both genders and remain finite during emotes', () => {
  const meshes = new Set();
  for (const h of HAT_CATALOG) {
    const geo = getHatGeometry(h.id);
    assert.ok(requiredFixture(geo).mesh.data.every(Number.isFinite));
    assert.ok(requiredFixture(geo).channels.every((c) => c >= 0 && c <= 2));
    assert.equal(getHatGeometry(h.id), geo);
    for (const gender of ['man', 'woman'] satisfies [string, string]) {
      const settings = normalizeCharacter({ gender, hat: h.id }),
        appearance = characterAppearance(settings),
        mesh = getCharacterMesh(appearance);
      meshes.add(mesh);
      const vertices = Array.from(mesh.slots).flatMap((slot, i) => (slot >= 11 ? [i] : []));
      assert.ok(vertices.length > 10);
      for (const i of vertices) {
        assert.equal(mesh.bonesA[i], CHARACTER_BONES.head);
        assert.equal(mesh.bonesB[i], CHARACTER_BONES.head);
      }
      for (const action of ['dance', 'caught', 'forward-roll'] satisfies [string, string, string]) {
        const m = new Mesh();
        drawCharacter(m, 0, 0, 0, 0.7, 1, false, settings.skin, settings.shirt, {
          ...appearance,
          action,
          actionT: 0.5,
          time: 1,
        });
        assert.ok(m.data.every(Number.isFinite));
        assert.ok(m.data.length / 33 < 5000);
      }
    }
  }
  assert.equal(meshes.size, HAT_CATALOG.length * 2);
  assert.equal(normalizeCharacter({ hat: 'imaginary' }).hat, 'none');
  assert.equal(hatById('none'), null);
});

test('the tallest hats fit entirely inside the character preview', () => {
  for (const hat of ['wizard', 'crown', 'stone-of-jordan', 'santa'] satisfies [
    string,
    string,
    string,
    string,
  ]) {
    const points: number[][] = [],
      ctx = {
        clearRect() {},
        fillRect() {},
        beginPath() {},
        ellipse() {},
        fill() {},
        closePath() {},
        moveTo(x: number, y: number) {
          points.push([x, y]);
        },
        lineTo(x: number, y: number) {
          points.push([x, y]);
        },
      },
      canvas = { width: 240, height: 240, getContext: () => ctx };
    drawCharacterPreview(
      canvas as unknown as HTMLCanvasElement,
      normalizeCharacter({ hat, gender: 'woman' }),
    );
    assert.ok(points.length > 0);
    for (const [x, y] of points) {
      assert.ok(x > 0 && x < 240);
      assert.ok(y > 5 && y < 240, 'hat clipped above preview');
    }
  }
});

test('the expensive hats have the requested names, prices and physical models, preserving old top-tier ownership', () => {
  assert.equal(requiredFixture(HAT_CATALOG.find((h) => h.price === 50000)).name, 'Stone of Jordan');
  assert.equal(requiredFixture(HAT_CATALOG.find((h) => h.price === 75000)).name, 'Santa Hat');
  assert.equal(requiredFixture(HAT_CATALOG.find((h) => h.price === 100000)).name, 'Blue Partyhat');
  const old = createEconomy({ coins: 0, ownedHats: ['crown'] });
  assert.deepEqual(old.state.ownedHats, ['crown']);
  assert.equal(normalizeCharacter({ hat: 'crown' }).hat, 'crown');
  const stone = requiredFixture(getHatGeometry('stone-of-jordan')).mesh.data,
    xs = stone.filter((_, i) => i % 11 === 0);
  assert.ok(
    Math.max(...xs) - Math.min(...xs) > 0.55,
    'the Stone of Jordan is a large stone balanced on the head',
  );
  const [r, g, b] = requiredFixture(
    requiredFixture(hatById('crown')).colors[0].match(/[a-f0-9]{2}/gi),
  ).map((v) => parseInt(v, 16));
  assert.ok(b > r && b > g, 'the partyhat is blue');
});

test('the haberdashery occupies an empty parcel and keeps its solid walls off the road', () => {
  const m = new Mesh(),
    signs = new Map(
      HABERDASHER_SIGNS.map((s) => [
        s,
        [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      ]),
    ),
    site = drawHaberdasherShop(m, signs);
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(m.data.length / 33 < 12000);
  assert.deepEqual(site.entry, HABERDASHER.entry);
  for (const [x, z] of site.footprint) assert.ok(airportRoadDistance(x, z) > 0.25);
  const h = HABERDASHER;
  for (const p of SOUTHERN_HOUSING) {
    const rotated = Math.abs(Math.sin(requiredFixture(p.rotation))) > 0.5,
      w = rotated ? p.d : p.w,
      d = rotated ? p.w : p.d;
    assert.ok(
      Math.abs(p.x - h.x) >= (w + h.w) / 2 || Math.abs(p.z - h.z) >= (d + h.d) / 2,
      'shop replaces an existing house',
    );
  }
});
