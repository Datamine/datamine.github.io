import test from 'node:test';
import assert from 'node:assert/strict';
import { createActorAnimation, GESTURE_SECONDS } from '../animation-presentation.js';
import { drawRemotePlayer } from '../remote-player-models.js';
import { Mesh } from '../geometry.js';
import { drawCharacter, sampleCharacterPose } from '../characters.js';
import { characterAppearance, normalizeCharacter } from '../character-config.js';
import {
  MP_MODES,
  MP_GESTURES,
  encodePlayerFrame,
  decodePlayerFrame,
} from '../multiplayer-protocol.js';
import { interpolateNetworkPose } from '../multiplayer-client.js';

const pose = (extra = {}) => ({
  id: 1,
  x: 0,
  y: 0,
  z: 0,
  angle: 0,
  phase: 0,
  motion: 0,
  moving: false,
  mode: 'walk',
  hp: 30,
  max: 30,
  ...extra,
});
const look = characterAppearance(normalizeCharacter({ weapon: 'railgun' }));
function meshBounds(m) {
  const low = [Infinity, Infinity, Infinity],
    high = low.map(() => -Infinity);
  for (let i = 0; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      low[k] = Math.min(low[k], m.data[i + k]);
      high[k] = Math.max(high[k], m.data[i + k]);
    }
  return { low, high };
}

test('short network gestures advance between packets and finish even when the server clears them', () => {
  for (const [gesture, duration] of Object.entries(GESTURE_SECONDS)) {
    const animation = createActorAnimation(),
      p = pose({ gesture }),
      original = structuredClone(p);
    assert.equal(animation.sample(p, 0).actionT, 0, gesture);
    assert.ok(
      Math.abs(
        animation.sample({ ...p, gesture: '' }, duration * 500).actionT -
          (gesture === 'caught' ? 1 : 0.5),
      ) < 1e-8,
      gesture,
    );
    assert.equal(
      animation.sample({ ...p, gesture: '' }, duration * 1000 + 1).action,
      null,
      gesture,
    );
    assert.deepEqual(p, original, 'display sampling cannot mutate authoritative state');
  }
  const a = createActorAnimation();
  a.sample(pose({ gesture: 'attack' }), 0);
  a.trigger('attack', 200);
  assert.ok(
    Math.abs(a.sample(pose({ gesture: 'attack' }), 300).actionT - 100 / 450) < 1e-8,
    'successive hit events restart a strike',
  );
});

test('starts, stops, sitting and dancing blend at display frequency', () => {
  const a = createActorAnimation();
  a.sample(pose(), 0);
  let previous = 0;
  for (let frame = 1; frame <= 30; frame++) {
    const p = a.sample(pose({ mode: 'sit' }), (frame * 1000) / 60);
    assert.ok(p.sitBlend >= previous && p.sitBlend - previous < 0.038);
    previous = p.sitBlend;
  }
  assert.equal(previous, 1);
  const stand = a.sample(pose(), (31 * 1000) / 60);
  assert.ok(stand.sitBlend > 0 && stand.sitBlend < 1);
  const dance = a.sample(pose({ mode: 'dance' }), (32 * 1000) / 60);
  assert.ok(dance.danceBlend > 0 && dance.danceBlend < 0.07);
  const moving = a.sample(pose({ moving: true, motion: 1 }), (33 * 1000) / 60);
  assert.ok(moving.motion > 0 && moving.motion < 0.5);
  const speed = moving.motion,
    stopping = a.sample(pose(), (34 * 1000) / 60);
  assert.ok(stopping.motion > 0 && stopping.motion < speed);
});

test('the rendered sitting mesh actually follows the transition rather than snapping to its last pose', () => {
  let previous = Infinity;
  for (const sitBlend of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const m = new Mesh();
    drawCharacter(m, 0, 0, 0, 0, 0, false, look.skin, look.shirt, {
      ...look,
      mode: 'rest',
      sitBlend,
      time: 0,
    });
    const top = meshBounds(m).high[1];
    assert.ok(top < previous - 0.01 || sitBlend === 0);
    previous = top;
  }
});

test('dance transitions begin at the idle skeleton and keep limbs connected throughout', () => {
  const idle = sampleCharacterPose('idle', 0, { time: 0 }),
    zero = sampleCharacterPose('idle', 0, { time: 0, action: 'dance', danceBlend: 0 });
  assert.ok(zero.joints.every((v, i) => Math.abs(v - idle.joints[i]) < 0.0002));
  let previous = null;
  for (let frame = 0; frame < 180; frame++) {
    const p = sampleCharacterPose('idle', 0, {
      time: frame / 60,
      action: 'dance',
      danceBlend: Math.min(1, frame / 15),
    });
    assert.ok(p.matrices.every(Number.isFinite));
    if (previous)
      assert.ok(
        p.joints.every((v, i) => Math.abs(v - previous[i]) < 0.12),
        'a dance frame must not snap',
      );
    previous = p.joints.slice();
    for (const [start, length] of [
      [4, 0.31],
      [5, 0.275],
      [7, 0.31],
      [8, 0.275],
      [10, 0.41],
      [11, 0.38],
      [13, 0.41],
      [14, 0.38],
    ]) {
      const distance = Math.hypot(
        ...p.joints
          .slice(start * 3, start * 3 + 3)
          .map((v, i) => v - p.joints[(start + 1) * 3 + i]),
      );
      assert.ok(Math.abs(distance - length) < 1e-5);
    }
  }
});

