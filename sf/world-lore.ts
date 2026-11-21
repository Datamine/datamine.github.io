interface LoreBook {
  title: string;
  color: string;
  format?: string;
  subtitle: string;
  paragraphs: readonly string[];
}
const loreBooks: Readonly<Record<string, LoreBook | undefined>> = LORE_BOOKS;
import type { Place } from './types/world.ts';
import { requiredValue } from './types/assert.ts';
import { LORE_BOOKS } from './config/world-lore.ts';
import type { Mesh } from './geometry.ts';
import type { Point } from './types/geometry.ts';

/** A small, open 3D book, authored in the same material atlas as its room. */
export function drawLoreBook(m: Mesh, x: number, y: number, z: number, id: string) {
  const book = loreBooks[id];
  if (!book) throw Error('Unknown lore book: ' + id);
  const start = m.data.length,
    w = 0.34,
    d = 0.24;
  if (book.format === 'torn-invoice') {
    const edge = [
      [x - w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z + 0.06] satisfies [number, number],
      [x + 0.13, z + 0.1] satisfies [number, number],
      [x + 0.09, z + 0.065] satisfies [number, number],
      [x + 0.05, z + 0.11] satisfies [number, number],
      [x + 0.01, z + 0.075] satisfies [number, number],
      [x - 0.04, z + 0.115] satisfies [number, number],
      [x - 0.09, z + 0.07] satisfies [number, number],
      [x - 0.13, z + 0.105] satisfies [number, number],
      [x - w / 2, z + 0.065] satisfies [number, number],
    ];
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i],
        b = edge[(i + 1) % edge.length];
      m.tri(
        [x, y + 0.014, z] satisfies [number, number, number],
        [b[0], y + 0.014, b[1]] satisfies [number, number, number],
        [a[0], y + 0.014, a[1]] satisfies [number, number, number],
        '#eee5c8',
      );
    }
    // Only a surviving letterhead; the missing body contains no ink.
    for (let i = 0; i < 7; i++)
      m.box(x - 0.12 + i * 0.032, y + 0.015, z - 0.085, 0.022, 0.002, 0.027, '#3b4d45');
    return { id, start, count: m.data.length - start };
  }
  m.box(
    x - w / 2 - 0.012,
    y,
    z - d / 2 - 0.012,
    w + 0.024,
    0.017,
    d + 0.024,
    book.color,
    'canvasWeave',
  );
  for (const side of [-1, 1] satisfies [number, number]) {
    const a = x + side * 0.012,
      b = x + (side * w) / 2;
    m.quad(
      [a, y + 0.048, z - d / 2] satisfies [number, number, number],
      [b, y + 0.024, z - d / 2] satisfies [number, number, number],
      [b, y + 0.024, z + d / 2] satisfies [number, number, number],
      [a, y + 0.048, z + d / 2] satisfies [number, number, number],
      '#ede2bc',
    );
    for (let i = 0; i < 5; i++) {
      const zz = z - 0.075 + i * 0.032;
      m.rod(
        [a + side * 0.023, y + 0.045, zz] satisfies [number, number, number],
        [b - side * (i === 4 ? 0.035 : 0.02), y + 0.03, zz] satisfies [number, number, number],
        0.0028,
        '#8b8573',
        4,
      );
    }
  }
  m.rod(
    [x, y + 0.05, z - d / 2] satisfies [number, number, number],
    [x, y + 0.05, z + d / 2] satisfies [number, number, number],
    0.004,
    book.color,
    5,
  );
  m.box(x + 0.07, y + 0.032, z + 0.09, 0.023, 0.004, 0.1, '#b76c4b');
  return { id, start, count: m.data.length - start };
}

/** Bounds come from transformed room geometry, so rotated houses stay correct. */
export function createLoreBookTarget(place: Place, entry: Point) {
  const range = requiredValue(place.loreBook, 'Readable book range'),
    mesh = place.object?.mesh,
    book = loreBooks[range.id];
  if (!book || !mesh) throw Error('Missing readable book in ' + place.id);
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = range.start; i < range.start + range.count; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], mesh.data[i + k]);
      hi[k] = Math.max(hi[k], mesh.data[i + k]);
    }
  const site: import('./types/world.ts').Site = {
    id: 'lore-' + place.id,
    bookId: range.id,
    houseId: place.id,
    kind: 'lore-book',
    label: book.title,
    entry: { ...entry },
    x: (lo[0] + hi[0]) / 2,
    z: (lo[2] + hi[2]) / 2,
    base: requiredValue(place.object, 'Readable book object').base,
    hiddenFromDirectory: true,
    description: book.subtitle,
  };
  const target = {
    sight: site,
    interior: place,
    detailTarget: true,
    mesh,
    start: range.start / 11,
    count: range.count / 11,
    lo,
    hi,
    x: lo[0],
    y: lo[2],
    w: hi[0] - lo[0],
    d: hi[2] - lo[2],
  };
  return Object.assign(site, { object: target });
}

/** Use text nodes: world fiction is data, never executable reader markup. */
export function renderLoreBook(content: HTMLDivElement, id: string, doc = document) {
  const book = loreBooks[id];
  if (!book) throw Error('Unknown lore book: ' + id);
  content.replaceChildren();
  content.dataset.format = book.format || 'book';
  for (const text of book.paragraphs) {
    const paragraph = doc.createElement('p');
    paragraph.textContent = text;
    content.append(paragraph);
  }
  return book;
}
