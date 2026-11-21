// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { TERMINATOR_FACTORY } from './encounter-layout.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

/** Roofless industrial ruin. Only the actual walls block walking and shots;
 * the central courtyard and broad broken doorway stay accessible. */
export function drawAbandonedFactory(m: Mesh) {
  const p = TERMINATOR_FACTORY,
    start = m.data.length,
    polygons: number[][][] = [],
    wall = (x: number, z: number, w: number, d: number, h: number) => {
      m.box(x - w / 2, p.base, z - d / 2, w, h, d, '#888f86', 'concrete');
      polygons.push([
        [x - w / 2, z - d / 2] satisfies [number, number],
        [x + w / 2, z - d / 2] satisfies [number, number],
        [x + w / 2, z + d / 2] satisfies [number, number],
        [x - w / 2, z + d / 2] satisfies [number, number],
      ]);
    };
  m.box(p.x - p.w / 2, p.base - 0.04, p.z - p.d / 2, p.w, 0.06, p.d, '#8f9587', 'cobble');
  wall(p.x, p.z - p.d / 2, p.w, 0.19, 2.8);
  wall(p.x - p.w / 2, p.z, 0.19, p.d, 2.8);
  wall(p.x + p.w / 2, p.z, 0.19, p.d, 2.2);
  for (const s of [-1, 1] satisfies [number, number])
    wall(p.x + s * 1.65, p.z + p.d / 2, 1.3, 0.19, 2.4);
  for (const s of [-1, 1] satisfies [number, number]) {
    m.box(p.x + s * 1.65 - 0.47, p.base + 1.1, p.z + p.d / 2 + 0.105, 0.94, 0.63, 0.025, '#3c4f50');
    for (let i = 0; i < 3; i++)
      m.box(
        p.x + s * 1.65 - 0.5 + i * 0.29,
        p.base + 1.08,
        p.z + p.d / 2 + 0.13,
        0.12,
        0.75,
        0.045,
        '#7f7160',
        'wood',
      );
  }
  pose(m, p.x, p.base, p.z, 0, () => {
    for (const x of [-2, 0, 2] satisfies [number, number, number]) {
      m.rod(
        [x, 2.8, -2.1] satisfies [number, number, number],
        [x, 3.4, 0] satisfies [number, number, number],
        0.055,
        '#785b46',
        8,
      );
      m.rod(
        [x, 3.4, 0] satisfies [number, number, number],
        [x, 2.5, 2.15] satisfies [number, number, number],
        0.055,
        '#785b46',
        8,
      );
    }
    m.quad(
      [-2.45, 2.82, -2.45] satisfies [number, number, number],
      [2.45, 2.82, -2.45] satisfies [number, number, number],
      [2.45, 3.12, -1.1] satisfies [number, number, number],
      [-2.45, 3.12, -1.1] satisfies [number, number, number],
      '#6e7775',
      { metal: 0.25 },
    );
    for (let i = 0; i < 6; i++)
      m.box(-2 + i * 0.68, 0.03, -1.8 + (i % 3) * 0.45, 0.37, 0.08, 0.17, '#ad9077', 'brick');
    m.box(1.5, 0.04, -1.8, 0.5, 0.72, 0.5, '#547573', { metal: 0.25 });
    m.cylinder(1.75, 0.76, -1.55, 0.25, 0.025, '#737d70', 16);
    for (const x of [-0.8, 0, 0.8] satisfies [number, number, number])
      m.box(x, 0.03, 0.8, 0.35, 0.025, 0.06, '#b7a270');
  });
  return {
    id: 'abandoned-factory',
    label: contentText('encounter-buildings.drawAbandonedFactory.label-1', {}),
    kind: 'ruin',
    description: contentText('encounter-buildings.drawAbandonedFactory.description-2', {}),
    entry: p.entry,
    start,
    count: m.data.length - start,
    lo: [p.x - 2.5, p.base - 0.1, p.z - 2.5] satisfies [number, number, number],
    hi: [p.x + 2.5, p.base + 3.5, p.z + 2.5] satisfies [number, number, number],
    navigationPolygons: polygons,
  };
}
