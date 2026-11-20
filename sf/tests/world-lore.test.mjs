import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, pose } from '../geometry.js';
import { drawLoreBook, createLoreBookTarget, renderLoreBook } from '../world-lore.js';
import { LORE_BOOKS } from '../config/world-lore.js';
import { encodeWorldGraph, decodeWorldGraph } from '../world-codec.js';
import { guildDialogue } from '../guild.js';
import { configuredDialogue } from '../dialogue-config.js';
import { sightPrimaryVerb } from '../descriptions.js';
import { dialogueFixture } from './helpers/dialogue-fixture.mjs';
import { drawExpeditionLoot } from '../jurassic-models.js';

test('book hit bounds follow rotated furniture and preserve their identity through the streaming codec', () => {
  for (const angle of [0, Math.PI / 2, Math.PI * 0.37]) {
    const mesh = new Mesh(),
      room = { id: 'test-house', object: { mesh, base: 2 } };
    pose(mesh, 12, 2, 20, angle, () => {
      room.loreBook = drawLoreBook(mesh, 0, 0.53, 0, 'pond-deeds');
    });
    const site = createLoreBookTarget(room, { x: 11.5, y: 20.3 });
    assert.equal(sightPrimaryVerb(site), 'Read');
    assert.ok(mesh.data.every(Number.isFinite));
    assert.ok(Math.abs(site.x - 12) < 0.08 && Math.abs(site.z - 20) < 0.08);
    assert.ok(site.object.lo[1] >= 2.53);
    assert.ok(site.object.count / 3 < 150, 'readable props stay small');
    const { graph } = encodeWorldGraph({ rooms: [room], sights: [site], objects: [site.object] }),
      restored = decodeWorldGraph(graph),
      s = restored.sights[0];
    assert.equal(s.object, restored.objects[0]);
    assert.equal(s.object.interior, restored.rooms[0]);
    assert.equal(s.object.sight, s);
    assert.deepEqual(s.entry, site.entry);
    assert.equal(s.bookId, 'pond-deeds');
  }
});

test('readable pages render as text without changing rewards or player state', () => {
  const f = dialogueFixture();
  try {
    for (const [id, book] of Object.entries(LORE_BOOKS)) {
      const content = f.doc.createElement('div');
      assert.equal(renderLoreBook(content, id, f.doc), book);
      assert.deepEqual(
        content.children.map((p) => p.tagName),
        book.paragraphs.map(() => 'p'),
      );
      assert.deepEqual(
        content.children.map((p) => p.textContent),
        book.paragraphs,
      );
      renderLoreBook(content, id, f.doc);
      assert.equal(
        content.children.length,
        book.paragraphs.length,
        'reopening does not duplicate pages',
      );
    }
  } finally {
    f.restore();
  }
});

test('the torn invoice contains only its surviving Goose Corp letterhead', () => {
  const f = dialogueFixture();
  try {
    const content = f.doc.createElement('div');
    renderLoreBook(content, 'goose-invoice', f.doc);
    assert.equal(content.dataset.format, 'torn-invoice');
    assert.equal(content.textContent, 'Goose Corp');
    renderLoreBook(content, 'pond-deeds', f.doc);
    assert.equal(
      content.dataset.format,
      'book',
      'another book must not inherit the torn-paper treatment',
    );
    const invoice = new Mesh(),
      card = new Mesh();
    drawLoreBook(invoice, 0, 0, 0, 'goose-invoice');
    drawExpeditionLoot(card, { lootKind: 'goose-membership-card', x: 0, z: 0 }, 0, 0);
    for (const m of [invoice, card]) {
      assert.ok(m.data.length > 0 && m.data.every(Number.isFinite));
      assert.ok(m.data.length / 33 < 500, 'paper props remain lightweight');
    }
    const edge = new Set();
    for (let i = 0; i < invoice.data.length; i += 11)
      if (invoice.data[i + 2] > 0.05) edge.add(invoice.data[i + 2].toFixed(3));
    assert.ok(edge.size >= 4, 'the model has a physically torn bottom edge');
  } finally {
    f.restore();
  }
});

test('Ray and the bookseller discuss Goose Corp without triggering a promotion or a trade', () => {
  const f = dialogueFixture();
  let promotions = 0;
  try {
    f.dialogue.open(
      guildDialogue(
        { name: 'Ray' },
        {
          status: () => ({ rank: 1, visits: 0, peptides: 0 }),
          act: () => {
            promotions++;
            return { ok: true };
          },
        },
      ),
    );
    f.click('OK');
    f.click('Who sponsors the refreshments?');
    assert.match(f.element.textContent, /Powerful and Evil Goose Corporation/);
    f.click('OK');
    assert.equal(promotions, 0);
    f.dialogue.open(configuredDialogue('square-books', { name: 'Leo, bookseller' }));
    f.click('OK');
    f.click('Who is Goose Corp?');
    assert.match(f.element.textContent, /professional distinction/);
    f.click('OK');
    assert.equal(promotions, 0);
  } finally {
    f.restore();
  }
});
