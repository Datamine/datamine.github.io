import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, pose } from '../geometry.ts';
import { drawLoreBook, createLoreBookTarget, renderLoreBook } from '../world-lore.ts';
import { LORE_BOOKS } from '../config/world-lore.ts';
import { encodeWorldGraph, decodeWorldGraph } from '../world-codec.ts';
import { guildDialogue } from '../guild.ts';
import { configuredDialogue } from '../dialogue-config.ts';
import { sightPrimaryVerb } from '../descriptions.ts';
import { dialogueFixture } from './helpers/dialogue-fixture.mts';
import { drawExpeditionLoot } from '../jurassic-models.ts';

test('book hit bounds follow rotated furniture and preserve their identity through the streaming codec', () => {
  for (const angle of [0, Math.PI / 2, Math.PI * 0.37] satisfies [number, number, number]) {
    const mesh = new Mesh(),
      room: import('../types/world.ts').Place = {
        id: 'test-house',
        name: 'House',
        label: 'House',
        x: 10,
        y: 18,
        w: 4,
        d: 4,
        h: 3,
        color: '#bbbbbb',
        entry: { x: 11.5, y: 20.3 },
        inside: { x: 12, y: 20 },
        localDoor: 11.5,
        object: { mesh, base: 2, x: 10, y: 18, w: 4, d: 4 },
      };
    pose(mesh, 12, 2, 20, angle, () => {
      room.loreBook = drawLoreBook(mesh, 0, 0.53, 0, 'pond-deeds');
    });
    const site = createLoreBookTarget(room, { x: 11.5, y: 20.3 });
    assert.equal(sightPrimaryVerb(site), 'Read');
    assert.ok(mesh.data.every(Number.isFinite));
    assert.ok(
      Math.abs(requiredFixture(site.x) - 12) < 0.08 &&
        Math.abs(requiredFixture(site.z) - 20) < 0.08,
    );
    assert.ok(site.object.lo[1] >= 2.53);
    assert.ok(site.object.count / 3 < 150, 'readable props stay small');
    const { graph } = encodeWorldGraph({ rooms: [room], sights: [site], objects: [site.object] }),
      restored = decodeWorldGraph(graph) as {
        rooms: (typeof room)[];
        sights: (typeof site)[];
        objects: (typeof site.object)[];
      },
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
      assert.equal(renderLoreBook(content, id, f.doc as unknown as Document), book);
      assert.deepEqual(
        content.children.map((p) => p.tagName),
        book.paragraphs.map(() => 'p'),
      );
      assert.deepEqual(
        content.children.map((p) => p.textContent),
        book.paragraphs,
      );
      renderLoreBook(content, id, f.doc as unknown as Document);
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
    renderLoreBook(content, 'goose-invoice', f.doc as unknown as Document);
    assert.equal(content.dataset.format, 'torn-invoice');
    assert.equal(content.textContent, 'Goose Corp');
    renderLoreBook(content, 'pond-deeds', f.doc as unknown as Document);
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
    f.advance();
    f.click('Who sponsors the refreshments?');
    assert.match(f.element.textContent, /Powerful and Evil Goose Corporation/);
    f.advance();
    assert.equal(promotions, 0);
    f.dialogue.open(configuredDialogue('square-books', { name: 'Leo, bookseller' }));
    f.advance();
    f.click('Who is Goose Corp?');
    assert.match(f.element.textContent, /professional distinction/);
    f.advance();
    assert.equal(promotions, 0);
  } finally {
    f.restore();
  }
});
