import { FixtureSocket as Socket } from './helpers/socket.mts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { airshipAttendantDialogue, airshipResetCountdown } from '../airship-rental.ts';
import { createMultiplayerClient } from '../multiplayer-client.ts';
import { encodePlayerFrame } from '../multiplayer-protocol.ts';

test('attendant explains the server reset, price and reservation; boarding follows a successful receipt', async () => {
  let rents = 0,
    success = true,
    quote;
  const now = 1000,
    status = {
      recallPrice: 15,
      reservedFor: null,
      reservedName: null,
      reservedUntil: 0,
      reservedForYou: false,
      serverTime: 1000,
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
      ...{
        refresh: async () => ({ ok: false }),
        recall: async () => ({ ok: false }),
        rent: () => {},
      },
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
  assert.match(requiredFixture(dialogue.intro)(), /1m 0s/);
  assert.match(requiredFixture(dialogue.intro)(), /SkyPilot/);
  assert.doesNotMatch(
    requiredFixture(dialogue.intro)(),
    /last renter paid|Each rental or takeover costs/,
  );
  assert.match(requiredFixture(dialogue.intro)(), /quoted price is 15 coins/);
  assert.equal(dialogue.repeat, false, 'OK closes receipt before boarding');
  assert.ok(dialogue?.choices != null, 'Missing test fixture: dialogue.choices');
  const recall = dialogue.choices.find((c) => c.label === 'Outbid and recall · 15 coins');
  assert.ok(recall?.accept != null, 'Missing test fixture: recall.accept');
  const receipt = requiredFixture(await recall.accept());
  assert.equal(quote, 15);
  assert.equal(rents, 0);
  requiredFixture(receipt.after)();
  assert.equal(rents, 1);
  success = false;
  assert.ok(recall != null, 'Missing test fixture: recall');
  assert.equal(requiredFixture(await requiredFixture(await recall.accept())).after, undefined);

  assert.match(
    requiredFixture(
      requiredFixture(
        await requiredFixture(
          await requiredFixture(
            requiredFixture(dialogue.choices.find((c) => c.label.startsWith('How'))).accept,
          )(),
        ),
      ).message,
    ),
    /59s/,
  );
  assert.equal(airshipResetCountdown(1000, 2000), 'now');
  assert.equal(airshipResetCountdown(1501, 1000), '1s');
  const docked = airshipAttendantDialogue(
    {},
    {
      ...{
        refresh: async () => ({ ok: false }),
        recall: async () => ({ ok: false }),
        rent: () => {},
      },
      status: () => ({ ...status, active: false, canRecall: false, reservedForYou: true }),
      now: () => now,
    },
  );
  assert.ok(docked?.choices != null, 'Missing test fixture: docked.choices');
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
      ...{
        refresh: async () => ({ ok: false }),
        recall: async () => ({ ok: false }),
        rent: () => {},
      },
      status: () => status,
      now: () => 1000,
      recall: async (price) => {
        quoted = price;
        return { ok: true };
      },
      rent: () => {},
    },
  );
  assert.match(requiredFixture(reserved.intro)(), /outbid that reservation/);
  assert.ok(reserved?.choices != null, 'Missing test fixture: reserved.choices');
  await requiredFixture(
    requiredFixture(reserved.choices.find((c) => c.label === 'Outbid and recall · 10 coins'))
      .accept,
  )();
  assert.equal(quoted, 10);
  const normal = airshipAttendantDialogue(
    {},
    {
      ...{
        refresh: async () => ({ ok: false }),
        recall: async () => ({ ok: false }),
        rent: () => {},
      },
      status: () => ({ ...status, reservedName: null, canRecall: false }),
      now: () => 1000,
      rent: (price) => (quoted = price),
    },
  );
  status.rentalPrice = 15;
  assert.ok(normal?.choices != null, 'Missing test fixture: normal.choices');
  requiredFixture(
    await requiredFixture(
      await requiredFixture(
        requiredFixture(normal.choices.find((c) => c.label === 'Rent airship · 10 coins')).accept,
      )(),
    ),
  ).after?.();
  assert.equal(quoted, 10);
});

test('recall clears airborne interpolation immediately and installs the new shared mooring', async () => {
  const values = new Map([['sf-mp-identity', 'a'.repeat(64)] satisfies [string, string]]),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    };
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
    assert.ok(client?.state?.world != null, 'Missing test fixture: client.state.world');
    assert.deepEqual(client.state.world.airship, airship);
    assert.equal(client.state.self, null);
  } finally {
    client.stop();
  }
});
