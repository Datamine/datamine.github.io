import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { configuredDialogue } from './dialogue-config.ts';
import type { Actor } from './types/world.ts';

export function dogWalkerDialogue(npc: Actor) {
  return configuredDialogue('dog-walker', { ...npc, name: npc.named || npc.label });
}

/** Local +X is forward, matching the adult character's heading. */
export function drawBabyStroller(
  m: Mesh,
  parent: {
    x: number;
    z: number;
    angle: number;
    phase: number;
    strollerColor?: string;
    blanketColor?: string;
    babySkin?: string;
  },
  time: number,
  ground: (x: number, z: number) => number,
) {
  const { x, z, angle } = parent,
    co = Math.cos(angle),
    si = Math.sin(angle),
    base = ground(x + 0.7 * co, z + 0.7 * si) + 0.025;
  const fabric = parent.strollerColor || '#668d91',
    blanket = parent.blanketColor || '#d8aaa6',
    skin = parent.babySkin || '#ba9273';
  pose(m, x, base, z, angle, () => {
    for (const u of [0.38, 0.96] satisfies [number, number])
      for (const side of [-1, 1] satisfies [number, number]) {
        const v = side * 0.26;
        m.sphere(u, 0.12, v, 0.12, 0.12, 0.035, '#3e484a', 12, 6);
        m.sphere(u, 0.12, v + side * 0.037, 0.045, 0.045, 0.008, '#b9c7c4', 10, 5);
        for (let spoke = 0; spoke < 5; spoke++) {
          const a = spoke * Math.PI * 0.4 - parent.phase * 0.8;
          m.rod(
            [u, 0.12, v + side * 0.04] satisfies [number, number, number],
            [u + Math.cos(a) * 0.09, 0.12 + Math.sin(a) * 0.09, v + side * 0.04] satisfies [
              number,
              number,
              number,
            ],
            0.006,
            '#aab9b7',
            4,
          );
        }
      }
    for (const side of [-1, 1] satisfies [number, number]) {
      const v = side * 0.23;
      m.rod(
        [0.38, 0.15, v] satisfies [number, number, number],
        [0.87, 0.59, v] satisfies [number, number, number],
        0.022,
        '#b4c2bf',
        8,
        { metal: 0.25 },
      );
      m.rod(
        [0.96, 0.15, v] satisfies [number, number, number],
        [0.46, 0.61, v] satisfies [number, number, number],
        0.022,
        '#b4c2bf',
        8,
        { metal: 0.25 },
      );
      m.rod(
        [0.62, 0.47, v] satisfies [number, number, number],
        [0.34, 0.99, v] satisfies [number, number, number],
        0.023,
        '#b4c2bf',
        8,
        { metal: 0.25 },
      );
    }
    m.rod(
      [0.34, 0.99, -0.23] satisfies [number, number, number],
      [0.34, 0.99, 0.23] satisfies [number, number, number],
      0.027,
      '#384e52',
      10,
    );
    m.box(0.44, 0.42, -0.225, 0.53, 0.11, 0.45, fabric);
    m.box(0.45, 0.53, -0.21, 0.5, 0.025, 0.42, '#e3ddd1');
    for (const side of [-1, 1] satisfies [number, number])
      m.box(0.44, 0.53, side < 0 ? -0.23 : 0.2, 0.53, 0.1, 0.03, fabric);
    m.box(0.46, 0.29, -0.17, 0.46, 0.035, 0.34, '#667b78');
    // Curved fabric hood, open toward the baby and the street ahead.
    for (let i = 0; i < 12; i++) {
      const at = (a: number, v: number) =>
          [0.43 + 0.29 * (1 - Math.cos(a)), 0.59 + 0.29 * Math.sin(a), v] satisfies [
            number,
            number,
            number,
          ],
        a = (i * Math.PI) / 24,
        b = ((i + 1) * Math.PI) / 24;
      m.quad(at(a, -0.235), at(a, 0.235), at(b, 0.235), at(b, -0.235), fabric);
      if (i % 3 === 0) m.rod(at(b, -0.238), at(b, 0.238), 0.009, '#c4d2cd', 6);
      for (const side of [-1, 1] satisfies [number, number])
        m.tri(
          [0.43, 0.59, side * 0.235] satisfies [number, number, number],
          at(a, side * 0.235),
          at(b, side * 0.235),
          fabric,
        );
    }
    m.sphere(0.81, 0.58, 0, 0.15, 0.055, 0.15, blanket, 14, 7);
    m.sphere(0.65, 0.66, 0, 0.105, 0.1, 0.095, skin, 16, 8);
    for (const side of [-1, 1] satisfies [number, number]) {
      m.sphere(0.735, 0.687, side * 0.039, 0.009, 0.012, 0.012, '#3b3735', 8, 4);
      m.sphere(
        0.78,
        0.61 + Math.sin(time * 0.002 + side) * 0.012,
        side * 0.15,
        0.045,
        0.03,
        0.03,
        skin,
        10,
        5,
      );
    }
    m.sphere(0.751, 0.65, 0, 0.018, 0.018, 0.021, '#d7bd86', 10, 5);
  });
  return { x: x + 0.7 * co, z: z + 0.7 * si, base };
}

