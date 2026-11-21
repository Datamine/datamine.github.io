import type { TestGame, TestPlayer } from './fixtures.mts';
import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry, player, latestResult } from './fixtures.mts';
import { MP_PROTOCOL } from '../../multiplayer-protocol.ts';
import { SF_FITNESS } from '../../southern-layout.ts';

async function fixture() {
  let time = 1000000;
  const geometry = fixtureGeometry(),
    game = await createGame({
      geometry,
      store: createMemoryStore(),
      now: () => time,
      random: () => 0.5,
    });
  return { game, geometry, advance: (ms: number) => (time += ms) };
}
async function act(
  game: TestGame,
  a: TestPlayer,
  action: string,
  args: Record<string, unknown> = {},
) {
  game.receive(a.p, {
    type: 'command',
    request: 1,
    action,
    args,
    inventoryEpoch: a.p.inventory.meta.epoch,
  });
  await a.p.queue;
  return latestResult(a.messages);
}

test('new identities cannot import money, XP, food, weapons or quest completion from local storage', async () => {
  const { game } = await fixture(),
    messages: (string | ArrayBuffer)[] = [],
    p = await game.connect(
      {
        protocol: MP_PROTOCOL,
        token: 'f'.repeat(64),
        privateState: {
          'sf-purse-v1': '{"coins":999999,"ownedHats":["crown"]}',
          'sf-strength-v1': '{"xp":12000}',
          'sf-deli-v1': '{"sandwiches":500}',
          'sf-expeditions-v1': '{"raptor":"escaped","railgun":true}',
          'sf-quests-v1': '{"theyLive":{"completed":true}}',
        },
      },
      { open: true, bufferedAmount: 0, send: (m) => messages.push(m), close() {} },
    );
  try {
    assert.equal(p.inventory.economy.state.coins, 25);
    assert.equal(p.inventory.meta.sandwiches, 0);
    assert.equal(p.level, 1);
    assert.equal(game.personal.runtime(p).expeditions.state.railgun, false);
    assert.equal(game.personal.runtime(p).quests.theyLive.state.completed, false);
  } finally {
    await game.close();
  }
});
test('checkpoints, poses and generic inventory operations cannot mint state or heal damage', async () => {
  const { game, advance } = await fixture(),
    a = await player(game, 900);
  try {
    a.p.hp = 9;
    const before = { x: a.p.x, z: a.p.z };
    game.receive(a.p, {
      type: 'checkpoint',
      privateState: {
        'sf-purse-v1': '{"coins":1000000}',
        'sf-strength-v1': '{"xp":12000}',
        'sf-quests-v1': '{"monkey":"completed"}',
        'sf-inebriation-v1': '100',
      },
    });
    await a.p.queue;
    game.receive(a.p, {
      type: 'pose',
      pose: { x: 100, z: 150, y: 1, phase: 0, angle: 0, motion: 0, mode: 'walk', hp: 30 },
    });
    assert.equal(a.p.hp, 9);
    assert.equal(a.p.x, before.x);
    assert.equal(a.p.level, 1);
    assert.equal(game.personal.runtime(a.p).quests.state.monkey, 'not-started');
    for (const args of [
      { op: 'credit', amount: 1000 },
      { op: 'delivered' },
      { op: 'trade', kind: 'ai-lab-wage' },
      { op: 'trade', kind: 'capital' },
      { op: 'trade', kind: 'monkey-quest' },
      { op: 'trade', kind: 'sales-software-sale' },
      { op: 'buyHat', id: 'paper' },
    ])
      assert.equal(
        requiredFixture(await act(game, a, 'inventory', args)).ok,
        false,
        JSON.stringify(args),
      );
    assert.equal(a.p.inventory.economy.state.coins, 25);
    advance(2000);
    game.tick(0.05);
  } finally {
    await game.close();
  }
});
test('movement follows the native route and progresses without any client pose packets', async () => {
  const { game } = await fixture(),
    a = await player(game, 901),
    x = a.p.x;
  try {
    assert.equal(requiredFixture(await act(game, a, 'moveTo', { x: x + 4.6, z: a.p.z })).ok, true);
    for (let i = 0; i < 20; i++) game.tick(0.05);
    assert.ok(Math.abs(a.p.x - x - 4.6) < 1e-6);
    assert.equal(a.p.y, 1.15);
    assert.ok(a.p.phase > 0);
    game.tick(0.05);
    assert.equal(a.p.moving, false);
  } finally {
    await game.close();
  }
});
test('strength training has server location checks and uses simulation time, never supplied XP or elapsed time', async () => {
  const { game } = await fixture(),
    a = await player(game, 902);
  try {
    assert.equal(
      requiredFixture(await act(game, a, 'playerAction', { verb: 'train', seconds: 1200 })).ok,
      false,
    );
    a.p.x = SF_FITNESS.x;
    a.p.z = SF_FITNESS.z;
    assert.equal(
      requiredFixture(
        await act(game, a, 'playerAction', { verb: 'train', seconds: 1200, xp: 12000 }),
      ).ok,
      true,
    );
    game.tick(2);
    assert.equal(game.personal.runtime(a.p).strength.state.xp, 20);
    assert.equal(a.p.level, 1);
    await act(game, a, 'playerAction', { verb: 'stopTraining' });
    assert.equal(a.p.x, SF_FITNESS.entry.x + 0.5);
    assert.equal(a.p.z, SF_FITNESS.entry.y + 0.5);
    game.tick(5);
    assert.equal(game.personal.runtime(a.p).strength.state.xp, 20);
  } finally {
    await game.close();
  }
});
test('server-owned robotaxi payouts and doomscroll damage continue without browser updates', async () => {
  const { game } = await fixture(),
    a = await player(game, 903, {
      'sf-purse-v1': '{"coins":25,"robotaxiOwned":true,"iphoneOwned":true,"iphoneEquipped":true}',
    });
  try {
    game.tick(120);
    assert.equal(a.p.inventory.economy.state.coins, 75);
    assert.equal(a.p.hp, 25);
    assert.equal(
      requiredFixture(await act(game, a, 'inventory', { op: 'credit', amount: 20 })).ok,
      false,
    );
  } finally {
    await game.close();
  }
});
test('interviews keep answers and scores on the server and cannot be shortened by client claims', async () => {
  const { game, geometry, advance } = await fixture(),
    a = await player(game, 904),
    n = {
      label: 'test-recruiter',
      id: 'test-recruiter',
      kind: 'recruiter',
      x: a.p.x,
      z: a.p.z,
      base: a.p.y,
    };
  geometry.merchants.push(n);
  game.shared.npcById.set(n.id, n);
  try {
    assert.equal(
      requiredFixture(await act(game, a, 'playerAction', { verb: 'interviewStart' })).ok,
      true,
    );
    assert.equal(
      requiredFixture(
        requiredFixture(
          await act(game, a, 'playerAction', { verb: 'interviewStatus', score: 100, elapsed: 120 }),
        ).interview,
      ).score,
      0,
    );
    const runtime = game.personal.runtime(a.p);
    for (let i = 0; i < 40; i++)
      assert.equal(
        requiredFixture(
          await act(game, a, 'playerAction', {
            verb: 'interviewAnswer',
            answer: requiredFixture(runtime.interview.state.problem).answer,
          }),
        ).ok,
        true,
      );
    assert.equal(runtime.job.state.hired, false);
    advance(120000);
    game.tick(0.05);
    assert.equal(runtime.job.state.hired, true);
    assert.equal(runtime.job.state.bestScore, 40);
  } finally {
    await game.close();
  }
});
test('detention and police pursuit survive reconnecting instead of becoming an escape hatch', async () => {
  const { game, geometry } = await fixture(),
    a = await player(game, 905);
  try {
    a.p.personalJailed = true;
    game.personal.runtime(a.p).police.state.jailed = true;
    await game.flush();
    game.disconnect(a.p);
    await a.p.queue;
    const b = await player(game, 905);
    assert.equal(b.p.personalJailed, true);
    assert.equal(game.personal.runtime(b.p).police.state.jailed, true);
    assert.equal(b.p.x, 30);
    assert.equal(
      requiredFixture(await act(game, b, 'playerAction', { verb: 'claimFunding' })).ok,
      false,
    );
    const snapped = await act(game, b, 'moveTo', { x: 90, z: 100 });
    assert.equal(requiredFixture(snapped).ok, true);
    assert.ok(
      geometry.detention.walkable(
        requiredFixture(requiredFixture(snapped).goal).x,
        requiredFixture(requiredFixture(snapped).goal).z,
      ),
    );
    game.tick(0.5);
    assert.ok(geometry.detention.walkable(b.p.x, b.p.z));
    assert.equal(
      requiredFixture(await act(game, b, 'playerAction', { verb: 'rehabilitate' })).ok,
      true,
    );
  } finally {
    await game.close();
  }
});
test('dead players cannot use food to overwrite the server death state', async () => {
  const { game } = await fixture(),
    a = await player(game, 906, { 'sf-deli-v1': '{"sandwiches":2}' });
  try {
    game.personal.runtime(a.p).health.damage(100);
    assert.equal(
      requiredFixture(await act(game, a, 'inventory', { op: 'eat', hpBefore: 1 })).ok,
      false,
    );
    assert.equal(a.p.hp, 0);
    assert.equal(a.p.inventory.meta.sandwiches, 2);
  } finally {
    await game.close();
  }
});
test('unchanged worlds and idle players do not receive redundant tick snapshots', async () => {
  const { game } = await fixture(),
    a = await player(game, 907);
  try {
    game.tick(0.25);
    game.broadcast();
    const baseline = a.messages.length;
    for (let i = 0; i < 20; i++) {
      game.tick(0.05);
      game.broadcast();
    }
    assert.equal(a.messages.length, baseline);
  } finally {
    await game.close();
  }
});
test('repeated attack actions preserve monster HP and attack clocks, while weapon changes remain usable', async () => {
  const { game } = await fixture(),
    a = await player(game, 908, {
      'sf-sunglasses-v1': '{"owned":true}',
      'sf-character-v1': '{"sunglasses":true}',
      'sf-quests-v1': '{"theyLive":{"started":true,"evidence":true,"permit":true,"bayonet":true}}',
    }),
    target = {
      label: 'test-spectre',
      id: 'test-spectre',
      alienId: 'alien-civic',
      x: a.p.x + 0.5,
      z: a.p.z,
      base: a.p.y,
    };
  game.shared.npcById.set(target.id, target);
  try {
    assert.equal(
      requiredFixture(
        await act(game, a, 'playerAction', {
          verb: 'attackPersonal',
          id: target.id,
          weapon: 'unarmed',
        }),
      ).ok,
      true,
    );
    game.tick(0.3);
    const battle = requiredFixture(game.personal.runtime(a.p).battle).battle;
    assert.equal(battle.state.hp, 36);
    assert.equal(
      requiredFixture(
        await act(game, a, 'playerAction', {
          verb: 'attackPersonal',
          id: target.id,
          weapon: 'bayonet',
        }),
      ).ok,
      true,
    );
    assert.equal(requiredFixture(game.personal.runtime(a.p).battle).battle, battle);
    assert.equal(battle.state.elapsed, 0.3);
    game.tick(1.1);
    assert.ok(battle.state.hp < 36);
    assert.ok(a.p.hp < 30);
  } finally {
    await game.close();
  }
});
