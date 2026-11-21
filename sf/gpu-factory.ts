type Navigation = ReturnType<typeof import('./navigation.ts').buildTileNavigation>;
import { requiredValue } from './types/assert.ts';
import type { LocalPlayer, SignAtlas, Site } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { drawFacadeWindow } from './windows.ts';
import { drawPlaque } from './southern-district.ts';
import { GPU_FACTORY } from './gpu-layout.ts';

export const GPU_FACTORY_SIGNS = Object.freeze(['GPU FACTORY', 'OCEAN BEACH SAND'] satisfies [
  string,
  string,
]);
export function oceanBeachSandSite(
  navigation: Navigation,
  { scale = 1.5, from }: { scale: number; from: LocalPlayer },
) {
  const region = navigation.regionAt(from.x, from.y),
    entry = navigation.nearest(
      8.9 * scale - 0.5,
      36 * scale - 0.5,
      6,
      (x: number, y: number) =>
        navigation.regionAt(x, y) === region && navigation.describe(x, y).type === 'sand',
    );
  if (!entry) throw new Error('Ocean Beach needs a connected sand collection spot');
  return {
    id: 'ocean-beach-sand',
    kind: 'sand',
    label: contentText('gpu-factory.oceanBeachSandSite.label-1', {}),
    entry,
    x: entry.x + 0.1,
    z: entry.y + 0.35,
    description: contentText('gpu-factory.oceanBeachSandSite.description-2', {}),
  };
}
export function drawSandSack(m: Mesh, x: number, y: number, z: number) {
  pose(m, x, y, z, 0, () => {
    m.sphere(0, 0.19, 0, 0.16, 0.21, 0.14, '#b69b70', 12, 7, 'wood');
    m.cylinder(0, 0.34, 0, 0.08, 0.09, '#cbb48a', 10, 0.065);
    m.rod(
      [-0.075, 0.36, -0.015] satisfies [number, number, number],
      [0.075, 0.36, 0.015] satisfies [number, number, number],
      0.014,
      '#756246',
      7,
    );
  });
}
export function drawBeachSand(
  m: Mesh,
  site: Pick<Site, 'x' | 'z'>,
  base: number,
  signs: SignAtlas,
) {
  pose(m, requiredValue(site.x, 'sand x'), base, requiredValue(site.z, 'sand z'), 0, () => {
    m.sphere(-0.08, 0.035, 0, 0.42, 0.1, 0.27, '#d7c395', 16, 7, 'sand');
    drawSandSack(m, 0.24, 0.02, 0.09);
    drawSandSack(m, -0.38, 0.015, 0.08);
    m.rod(
      [-0.16, 0.06, -0.19] satisfies [number, number, number],
      [-0.02, 0.9, -0.18] satisfies [number, number, number],
      0.017,
      '#a58b5e',
      10,
    );
    m.box(-0.07, 0.09, -0.22, 0.16, 0.21, 0.045, '#9eafaa', { metal: 0.4 });
    m.rod(
      [-0.08, 0.91, -0.18] satisfies [number, number, number],
      [0.05, 0.91, -0.18] satisfies [number, number, number],
      0.018,
      '#7c694b',
      9,
    );
    for (const x of [-0.36, 0.36] satisfies [number, number])
      m.rod(
        [x, 0, -0.4] satisfies [number, number, number],
        [x, 0.82, -0.4] satisfies [number, number, number],
        0.023,
        '#8c7959',
        8,
      );
    m.box(-0.5, 0.57, -0.43, 1, 0.23, 0.06, '#586d5c', 'wood');
    drawPlaque(m, signs, 'OCEAN BEACH SAND', 0, 0.6, -0.365, 0.94, 0.16);
  });
}
export function drawGPUFactory(
  m: Mesh,
  signs: SignAtlas,
  ground: (x: number, z: number) => number,
) {
  const f = GPU_FACTORY,
    start = m.data.length;
  pose(m, f.x, f.base, f.z, 0, () => {
    m.box(-f.w / 2, -0.08, -f.d / 2, f.w, 0.1, f.d, '#929f99', 'stone');
    m.box(-f.w / 2, 0, -f.d / 2, f.w, 2.4, f.d, '#c9d4cd', 'stucco');
    for (const x of [-2.15, -0.85, 0.45, 1.75] satisfies [number, number, number, number])
      m.box(x - 0.035, 0.08, -2.32, 0.07, 2.35, 4.64, '#889e95', { metal: 0.2 });
    // Three north-light roof bays, with glazed slopes and raised ridges.
    for (let i = 0; i < 3; i++) {
      const a = -f.d / 2 + (i * f.d) / 3,
        b = a + f.d / 3;
      m.quad(
        [-2.46, 2.42, a] satisfies [number, number, number],
        [-2.46, 2.9, b - 0.35] satisfies [number, number, number],
        [2.46, 2.9, b - 0.35] satisfies [number, number, number],
        [2.46, 2.42, a] satisfies [number, number, number],
        '#637d76',
        'roof',
      );
      m.quad(
        [-2.46, 2.9, b - 0.35] satisfies [number, number, number],
        [-2.46, 2.42, b] satisfies [number, number, number],
        [2.46, 2.42, b] satisfies [number, number, number],
        [2.46, 2.9, b - 0.35] satisfies [number, number, number],
        '#9ac5bd',
        'glass',
      );
      for (const side of [-1, 1] satisfies [number, number])
        m.tri(
          [side * 2.46, 2.42, a] satisfies [number, number, number],
          [side * 2.46, 2.9, b - 0.35] satisfies [number, number, number],
          [side * 2.46, 2.42, b] satisfies [number, number, number],
          '#b3c2b8',
          'stucco',
        );
      for (const x of [-1.6, -0.8, 0.8, 1.6] satisfies [number, number, number, number])
        m.rod(
          [x, 2.91, b - 0.35] satisfies [number, number, number],
          [x, 2.43, b] satisfies [number, number, number],
          0.012,
          '#a9c0b9',
          8,
        );
      for (const x of [-2.45, 0, 2.45] satisfies [number, number, number])
        m.rod(
          [x, 2.91, b - 0.35] satisfies [number, number, number],
          [x, 2.43, b] satisfies [number, number, number],
          0.018,
          '#b8cbc4',
          8,
        );
    }
    for (const side of [-1, 1] satisfies [number, number])
      for (let i = 0; i < 4; i++)
        drawFacadeWindow(m, {
          isX: true,
          plane: side * (f.w / 2 + 0.012),
          along: -1.95 + i * 0.92,
          y: 0.85,
          w: 0.6,
          h: 1.1,
          far: side < 0,
          trim: '#8aa299',
          seed: side + i,
          glow: 0.18,
        });
    // Recessed loading shutter, personnel entrance, and an actual sign.
    m.box(-1.95, 0.08, 2.305, 1.65, 1.8, 0.045, '#617d75');
    for (let i = 0; i < 11; i++) m.box(-1.91, 0.13 + i * 0.15, 2.355, 1.57, 0.02, 0.018, '#90a49a');
    m.box(0.55, 0.04, 2.31, 0.76, 1.8, 0.035, '#4b6d68', 'glass');
    m.box(0.59, 0.1, 2.35, 0.68, 0.7, 0.018, '#738a7a');
    m.rod(
      [1.15, 0.75, 2.39] satisfies [number, number, number],
      [1.15, 1.04, 2.39] satisfies [number, number, number],
      0.014,
      '#c7c5a3',
      8,
    );
    m.box(-1.8, 2.12, 2.32, 3.6, 0.42, 0.055, '#344e46');
    drawPlaque(m, signs, 'GPU FACTORY', 0, 2.17, 2.39, 3.4, 0.27);
    for (const x of [-1.65, -0.75, 0.15] satisfies [number, number, number]) {
      m.box(x - 0.28, 2.45, -1.95, 0.56, 0.45, 0.6, '#a9bab2', { metal: 0.3 });
      m.cylinder(x, 2.91, -1.65, 0.17, 0.025, '#566d66', 16, 0.17);
      for (let j = 0; j < 5; j++)
        m.box(x - 0.22 + j * 0.1, 2.94, -1.87, 0.03, 0.015, 0.44, '#617a70');
    }
    for (const z of [-1.4, -0.55] satisfies [number, number]) {
      m.cylinder(2.12, 0.15, z, 0.21, 1.45, '#9fb4ad', 16, 0.21, { metal: 0.4 });
      m.sphere(2.12, 1.61, z, 0.21, 0.1, 0.21, '#bfcec6', 16, 7, { metal: 0.3 });
      m.rod(
        [2.12, 1.25, z] satisfies [number, number, number],
        [2.48, 1.25, z] satisfies [number, number, number],
        0.035,
        '#6a948c',
        10,
      );
    }
  });
  // The collection counter and sand pallets sit on the open forecourt.
  for (const dx of [-1.5, -1] satisfies [number, number])
    drawSandSack(m, f.x + dx, ground(f.x + dx, 173.8) + 0.025, 173.8);
  const x = f.x + 1.2,
    z = 174.1,
    h = ground(x, z);
  m.box(x - 0.42, h, z - 0.3, 0.84, 0.6, 0.6, '#84958a', 'wood');
  m.box(x - 0.46, h + 0.6, z - 0.34, 0.92, 0.07, 0.68, '#bbc6b3');
  const box = (x: number, z: number, w: number, d: number) => [
      [x - w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z - d / 2] satisfies [number, number],
      [x + w / 2, z + d / 2] satisfies [number, number],
      [x - w / 2, z + d / 2] satisfies [number, number],
    ],
    footprint = box(f.x, f.z, f.w + 0.08, f.d + 0.18),
    navigationPolygons = [
      footprint,
      box(x, z, 0.94, 0.7),
      ...([-1.5, -1] satisfies [number, number]).map((dx) => box(f.x + dx, 173.8, 0.34, 0.32)),
    ];
  return {
    navigationPolygons,
    id: 'gpu-factory',
    kind: 'gpu-factory',
    label: contentText('gpu-factory.drawGPUFactory.label-3', {}),
    entry: { ...f.entry },
    description: contentText('gpu-factory.drawGPUFactory.description-4', {}),
    start,
    count: m.data.length - start,
    lo: [f.x - f.w / 2 - 0.1, f.base - 0.1, f.z - f.d / 2 - 0.1] satisfies [number, number, number],
    hi: [f.x + f.w / 2 + 0.12, f.base + 3.1, 174.5] satisfies [number, number, number],
    footprint: [
      [f.x - f.w / 2 - 0.04, f.z - f.d / 2 - 0.04] satisfies [number, number],
      [f.x + f.w / 2 + 0.04, f.z - f.d / 2 - 0.04] satisfies [number, number],
      [f.x + f.w / 2 + 0.04, f.z + f.d / 2 + 0.09] satisfies [number, number],
      [f.x - f.w / 2 - 0.04, f.z + f.d / 2 + 0.09] satisfies [number, number],
    ],
  };
}
