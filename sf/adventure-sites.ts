import type { Site, SignAtlas } from './types/world.ts';
type HighwayCar = Pick<
  ReturnType<typeof import('./ferrari.ts').createFerrari>,
  'sample' | 'dealer' | 'stations'
>;
type HighwaySite = Site & { distance: number };

// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { TAHOE_VILLAGE, tahoeHeight } from './tahoe.ts';
import { drawEstateArchitecture } from './estate-architecture.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { drawPlaque } from './southern-district.ts';
import type { CharacterAppearance } from './characters.ts';
import { drawCharacter } from './characters.ts';
import { SF_FITNESS, SAND_HILL_CAPITAL } from './southern-layout.ts';

export const ADVENTURE_SIGNS = Object.freeze([
  'IN-N-OUT',
  'FERRARI',
  'EXTORTIONATE GAS',
  'FREE GAS',
  'SF FITNESS',
  'Sand Hill Road Capital Partners',
  'STRENGTH TRAINING',
] satisfies [string, string, string, string, string, string, string]);
function adventureSite(m: Mesh, start: number, site: Site) {
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return { ...site, start, count: m.data.length - start, lo, hi };
}
export function drawFitness(m: Mesh, signs: SignAtlas) {
  const start = m.data.length,
    g = SF_FITNESS;
  pose(m, g.x, g.base, g.z, 0, () => {
    m.box(-2.2, -0.06, -1.7, 4.4, 0.1, 3.4, '#657778', 'concrete');
    m.box(-2.1, 0.04, -1.6, 4.2, 0.025, 3.2, '#48565d');
    m.box(-2.2, 0.04, -1.7, 4.4, 2.35, 0.12, '#81979c', 'brick');
    for (const x of [-2.2, 2.08] satisfies [number, number])
      m.box(x, 0.04, -1.7, 0.12, 1, 3.4, '#9fb5af', 'stucco');
    for (const x of [-2.1, 2.1] satisfies [number, number])
      m.rod(
        [x, 0, -1.5] satisfies [number, number, number],
        [x, 2.5, -1.5] satisfies [number, number, number],
        0.055,
        '#b9bfc0',
        10,
      );
    m.box(-2.2, 2.4, -1.6, 4.4, 0.12, 0.15, '#bcc4c5');
    drawPlaque(m, signs, 'SF FITNESS', 0, 1.88, -1.55, 3.8, 0.34);
    for (const x of [-1.65, 1.6] satisfies [number, number]) {
      for (const z of [-1.25, -0.6] satisfies [number, number])
        m.rod(
          [x, 0.05, z] satisfies [number, number, number],
          [x, 1.1, z] satisfies [number, number, number],
          0.025,
          '#a6adb3',
          8,
        );
      for (const y of [0.35, 0.8] satisfies [number, number]) {
        m.rod(
          [x - 0.22, y, -1.1] satisfies [number, number, number],
          [x + 0.22, y, -1.1] satisfies [number, number, number],
          0.028,
          '#b2b9bf',
          8,
        );
        for (const side of [-1, 1] satisfies [number, number])
          m.sphere(x + side * 0.19, y, -1.1, 0.065, 0.12, 0.12, '#3b454d', 14, 8);
      }
    }
    // Bench is aligned with the lying avatar and has its own weight rack.
    m.box(-1, 0.53, -0.23, 2, 0.12, 0.46, '#9a6374', 'wood');
    for (const x of [-0.7, 0.7] satisfies [number, number])
      m.box(x, 0.05, -0.18, 0.08, 0.48, 0.36, '#a2b0b2', { metal: 0.25 });
    for (const z of [-0.68, 0.68] satisfies [number, number])
      m.rod(
        [-0.5, 0.05, z] satisfies [number, number, number],
        [-0.5, 1.25, z] satisfies [number, number, number],
        0.035,
        '#a7b7bc',
        10,
      );
    m.box(-0.65, 0.066, 0.58, 1.3, 0.014, 1.05, '#677f8c');
    for (const x of [-0.55, 0.55] satisfies [number, number])
      m.box(x, 0.082, 0.67, 0.025, 0.003, 0.86, '#9cafad');
    drawPlaque(m, signs, 'STRENGTH TRAINING', 0, 0.13, 1.73, 2.8, 0.3);
  });
  const sx = g.w / 4.4,
    sz = g.d / 3.4;
  for (let i = start; i < m.data.length; i += 11) {
    m.data[i] = g.x + (m.data[i] - g.x) * sx;
    m.data[i + 2] = g.z + (m.data[i + 2] - g.z) * sz;
    const nx = m.data[i + 3] / sx,
      ny = m.data[i + 4],
      nz = m.data[i + 5] / sz,
      length = Math.hypot(nx, ny, nz) || 1;
    m.data[i + 3] = nx / length;
    m.data[i + 4] = ny / length;
    m.data[i + 5] = nz / length;
  }
  return adventureSite(m, start, {
    id: 'sf-fitness',
    kind: 'gym',
    label: contentText('adventure-sites.drawFitness.label-1', {}),
    entry: { ...g.entry },
    inside: { x: g.x - 0.5, y: g.z + 0.5 },
    base: g.base,
    description: contentText('adventure-sites.drawFitness.description-2', {}),
  });
}
export function drawTrainingSites(
  m: Mesh,
  signs: SignAtlas,
  { includeGym = true }: { includeGym?: boolean } | undefined = {},
) {
  const sites = includeGym ? [drawFitness(m, signs)] : [],
    start = m.data.length,
    c = SAND_HILL_CAPITAL;
  pose(m, c.x, c.base, c.z, 0, () =>
    drawEstateArchitecture(
      m,
      { w: c.w, d: c.d, capital: true, seed: 0.32 },
      signs,
      'Sand Hill Road Capital Partners',
    ),
  );
  sites.push(
    adventureSite(m, start, {
      id: 'sand-hill-capital',
      kind: 'capital',
      label: contentText('adventure-sites.drawTrainingSites.label-3', {}),
      entry: { ...c.entry },
      description: contentText('adventure-sites.drawTrainingSites.description-4', {}),
    }),
  );
  return sites;
}
export function drawBenchPress(
  m: Mesh,
  time: number,
  appearance: CharacterAppearance | undefined,
  { reduced = false, training = true }: { reduced?: boolean; training?: boolean } | undefined = {},
) {
  const g = SF_FITNESS,
    start = m.data.length,
    beat = reduced ? 0 : time * 0.0026;
  if (training)
    drawCharacter(m, 0, 0, 0, 0, 0, false, appearance?.skin, appearance?.shirt, {
      ...appearance,
      mode: 'idle',
      action: 'bench',
      time: beat,
      backpack: false,
    });
  m.characters?.transform(
    start,
    new Float32Array([
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      g.bench.x + 0.9,
      g.base + 0.8,
      g.bench.z,
      1,
    ] satisfies [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ]),
  );
  for (let i = start; i < m.data.length; i += 11) {
    const x = m.data[i],
      y = m.data[i + 1],
      nx = m.data[i + 3],
      ny = m.data[i + 4];
    m.data[i] = g.bench.x - y + 0.9;
    m.data[i + 1] = g.base + 0.8 + x;
    m.data[i + 2] += g.bench.z;
    m.data[i + 3] = -ny;
    m.data[i + 4] = nx;
  }
  const h = g.base + (training ? 1.08 + Math.sin(beat) * 0.12 : 1.25);
  m.rod(
    [g.bench.x - 0.4, h, g.bench.z - 0.72] satisfies [number, number, number],
    [g.bench.x - 0.4, h, g.bench.z + 0.72] satisfies [number, number, number],
    0.025,
    '#bfc7cb',
    10,
  );
  for (const side of [-1, 1] satisfies [number, number])
    m.sphere(g.bench.x - 0.4, h, g.bench.z + side * 0.6, 0.17, 0.17, 0.045, '#343e46', 18, 10);
}

