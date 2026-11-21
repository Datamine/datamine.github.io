import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh } from '../geometry.ts';
import { createEconomy } from '../economy.ts';
import { createInebriation, swayCharacter } from '../inebriation.ts';
import {
  createRehabilitation,
  REHABILITATION_DURATION,
  scrambleAppearance,
  rehabilitationDialogue,
  drawRehabilitationLaser,
} from '../rehabilitation.ts';
import { CHARACTER_DEFAULTS } from '../character-config.ts';
import { createCityLife } from '../life.ts';
import { dogWalkerDialogue } from '../companions.ts';
import type { CharacterAppearance } from '../characters.ts';
import { drawCharacter } from '../characters.ts';
import { drawNavyShip } from '../shipyard.ts';
import { drawParrot } from '../parrots.ts';
import { TAHOE, TAHOE_VILLAGE, createTahoe } from '../tahoe.ts';
import { createRegionalRoad } from '../regional-road.ts';
import type { Actor } from '../types/world.ts';

test('beer costs one coin, adds ten points, caps at 100 and wears off with elapsed time', () => {
  const economy = createEconomy(),
    saved: (number | undefined)[] = [],
    drunk = createInebriation(0, (p) => saved.push(p));
  for (let i = 0; i < 10; i++) assert.ok(drunk.drink(economy).ok);
  assert.equal(economy.state.coins, 15);
  assert.equal(drunk.state.percent, 100);
  assert.equal(drunk.drink(economy).ok, false);
  assert.equal(economy.state.coins, 15);
  drunk.update(3);
  assert.equal(drunk.state.percent, 99);
  drunk.update(297);
  assert.equal(drunk.state.percent, 0);
  assert.equal(createInebriation(saved.at(-1)).state.percent, 0);
  assert.equal(drunk.drink(createEconomy({ coins: 0 })).ok, false);
  assert.equal(drunk.state.percent, 0);
  for (let i = 0; i < 180; i++) drunk.update(1 / 60);
  assert.equal(drunk.state.percent, 0);
  const single = createInebriation(100),
    frames = createInebriation(100);
  single.update(30);
  for (let i = 0; i < 1800; i++) frames.update(1 / 60);
  assert.ok(Math.abs(single.state.percent - frames.state.percent) < 1e-8);
});

test('rehabilitation requires acceptance, discloses its reassuring reply and completes exactly once', async () => {
  let starts = 0,
    ends = 0;
  const d = rehabilitationDialogue({ name: 'Rehabilitation specialist' }, () => starts++),
    next = requiredFixture(d.choices)[0].next;
  assert.equal(starts, 0);
  assert.ok(d?.choices != null, 'Missing test fixture: d.choices');
  assert.match(d.choices[0].label, /side effects/);
  assert.ok(next != null, 'Missing test fixture: next');
  assert.match(
    typeof next.intro === 'function' ? next.intro() : requiredFixture(next.intro),
    /Not at all/,
  );
  assert.ok(next?.choices != null, 'Missing test fixture: next.choices');
  const reply = requiredFixture(next.choices[0].accept)();
  assert.equal(starts, 0);
  requiredFixture(requiredFixture(await reply).after)();
  assert.equal(starts, 1);
  const rehab = createRehabilitation(() => ends++);
  assert.ok(rehab.start());
  assert.equal(rehab.start(), false);
  rehab.update(1.5);
  assert.ok(rehab.beam);
  rehab.update(REHABILITATION_DURATION);
  assert.equal(ends, 1);
  rehab.update(10);
  assert.equal(ends, 1);
  const look = scrambleAppearance(CHARACTER_DEFAULTS, () => 0.5);
  assert.equal(look.gender, 'woman');
  for (const key of ['skin', 'shirt', 'pants', 'hair', 'shoes', 'hairstyle'] as const)
    assert.notEqual(look[key], CHARACTER_DEFAULTS[key]);
  assert.equal(
    scrambleAppearance({ ...CHARACTER_DEFAULTS, gender: 'woman' }, () => 0).gender,
    'man',
  );
});

test('street life includes child-sized pedestrians and animated dogs following checked walking routes', () => {
  const calls: (CharacterAppearance | undefined)[] = [],
    life = createCityLife({
      routes: Array.from({ length: 6 }, (_, i) => ({
        name: 'Test street ' + i,
        kind: 'road',
        halfWidth: 0.5,
        points: [
          [0, 2 + i * 3] satisfies [number, number],
          [45, 2 + i * 3] satisfies [number, number],
        ],
      })),
      surfaceType: () => 'sidewalk',
      lamps: [],
      terrainHeight: () => 0,
      scale: 1,
      human: (...a) => {
        calls.push(a[9]);
        drawCharacter(...a);
      },
      bicycle: () => {},
      maxWalkers: 20,
      maxRiders: 0,
      waterTraffic: false,
    });
  const mesh = new Mesh(),
    targets: Actor[] = [],
    ranges: { start: number; end: number; npc: Actor }[] = [];
  life.update(1);
  life.draw(mesh, 1000, [20, 10] satisfies [number, number], false, (start, npc) => {
    targets.push(npc);
    ranges.push({ start, end: mesh.data.length, npc });
  });
  assert.ok(life.people.some((n) => n.child));
  assert.ok(life.people.some((n) => n.dogWalker));
  assert.ok(calls.some((a) => requiredFixture(requiredFixture(a).height) < 0.75));
  assert.ok(targets.some((n) => n.dog === true));
  assert.ok(mesh.data.every(Number.isFinite));
  for (const owner of life.people.filter((n) => n.dogWalker)) {
    assert.ok(owner.points.length > 10);
    assert.equal(owner.dog, undefined, 'owning a dog must never classify the human as a dog');
    assert.ok(owner?.petDog != null, 'Missing test fixture: owner.petDog');
    assert.equal(owner.petDog.dog, true);
    assert.notEqual(owner, owner.petDog);
    const dog = ranges.find((r) => r.npc === owner.petDog);
    let top = -Infinity;
    for (let i = requiredFixture(dog).start; i < requiredFixture(dog).end; i += 11)
      top = Math.max(top, mesh.data[i + 1]);
    assert.ok(top < 0.75, 'the dog click target must not include the leash up to the human’s hand');
    const conversation = dogWalkerDialogue({ ...owner, dog: true });
    assert.equal(conversation.name, owner.label);
    assert.ok(conversation?.choices != null, 'Missing test fixture: conversation.choices');
    assert.equal(conversation.choices.length, 3);
    assert.doesNotMatch(
      typeof conversation.intro === 'function'
        ? conversation.intro()
        : requiredFixture(conversation.intro),
      /woof/i,
    );
    owner.waiting = true;
    const elapsed = owner.elapsed;
    life.update(5);
    assert.equal(owner.elapsed, elapsed, 'an owner stays still throughout a conversation');
    owner.waiting = false;
  }
});

