import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT, installContent } from '../content-runtime.ts';
import { contentFixture } from './helpers/content-fixture.mts';
import { validateContent, validatePlayerDocument } from '../content-validation.ts';
import { conditionMatches, selectContentVariant } from '../content-conditions.ts';
import { compileEntityDialogue, applyContentEntity, menuFromContent } from '../content-game.ts';
import {
  createPlayerDocument,
  playerDocumentFromContext,
  hydratePlayerProfile,
  serializePlayerProfile,
} from '../player-document.ts';
import bindings from '../content/player-state-bindings.json' with { type: 'json' };

test('all migrated content and default player state validate', () => {
  validateContent(CONTENT);
  validatePlayerDocument(createPlayerDocument());
  assert.equal(Object.keys(CONTENT.entities.placements).length, 316);
  assert.equal(Object.keys(CONTENT.dialogues.shared).length, 102);
});
test('safe JSON conditions read quest progress and collections', () => {
  const state = createPlayerDocument();
  state.quests.monkey.stage = 'completed';
  state.inventory.economy.ownedEquipment = ['ball-chair'];
  assert.equal(
    conditionMatches(
      {
        all: [
          { path: 'quests.monkey.stage', eq: 'completed' },
          { path: 'inventory.economy.ownedEquipment', contains: 'ball-chair' },
          { not: { path: 'quests.theyLive.completed', eq: true } },
        ],
      },
      state,
    ),
    true,
  );
  assert.equal(
    conditionMatches({ path: 'quests.theyLive.defeated', count: { gte: 1 } }, state),
    false,
  );
  assert.equal(conditionMatches({ path: '__proto__.constructor', exists: true }, state), false);
});
test('JSON controls dialogue text and visibility while stable IDs preserve action callbacks', () => {
  const original = { ...CONTENT };
  try {
    const content = contentFixture();
    installContent(validateContent(content));
    let calls = 0;
    const buy = () => {
      calls++;
    };
    const person: import('../types/world.ts').RuntimeDialogue = {
      contentNodeId: 'greeting',
      introTextValues: { v0: 'traveler' },
      choices: [
        { contentNodeId: 'purchase', actionId: 'buy', label: 'Buy', accept: buy },
        { contentNodeId: 'chat', label: 'Ask', next: { contentNodeId: 'reply' } },
      ],
    };
    const state = createPlayerDocument(),
      ctx = { multiplayer: { state: { playerState: state } } };
    assert.equal(
      requiredFixture(compileEntityDialogue(person, 'actor:goblin', ctx).choices).some(
        (c) => c.id === 'purchase',
      ),
      false,
    );
    state.quests.monkey.stage = 'completed';
    content.dialogues.variants.conversation.nodes.greeting.choices.reverse();
    content.texts.texts.hello.template = 'Hi {v0}!';
    const dialogue = compileEntityDialogue(person, 'actor:goblin', ctx);
    assert.equal(dialogue.intro, 'Hi traveler!');
    assert.equal(calls, 0);
    assert.ok(dialogue?.choices != null, 'Missing test fixture: dialogue.choices');
    requiredFixture(requiredFixture(dialogue.choices.find((c) => c.id === 'purchase')).accept)();
    assert.equal(calls, 1);
    content.entities.definitions.goblin.name = 'Chair maker';
    const npc = applyContentEntity({ id: 'goblin', label: 'Goblin' }, 'actor:goblin');
    assert.equal(npc.label, 'Chair maker');
    assert.equal(
      requiredFixture(menuFromContent(npc, new Map([['talk', buy]]), ctx))[0].label,
      'Talk to Chair maker',
    );
  } finally {
    installContent(original);
  }
});
test('legacy player data migrates every module and profile flag into one serializable document', () => {
  const profile = {
    name: 'Veteran',
    privateState: {
      'sf-quests-v1': JSON.stringify({
        monkey: 'carrying',
        theyLive: { started: true, evidence: true },
      }),
      'sf-expeditions-v1': JSON.stringify({
        raptor: 'completed',
        railgun: true,
        krakenReward: true,
      }),
      'sf-purse-v1': JSON.stringify({ coins: 123, saltLettersDelivered: 2 }),
      'old-plugin-v1': '{"flag":true}',
    },
    illuminati: true,
    guild: { member: true, visits: 24 },
    bomber: true,
    houseSearches: ['house-a'],
    awards: [],
  };
  hydratePlayerProfile(profile);
  const saved = serializePlayerProfile(profile);
  validatePlayerDocument(saved.playerState);
  assert.equal(saved.playerState.quests.monkey.stage, 'carrying');
  assert.equal(saved.playerState.quests.expeditions.raptor, 'completed');
  assert.equal(saved.playerState.quests.theyLive.evidence, true);
  assert.equal(saved.playerState.quests.illuminatus.initiated, true);
  assert.equal(saved.playerState.inventory.economy.coins, 123);
  assert.deepEqual(saved.playerState.migration.unknownPrivateState['old-plugin-v1'], {
    flag: true,
  });
  for (const key of Object.keys(bindings.profile))
    assert.equal(Object.hasOwn(saved, key), false, key);
  assert.equal(Object.hasOwn(saved, 'privateState'), false);
  profile.privateState['sf-quests-v1'] = JSON.stringify({
    monkey: 'completed',
    theyLive: { completed: true },
  });
  assert.equal(hydratePlayerProfile(profile).playerState.quests.monkey.stage, 'completed');
  const restored = hydratePlayerProfile(
    JSON.parse(JSON.stringify(serializePlayerProfile(profile))),
  );
  assert.equal(JSON.parse(restored.privateState['sf-quests-v1']).monkey, 'completed');
  assert.equal(restored.illuminati, true);
});
test('broken links, unknown callbacks and duplicate IDs fail validation', () => {
  for (const mutate of [
    (b: ReturnType<typeof contentFixture>) =>
      (b.dialogues.variants.conversation.nodes.greeting.choices[0].next = 'missing'),
    (b: ReturnType<typeof contentFixture>) =>
      (b.entities.definitions.goblin.menus[0].actions[0].action = 'unknown'),
    (b: ReturnType<typeof contentFixture>) =>
      b.dialogues.variants.conversation.nodes.reply.choices.push({
        id: 'cycle',
        label: 'Again',
        next: 'greeting',
      }),
  ]) {
    const b = contentFixture();
    mutate(b);
    assert.throws(() => validateContent(b));
  }
});

