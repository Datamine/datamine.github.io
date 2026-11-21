import type { Mesh } from './geometry.ts';

/** Coastal village reached on foot through the Marin headlands. */
export const BOLINAS = Object.freeze({ x: -8, z: -48, entry: { x: -7.5, y: -43.5 } });
export const EMF_WARRIOR = Object.freeze({
  id: 'bolinas-emf-warrior',
  combatKind: 'emf-warrior',
  x: -7,
  z: -53,
});
export const BOLINAS_COTTAGES = Object.freeze([
  { x: -12, z: -45.5, color: '#9e6862' },
  { x: -3, z: -47, color: '#799b93' },
  { x: -12, z: -51, color: '#c4ad79' },
  { x: -2.5, z: -53, color: '#889577' },
]);
export const BOLINAS_PATH = Object.freeze([
  [28, -2] satisfies [number, number],
  [22, -9] satisfies [number, number],
  [16, -17] satisfies [number, number],
  [10, -25] satisfies [number, number],
  [3, -33] satisfies [number, number],
  [-5, -39] satisfies [number, number],
  [-7, -44] satisfies [number, number],
  [-7, -55] satisfies [number, number],
]);
export function bolinasBlocks(x: number, z: number) {
  return BOLINAS_COTTAGES.some((h) => Math.abs(x - h.x) < 1.65 && Math.abs(z - h.z) < 1.35);
}
export function drawBolinas(
  m: Mesh,
  ground: { (x: number, z: number): number; (arg0: number, arg1: number): number },
) {
  for (let i = 1; i < BOLINAS_PATH.length; i++) {
    const [ax, az] = BOLINAS_PATH[i - 1],
      [bx, bz] = BOLINAS_PATH[i],
      length = Math.hypot(bx - ax, bz - az),
      nx = (-(bz - az) / length) * 0.7,
      nz = ((bx - ax) / length) * 0.7,
      steps = Math.ceil(length * 4);
    const at = (t: number, side: number) => {
      const x = ax + (bx - ax) * t + nx * side,
        z = az + (bz - az) * t + nz * side;
      return [x, ground(x, z) + 0.035, z] satisfies [number, number, number];
    };
    for (let j = 0; j < steps; j++)
      m.quad(
        at(j / steps, -1),
        at(j / steps, 1),
        at((j + 1) / steps, 1),
        at((j + 1) / steps, -1),
        '#b5a080',
        'dirt',
      );
  }
  for (const h of BOLINAS_COTTAGES) {
    const y = ground(h.x, h.z);
    m.box(h.x - 1.4, y, h.z - 1.1, 2.8, 1.8, 2.2, h.color, 'wood');
    for (const side of [-1, 1] satisfies [number, number]) {
      m.quad(
        [h.x - 1.6, y + 1.75, h.z + side * 1.3] satisfies [number, number, number],
        [h.x + 1.6, y + 1.75, h.z + side * 1.3] satisfies [number, number, number],
        [h.x + 1.6, y + 2.65, h.z] satisfies [number, number, number],
        [h.x - 1.6, y + 2.65, h.z] satisfies [number, number, number],
        '#596d6c',
        'roof',
      );
      m.box(h.x + side * 0.85 - 0.24, y + 0.85, h.z + 1.11, 0.48, 0.48, 0.03, '#edcf89');
    }
    m.box(h.x - 0.3, y, h.z + 1.12, 0.6, 1.3, 0.03, '#4f554b');
    m.box(h.x - 1.5, y - 0.02, h.z + 1.2, 3, 0.1, 0.6, '#a99979', 'wood');
  }
  // A little village green, driftwood benches, a surf rack and a fenced garden.
  for (const z of [-44, -50] satisfies [number, number]) {
    const x = -9,
      y = ground(x, z);
    m.box(x - 0.7, y + 0.42, z - 0.15, 1.4, 0.09, 0.35, '#a08b67', 'wood');
    for (const dx of [-0.5, 0.5] satisfies [number, number])
      m.box(x + dx - 0.04, y, z - 0.1, 0.08, 0.42, 0.25, '#6b7060');
  }
  for (let i = 0; i < 3; i++) {
    const x = -0.7 + i * 0.27,
      z = -50,
      y = ground(x, z);
    m.sphere(
      x,
      y + 0.75,
      z,
      0.11,
      0.8,
      0.045,
      (['#d5b071', '#7ca8a7', '#bc6b66'] satisfies [string, string, string])[i],
      12,
      8,
    );
  }
  for (let i = 0; i < 9; i++) {
    const x = -14 + i * 0.5,
      z = -48.5,
      y = ground(x, z);
    m.box(x, y, z, 0.05, 0.6, 0.05, '#c6b78f', 'wood');
  }
  // An improvised antenna garden beside the warrior's patch of grass.
  for (const dx of [-1, 1] satisfies [number, number]) {
    const x = -7 + dx * 2,
      z = -56,
      y = ground(x, z);
    m.rod(
      [x, y, z] satisfies [number, number, number],
      [x, y + 2.7, z] satisfies [number, number, number],
      0.025,
      '#9ba7a8',
      8,
      { metal: 0.7 },
    );
    for (const h of [1.7, 2.2, 2.6] satisfies [number, number, number])
      m.rod(
        [x - 0.5, y + h, z] satisfies [number, number, number],
        [x + 0.5, y + h, z] satisfies [number, number, number],
        0.018,
        '#b6c2c3',
        6,
        { metal: 0.7 },
      );
  }
}
