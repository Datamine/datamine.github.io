import test from 'node:test';
import assert from 'node:assert/strict';
import { MP_PROTOCOL } from '../../multiplayer-protocol.js';
import { generateUsername, normalizeUsername } from '../usernames.mjs';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { fixtureGeometry, player, command, latestResult } from './fixtures.mjs';

test('automatic names satisfy moderation/length rules and avoid reserved names', () => {
  const taken = new Set();
  for (let i = 0; i < 1000; i++) {
    const result = generateUsername((name) => taken.has(name));
    assert.equal(normalizeUsername(result.name).ok, true);
    assert.ok(result.name.length <= 12);
    assert.ok(!taken.has(result.canonical));
    taken.add(result.canonical);
  }
  assert.throws(
    () =>
      generateUsername(
        () => true,
        () => 0,
      ),
    /available username/,
  );
});

test('automatic names are unique, persist across restart, and do not consume the first rename', async () => {
  const store = createMemoryStore();
  let time = 1000000,
    game = await createGame({ geometry: fixtureGeometry(), store, now: () => time });
  const a = await player(game, 51001),
    b = await player(game, 51002),
    automatic = a.p.name;
  assert.notEqual(automatic, b.p.name);
  assert.equal(a.p.nameChanged, 0);
  assert.equal(a.messages.find((m) => m.type === 'welcome').autoName, true);
  assert.equal(a.messages.find((m) => m.type === 'welcome').renameAt, 0);
  await command(game, b.p, 'rename', { name: automatic });
  assert.equal(latestResult(b.messages).ok, false);
  assert.match(latestResult(b.messages).message, /taken/);
  await game.close();
  game = await createGame({ geometry: fixtureGeometry(), store, now: () => time });
  try {
    const returning = await player(game, 51001);
    assert.equal(returning.p.name, automatic);
    assert.equal(returning.messages.find((m) => m.type === 'welcome').renameAt, 0);
    await command(game, returning.p, 'rename', { name: 'HarborAda' });
    assert.equal(latestResult(returning.messages).ok, true);
    assert.equal(latestResult(returning.messages).autoName, false);
    await command(game, returning.p, 'rename', { name: 'HarborBea', autoName: true });
    assert.equal(latestResult(returning.messages).ok, false);
    assert.match(latestResult(returning.messages).message, /Wait/);
    await game.close();
    game = await createGame({ geometry: fixtureGeometry(), store, now: () => time });
    const chosen = await player(game, 51001);
    assert.equal(chosen.p.name, 'HarborAda');
    assert.equal(chosen.messages.find((m) => m.type === 'welcome').autoName, false);
    assert.equal(chosen.messages.find((m) => m.type === 'welcome').renameAt, time + 60000);
    await command(game, chosen.p, 'rename', { name: 'HarborBea' });
    assert.equal(latestResult(chosen.messages).ok, false);
    time += 60000;
    await command(game, chosen.p, 'rename', { name: 'HarborBea' });
    assert.equal(latestResult(chosen.messages).ok, true);
  } finally {
    await game.close();
  }
});

test('moderation failures leave the automatic name and free first choice intact', async () => {
  const game = await createGame({ geometry: fixtureGeometry(), store: createMemoryStore() }),
    a = await player(game, 51003);
  try {
    const automatic = a.p.name;
    await command(game, a.p, 'rename', { name: 'f_u_c_k' });
    assert.equal(latestResult(a.messages).ok, false);
    assert.equal(a.p.name, automatic);
    assert.equal(a.p.nameChanged, 0);
    await command(game, a.p, 'rename', { name: 'HarborRay' });
    assert.equal(latestResult(a.messages).ok, true);
  } finally {
    await game.close();
  }
});

test('welcome distinguishes a first visit from returning saved characters regardless of name choice', async () => {
  const store = createMemoryStore();
  let game = await createGame({ geometry: fixtureGeometry(), store });
  const token = 'f'.repeat(64),
    messages = [],
    transport = {
      open: true,
      bufferedAmount: 0,
      send: (value) => messages.push(JSON.parse(value)),
      close() {},
    };
  try {
    const p = await game.connect({ protocol: MP_PROTOCOL, token }, transport),
      first = messages.find((m) => m.type === 'welcome');
    assert.equal(first.returningCharacter, false);
    assert.equal(first.autoName, true);
    const name = p.name;
    await game.close();
    game = await createGame({ geometry: fixtureGeometry(), store });
    messages.length = 0;
    const returning = await game.connect({ protocol: MP_PROTOCOL, token }, transport);
    let welcome = messages.find((m) => m.type === 'welcome');
    assert.equal(welcome.returningCharacter, true);
    assert.equal(welcome.autoName, true);
    assert.equal(welcome.name, name);
    assert.equal(welcome.renameAt, 0);
    await command(game, returning, 'rename', { name: 'ShoreAda' });
    await game.close();
    game = await createGame({ geometry: fixtureGeometry(), store });
    messages.length = 0;
    await game.connect({ protocol: MP_PROTOCOL, token }, transport);
    welcome = messages.find((m) => m.type === 'welcome');
    assert.equal(welcome.returningCharacter, true);
    assert.equal(welcome.autoName, false);
    assert.equal(welcome.name, 'ShoreAda');
  } finally {
    await game.close();
  }
});
