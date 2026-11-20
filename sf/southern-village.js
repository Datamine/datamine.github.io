import { inDogPonyShow } from './dog-pony-layout.js';
import { makeNeighborhoodBench } from './neighborhood-interactions.js';
import { neighborhoodServiceFor } from './config/neighborhood-services.js';
import { pose } from './geometry.js';
import { drawGardenOffice } from './south-bay-models.js';
import { drawCraftGround } from './southern-craft.js';
import { VILLAGE_PAVILIONS } from './southern-village-layout.js';
import { DUEL_ARENA } from './duel-layout.js';
import { drawPlaque } from './southern-district.js';
const villageRect = (x, z, w, d) => [
  [x - w / 2, z - d / 2],
  [x + w / 2, z - d / 2],
  [x + w / 2, z + d / 2],
  [x - w / 2, z + d / 2],
];
export const VILLAGE_SIGNS = Object.freeze([
  'THE PRESENT TENSE',
  'QUALIA BOOKS',
  'DUEL ARENA',
  '50 / 50 · EQUAL STAKES',
  'STOCK EXCHANGE',
]);
function villageBench(m, x, y, z, angle) {
  pose(m, x, y, z, angle, () => {
    for (const xx of [-0.32, 0.32]) m.box(xx - 0.025, 0, -0.1, 0.05, 0.3, 0.22, '#5f7975');
    for (let i = 0; i < 4; i++)
      m.box(-0.46, 0.3, -0.13 + i * 0.08, 0.92, 0.035, 0.06, '#bd9c76', 'cedar');
    for (let i = 0; i < 3; i++)
      m.box(-0.46, 0.4 + i * 0.07, -0.15, 0.92, 0.05, 0.04, '#b38c67', 'cedar');
  });
}
function villageTable(m, x, y, z) {
  m.cylinder(x, y, z, 0.055, 0.46, '#658279', 12);
  m.cylinder(x, y + 0.46, z, 0.34, 0.05, '#d4b582', 20, 0.34, 'wood');
  for (const dx of [-0.5, 0.5]) {
    m.box(x + dx - 0.13, y, z - 0.13, 0.26, 0.27, 0.26, '#a4b5a5', 'cedar');
    m.box(x + dx - 0.13, y + 0.27, z + 0.1, 0.26, 0.3, 0.035, '#9aa893', 'cedar');
  }
  m.cylinder(x, y + 0.52, z, 0.043, 0.075, '#eee4cc', 12);
}
export function drawSouthernVillage(m, { terrain, tree, signs }) {
  const sites = [],
    people = [],
    obstacles = [],
    seats = [],
    start = m.data.length;
  const paving = (x, z, w, d, material = 'herringbone') =>
    drawCraftGround(m, terrain, villageRect(x, z, w, d), '#cfc1a0', material);
  for (const p of VILLAGE_PAVILIONS) {
    const site = drawGardenOffice(m, p, terrain);
    site.neighborhoodService = neighborhoodServiceFor(p.label);
    site.description =
      p.id === 'qualia-bookshop'
        ? 'A little bookshop beside the institutes. Its shelves run from practical gardening to deeply impractical theories of mind.'
        : 'A cedar-and-limestone tea room with a sheltered canopy and outdoor tables. The tea is warm; the discussion is pleasantly inconclusive.';
    sites.push(site);
    drawPlaque(
      m,
      signs,
      p.id === 'qualia-bookshop' ? 'QUALIA BOOKS' : 'THE PRESENT TENSE',
      p.x,
      site.base + 1.22,
      p.z - p.d / 2 - 0.085,
      p.w * 0.82,
      0.19,
      false,
    );
  }
  // Little garden rooms between the two institutes, not another asphalt lot.
  for (const [x, z] of [
    [52, 177.9],
    [59, 177.9],
    [65.1, 177.9],
    [72, 177.9],
    [77.1, 166.4],
    [81, 166.4],
  ]) {
    const y = terrain.height(x, z);
    m.cylinder(x, y, z, 0.21, 0.15, '#ba9d80', 16, 0.24, 'travertine');
    for (let j = 0; j < 6; j++) {
      const a = j * 2.4;
      m.sphere(
        x + Math.cos(a) * 0.15,
        y + 0.23,
        z + Math.sin(a) * 0.15,
        0.11,
        0.12,
        0.11,
        '#7e9e6d',
        10,
        5,
      );
      m.sphere(
        x + Math.cos(a) * 0.15,
        y + 0.33,
        z + Math.sin(a) * 0.15,
        0.035,
        0.035,
        0.035,
        j % 2 ? '#dba693' : '#cec88b',
        8,
        4,
      );
    }
    obstacles.push(villageRect(x, z, 0.55, 0.55));
  }
  for (const [x, z, a] of [
    [53, 176.9, Math.PI],
    [58.6, 176.9, Math.PI],
    [65.4, 176.8, Math.PI],
    [71.4, 176.8, Math.PI],
    [79.5, 177, Math.PI / 2],
  ]) {
    paving(x, z, 1.15, 0.65, 'flagstone');
    const seatStart = m.data.length,
      base = terrain.height(x, z) + 0.015;
    villageBench(m, x, base, z, a);
    seats.push(
      makeNeighborhoodBench({
        id: 'village-bench-' + seats.length,
        x,
        z,
        angle: a,
        base,
        height: 0.335,
        start: seatStart,
        count: m.data.length - seatStart,
      }),
    );
    obstacles.push(villageRect(x, z, 1.05, 0.42));
  }
  for (const [x, z] of [
    [53, 178.5],
    [58.8, 178.5],
    [66, 178.6],
    [71.6, 178.6],
  ]) {
    paving(x, z, 1.5, 1.2);
    villageTable(m, x, terrain.height(x, z) + 0.02, z);
    obstacles.push(villageRect(x, z, 1.45, 0.78));
  }
  for (const [x, z] of [
    [51.2, 176.6],
    [60, 178.7],
    [64, 178.8],
    [73.3, 176.4],
    [73.3, 169],
    [79.5, 167.8],
    [79.8, 178],
    [51.3, 168.1],
    [59.7, 168.1],
    [64.5, 168.1],
    [73.4, 168.1],
  ])
    if (!inDogPonyShow(x, z, 0.25)) tree(x - 0.5, z - 0.5, false, true);
  // Low pergola at the salt marsh overlook; its open middle remains walkable.
  const ox = 73.1,
    oz = 178.8;
  paving(ox, oz, 1.5, 1.25, 'flagstone');
  for (const dx of [-0.65, 0.65])
    for (const dz of [-0.5, 0.5]) {
      const x = ox + dx,
        z = oz + dz,
        y = terrain.height(x, z);
      m.rod([x, y, z], [x, y + 1.6, z], 0.025, '#6c8980', 10);
      obstacles.push(villageRect(x, z, 0.14, 0.14));
    }
  for (let j = 0; j < 9; j++)
    m.box(
      ox - 0.8 + j * 0.2,
      terrain.height(ox, oz) + 1.6,
      oz - 0.65,
      0.04,
      0.045,
      1.3,
      '#ae946d',
      'cedar',
    );
  for (const [i, [x, z, line]] of [
    [53.7, 176.7, 'The tea is steeping. I am trying to do the same, without forming an opinion.'],
    [
      58.2,
      177.4,
      'The bookshop has an entire shelf devoted to things nobody has managed to measure.',
    ],
    [62, 177.3, 'We moved the meeting outside. It immediately became more productive.'],
    [70.8, 177.3, 'These two institutes share everything except a definition of everything.'],
    [78.8, 175.5, 'I turn beach sand into paperwork. The factory handles the intermediate steps.'],
    [
      74,
      165.5,
      'I am considering a hat. It would be the most concrete decision I have made all week.',
    ],
    [74.3, 177.4, 'Look at those salt colors. Nobody had to appoint an art director.'],
  ].entries())
    people.push({
      id: 'southern-village-neighbor-' + i,
      neighborhood: true,
      label: i % 2 ? 'Man' : 'Woman',
      female: i % 2 === 0,
      longHair: i % 2 === 0,
      shirt: ['#97aba4', '#b49aac', '#bca07d', '#8298ad'][i % 4],
      skin: ['#b68d6d', '#8c654e', '#c6a285'][i % 3],
      hair: '#483c35',
      height: 1.85,
      x,
      z,
      base: terrain.height(x, z) + 0.025,
      regional: true,
      neighborLine: line,
      angle: i * 0.7,
    });
  const lo = [49, 0, 164.8],
    hi = [84, 5, 180];
  sites.push({
    id: 'southern-village-gardens',
    seats,
    kind: 'neighborhood-garden',
    label: 'Orchard and Foundry Gardens',
    entry: { x: 61.5, y: 176.8 },
    start,
    count: m.data.length - start,
    lo,
    hi,
    footprint: [
      [50.8, 176],
      [74, 176],
      [74, 180],
      [50.8, 180],
    ],
    navigationPolygons: obstacles,
    description:
      'Linked garden courts, tea tables, little bookshops and a birdwatching pergola link a quiet residential neighborhood to the foundry. The institutes sit farther south, beyond the lake and pasture.',
  });
  return { sites, people };
}
export function drawDuelArena(m, terrain, signs) {
  const a = DUEL_ARENA,
    start = m.data.length,
    base = a.base,
    deck = base + a.rise,
    polys = [];
  m.box(a.x - 1.5, base - 0.02, a.z - 1.5, 3, a.rise + 0.02, 3, '#d4bfa1', 'herringbone');
  for (const side of [-1, 1]) {
    const x = a.x + side * 1.5;
    m.box(x - 0.025, deck, a.z - 1.5, 0.05, 0.55, 3, '#72908a', 'cedar');
    polys.push(villageRect(x, a.z, 0.12, 3.1));
  }
  m.box(a.x - 1.5, deck, a.z - 1.525, 3, 0.55, 0.05, '#72908a', 'cedar');
  polys.push(villageRect(a.x, a.z - 1.5, 3, 0.12));
  for (const side of [-1, 1]) {
    const x = a.x + side * 1.04;
    m.box(x - 0.46, deck, a.z + 1.48, 0.92, 0.55, 0.05, '#72908a', 'cedar');
    polys.push(villageRect(x, a.z + 1.5, 0.93, 0.12));
  }
  // A sloping walkable ramp, rather than stairs placed across the gate.
  m.quad(
    [a.x - 0.6, base, a.z + 2.9],
    [a.x + 0.6, base, a.z + 2.9],
    [a.x + 0.6, deck, a.z + 1.5],
    [a.x - 0.6, deck, a.z + 1.5],
    '#c6b58e',
    'wood',
  );
  for (const x of [a.x - 1.5, a.x + 1.5])
    for (const z of [a.z - 1.5, a.z + 1.5])
      m.sphere(x, deck + 0.58, z, 0.07, 0.07, 0.07, '#c9b77e', 12, 6);
  m.box(a.x - 0.9, deck + 0.7, a.z - 1.55, 1.8, 0.36, 0.07, '#48695d', 'cedar');
  drawPlaque(m, signs, 'DUEL ARENA', a.x, deck + 0.76, a.z - 1.465, 1.65, 0.2);
  return {
    id: a.id,
    kind: 'duel-arena',
    label: a.label,
    entry: { ...a.entry },
    base,
    start,
    count: m.data.length - start,
    lo: [a.x - 1.6, base, a.z - 1.65],
    hi: [a.x + 1.6, deck + 1.1, a.z + 2.95],
    footprint: villageRect(a.x, a.z + 0.65, 3.3, 4.6),
    navigationPolygons: polys,
    description:
      'A tiny garden arena, with a ramp and room for two large financial opinions. Equal coin stakes, explicit agreement, and a fair 50–50 flip. Speak to the referee or challenge another player here.',
  };
}
export function drawStockExchange(m, signs, base) {
  const x = 68.3,
    z = 155.5,
    start = m.data.length;
  pose(m, x, base, z, 0, () => {
    m.box(-0.52, 0, -0.25, 1.04, 0.75, 0.5, '#79988e', 'cedar');
    m.box(-0.56, 0.75, -0.29, 1.12, 0.06, 0.58, '#d8c6a2', 'travertine');
    for (const xx of [-0.52, 0.52]) m.rod([xx, 0, -0.24], [xx, 1.9, -0.24], 0.025, '#758d81', 10);
    m.box(-0.68, 1.55, -0.29, 1.36, 0.35, 0.07, '#3a5a50');
    drawPlaque(m, signs, 'STOCK EXCHANGE', 0, 1.61, -0.205, 1.26, 0.17);
    for (let i = 0; i < 8; i++) m.box(-0.45 + i * 0.12, 0.83, -0.2, 0.085, 0.012, 0.13, '#e2d7b8');
  });
  return {
    id: 'times-square-stock-exchange',
    kind: 'stock-exchange',
    label: 'Times Square Stock Exchange',
    entry: { x: 67.8, y: 155.8 },
    base,
    start,
    count: m.data.length - start,
    lo: [x - 0.7, base, z - 0.3],
    hi: [x + 0.7, base + 2, z + 0.3],
    footprint: villageRect(x, z, 1.4, 0.6),
    navigationPolygons: [villageRect(x, z, 1.4, 0.6)],
    description:
      'A surprisingly compact stock exchange. The broker lists Sand Hill growth equity for a five-percent fee, then lets you try your hand at timing the market.',
  };
}
