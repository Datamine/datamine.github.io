import test from 'node:test';
import assert from 'node:assert/strict';
import { NPC_DIALOGUES } from '../config/dialogue.js';
import { configuredDialogue } from '../dialogue-config.js';
import { dialogueFixture } from './helpers/dialogue-fixture.mjs';
import { scientistDialogue } from '../jurassic.js';
import { createSaltMail } from '../salt-mail.js';
import { createFuelDialogue, refuelFerrariFromCan } from '../fuel.js';
import { setupMultiplayerSettings } from '../multiplayer-world.js';

const choices = (node) =>
  node.choices ||
  (node.choice
    ? [{ label: node.choice, accept: node.accept, trade: node.trade, receipt: node.receipt }]
    : []);
const paths = (node) =>
  choices(node).flatMap((choice) =>
    choice.next ? paths(choice.next).map((path) => [choice, ...path]) : [[choice]],
  );
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

test('every configured dialogue leaf renders, invokes exactly one bound action, handles refusal, and closes cleanly', async (t) => {
  let conversations = 0,
    branches = 0;
  for (const [id, template] of Object.entries(NPC_DIALOGUES)) {
    const tokens = [...JSON.stringify(template).matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    const values = Object.fromEntries(tokens.map((key) => [key, 'example']));
    for (const fail of [false, true]) {
      const calls = [],
        handlers = new Proxy(
          {},
          {
            get:
              (_, action) =>
              (...args) => {
                calls.push({ action, args });
                return Promise.resolve({
                  ok: !fail,
                  message: fail ? 'Server refused this action.' : 'Server confirmed this action.',
                });
              },
          },
        );
      const person = configuredDialogue(id, { name: 'Audit NPC' }, handlers, values);
      for (const path of paths(person)) {
        const before = calls.length,
          f = dialogueFixture({ name: 'Audit player' }, { trade: (kind) => handlers.trade(kind) });
        try {
          f.dialogue.open(person);
          f.click('OK');
          for (const choice of path) {
            assert.ok(
              f
                .buttons()
                .every((button) => !['Back', 'Close', 'Cancel'].includes(button.textContent)),
              id + ' has a duplicate or obsolete navigation option',
            );
            f.click(choice.label);
            if (choice.next && !choice.next.skipIntro) f.click('OK');
          }
          await settle();
          const leaf = path.at(-1),
            hasAction = !!(leaf.accept || leaf.trade);
          assert.equal(calls.length - before, hasAction ? 1 : 0, id + ' action count');
          if (hasAction && fail)
            assert.match(
              f.element.textContent,
              /Server refused this action/,
              id + ' hid a failed receipt',
            );
          assert.equal(
            f.element
              .querySelectorAll('button')
              .filter((button) => ['Leave', 'Close', 'Cancel'].includes(button.textContent))
              .length <= 1,
            true,
            id + ' duplicates exits',
          );
          f.click('OK');
          if (f.dialogue.active) f.dialogue.cancel();
          assert.equal(f.dialogue.active, false);
          branches++;
        } finally {
          f.restore();
        }
      }
    }
    conversations++;
  }
  assert.ok(conversations >= 50);
  assert.ok(branches >= 200);
  t.diagnostic(
    `${conversations} conversation templates; ${branches} successful/refused leaf paths`,
  );
});

test('starting Jurassic recovery waits for the actual server receipt instead of announcing an unissued railgun', async () => {
  let resolve;
  const f = dialogueFixture(),
    game = {
      state: { raptor: 'not-started' },
      startQuest: () => ({ ok: true, pending: true, promise: new Promise((r) => (resolve = r)) }),
    };
  try {
    f.dialogue.open(scientistDialogue({ name: 'Scientist' }, game));
    f.click('OK');
    f.click('Do you have a quest for me?');
    assert.match(f.element.textContent, /Waiting for the server/);
    assert.doesNotMatch(f.element.textContent, /gives you a railgun/);
    resolve({ ok: false, message: 'The scientist is too far away.' });
    await settle();
    assert.match(f.element.textContent, /too far away/);
  } finally {
    f.restore();
  }
});

test('salt mail and fuel-can messages describe the settled result and never predict success on refusal', async () => {
  let resolve;
  const economy = {
      state: { saltLetters: 0 },
      trade: () => ({ ok: true, pending: true, promise: new Promise((r) => (resolve = r)) }),
    },
    mail = createSaltMail(economy);
  for (const [action, success] of [
    [mail.collect, /sealed salt-conservation letter/],
    [mail.deliver, /pays you 50 coins/],
  ]) {
    const request = action();
    resolve({ ok: false, message: 'Too far from the clerk.' });
    assert.equal((await request.promise).message, 'Too far from the clerk.');
    const accepted = action();
    resolve({ ok: true });
    assert.match((await accepted.promise).message, success);
  }
  let refuels = 0;
  const car = {
    state: { owned: true, fuel: 0, distance: 0 },
    position: { x: 0, z: 0 },
    sample: () => ({ x: 0, z: 0 }),
    refuel: () => refuels++,
  };
  const pump = createFuelDialogue({ paid: true, label: 'Fuel', distance: 0 }, car, economy);
  const can = pump.choices.find((choice) => choice.label.startsWith('Fuel can')).accept();
  resolve({ ok: false, message: 'Purchase refused.' });
  assert.equal((await can.promise).message, 'Purchase refused.');
  const pour = refuelFerrariFromCan(car, economy);
  assert.equal(refuels, 0);
  resolve({ ok: false, message: 'Walk to your Ferrari.' });
  assert.equal((await pour.promise).ok, false);
  assert.equal(refuels, 0);
  const accepted = refuelFerrariFromCan(car, economy);
  resolve({ ok: true });
  assert.match((await accepted.promise).message, /full tank/i);
  assert.equal(refuels, 0, 'online use must not issue a duplicate refuel command');
});

test('a refused PvP toggle reports its server error and restores the checkbox without an undefined callback', async () => {
  const previous = globalThis.document,
    nodes = new Map(),
    notices = [];
  const node = (key) => {
    if (!nodes.has(key))
      nodes.set(key, {
        value: '',
        textContent: '',
        dataset: {},
        handlers: {},
        setAttribute() {},
        addEventListener(type, fn) {
          this.handlers[type] = fn;
        },
        querySelector: node,
      });
    return nodes.get(key);
  };
  globalThis.document = { getElementById: node };
  const client = {
    state: { connected: true, name: 'Audit', pvp: { enabled: false, disableAt: 0 } },
    subscribe() {},
    command: async () => ({ ok: false, message: 'You must wait before changing PvP.' }),
  };
  try {
    setupMultiplayerSettings(client, { announce: (...args) => notices.push(args) });
    const checkbox = node('sf-pvp-enabled');
    checkbox.checked = true;
    await checkbox.handlers.change({ target: checkbox });
    assert.equal(checkbox.checked, false);
    assert.equal(checkbox.disabled, false);
    assert.deepEqual(notices, [['You must wait before changing PvP.', 'PvP']]);
  } finally {
    globalThis.document = previous;
  }
});
