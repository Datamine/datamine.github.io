import { configuredDialogue } from './dialogue-config.js';
import { pose } from './geometry.js';
import { drawPlaque } from './southern-district.js';
import { SQUARE_DIGSITE } from './square-construction-layout.js';
import { TIMES_SQUARE } from './southern-layout.js';

export const SQUARE_LIFE_SIGNS = Object.freeze([
  'SQUARE COFFEE',
  'USED BOOKS',
  'HILLSBOROUGH WORKS',
  'NOTICE · PUBLIC PLAZA',
]);
export function createSquareNPCs() {
  const make = (id, name, role, x, z, shirt, approach, extra = {}) => ({
    id,
    name,
    label: name,
    questRole: role,
    x,
    z,
    shirt,
    approach,
    base: TIMES_SQUARE.base + 0.05,
    regional: true,
    skin: '#b78a66',
    hair: '#42382e',
    angle: -Math.PI / 2,
    height: 1.8,
    description:
      extra.description || 'A local making a very large urban experiment feel a little more human.',
    ...extra,
  });
  return [
    make(
      'square-barista',
      'Mira, coffee seller',
      'square-coffee',
      61,
      157.35,
      '#758e7c',
      { x: 60.5, y: 157.65 },
      {
        female: true,
        longHair: true,
        description: 'A barista measuring the progress of the neighborhood in empty cups.',
      },
    ),
    make(
      'square-bookseller',
      'Leo, bookseller',
      'square-books',
      65,
      152.65,
      '#8b6d63',
      { x: 64.5, y: 152.8 },
      { description: 'A bookseller with first editions of books that have not yet been written.' },
    ),
    make(
      'square-busker',
      'June, street musician',
      'square-busker',
      65.5,
      156.1,
      '#7787a1',
      { x: 64.5, y: 155.4 },
      {
        female: true,
        description: 'A street musician playing a song the zoning board has yet to approve.',
      },
    ),
    make(
      'square-foreman',
      'Vic, demolition foreman',
      'square-foreman',
      SQUARE_DIGSITE.foreman.x,
      SQUARE_DIGSITE.foreman.z,
      '#d89b4b',
      { x: SQUARE_DIGSITE.foreman.x + 0.3, y: SQUARE_DIGSITE.foreman.z - 0.5 },
      {
        cap: true,
        description:
          'The excavator operator has traded a quiet suburb for a very interesting afternoon. His clipboard now lives at the digsite beside the square.',
      },
    ),
    make(
      'square-diner',
      'Square Coffee patron',
      'square-diner',
      63.5,
      157.2,
      '#a66d72',
      { x: 62.1, y: 157.25 },
      {
        female: true,
        longHair: true,
        seated: true,
        angle: -Math.PI / 2,
        description:
          'She came for coffee and stayed to watch an entire neighborhood change its mind.',
      },
    ),
  ];
}
export function squareNPCDialogue(npc, economy) {
  const id = ['square-foreman', 'square-coffee', 'square-books', 'square-busker'].includes(
    npc.questRole,
  )
    ? npc.questRole
    : 'square-visitor';
  return configuredDialogue(id, npc, {
    coffee: () => economy.trade('coffee'),
    tip: () => economy.trade('busker-tip'),
  });
}

