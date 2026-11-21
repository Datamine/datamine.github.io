import { mapTuple } from './helpers/geometry.mts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomy, TRADE_PRICES } from '../economy.ts';
import { createHitpoints } from '../combat.ts';
import {
  createTechVentures,
  techMerchantDialogue,
  IPHONE_PRICE,
  ROBOTAXI_PRICE,
} from '../tech-ventures.ts';
import { APPLE_CAMPUS, appleRingSections } from '../tech-layout.ts';
import { drawAppleCampus, drawRobotaxiDealer, TECH_SIGNS } from '../tech-buildings.ts';
import { createRegionalNavigation } from '../regional-navigation.ts';
import { SOUTHERN_HOUSING } from '../southern-layout.ts';
import { Mesh, rayTriangle } from '../geometry.ts';
import { drawCharacter, getCharacterMesh, CHARACTER_BONES } from '../characters.ts';
import { buildingNPCService } from '../building-interactions.ts';
const make = (
  purse: Partial<import('../types/content.ts').EconomyState> | null = {},
  saved: Parameters<typeof createTechVentures>[0]['saved'] | null = {},
) => {
  const economy = createEconomy({ coins: 200, ...purse }),
    health = createHitpoints(),
    events: string[] = [];
  let deaths = 0,
    lastSave:
      Parameters<NonNullable<Parameters<typeof createTechVentures>[0]['onSave']>>[0] | null = null;
  const game = createTechVentures({
    economy,
    health,
    saved: saved ?? {},
    onMessage: (s) => events.push(s),
    onDeath: () => deaths++,
    onSave: (s) => (lastSave = s),
  });
  return {
    economy,
    health,
    game,
    events,
    get deaths() {
      return deaths;
    },
    get saved() {
      return lastSave;
    },
  };
};

test('phones and robotaxis each cost exactly 100 and duplicate or unaffordable purchases do not charge', () => {
  const g = make();
  assert.equal(IPHONE_PRICE, TRADE_PRICES.iphone);
  assert.equal(ROBOTAXI_PRICE, TRADE_PRICES.robotaxi);
  assert.equal(g.game.buyPhone().ok, true);
  assert.equal(g.economy.state.coins, 100);
  assert.equal(g.economy.state.iphoneEquipped, true);
  assert.equal(g.game.buyPhone().ok, false);
  assert.equal(g.economy.state.coins, 100);
  assert.equal(g.game.buyRobotaxi().ok, true);
  assert.equal(g.economy.state.coins, 0);
  assert.equal(g.game.buyRobotaxi().ok, false);
  assert.equal(g.economy.state.coins, 0);
  const poor = make({ coins: 99 });
  assert.equal(poor.game.buyPhone().ok, false);
  assert.equal(poor.game.buyRobotaxi().ok, false);
  assert.equal(poor.economy.state.coins, 99);
  assert.equal(poor.game.equipPhone(true).ok, false);
  const corrupt = createEconomy({
    iphoneOwned: false,
    iphoneEquipped: true,
    robotaxiOwned: 'yes',
    incomeQuarters: 100,
  });
  assert.equal(corrupt.state.iphoneEquipped, false);
  assert.equal(corrupt.state.robotaxiOwned, false);
  assert.equal(corrupt.state.incomeQuarters, 0);
});

test('equipped phones boost trades and direct rewards by 25%, carrying fractional bonuses across wages and reloads', () => {
  const g = make();
  g.game.buyPhone();
  const start = g.economy.state.coins;
  for (let i = 0; i < 4; i++) assert.equal(g.economy.trade('ai-lab-wage').ok, true);
  assert.equal(g.economy.state.coins, start + 5);
  g.economy.trade('collect-sand');
  const sale = g.economy.trade('sand-sale');
  assert.equal(sale.earned, 25);
  assert.equal(sale.bonus, 5);
  g.economy.trade('salt-letter-collect');
  assert.equal(g.economy.trade('salt-letter-deliver').earned, 62);
  assert.equal(g.economy.state.incomeQuarters, 2);
  const loaded = createEconomy({ ...g.economy.state });
  assert.equal(loaded.credit(2).earned, 3);
  assert.equal(loaded.state.incomeQuarters, 0);
  loaded.equipPhone(false);
  assert.equal(loaded.credit(20).earned, 20);
  loaded.equipPhone(true);
  assert.equal(loaded.credit(20).earned, 25);
  const before = loaded.state.coins;
  assert.equal(loaded.trade('coffee').ok, true);
  assert.equal(loaded.state.coins, before - 1, 'the boost must not alter purchase prices');
  loaded.state.coins = Number.MAX_SAFE_INTEGER;
  const remainder = loaded.state.incomeQuarters;
  assert.equal(loaded.credit(1).ok, false);
  assert.equal(loaded.state.incomeQuarters, remainder);
  assert.equal(loaded.state.coins, Number.MAX_SAFE_INTEGER);
});

