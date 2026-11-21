import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export function drawShipyardCargo(
  m: Mesh,
  x: number,
  base: number,
  z: number,
  seed = 0,
  crane = false,
) {
  const start = m.data.length;
  pose(m, x, base, z, 0, () => {
    m.box(-0.8, 0, -0.95, 1.6, 0.045, 1.9, '#8f9992', 'concrete');
    if (crane) {
      for (const s of [-1, 1] satisfies [number, number])
        m.rod(
          [s * 0.6, 0.05, -0.6] satisfies [number, number, number],
          [s * 0.36, 2.8, -0.6] satisfies [number, number, number],
          0.055,
          '#b19865',
          10,
          { metal: 0.2 },
        );
      m.rod(
        [-0.36, 2.8, -0.6] satisfies [number, number, number],
        [0.36, 2.8, -0.6] satisfies [number, number, number],
        0.07,
        '#c3aa76',
        10,
      );
      m.rod(
        [0, 2.8, -0.6] satisfies [number, number, number],
        [0, 4.2, 0.95] satisfies [number, number, number],
        0.065,
        '#b19865',
        10,
      );
      m.rod(
        [0, 4.2, 0.95] satisfies [number, number, number],
        [0, 1.5, 0.95] satisfies [number, number, number],
        0.012,
        '#546268',
        6,
      );
      m.rod(
        [0, 1.5, 0.95] satisfies [number, number, number],
        [0.12, 1.37, 0.95] satisfies [number, number, number],
        0.025,
        '#65777b',
        8,
      );
      m.rod(
        [0.12, 1.37, 0.95] satisfies [number, number, number],
        [0.2, 1.48, 0.95] satisfies [number, number, number],
        0.025,
        '#65777b',
        8,
      );
      for (let y = 0.4; y < 2.6; y += 0.35)
        m.rod(
          [-0.31, y, -0.6] satisfies [number, number, number],
          [0.31, y + 0.22, -0.6] satisfies [number, number, number],
          0.015,
          '#d0b985',
          4,
        );
      m.box(-0.6, 0.06, -0.8, 1.2, 0.3, 0.55, '#617c83', 'concrete');
    } else {
      for (let level = 0; level < (seed > 0.5 ? 2 : 1); level++) {
        const c = (['#747e72', '#8d6654', '#566b79'] satisfies [string, string, string])[
            Math.floor(seed * 7 + level) % 3
          ],
          y = 0.05 + level * 0.66;
        m.box(-0.67, y, -0.85, 1.34, 0.64, 1.7, c, { metal: 0.15 });
        for (let i = 0; i < 9; i++)
          for (const side of [-1, 1] satisfies [number, number])
            m.box(side * 0.675, y + 0.04, -0.78 + i * 0.18, 0.018, 0.55, 0.028, '#a7aaa0', {
              metal: 0.1,
            });
        for (const xx of [-0.4, 0.4] satisfies [number, number])
          m.rod(
            [xx, y + 0.07, 0.87] satisfies [number, number, number],
            [xx, y + 0.57, 0.87] satisfies [number, number, number],
            0.014,
            '#b9bbb0',
            6,
          );
      }
    }
  });
  return {
    start,
    count: m.data.length - start,
    footprint: [
      [x - 0.8, z - 0.95] satisfies [number, number],
      [x + 0.8, z - 0.95] satisfies [number, number],
      [x + 0.8, z + 0.95] satisfies [number, number],
      [x - 0.8, z + 0.95] satisfies [number, number],
    ],
  };
}

