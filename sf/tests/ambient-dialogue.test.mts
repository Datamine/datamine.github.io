import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT } from '../content-runtime.ts';
import {
  AMBIENT_CHAINS,
  GOOSE_CHAINS,
  CONVERSATION_POOL,
  createConversationPicker,
  createAmbientDialogue,
  withAmbientConversation,
} from '../dialogues/ambient.ts';
import { CASUAL_DIALOGUE_IDS } from '../dialogues/catalog.ts';
import { configuredDialogue } from '../dialogue-config.ts';
import { createInteractions } from '../world/interactions.ts';
import { dialogueFixture } from './helpers/dialogue-fixture.mts';
import type { RuntimeDialogue } from '../types/world.ts';

test('canonical conversations retain valid reachable branches and terminating endings without original tweet files', () => {
  assert.equal(AMBIENT_CHAINS.length, 100);
  assert.equal(new Set(CONVERSATION_POOL.map((c) => c.id)).size, CONVERSATION_POOL.length);
  for (const chain of CONVERSATION_POOL)
    assert.deepEqual(chain, CONTENT.dialogues.shared[chain.id]);
  for (const chain of CONVERSATION_POOL) {
    const seen = new Set();
    function visit(id: string, path = new Set<string>()) {
      assert.ok(!path.has(id), chain.id + ' has a cycle');
      const node = chain.nodes[id];
      assert.ok(node?.text?.trim(), chain.id + ': ' + id);
      if (seen.has(id)) return;
      seen.add(id);
      if (node.end) assert.equal(node.choices, undefined);
      else {
        assert.ok(node.choices);
        assert.ok(node.choices.length >= 2);
        assert.equal(new Set(node.choices.map((c) => c.text)).size, node.choices.length);
        for (const choice of node.choices) visit(choice.next, new Set([...path, id]));
      }
    }
    visit(chain.start);
    assert.equal(seen.size, Object.keys(chain.nodes).length, chain.id + ' has unreachable nodes');
  }
  assert.ok(
    GOOSE_CHAINS.every((c) => JSON.stringify(c).includes('Powerful and Evil Goose Corporation')),
  );
});

test('the picker draws the complete pool before repeating and does not mutate its source', () => {
  const before = JSON.stringify(CONVERSATION_POOL);
  const pick = createConversationPicker({ random: () => 0.37 });
  for (let cycle = 0; cycle < 2; cycle++) {
    const ids = new Set(Array.from({ length: CONVERSATION_POOL.length }, () => pick().id));
    assert.equal(ids.size, CONVERSATION_POOL.length);
  }
  assert.equal(JSON.stringify(CONVERSATION_POOL), before);
  assert.throws(() => createConversationPicker({ pool: [] }), /empty/);
});

const paths = (node?: RuntimeDialogue | undefined): import('../types/world.ts').RuntimeChoice[][] =>
  requiredFixture(requiredFixture(node).choices).flatMap((choice) =>
    choice.next ? paths(choice.next).map((rest) => [choice, ...rest]) : [[choice]],
  );

test('every ambient and Goose ending renders with the actual NPC and player, then closes without effects', () => {
  let endings = 0,
    effects = 0;
  const original = JSON.stringify(CONVERSATION_POOL);
  for (const chain of CONVERSATION_POOL) {
    const person = createAmbientDialogue(
      {
        id: 'someone',
        name: 'Actual NPC',
        female: true,
        skin: '#997755',
        repeat: true,
        choice: 'Buy',
        trade: 'equity',
        accept: () => {
          effects++;
        },
        after: () => effects++,
      },
      { chain },
    );
    assert.equal(person.id, 'someone');
    assert.equal(person.skin, '#997755');
    assert.equal(person.repeat, false);
    assert.equal(person.trade, undefined);
    assert.equal(person.accept, undefined);
    assert.equal(person.after, undefined);
    for (const path of paths(person)) {
      const f = dialogueFixture(
        { name: 'Actual Player' },
        {
          trade: () => {
            effects++;
            return { ok: true };
          },
        },
      );
      try {
        f.dialogue.open(person);
        assert.equal(f.element.children[0].children[0].textContent, 'Actual NPC');
        f.advance();
        assert.equal(f.element.children[0].children[0].textContent, 'Actual Player');
        for (const choice of path) {
          f.click(choice.label);
          assert.equal(f.element.dataset.speaker, 'npc');
          assert.equal(f.element.children[0].children[0].textContent, 'Actual NPC');
          if (choice.next) f.advance();
          else assert.ok(f.element.textContent.includes(requiredFixture(choice.receipt)));
        }
        f.advance();
        assert.equal(f.dialogue.active, false, chain.id);
        endings++;
      } finally {
        f.restore();
      }
    }
  }
  assert.equal(effects, 0);
  assert.equal(endings, 406);
  assert.equal(JSON.stringify(CONVERSATION_POOL), original);
});

