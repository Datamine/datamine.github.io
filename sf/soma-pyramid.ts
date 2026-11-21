import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

/** A compact, asymmetric glass spire on the original one-tile SoMa parcel. */
export function drawSomaPyramid(m: Mesh, x: number, base: number, z: number) {
  pose(m, x, base, z, 0, () => {
    const corners = [
        [-1, -1] satisfies [number, number],
        [1, -1] satisfies [number, number],
        [1, 1] satisfies [number, number],
        [-1, 1] satisfies [number, number],
      ],
      levels = 20;
    const at = (side: number, t: number, u: number, offset = 0) => {
      const a = corners[side],
        b = corners[(side + 1) % 4],
        r = 0.43 * Math.pow(1 - t, 0.94),
        nx = (a[0] + b[0]) / 2,
        nz = (a[1] + b[1]) / 2;
      return [
        (a[0] + (b[0] - a[0]) * u) * r + t * 0.13 + nx * offset,
        0.24 + t * 7.1,
        (a[1] + (b[1] - a[1]) * u) * r + nz * offset,
      ] satisfies [number, number, number];
    };
    m.box(-0.47, 0, -0.47, 0.94, 0.2, 0.94, '#b3bdb5', 'stone');
    for (let side = 0; side < 4; side++) {
      for (let floor = 0; floor < levels; floor++) {
        const t = floor / levels,
          u = (floor + 1) / levels,
          bays = floor < 12 ? 4 : floor < 17 ? 3 : 2;
        m.quad(at(side, t, 0), at(side, t, 1), at(side, u, 1), at(side, u, 0), '#658994', 'glass');
        for (let bay = 0; bay < bays; bay++) {
          const a = (bay + 0.07) / bays,
            b = (bay + 0.93) / bays,
            lo = t + 0.007,
            hi = u - 0.007;
          if (hi > lo)
            m.quad(
              at(side, lo, a, 0.012),
              at(side, lo, b, 0.012),
              at(side, hi, b, 0.012),
              at(side, hi, a, 0.012),
              (
                ['#557780', '#6a919b', '#789ca2', '#5d858f'] satisfies [
                  string,
                  string,
                  string,
                  string,
                ]
              )[(bay + floor + side) % 4],
              'glass',
            );
        }
        m.rod(at(side, u, 0, 0.018), at(side, u, 1, 0.018), 0.009, '#9fb3b4', 4, { metal: 0.15 });
      }
      for (const u of [0, 0.25, 0.5, 0.75] satisfies [number, number, number, number])
        for (let floor = 0; floor < levels - 1; floor++)
          m.rod(
            at(side, floor / levels, u, 0.02),
            at(side, (floor + 1) / levels, u, 0.02),
            u === 0 ? 0.014 : 0.0065,
            '#bac8c3',
            4,
            { metal: 0.2 },
          );
      for (let floor = 0; floor < 15; floor += 3)
        m.rod(
          at(side, floor / levels, floor % 2 ? 0 : 1, 0.028),
          at(side, (floor + 3) / levels, floor % 2 ? 1 : 0, 0.028),
          0.012,
          '#9fb9bc',
          6,
          { metal: 0.18 },
        );
    }
    m.box(-0.36, 0.2, 0.43, 0.72, 0.45, 0.035, '#44616b', 'glass');
    m.box(-0.4, 0.67, 0.41, 0.8, 0.045, 0.17, '#c1c9be', 'stone');
    for (const u of [-0.3, 0.3] satisfies [number, number])
      m.rod(
        [u, 0.2, 0.5] satisfies [number, number, number],
        [u, 0.66, 0.5] satisfies [number, number, number],
        0.018,
        '#b9c6bd',
        8,
      );
    for (const u of [-0.16, 0, 0.16] satisfies [number, number, number])
      m.rod(
        [u, 0.22, 0.47] satisfies [number, number, number],
        [u, 0.61, 0.47] satisfies [number, number, number],
        0.008,
        '#acbdb7',
        4,
      );
    m.rod(
      [0.13, 7.22, 0] satisfies [number, number, number],
      [0.13, 7.7, 0] satisfies [number, number, number],
      0.012,
      '#c7d3ca',
      8,
      { metal: 0.22 },
    );
    m.sphere(0.13, 7.7, 0, 0.025, 0.025, 0.025, '#d8c3a3', 10, 6, { emissive: 0.18 });
  });
}
