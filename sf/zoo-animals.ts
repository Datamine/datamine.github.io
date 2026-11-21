// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';

export const ZOO_ENCLOSURES = Object.freeze(
  [
    // Stack the eastern habitats on dry land below Merced's southern lobe.
    // The compact pens leave a visitor aisle and stay inside the city terrain.
    {
      id: 'zoo-giraffes',
      label: contentText('zoo-animals.module.label-1', {}),
      species: 'giraffe',
      x: 23.6,
      z: 94.6,
      w: 3.4,
      d: 2.6,
      count: 1,
      entry: { x: 21.2, y: 94.1 },
      description: contentText('zoo-animals.module.description-2', {}),
    },
    {
      id: 'zoo-penguins',
      label: contentText('zoo-animals.module.label-3', {}),
      species: 'penguin',
      x: 23.6,
      z: 91.4,
      w: 3.4,
      d: 2.8,
      count: 4,
      entry: { x: 21.2, y: 90.9 },
      description: contentText('zoo-animals.module.description-4', {}),
    },
    {
      id: 'zoo-monkeys',
      label: contentText('zoo-animals.module.label-5', {}),
      species: 'monkey',
      x: 18.7,
      z: 97.5,
      w: 3.4,
      d: 2.2,
      count: 2,
      entry: { x: 15.9, y: 97.3 },
      description: contentText('zoo-animals.module.description-6', {}),
    },
    {
      id: 'zoo-deer',
      label: contentText('zoo-animals.module.label-7', {}),
      species: 'deer',
      x: 18.7,
      z: 94.7,
      w: 3.4,
      d: 2.2,
      count: 2,
      entry: { x: 15.9, y: 94.2 },
      description: contentText('zoo-animals.module.description-8', {}),
    },
  ].map((value) => Object.freeze(value)),
);

export function drawZooEnclosures(
  m: Mesh,
  ground: (x: number, z: number) => number,
  { include = () => true }: { include?: (site: (typeof ZOO_ENCLOSURES)[number]) => boolean } = {},
) {
  return ZOO_ENCLOSURES.filter(include).map((s) => {
    const start = m.data.length,
      base = ground(s.x, s.z),
      left = s.x - s.w / 2,
      top = s.z - s.d / 2;
    m.box(
      left,
      base - 0.04,
      top,
      s.w,
      0.06,
      s.d,
      s.species === 'penguin' ? '#b4b9aa' : '#87956a',
      s.species === 'penguin' ? 'stone' : 'grass',
    );
    const corners = [
      [left, top] satisfies [number, number],
      [left + s.w, top] satisfies [number, number],
      [left + s.w, top + s.d] satisfies [number, number],
      [left, top + s.d] satisfies [number, number],
    ];
    for (let side = 0; side < 4; side++) {
      const a = corners[side],
        b = corners[(side + 1) % 4],
        n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.45);
      for (let i = 0; i <= n; i++) {
        const x = a[0] + ((b[0] - a[0]) * i) / n,
          z = a[1] + ((b[1] - a[1]) * i) / n;
        m.cylinder(x, base, z, 0.025, 0.85, '#657d70', 8);
      }
      for (const h of [0.22, 0.55, 0.85] satisfies [number, number, number])
        m.rod(
          [a[0], base + h, a[1]] satisfies [number, number, number],
          [b[0], base + h, b[1]] satisfies [number, number, number],
          0.018,
          '#71867b',
          6,
        );
    }
    if (s.species === 'monkey') {
      for (const dx of [-0.9, 0.9] satisfies [number, number])
        m.cylinder(s.x + dx, base, s.z, 0.06, 1.7, '#8c7750', 12, 0.06, 'wood');
      m.rod(
        [s.x - 0.9, base + 1.55, s.z] satisfies [number, number, number],
        [s.x + 0.9, base + 1.55, s.z] satisfies [number, number, number],
        0.035,
        '#9e8662',
        8,
        'wood',
      );
    }
    if (s.species === 'penguin') {
      m.cylinder(s.x + 0.65, base + 0.025, s.z, 0.64, 0.035, '#719eaa', 40, 0.64, { water: 0.5 });
      for (const [x, z, r] of [
        [-0.9, -0.8, 0.28] satisfies [number, number, number],
        [0.8, 0.9, 0.3] satisfies [number, number, number],
      ])
        m.sphere(s.x + x, base + 0.11, s.z + z, r, 0.18, r * 0.8, '#a3aca4', 14, 8, 'stone');
    } else {
      m.box(s.x - 0.6, base + 0.05, top + 0.17, 1.2, 0.23, 0.32, '#967953', 'wood');
      m.box(s.x - 0.5, base + 0.285, top + 0.2, 1, 0.035, 0.25, '#c4af63');
    }
    const lo = [left - 0.03, base - 0.04, top - 0.03] satisfies [number, number, number],
      hi = [left + s.w + 0.03, base + 2.8, top + s.d + 0.03] satisfies [number, number, number];
    return {
      ...s,
      kind: 'animals',
      base,
      start,
      count: m.data.length - start,
      lo,
      hi,
      footprint: corners,
    };
  });
}

