import type { Economy } from './types/controllers.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { configuredDialogue } from './dialogue-config.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawPlaque } from './southern-district.ts';
import { SQUARE_DIGSITE } from './square-construction-layout.ts';
import { TIMES_SQUARE } from './southern-layout.ts';
import type { SignAtlas } from './types/world.ts';

export const SQUARE_LIFE_SIGNS = Object.freeze([
  'SQUARE COFFEE',
  'USED BOOKS',
  'HILLSBOROUGH WORKS',
  'NOTICE · PUBLIC PLAZA',
] satisfies [string, string, string, string]);
export function createSquareNPCs() {
  const make = (
    id: string,
    name: string,
    role: string,
    x: number,
    z: number,
    shirt: string,
    approach: { x: number; y: number },
    extra: Partial<import('./types/world.ts').Actor> = {},
  ) => ({
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
        description: contentText('times-square-life.createSquareNPCs.description-3', {}),
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
      { description: contentText('times-square-life.createSquareNPCs.description-4', {}) },
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
        description: contentText('times-square-life.createSquareNPCs.description-5', {}),
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
        description: contentText('times-square-life.createSquareNPCs.description-6', {}),
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
        description: contentText('times-square-life.createSquareNPCs.description-7', {}),
      },
    ),
  ];
}
export function squareNPCDialogue(
  npc: Partial<import('./types/world.ts').Actor>,
  economy: Economy,
) {
  const id = (
    ['square-foreman', 'square-coffee', 'square-books', 'square-busker'] satisfies [
      string,
      string,
      string,
      string,
    ]
  ).includes(npc.questRole || '')
    ? npc.questRole!
    : 'square-visitor';
  return configuredDialogue(id, npc, {
    coffee: () => economy.trade('coffee'),
    tip: () => economy.trade('busker-tip'),
  });
}

