import { requiredValue } from './types/assert.ts';
import { Mesh, pose } from './geometry.ts';

export function drawTanker(m: Mesh, variant = 0) {
  const hull = variant ? '#405967' : '#565f60',
    deck = variant ? '#9c7157' : '#a35e4b';
  const stations = [
    [-3.05, 0.06] satisfies [number, number],
    [-2.65, 0.52] satisfies [number, number],
    [-1.9, 0.64] satisfies [number, number],
    [1.8, 0.64] satisfies [number, number],
    [2.55, 0.43] satisfies [number, number],
    [3.12, 0.025] satisfies [number, number],
  ];
  for (let i = 1; i < stations.length; i++) {
    const [a, wa] = stations[i - 1],
      [b, wb] = stations[i];
    for (const side of [-1, 1] satisfies [number, number])
      m.quad(
        [a, 0.035, side * wa * 0.76] satisfies [number, number, number],
        [b, 0.035, side * wb * 0.76] satisfies [number, number, number],
        [b, 0.5, side * wb] satisfies [number, number, number],
        [a, 0.5, side * wa] satisfies [number, number, number],
        hull,
        { metal: 0.12 },
      );
    m.quad(
      [a, 0.505, -wa] satisfies [number, number, number],
      [a, 0.505, wa] satisfies [number, number, number],
      [b, 0.505, wb] satisfies [number, number, number],
      [b, 0.505, -wb] satisfies [number, number, number],
      deck,
      { metal: 0.12 },
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [a, 0.53, side * wa] satisfies [number, number, number],
        [b, 0.53, side * wb] satisfies [number, number, number],
        0.025,
        '#c4beb0',
        6,
      );
  }
  for (let x = -1.3; x < 2.2; x += 0.4) {
    m.cylinder(x, 0.53, 0, 0.18, 0.075, '#bac0ae', 16);
    for (const side of [-1, 1] satisfies [number, number]) {
      m.rod(
        [x, 0.55, side * 0.42] satisfies [number, number, number],
        [x, 0.72, side * 0.42] satisfies [number, number, number],
        0.012,
        '#cbc7b5',
        6,
      );
      m.rod(
        [x, 0.72, side * 0.42] satisfies [number, number, number],
        [x + 0.3, 0.72, side * 0.42] satisfies [number, number, number],
        0.012,
        '#cbc7b5',
        6,
      );
    }
  }
  for (const side of [-1, 1] satisfies [number, number])
    m.rod(
      [-1.5, 0.63, side * 0.27] satisfies [number, number, number],
      [2.32, 0.63, side * 0.27] satisfies [number, number, number],
      0.036,
      '#c4b9a0',
      8,
      {
        metal: 0.18,
      },
    );
  m.box(-2.38, 0.51, -0.47, 0.82, 0.5, 0.94, '#d4d2bf', 'stucco');
  m.box(-2.28, 1.01, -0.43, 0.67, 0.4, 0.86, '#e3ddc8', 'stucco');
  m.box(-2.37, 1.3, -0.49, 0.86, 0.18, 0.98, '#3e5d68', 'glass');
  m.box(-2.4, 1.48, -0.51, 0.92, 0.065, 1.02, '#e3deca');
  for (const side of [-1, 1] satisfies [number, number])
    for (let i = 0; i < 4; i++)
      m.box(-2.33 + i * 0.2, 0.72, side * 0.478, 0.11, 0.13, 0.016, '#5e7d83', 'glass');
  m.box(-2.07, 1.55, -0.15, 0.28, 0.52, 0.3, variant ? '#be8e58' : '#995a43', { metal: 0.12 });
  m.box(-2.09, 2.07, -0.17, 0.32, 0.07, 0.34, '#3d4949');
  m.rod(
    [-1.55, 1.48, 0] satisfies [number, number, number],
    [-1.55, 2.13, 0] satisfies [number, number, number],
    0.018,
    '#c8cbbd',
    8,
  );
  m.rod(
    [-1.81, 1.93, 0] satisfies [number, number, number],
    [-1.3, 1.93, 0] satisfies [number, number, number],
    0.013,
    '#c8cbbd',
    6,
  );
  for (const side of [-1, 1] satisfies [number, number]) {
    m.sphere(-2.17, 0.64, side * 0.59, 0.32, 0.12, 0.1, '#bb794e', 12, 6);
    for (let x = -2.65; x < 2.65; x += 0.35)
      m.rod(
        [x, 0.51, side * 0.57] satisfies [number, number, number],
        [x, 0.72, side * 0.57] satisfies [number, number, number],
        0.008,
        '#bdc4b9',
        4,
      );
    m.rod(
      [-2.65, 0.72, side * 0.57] satisfies [number, number, number],
      [2.65, 0.72, side * 0.57] satisfies [number, number, number],
      0.009,
      '#bdc4b9',
      4,
    );
  }
}

