import test from 'node:test';
import assert from 'node:assert/strict';
import { airshipAttendantDialogue, airshipResetCountdown } from '../airship-rental.js';
import { createMultiplayerClient } from '../multiplayer-client.js';
import { encodePlayerFrame } from '../multiplayer-protocol.js';

test('attendant explains the server reset, price and reservation; boarding follows a successful receipt', async () => {
  let rents = 0,
    success = true,
    quote;
  const now = 1000,
    status = {
      resetAt: 61000,
      lastPrice: 10,
      rentalPrice: 15,
      active: true,
      pilot: 'SkyPilot',
      canRecall: true,
    };
  const dialogue = airshipAttendantDialogue(
    { name: 'Attendant' },
    {
      status: () => status,
      now: () => now,
      refresh: async () => ({ ok: true, airship: { ...status, serverTime: now + 1000 } }),
      recall: async (price) => {
        quote = price;
        return { ok: success, message: 'Receipt' };
      },
      rent: () => rents++,
    },
  );
  assert.match(dialogue.intro(), /1m 0s/);
  assert.match(dialogue.intro(), /SkyPilot/);
  assert.match(dialogue.intro(), /last renter paid 10 coins/);
  assert.match(dialogue.intro(), /quoted price is 15 coins/);
  assert.equal(dialogue.repeat, false, 'OK closes receipt before boarding');
  const recall = dialogue.choices.find((c) => c.label === 'Outbid and recall · 15 coins');
  const receipt = await recall.accept();
  assert.equal(quote, 15);
  assert.equal(rents, 0);
  receipt.after();
  assert.equal(rents, 1);
  success = false;
  assert.equal((await recall.accept()).after, undefined);
  assert.match(
    (await dialogue.choices.find((c) => c.label.startsWith('How')).accept()).message,
    /59s/,
  );
  assert.equal(airshipResetCountdown(1000, 2000), 'now');
  assert.equal(airshipResetCountdown(1501, 1000), '1s');
  const docked = airshipAttendantDialogue(
    {},
    {
      status: () => ({ ...status, active: false, canRecall: false, reservedForYou: true }),
      now: () => now,
    },
  );
  assert.ok(docked.choices.some((c) => c.label === 'Board prepaid airship'));
  assert.ok(!docked.choices.some((c) => c.label.startsWith('Outbid')));
});

test('unboarded reservations can be outbid, and normal rentals retain the displayed quote while walking', async () => {
  let quoted;
  const status = {
    resetAt: 61000,
    lastPrice: 5,
    rentalPrice: 10,
    active: false,
    reservedName: 'OtherPlayer',
    canRecall: true,
  };
  const reserved = airshipAttendantDialogue(
    {},
    {
      status: () => status,
      now: () => 1000,
      recall: async (price) => {
        quoted = price;
        return { ok: true };
      },
      rent: () => {},
    },
  );
  assert.match(reserved.intro(), /outbid that reservation/);
  await reserved.choices.find((c) => c.label === 'Outbid and recall · 10 coins').accept();
  assert.equal(quoted, 10);
  const normal = airshipAttendantDialogue(
    {},
    {
      status: () => ({ ...status, reservedName: null, canRecall: false }),
      now: () => 1000,
      rent: (price) => (quoted = price),
    },
  );
  status.rentalPrice = 15;
  normal.choices
    .find((c) => c.label === 'Rent airship · 10 coins')
    .accept()
    .after();
  assert.equal(quoted, 10);
});

test('recall clears airborne interpolation immediately and installs the new shared mooring', async () => {
  class Socket {
    constructor() {
      Socket.last = this;
      this.readyState = 1;
      this.handlers = {};
    }
    addEventListener(k, f) {
      this.handlers[k] = f;
    }
    send() {}
    close() {}
    message(data) {
      this.handlers.message({ data: data instanceof ArrayBuffer ? data : JSON.stringify(data) });
    }
  }
  const values = new Map([['sf-mp-identity', 'a'.repeat(64)]]),
    storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const client = createMultiplayerClient({
      endpoint: 'ws://localhost/ws',
      storage,
      WebSocketClass: Socket,
      now: () => 1000,
    }),
    socket = Socket.last;
  try {
    socket.message({
      type: 'welcome',
      id: 1,
      name: 'Test',
      time: Date.now(),
      privateState: {},
      shared: { npcs: [], airship: { active: true } },
      position: { x: 140, y: 30, z: 150 },
    });
    await client.first;
    socket.message(
      encodePlayerFrame(
        [{ id: 1, x: 140, y: 30, z: 150, angle: 0, phase: 0, motion: 0, mode: 'airship', hp: 30 }],
        1,
        1000,
      ),
    );
    assert.ok(client.selfPose());
    const position = { x: 92.2, y: 1.15, z: 120 },
      airship = { active: false, captain: null, passengers: [], position };
    socket.message({ type: 'airshipReset', reason: 'paid', position, airship });
    assert.equal(client.selfPose(), null);
    assert.deepEqual(client.state.position, position);
    assert.deepEqual(client.state.world.airship, airship);
    assert.equal(client.state.self, null);
  } finally {
    client.stop();
  }
});