function drawHoofedAnimal(m: Mesh, s: { species: string }, phase: number) {
  const tall = s.species === 'giraffe',
    fur = tall ? '#d6ad62' : '#ad8056',
    dark = tall ? '#8c633c' : '#68513d',
    body = tall ? 0.95 : 0.53;
  m.sphere(0, body, 0, tall ? 0.24 : 0.2, tall ? 0.34 : 0.23, tall ? 0.48 : 0.34, fur, 20, 12);
  for (const side of [-1, 1] satisfies [number, number])
    for (const end of [-1, 1] satisfies [number, number]) {
      const x = side * (tall ? 0.14 : 0.12),
        z = end * (tall ? 0.3 : 0.22),
        swing = Math.sin(phase + (side === end ? Math.PI : 0)) * 0.07;
      m.rod(
        [x, body - 0.14, z] satisfies [number, number, number],
        [x, body * 0.46, z + swing] satisfies [number, number, number],
        tall ? 0.055 : 0.043,
        fur,
        10,
      );
      m.rod(
        [x, body * 0.46, z + swing] satisfies [number, number, number],
        [x, 0.065, z - swing] satisfies [number, number, number],
        tall ? 0.04 : 0.03,
        fur,
        10,
      );
      m.sphere(x, 0.055, z - swing, 0.055, 0.045, 0.07, dark, 10, 6);
    }
  m.rod(
    [0, body + 0.12, 0.26] satisfies [number, number, number],
    [0, tall ? 1.97 : 0.95, tall ? 0.51 : 0.39],
    tall ? 0.115 : 0.075,
    fur,
    14,
  );
  const head = tall ? 2.05 : 1.0;
  m.sphere(0, head, 0.51, tall ? 0.13 : 0.11, tall ? 0.16 : 0.12, tall ? 0.25 : 0.16, fur, 18, 10);
  for (const side of [-1, 1] satisfies [number, number]) {
    m.sphere(side * 0.13, head + 0.13, 0.42, 0.11, 0.045, 0.06, fur, 12, 6);
    m.sphere(side * 0.115, head + 0.025, 0.6, 0.023, 0.026, 0.022, '#30392b', 10, 6);
    m.rod(
      [side * 0.065, head + 0.1, 0.48] satisfies [number, number, number],
      [side * 0.085, head + (tall ? 0.29 : 0.35), 0.44] satisfies [number, number, number],
      0.018,
      dark,
      8,
    );
    if (!tall)
      m.rod(
        [side * 0.08, head + 0.22, 0.46] satisfies [number, number, number],
        [side * 0.16, head + 0.31, 0.5] satisfies [number, number, number],
        0.012,
        dark,
        6,
      );
  }
  m.rod(
    [0, body, -0.33],
    [0.05 * Math.sin(phase), body - 0.23, -0.53] satisfies [number, number, number],
    0.025,
    fur,
    8,
  );
  if (tall) {
    for (const side of [-1, 1] satisfies [number, number])
      for (let i = 0; i < 6; i++)
        m.sphere(
          side * 0.225,
          body + (i % 2) * 0.13 - 0.04,
          -0.3 + i * 0.12,
          0.015,
          0.07,
          0.045,
          dark,
          10,
          6,
        );
    for (let i = 0; i < 6; i++)
      m.sphere(0.105, 1.2 + i * 0.13, 0.31 + i * 0.03, 0.025, 0.045, 0.045, dark, 10, 6);
  } else
    for (const side of [-1, 1] satisfies [number, number])
      for (let i = 0; i < 4; i++)
        m.sphere(side * 0.18, 0.58, -0.18 + i * 0.11, 0.018, 0.025, 0.025, '#dfcba1', 8, 6);
}

