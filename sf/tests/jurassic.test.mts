import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpeditions, scientistDialogue, ahabDialogue } from '../jurassic.ts';
import { createHitpoints } from '../combat.ts';
import { createEconomy } from '../economy.ts';
import { createDeli } from '../deli.ts';
import { JURASSIC, PEQUOD, KRAKEN_CAPE_TEXT } from '../jurassic-layout.ts';
import { Mesh, rayTriangleAt } from '../geometry.ts';
import {
  JURASSIC_SIGNS,
  drawJurassicCampus,
  drawVelociraptor,
  drawCow,
  drawCattlePen,
  drawSpectre,
  drawPequod,
  drawKraken,
  drawBeam,
  drawKrakenCape,
  drawExpeditionLoot,
} from '../jurassic-models.ts';
import type { ExpeditionProgress } from '../types/content.ts';
import type { ExpeditionEvent } from '../types/expeditions.ts';

function setup(options: Partial<Parameters<typeof createExpeditions>[0]> = {}) {
  const health = createHitpoints(),
    economy = createEconomy(),
    events: ExpeditionEvent[] = [],
    saved: ExpeditionProgress[] = [],
    p = { x: JURASSIC.exit.x, z: JURASSIC.exit.z + 4, base: 1.4, eligible: true },
    food: number[] = [];
  const game = createExpeditions({
    health,
    economy,
    random: () => 0.5,
    player: () => ({ ...p }),
    food: (n) => food.push(n),
    routeTo: (a, b) => [{ x: b.x, z: b.z }],
    canTravel: () => true,
    onEvent: (e) => events.push(e),
    onSave: (s) => saved.push(s),
    ...options,
  });
  game.setHarbor({ x: 0, z: 110 });
  return { game, health, economy, p, events, saved, food };
}
const shoot = (
  g: ReturnType<typeof createExpeditions>,
  target: NonNullable<Parameters<ReturnType<typeof createExpeditions>['shoot']>[0]>,
) => {
  g.state.cooldown = 0;
  return g.shoot(target, { x: target.x + 4, z: target.z, base: 0 });
};

