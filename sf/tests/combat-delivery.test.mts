import type { BattleEvent } from '../combat.ts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHitpoints, createAlienBattle, combatStats, MAX_HITPOINTS } from '../combat.ts';
import { createDeli, drawDeliveryCooler } from '../deli.ts';
import { createEconomy } from '../economy.ts';
import { createStreetTraffic, drawWaymo } from '../street-traffic.ts';
import { drawAirportBillboard } from '../airport-billboards.ts';
import { createTheyLiveQuest, ALIEN_TARGETS } from '../they-live.ts';
import { Mesh } from '../geometry.ts';

function fight(level: number, bayonet: boolean, step = 0.05) {
  const health = createHitpoints(),
    battle = createAlienBattle({ health, level: () => level, bayonet, random: () => 0.5 }),
    events: BattleEvent[] = [];
  for (let i = 0; i < 2000 && !battle.state.ended; i++) events.push(...battle.update(step));
  return { health: health.state.hp, alien: battle.state.hp, events };
}
test('spectres require a bayonet; gym strength improves armed combat', () => {
  const bare = fight(1, false),
    armed = fight(1, true),
    strong = fight(10, true);
  assert.equal(bare.health, 0);
  assert.ok(bare.alien > 0);
  assert.equal(requiredFixture(bare.events.at(-1)).type, 'death');
  for (const result of [armed, strong]) {
    assert.ok(result.health > 0 && result.health < MAX_HITPOINTS);
    assert.equal(result.alien, 0);
    assert.equal(requiredFixture(result.events.at(-1)).type, 'victory');
  }
  assert.ok(combatStats(10, false).damage > combatStats(1, false).damage);
  assert.ok(combatStats(10, false).alienDamage < combatStats(1, false).alienDamage);
  assert.equal(fight(10, false).alien, 36, 'strength alone cannot cut a spectre');
  for (const step of [1 / 120, 0.2, 3] satisfies [number, number, number]) {
    const b = fight(1, true, step);
    assert.equal(b.health, armed.health);
    assert.deepEqual(b.events, armed.events);
  }
});

test('health survives reloads, healing clamps, and a resolved fight cannot deal more damage', () => {
  let saved;
  const hp = createHitpoints({}, (s) => (saved = s));
  assert.equal(hp.damage(8), 8);
  assert.equal(createHitpoints(saved).state.hp, 22);
  assert.equal(hp.heal(), 8);
  assert.equal(hp.heal(), 0);
  hp.damage(100);
  assert.equal(hp.state.hp, 0);
  hp.restore();
  assert.equal(hp.state.hp, 30);
  const battle = createAlienBattle({ health: hp, bayonet: true });
  battle.update(30);
  const end = hp.state.hp;
  assert.deepEqual(battle.update(30), []);
  assert.equal(hp.state.hp, end);
});

test('legal spectre victories survive quest reload; permits still gate attacks', () => {
  const q = createTheyLiveQuest();
  q.start();
  assert.equal(q.attack(ALIEN_TARGETS[0].id, { revealed: true }).illegal, true);
  q.certificate();
  q.permit();
  assert.equal(q.attack(ALIEN_TARGETS[0].id, { revealed: true }).ok, true);
  q.defeat(ALIEN_TARGETS[0].id, { revealed: true });
  const restored = createTheyLiveQuest(q.state);
  assert.equal(restored.isDefeated(ALIEN_TARGETS[0].id), true);
  for (const a of ALIEN_TARGETS.slice(1)) restored.defeat(a.id, { revealed: true });
  assert.equal(restored.reward().ok, true);
  assert.equal(createTheyLiveQuest(restored.state).state.skateboard, true);
});

