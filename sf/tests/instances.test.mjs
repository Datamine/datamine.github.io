import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.js';
import {
  CAVE_TILES,
  CAVE_NAVIGATION,
  ILLUMINATI_CAVE,
  privateMapInstance,
  instanceTile,
  sameMapInstance,
} from '../map-instances.js';
import {
  createStealthBomber,
  bombTileArea,
  monsterInBombArea,
  bomberLanding,
  createBomberDescent,
  bomberDescentPoint,
  BOMBER_SPEED,
  BOMBER_ROLL_SECONDS,
  bomberCruiseHeight,
} from '../stealth-bomber.js';
import {
  createIlluminatiCaveMesh,
  drawStealthBomber,
  drawBombEffect,
  drawParachute,
  drawBomberCrash,
} from '../illuminati-models.js';
import { createSecretAdventures } from '../secret-adventures.js';
import '../economy.js';
import { rocketCruiseSpeed } from '../rocket.js';

test('B-2 cruises five units lower while preserving terrain clearance', () => {
  assert.equal(bomberCruiseHeight(28), 20);
  assert.equal(bomberCruiseHeight(70), 62);
  const b = createStealthBomber({ cruiseHeight: () => bomberCruiseHeight(28), ground: () => 0 });
  b.board();
  assert.equal(b.state.position.y, 20);
  const hill = createStealthBomber({ cruiseHeight: () => 20, ground: () => 50 });
  hill.board();
  assert.equal(hill.state.position.y, 55);
});
test('barrel rolls complete one smooth turn, keep flying, reject overlap and reset on ejection', () => {
  const b = createStealthBomber();
  assert.equal(b.barrelRoll(), false);
  b.board({ x: 0, y: 20, z: 0 });
  b.target(100, 0);
  assert.equal(b.barrelRoll(), true);
  assert.equal(b.barrelRoll(), false);
  b.update(BOMBER_ROLL_SECONDS / 2);
  assert.ok(Math.abs(b.state.rollAngle - Math.PI) < 1e-8);
  assert.ok(b.state.position.x > 0);
  assert.equal(b.state.position.y, 20);
  b.update(BOMBER_ROLL_SECONDS / 2);
  assert.equal(b.state.rollElapsed, null);
  assert.equal(b.state.rollAngle, Math.PI * 2);
  assert.equal(b.barrelRoll(), true);
  b.update(BOMBER_ROLL_SECONDS);
  assert.equal(b.state.rollAngle, Math.PI * 4);
  b.barrelRoll();
  b.eject(createBomberDescent(b.state.position, { x: 0, y: 0, z: 0 }));
  assert.equal(b.state.rollAngle, 0);
  assert.equal(b.barrelRoll(), false);
  b.stop();
  b.board();
  assert.equal(b.state.rollAngle, 0);
  const simulate = (steps) => {
    const plane = createStealthBomber();
    plane.board();
    plane.barrelRoll();
    for (const dt of steps) plane.update(dt);
    return plane.state.rollAngle;
  };
  assert.ok(Math.abs(simulate([0.7]) - simulate(Array(7).fill(0.1))) < 1e-8);
});

