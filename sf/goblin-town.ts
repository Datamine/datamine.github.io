import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export const GOBLIN_TOWN = Object.freeze({ x: 30, z: -23, entry: { x: 29.5, y: -17.5 } });
export const GOBLIN_HUTS = Object.freeze([
  { x: 26.5, z: -21, color: '#9c6657' },
  { x: 33.5, z: -23, color: '#7d8757' },
  { x: 26.5, z: -26, color: '#8b7198' },
]);
export const GOBLIN_SPAWNS = Object.freeze([
  { id: 'tam-goblin-1', combatKind: 'goblin', x: 30, z: -19 },
  { id: 'tam-goblin-2', combatKind: 'goblin', x: 29, z: -23 },
  { id: 'tam-goblin-3', combatKind: 'goblin', x: 32, z: -26 },
  { id: 'tam-furniture-maker', combatKind: 'goblin-maker', x: 29.5, z: -27.5 },
  { id: 'south-lost-goblin', combatKind: 'lost-goblin', x: 74.5, z: 187.5 },
]);
export function goblinHutBlocks(x: number, z: number) {
  return GOBLIN_HUTS.some((h) => Math.abs(x - h.x) < 1.3 && Math.abs(z - h.z) < 1.05);
}
export function drawBallChair(m: Mesh, x: number, base: number, z: number, angle = 0) {
  pose(m, x, base, z, angle - Math.PI / 2, () => {
    m.cylinder(0, 0.015, 0, 0.4, 0.065, '#d5dadd', 24, 0.36, { metal: 0.8 });
    m.cylinder(0, 0.08, 0, 0.07, 0.34, '#b8c4cd', 16, 0.1, { metal: 0.85 });
    // A hollow spherical shell with a broad circular opening toward +Z.
    const at = (theta: number, phi: number, r: number) =>
      [
        Math.sin(theta) * Math.cos(phi) * r,
        1.03 + Math.sin(theta) * Math.sin(phi) * r,
        Math.cos(theta) * r,
      ] satisfies [number, number, number];
    for (let i = 0; i < 16; i++)
      for (let j = 0; j < 32; j++) {
        const a = 0.95 + ((Math.PI - 0.95) * i) / 16,
          b = 0.95 + ((Math.PI - 0.95) * (i + 1)) / 16,
          c = (j * Math.PI) / 16,
          d = ((j + 1) * Math.PI) / 16;
        m.quad(at(a, c, 0.8), at(b, c, 0.8), at(b, d, 0.8), at(a, d, 0.8), '#eeeadd', {
          metal: 0.15,
        });
        m.quad(at(a, d, 0.75), at(b, d, 0.75), at(b, c, 0.75), at(a, c, 0.75), '#a93048');
        if (!i) m.quad(at(a, c, 0.8), at(a, d, 0.8), at(a, d, 0.75), at(a, c, 0.75), '#deded7');
      }
    m.sphere(0, 0.62, 0.04, 0.49, 0.11, 0.45, '#bc3d56', 24, 12);
  });
}
export function drawGoblinTown(m: Mesh, ground: (arg0: number, arg1: number) => number) {
  // The approach skirts the jail's east side before turning north into town.
  const points = [
    [33.7, -9] satisfies [number, number],
    [33.7, -15.5] satisfies [number, number],
    [30, -17] satisfies [number, number],
    [30, -28.8] satisfies [number, number],
  ];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.ceil(length * 4),
      nx = (-(b[1] - a[1]) / length) * 0.55,
      nz = ((b[0] - a[0]) / length) * 0.55;
    const at = (t: number, side: number) => {
      const x = a[0] + (b[0] - a[0]) * t + nx * side,
        z = a[1] + (b[1] - a[1]) * t + nz * side;
      return [x, ground(x, z) + 0.025, z] satisfies [number, number, number];
    };
    for (let j = 0; j < n; j++)
      m.quad(
        at(j / n, -1),
        at(j / n, 1),
        at((j + 1) / n, 1),
        at((j + 1) / n, -1),
        '#ab9270',
        'dirt',
      );
  }
  for (const h of GOBLIN_HUTS) {
    const y = ground(h.x, h.z);
    m.box(h.x - 1.1, y, h.z - 0.85, 2.2, 1.55, 1.7, h.color, 'wood');
    m.box(h.x - 0.3, y, h.z + 0.858, 0.6, 1.15, 0.015, '#34342d');
    for (const side of [-1, 1] satisfies [number, number]) {
      m.quad(
        [h.x - 1.3, y + 1.5, h.z + side] satisfies [number, number, number],
        [h.x + 1.3, y + 1.5, h.z + side] satisfies [number, number, number],
        [h.x + 1.3, y + 2.3, h.z] satisfies [number, number, number],
        [h.x - 1.3, y + 2.3, h.z] satisfies [number, number, number],
        '#67675a',
        'roof',
      );
      m.box(h.x + side * 0.7 - 0.18, y + 0.8, h.z + 0.86, 0.36, 0.38, 0.035, '#e8bd73');
    }
  }
  const y = ground(29.5, -29);
  m.box(28.5, y, -29.4, 2, 0.75, 0.7, '#95734e', 'wood');
  for (let i = 0; i < 4; i++)
    m.box(28.6 + i * 0.45, y + 0.75, -29.2, 0.25, 0.12, 0.2, '#c6a474', 'wood');
  drawBallChair(m, 32, ground(32, -29), -29, Math.PI);
}