test('kraken spoils remain within reach on open deck and can be picked past the ship’s mast', () => {
  const { game } = setup({ saved: { railgun: true, krakenDefeated: true } });
  game.board();
  game.update(6.1);
  const loot = game.state.loot.find((l) => l.lootKind === 'kraken');
  assert.ok(loot);
  assert.ok(Math.hypot(loot.x - game.ship.x, loot.z - game.ship.z) < 2);
  const ship = new Mesh(),
    coins = new Mesh(),
    signs = new Map(
      JURASSIC_SIGNS.map((s) => [
        s,
        [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      ]),
    );
  drawPequod(ship, game.ship, 0, signs);
  drawExpeditionLoot(coins, loot, PEQUOD.deck, 0);
  assert.ok(coins.data.every(Number.isFinite));
  const origin = [game.ship.x + 18.64, 20.23, game.ship.z + 2.54] satisfies [
      number,
      number,
      number,
    ],
    target = [loot.x, PEQUOD.deck + 0.17, loot.z],
    delta = target.map((v, i) => v - origin[i]),
    length = Math.hypot(...delta),
    ray = { origin, dir: delta.map((v) => v / length) };
  const hit = (mesh: Mesh) => {
    let nearest = Infinity;
    for (let i = 0; i < mesh.data.length; i += 33) {
      const d = rayTriangleAt(ray, mesh.data, i);
      if (d !== null) nearest = Math.min(nearest, d);
    }
    return nearest;
  };
  assert.ok(Number.isFinite(hit(coins)));
  assert.ok(hit(coins) < hit(ship), 'Take must select the reward rather than Examine The Pequod');
});

test('the scientist grants a railgun, visibly releases the raptor, and accepts its remains exactly once', async () => {
  const { game: g, saved } = setup();
  assert.equal(g.state.railgun, false);
  assert.equal(g.board().ok, false);
  const d = scientistDialogue({ name: 'Scientist' }, g);
  assert.equal(g.raptor.phase, 'caged');
  assert.equal(requiredFixture(await requiredFixture(await requiredFixture(d.accept)())).ok, true);
  assert.equal(g.raptor.phase, 'releasing');
  assert.equal(g.startQuest().ok, false);
  g.update(1);
  assert.equal(g.raptor.phase, 'loose');
  for (let i = 0; i < 5; i++) assert.equal(shoot(g, g.raptor).damage, 10);
  assert.equal(g.raptor.phase, 'dead');
  const body = g.state.loot.find((l) => l.lootKind === 'raptor');
  assert.ok(body);
  assert.equal(g.collect(body).ok, true);
  assert.equal(g.collect(body).ok, false);
  const response = requiredFixture(scientistDialogue({ name: 'Scientist' }, g).accept)();
  assert.match(
    requiredFixture(requiredFixture(await response).message),
    /good test of the raptor escape and emergency recovery protocol/,
  );
  assert.equal(g.state.raptor, 'completed');
  assert.equal(g.finishQuest().ok, false);
  assert.equal(g.state.railgun, true);
  assert.equal(createExpeditions({ saved: saved.at(-1) }).state.raptor, 'completed');
});
test('railgun range, cooldown, collision and immunity cannot be bypassed; shooting a civilian raises the alarm', () => {
  const { game: g, events } = setup();
  g.startQuest();
  g.update(1);
  const cow = g.cows[0];
  assert.equal(g.shoot(cow, { x: cow.x + 5.01, z: cow.z }).ok, false);
  assert.equal(g.shoot(cow, { x: cow.x + 5, z: cow.z }).damage, 10);
  assert.equal(g.shoot(cow, { x: cow.x + 5, z: cow.z }).cooldown, true);
  g.state.cooldown = 0;
  const ghost = { id: 'alien', label: 'Alien', combatKind: 'spectre', x: 0, z: 0, hp: 36 };
  assert.equal(g.shoot(ghost, { x: 0, z: 4 }).damage, 0);
  assert.equal(ghost.hp, 36);
  assert.ok(g.state.beams.length);
  g.state.cooldown = 0;
  const citizen = { id: 'test-man', label: 'Man', x: 0, z: 0 };
  assert.equal(g.shoot(citizen, { x: 0, z: 4 }).ok, true);
  assert.equal(events.filter((e) => e.type === 'illegal').length, 1);
  const blocked = setup({ lineClear: () => false }).game;
  blocked.startQuest();
  assert.equal(shoot(blocked, blocked.cows[0]).ok, false);
  assert.equal(blocked.cows[0].hp, 20);
});
test('raptor versus citizen resolves independent fifty-percent outcomes and drops collectible coins', () => {
  for (const [killCitizen, killRaptor] of [
    [false, false] satisfies [boolean, boolean],
    [false, true] satisfies [boolean, boolean],
    [true, false] satisfies [boolean, boolean],
    [true, true] satisfies [boolean, boolean],
  ]) {
    const rolls = [killCitizen ? 0.1 : 0.9, killRaptor ? 0.1 : 0.9, 0.4],
      npc: import('../types/world.ts').Actor = {
        id: 'civilian',
        label: 'Woman',
        x: JURASSIC.exit.x,
        z: JURASSIC.exit.z,
      };
    const {
      game: g,
      p,
      economy,
    } = setup({ pedestrians: () => [npc], random: () => rolls.shift() ?? 0.9 });
    p.eligible = false;
    g.startQuest();
    g.update(2.1);
    assert.equal(!!npc.expeditionDead, killCitizen);
    assert.equal(g.raptor.phase === 'dead', killRaptor);
    const coins = g.state.loot.find((l) => l.lootKind === 'coins');
    assert.equal(!!coins, killCitizen);
    if (coins) {
      const before = economy.state.coins;
      assert.equal(g.collect(coins).ok, true);
      assert.ok(economy.state.coins > before);
      assert.equal(g.collect(coins).ok, false);
    }
    if (killRaptor)
      assert.equal(
        g.collect(requiredFixture(g.state.loot.find((l) => l.lootKind === 'raptor'))).ok,
        true,
        'citizen victories cannot strand the quest',
      );
  }
});
test('raptors damage nearby players and never travel through blocked terrain', () => {
  const { game: g, p, health } = setup();
  p.x = JURASSIC.exit.x;
  p.z = JURASSIC.exit.z;
  g.startQuest();
  g.update(2.1);
  assert.ok(health.state.hp < 30);
  const b = setup({ canTravel: () => false });
  b.game.startQuest();
  b.game.update(1);
  const before = { x: b.game.raptor.x, z: b.game.raptor.z };
  b.game.update(2);
  assert.deepEqual({ x: b.game.raptor.x, z: b.game.raptor.z }, before);
});
test('cows drop stored food and respawn after ten simulation seconds', () => {
  const { game: g, p, food } = setup();
  p.eligible = false;
  g.startQuest();
  const c = g.cows[0];
  shoot(g, c);
  shoot(g, c);
  assert.equal(c.hp, 0);
  assert.equal(c.respawn, 10);
  const item = g.state.loot.find((l) => l.lootKind === 'sandwich');
  assert.equal(g.collect(requiredFixture(item)).ok, true);
  assert.deepEqual(food, [1]);
  assert.equal(g.collect(requiredFixture(item)).ok, false);
  g.update(9.9);
  assert.equal(c.hp, 0);
  g.update(0.1);
  assert.equal(c.hp, 20);
  const economy = createEconomy(),
    health = createHitpoints(),
    deli = createDeli({
      economy,
      health,
      origin: { x: 0, y: 0 },
      routeTo: (target) => [target],
      canTravel: () => true,
    });
  assert.equal(deli.storeSandwich(3), true);
  health.damage(22);
  assert.equal(deli.eat().ok, true);
  assert.equal(deli.state.sandwiches, 2);
  assert.equal(health.state.hp, 23);
});
test('Ahab requires a railgun; sixty boss hits deplete 600 HP and yield one 100-coin reward and a persistent cape', () => {
  const { game: g, p, health, economy, saved } = setup();
  assert.equal(g.board().ok, false);
  g.startQuest();
  assert.equal(g.board().ok, true);
  p.eligible = false;
  g.update(6);
  p.x = g.ship.x;
  p.z = g.ship.z;
  p.base = 0.86;
  p.eligible = true;
  assert.equal(g.ship.phase, 'fighting');
  assert.equal(g.kraken.visible, true);
  g.update(3.5);
  assert.equal(health.state.hp, 19);
  g.state.target = null;
  assert.equal(g.kraken.max, 600);
  for (let i = 0; i < 59; i++) {
    g.state.cooldown = 0;
    assert.equal(g.shoot(g.kraken, p).damage, 10);
    assert.equal(g.ship.phase, 'fighting');
  }
  g.state.cooldown = 0;
  g.shoot(g.kraken, p);
  assert.equal(g.ship.phase, 'victory');
  assert.equal(g.kraken.hp, 0);
  assert.equal(g.state.krakenReward, false);
  const spoils = g.state.loot.find((l) => l.lootKind === 'kraken'),
    before = economy.state.coins;
  g.collect(requiredFixture(spoils));
  assert.equal(economy.state.coins, before + 100);
  assert.equal(g.state.cape, true);
  assert.equal(g.collect(requiredFixture(spoils)).ok, false);
  assert.match(requiredFixture(g.entries().at(-1)).description, /lousy cape/);
  const restored = createExpeditions({ saved: saved.at(-1) });
  assert.equal(restored.state.cape, true);
  assert.equal(restored.state.krakenReward, true);
  assert.equal(restored.board().ok, false);
  assert.equal(g.returnShip(), true);
  g.update(5);
  assert.equal(g.ship.aboard, false);
  assert.equal(g.ship.x, 0);
  assert.match(ahabDialogue({ name: 'Ahab' }, setup().game).intro, /railgun/);
  assert.match(KRAKEN_CAPE_TEXT, /I killed the kraken/);
});
test('automatic ranged attacks remain frame-rate independent against the 600 HP kraken', () => {
  const run = (step: number) => {
    const { game: g, p, health } = setup();
    g.startQuest();
    g.board();
    p.eligible = false;
    g.update(6);
    p.x = g.ship.x;
    p.z = g.ship.z;
    p.eligible = true;
    g.attack(g.kraken);
    for (let t = 0; t < 8 - 1e-8; t += step) g.update(Math.min(step, 8 - t));
    return { hp: health.state.hp, boss: g.kraken.hp, phase: g.ship.phase };
  };
  const small = run(1 / 60),
    large = run(0.2);
  assert.deepEqual(small, large);
  assert.equal(small.boss, 490);
  assert.ok(small.hp > 0);
  assert.equal(small.phase, 'fighting');
});
test('all expedition models and cape inscriptions produce finite geometry within a modest triangle budget', () => {
  const signs = new Map(
      JURASSIC_SIGNS.map((s) => [
        s,
        [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      ]),
    ),
    mesh = new Mesh();
  drawJurassicCampus(mesh, signs);
  drawVelociraptor(mesh, { x: 0, z: 0, angle: 0, phase: 'loose' }, 400);
  drawCow(mesh, { x: 0, z: 0, angle: 0 }, 400);
  drawCattlePen(mesh, () => 0);
  drawSpectre(mesh, { id: 'alien', label: 'Alien', x: 0, z: 0 }, 400);
  drawPequod(mesh, { x: 0, z: 0 }, 400, signs);
  drawKraken(mesh, { x: 0, z: 0 }, 400);
  drawBeam(mesh, { from: { x: 0, y: 1, z: 0 }, to: { x: 4, y: 1, z: 0 } });
  drawKrakenCape(mesh, 0, 0, 0, 0, 400, signs);
  assert.ok(mesh.data.every(Number.isFinite));
  assert.ok(mesh.data.length / 33 < 26000, 'new models stay in the shared mesh batch');
});
