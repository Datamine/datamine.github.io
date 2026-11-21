// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export function createPaintedBunny(x: number, z: number) {
  const state = { x, z, angle: -Math.PI / 2, pets: 0, petAt: 0, petUntil: 0 };
  const sight = {
    id: 'painted-bunny',
    kind: 'bunny',
    label: contentText('bunny.createPaintedBunny.label-1', {}),
    hiddenFromDirectory: true,
    entry: { x: x - 0.5, y: z - 0.5 },
    description: contentText('bunny.createPaintedBunny.description-2', {}),
  };
  function pet(time: number, angle = state.angle) {
    state.pets++;
    state.petAt = time;
    state.petUntil = time + 3000;
    state.angle = angle;
  }
  function draw(
    m: Mesh,
    time: number,
    ground: (arg0: number, arg1: number) => number,
    { reduced = false, cameraAngle = 0 } = {},
  ) {
    const petted = time < state.petUntil,
      t = reduced ? 0 : time * 0.001,
      settle = petted ? 0.035 * Math.sin(t * 5) : 0,
      base = ground(x, z) + 0.015;
    pose(m, x, base, z, state.angle, () => {
      const fur = '#dbd0b9',
        cream = '#f0e8d7',
        pink = '#cfa5a2';
      m.sphere(-0.04, 0.25, 0, 0.29, 0.23, 0.2, fur, 20, 12);
      m.sphere(0.2, 0.37 - settle, 0, 0.19, 0.17, 0.16, cream, 20, 12);
      m.sphere(-0.31, 0.27, 0, 0.105, 0.105, 0.105, cream, 16, 9);
      for (const side of [-1, 1] satisfies [number, number]) {
        m.sphere(-0.18, 0.065, side * 0.15, 0.14, 0.065, 0.105, cream, 14, 8);
        m.sphere(0.2, 0.055, side * 0.11, 0.095, 0.05, 0.065, cream, 12, 8);
        const earX = 0.17 + Math.sin(t * 1.7 + side) * 0.018 + (petted ? 0.035 : 0),
          earY = 0.66 - settle;
        m.sphere(earX, earY, side * 0.085, 0.055, 0.25, 0.048, fur, 14, 10);
        m.sphere(earX + 0.042, earY + 0.005, side * 0.085, 0.018, 0.18, 0.028, pink, 12, 8);
        m.sphere(0.32, 0.425 - settle, side * 0.127, 0.032, 0.037, 0.023, '#383c36', 12, 8);
        m.sphere(0.337, 0.438 - settle, side * 0.139, 0.008, 0.009, 0.008, cream, 8, 5);
        m.sphere(0.355, 0.32 - settle, side * 0.065, 0.075, 0.055, 0.065, cream, 12, 8);
        for (let i = 0; i < 3; i++)
          m.rod(
            [0.37, 0.32 - settle, side * 0.065] satisfies [number, number, number],
            [0.4 + i * 0.014, 0.32 - settle + (i - 1) * 0.035, side * 0.22] satisfies [
              number,
              number,
              number,
            ],
            0.0035,
            '#b1ac9d',
            4,
          );
      }
      m.sphere(
        0.405 + 0.003 * Math.sin(t * 9),
        0.354 - settle,
        0,
        0.024,
        0.019,
        0.032,
        pink,
        12,
        8,
      );
    });
    if (petted && !reduced)
      for (let i = 0; i < 3; i++) {
        const f = (time - state.petAt) / 1500 - i * 0.28;
        if (f <= 0 || f >= 1) continue;
        const size = 0.1 * Math.sin(Math.PI * f);
        pose(m, x + (i - 1) * 0.16, base + 0.85 + f * 0.55, z, cameraAngle - Math.PI / 2, () => {
          m.sphere(-size * 0.34, 0, 0, size * 0.5, size * 0.48, size * 0.16, '#d88f91', 10, 6);
          m.sphere(size * 0.34, 0, 0, size * 0.5, size * 0.48, size * 0.16, '#d88f91', 10, 6);
          m.tri(
            [-size * 0.77, 0, size * 0.08] satisfies [number, number, number],
            [0, -size * 0.9, size * 0.08] satisfies [number, number, number],
            [size * 0.77, 0, size * 0.08] satisfies [number, number, number],
            '#d88f91',
          );
          m.tri(
            [size * 0.77, 0, -size * 0.08] satisfies [number, number, number],
            [0, -size * 0.9, -size * 0.08] satisfies [number, number, number],
            [-size * 0.77, 0, -size * 0.08] satisfies [number, number, number],
            '#d88f91',
          );
        });
      }
  }
  return { state, sight, pet, draw };
}