test('doomscrolling takes five HP per two equipped minutes and unequipping pauses rather than resets it', () => {
  const g = make();
  g.game.buyPhone();
  g.game.update(119.9);
  assert.equal(g.health.state.hp, 30);
  g.game.equipPhone(false);
  g.game.update(300);
  assert.equal(g.health.state.hp, 30);
  assert.ok(Math.abs(g.game.state.doomElapsed - 119.9) < 1e-8);
  g.game.equipPhone(true);
  assert.equal(g.game.update(0.1).damage, 5);
  assert.equal(g.health.state.hp, 25);
  g.game.update(240);
  assert.equal(g.health.state.hp, 15);
  assert.equal(g.deaths, 0);
  const saved = g.saved,
    loaded = make({ ...g.economy.state }, saved);
  assert.equal(loaded.game.state.doomElapsed, g.game.state.doomElapsed);
  loaded.game.update(360);
  assert.equal(loaded.health.state.hp, 15);
});

test('doomscroll death removes the phone immediately; death and arrest leave the robotaxi business intact', () => {
  const g = make();
  g.game.buyPhone();
  g.game.buyRobotaxi();
  g.health.damage(25);
  g.game.update(120);
  assert.equal(g.health.state.hp, 0);
  assert.equal(g.deaths, 1);
  assert.equal(g.economy.state.iphoneOwned, false);
  assert.equal(g.economy.state.iphoneEquipped, false);
  assert.equal(g.economy.state.robotaxiOwned, true);
  assert.equal(g.economy.state.coins, 50);
  g.game.update(120);
  assert.equal(g.deaths, 1);
  assert.equal(g.economy.state.coins, 90);
  assert.equal(g.health.state.hp, 0);
  g.economy.credit(100);
  assert.equal(g.game.buyPhone().ok, true);
  assert.equal(g.game.losePhone('arrest').ok, true);
  assert.equal(g.economy.state.iphoneOwned, false);
  assert.equal(g.economy.state.robotaxiOwned, true);
  assert.match(requiredFixture(g.events.at(-1)), /confiscated/);
});

test('robotaxis pay 20 per minute, 25 with a phone, and save partial minutes without offline catch-up', () => {
  const g = make();
  g.game.buyRobotaxi();
  const initial = g.economy.state.coins;
  assert.equal(g.game.update(59.9).earned, 0);
  assert.equal(g.game.update(0.1).earned, 20);
  assert.equal(g.economy.state.coins, initial + 20);
  assert.deepEqual(g.events, [], 'automatic fares update the purse without adding chat messages');
  g.game.update(32);
  const loaded = make({ ...g.economy.state }, g.saved);
  assert.equal(loaded.game.state.taxiElapsed, 32);
  assert.equal(loaded.game.update(28).earned, 20);
  loaded.game.buyPhone();
  assert.equal(loaded.game.update(60).earned, 25);
  const wallet = loaded.economy.state.coins;
  loaded.game.advanceTo(1000);
  loaded.game.advanceTo(31000);
  loaded.game.suspend();
  loaded.game.advanceTo(1000000);
  assert.equal(loaded.economy.state.coins, wallet);
  assert.equal(loaded.game.advanceTo(1030000).earned, 25);
  const before = loaded.economy.state.coins;
  loaded.game.advanceTo(1000);
  assert.equal(
    loaded.game.advanceTo(1030000).earned,
    0,
    'backwards render timestamps must not duplicate elapsed time',
  );
  assert.equal(loaded.economy.state.coins, before);
});

