import { whaleInteractionTarget } from './interaction-targets.ts';
import { Mesh, pose } from './geometry.ts';

function whaleMesh() {
  const m = new Mesh();
  m.sphere(0, -0.16, 0, 2.15, 0.58, 0.67, '#475f65', 28, 14);
  m.sphere(1.52, -0.08, 0, 0.85, 0.42, 0.57, '#526c71', 24, 12);
  m.sphere(1.6, -0.32, 0, 0.7, 0.16, 0.48, '#9ba9a5', 20, 8);
  m.sphere(-1.9, -0.12, 0, 0.9, 0.27, 0.32, '#475f65', 20, 10);
  for (const side of [-1, 1] satisfies [number, number]) {
    m.tri(
      [0.2, -0.2, side * 0.4] satisfies [number, number, number],
      [-0.7, -0.13, side * 1.55] satisfies [number, number, number],
      [-0.45, -0.31, side * 0.45] satisfies [number, number, number],
      '#71888a',
    );
    m.tri(
      [-2.1, 0.08, side * 0.12] satisfies [number, number, number],
      [-3.15, 0.45, side * 1.15] satisfies [number, number, number],
      [-2.93, 0.3, 0] satisfies [number, number, number],
      '#607a7f',
    );
    m.tri(
      [-2.1, 0.08, side * 0.12] satisfies [number, number, number],
      [-2.93, 0.3, 0] satisfies [number, number, number],
      [-3.15, 0.45, side * 1.15] satisfies [number, number, number],
      '#8ba1a0',
    );
    m.sphere(2, 0.03, side * 0.44, 0.045, 0.045, 0.018, '#172d32', 10, 6);
    for (let i = 0; i < 5; i++)
      m.sphere(
        1.8 + i * 0.065,
        0.24 - i * 0.045,
        side * (0.2 + i * 0.05),
        0.027,
        0.027,
        0.027,
        '#adb6ac',
        8,
        4,
      );
  }
  m.tri(
    [-0.7, 0.32, 0] satisfies [number, number, number],
    [-1.15, 0.79, 0] satisfies [number, number, number],
    [-1.4, 0.3, 0] satisfies [number, number, number],
    '#3e5960',
  );
  return m;
}
let whaleBody: Mesh;
export const WHALE_JUMP_LEAD_MS = 800;
export function createWhales() {
  const centers = [
    [-7, 44] satisfies [number, number],
    [-16, 62] satisfies [number, number],
    [-9, 78] satisfies [number, number],
  ];
  function sample(time: number, index = 0) {
    const t = time * 0.000045 + index * 2.1,
      [x, z] = centers[index],
      cycle = (time * 0.001 + index * 9) % 27;
    return {
      x: x + Math.cos(t) * 3,
      z: z + Math.sin(t) * 4,
      angle: Math.atan2(Math.cos(t) * 4, -Math.sin(t) * 3),
      y: -0.02 + Math.sin((cycle * Math.PI) / 13.5) * 0.12,
      blowing: cycle < 4,
      cycle,
    };
  }
  function draw(
    m: Mesh,
    time: number,
    viewer: number[],
    reduced = false,
    addTarget: (start: number, sight: ReturnType<typeof whaleInteractionTarget>) => void = () => {},
  ) {
    whaleBody ??= whaleMesh();
    for (let i = 0; i < centers.length; i++) {
      const p = sample(time, i);
      if (reduced) {
        p.y = -0.02;
        p.blowing = false;
      }
      if (Math.hypot(p.x - viewer[0], p.z - viewer[1]) > 38) continue;
      const start = m.data.length;
      pose(m, p.x, p.y, p.z, p.angle, () => {
        for (const value of whaleBody.data) m.data.push(value);
        if (p.blowing)
          for (let j = 0; j < 9; j++) {
            const y = 0.48 + j * 0.14,
              spread = j * 0.035;
            for (const side of [-1, 1] satisfies [number, number])
              m.sphere(
                1.1 + side * spread,
                y,
                Math.sin(j * 2) * spread,
                0.025 + j * 0.006,
                0.06,
                0.025 + j * 0.006,
                '#c9ddd9',
                8,
                4,
              );
          }
      });
      addTarget(start, whaleInteractionTarget(i));
    }
  }
  return { count: centers.length, sample, draw };
}
