import type { AircraftPoint, VisibleBomb, VisibleCrash } from './types/aircraft.ts';
import type { CharacterAppearance } from './characters.ts';
import { Mesh, pose, rand } from './geometry.ts';
import { CAVE_TILES, ILLUMINATI_CAVE } from './map-instances.ts';
import { drawCharacter } from './characters.ts';

const BOMBER_MODEL_SCALE = 0.25;

export function drawSecretStair(m: Mesh, x: number, y: number, z: number, angle = 0) {
  pose(m, x, y, z, angle, () => {
    m.box(-0.38, 0.015, -0.4, 0.76, 0.018, 0.8, '#192523', 'stone');
    for (let i = 0; i < 5; i++)
      m.box(
        -0.32,
        0.025 - i * 0.055,
        -0.33 + i * 0.13,
        0.64,
        0.06,
        0.13,
        (['#929a81', '#758172'] satisfies [string, string])[i % 2],
        'stone',
      );
    for (const xx of [-0.4, 0.4] satisfies [number, number]) {
      m.rod(
        [xx, 0.08, -0.4] satisfies [number, number, number],
        [xx, 0.65, -0.4] satisfies [number, number, number],
        0.022,
        '#bca772',
        9,
      );
      m.rod(
        [xx, 0.65, -0.4] satisfies [number, number, number],
        [xx, 0.65, 0.4] satisfies [number, number, number],
        0.022,
        '#bca772',
        9,
      );
    }
  });
}
export function drawStealthBomber(
  m: Mesh,
  p: AircraftPoint,
  heading = 0,
  {
    parked = false,
    bank = 0,
    pitch = 0,
    time = 0,
    pilot = null,
  }: {
    parked?: boolean;
    bank?: number;
    pitch?: number;
    time?: number;
    pilot?: CharacterAppearance | null;
  } = {},
) {
  pose(m, p.x, p.y, p.z, heading + Math.PI / 2, () => {
    const start = m.data.length,
      outline = [
        [0, -3.45] satisfies [number, number],
        [-1.15, -1.72] satisfies [number, number],
        [-6.8, 2.12] satisfies [number, number],
        [-3.8, 1.45] satisfies [number, number],
        [-2.7, 2.36] satisfies [number, number],
        [-1.45, 1.72] satisfies [number, number],
        [0, 2.3] satisfies [number, number],
        [1.45, 1.72] satisfies [number, number],
        [2.7, 2.36] satisfies [number, number],
        [3.8, 1.45] satisfies [number, number],
        [6.8, 2.12] satisfies [number, number],
        [1.15, -1.72] satisfies [number, number],
      ];
    const center = [0, 0.25, 0.1] satisfies [number, number, number];
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i],
        b = outline[(i + 1) % outline.length],
        top = (v: readonly number[]) => [v[0], Math.abs(v[0]) < 1.2 ? 0.15 : 0.035, v[1]],
        bottom = (v: readonly number[]) => [v[0], -0.1, v[1]];
      m.tri(center, top(b), top(a), i % 3 === 0 ? '#515b61' : '#3d474d', { metal: 0.28 });
      m.tri([0, -0.13, 0] satisfies [number, number, number], bottom(a), bottom(b), '#303a40', {
        metal: 0.2,
      });
      m.quad(top(a), top(b), bottom(b), bottom(a), '#222f36');
    }
    m.quad(
      [-0.52, 0.18, -1.62] satisfies [number, number, number],
      [0.52, 0.18, -1.62] satisfies [number, number, number],
      [0.32, 0.55, -0.72] satisfies [number, number, number],
      [-0.32, 0.55, -0.72] satisfies [number, number, number],
      '#87aeb4',
      'glass',
    );
    if (!pilot)
      m.quad(
        [-0.32, 0.55, -0.72] satisfies [number, number, number],
        [0.32, 0.55, -0.72] satisfies [number, number, number],
        [0.55, 0.25, -0.23] satisfies [number, number, number],
        [-0.55, 0.25, -0.23] satisfies [number, number, number],
        '#405761',
        'glass',
      );
    m.rod(
      [0, 0.22, -1.6] satisfies [number, number, number],
      [0, 0.56, -0.7] satisfies [number, number, number],
      0.018,
      '#18292e',
      6,
    );
    for (const side of [-1, 1] satisfies [number, number]) {
      m.box(side * 1.05 - 0.2, 0.21, -0.1, 0.4, 0.07, 0.95, '#152830');
      for (let i = 0; i < 5; i++)
        m.box(side * 1.05 - 0.18, 0.29, -0.04 + i * 0.16, 0.36, 0.025, 0.035, '#687780');
      m.box(side * 0.85 - 0.32, 0.07, 1.68, 0.64, 0.1, 0.17, '#14242b');
      m.box(side * 0.85 - 0.25, 0.08, 1.85, 0.5, 0.045, 0.008, parked ? '#51676c' : '#8ab6cd', {
        emissive: parked ? 0.1 : 0.45,
      });
      for (const [a, b] of [
        [
          [side * 1.45, 0.11, -0.7] satisfies [number, number, number],
          [side * 4.9, 0.065, 1.7] satisfies [number, number, number],
        ],
        [
          [side * 1.8, 0.1, 0.8] satisfies [number, number, number],
          [side * 4, 0.06, 1.6] satisfies [number, number, number],
        ],
      ])
        m.rod(a, b, 0.008, '#71808a', 5);
      m.sphere(
        side * 6.6,
        0.065,
        2.05,
        0.035,
        0.027,
        0.035,
        side < 0 ? '#c75c53' : '#84b98d',
        9,
        5,
        { emissive: 0.3 },
      );
    }
    if (parked)
      for (const [x, z] of [
        [0, -1.6] satisfies [number, number],
        [-1.7, 1] satisfies [number, number],
        [1.7, 1] satisfies [number, number],
      ]) {
        m.rod(
          [x, -0.08, z] satisfies [number, number, number],
          [x, -0.62, z] satisfies [number, number, number],
          0.045,
          '#89999d',
          10,
        );
        m.sphere(x, -0.66, z, 0.15, 0.2, 0.2, '#263230', 12, 7);
      }
    // Scale only the airframe; the exposed pilot keeps their normal head size.
    for (let i = start; i < m.data.length; i += 11)
      for (let axis = 0; axis < 3; axis++) m.data[i + axis] *= BOMBER_MODEL_SCALE;
    if (pilot) {
      m.sphere(0, 0.095, -0.17, 0.145, 0.018, 0.15, '#18292e', 12, 6);
      drawCharacter(m, 0, -0.17, 0.11 - 1.46, -Math.PI / 2, 0, false, pilot.skin, pilot.shirt, {
        ...pilot,
        mode: 'idle',
        headOnly: true,
        ground: null,
        height: 1,
      });
    }
    if (pitch)
      m.characters?.transform(
        start,
        new Float32Array([
          1,
          0,
          0,
          0,
          0,
          Math.cos(pitch),
          -Math.sin(pitch),
          0,
          0,
          Math.sin(pitch),
          Math.cos(pitch),
          0,
          0,
          0,
          0,
          1,
        ] satisfies [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
    if (pitch)
      for (let i = start; i < m.data.length; i += 11) {
        const c = Math.cos(pitch),
          s = Math.sin(pitch),
          y = m.data[i + 1],
          z = m.data[i + 2],
          ny = m.data[i + 4],
          nz = m.data[i + 5];
        m.data[i + 1] = y * c + z * s;
        m.data[i + 2] = z * c - y * s;
        m.data[i + 4] = ny * c + nz * s;
        m.data[i + 5] = nz * c - ny * s;
      }
    if (bank)
      m.characters?.transform(
        start,
        new Float32Array([
          Math.cos(bank),
          Math.sin(bank),
          0,
          0,
          -Math.sin(bank),
          Math.cos(bank),
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
        ] satisfies [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
    if (bank)
      for (let i = start; i < m.data.length; i += 11) {
        const c = Math.cos(bank),
          s = Math.sin(bank),
          x = m.data[i],
          y = m.data[i + 1],
          nx = m.data[i + 3],
          ny = m.data[i + 4];
        m.data[i] = x * c - y * s;
        m.data[i + 1] = x * s + y * c;
        m.data[i + 3] = nx * c - ny * s;
        m.data[i + 4] = nx * s + ny * c;
      }
  });
}
export function drawParachute(m: Mesh, p: AircraftPoint, heading = 0, time = 0) {
  pose(m, p.x, p.y, p.z, heading + Math.PI / 2, () => {
    const sway = Math.sin(time * 0.0018) * 0.08,
      canopy = (a: number, r: number) =>
        [
          Math.cos(a) * 2.2 * r,
          3.8 + Math.sqrt(Math.max(0, 1 - r * r)) * 1.1 + sway,
          Math.sin(a) * 1.5 * r,
        ] satisfies [number, number, number];
    for (let i = 0; i < 16; i++)
      for (let ring = 0; ring < 3; ring++) {
        const a = (i * Math.PI) / 8,
          b = ((i + 1) * Math.PI) / 8,
          r = ring / 3,
          R = (ring + 1) / 3;
        const color = i % 4 < 2 ? '#e7e3c8' : '#6c887d';
        if (ring === 0) m.tri(canopy(a, 0), canopy(b, R), canopy(a, R), color);
        else m.quad(canopy(a, r), canopy(b, r), canopy(b, R), canopy(a, R), color);
      }
    for (const sign of [-1, 1] satisfies [number, number])
      for (const end of [-1, 1] satisfies [number, number])
        m.rod(
          [sign * 0.34, 1.7, 0.1] satisfies [number, number, number],
          [sign * 1.65, 3.85 + sway, end * 0.98] satisfies [number, number, number],
          0.012,
          '#c3c4b1',
          5,
        );
    for (const sign of [-1, 1] satisfies [number, number]) {
      m.rod(
        [sign * 0.18, 0.85, -0.13] satisfies [number, number, number],
        [sign * 0.2, 1.45, -0.12] satisfies [number, number, number],
        0.035,
        '#485b55',
        7,
      );
      m.rod(
        [sign * 0.2, 1.45, -0.12] satisfies [number, number, number],
        [sign * 0.34, 1.7, 0.1] satisfies [number, number, number],
        0.018,
        '#485b55',
        6,
      );
    }
  });
}
/** A discarded bomber is cosmetic: it never creates a second damage blast. */
export function drawBomberCrash(m: Mesh, crash: VisibleCrash, time: number) {
  const elapsed = Math.max(0, time - crash.started),
    t = Math.min(1, elapsed / 4000),
    { from, to, heading } = crash;
  if (elapsed < 4000) {
    const p = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y + 0.15 - from.y) * t * t,
      z: from.z + (to.z - from.z) * t,
    };
    drawStealthBomber(m, p, heading, { pitch: t * 0.75, bank: Math.sin(t * 3) * 0.18, time });
    for (let i = 0; i < 3; i++) {
      const lag = (i + 1) * 0.045;
      m.sphere(
        p.x - Math.cos(heading) * lag * 30,
        p.y + 0.15 + i * 0.12,
        p.z - Math.sin(heading) * lag * 30,
        0.16 + i * 0.12,
        0.13 + i * 0.09,
        0.16 + i * 0.12,
        '#7a827e',
        9,
        5,
      );
    }
  } else if (elapsed < 6200) {
    const age = (elapsed - 4000) / 2200,
      flash = Math.max(0, 1 - age * 3),
      r = 0.2 + Math.sin(Math.PI * age) * 1.2;
    if (flash)
      m.sphere(
        to.x,
        to.y + 0.3,
        to.z,
        r,
        0.3 + flash * 0.6,
        r,
        flash > 0.5 ? '#f5d497' : '#c9824c',
        14,
        8,
        { emissive: flash * 0.7 },
      );
    m.sphere(
      to.x,
      to.y + 0.4 + age * 1.6,
      to.z,
      0.25 + age * 0.9,
      0.3 + age * 0.5,
      0.25 + age * 0.9,
      '#8a8d82',
      12,
      7,
    );
  }
}
export function createIlluminatiCaveMesh() {
  const m = new Mesh(),
    base = ILLUMINATI_CAVE.floor,
    walls = [
      [-1, 0] satisfies [number, number],
      [1, 0] satisfies [number, number],
      [0, -1] satisfies [number, number],
      [0, 1] satisfies [number, number],
    ].map(([dx, dz]) => ({ dx, dz, mesh: new Mesh() }));
  for (const tile of CAVE_TILES) {
    const { x, z } = tile;
    if (tile.type === 'rock') continue;
    m.box(
      x,
      base - 0.18,
      z,
      1,
      0.18,
      1,
      tile.type === 'hangar' ? '#626f67' : '#84795c',
      tile.type === 'hangar' ? 'stone' : 'dirt',
    );
    for (const [dx, dz] of [
      [-1, 0] satisfies [number, number],
      [1, 0] satisfies [number, number],
      [0, -1] satisfies [number, number],
      [0, 1] satisfies [number, number],
    ]) {
      const n = CAVE_TILES[(z + dz) * 28 + x + dx];
      if (n && n.type !== 'rock') continue;
      const xx = x + 0.5 + dx * 0.46,
        zz = z + 0.5 + dz * 0.46;
      const wall = walls.find((w) => w.dx === dx && w.dz === dz)!.mesh;
      wall.box(
        xx - 0.4,
        base,
        zz - 0.4,
        0.8,
        2.5 + rand(x, z) * 1.3,
        0.8,
        (['#6e7564', '#7d8169', '#5d695e'] satisfies [string, string, string])[(x + z) % 3],
        'stone',
      );
      for (let i = 0; i < 2; i++)
        wall.sphere(
          xx + (rand(x + i, z) - 0.5) * 0.2,
          base + 0.6 + i * 1.25,
          zz,
          0.54,
          0.65,
          0.55,
          '#717663',
          10,
          7,
          'stone',
        );
      if ((x + z) % 5 === 0) {
        wall.box(xx - 0.08, base + 1.6, zz - 0.08, 0.16, 0.2, 0.16, '#d6c48a', { emissive: 0.45 });
        wall.cylinder(xx, base, zz, 0.025, 1.6, '#78918b', 8);
      }
    }
    if (tile.type === 'hangar' && x === 13 && z >= 6 && z < 19)
      m.box(x + 0.48, base + 0.005, z + 0.18, 0.04, 0.005, 0.5, '#d0bc79');
  }
  // Parallel conduits lead from the stone passage into the carved hangar.
  for (const x of [12.2, 15.8] satisfies [number, number])
    m.rod(
      [x, base + 0.18, 20] satisfies [number, number, number],
      [x, base + 0.18, 25.5] satisfies [number, number, number],
      0.045,
      '#9c805a',
      10,
      { metal: 0.35 },
    );
  for (const side of [-1, 1] satisfies [number, number]) {
    const x = 13.5 + side * 8.1;
    m.box(x - 0.5, base, 5.2, 1, 0.65, 1, '#697d78', 'stone');
    m.box(x - 0.4, base + 0.65, 5.3, 0.8, 0.07, 0.8, '#b4ba92');
    m.box(x - 0.35, base + 0.72, 5.5, 0.7, 0.3, 0.34, '#3d5b59');
    for (let i = 0; i < 3; i++)
      m.sphere(x - 0.23 + i * 0.22, base + 0.9, 5.85, 0.025, 0.025, 0.008, '#9bd5ba', 8, 4, {
        emissive: 0.4,
      });
  }
  const c = 13.5,
    z = 3.47;
  for (const [a, b] of [
    [
      [c - 1, base + 1, z] satisfies [number, number, number],
      [c, base + 2.7, z] satisfies [number, number, number],
    ],
    [
      [c, base + 2.7, z] satisfies [number, number, number],
      [c + 1, base + 1, z] satisfies [number, number, number],
    ],
    [
      [c + 1, base + 1, z] satisfies [number, number, number],
      [c - 1, base + 1, z] satisfies [number, number, number],
    ],
  ])
    m.rod(a, b, 0.035, '#c9bd7c', 10, { emissive: 0.22 });
  m.sphere(c, base + 1.65, z + 0.02, 0.35, 0.16, 0.07, '#a3c8b5', 16, 9, { emissive: 0.3 });
  m.sphere(c, base + 1.65, z + 0.09, 0.08, 0.12, 0.02, '#273b35', 12, 8);
  for (let i = 0; i < 7; i++)
    m.box(12.1, base + i * 0.18, 25 - i * 0.22, 2.8, 0.18, 0.22, '#a7a68a', 'stone');
  return Object.assign(m, { walls });
}
export function drawBombEffect(
  m: Mesh,
  bomb: Pick<VisibleBomb, 'x' | 'z' | 'started'> & { from: { y: number } },
  time: number,
  ground = 0,
) {
  const elapsed = time - bomb.started,
    t = Math.max(0, Math.min(1, elapsed / 1500)),
    y = bomb.from.y + (ground - bomb.from.y) * t * t;
  if (elapsed < 1500) {
    m.sphere(bomb.x, y, bomb.z, 0.12, 0.35, 0.12, '#354446', 12, 8);
    for (const side of [-1, 1] satisfies [number, number])
      m.box(bomb.x + side * 0.13, y + 0.16, bomb.z - 0.04, 0.03, 0.15, 0.08, '#71807d');
  } else if (elapsed < 2200) {
    const a = (elapsed - 1500) / 700,
      r = 0.3 + a * 1.8;
    m.sphere(
      bomb.x,
      ground + 0.18 + a * 0.6,
      bomb.z,
      r,
      0.3 + a * 0.7,
      r,
      a < 0.4 ? '#e8c878' : '#8d9684',
      16,
      9,
      { emissive: Math.max(0.001, 0.5 - a) },
    );
  }
}
