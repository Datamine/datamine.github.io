import test from 'node:test';
import assert from 'node:assert/strict';
import { NPC_DIALOGUES } from '../config/dialogue.js';
import { configuredDialogue } from '../dialogue-config.js';
import { rehabilitationDialogue } from '../rehabilitation.js';
import { bankerDialogue } from '../banking.js';
import { taxDialogue } from '../southern-district.js';
import { createEconomy } from '../economy.js';

import { dialogueFixture as fixture } from './helpers/dialogue-fixture.mjs';

test('speaker names appear above the matching portrait and player turns use the actual username', () => {
  const player = { name: 'HarborAda' },
    f = fixture(player);
  try {
    const open = () => {
      f.dialogue.open({
        name: 'Ray',
        intro: 'Welcome to the guild.',
        choices: [{ label: 'Hello.', receipt: 'Good day.' }],
      });
    };
    open();
    let portrait = f.element.children[0];
    assert.equal(portrait.children[0].className, 'sf-chat-name');
    assert.equal(portrait.children[0].textContent, 'Ray');
    assert.equal(portrait.children[1].className, 'sf-chat-portrait');
    f.click('OK');
    assert.equal(f.element.dataset.speaker, 'player');
    assert.equal(f.element.children[0].children[0].textContent, 'HarborAda');
    f.dialogue.close();
    player.name = 'HarborBea';
    open();
    f.click('OK');
    assert.equal(f.element.children[0].children[0].textContent, 'HarborBea');
  } finally {
    f.restore();
  }
});

test('every fixed conversation has data-only, unambiguous branches and resolvable actions/templates', () => {
  const dynamic = new Set(['haberdasher', 'growth-capital']);
  let count = 0;
  const walk = (node, id) => {
    assert.ok(node.intro || node.skipIntro, id + ' needs a spoken opening or explicit topic menu');
    if (!node.choices) {
      assert.ok(dynamic.has(id), id + ' has no choices');
      return;
    }
    assert.ok(node.choices.length, id + ' has an empty menu');
    const labels = new Set();
    for (const choice of node.choices) {
      count++;
      assert.ok(choice.label?.trim());
      assert.ok(!labels.has(choice.label), id + ' duplicates ' + choice.label);
      labels.add(choice.label);
      assert.equal(
        ['action', 'trade', 'next'].filter((key) => choice[key]).length,
        choice.next || choice.action || choice.trade ? 1 : 0,
        id + ' has conflicting actions',
      );
      assert.ok(
        choice.next || choice.action || choice.trade || choice.receipt,
        id + ' has a dead end',
      );
      if (choice.next) walk(choice.next, id);
    }
  };
  const noFunctions = (value) => {
    assert.notEqual(typeof value, 'function');
    if (value && typeof value === 'object') Object.values(value).forEach(noFunctions);
  };
  for (const [id, node] of Object.entries(NPC_DIALOGUES)) {
    noFunctions(node);
    walk(node, id);
    const tokens = [...JSON.stringify(node).matchAll(/\{(\w+)\}/g)].map((m) => m[1]),
      values = Object.fromEntries(tokens.map((key) => [key, 'example']));
    const handlers = new Proxy({}, { get: () => () => ({ ok: true }) });
    assert.ok(configuredDialogue(id, { name: 'Test' }, handlers, values).intro);
  }
  assert.ok(
    count >= 50,
    'Audit the service catalog; ambient branches have their own full UI audit',
  );
  assert.throws(() => configuredDialogue('rehabilitation'), /Missing dialogue action begin/);
});

test('rehabilitation asks about side effects before explicit consent, and only receipt OK starts the procedure', () => {
  const f = fixture();
  let starts = 0;
  const run = () => {
    f.dialogue.open(rehabilitationDialogue({ name: 'Specialist' }, () => starts++));
    f.click('OK');
    assert.equal(f.element.dataset.speaker, 'player');
    assert.equal(starts, 0);
    f.click('Yes. Are there any side effects?');
    assert.match(f.element.textContent, /Not at all/);
    assert.equal(starts, 0);
    f.click('OK');
    f.click('All right. Begin rehabilitation.');
    assert.match(f.element.textContent, /Stand still/);
    assert.equal(starts, 0);
  };
  try {
    run();
    f.dialogue.close();
    assert.equal(starts, 0);
    run();
    f.click('OK');
    assert.equal(starts, 1);
    assert.equal(f.dialogue.active, false);
  } finally {
    f.restore();
  }
});

test('rehabilitation information can return to choices without starting treatment', () => {
  const f = fixture();
  try {
    f.dialogue.open(
      rehabilitationDialogue({ name: 'Specialist' }, () => assert.fail('No consent')),
    );
    f.click('OK');
    f.click('What does rehabilitation involve?');
    assert.match(f.element.textContent, /UCSF/);
    f.click('OK');
    assert.ok(f.buttons().some((b) => b.textContent.includes('side effects')));
    f.click('No thanks. I’ll stay here.');
    assert.equal(f.dialogue.active, false);
  } finally {
    f.restore();
  }
});