test('every visible multiplayer activity renders finite native geometry, including actual vehicles', () => {
  const bounds = new Map();
  for (const mode of MP_MODES)
    for (const phase of [0, 0.8, 3.1, 6.2]) {
      const p = pose({
          mode,
          phase,
          moving: true,
          motion: 1,
          gesture: mode === 'surf' ? 'windsurf' : '',
        }),
        a = createActorAnimation().sample(p, 1000),
        m = new Mesh();
      drawRemotePlayer(m, p, 1000, { look: { ...look, railgun: false }, animation: a });
      assert.ok(m.data.every(Number.isFinite), mode);
      if (['hidden', 'rocket'].includes(mode)) assert.equal(m.data.length, 0);
      else {
        assert.ok(m.data.length > 1000, mode);
        assert.ok(
          m.data.length / 33 < 12000,
          mode + ' must remain within the per-player mesh budget',
        );
        bounds.set(mode, meshBounds(m));
      }
    }
  for (const mode of ['bike', 'ferrari', 'motorcycle', 'surf', 'gondola', 'bomber']) {
    const b = bounds.get(mode),
      standing = bounds.get('walk');
    assert.ok(
      Math.max(b.high[0] - b.low[0], b.high[2] - b.low[2]) >
        Math.max(standing.high[0] - standing.low[0], standing.high[2] - standing.low[2]) * 1.4,
      mode + ' must show its vehicle',
    );
  }
});

test('vehicle hand placements are unaffected by stowed weapons', () => {
  for (const mode of ['bike', 'motorcycle', 'ferrari', 'climb', 'gondola']) {
    const p = pose({ mode, moving: true, motion: 1, phase: 1 }),
      a = createActorAnimation().sample(p, 0),
      armed = new Mesh(),
      unarmed = new Mesh();
    drawRemotePlayer(armed, p, 0, { look, animation: a });
    drawRemotePlayer(unarmed, p, 0, {
      look: { ...look, railgun: false, akibo: false, battleaxe: false },
      animation: a,
    });
    assert.deepEqual(armed.data, unarmed.data, mode);
  }
});

test('roll clock never interpolates from a walking stride or unwinds on completion', () => {
  const walk = pose({ phase: 123 }),
    roll = pose({ mode: 'roll', phase: 1.1 });
  assert.ok(interpolateNetworkPose(walk, roll, 0.5).phase < 1.1);
  const end = interpolateNetworkPose({ ...roll, phase: 5.8 }, pose({ phase: 6.5 }), 0.5);
  assert.equal(end.mode, 'roll');
  assert.ok(end.phase > 5.8 && end.phase < Math.PI * 2);
  const a = createActorAnimation();
  assert.ok(Math.abs(a.sample(roll, 0).actionT - 1.1 / (Math.PI * 2)) < 1e-8);
});

test('ski and surf rotations finish their turn on landing instead of unwinding a full revolution', () => {
  for (const mode of ['ski', 'surf']) {
    const p = interpolateNetworkPose(pose({ mode, phase: 6.1 }), pose({ mode, phase: 0 }), 0.5);
    assert.ok(p.phase > 6.1 && p.phase < Math.PI * 2);
  }
});

test('capture raises arms before falling, holds, and resets after respawn', () => {
  const a = createActorAnimation(),
    dead = pose({ hp: 0 });
  a.sample(dead, 0);
  assert.equal(a.sample(dead, 500).fall, 0);
  assert.equal(a.sample(dead, 1500).fall, 1);
  assert.equal(a.sample(dead, 3000).fall, 1);
  assert.equal(a.sample(pose(), 3100).fall, 0);
  const arrest = createActorAnimation(),
    p = pose({ gesture: 'caught' });
  arrest.sample(p, 0);
  assert.equal(arrest.sample(p, 1500).fall, 1);
});

test('gondola, exercise, fishing and surf poses round-trip in the existing 32-byte record', () => {
  for (const gesture of MP_GESTURES) {
    const frame = encodePlayerFrame([pose({ mode: 'gondola', gesture })], 1, 10),
      decoded = decodePlayerFrame(frame).players[0];
    assert.equal(frame.byteLength, 44);
    assert.equal(decoded.mode, 'gondola');
    assert.equal(decoded.gesture, gesture);
  }
});