test('every cave tile has a material and the entrance connects to the hangar around the aircraft', () => {
  assert.equal(CAVE_TILES.length, 28 * 28);
  assert.ok(CAVE_TILES.every((t) => ['rock', 'stone', 'hangar'].includes(t.type)));
  const from = { x: ILLUMINATI_CAVE.entrance.x - 0.5, y: ILLUMINATI_CAVE.entrance.z - 0.5 },
    to = { x: ILLUMINATI_CAVE.boarding.x - 0.5, y: ILLUMINATI_CAVE.boarding.z - 0.5 },
    path = CAVE_NAVIGATION.path(from, to);
  assert.ok(path?.length);
  let previous = from;
  for (const point of path) {
    assert.ok(CAVE_NAVIGATION.segment(previous, point));
    previous = point;
  }
  assert.equal(
    CAVE_NAVIGATION.free(13, 11),
    false,
    'the parked aircraft is an actual navigation obstacle',
  );
  const instance = privateMapInstance('illuminati', 'alice');
  assert.equal(instanceTile(instance, 13.5, 24.5).type, 'stone');
  assert.equal(instanceTile(instance, -1, 24), null);
  assert.equal(
    sameMapInstance({ instance }, { instance: privateMapInstance('illuminati', 'bob') }),
    false,
  );
});
test('flight stays above terrain and bomb geometry includes non-quest combat creatures inside nine tiles', () => {
  const bomber = createStealthBomber({ ground: () => 80 });
  bomber.board();
  bomber.target(40, 106);
  bomber.update(1);
  assert.ok(bomber.state.position.x > -24);
  assert.equal(bomber.state.position.y, 85);
  const area = bombTileArea(35.2, 175.8);
  assert.equal(monsterInBombArea({ combatKind: 'cow', hp: 20, x: 35, z: 175 }, area), true);
  assert.equal(monsterInBombArea({ combatKind: 'kraken', hp: 100, x: 35, z: 175 }, area), false);
  assert.equal(monsterInBombArea({ combatKind: 'cow', hp: 20, x: 37, z: 175 }, area), false);
});
test('B-2 cruises at airship speed, boosts to rocket cruise speed, and releases boost immediately', () => {
  const boost = rocketCruiseSpeed({ x: 0, z: 0 }, { x: 2400, z: 0 }),
    bomber = createStealthBomber({
      ground: () => 2,
      cruiseHeight: () => 31,
      boostSpeed: () => boost,
    });
  bomber.board({ x: 0, y: 0, z: 0 });
  bomber.target(3000, 0);
  bomber.update(1);
  assert.equal(bomber.state.position.x, BOMBER_SPEED);
  assert.equal(bomber.state.position.y, 31);
  bomber.update(1, { boost: true });
  assert.equal(bomber.state.position.x, BOMBER_SPEED + boost);
  assert.equal(bomber.state.boost, true);
  bomber.update(1);
  assert.equal(bomber.state.position.x, BOMBER_SPEED * 2 + boost);
  assert.equal(bomber.state.boost, false);
});
test('ejection finds walkable shore and follows a bounded descent without permitting more flight', () => {
  const to = bomberLanding(-12, 10, { free: (x, z) => x >= 0 && z >= 0, ground: () => 2 });
  assert.ok(to.x >= 0);
  assert.equal(to.y, 2);
  const bomber = createStealthBomber();
  bomber.board({ x: -12, y: 25, z: 10 });
  const flight = createBomberDescent(bomber.state.position, to, 0.2);
  assert.equal(bomber.eject(flight), true);
  assert.equal(bomber.target(100, 100), false);
  assert.equal(bomber.eject(flight), false);
  bomber.update(flight.duration / 2, { boost: true });
  assert.ok(bomber.state.position.y > to.y && bomber.state.position.y < flight.from.y);
  assert.equal(bomber.state.boost, false);
  assert.equal(bomber.update(flight.duration), 'landed');
  assert.deepEqual(bomber.state.position, to);
  assert.deepEqual(bomberDescentPoint(flight, 10000), to);
  assert.equal(bomberLanding(0, 0, { free: () => false, ground: () => 0 }), null);
});
test('parachuting and crashes are presented from server events without locally applying damage or travel', async () => {
  let time = 0,
    subscriber;
  const changes = [],
    calls = [],
    client = {
      state: { connected: true, id: 1, bomber: { owned: true, readyAt: 0 } },
      subscribe: (f) => (subscriber = f),
      command: async (...args) => {
        calls.push(args);
        return { ok: true };
      },
    };
  const game = createSecretAdventures({
    client,
    guildSite: { x: 1, y: 1, w: 4, d: 4 },
    ground: () => 1,
    transition: (p) => changes.push(p),
    frameTime: () => time,
  });
  subscriber({
    type: 'instance',
    instance: { id: 'world', kind: 'world' },
    position: { x: 0, y: 25, z: 0 },
    bomber: { active: true, owned: true, readyAt: 0 },
  });
  const flight = createBomberDescent({ x: 0, y: 25, z: 0 }, { x: 2, y: 1, z: 2 }, 0);
  await game.ejectBomber();
  assert.deepEqual(calls[0], ['bomberEject', {}]);
  assert.equal(game.crashes.length, 0);
  subscriber({
    type: 'bomberEjected',
    player: 1,
    flight,
    crash: { from: flight.from, to: { x: 30, y: 1, z: 0 }, heading: 0 },
  });
  assert.equal(game.bomber.state.phase, 'parachuting');
  assert.equal(game.crashes.length, 1);
  const count = changes.length;
  time = 7000;
  game.update(7);
  assert.equal(
    changes.length,
    count,
    'only a server arrival can change the instance or land the player',
  );
  assert.equal(game.crashes.length, 0);
  client.state.connected = false;
  assert.equal((await game.dropBomb()).ok, false);
  assert.equal(calls.length, 1);
});
test('parachute and abandoned bomber meshes stay finite and their small explosion disappears', () => {
  const crash = { from: { x: 0, y: 25, z: 0 }, to: { x: 30, y: 1, z: 0 }, heading: 0, started: 0 };
  for (const t of [0, 1200, 3999, 4000, 4500, 6100, 6201]) {
    const m = new Mesh();
    drawParachute(m, { x: 0, y: 15, z: 0 }, 0.3, t);
    assert.ok(m.data.length > 0 && m.data.every(Number.isFinite));
    const effect = new Mesh();
    drawBomberCrash(effect, crash, t);
    assert.ok(effect.data.every(Number.isFinite));
    assert.equal(effect.data.length > 0, t < 6200);
  }
});
test('cave surfaces, camera-facing wall groups and the B-2 are finite reusable meshes', () => {
  const cave = createIlluminatiCaveMesh(),
    plane = new Mesh();
  drawStealthBomber(plane, { x: 0, y: 35, z: 0 }, 0.6, { bank: 0.25 });
  assert.equal(cave.walls.length, 4);
  for (const mesh of [cave, ...cave.walls.map((w) => w.mesh), plane])
    assert.ok(mesh.data.length > 0 && mesh.data.every(Number.isFinite));
  assert.ok(plane.data.length / 33 < 1500, 'the flying wing is a small low-poly model');
});
test('bomb visuals remain valid throughout free fall, impact, smoke and disappearance', () => {
  for (const elapsed of [0, 750, 1499, 1500, 1850, 2100, 2199, 2201]) {
    const m = new Mesh();
    drawBombEffect(m, { x: 35.5, z: 175.5, from: { y: 35 }, started: 0 }, elapsed, 1.6);
    assert.ok(m.data.every(Number.isFinite));
    if (elapsed < 2200) assert.ok(m.data.length > 0);
    else assert.equal(m.data.length, 0);
  }
});

