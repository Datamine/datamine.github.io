import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry, player } from './fixtures.mts';
import { decodePlayerFrame } from '../../multiplayer-protocol.ts';

test('legacy positions and recovery after death always produce decodable movement frames', async (t) => {
  for (const deathPending of [false, true] satisfies [boolean, boolean])
    await t.test(deathPending ? 'death recovery' : 'legacy position without a facing', async () => {
      const geometry = fixtureGeometry(),
        store = createMemoryStore(),
        token = (deathPending ? 65202 : 65201).toString(16).padStart(64, '0'),
        owner = createHash('sha256').update(token).digest('hex');
      await store.batch([
        [
          'player:' + owner,
          {
            privateState: {},
            position: { x: 92.2, z: 120, hp: 30 },
            deathPending,
            awards: [],
            awardSerial: 0,
          },
        ],
      ]);
      const game = await createGame({ geometry, store });
      try {
        const a = await player(game, deathPending ? 65202 : 65201),
          b = await player(game, 65203);
        assert.ok(Number.isFinite(a.p.angle));
        Object.assign(b.p, { x: a.p.x + 1, z: a.p.z, y: a.p.y });
        game.broadcast();
        for (const client of [a, b]) {
          const bytes = client.messages.filter((message) => message instanceof ArrayBuffer).at(-1),
            frame = decodePlayerFrame(requiredFixture(bytes));
          assert.ok(frame, 'one invalid restored angle must not invalidate everybody’s frame');
          assert.ok(frame.players.find((p) => p.id === a.p.id));
          assert.ok(frame.players.every((p) => Number.isFinite(p.angle)));
        }
      } finally {
        await game.close();
      }
    });
});