export function createHighwaySites(car: HighwayCar) {
  const make = (
    id: string,
    label: string,
    kind: string,
    distance: number,
    extra: Partial<Site> = {},
  ): HighwaySite => {
    const p = car.sample(distance);
    return {
      id,
      label,
      kind,
      distance,
      entry: id === 'fuel-tahoe' ? { ...TAHOE_VILLAGE.fuel.entry } : { x: p.x - 0.5, y: p.z - 0.5 },
      ...extra,
    };
  };
  return [
    make('in-n-out', 'In-N-Out', 'burger', car.dealer - 10, {
      description: contentText('adventure-sites.createHighwaySites.description-5', {}),
    }),
    ...car.stations.map((s) =>
      make(s.id, s.label, s.id === 'ferrari-dealer' ? 'dealership' : 'fuel', s.distance, {
        paid: s.paid,
        description: s.paid
          ? contentText('adventure-sites.createHighwaySites.description-6.yes', {})
          : s.id === 'ferrari-dealer'
            ? contentText('adventure-sites.createHighwaySites.description-6.no.yes', {})
            : contentText('adventure-sites.createHighwaySites.description-6.no.no', {}),
      }),
    ),
  ];
}
export function drawHighwaySites(m: Mesh, car: HighwayCar, sites: HighwaySite[], signs: SignAtlas) {
  return sites.map((site) => {
    const start = m.data.length,
      p = car.sample(site.distance),
      side = site.id === 'fuel-return' ? -1 : 1,
      angle = site.id === 'fuel-tahoe' ? 0 : p.angle + (side > 0 ? Math.PI : 0);
    const x =
        site.id === 'fuel-tahoe' ? TAHOE_VILLAGE.fuel.x : p.x - Math.sin(p.angle) * side * 4.2,
      z = site.id === 'fuel-tahoe' ? TAHOE_VILLAGE.fuel.z : p.z + Math.cos(p.angle) * side * 4.2;
    const base = site.id === 'fuel-tahoe' ? tahoeHeight(x, z) : p.y;
    const parcel = (u: number, v: number, w: number, d: number) => ({
      x: x + u * Math.cos(angle) - v * Math.sin(angle),
      z: z + u * Math.sin(angle) + v * Math.cos(angle),
      w,
      d,
      angle,
    });
    site.solidParcels =
      site.kind === 'burger' || site.kind === 'dealership'
        ? [parcel(0, 0, 4, 2.8)]
        : ([-0.8, 0.8] satisfies [number, number]).map((u) => parcel(u, 0.075, 0.38, 0.35));
    pose(m, x, base, z, angle, () => {
      m.box(-2.4, -0.1, -1.9, 4.8, 0.12, 3.8, '#9ca6a3', 'concrete');
      if (site.kind === 'burger' || site.kind === 'dealership') {
        m.box(
          -2,
          0.02,
          -1.4,
          4,
          1.7,
          2.8,
          site.kind === 'burger' ? '#e3d9bd' : '#a3acb2',
          'stucco',
        );
        m.box(-2.1, 1.72, -1.5, 4.2, 0.15, 3, site.kind === 'burger' ? '#bc4c43' : '#596c79');
        for (let i = 0; i < 4; i++)
          drawFacadeWindow(m, {
            plane: 1.41,
            along: -1.8 + i * 0.95,
            y: 0.3,
            w: 0.7,
            h: 0.9,
            style: 'storefront',
            trim: '#e5dfd0',
            seed: i + 2,
          });
        drawPlaque(
          m,
          signs,
          site.kind === 'burger' ? 'IN-N-OUT' : 'FERRARI',
          0,
          1.18,
          1.46,
          3.7,
          0.32,
        );
        if (site.kind === 'burger') {
          m.rod(
            [2.2, 0, 0] satisfies [number, number, number],
            [2.2, 3.5, 0] satisfies [number, number, number],
            0.045,
            '#b2b9ae',
            10,
          );
          m.box(1.6, 2.7, -0.04, 1.2, 0.55, 0.08, '#c4483e');
          m.tri(
            [1.65, 2.7, 0.05] satisfies [number, number, number],
            [2.5, 2.94, 0.05] satisfies [number, number, number],
            [1.65, 3.2, 0.05] satisfies [number, number, number],
            '#ebc85b',
          );
          for (const x of [-2.2, 2.2] satisfies [number, number]) {
            m.rod(
              [x, 0, -1.6] satisfies [number, number, number],
              [x + 0.12, 2.7, -1.6] satisfies [number, number, number],
              0.055,
              '#917957',
              10,
            );
            for (let i = 0; i < 7; i++) {
              const a = (i * Math.PI * 2) / 7,
                end = [x + 0.12 + Math.cos(a) * 0.65, 2.48, -1.6 + Math.sin(a) * 0.65] satisfies [
                  number,
                  number,
                  number,
                ];
              m.rod(
                [x + 0.12, 2.7, -1.6] satisfies [number, number, number],
                end,
                0.03,
                '#6d9257',
                7,
              );
              m.tri(
                [x + 0.12, 2.72, -1.6] satisfies [number, number, number],
                end,
                [end[0] + Math.sin(a) * 0.15, end[1] - 0.1, end[2] - Math.cos(a) * 0.15] satisfies [
                  number,
                  number,
                  number,
                ],
                '#7a9f62',
              );
            }
          }
        }
      } else {
        for (const x of [-1.8, 1.8] satisfies [number, number])
          m.box(x - 0.04, 0, -0.5, 0.08, 2, 0.08, '#b7bfc2');
        m.box(-2.2, 2, -1, 4.4, 0.16, 2.2, site.paid ? '#a66068' : '#6b9d8a');
        drawPlaque(m, signs, site.paid ? 'EXTORTIONATE GAS' : 'FREE GAS', 0, 2.04, 1.22, 4.1, 0.3);
        for (const x of [-0.8, 0.8] satisfies [number, number]) {
          m.box(x - 0.19, 0, -0.1, 0.38, 1, 0.35, '#dddacb');
          m.box(x - 0.16, 0.65, 0.265, 0.32, 0.2, 0.025, '#335256', { emissive: 0.15 });
          m.rod(
            [x + 0.2, 0.75, 0.08] satisfies [number, number, number],
            [x + 0.32, 0.25, 0.1] satisfies [number, number, number],
            0.025,
            '#353b3e',
            8,
          );
        }
      }
    });
    return adventureSite(m, start, { ...site, base });
  });
}
