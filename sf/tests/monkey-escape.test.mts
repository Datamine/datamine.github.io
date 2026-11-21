import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonkeyPursuit } from '../monkey-escape.ts';
import { createTigerEncounter, ZOO_PURSUIT_SPEED } from '../zoo-encounter.ts';
import {
  createMotorcycle,
  drawMotorcycle,
  pitchMotorcycleMesh,
  MOTORCYCLE_SPEED,
  MOTORCYCLE_RENTAL_PRICE,
  MOTORCYCLE_EXAMINE,
} from '../motorcycle.ts';
import { createQuestLog } from '../quests.ts';
import { createEconomy } from '../economy.ts';
import { Mesh } from '../geometry.ts';
import { sampleCharacterPose, drawCharacter } from '../characters.ts';
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, a + ' != ' + b);
const routeTo = (x: number, y: number) => [{ x, y }];

test('the zookeeper uses the exact tiger movement budget across turns', () => {
  const player = { x: 30, y: 0 },
    k = createMonkeyPursuit({
      player,
      home: { x: 0, y: 0 },
      routeTo: (x, y, from: { x: number; y: number } = { x: 0, y: 0 }) =>
        from.x === 0 && from.y === 0
          ? [
              { x: 0, y: -0.3 },
              { x: 0.3, y: -0.3 },
              { x, y },
            ]
          : [{ x, y }],
      canCapture: () => true,
    });
  assert.equal(k.start(), true);
  assert.equal(k.start(), false);
  k.update(0.2);
  close(k.state.actor.travel, ZOO_PURSUIT_SPEED * 0.2);
  const tiger = createTigerEncounter({
    player,
    home: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    wardenStarts: [],
    routeTo,
    canCapture: () => true,
  });
  tiger.release();
  for (let i = 0; i < 200 && tiger.state.phase !== 'loose'; i++) tiger.update(0.01);
  const before = tiger.state.tiger.travel;
  tiger.update(0.2);
  close(tiger.state.tiger.travel - before, k.state.actor.travel);
});

test('capture returns the monkey without losing quest acceptance or duplicating a reward', () => {
  const q = createQuestLog(),
    e = createEconomy(),
    player = { x: 3, y: 0 };
  q.accept();
  q.steal();
  let catches = 0;
  const k = createMonkeyPursuit({
    player,
    home: { x: 0, y: 0 },
    routeTo,
    canCapture: () => true,
    onCaught: () => {
      catches++;
      assert.equal(q.recover().ok, true);
    },
  });
  k.start();
  for (let i = 0; i < 100; i++) k.update(0.05);
  assert.equal(catches, 1);
  assert.equal(q.state.monkey, 'accepted');
  assert.equal(q.taken, false);
  assert.equal(q.complete(e).ok, false);
  assert.equal(e.state.coins, 25);
  assert.equal(k.state.phase, 'idle');
  close(k.state.actor.x, 0);
  assert.equal(q.recover().ok, false);
  assert.equal(q.steal().ok, true);
  k.start();
  q.complete(e);
  k.stop();
  assert.equal(k.active, false);
  assert.equal(q.state.monkey, 'completed');
  assert.equal(q.recover().ok, false);
  assert.equal(e.state.coins, 50);
});

test('a blocked route or airborne target cannot make the keeper teleport or capture through a wall', () => {
  const player = { x: 20, y: 0 };
  let captured = 0,
    reachable = true,
    ground = true,
    saved: import('../types/geometry.ts').Point | undefined;
  const k = createMonkeyPursuit({
    player,
    home: { x: 0, y: 0 },
    routeTo: (x, y) => (reachable ? [{ x, y }] : null),
    canCapture: () => false,
    canPursue: () => ground,
    onCaught: () => captured++,
    onSave: (s) => (saved = s),
  });
  k.start();
  k.update(0.5);
  const before = k.state.actor.travel;
  reachable = false;
  k.update(0.5);
  close(k.state.actor.travel - before, ZOO_PURSUIT_SPEED * 0.5);
  ground = false;
  Object.assign(player, { x: 50, y: 50 });
  k.update(1.5);
  assert.ok(k.state.actor.y === 0);
  assert.equal(captured, 0);
  assert.ok(saved);
  const restored = createMonkeyPursuit({
    player,
    home: { x: 0, y: 0 },
    saved,
    routeTo,
    canCapture: () => false,
  });
  close(restored.state.actor.x, saved.x);
  restored.start();
  assert.equal(restored.active, true);
});

