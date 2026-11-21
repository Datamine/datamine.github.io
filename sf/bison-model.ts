import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

/** Broad shoulders, shaggy forequarters and a planted, four-beat park stroll. */
export function drawBison(
  m: Mesh,
  n: {
    x: number;
    z: number;
    base?: number;
    angle?: number;
    motion?: number;
    phase?: number | string;
    seated?: boolean;
  },
  time = 0,
) {
  const phase = typeof n.phase === 'number' ? n.phase : 0,
    motion = n.motion || 0,
    bob = Math.sin(phase * 2) * 0.018 * motion;
  pose(m, n.x, n.base || 0, n.z, n.angle || 0, () => {
    const fur = '#65503c',
      shag = '#40352d',
      light = '#8b6b4b';
    m.sphere(-0.2, 1 + bob, 0, 0.78, 0.43, 0.39, fur, 20, 12, 'stucco');
    m.sphere(0.35, 1.14 + bob, 0, 0.53, 0.63, 0.46, shag, 20, 12, 'stucco');
    m.sphere(0.32, 1.56 + bob, 0, 0.37, 0.27, 0.34, fur, 16, 9, 'stucco');
    m.sphere(0.84, 0.97 + bob, 0, 0.36, 0.4, 0.32, shag, 18, 11, 'stucco');
    m.sphere(1.11, 0.76 + bob, 0, 0.27, 0.2, 0.23, fur, 16, 9);
    m.sphere(1.29, 0.77 + bob, 0, 0.12, 0.1, 0.18, '#302c28', 12, 7);
    for (const side of [-1, 1] satisfies [number, number]) {
      m.sphere(0.91, 1.1 + bob, side * 0.292, 0.035, 0.033, 0.018, '#1e211d', 10, 6);
      m.sphere(0.92, 1.11 + bob, side * 0.308, 0.008, 0.008, 0.006, '#e0d9bd', 6, 4);
      m.sphere(0.64, 1.23 + bob, side * 0.35, 0.13, 0.075, 0.1, light, 12, 7);
      const horn = [
        [0.78, 1.2 + bob, side * 0.27] satisfies [number, number, number],
        [0.8, 1.29 + bob, side * 0.43] satisfies [number, number, number],
        [0.87, 1.47 + bob, side * 0.46] satisfies [number, number, number],
        [0.93, 1.61 + bob, side * 0.41] satisfies [number, number, number],
      ];
      for (let i = 1; i < horn.length; i++)
        m.rod(horn[i - 1], horn[i], 0.058 * (1 - i / 4), '#d8cba3', 10);
      for (const end of [-1, 1] satisfies [number, number]) {
        const f =
            (((phase / (Math.PI * 2) + (side < 0 ? 0 : 0.5) + (end < 0 ? 0.25 : 0)) % 1) + 1) % 1,
          stance = 0.7,
          t = f < stance ? f / stance : (f - stance) / (1 - stance),
          reach = 0.385;
        const step =
            (f < stance ? reach - 1.1 * f : -reach + 2 * reach * t * t * (3 - 2 * t)) * motion,
          lift = f < stance ? 0 : Math.sin(Math.PI * t) * 0.14 * motion;
        const hip = [end * 0.48, 0.78 + bob, side * 0.29] satisfies [number, number, number],
          knee = [end * 0.48 + step * 0.4, 0.39 + lift * 0.5, side * 0.31] satisfies [
            number,
            number,
            number,
          ],
          hoof = [end * 0.48 + step, 0.1 + lift, side * 0.32] satisfies [number, number, number];
        m.sphere(...hip, 0.18, 0.28, 0.18, end > 0 ? shag : fur, 12, 8, 'stucco');
        m.rod(hip, knee, 0.13, end > 0 ? shag : fur, 10);
        m.rod(knee, hoof, 0.085, fur, 10);
        m.sphere(hoof[0] + 0.035, hoof[1], hoof[2], 0.13, 0.1, 0.1, '#322e29', 12, 6);
      }
      for (let i = 0; i < 7; i++) {
        const x = 0.12 + i * 0.115,
          y = 0.67 - Math.sin(i * 0.6) * 0.08,
          z = side * (0.23 + (i % 2) * 0.06);
        m.tri(
          [x - 0.1, y + 0.18, z] satisfies [number, number, number],
          [x + 0.1, y + 0.18, z] satisfies [number, number, number],
          [x + 0.035, y - 0.16, z + side * 0.02] satisfies [number, number, number],
          shag,
          'stucco',
        );
      }
    }
    m.rod(
      [-0.86, 1.05, 0] satisfies [number, number, number],
      [-1.03, 0.65, Math.sin(time * 0.0015) * 0.06] satisfies [number, number, number],
      0.035,
      fur,
      8,
    );
    m.sphere(-1.03, 0.59, Math.sin(time * 0.0015) * 0.06, 0.08, 0.15, 0.08, shag, 10, 6);
  });
}

export function drawBisonHide(m: Mesh, x: number, base: number, z: number) {
  const points = [
    [-0.23, -0.25] satisfies [number, number],
    [-0.4, -0.29] satisfies [number, number],
    [-0.31, -0.1] satisfies [number, number],
    [-0.36, 0.15] satisfies [number, number],
    [-0.43, 0.3] satisfies [number, number],
    [-0.17, 0.24] satisfies [number, number],
    [0, 0.31] satisfies [number, number],
    [0.18, 0.24] satisfies [number, number],
    [0.4, 0.3] satisfies [number, number],
    [0.32, 0.1] satisfies [number, number],
    [0.36, -0.15] satisfies [number, number],
    [0.43, -0.3] satisfies [number, number],
    [0.2, -0.24] satisfies [number, number],
    [0, -0.29] satisfies [number, number],
  ].reverse();
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    m.tri(
      [x, base + 0.045, z] satisfies [number, number, number],
      [x + b[0], base + 0.025, z + b[1]] satisfies [number, number, number],
      [x + a[0], base + 0.025, z + a[1]] satisfies [number, number, number],
      '#77583c',
      'stucco',
    );
  }
  m.sphere(x + 0.06, base + 0.055, z, 0.19, 0.035, 0.22, '#514034', 12, 6, 'stucco');
}