test('timed outcomes are invariant under frame subdivision and handle long visible frames', () => {
  const a = make(),
    b = make();
  for (const g of [a, b]) {
    g.game.buyPhone();
    g.game.buyRobotaxi();
  }
  a.game.update(360);
  for (let i = 0; i < 7200; i++) b.game.update(0.05);
  assert.equal(a.economy.state.coins, b.economy.state.coins);
  assert.equal(a.health.state.hp, b.health.state.hp);
  assert.ok(Math.abs(a.game.state.doomElapsed - b.game.state.doomElapsed) < 1e-6);
  const c = make();
  c.game.buyRobotaxi();
  c.game.advanceTo(0);
  assert.equal(
    c.game.advanceTo(60000).earned,
    20,
    'asset rates use real elapsed time rather than the movement frame clamp',
  );
  for (const dt of [NaN, Infinity, -1, 0] satisfies [number, number, number, number])
    assert.deepEqual(c.game.update(dt), { earned: 0, damage: 0 });
});

test('the donut has a genuine reachable courtyard and northern gateway, while occupied ring walls block passage', () => {
  const m = new Mesh(),
    signs = new Map(
      TECH_SIGNS.map((s) => [
        s,
        [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      ]),
    ),
    apple = drawAppleCampus(m, signs),
    dealer = drawRobotaxiDealer(m, signs),
    a = APPLE_CAMPUS;
  assert.ok(m.data.every(Number.isFinite));
  assert.ok(m.data.length / 33 < 14000);
  const nav = createRegionalNavigation({
    west: 38,
    east: 52,
    north: 168,
    south: 179,
    walkable: () => true,
  });
  nav.setObstacles([...apple.navigationPolygons, ...dealer.navigationPolygons]);
  const from = { x: a.x - 0.5, y: 168 },
    to = { ...apple.entry };
  assert.ok(nav.path(from, to));
  assert.equal(nav.contains(a.x, a.z - 1.3), true);
  assert.equal(nav.contains(a.x + a.outer - 0.3, a.z), false);
  const ray = {
    origin: [a.x, 10, a.z] satisfies [number, number, number],
    dir: [0, -1, 0] satisfies [number, number, number],
  };
  let nearest = Infinity;
  for (let i = 0; i < apple.count; i += 33) {
    const d = rayTriangle(
      ray,
      ...mapTuple([0, 11, 22] satisfies [number, number, number], (j) =>
        m.data.slice(i + j, i + j + 3),
      ),
    );
    if (d !== null) nearest = Math.min(nearest, d);
  }
  assert.ok(10 - nearest < a.base + 0.1, 'the courtyard must have no roof');
  assert.ok(a.height - 0.02 > 2.3, 'the gateway must clear the tallest hats');
  assert.equal(appleRingSections().length, 58);
  assert.equal(buildingNPCService(apple), 'tim-apple');
  assert.equal(buildingNPCService(dealer), 'robotaxi-sales');
  for (const h of SOUTHERN_HOUSING)
    assert.ok(
      Math.hypot(h.x - a.x, h.z - a.z) > a.outer + Math.hypot(h.w, h.d) / 2,
      'the campus replaces a house',
    );
});

test('phone geometry stays attached to the right hand and both services expose their purchase dialogue', async () => {
  const mesh = getCharacterMesh({ phone: true }),
    ids = Array.from(mesh.slots).flatMap((slot, i) => (slot >= 14 ? [i] : []));
  assert.ok(ids.length > 0);
  for (const i of ids) assert.equal(mesh.bonesA[i], CHARACTER_BONES.rightHand);
  const m = new Mesh();
  drawCharacter(m, 0, 0, 0, 0, 1, false, undefined, undefined, {
    phone: true,
    mode: 'move',
    motion: 1,
  });
  assert.ok(m.data.every(Number.isFinite));
  const g = make(),
    phone = techMerchantDialogue({ kind: 'tim-apple' }, g.game, g.economy),
    cab = techMerchantDialogue({ kind: 'robotaxi-sales' }, g.game, g.economy);
  assert.ok(phone?.choices != null, 'Missing test fixture: phone.choices');
  assert.equal(
    requiredFixture(await requiredFixture(await requiredFixture(phone.choices[0].accept)())).ok,
    true,
  );
  assert.ok(cab?.choices != null, 'Missing test fixture: cab.choices');
  assert.equal(
    requiredFixture(await requiredFixture(await requiredFixture(cab.choices[0].accept)())).ok,
    true,
  );
  assert.equal(g.economy.state.coins, 0);
  assert.equal(
    requiredFixture(
      await requiredFixture(
        await requiredFixture(
          requiredFixture(techMerchantDialogue({ kind: 'tim-apple' }, g.game, g.economy).choices)[0]
            .accept,
        )(),
      ),
    ).ok,
    true,
  );
  assert.equal(g.economy.state.iphoneEquipped, false);
});