test('motorcycle rental must be arranged in advance, charges once, and survives parking and reload', () => {
  const home = { x: 3, y: 4 },
    e = createEconomy({ coins: 9 });
  let saved: import('../types/geometry.ts').Point | undefined;
  const m = createMotorcycle({ home, onSave: (s) => (saved = s) });
  assert.equal(m.mount(), false);
  assert.equal(m.rent(e, { pursued: true }).ok, false);
  assert.equal(e.state.coins, 9);
  assert.equal(m.rent(e).ok, true);
  assert.equal(e.state.coins, 9 - MOTORCYCLE_RENTAL_PRICE);
  assert.equal(m.rent(e).ok, false);
  assert.equal(e.state.coins, 4);
  assert.equal(m.mount(), true);
  m.move(8, 9, 0.5, 5, 2);
  m.park(8, 9, 0.5);
  const restored = createMotorcycle({ home, saved });
  assert.equal(restored.state.rented, true);
  assert.equal(restored.state.riding, false);
  assert.equal(restored.state.x, 8);
  assert.equal(restored.mount(), true);
  const poor = createMotorcycle({ home });
  assert.equal(poor.rent(createEconomy({ coins: 4 })).ok, false);
  assert.equal(poor.state.rented, false);
  assert.match(MOTORCYCLE_EXAMINE, /parked motorcycle/i);
  assert.doesNotMatch(MOTORCYCLE_EXAMINE, /getaway|primates/);
  assert.ok(MOTORCYCLE_SPEED > ZOO_PURSUIT_SPEED * 2);
});

test('a rented motorcycle can increase its lead over the keeper on the same road', () => {
  const player = { x: 5, y: 0 },
    k = createMonkeyPursuit({ player, home: { x: 0, y: 0 }, routeTo, canCapture: () => true });
  k.start();
  for (let i = 0; i < 100; i++) {
    player.x += MOTORCYCLE_SPEED * 0.05;
    k.update(0.05);
  }
  assert.equal(k.active, true);
  assert.ok(player.x - k.state.actor.x > 40);
  while (k.active) k.update(0.1);
  assert.equal(k.active, false, 'stopping eventually lets the keeper catch up');
});

test('motorcycle wheels, rider pose and shared terrain pitch stay finite with planted feet', () => {
  for (const angle of [0, 0.7, Math.PI] satisfies [number, number, number])
    for (const travel of [0, 3, 10] satisfies [number, number, number]) {
      const m = new Mesh();
      drawCharacter(m, 2, 3, 1.13, angle, 0, false, '#b98d6c', '#71866d', {
        mode: 'motorcycle',
        motion: 1,
        backpack: false,
      });
      drawMotorcycle(m, 2, 3, 1, angle, travel);
      pitchMotorcycleMesh(m, 0, 2, 1, 3, angle, (x, z) => 1 + x * 0.08 + z * 0.03);
      assert.ok(m.data.every(Number.isFinite));
      assert.ok(m.data.length / 33 < 10000);
    }
  const a = sampleCharacterPose('motorcycle', 0, { motion: 1 }),
    b = sampleCharacterPose('motorcycle', 3, { motion: 1 });
  assert.deepEqual(
    a.feet.map((f) => f.point),
    b.feet.map((f) => f.point),
    'motorcycle riders keep their feet on the pegs rather than pedaling',
  );
});
