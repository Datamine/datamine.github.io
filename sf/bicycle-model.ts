import type { Mesh } from './geometry.ts';
/** Shared bicycle geometry for local riders, NPCs and other players. */
export function drawBicycle(m: Mesh, x: number, z: number, y: number, angle = 0, phase = 0) {
  phase = -phase; // Forward wheel rotation and cranks match the rider's feet.
  const f = [Math.cos(angle), Math.sin(angle)] satisfies [number, number],
    r = [-f[1], f[0]] satisfies [number, number],
    at = (u: number, h: number, v: number) =>
      [x + f[0] * u + r[0] * v, y + h, z + f[1] * u + r[1] * v] satisfies [number, number, number];
  for (const u of [-0.52, 0.52] satisfies [number, number]) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        b = ((i + 1) * Math.PI) / 6;
      m.rod(
        at(u + Math.cos(a) * 0.31, 0.34 + Math.sin(a) * 0.31, 0),
        at(u + Math.cos(b) * 0.31, 0.34 + Math.sin(b) * 0.31, 0),
        0.034,
        '#343d35',
        5,
      );
      if (i % 3 === 0)
        m.rod(
          at(u, 0.34, 0),
          at(u + Math.cos(a + phase) * 0.29, 0.34 + Math.sin(a + phase) * 0.29, 0),
          0.012,
          '#b0b7a3',
          4,
        );
    }
  }
  const a = at(-0.52, 0.34, 0),
    b = at(0.52, 0.34, 0),
    crank = at(0, 0.35, 0),
    seat = at(-0.18, 0.87, 0),
    bar = at(0.35, 0.9, 0);
  for (const [p, q] of [
    [a, seat],
    [seat, crank],
    [a, crank],
    [crank, bar],
    [bar, seat],
    [bar, b],
  ])
    m.rod(p, q, 0.035, '#ad5139', 5);
  m.rod(at(-0.28, 0.9, 0), at(-0.04, 0.9, 0), 0.05, '#403b2c');
  m.rod(bar, at(0.4, 1.02, 0), 0.03, '#bac0a8');
  m.rod(at(0.4, 1.02, -0.18), at(0.4, 1.02, 0.18), 0.03, '#454d3f');
  m.rod(at(0, 0.35, -0.13), at(0, 0.35, 0.13), 0.026, '#8c9b91', 8);
  for (const side of [-1, 1] satisfies [number, number]) {
    const turn = phase + (side < 0 ? Math.PI : 0),
      u = Math.cos(turn) * 0.17,
      h = 0.35 + Math.sin(turn) * 0.17,
      v = side * 0.13;
    m.rod(at(0, 0.35, v), at(u, h, v), 0.017, '#a6b1a3', 6);
    m.rod(at(u - 0.065, h, v), at(u + 0.065, h, v), 0.023, '#3d4b48', 6);
    m.rod(at(u, h, v - 0.045), at(u, h, v + 0.045), 0.017, '#6c7d74', 6);
  }
}