test('an explicit true fallback does not mask matching quest variants', () => {
  const fallback = { id: 'fallback', when: true },
    quest = { id: 'quest', when: { path: 'quests.monkey.stage', eq: 'carrying' } };
  const state = createPlayerDocument();
  state.quests.monkey.stage = 'carrying';
  assert.equal(selectContentVariant([fallback, quest], state), quest);
});

test('JSON-only player snapshots retain quest-related ownership when no legacy controller is supplied', () => {
  const state = createPlayerDocument();
  state.skills.strength.funded = true;
  state.vehicles.motorcycle.rented = true;
  state.vehicles.ferrari.owned = true;
  state.employment.aiLab.hired = true;
  const projected = playerDocumentFromContext({ multiplayer: { state: { playerState: state } } });
  assert.equal(projected.skills.strength.funded, true);
  assert.equal(projected.vehicles.motorcycle.rented, true);
  assert.equal(projected.vehicles.ferrari.owned, true);
  assert.equal(projected.employment.aiLab.hired, true);
});

test('menu and conversation variant conditions cannot fall back to hidden source actions', () => {
  const previous = { ...CONTENT };
  try {
    const content = contentFixture();
    content.entities.definitions.goblin.menus[0].when = false;
    content.dialogues.variants.conversation.when = false;
    installContent(content);
    const context = { multiplayer: { state: { playerState: createPlayerDocument() } } };
    assert.deepEqual(menuFromContent('actor:goblin', new Map([['talk', () => {}]]), context), []);
    const conversation = compileEntityDialogue(
      {
        intro: 'Hidden source greeting',
        choice: 'Hidden action',
        accept: () => assert.fail('hidden action'),
      },
      'actor:goblin',
      context,
    );
    assert.deepEqual(conversation.choices, []);
    assert.equal(conversation.choice, null);
    assert.equal(conversation.accept, null);
  } finally {
    installContent(previous);
  }
});