test('Ahab boarding awaits the server, exposes rejections, permits retries, and never starts a local voyage', async () => {
  let resolve;
  const calls = [],
    client = {
      state: { connected: true },
      subscribe() {},
      command(action, args) {
        calls.push({ action, args });
        return new Promise((r) => (resolve = r));
      },
    };
  const scene = createSecretAdventures({ client }),
    ship = { aboard: false },
    game = {
      state: { railgun: true, krakenReward: false },
      ship,
      board() {
        assert.fail('client cannot start authoritative travel');
      },
    };
  const pending = scene.boardKraken(game);
  assert.equal(ship.aboard, false);
  assert.equal((await scene.boardKraken(game)).ok, false);
  assert.equal(calls.length, 1);
  resolve({ ok: false, message: 'Board with Captain Ahab on the beach, carrying your railgun.' });
  const denied = await pending;
  assert.equal(denied.ok, false);
  assert.match(denied.message, /Captain Ahab/);
  const retry = scene.boardKraken(game);
  assert.equal(calls.length, 2);
  resolve({ ok: true });
  assert.match((await retry).message, /unfurls the sails/);
  assert.equal(ship.aboard, false, 'only a server ship snapshot may put the client aboard');
  client.state.connected = false;
  assert.equal((await scene.boardKraken(game)).ok, false);
  assert.equal(calls.length, 2);
});