const setupDeli = (saved: { pending?: boolean } | undefined = {}) => {
  const economy = createEconomy(),
    health = createHitpoints(),
    savedStates: { sandwiches: number; pending: boolean }[] = [],
    messages: string[] = [];
  // A bent path around an obstacle, rather than a straight-line shortcut.
  const routeTo = (
    target: import('../types/geometry.ts').Point,
    from: import('../types/geometry.ts').Point,
  ) => (target.x < 0 ? null : [{ x: from.x, y: 2 }, { x: target.x, y: 2 }, { ...target }]);
  const deli = createDeli({
    economy,
    health,
    origin: { x: 0, y: 0 },
    routeTo,
    canTravel: (a, b) => a.x === b.x || a.y === b.y,
    saved,
    onSave: (s) => savedStates.push(s),
    onMessage: (m) => messages.push(m),
  });
  return { deli, economy, health, savedStates, messages };
};
test('pickup costs less, deliveries follow routed segments and grant exactly one healing sandwich', () => {
  const { deli, economy, health, messages, savedStates } = setupDeli();
  assert.ok(deli.pickup().ok);
  assert.equal(economy.state.coins, 22);
  assert.equal(deli.state.sandwiches, 1);
  assert.equal(deli.eat().ok, false);
  assert.equal(deli.state.sandwiches, 1);
  health.damage(22);
  assert.ok(deli.eat().ok);
  assert.equal(health.state.hp, 23);
  assert.equal(deli.state.sandwiches, 0);
  const target = { x: 10, y: 0 };
  assert.equal(deli.order({ x: -1, y: 0 }).ok, false);
  assert.equal(economy.state.coins, 22);
  assert.ok(deli.order(target).ok);
  assert.equal(economy.state.coins, 18);
  assert.equal(deli.order(target).ok, false);
  assert.equal(economy.state.coins, 18);
  deli.update(0.2, target);
  assert.equal(deli.state.position.x, 0);
  assert.ok(deli.state.position.y > 0);
  assert.equal(deli.state.sandwiches, 0);
  for (let i = 0; i < 200; i++) deli.update(0.05, target);
  assert.equal(deli.state.pending, false);
  assert.equal(deli.state.sandwiches, 1);
  assert.equal(messages.length, 1);
  deli.update(100, target);
  assert.equal(deli.state.sandwiches, 1);
  assert.equal(messages.length, 1);
  assert.equal(requiredFixture(savedStates.at(-1)).pending, false);
  assert.equal(setupDeli(savedStates.at(-1)).deli.state.sandwiches, 1);
});

test('a paid delivery resumes without another charge and follows a moving customer', () => {
  const { deli, economy } = setupDeli({ pending: true }),
    startCoins = economy.state.coins;
  let target = { x: 4, y: 0 };
  deli.update(0.05, target);
  assert.ok(deli.state.position.y > 0);
  target = { x: 12, y: 0 };
  for (let i = 0; i < 200; i++) deli.update(0.05, target, { deliverable: i > 20 });
  assert.equal(deli.state.pending, false);
  assert.equal(deli.state.sandwiches, 1);
  assert.equal(economy.state.coins, startCoins);
  assert.ok(Math.hypot(deli.state.position.x - 12, deli.state.position.y) < 0.8);
  const poor = setupDeli();
  poor.economy.trade('tax');
  assert.equal(poor.deli.order({ x: 4, y: 0 }).ok, false);
  assert.equal(poor.deli.pickup().ok, false);
  assert.equal(poor.deli.state.pending, false);
});

test('road traffic splits intersections and excludes non-road spans, with bounded movement', () => {
  const routes = [
    {
      kind: 'road',
      name: 'Test road',
      points: [[0, 0] satisfies [number, number], [8, 0] satisfies [number, number]],
    },
    {
      kind: 'road',
      name: 'Test road',
      points: [[4, -4] satisfies [number, number], [4, 4] satisfies [number, number]],
    },
    {
      kind: 'path',
      name: 'Test path',
      points: [[0, 3] satisfies [number, number], [8, 3] satisfies [number, number]],
    },
    {
      kind: 'road',
      name: 'Test road',
      points: [[12, 0] satisfies [number, number], [20, 0] satisfies [number, number]],
    },
  ];
  const traffic = createStreetTraffic({
    routes,
    isRoad: (x: number, z: number) => x < 10 && (Math.abs(z) < 0.3 || Math.abs(x - 4) < 0.3),
    ground: () => 0,
  });
  assert.equal(traffic.cars.length, 4);
  assert.equal(traffic.edges.length, 4);
  assert.equal(
    requiredFixture(traffic.nodes.find((n) => n.x === 4 && n.z === 0)).neighbors.length,
    4,
  );
  const visited = traffic.cars.map(() => new Set());
  for (let i = 0; i < 2000; i++) {
    const previous = traffic.cars.map((c) => ({ ...c }));
    traffic.update(0.05);
    traffic.cars.forEach((c, j) => {
      assert.ok(Math.abs(c.z) < 0.3 || Math.abs(c.x - 4) < 0.3);
      assert.ok(Math.hypot(c.x - previous[j].x, c.z - previous[j].z) <= 0.22);
      visited[j].add(c.to);
    });
  }
  assert.ok(visited.every((v) => v.size >= 4));
  assert.deepEqual(
    createStreetTraffic({ routes: [], isRoad: () => true, ground: () => 0 }).cars,
    [],
  );
});

test('traffic, delivery and original airport ad fixtures use finite small native meshes', () => {
  const meshes = [new Mesh(), new Mesh(), new Mesh()];
  drawWaymo(meshes[0], { x: 0, y: 1, z: 0, angle: 0.8 });
  drawDeliveryCooler(meshes[1], { position: { x: 0, y: 0 }, angle: 0.6 }, () => 1);
  drawAirportBillboard(
    meshes[2],
    new Map([
      [
        'ad',
        [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      ],
    ]),
    { x: 0, z: 0, base: 1, angle: 0.7, art: 'ad' },
  );
  for (const m of meshes) {
    assert.ok(m.data.length > 0);
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 2000);
  }
});