/** A continuous channel loop, sampled once by distance for steady ship speeds. */
export function createBayShipping(scale = 1.5) {
  const control = [
      [59, 17] satisfies [number, number],
      [67, 16] satisfies [number, number],
      [71, 9] satisfies [number, number],
      [65, 2] satisfies [number, number],
      [55, 3] satisfies [number, number],
      [53, 8] satisfies [number, number],
    ],
    points: number[][] = [];
  for (let i = 0; i < control.length; i++)
    for (let j = 0; j < 32; j++) {
      const t = j / 32,
        a = control[(i + control.length - 1) % control.length],
        b = control[i],
        c = control[(i + 1) % control.length],
        d = control[(i + 2) % control.length];
      points.push(
        ([0, 1] satisfies [number, number]).map(
          (k) =>
            0.5 *
            (2 * b[k] +
              (-a[k] + c[k]) * t +
              (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t +
              (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t) *
            scale,
        ),
      );
    }
  const lengths = [0];
  for (let i = 1; i <= points.length; i++) {
    const a = points[i - 1],
      b = points[i % points.length];
    lengths.push(lengths[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = requiredValue(lengths.at(-1), 'Shipping route length'),
    models = ([0, 1] satisfies [number, number]).map((variant) => {
      const mesh = new Mesh();
      drawTanker(mesh, variant);
      return mesh;
    });
  function sample(seconds: number, ship = 0) {
    const distance = (((seconds * 0.43 + ship * length * 0.5) % length) + length) % length;
    let i = 0;
    while (lengths[i + 1] < distance) i++;
    const a = points[i],
      b = points[(i + 1) % points.length],
      t = (distance - lengths[i]) / (lengths[i + 1] - lengths[i]);
    return {
      x: a[0] + (b[0] - a[0]) * t,
      z: a[1] + (b[1] - a[1]) * t,
      angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
    };
  }
  function draw(m: Mesh, time: number, viewer: number[], reduced = false) {
    for (let ship = 0; ship < 2; ship++) {
      const p = sample(reduced ? 12 : time * 0.001, ship);
      if (Math.hypot(p.x - viewer[0], p.z - viewer[1]) > 100) continue;
      pose(m, p.x, 0.06, p.z, p.angle, () => {
        const data = models[ship].data;
        for (let i = 0; i < data.length; i++) m.data.push(data[i]);
      });
      for (const side of [-1, 1] satisfies [number, number])
        for (let j = 0; j < 3; j++) {
          const c = Math.cos(p.angle),
            s = Math.sin(p.angle),
            at = (u: number, v: number) => [p.x + u * c - v * s, 0.035, p.z + u * s + v * c];
          m.rod(
            at(-3 - j * 0.7, side * (0.3 + j * 0.22)),
            at(-3.55 - j * 0.7, side * (0.4 + j * 0.22)),
            0.018,
            '#91b6b1',
            4,
          );
        }
    }
  }
  return { sample, draw, count: 2, length };
}
