import { isRecord, isFiniteNumber } from '../../types/json.ts';
import { validatePlayerDocument } from '../../content/validate.js';

import assert from 'node:assert/strict';
import type { ServerEvent } from '../../types/network.ts';
import type { ServerPlayer } from '../../types/server.ts';
export type CapturedMessage =
  | ServerEvent
  | { type?: undefined; closed: number | undefined; reason?: string }
  | (ArrayBuffer & { type?: undefined });
export type TestGame = Awaited<ReturnType<typeof createGame>>;
import { createHash } from 'node:crypto';
import { createDetentionSite } from '../../encounters.ts';
import { MP_PROTOCOL } from '../../multiplayer-protocol.ts';
import { createMemoryStore } from '../store.mts';
import { createGame } from '../game.mts';
import { createAirship } from '../../airship.ts';
export type TestPlayer = Awaited<ReturnType<typeof player>>;
type FixtureGeometry = import('../../types/server.ts').ServerGeometry & {
  detention: ReturnType<typeof createDetentionSite>;
  hospital: { x: number; y: number };
  merchants: import('../../types/world.ts').Actor[];
  airship: ReturnType<typeof createAirship>;
  canTravel: NonNullable<import('../../types/server.ts').ServerGeometry['canTravel']>;
  nearestGround: (x: number, z: number) => { x: number; z: number };
};
export function fixtureGeometry(): FixtureGeometry {
  return {
    detention: createDetentionSite(1.5),
    spawn: { x: 91.7, y: 119.5 },
    hospital: { x: 74.7, y: 89.5 },
    merchants: [],
    airship: createAirship(),
    landClearAt: (x: unknown, y: unknown) =>
      isFiniteNumber(x) && isFiniteNumber(y) && x > -100 && x < 200 && y > -100 && y < 200,
    characterGround: () => 1.15,
    canTravel: () => true,
    pathTo: (x: number, y: number) => [{ x, y }],
    nearestGround: (x: number, z: number) => ({ x, z }),
  };
}
export async function fixture() {
  let time = 1000000;
  const store = createMemoryStore(),
    geometry = fixtureGeometry(),
    game = await createGame({
      geometry,
      store,
      now: () => time,
      random: () => 0.5,
      allowDebug: true,
    });
  return { game, store, geometry, advance: (ms: number) => (time += ms) };
}
export async function player(
  game: TestGame,
  number: number,
  privateState: Record<string, string> = {},
) {
  const messages: CapturedMessage[] = [],
    transport = {
      open: true,
      bufferedAmount: 0,
      send: (value: string | ArrayBuffer) =>
        messages.push(typeof value === 'string' ? (JSON.parse(value) as ServerEvent) : value),
      close(code?: number, reason?: string) {
        this.open = false;
        messages.push({ closed: code, reason });
      },
    };
  const token = number.toString(16).padStart(64, '0'),
    owner = createHash('sha256').update(token).digest('hex');
  const seeded: Record<string, string> = {
    'sf-purse-v1': JSON.stringify({ coins: 25 }),
    'sf-expeditions-v1': JSON.stringify({ raptor: 'escaped', railgun: true }),
    ...privateState,
  };
  // Trusted test setup writes the server store. A real hello cannot import
  // these gameplay flags; authority.test.mjs explicitly verifies that boundary.
  if (!(await game.store.get('player:' + owner)))
    await game.store.batch([
      [
        'player:' + owner,
        {
          privateState: seeded,
          inventory: {
            epoch: 0,
            revision: 0,
            sandwiches: JSON.parse(seeded['sf-deli-v1'] || '{}').sandwiches || 0,
            deliveryPending: false,
            railgunCharge: 25,
            akimboAmmo: 200,
            railgunBatteries: 0,
          },
          position: null,
          grapplingHook: false,
          awards: [],
          awardSerial: 0,
        },
      ],
    ]);
  const p = await game.connect({ protocol: MP_PROTOCOL, token, privateState: seeded }, transport);
  assert.ok(p, 'The player fixture must connect');
  return { p, messages, transport, token };
}
export async function command(
  game: TestGame,
  p: ServerPlayer,
  action: string,
  args: Record<string, unknown> = {},
) {
  game.receive(p, { type: 'command', request: Math.random(), action, args });
  await p.queue;
}
export function latestResult(messages: readonly CapturedMessage[]) {
  return messages.filter((message) => message.type === 'result').at(-1);
}
export function requiredResult(messages: readonly CapturedMessage[]) {
  const result = latestResult(messages);
  assert.ok(result, 'The command must produce a result');
  return result;
}

/** Decode the canonical player document written by the real persistence adapter. */
export async function storedPlayerFixture(
  store: Pick<import('../../types/storage.ts').GameplayStore, 'get'>,
  key: string,
) {
  const raw = await store.get(key);
  assert.ok(isRecord(raw), 'Expected a persisted player record.');
  return { playerState: validatePlayerDocument(raw.playerState) };
}
export async function storedWorldFixture(
  store: Pick<import('../../types/storage.ts').GameplayStore, 'get'>,
  key: 'world',
) {
  const raw = await store.get(key);
  assert.ok(isRecord(raw) && isRecord(raw.shared), 'Expected a persisted shared world.');
  // This is the record owned and produced by TestGame's persistence path.
  return raw as { serial: number; shared: ReturnType<TestGame['shared']['persist']> };
}