export function drawWalkingDog(
  m: Mesh,
  dog: {
    x: number;
    z: number;
    angle?: number;
    phase: number;
    moving?: boolean;
    color?: string;
    dark?: string;
  },
  time: number,
  ground: (x: number, z: number) => number,
  owner: { x: number; z: number; base: number; angle: number } | null = null,
) {
  const base = ground(dog.x, dog.z) + 0.025,
    phase = dog.moving ? dog.phase : 0,
    fur = dog.color || '#a8865b';
  pose(m, dog.x, base, dog.z, dog.angle || 0, () => {
    m.sphere(0, 0.38, 0, 0.34, 0.17, 0.14, fur, 16, 8);
    m.sphere(0.28, 0.5, 0, 0.15, 0.16, 0.14, fur, 14, 8);
    m.sphere(0.42, 0.45, 0, 0.13, 0.07, 0.085, '#d6c2a0', 12, 6);
    m.sphere(0.52, 0.47, 0, 0.025, 0.026, 0.035, '#303530', 8, 4);
    for (const s of [-1, 1] satisfies [number, number]) {
      m.sphere(0.22, 0.51, s * 0.13, 0.07, 0.14, 0.04, dog.dark || '#6b503b', 12, 6);
      m.sphere(0.34, 0.55, s * 0.113, 0.018, 0.019, 0.012, '#292f2c', 8, 4);
      for (const front of [-1, 1] satisfies [number, number]) {
        const swing = Math.sin(phase + (s === front ? 0 : Math.PI)) * 0.085,
          x = front * 0.23;
        m.rod(
          [x, 0.37, s * 0.1] satisfies [number, number, number],
          [x + swing, 0.09, s * 0.1] satisfies [number, number, number],
          0.045,
          fur,
          8,
        );
        m.sphere(x + swing, 0.07, s * 0.1, 0.075, 0.05, 0.055, fur, 10, 5);
      }
    }
    m.rod(
      [-0.28, 0.42, 0] satisfies [number, number, number],
      [-0.48, 0.58, Math.sin(time * 0.005) * 0.09] satisfies [number, number, number],
      0.035,
      fur,
      8,
    );
    m.rod(
      [0.21, 0.36, -0.13] satisfies [number, number, number],
      [0.24, 0.6, -0.09] satisfies [number, number, number],
      0.02,
      '#9d515b',
      8,
    );
  });
  if (owner) drawDogLeash(m, dog, ground, owner);
}

/** Decorative leash geometry must not enlarge the dog's interaction target
 * to include the owner's hand and torso. Register the dog before drawing it. */
export function drawDogLeash(
  m: Mesh,
  dog: { x: number; z: number },
  ground: (x: number, z: number) => number,
  owner: { x: number; z: number; base: number; angle: number },
) {
  const base = ground(dog.x, dog.z) + 0.025,
    hand = [
      owner.x - Math.sin(owner.angle) * 0.3 + Math.cos(owner.angle) * 0.12,
      owner.base + 0.86,
      owner.z + Math.cos(owner.angle) * 0.3 + Math.sin(owner.angle) * 0.12,
    ],
    collar = [dog.x, base + 0.47, dog.z] satisfies [number, number, number],
    mid = hand.map((v, i) => (v + collar[i]) * 0.5 - (i === 1 ? 0.18 : 0));
  m.rod(hand, mid, 0.008, '#8f5457', 4);
  m.rod(mid, collar, 0.008, '#8f5457', 4);
}
