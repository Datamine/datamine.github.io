import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { ARMORY } from './armory-layout.ts';
import { drawPlaque } from './southern-district.ts';
import { drawFacadeWindow } from './windows.ts';
export function drawArmory(m: Mesh, signs: SignAtlas, ground: (x: number, z: number) => number) {
  const { w, d, rotation } = ARMORY,
    x = 0,
    z = 0,
    base = ground(ARMORY.x, ARMORY.z),
    start = m.data.length,
    left = -w / 2,
    face = d / 2;
  pose(m, ARMORY.x, 0, ARMORY.z, rotation, () => {
    m.box(left, base - 0.08, z - d / 2, w, 0.13, d, '#a6a38c', 'flagstone');
    m.box(left + 0.12, base, z - d / 2 + 0.12, w - 0.24, 2.7, d - 0.24, '#916750', 'brick');
    m.box(left, base + 2.65, z - d / 2, w, 0.23, d, '#baa88c', 'travertine');
    m.box(left + 0.25, base + 2.88, z - d / 2 + 0.25, w - 0.5, 0.1, d - 0.5, '#61746d', 'roof');
    for (const side of [-1, 1] satisfies [number, number]) {
      const xx = x + side * (w / 2 - 0.4);
      m.cylinder(xx, base, z + d / 2 - 0.35, 0.46, 3.7, '#9d7659', 14, 0.46, 'brick');
      m.cylinder(xx, base + 3.54, z + d / 2 - 0.35, 0.5, 0.15, '#c8b294', 14, 0.5, 'travertine');
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        m.box(
          xx + Math.cos(a) * 0.42 - 0.1,
          base + 3.69,
          z + d / 2 - 0.35 + Math.sin(a) * 0.42 - 0.1,
          0.2,
          0.25,
          0.2,
          '#c8b294',
          'stone',
        );
      }
    }
    m.box(x - 0.46, base + 0.02, face - 0.1, 0.92, 1.55, 0.08, '#4b625b', 'wood');
    for (const xx of [-0.16, 0.16] satisfies [number, number])
      m.box(x + xx - 0.01, base + 0.72, face - 0.008, 0.02, 0.22, 0.025, '#c5b276');
    for (const xx of [-0.65, 0.65] satisfies [number, number])
      for (const yy of [1.8, 2.25] satisfies [number, number])
        drawFacadeWindow(m, {
          plane: face - 0.1,
          along: x + xx,
          y: base + yy,
          w: 0.25,
          h: 0.33,
          style: 'office',
          trim: '#c8bfa6',
          seed: xx + yy,
        });
    drawPlaque(m, signs, 'THE ARMORY', x, base + 1.67, face + 0.015, 1.7, 0.3);
  });
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return {
    id: 'the-armory',
    kind: 'armory',
    label: contentText('armory.drawArmory.label-1', {}),
    entry: { ...ARMORY.entry },
    description: contentText('armory.drawArmory.description-2', {}),
    base,
    start,
    count: m.data.length - start,
    lo,
    hi,
    footprint: [
      [left, -d / 2] satisfies [number, number],
      [left + w, -d / 2] satisfies [number, number],
      [left + w, face] satisfies [number, number],
      [left, face] satisfies [number, number],
    ].map(
      ([xx, zz]) =>
        [
          ARMORY.x + xx * Math.cos(rotation) - zz * Math.sin(rotation),
          ARMORY.z + xx * Math.sin(rotation) + zz * Math.cos(rotation),
        ] satisfies [number, number],
    ),
  };
}
