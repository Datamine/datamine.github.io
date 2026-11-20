import { pose } from './geometry.js';
import { drawFacadeWindow } from './windows.js';
import { STARTUP_HQ, AIRSHIP_TERMINAL } from './airship.js';
import { MERCHANTS } from './economy.js';

export function drawStartupHQ(m) {
  const { x, z } = STARTUP_HQ,
    base = AIRSHIP_TERMINAL.base,
    start = m.data.length;
  pose(m, x, base, z, 0, () => {
    m.box(-1.7, 0, -1.4, 3.4, 0.13, 2.8, '#ada995', 'stone');
    m.box(-1.58, 0.13, -1.3, 3.16, 1.8, 2.6, '#91a99b', 'clapboard');
    for (const xx of [-1.05, 0.72])
      drawFacadeWindow(m, {
        plane: -1.3,
        along: xx - 0.22,
        y: 0.63,
        w: 0.44,
        h: 0.62,
        far: true,
        trim: '#e5deca',
        seed: xx,
      });
    m.box(-0.26, 0.13, -1.335, 0.52, 1.35, 0.035, '#536f69', 'wood');
    m.box(-0.19, 0.9, -1.375, 0.38, 0.43, 0.02, '#89a6a2', 'glass');
    m.sphere(0.16, 0.78, -1.4, 0.023, 0.023, 0.015, '#d9bb70', 12, 6);
    const a = [-1.7, 1.94, -1.4],
      b = [1.7, 1.94, -1.4],
      c = [1.7, 1.94, 1.4],
      d = [-1.7, 1.94, 1.4],
      p = [0, 2.65, -1.4],
      q = [0, 2.65, 1.4];
    m.quad(a, d, q, p, '#7b6b60', 'shingles');
    m.quad(p, q, c, b, '#887464', 'shingles');
    m.tri(a, p, b, '#a9bbb0', 'clapboard');
    m.tri(d, c, q, '#a9bbb0', 'clapboard');
    m.box(-0.35, 1.55, -1.46, 0.7, 0.7, 0.07, '#f26522');
    for (const [a, b] of [
      [
        [0, 1.88, -1.505],
        [-0.17, 2.12, -1.505],
      ],
      [
        [0, 1.88, -1.505],
        [0.17, 2.12, -1.505],
      ],
      [
        [0, 1.67, -1.505],
        [0, 1.88, -1.505],
      ],
    ])
      m.rod(a, b, 0.025, '#fff6e7', 4);
    for (let i = 0; i < 3; i++)
      m.box(
        -0.36 - i * 0.07,
        0.02 + i * 0.04,
        -1.7 + i * 0.08,
        0.72 + i * 0.14,
        0.04,
        0.1,
        '#c8bba0',
        'stone',
      );
    m.box(0.9, 1.95, 0.6, 0.18, 0.45, 0.25, '#aa7a5e', 'brick');
  });
  return {
    start,
    count: m.data.length - start,
    lo: [x - 1.7, base, z - 1.75],
    hi: [x + 1.7, base + 2.65, z + 1.4],
  };
}

export function merchant(kind, x, z, base) {
  return {
    id: kind + '-merchant',
    kind,
    label: MERCHANTS[kind].name,
    ...MERCHANTS[kind],
    x,
    z,
    base,
    height: 1.8,
    angle: -Math.PI / 2,
    hold: Infinity,
  };
}

export function drawGrainStand(m, npc) {
  pose(m, npc.x, npc.base, npc.z, 0, () => {
    for (const x of [-0.6, -0.35]) {
      m.sphere(x, 0.23, 0.45, 0.16, 0.25, 0.15, '#b6a176', 16, 8, 'wood');
      m.cylinder(x, 0.44, 0.45, 0.12, 0.025, '#d8c48d', 16);
      for (let j = 0; j < 8; j++)
        m.sphere(
          x + Math.cos(j) * 0.07,
          0.47,
          0.45 + Math.sin(j) * 0.07,
          0.026,
          0.018,
          0.02,
          '#d8b45e',
          6,
          4,
        );
    }
  });
}