test('tax submenus repeat questions without Back, and reopening does not inherit payment actions', () => {
  const f = fixture(),
    economy = createEconomy({ coins: 37 });
  try {
    f.dialogue.open(taxDialogue(economy));
    f.click('OK');
    f.click('I have some questions.');
    f.click('Where is my money going?');
    assert.match(f.element.textContent, /California high-speed rail/);
    assert.equal(economy.state.coins, 37);
    f.click('OK');
    assert.ok(f.buttons().some((b) => b.textContent === 'Where is my money going?'));
    assert.ok(!f.buttons().some((b) => b.textContent === 'Back'));
    f.click('Leave');
    assert.equal(f.dialogue.active, false);
    f.dialogue.open(taxDialogue(economy));
    f.click('OK');
    f.click('Pay taxes · all coins');
    assert.equal(economy.state.coins, 0);
    f.click('OK');
    assert.ok(f.buttons().some((b) => b.textContent === 'I have some questions.'));
    assert.equal(
      f.buttons().filter((b) => ['Leave', 'Close', 'Cancel'].includes(b.textContent)).length,
      1,
    );
  } finally {
    f.restore();
  }
});

test('the banker opens the account immediately after confirmation despite repeatable topics', () => {
  const f = fixture();
  let opened = 0;
  try {
    f.dialogue.open(
      bankerDialogue(
        { name: 'Banker' },
        { open: () => opened++, coffee: () => ({ ok: true, message: 'Coffee' }) },
      ),
    );
    f.click('OK');
    f.click('I’d like to deposit or withdraw coins.');
    assert.equal(opened, 0);
    f.click('OK');
    assert.equal(opened, 1);
    assert.equal(f.dialogue.active, false);
  } finally {
    f.restore();
  }
});

test('a failed purchase never shows the configured success reply and the player can retry', async () => {
  const f = fixture();
  try {
    const person = configuredDialogue(
      'square-coffee',
      { name: 'Barista' },
      { coffee: async () => ({ ok: false, message: 'You need a coin.' }) },
    );
    f.dialogue.open(person);
    f.click('OK');
    f.click('A coffee, please · 1 coin');
    await Promise.resolve();
    await Promise.resolve();
    assert.match(f.element.textContent, /You need a coin/);
    assert.doesNotMatch(f.element.textContent, /Here’s your coffee/);
    f.click('OK');
    assert.ok(f.buttons().some((b) => b.textContent === 'A coffee, please · 1 coin'));
  } finally {
    f.restore();
  }
});

test('closing and reopening the same NPC ignores old pending receipts, with no duplicate purchase or follow-up', async () => {
  const f = fixture(),
    pending = [];
  let calls = 0,
    after = 0;
  const person = {
    name: 'Merchant',
    intro: 'Hello',
    choices: [
      {
        label: 'Purchase',
        accept: () => {
          calls++;
          return new Promise((resolve) => pending.push(resolve));
        },
      },
    ],
  };
  try {
    f.dialogue.open(person);
    f.click('OK');
    const first = f.buttons()[0];
    first.click();
    first.click();
    assert.equal(calls, 1);
    f.dialogue.cancel();
    f.dialogue.open(person);
    f.click('OK');
    f.click('Purchase');
    assert.equal(calls, 2);
    pending[0]({ ok: true, message: 'Old reply', after: () => after++ });
    await Promise.resolve();
    await Promise.resolve();
    assert.doesNotMatch(f.element.textContent, /Old reply/);
    pending[1]({ ok: true, message: 'New reply', after: () => after++ });
    await Promise.resolve();
    await Promise.resolve();
    assert.match(f.element.textContent, /New reply/);
    f.click('OK');
    assert.equal(after, 1);
  } finally {
    f.restore();
  }
});

test('arrow and Enter keys navigate choices without exposing a question heading or a default purchase action', () => {
  const f = fixture();
  try {
    const person = configuredDialogue('dog-walker', { name: 'Walker' });
    f.dialogue.open(person);
    f.click('OK');
    assert.doesNotMatch(f.element.textContent, /Don't Purchase|What would you like to ask/);
    const key = (key) => f.dialogue.handleKey({ key, preventDefault() {} });
    key('ArrowDown');
    assert.equal(f.doc.activeElement.textContent, person.choices[1].label);
    key('Enter');
    assert.ok(
      f.element.textContent.includes(person.choices[1].next?.intro || person.choices[1].receipt),
    );
  } finally {
    f.restore();
  }
});

test('Ahab waits for boarding authorization and displays a refusal instead of unfurling the sails', async () => {
  const { ahabDialogue } = await import('../jurassic.js'),
    f = fixture();
  let resolve;
  const game = {
    state: { railgun: true },
    ship: { aboard: false },
    board: () => new Promise((r) => (resolve = r)),
  };
  try {
    f.dialogue.open(ahabDialogue({ name: 'Ahab' }, game));
    f.click('OK');
    f.click('What happened to Moby Dick?');
    f.click('OK');
    f.click('Board the Pequod');
    assert.match(f.element.textContent, /Waiting for the server/);
    assert.doesNotMatch(f.element.textContent, /unfurls/);
    resolve({ ok: false, message: 'Visit Captain Ahab on the beach.' });
    await Promise.resolve();
    await Promise.resolve();
    assert.match(f.element.textContent, /Visit Captain Ahab/);
    assert.doesNotMatch(f.element.textContent, /unfurls/);
    f.click('OK');
    assert.equal(f.dialogue.active, false);
    f.dialogue.open(
      ahabDialogue({ name: 'Ahab' }, { ...game, state: { railgun: true, krakenReward: true } }),
    );
    f.click('OK');
    assert.ok(!f.buttons().some((b) => /Board the Pequod/.test(b.textContent)));
  } finally {
    f.restore();
  }
});
