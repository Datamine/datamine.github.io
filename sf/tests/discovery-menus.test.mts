import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuestMenu } from '../quest-menu.ts';
import { createCollectionMenu } from '../collection-menu.ts';
import { dialogueFixture } from './helpers/dialogue-fixture.mts';
import { createExpeditions } from '../jurassic.ts';

test('quest journal hides undiscovered adventures, future steps and unearned rewards, including its accessible label', () => {
  const fixture = dialogueFixture();
  try {
    const make = () => fixture.doc.createElement('div');
    const content = make(),
      button = make();
    let entries: import('../quest-menu.ts').QuestJournalEntry[] = [
      {
        id: 'hidden',
        title: 'Hidden adventure',
        stage: 'not-started',
        status: 'Not started',
        description: 'Secret starting place',
      },
    ];
    const menu = createQuestMenu({
      element: make(),
      content,
      button,
      closeButton: make(),
      shade: make(),
      canvas: make(),
      quests: { entries: () => entries },
      beforeOpen() {},
    });
    assert.match(content.textContent, /No adventures recorded/);
    assert.doesNotMatch(
      content.textContent + button.getAttribute('aria-label'),
      /Hidden adventure|Secret starting place/,
    );
    entries.push({
      id: 'discovered',
      title: 'An adventure',
      stage: 'accepted',
      status: 'In progress',
      description: 'You received a letter.',
      rewardLabel: 'Secret reward',
      targets: [
        { area: 'Letter received', done: true },
        { area: 'Hidden destination', done: false },
      ],
    });
    menu.render();
    assert.match(content.textContent, /Letter received/);
    assert.doesNotMatch(content.textContent, /Secret reward|Hidden destination|Hidden adventure/);
    entries[1].stage = 'completed';
    menu.render();
    assert.match(content.textContent, /Reward: Secret reward/);
  } finally {
    fixture.restore();
  }
});

test('collection log reveals item names only after discovery', () => {
  const fixture = dialogueFixture();
  try {
    const make = () => fixture.doc.createElement('div');
    fixture.doc.createDocumentFragment = make;
    const content = make(),
      summary = make();
    let found: string[] = [];
    const menu = createCollectionMenu({
      element: make(),
      content,
      summary,
      button: make(),
      closeButton: make(),
      shade: make(),
      canvas: make(),
      getFound: () => found,
      beforeOpen() {},
    });
    menu.render();
    assert.match(content.textContent, /Undiscovered/);
    assert.doesNotMatch(content.textContent, /Railgun|Alien Evidence Certificate|Sandwich/);
    found = ['sandwich'];
    menu.render();
    assert.match(content.textContent, /✓ Sandwich/);
    assert.doesNotMatch(content.textContent, /Railgun|Alien Evidence Certificate/);
    assert.match(summary.textContent, /^1 \/ /);
  } finally {
    fixture.restore();
  }
});

test('the kraken adventure is discovered by boarding and remains recorded after leaving or reconnecting', () => {
  let saved;
  const game = createExpeditions({
    saved: { railgun: true },
    onSave: (state) => {
      saved = state;
    },
  });
  assert.ok(!game.entries().some((q) => q.id === 'pequod-kraken'));
  assert.equal(game.board().ok, true);
  game.abandonShip();
  assert.ok(game.entries().some((q) => q.id === 'pequod-kraken'));
  const restored = createExpeditions({ saved });
  assert.ok(restored.entries().some((q) => q.id === 'pequod-kraken'));
});