function drawZooPenguin(m: Mesh, phase: number) {
  m.sphere(0, 0.29, 0, 0.14, 0.25, 0.13, '#354451', 18, 12);
  m.sphere(0, 0.28, 0.095, 0.105, 0.19, 0.05, '#ecebd8', 16, 10);
  m.sphere(0, 0.55, 0.02, 0.12, 0.12, 0.115, '#354451', 18, 10);
  m.rod(
    [0, 0.52, 0.11] satisfies [number, number, number],
    [0, 0.5, 0.23] satisfies [number, number, number],
    0.045,
    '#d9a357',
    10,
  );
  for (const side of [-1, 1] satisfies [number, number]) {
    m.sphere(
      side * 0.065,
      0.035,
      0.055 + Math.sin(phase + side) * 0.025,
      0.055,
      0.025,
      0.085,
      '#c79652',
      10,
      6,
    );
    m.rod(
      [side * 0.115, 0.4, 0] satisfies [number, number, number],
      [side * (0.18 + 0.025 * Math.sin(phase)), 0.18, -0.04] satisfies [number, number, number],
      0.045,
      '#354451',
      12,
    );
    m.sphere(side * 0.08, 0.56, 0.105, 0.018, 0.02, 0.018, '#1f292b', 10, 6);
  }
}

export function drawZooAnimals(
  m: Mesh,
  time: number,
  ground: (x: number, z: number) => number,
  {
    reduced = false,
    near = () => true,
    visible = () => true,
    monkeyTaken = false,
  }: {
    reduced?: boolean;
    near?: (x: number, z: number) => boolean;
    visible?: (x: number, z: number, base: number) => boolean;
    monkeyTaken?: boolean;
  } = {},
) {
  for (const s of ZOO_ENCLOSURES) {
    if (!near(s.x, s.z)) continue;
    for (let i = 0; i < s.count; i++) {
      if (s.species === 'monkey' && i === 0 && monkeyTaken) continue;
      const t = (reduced ? 0 : time * 0.00018) + (i * Math.PI * 2) / s.count,
        a = t + (s.species === 'penguin' ? i * 0.4 : 0);
      const x = s.x + Math.cos(a) * (s.w / 2 - 0.75),
        z = s.z + Math.sin(a) * (s.d / 2 - 0.65),
        heading = Math.atan2(Math.cos(a) * (s.d / 2 - 0.65), -Math.sin(a) * (s.w / 2 - 0.75));
      const base = ground(s.x, s.z) + 0.03;
      if (!visible(x, z, base)) continue;
      pose(m, x, base, z, heading - Math.PI / 2, () => {
        if (s.species === 'monkey') drawMonkey(m, reduced ? 0 : time * 0.004 + i);
        else if (s.species === 'penguin') drawZooPenguin(m, reduced ? 0 : time * 0.006 + i);
        else drawHoofedAnimal(m, s, reduced ? 0 : time * 0.004 + i * Math.PI);
      });
    }
  }
}

/** Small expressive primate, reused in the habitat, on the player's shoulder,
 * and beside the professor after the quest. Local feet begin at y=0. */
export function drawMonkey(m: Mesh, phase = 0) {
  const fur = '#997348',
    face = '#d9ba89',
    dark = '#3d3930';
  m.sphere(0, 0.32, 0, 0.16, 0.23, 0.14, fur, 14, 8);
  m.sphere(0, 0.6, 0.035, 0.16, 0.15, 0.14, fur, 14, 8);
  m.sphere(0, 0.58, 0.14, 0.115, 0.095, 0.035, face, 12, 8);
  for (const side of [-1, 1] satisfies [number, number]) {
    m.sphere(side * 0.16, 0.6, 0.025, 0.055, 0.07, 0.035, face, 10, 6);
    m.sphere(side * 0.054, 0.61, 0.17, 0.021, 0.024, 0.016, dark, 8, 5);
    const swing = Math.sin(phase + side) * 0.025;
    m.rod(
      [side * 0.14, 0.43, 0] satisfies [number, number, number],
      [side * 0.23, 0.18, 0.09 + swing] satisfies [number, number, number],
      0.035,
      fur,
      10,
    );
    m.sphere(side * 0.23, 0.17, 0.09 + swing, 0.045, 0.04, 0.055, face, 10, 6);
    m.rod(
      [side * 0.085, 0.2, 0] satisfies [number, number, number],
      [side * 0.12, 0.04, 0.11 - swing] satisfies [number, number, number],
      0.045,
      fur,
      10,
    );
    m.sphere(side * 0.12, 0.035, 0.13 - swing, 0.055, 0.03, 0.08, dark, 10, 6);
  }
  let previous = [0, 0.25, -0.12] satisfies [number, number, number];
  for (let i = 1; i <= 9; i++) {
    const a = (i * Math.PI) / 8,
      next = [Math.sin(a) * 0.18, 0.25 + Math.sin(a * 0.5) * 0.18, -0.12 - i * 0.025] satisfies [
        number,
        number,
        number,
      ];
    m.rod(previous, next, 0.025, fur, 8);
    previous = next;
  }
}
