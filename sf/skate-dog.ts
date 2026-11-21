// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

/** A short, prevalidated park-side route. Greetings rearm only after the
 * visitor leaves the area, so the patrol cannot repeatedly bark at a bystander. */
export function createSkateDog(
  points: readonly { x: number; z: number }[],
  { onWoof = () => {} }: { onWoof?: (() => void) | (() => number) } | undefined = {},
) {
  if (
    points.length < 2 ||
    points.every((p) => Math.hypot(p.x - points[0].x, p.z - points[0].z) < 1e-6)
  )
    throw new Error('The skateboarding dog needs a nonzero route');
  const center = {
    x: points.reduce((v, p) => v + p.x, 0) / points.length,
    z: points.reduce((v, p) => v + p.z, 0) / points.length,
  };
  const state = {
    x: points[0].x,
    z: points[0].z,
    angle: Math.atan2(points[1].z - points[0].z, points[1].x - points[0].x),
    travel: 0,
    elapsed: 0,
    speechUntil: 0,
    nextWoof: 0,
    greeted: false,
    woofs: 0,
    look: 0,
  };
  let target = 1,
    direction = 1;
  const sight = {
    id: 'dolores-skate-dog',
    kind: 'skate-dog',
    label: contentText('skate-dog.createSkateDog.label-1', {}),
    hiddenFromDirectory: true,
    entry: { x: state.x - 0.5, y: state.z - 0.5 },
    description: contentText('skate-dog.createSkateDog.description-2', {}),
  };
  function update(
    dt: number,
    time: number,
    visitor: { x: number; z: number },
    { paused = false, canGreet = true } = {},
  ) {
    if (paused || dt <= 0) return;
    state.elapsed += dt;
    let budget = dt * 0.95;
    while (budget > 1e-8) {
      const p = points[target],
        dx = p.x - state.x,
        dz = p.z - state.z,
        d = Math.hypot(dx, dz),
        step = Math.min(d, budget);
      if (d > 1e-8) {
        state.x += (dx / d) * step;
        state.z += (dz / d) * step;
        state.travel += step;
        budget -= step;
      }
      if (d <= step + 1e-8) {
        if (target === points.length - 1) direction = -1;
        else if (target === 0) direction = 1;
        target += direction;
      } else break;
    }
    const p = points[target],
      angle = Math.atan2(p.z - state.z, p.x - state.x),
      turn = Math.atan2(Math.sin(angle - state.angle), Math.cos(angle - state.angle));
    state.angle += Math.max(-dt * 5, Math.min(dt * 5, turn));
    sight.entry = { x: state.x - 0.5, y: state.z - 0.5 };
    if (Math.hypot(visitor.x - center.x, visitor.z - center.z) > 6) state.greeted = false;
    if (
      canGreet &&
      !state.greeted &&
      time >= state.nextWoof &&
      Math.hypot(visitor.x - state.x, visitor.z - state.z) < 3.5
    ) {
      state.greeted = true;
      state.woofs++;
      state.speechUntil = time + 2200;
      state.nextWoof = time + 6000;
      onWoof();
    }
    const look = Math.atan2(visitor.z - state.z, visitor.x - state.x) - state.angle;
    state.look =
      time < state.speechUntil
        ? Math.max(-0.8, Math.min(0.8, Math.atan2(Math.sin(look), Math.cos(look))))
        : 0;
  }
  function draw(
    m: Mesh,
    time: number,
    ground: (arg0: number, arg1: number) => number,
    { reduced = false } = {},
  ) {
    const { x, z, angle } = state,
      base = ground(x, z) + 0.008,
      co = Math.cos(angle),
      si = Math.sin(angle),
      t = reduced ? 0 : state.elapsed;
    const slope = Math.atan2(
        ground(x + co * 0.43, z + si * 0.43) - ground(x - co * 0.43, z - si * 0.43),
        0.86,
      ),
      woof = time < state.speechUntil;
    const push = reduced ? 0 : Math.sin(Math.PI * Math.min(1, (t % 2.8) / 0.55)),
      wag = Math.sin(t * (woof ? 13 : 6)) * (woof ? 0.3 : 0.16);
    pose(m, x, base, z, angle, () => {
      const start = m.data.length,
        coat = '#b98a5a',
        cream = '#e8decb',
        dark = '#43443b';
      // Concave deck, rounded ends, trucks, and four rolling wheels.
      m.box(-0.48, 0.2, -0.21, 0.96, 0.055, 0.42, '#aa5e4d', 'wood');
      for (const end of [-1, 1] satisfies [number, number])
        m.sphere(end * 0.48, 0.235, 0, 0.14, 0.032, 0.21, '#b77458', 16, 8);
      m.box(-0.45, 0.258, -0.185, 0.9, 0.008, 0.37, '#515954');
      for (const axle of [-0.36, 0.36] satisfies [number, number]) {
        m.rod(
          [axle, 0.105, -0.27] satisfies [number, number, number],
          [axle, 0.105, 0.27] satisfies [number, number, number],
          0.025,
          '#b6beb3',
          10,
        );
        m.box(axle - 0.06, 0.14, -0.09, 0.12, 0.05, 0.18, '#86938e', { metal: 0.2 });
        for (const side of [-1, 1] satisfies [number, number]) {
          m.rod(
            [axle, 0.09, side * 0.22] satisfies [number, number, number],
            [axle, 0.09, side * 0.3] satisfies [number, number, number],
            0.078,
            '#d9c79e',
            16,
          );
          const a = state.travel / 0.078;
          m.rod(
            [axle, 0.09, side * 0.305] satisfies [number, number, number],
            [axle + Math.cos(a) * 0.05, 0.09 + Math.sin(a) * 0.05, side * 0.305] satisfies [
              number,
              number,
              number,
            ],
            0.012,
            '#8e8b75',
            6,
          );
        }
      }
      m.sphere(-0.03, 0.72, 0, 0.36, 0.2, 0.18, coat, 20, 12);
      m.sphere(0.12, 0.66, 0, 0.22, 0.16, 0.16, cream, 16, 10);
      for (const front of [-1, 1] satisfies [number, number])
        for (const side of [-1, 1] satisfies [number, number]) {
          const kick = front < 0 && side > 0 ? push : 0,
            hip = [front * 0.23, 0.67, side * 0.125] satisfies [number, number, number],
            knee = [front * 0.23 - kick * 0.1, 0.48, side * (0.13 + kick * 0.12)] satisfies [
              number,
              number,
              number,
            ],
            paw = [
              front * 0.23 - kick * 0.26,
              0.33 - kick * 0.27,
              side * (0.13 + kick * 0.24),
            ] satisfies [number, number, number];
          m.rod(hip, knee, 0.065, coat, 10);
          m.rod(knee, paw, 0.05, cream, 10);
          m.sphere(paw[0] + 0.02, paw[1], paw[2], 0.085, 0.055, 0.065, cream, 12, 8);
        }
      // Terrier head, white muzzle, floppy ears and a blue bandana.
      pose(m, 0.32, 0.94, 0, state.look, () => {
        m.sphere(0, 0, 0, 0.19, 0.18, 0.17, coat, 20, 12);
        m.sphere(0.09, -0.015, 0, 0.135, 0.13, 0.14, cream, 16, 10);
        m.sphere(0.2, -0.045, 0, 0.105, 0.07, 0.105, cream, 16, 9);
        m.sphere(0.285, -0.035, 0, 0.033, 0.03, 0.05, dark, 12, 8);
        if (woof) m.sphere(0.21, -0.095, 0, 0.07, 0.025, 0.055, dark, 12, 7);
        for (const side of [-1, 1] satisfies [number, number]) {
          m.sphere(0.09, 0.055, side * 0.13, 0.028, 0.032, 0.02, dark, 12, 8);
          m.sphere(0.104, 0.066, side * 0.14, 0.007, 0.008, 0.007, cream, 8, 5);
          const flop = Math.sin(t * 4 + side) * 0.015;
          m.sphere(-0.075, -0.03 + flop, side * 0.17, 0.09, 0.15, 0.045, '#956d4c', 14, 9);
        }
      });
      m.rod(
        [0.16, 0.79, -0.15] satisfies [number, number, number],
        [0.16, 0.79, 0.15] satisfies [number, number, number],
        0.035,
        '#648d9a',
        12,
      );
      m.tri(
        [0.18, 0.78, 0.14] satisfies [number, number, number],
        [0.05, 0.75, 0.15] satisfies [number, number, number],
        [0.1, 0.56, 0.12] satisfies [number, number, number],
        '#608a98',
      );
      let prev = [-0.32, 0.82, 0] satisfies [number, number, number];
      for (let i = 1; i <= 5; i++) {
        const f = i / 5,
          p = [-0.32 - f * 0.34, 0.82 + f * 0.22, Math.sin(f * 1.3) * wag] satisfies [
            number,
            number,
            number,
          ];
        m.rod(prev, p, 0.045 - f * 0.005, i > 3 ? cream : coat, 10);
        prev = p;
      }
      // Pitch the whole board and its rider onto the sampled pavement.
      const c = Math.cos(slope),
        s = Math.sin(slope);
      for (let i = start; i < m.data.length; i += 11) {
        const px = m.data[i],
          py = m.data[i + 1],
          nx = m.data[i + 3],
          ny = m.data[i + 4];
        m.data[i] = px * c - py * s;
        m.data[i + 1] = px * s + py * c;
        m.data[i + 3] = nx * c - ny * s;
        m.data[i + 4] = nx * s + ny * c;
      }
    });
  }
  return { state, sight, update, draw };
}
