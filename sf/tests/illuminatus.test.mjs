import test from 'node:test';
import assert from 'node:assert/strict';
import { illuminatusQuestEntry } from '../illuminatus.js';
import { createSecretAdventures } from '../secret-adventures.js';
import { createEconomy } from '../economy.js';

test('Illuminatus tracks first check-in, partial ranks, admission, initiation and the aircraft', () => {
  const fresh = illuminatusQuestEntry();
  assert.equal(fresh.title, 'Illuminatus');
  assert.equal(fresh.stage, 'not-started');
  assert.equal(fresh.targets.filter((t) => t.done).length, 0);
  assert.equal(illuminatusQuestEntry({ guild: { lastVisitAt: 0 } }).stage, 'accepted');
  const partial = illuminatusQuestEntry({ guild: { visits: 7 } });
  assert.match(partial.description, /7\/24/);
  assert.equal(partial.targets[0].done, false);
  const member = illuminatusQuestEntry({ guild: { member: true, visits: 24 } });
  assert.match(member.description, /Old Man/);
  assert.equal(member.targets[0].done, true);
  assert.equal(member.targets[1].done, false);
  const initiated = illuminatusQuestEntry({ initiated: true });
  assert.equal(initiated.stage, 'accepted');
  assert.equal(initiated.targets[1].done, true);
  assert.equal(initiated.targets[2].done, false);
  assert.match(
    illuminatusQuestEntry({ initiated: true, inHangar: true }).description,
    /board it to complete Illuminatus/,
  );
  const complete = illuminatusQuestEntry({ bomberOwned: true });
  assert.equal(complete.stage, 'completed');
  assert.ok(complete.targets.every((t) => t.done));
});
test('local saves cannot grant initiation, an instance, a bomber or quest completion', async () => {
  const economy = createEconomy({ coins: 250000 }),
    changes = [];
  const game = createSecretAdventures({
    economy,
    saved: { initiated: true, bomberOwned: true, bombReadyAt: 123456 },
    guildSite: { x: 0, y: 0, w: 4, d: 4 },
    transition: (p) => changes.push(p),
  });
  for (const action of [
    'join',
    'enterCave',
    'leave',
    'boardBomber',
    'returnBomber',
    'ejectBomber',
    'dropBomb',
  ])
    assert.equal((await game[action]()).ok, false);
  assert.equal(game.questEntry({}).stage, 'not-started');
  assert.equal(game.initiated, false);
  assert.equal(economy.state.coins, 250000);
  assert.deepEqual(changes, []);
});
test('multiplayer completion follows server aircraft ownership, including returning players', () => {
  const messages = [],
    client = {
      state: { illuminati: false, bomber: { owned: false, readyAt: 0 } },
      subscribe: () => {},
    },
    game = createSecretAdventures({
      client,
      saved: { bomberOwned: true },
      guildSite: { x: 0, y: 0, w: 4, d: 4 },
      ground: () => 0,
      transition: () => {},
      onMessage: (m) => messages.push(m),
    });
  assert.equal(
    game.questEntry({}).stage,
    'not-started',
    'local storage cannot supply multiplayer completion',
  );
  game.accept({ type: 'result', illuminati: true });
  assert.equal(game.questEntry({}).stage, 'accepted');
  game.accept({
    type: 'instance',
    instance: { kind: 'world', id: 'world' },
    position: { x: -24, y: 25, z: 106 },
    bomber: { owned: true, active: true, readyAt: 0 },
  });
  assert.equal(game.questEntry({}).stage, 'completed');
  game.accept({ type: 'result', bomber: { owned: true, readyAt: 0 } });
  assert.equal(messages.filter((m) => m.startsWith('Quest complete:')).length, 1);
  const returning = createSecretAdventures({
    client: { ...client, state: { illuminati: true, bomber: { owned: true, readyAt: 0 } } },
    guildSite: { x: 0, y: 0, w: 4, d: 4 },
  });
  assert.equal(returning.questEntry({}).stage, 'completed');
  game.accept({
    type: 'welcome',
    instance: { kind: 'world' },
    bomber: { owned: true, readyAt: 0 },
    illuminati: true,
  });
  assert.equal(messages.filter((m) => m.startsWith('Quest complete:')).length, 1);
});