export const NAVY_SHIP = Object.freeze({ x: 101, z: 79, angle: -Math.PI / 2 });
export function drawNavyShip(m: Mesh, time: number, reduced = false) {
  const t = reduced ? 0 : time * 0.001;
  pose(m, NAVY_SHIP.x, 0.13 + Math.sin(t * 0.55) * 0.025, NAVY_SHIP.z, NAVY_SHIP.angle, () => {
    // A tapered displacement hull, raised forecastle and faceted bridge.
    const hull = [
      [-4.8, 0] satisfies [number, number],
      [-3.6, -0.77] satisfies [number, number],
      [2.7, -0.83] satisfies [number, number],
      [4.9, -0.27] satisfies [number, number],
      [5.3, 0] satisfies [number, number],
      [4.9, 0.27] satisfies [number, number],
      [2.7, 0.83] satisfies [number, number],
      [-3.6, 0.77] satisfies [number, number],
    ];
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i],
        b = hull[(i + 1) % hull.length];
      m.quad(
        [a[0], 0.03, a[1] * 0.7] satisfies [number, number, number],
        [b[0], 0.03, b[1] * 0.7] satisfies [number, number, number],
        [b[0], 0.63, b[1]] satisfies [number, number, number],
        [a[0], 0.63, a[1]] satisfies [number, number, number],
        '#687d85',
        { metal: 0.15 },
      );
      m.tri(
        [0, 0.65, 0] satisfies [number, number, number],
        [a[0], 0.65, a[1]] satisfies [number, number, number],
        [b[0], 0.65, b[1]] satisfies [number, number, number],
        '#909d9e',
        'concrete',
      );
    }
    m.box(-2, 0.65, -0.55, 3.2, 0.65, 1.1, '#899d9e', { metal: 0.12 });
    m.box(-0.7, 1.3, -0.45, 1.65, 0.7, 0.9, '#a1b0ad', { metal: 0.15 });
    for (const side of [-1, 1] satisfies [number, number])
      for (let i = 0; i < 5; i++)
        m.box(-0.55 + i * 0.29, 1.64, side * 0.455, 0.22, 0.22, 0.018, '#3e626e', 'glass');
    m.box(-0.84, 2, -0.55, 1.93, 0.1, 1.1, '#6d858c');
    m.cylinder(-1.6, 1.3, 0, 0.18, 0.8, '#52656d', 20, 0.14);
    m.cylinder(-1.6, 2.08, 0, 0.23, 0.07, '#394e58', 20);
    m.rod(
      [0.05, 2.1, 0] satisfies [number, number, number],
      [0.05, 4.1, 0] satisfies [number, number, number],
      0.04,
      '#a0b0ae',
      12,
    );
    m.rod(
      [-0.7, 3, 0] satisfies [number, number, number],
      [0.8, 3, 0] satisfies [number, number, number],
      0.025,
      '#91a7a7',
      8,
    );
    pose(m, 0.05, 3.7, 0, reduced ? 0 : t * 0.3, () => {
      m.box(-0.5, 0, -0.025, 1, 0.29, 0.05, '#6b818a', { metal: 0.2 });
      for (let i = 0; i < 6; i++)
        m.rod(
          [-0.45 + i * 0.18, 0, -0.04] satisfies [number, number, number],
          [-0.45 + i * 0.18, 0.29, -0.04] satisfies [number, number, number],
          0.009,
          '#b6c3bb',
          4,
        );
    });
    m.cylinder(2.8, 0.66, 0, 0.36, 0.4, '#788c92', 24, 0.28, { metal: 0.2 });
    m.rod(
      [2.95, 1, 0] satisfies [number, number, number],
      [4.15, 1.11, 0] satisfies [number, number, number],
      0.055,
      '#6b8088',
      12,
    );
    for (const side of [-1, 1] satisfies [number, number])
      for (let i = 0; i < 16; i++) {
        const x = -3.6 + i * 0.45,
          z = side * 0.72;
        m.rod(
          [x, 0.66, z] satisfies [number, number, number],
          [x, 0.94, z] satisfies [number, number, number],
          0.01,
          '#c3cfca',
          4,
        );
        if (i < 15)
          m.rod(
            [x, 0.92, z] satisfies [number, number, number],
            [x + 0.45, 0.92, z] satisfies [number, number, number],
            0.01,
            '#c3cfca',
            4,
          );
      }
    m.cylinder(-3.3, 0.68, 0, 0.42, 0.045, '#5e777c', 32);
    m.box(-3.56, 0.73, -0.025, 0.52, 0.006, 0.05, '#c9d2c4');
    for (const side of [-1, 1] satisfies [number, number])
      for (let i = 0; i < 4; i++)
        m.rod(
          [-4 - i * 0.6, 0.025, side * (0.3 + i * 0.2)] satisfies [number, number, number],
          [-4.5 - i * 0.6, 0.025, side * (0.4 + i * 0.2)] satisfies [number, number, number],
          0.025,
          '#a4c7c1',
          4,
        );
  });
}