export function drawSquareStreetLife(m, signs) {
  const y = TIMES_SQUARE.base + 0.04;
  // A real kiosk: espresso machine, serving counter, striped canvas awning.
  pose(m, 61, y, 156.5, 0, () => {
    m.box(-0.51, 0, -0.37, 1.02, 0.78, 0.74, '#668678', 'wood');
    m.box(-0.56, 0.78, -0.4, 1.12, 0.07, 0.82, '#c6b89c', 'stone');
    for (const x of [-0.5, 0.5]) m.rod([x, 0.05, -0.35], [x, 1.7, -0.35], 0.025, '#384e4b', 8);
    for (let i = 0; i < 8; i++)
      m.box(-0.6 + i * 0.15, 1.6, -0.49, 0.15, 0.06, 1.03, i % 2 ? '#ece1bf' : '#6f8a78');
    m.box(-0.23, 0.85, -0.18, 0.45, 0.35, 0.25, '#c1c6bc', { metal: 0.3 });
    m.box(-0.18, 0.97, 0.08, 0.34, 0.11, 0.025, '#344b4c');
    for (const x of [-0.38, 0.33]) m.cylinder(x, 0.85, 0.25, 0.045, 0.07, '#ede7d1', 12);
    drawPlaque(m, signs, 'SQUARE COFFEE', 0, 1.43, 0.54, 1.1, 0.18);
  });
  // Dog-eared stock, little wheels, and a handwritten sign at the book cart.
  pose(m, 65, y, 152, 0, () => {
    m.box(-0.39, 0.27, -0.28, 0.78, 0.38, 0.56, '#8d7051', 'wood');
    for (const x of [-0.28, 0.28]) m.sphere(x, 0.15, 0, 0.06, 0.11, 0.11, '#47514e', 12, 6);
    for (let i = 0; i < 9; i++)
      m.box(
        -0.34 + i * 0.075,
        0.66,
        -0.23,
        0.055,
        0.12 + (i % 3) * 0.025,
        0.28,
        ['#6c8a8f', '#b69364', '#8f685e'][i % 3],
        'wood',
      );
    drawPlaque(m, signs, 'USED BOOKS', 0, 0.36, 0.29, 0.7, 0.15);
  });
  const tx = 63.5,
    tz = 156.7;
  m.cylinder(tx, y + 0.58, tz, 0.34, 0.055, '#a17d52', 20);
  m.cylinder(tx, y, tz, 0.035, 0.58, '#56635c', 10);
  for (const z of [tz - 0.52, tz + 0.52]) {
    m.box(tx - 0.19, y + 0.34, z - 0.17, 0.38, 0.06, 0.34, '#739088', 'wood');
    for (const dx of [-0.15, 0.15])
      m.rod([tx + dx, y, z], [tx + dx, y + 0.35, z], 0.018, '#435a54', 8);
    m.box(tx - 0.2, y + 0.4, z + (z < tz ? -0.17 : 0.14), 0.4, 0.38, 0.035, '#739088', 'wood');
  }
  m.cylinder(tx + 0.13, y + 0.635, tz, 0.04, 0.06, '#e7e0c8', 10);
  m.box(tx - 0.19, y + 0.64, tz - 0.06, 0.15, 0.009, 0.11, '#ded9c5');
  // Quiet garden replaces the novelty red stair sculpture.
  m.box(61.4, y, 158.7, 3.2, 0.28, 2.6, '#9a9d8c', 'stone');
  m.box(61.55, y + 0.28, 158.85, 2.9, 0.018, 2.3, '#6b7c54', 'dirt');
  for (const [x, z] of [
    [61.95, 159.3],
    [63.95, 159.3],
    [63, 160.6],
  ]) {
    m.cylinder(x, y + 0.3, z, 0.045, 1.4, '#827053', 10);
    m.sphere(x, y + 1.6, z, 0.55, 0.65, 0.5, '#668657', 16, 8);
  }
  for (const z of [158.65, 161.25]) {
    m.box(61.7, y + 0.31, z, 2.6, 0.07, 0.28, '#a78c68', 'wood');
    for (const x of [62, 64]) m.box(x, y + 0.06, z + 0.04, 0.04, 0.26, 0.16, '#56665d');
  }
  // Guitar and open case beside the busker; ordinary civic street furniture.
  m.sphere(65.65, y + 0.31, 156.3, 0.14, 0.2, 0.055, '#a47d4f', 16, 8);
  m.rod([65.65, y + 0.39, 156.3], [65.72, y + 0.95, 156.3], 0.025, '#785c43', 8);
  m.box(65.1, y + 0.02, 155.8, 0.45, 0.045, 0.24, '#45565a');
  for (const [x, z] of [
    [65.6, 158.1],
    [59.8, 153],
    [69.4, 155.8],
  ]) {
    m.box(x - 0.23, y, z - 0.3, 0.46, 0.25, 0.6, '#858d80', 'stone');
    m.sphere(x, y + 0.35, z, 0.25, 0.2, 0.29, '#6c895c', 14, 8);
  }
  for (const [x, z] of [
    [57.2, 155.7],
    [69.5, 153],
  ]) {
    m.cylinder(x, y, z, 0.11, 0.4, '#4f6664', 14);
    for (let i = 0; i < 5; i++)
      m.rod(
        [x - 0.07 + i * 0.035, y + 0.05, z + 0.1],
        [x - 0.07 + i * 0.035, y + 0.35, z + 0.1],
        0.006,
        '#a5aba0',
        6,
      );
  }
  for (const x of [61.3, 64.8]) m.cylinder(x, y - 0.015, 154.5, 0.13, 0.025, '#65716b', 18);
}