test('navy vessel, parrots, laser apparatus and inebriated character geometry remain finite and bounded', () => {
  for (const time of [0, 1200, 2600, 4300] satisfies [number, number, number, number]) {
    const m = new Mesh();
    drawNavyShip(m, time);
    drawParrot(m, { x: 0, z: 0, base: 0, angle: 0, index: 0 }, time);
    const rehab = createRehabilitation(() => {});
    rehab.start();
    rehab.update(time * 0.001);
    drawRehabilitationLaser(m, { x: 0, y: 0 }, 0, rehab, time);
    const start = m.data.length;
    drawCharacter(m, 0, 0, 0);
    swayCharacter(m, start, 0, 0, 0, time, 1);
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 16000);
  }
});

test('Tahoe arrival, gondola, rocket and free gas occupy distinct connected parcels', () => {
  const t = createTahoe(),
    road = createRegionalRoad(),
    v = TAHOE_VILLAGE;
  assert.ok(Math.hypot(v.arrival.x - TAHOE.base.x, v.arrival.z - TAHOE.base.z) >= 9);
  assert.ok(Math.hypot(v.fuel.x - t.spaceport.x, v.fuel.z - t.spaceport.z) > 10);
  for (const target of [v.fuel.entry, t.spaceport.entry, t.baseEntry]) {
    const from = road.gate('tahoe'),
      route = t.path(from, target);
    assert.ok(route?.length);
    let previous = from;
    for (const p of route) {
      assert.ok(t.segment(previous, p));
      previous = p;
    }
    assert.deepEqual(previous, target);
  }
  const marked = road.mesh(),
    color = ([215, 203, 152] satisfies [number, number, number]).map((v) => v / 255);
  let markings = 0;
  for (let i = 0; i < marked.data.length; i += 33)
    if (color.every((v, k) => Math.abs(marked.data[i + 6 + k] - v) < 1e-8))
      for (const offset of [0, 11, 22] satisfies [number, number, number]) {
        const x = marked.data[i + offset],
          y = marked.data[i + offset + 1],
          z = marked.data[i + offset + 2],
          hit = road.at(x, z, 0);
        assert.ok(hit);
        assert.ok(
          Math.abs(y - hit.height - 0.006) < 1e-5,
          'paint must follow the road surface instead of floating flat across a slope',
        );
        markings++;
      }
  assert.ok(markings > 100);
});

test('road bends have a visible pickable corner and short graded spans keep paint on their own tiles', () => {
  const bend = createRegionalRoad({
    route: [
      [0, 0, 2] satisfies [number, number, number],
      [0, 0, 0] satisfies [number, number, number],
      [-2, 0, 0] satisfies [number, number, number],
    ],
  });
  assert.ok(bend.contains(0.1, -0.1), 'the outside corner is part of the walkable corridor');
  const hit = bend.raycast({
    origin: [0.1, 5, -0.1] satisfies [number, number, number],
    dir: [0, -1, 0] satisfies [number, number, number],
  });
  assert.ok(hit, 'rendering and picking must cover that same corner');
  assert.equal(hit.point[1], 0);
  const short = createRegionalRoad({
      route: [
        [0, 0, 0] satisfies [number, number, number],
        [0, 0.4, 0.15] satisfies [number, number, number],
        [0, 0.8, 0.3] satisfies [number, number, number],
        [0, 1.2, 0.45] satisfies [number, number, number],
      ],
    }),
    mesh = short.mesh(),
    color = ([215, 203, 152] satisfies [number, number, number]).map((v) => v / 255);
  let marks = 0;
  for (let i = 0; i < mesh.data.length; i += 11)
    if (color.every((v, k) => Math.abs(mesh.data[i + 6 + k] - v) < 1e-8)) {
      const z = mesh.data[i + 2];
      assert.ok(z > 0 && z < 0.45, 'paint cannot extend past the short road spans');
      assert.ok(Math.abs(mesh.data[i + 1] - z * (0.4 / 0.15) - 0.006) < 1e-7);
      marks++;
    }
  assert.ok(marks > 0);
});
