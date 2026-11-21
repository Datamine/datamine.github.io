import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleRocketHop, rocketHopForPose } from '../rocket-hop.ts';
import { SEARCH_ROCKET } from '../config/search-houses.ts';
import { drawRemotePlayer } from '../remote-player-models.ts';
import { createActorAnimation } from '../animation-presentation.ts';
import { sampleCharacterPose } from '../characters.ts';
import { normalizeCharacter, characterAppearance } from '../character-config.ts';
import { Mesh } from '../geometry.ts';

test('one character-height hop has smooth takeoff and landing and a finite, bounded lifetime', () => {
  const start = 1000000,
    d = SEARCH_ROCKET.jumpMs;
  assert.equal(sampleRocketHop(start, start).height, 0);
  assert.equal(sampleRocketHop(start, start + d).height, 0);
  assert.equal(sampleRocketHop(start, start + d * 0.5).height, SEARCH_ROCKET.jumpHeight);
  assert.equal(SEARCH_ROCKET.jumpHeight, 1.7);
  let previous = 0;
  for (let elapsed = 0; elapsed <= d; elapsed += 1000 / 60) {
    const p = sampleRocketHop(start, start + elapsed);
    assert.ok(p.height >= 0 && p.height <= 1.7);
    assert.ok(Math.abs(p.height - previous) < 0.11);
    previous = p.height;
  }
  for (const time of [start - 1, start + d, start + d * 10, NaN, Infinity] satisfies [
    number,
    number,
    number,
    number,
    number,
  ])
    assert.equal(sampleRocketHop(start, time).active, false);
  assert.equal(sampleRocketHop(0, start).active, false);
  assert.equal(sampleRocketHop(start, start + d * 0.12).height, 0);
});

test('the jumping rig bends without stretching, preserves planted takeoff feet and returns to idle', () => {
  const idle = sampleCharacterPose('idle', 0, { time: 0 });
  for (const t of [0, 1] satisfies [number, number])
    assert.deepEqual(
      sampleCharacterPose('idle', 0, { time: 0, action: 'rocket-hop', actionT: t }).joints,
      idle.joints,
    );
  for (let frame = 0; frame <= 66; frame++) {
    const p = sampleCharacterPose('idle', 0, {
      time: 0,
      action: 'rocket-hop',
      actionT: frame / 66,
    });
    assert.ok(p.matrices.every(Number.isFinite));
    for (const [bone, length] of [
      [4, 0.31] satisfies [number, number],
      [5, 0.275] satisfies [number, number],
      [7, 0.31] satisfies [number, number],
      [8, 0.275] satisfies [number, number],
      [10, 0.41] satisfies [number, number],
      [11, 0.38] satisfies [number, number],
      [13, 0.41] satisfies [number, number],
      [14, 0.38] satisfies [number, number],
    ])
      assert.ok(
        Math.abs(
          Math.hypot(
            ...p.joints
              .slice(bone * 3, bone * 3 + 3)
              .map((v, i) => v - p.joints[(bone + 1) * 3 + i]),
          ) - length,
        ) < 1e-5,
      );
  }
  const crouch = sampleCharacterPose('idle', 0, { time: 0, action: 'rocket-hop', actionT: 0.06 });
  assert.ok(crouch.joints[1] < idle.joints[1] - 0.1);
  for (const foot of [12, 15] satisfies [number, number])
    assert.ok(Math.abs(crouch.joints[foot * 3 + 1] - idle.joints[foot * 3 + 1]) < 1e-5);
});

test('peers use the same server clock for lift without changing tile coordinates or packet state', () => {
  const started = 1000000,
    look = characterAppearance(normalizeCharacter({ back: 'new-year-rocket' })),
    p = {
      id: 1,
      x: 3,
      z: 5,
      y: 2,
      angle: 0,
      phase: 0,
      motion: 0,
      moving: false,
      mode: 'walk',
      hp: 30,
      appearance: { ...look, rocketHopAt: started },
    },
    original = structuredClone(p),
    view = createActorAnimation().sample(p, 0);
  const minY = (m: Mesh) => {
      let y = Infinity;
      for (let i = 1; i < m.data.length; i += 11) y = Math.min(y, m.data[i]);
      return y;
    },
    before = new Mesh(),
    apex = new Mesh(),
    after = new Mesh();
  for (const [m, time] of [
    [before, started] as const,
    [apex, started + 550] as const,
    [after, started + 1100] as const,
  ])
    drawRemotePlayer(m, p, 0, { look, animation: view, ground: () => 2, serverTime: time });
  assert.ok(minY(apex) - minY(before) > 1.65);
  assert.deepEqual(after.data, before.data);
  assert.deepEqual(p, original);
  assert.equal(rocketHopForPose({ ...p, mode: 'bike' }, started + 550).height, 0);
  assert.equal(rocketHopForPose({ ...p, hp: 0 }, started + 550).height, 0);
});