test('service menus keep their actions but casual chat never executes or inherits them', () => {
  let purchases = 0;
  const person = withAmbientConversation({
    name: 'Seller',
    intro: 'Shop',
    repeat: true,
    choice: 'Buy',
    accept: () => {
      purchases++;
      return { ok: true };
    },
    receipt: 'Bought',
  });
  assert.equal(withAmbientConversation(person), person, 'chat is not appended twice');
  const f = dialogueFixture();
  try {
    f.dialogue.open(person);
    f.advance();
    f.click('Let’s just talk.');
    f.advance();
    assert.ok(person?.choices != null, 'Missing test fixture: person.choices');
    const chat = requiredFixture(person.choices.find((c) => c.ambientConversation)).next;
    for (const choice of paths(chat)[0]) {
      f.click(choice.label);
      if (choice.next) f.advance();
    }
    f.advance();
    assert.equal(purchases, 0);
    assert.equal(f.dialogue.active, false);
    f.dialogue.open(person);
    f.advance();
    f.click('Buy');
    assert.equal(purchases, 1);
  } finally {
    f.restore();
  }
});

test('casual named roles all use the shared pool while Goose Corp conversations remain accessible', () => {
  for (const id of CASUAL_DIALOGUE_IDS) {
    const d = configuredDialogue(id, { name: 'Actual person' });
    assert.ok(
      CONVERSATION_POOL.some((c) => c.id === d.conversationId),
      id,
    );
    assert.equal(d.name, 'Actual person');
  }
  assert.ok(
    requiredFixture(configuredDialogue('square-books').choices).some(
      (c) => c.label === 'Who is Goose Corp?',
    ),
  );
  assert.ok(
    requiredFixture(configuredDialogue('guild-rumours').choices).some(
      (c) => c.label === 'Who sponsors the refreshments?',
    ),
  );
});

test('Talk to an ordinary pedestrian opens real choices, holds the speaker, and releases them on exit', () => {
  let interactions!: ReturnType<typeof createInteractions>;
  const f = dialogueFixture({}, { onClose: () => interactions.releaseNPC() });
  const context = {
    approachingNPC: null as import('../types/world.ts').Actor | null,
    player: { x: 0, y: 0, path: [1], speed: 1 },
    keys: new Set(['w']),
    quests: { theyLive: { isDefeated: () => false } },
    flying: () => false,
    chase: { state: {} },
    surf: { state: {} },
    rocket: { state: {} },
    rope: {},
    tahoe: { state: { mode: 'ground' } },
    sutroClimb: { state: {} },
    dialogue: f.dialogue,
    nearestNavigation: () => ({ x: 0, y: 0 }),
    $: () => ({ hidden: true }),
    canvas: { focus() {} },
  };
  try {
    interactions = createInteractions(
      context as unknown as import('../world/scene.ts').WorldContext,
    );
    const npc = {
      waiting: false,
      id: 'pedestrian-1',
      label: 'Woman',
      female: true,
      x: 0.5,
      z: 0.5,
      speech: 'Old overhead conversation',
      speechUntil: Infinity,
    };
    interactions.interactCitizen(npc, 'talk');
    assert.equal(f.dialogue.active, true);
    assert.equal(context.approachingNPC, npc);
    assert.equal(npc.waiting, true);
    assert.equal(npc.speech, '');
    assert.equal(npc.speechUntil, 0);
    assert.deepEqual(context.player.path, []);
    assert.equal(context.player.speed, 0);
    f.advance();
    assert.ok(f.buttons().length >= 3);
    f.click('Leave');
    assert.equal(npc.waiting, false);
    assert.equal(context.approachingNPC, null);
  } finally {
    f.restore();
  }
});
