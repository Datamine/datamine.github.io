import { FixtureSocket as Socket } from './helpers/socket.mts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { multiplayerEndpoint, interpolateNetworkPose } from '../multiplayer-client.ts';
import {
  sanitizePrivateState,
  validNetworkPose,
  unpackNetworkNPC,
  encodePlayerFrame,
  decodePlayerFrame,
} from '../multiplayer-protocol.ts';

test('bomber bank and successive barrel rolls interpolate through full turns over the existing movement packet', () => {
  const pose = {
      id: 7,
      x: 0,
      y: 20,
      z: 0,
      angle: 0,
      phase: Math.PI * 2,
      motion: 0,
      mode: 'bomber',
    },
    next = { ...pose, phase: Math.PI * 3 };
  const decoded = requiredFixture(decodePlayerFrame(encodePlayerFrame([next], 1, 100))).players[0];
  assert.ok(Math.abs(decoded.phase - next.phase) < 1e-6);
  assert.ok(Math.abs(interpolateNetworkPose(pose, decoded, 0.5).phase - Math.PI * 2.5) < 1e-6);
});

test('connection settings accept local sockets and require TLS from an HTTPS page', () => {
  assert.equal(
    multiplayerEndpoint('/ws', 'http://localhost:8787/explore.html'),
    'ws://localhost:8787/ws',
  );
  assert.equal(
    multiplayerEndpoint('/ws', 'https://example.com/explore.html'),
    'wss://example.com/ws',
  );
  assert.equal(
    multiplayerEndpoint('ws://localhost/ws', 'file:///tmp/explore.html'),
    'ws://localhost/ws',
  );
  for (const value of [
    'javascript:alert(1)',
    'https://user:secret@example.com/ws',
    'ws://example.com/ws',
  ] satisfies [string, string, string])
    assert.equal(multiplayerEndpoint(value, 'https://example.com/explore.html'), null);
});
test('network interpolation takes the short turn and snaps real teleports rather than crossing the city', () => {
  const a = { x: 1, y: 2, z: 3, angle: Math.PI - 0.1, phase: 0, motion: 0, mode: 'walk' },
    b = { ...a, x: 2, angle: -Math.PI + 0.1, phase: 1, motion: 1 };
  const middle = interpolateNetworkPose(a, b, 0.5);
  assert.equal(middle.x, 1.5);
  assert.ok(Math.abs(middle.angle - Math.PI) < 1e-10);
  assert.equal(middle.motion, 0.5);
  assert.equal(interpolateNetworkPose(a, { ...b, x: 1000 }, 0.5).x, 1000);
  assert.equal(interpolateNetworkPose(a, { ...b, mode: 'hidden' }, 0.5).mode, 'hidden');
});
test('personal checkpoints are bounded and cannot include credentials or shared world claims', () => {
  const result = sanitizePrivateState({
    'sf-purse-v1': '{"coins":25}',
    'sf-inebriation-v1': '30',
    'sf-mp-identity': 'secret',
    cows: '{"hp":0}',
    'sf-quests-v1': 'not JSON',
    'sf-character-v1': 'x'.repeat(20000),
  });
  assert.deepEqual(result, { 'sf-purse-v1': '{"coins":25}', 'sf-inebriation-v1': '30' });
  const pose = { x: 1, y: 2, z: 3, angle: 0, phase: 1, motion: 0, mode: 'walk' };
  assert.ok(validNetworkPose(pose));
  for (const invalid of [
    { ...pose, x: Infinity },
    { ...pose, motion: 4 },
    { ...pose, mode: 'admin' },
  ])
    assert.equal(validNetworkPose(invalid), false);
  assert.equal(unpackNetworkNPC(['citizen-1', 1, 2, null, 0.3, 1, 4, 5, 0, 0.1]).elapsed, 5);
});

test('authoritative follower poses interpolate without a local movement loop and stay separate from peers', async () => {
  const { createMultiplayerClient } = await import('../multiplayer-client.ts'),
    { encodePlayerFrame } = await import('../multiplayer-protocol.ts');

  const values = new Map([['sf-mp-identity', 'a'.repeat(64)] satisfies [string, string]]),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    };
  let time = 1000;
  const client = createMultiplayerClient({
      endpoint: 'ws://localhost/ws',
      storage,
      WebSocketClass: Socket,
      now: () => time,
    }),
    socket = Socket.last;
  try {
    socket.message({
      type: 'welcome',
      id: 1,
      name: 'Test',
      renameAt: 0,
      time: Date.now(),
      privateState: {},
      position: { x: 0, y: 1, z: 0 },
      shared: { npcs: [] },
    });
    await client.first;
    const base = {
      id: 1,
      x: 0,
      y: 1,
      z: 0,
      phase: 0,
      angle: 0,
      motion: 1,
      moving: true,
      mode: 'walk',
    };
    socket.message({ type: 'following', target: 2, position: base });
    time = 1100;
    socket.message(encodePlayerFrame([{ ...base, x: 1, phase: 1 }], 1, 1100));
    time = 1200;
    socket.message(encodePlayerFrame([{ ...base, x: 2, phase: 2 }], 2, 1200));
    const pose = client.selfPose(1250);
    assert.ok(pose != null, 'Missing test fixture: pose');
    assert.ok(Math.abs(pose.x - 0.8) < 1e-6);

    assert.ok(Math.abs(pose.phase - 0.8) < 1e-6);
    assert.equal(client.peers.size, 0);
    assert.equal(client.state.following, 2);
    socket.message({ type: 'following', target: null, position: { ...base, x: 2 } });
    assert.equal(client.selfPose(), null);
    assert.equal(client.state.following, null);
  } finally {
    client.stop();
  }
});

test('leaving kraken waters clears private ship state so later deltas cannot reboard a ghost ship', async () => {
  const { createMultiplayerClient } = await import('../multiplayer-client.ts');

  const values = new Map([['sf-mp-identity', 'b'.repeat(64)] satisfies [string, string]]),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
    client = createMultiplayerClient({
      endpoint: 'ws://localhost/ws',
      storage,
      WebSocketClass: Socket,
    }),
    socket = Socket.last;
  try {
    socket.message({
      type: 'welcome',
      id: 1,
      name: 'Test',
      time: Date.now(),
      privateState: {},
      position: { x: 0, y: 1, z: 0 },
      shared: { npcs: [] },
    });
    await client.first;
    socket.message({
      type: 'playerState',
      state: {
        ship: { aboard: true },
        kraken: { hp: 600 },
        loot: [{ id: 'private-loot' }],
        training: false,
      },
    });
    socket.message({
      type: 'instance',
      instance: { id: 'world', kind: 'world' },
      position: { x: 1, y: 1, z: 1 },
    });
    socket.message({ type: 'playerState', state: { training: false } });
    for (const key of ['ship', 'kraken', 'loot'] satisfies [string, string, string])
      assert.ok(!(key in requiredFixture(client.state.personal)));
  } finally {
    client.stop();
  }
});
