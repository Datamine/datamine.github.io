import type { TestGame, TestPlayer } from './fixtures.mts';
import { requiredFixture } from '../../tests/helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { fixtureGeometry, player, latestResult } from './fixtures.mts';

const gear = {
  'sf-expeditions-v1': '{"raptor":"escaped","railgun":true,"equipped":true}',
  'sf-character-v1': '{"weapon":"railgun"}',
  'sf-inebriation-v1': '100',
};
async function setup() {
  let time = 1000000;
  const geometry = fixtureGeometry();
  geometry.wilderness = { actors: [{ id: 'bear', combatKind: 'bear', x: 92.7, z: 120 }] };
  const game = await createGame({
    geometry,
    store: createMemoryStore(),
    random: () => 0.6,
    now: () => time,
  });
  return { game, advance: (ms: number) => (time += ms) };
}
async function act(
  game: TestGame,
  a: TestPlayer,
  action: string,
  args: Record<string, unknown> = {},
) {
  game.receive(a.p, {
    type: 'command',
    action,
    args,
    request: Math.random(),
    inventoryEpoch: a.p.inventory.meta.epoch,
  });
  await a.p.queue;
  return latestResult(a.messages);
}
async function sober(game: import('./fixtures.mts').TestGame, a: TestPlayer) {
  game.personal.runtime(a.p).inebriation.set(0);
}
test('shared cows and wilderness enemies use saved inebriation, ignore attack-argument overrides and recover after server-side sobering', async () => {
  const { game, advance } = await setup(),
    a = await player(game, 850, gear);
  try {
    for (const target of [game.shared.cows[0], game.shared.wilderness.actors[0]]) {
      a.p.profile.privateState['sf-inebriation-v1'] = '100';
      Object.assign(a.p, { x: target.x, z: target.z, y: 1.15 });
      const hp = target.hp;
      assert.equal(
        requiredFixture(
          await act(game, a, 'attack', { id: target.id, weapon: 'railgun', inebriation: 0 }),
        ).ok,
        true,
      );
      assert.equal(target.hp, hp);
      assert.equal(
        requiredFixture(a.messages.filter((m) => m.type === 'sharedHit').at(-1)).damage,
        0,
      );
      await act(game, a, 'stopAttack');
      advance(1100);
      await sober(game, a);
      game.tick(0.9);
      assert.equal(
        requiredFixture(await act(game, a, 'attack', { id: target.id, weapon: 'railgun' })).ok,
        true,
      );
      assert.ok(target.hp < hp);
      await act(game, a, 'stopAttack');
      game.tick(0.9);
    }
  } finally {
    await game.close();
  }
});
test('PvP applies the attacker’s current saved inebriation to automatic combat ticks', async () => {
  const { game, advance } = await setup(),
    a = await player(game, 851, gear),
    b = await player(game, 852);
  try {
    await act(game, a, 'pvp', { enabled: true });
    await act(game, b, 'pvp', { enabled: true });
    await act(game, a, 'pvpAttack', { id: b.p.id });
    game.tick();
    assert.equal(b.p.hp, 30);
    assert.equal(requiredFixture(a.messages.filter((m) => m.type === 'pvpHit').at(-1)).damage, 0);
    await sober(game, a);
    advance(900);
    game.tick();
    assert.ok(b.p.hp < 30);
    assert.ok(requiredFixture(a.messages.filter((m) => m.type === 'pvpHit').at(-1)).damage > 0);
  } finally {
    await game.close();
  }
});