export function drawSquareStreetLife(m: Mesh, signs: SignAtlas) {
  const y = TIMES_SQUARE.base + 0.04;
  // A real kiosk: espresso machine, serving counter, striped canvas awning.
  pose(m, 61, y, 156.5, 0, () => {
    m.box(-0.51, 0, -0.37, 1.02, 0.78, 0.74, '#668678', 'wood');
    m.box(-0.56, 0.78, -0.4, 1.12, 0.07, 0.82, '#c6b89c', 'stone');
    for (const x of [-0.5, 0.5] satisfies [number, number])
      m.rod(
        [x, 0.05, -0.35] satisfies [number, number, number],
        [x, 1.7, -0.35] satisfies [number, number, number],
        0.025,
        '#384e4b',
        8,
      );
    for (let i = 0; i < 8; i++)
      m.box(-0.6 + i * 0.15, 1.6, -0.49, 0.15, 0.06, 1.03, i % 2 ? '#ece1bf' : '#6f8a78');
    m.box(-0.23, 0.85, -0.18, 0.45, 0.35, 0.25, '#c1c6bc', { metal: 0.3 });
    m.box(-0.18, 0.97, 0.08, 0.34, 0.11, 0.025, '#344b4c');
    for (const x of [-0.38, 0.33] satisfies [number, number])
      m.cylinder(x, 0.85, 0.25, 0.045, 0.07, '#ede7d1', 12);
    drawPlaque(m, signs, 'SQUARE COFFEE', 0, 1.43, 0.54, 1.1, 0.18);
  });
  // Dog-eared stock, little wheels, and a handwritten sign at the book cart.
  pose(m, 65, y, 152, 0, () => {
    m.box(-0.39, 0.27, -0.28, 0.78, 0.38, 0.56, '#8d7051', 'wood');
    for (const x of [-0.28, 0.28] satisfies [number, number])
      m.sphere(x, 0.15, 0, 0.06, 0.11, 0.11, '#47514e', 12, 6);
    for (let i = 0; i < 9; i++)
      m.box(
        -0.34 + i * 0.075,
        0.66,
        -0.23,
        0.055,
        0.12 + (i % 3) * 0.025,
        0.28,
        (['#6c8a8f', '#b69364', '#8f685e'] satisfies [string, string, string])[i % 3],
        'wood',
      );
    drawPlaque(m, signs, 'USED BOOKS', 0, 0.36, 0.29, 0.7, 0.15);
  });
  const tx = 63.5,
    tz = 156.7;
  m.cylinder(tx, y + 0.58, tz, 0.34, 0.055, '#a17d52', 20);
  m.cylinder(tx, y, tz, 0.035, 0.58, '#56635c', 10);
  for (const z of [tz - 0.52, tz + 0.52] satisfies [number, number]) {
    m.box(tx - 0.19, y + 0.34, z - 0.17, 0.38, 0.06, 0.34, '#739088', 'wood');
    for (const dx of [-0.15, 0.15] satisfies [number, number])
      m.rod(
        [tx + dx, y, z] satisfies [number, number, number],
        [tx + dx, y + 0.35, z] satisfies [number, number, number],
        0.018,
        '#435a54',
        8,
      );
    m.box(tx - 0.2, y + 0.4, z + (z < tz ? -0.17 : 0.14), 0.4, 0.38, 0.035, '#739088', 'wood');
  }
  m.cylinder(tx + 0.13, y + 0.635, tz, 0.04, 0.06, '#e7e0c8', 10);
  m.box(tx - 0.19, y + 0.64, tz - 0.06, 0.15, 0.009, 0.11, '#ded9c5');
  // Quiet garden replaces the novelty red stair sculpture.
  m.box(61.4, y, 158.7, 3.2, 0.28, 2.6, '#9a9d8c', 'stone');
  m.box(61.55, y + 0.28, 158.85, 2.9, 0.018, 2.3, '#6b7c54', 'dirt');
  for (const [x, z] of [
    [61.95, 159.3] satisfies [number, number],
    [63.95, 159.3] satisfies [number, number],
    [63, 160.6] satisfies [number, number],
  ]) {
    m.cylinder(x, y + 0.3, z, 0.045, 1.4, '#827053', 10);
    m.sphere(x, y + 1.6, z, 0.55, 0.65, 0.5, '#668657', 16, 8);
  }
  for (const z of [158.65, 161.25] satisfies [number, number]) {
    m.box(61.7, y + 0.31, z, 2.6, 0.07, 0.28, '#a78c68', 'wood');
    for (const x of [62, 64] satisfies [number, number])
      m.box(x, y + 0.06, z + 0.04, 0.04, 0.26, 0.16, '#56665d');
  }
  // Guitar and open case beside the busker; ordinary civic street furniture.
  m.sphere(65.65, y + 0.31, 156.3, 0.14, 0.2, 0.055, '#a47d4f', 16, 8);
  m.rod(
    [65.65, y + 0.39, 156.3] satisfies [number, number, number],
    [65.72, y + 0.95, 156.3] satisfies [number, number, number],
    0.025,
    '#785c43',
    8,
  );
  m.box(65.1, y + 0.02, 155.8, 0.45, 0.045, 0.24, '#45565a');
  for (const [x, z] of [
    [65.6, 158.1] satisfies [number, number],
    [59.8, 153] satisfies [number, number],
    [69.4, 155.8] satisfies [number, number],
  ]) {
    m.box(x - 0.23, y, z - 0.3, 0.46, 0.25, 0.6, '#858d80', 'stone');
    m.sphere(x, y + 0.35, z, 0.25, 0.2, 0.29, '#6c895c', 14, 8);
  }
  for (const [x, z] of [
    [57.2, 155.7] satisfies [number, number],
    [69.5, 153] satisfies [number, number],
  ]) {
    m.cylinder(x, y, z, 0.11, 0.4, '#4f6664', 14);
    for (let i = 0; i < 5; i++)
      m.rod(
        [x - 0.07 + i * 0.035, y + 0.05, z + 0.1] satisfies [number, number, number],
        [x - 0.07 + i * 0.035, y + 0.35, z + 0.1] satisfies [number, number, number],
        0.006,
        '#a5aba0',
        6,
      );
  }
  for (const x of [61.3, 64.8] satisfies [number, number])
    m.cylinder(x, y - 0.015, 154.5, 0.13, 0.025, '#65716b', 18);
}
