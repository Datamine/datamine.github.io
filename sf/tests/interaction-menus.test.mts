import { createEconomy } from '../economy.ts';
import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { NPC_DIALOGUES } from '../config/dialogue.ts';
import { configuredDialogue } from '../dialogue-config.ts';
import { dialogueFixture } from './helpers/dialogue-fixture.mts';
import { scientistDialogue } from '../jurassic.ts';
import { createSaltMail } from '../salt-mail.ts';
import { createFuelDialogue, refuelFerrariFromCan } from '../fuel.ts';
import { setupMultiplayerSettings } from '../multiplayer-world.ts';
import type { RuntimeDialogue } from '../types/world.ts';

const choices = (node: RuntimeDialogue): import('../types/world.ts').RuntimeChoice[] =>
  node.choices ||
  (node.choice
    ? [{ label: node.choice, accept: node.accept, trade: node.trade, receipt: node.receipt }]
    : []);
const paths = (node: RuntimeDialogue): import('../types/world.ts').RuntimeChoice[][] =>
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
    const values = Object.fromEntries(
      tokens.map((key) => [key, 'example'] satisfies [string, string]),
    );
    for (const fail of [false, true] satisfies [boolean, boolean]) {
      const calls: { action: PropertyKey; args: unknown[] }[] = [],
        handlers = new Proxy(
          {} as Record<
            string,
            (...args: unknown[]) => Promise<import('../types/world.ts').ActionReceipt>
          >,
          {
            get:
              (_, action) =>
              (...args: unknown[]) => {
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
          f.advance();
          for (const choice of path) {
            assert.ok(
              f
                .buttons()
                .every(
                  (button) =>
                    !(['Back', 'Close', 'Cancel'] satisfies [string, string, string]).includes(
                      button.textContent,
                    ),
                ),
              id + ' has a duplicate or obsolete navigation option',
            );
            try {
              f.click(choice.label);
            } catch (error) {
              assert.ok(error instanceof Error);
              error.message = id + ': ' + error.message;
              throw error;
            }
            if (choice.next && !choice.next.skipIntro) f.advance();
          }
          await settle();
          const leaf = path.at(-1),
            hasAction = !!(requiredFixture(leaf).accept || requiredFixture(leaf).trade);
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
              .filter((button) =>
                (['Leave', 'Close', 'Cancel'] satisfies [string, string, string]).includes(
                  button.textContent,
                ),
              ).length <= 1,
            true,
            id + ' duplicates exits',
          );
          f.advance();
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
  let resolve!: (receipt: import('../types/world.ts').ActionReceipt) => void;
  const f = dialogueFixture(),
    game = {
      state: { raptor: 'not-started' as const },
      finishQuest: () => ({ ok: false }),
      startQuest: () => ({
        ok: true,
        pending: true,
        promise: new Promise<import('../types/world.ts').ActionReceipt>((r) => (resolve = r)),
      }),
    };
  try {
    f.dialogue.open(scientistDialogue({ name: 'Scientist' }, game));
    f.advance();
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
  let resolve!: (receipt: import('../types/world.ts').ActionReceipt) => void;
  const economy = {
      ...createEconomy(),
      state: { ...createEconomy().state, saltLetters: 0 },
      trade: () => ({
        ok: true,
        pending: true,
        promise: new Promise<import('../types/world.ts').ActionReceipt>((r) => (resolve = r)),
      }),
    },
    mail = createSaltMail(economy);
  for (const [action, success] of [
    [mail.collect, /sealed salt-conservation letter/],
    [mail.deliver, /pays you 50 coins/],
  ] satisfies [() => import('../types/world.ts').ActionReceipt, RegExp][]) {
    const request = action();
    resolve({ ok: false, message: 'Too far from the clerk.' });
    assert.equal(requiredFixture(await request.promise).message, 'Too far from the clerk.');
    const accepted = action();
    resolve({ ok: true });
    assert.match(requiredFixture(requiredFixture(await accepted.promise).message), success);
  }
  let refuels = 0;
  const car = {
    state: { owned: true, fuel: 0, distance: 0 },
    position: { x: 0, z: 0 },
    sample: () => ({ x: 0, z: 0 }),
    refuel: () => refuels++,
  };
  const pump = createFuelDialogue({ paid: true, label: 'Fuel', distance: 0 }, car, economy);
  assert.ok(pump?.choices != null, 'Missing test fixture: pump.choices');
  const can = requiredFixture(
    requiredFixture(pump.choices.find((choice) => choice.label.startsWith('Fuel can'))).accept,
  )();
  resolve({ ok: false, message: 'Purchase refused.' });
  assert.equal(
    requiredFixture(await requiredFixture(await can).promise).message,
    'Purchase refused.',
  );
  const pour = refuelFerrariFromCan(car, economy);
  assert.equal(refuels, 0);
  resolve({ ok: false, message: 'Walk to your Ferrari.' });
  assert.equal(requiredFixture(await pour.promise).ok, false);
  assert.equal(refuels, 0);
  const accepted = refuelFerrariFromCan(car, economy);
  resolve({ ok: true });
  assert.match(requiredFixture(requiredFixture(await accepted.promise).message), /full tank/i);
  assert.equal(refuels, 0, 'online use must not issue a duplicate refuel command');
});

test('a refused PvP toggle reports its server error and restores the checkbox without an undefined callback', async () => {
  const previous = globalThis.document,
    nodes = new Map<string, SettingsNode>(),
    notices: unknown[][] = [];
  interface SettingsNode {
    value: string;
    textContent: string;
    checked: boolean;
    disabled: boolean;
    dataset: Record<string, string>;
    handlers: Record<string, (event: { target: SettingsNode }) => void | Promise<void>>;
    setAttribute: () => void;
    addEventListener: (
      type: string,
      fn: (event: { target: SettingsNode }) => void | Promise<void>,
    ) => void;
    querySelector: (key: string) => SettingsNode;
  }
  const node = (key: string): SettingsNode => {
    if (!nodes.has(key))
      nodes.set(key, {
        value: '',
        checked: false,
        disabled: false,
        textContent: '',
        dataset: {},
        handlers: {},
        setAttribute() {},
        addEventListener(
          type: string,
          fn: (event: { target: SettingsNode }) => void | Promise<void>,
        ) {
          this.handlers[type] = fn;
        },
        querySelector: node,
      });
    return requiredFixture(nodes.get(key));
  };
  globalThis.document = { getElementById: node } as unknown as Document;
  const client = {
    state: {
      autoName: false,
      renameAt: 0,
      serverOffset: 0,
      returningCharacter: true,
      grapplingHook: false,
      connected: true,
      name: 'Audit',
      pvp: { enabled: false, disableAt: 0 },
    },
    subscribe() {
      return () => {};
    },
    command: async () => ({ ok: false, message: 'You must wait before changing PvP.' }),
  };
  try {
    setupMultiplayerSettings(client, {
      announce: (...args: [string, string?]) => notices.push(args),
    });
    const checkbox = node('sf-pvp-enabled');
    checkbox.checked = true;
    await checkbox.handlers.change({ target: checkbox });
    assert.equal(checkbox.checked, false);
    assert.equal(checkbox.disabled, false);
    assert.deepEqual(notices, [
      ['You must wait before changing PvP.', 'PvP'] satisfies [string, string],
    ]);
  } finally {
    globalThis.document = previous;
  }
});
