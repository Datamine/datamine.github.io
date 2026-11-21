import type { CharacterAppearance } from './characters.ts';
import { Mesh } from './geometry.ts';
import { rigidCharacterMesh } from './rendering/character-gpu.ts';

let decorativeRocketMesh: number[] | null = null,
  clockSecond: number | null = null,
  clockData: number[] | null = null,
  flameFrame: number | null = null,
  flameData: number[] | null = null;
const wearablePalette = new Float32Array(17 * 4);
function rocketMesh() {
  if (decorativeRocketMesh) return decorativeRocketMesh;
  const m = new Mesh(),
    z = -0.34;
  m.cylinder(0, 0.78, z, 0.17, 1.1, '#f0e5c6', 24);
  for (const y of [0.83, 1.1, 1.4, 1.7] satisfies [number, number, number, number])
    m.cylinder(0, y, z, 0.174, 0.12, '#c85e58', 24);
  m.cylinder(0, 1.88, z, 0.21, 0.42, '#c45a55', 24, 0);
  m.cylinder(0, 0.72, z, 0.12, 0.1, '#657c80', 20, 0.09);
  m.rod(
    [0.13, 0.22, z] satisfies [number, number, number],
    [0.13, 1.75, z] satisfies [number, number, number],
    0.025,
    '#b59362',
    8,
  );
  for (const side of [-1, 1] satisfies [number, number]) {
    m.tri(
      [side * 0.14, 0.83, z] satisfies [number, number, number],
      [side * 0.36, 0.65, z] satisfies [number, number, number],
      [side * 0.15, 1.15, z] satisfies [number, number, number],
      '#426e87',
    );
    m.tri(
      [side * 0.15, 1.15, z + 0.025] satisfies [number, number, number],
      [side * 0.36, 0.65, z + 0.025] satisfies [number, number, number],
      [side * 0.14, 0.83, z + 0.025] satisfies [number, number, number],
      '#6b9aa5',
    );
  }
  for (const y of [1.02, 1.5] satisfies [number, number])
    m.box(-0.22, y, z - 0.19, 0.44, 0.04, 0.38, '#9d865c', 'wood');
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    m.sphere(
      Math.sin(a) * 0.12,
      1.56 + Math.cos(a) * 0.1,
      z - 0.17,
      0.025,
      0.025,
      0.012,
      '#e8c66e',
      8,
      5,
      { emissive: 0.12 },
    );
  }
  return (decorativeRocketMesh = m.data);
}
function clockMesh(time: number) {
  const second = Math.floor(time);
  if (clockSecond === second) return clockData!;
  clockSecond = second;
  time = second;
  const m = new Mesh(),
    gold = '#c7a45d',
    z = 0.175;
  for (const side of [-1, 1] satisfies [number, number])
    m.rod(
      [side * 0.105, 1.4, 0.09] satisfies [number, number, number],
      [0, 1.3, z] satisfies [number, number, number],
      0.008,
      gold,
      7,
    );
  m.sphere(0, 1.23, z, 0.115, 0.125, 0.025, gold, 20, 10, { metal: 0.3 });
  m.sphere(0, 1.23, z + 0.024, 0.095, 0.105, 0.008, '#eee4be', 20, 10);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    m.rod(
      [Math.sin(a) * 0.077, 1.23 + Math.cos(a) * 0.085, z + 0.035] satisfies [
        number,
        number,
        number,
      ],
      [Math.sin(a) * 0.086, 1.23 + Math.cos(a) * 0.095, z + 0.035] satisfies [
        number,
        number,
        number,
      ],
      0.0035,
      '#6b6453',
      5,
    );
  }
  for (const [angle, length, width, color] of [
    [(time / 43200) * Math.PI * 2, 0.052, 0.005, '#4d5f62'] satisfies [
      number,
      number,
      number,
      string,
    ],
    [(time / 3600) * Math.PI * 2, 0.079, 0.004, '#4d5f62'] satisfies [
      number,
      number,
      number,
      string,
    ],
    [(time * Math.PI * 2) / 60, 0.083, 0.002, '#b9685c'] satisfies [number, number, number, string],
  ])
    m.rod(
      [0, 1.23, z + 0.04] satisfies [number, number, number],
      [Math.sin(angle) * length, 1.23 + Math.cos(angle) * length, z + 0.04] satisfies [
        number,
        number,
        number,
      ],
      width,
      color,
      6,
    );
  m.sphere(0, 1.23, z + 0.044, 0.01, 0.01, 0.006, gold, 8, 5);
  clockData = m.data;
  return clockData;
}
/** Reuse the body's bone matrices so accessories follow sitting, dancing,
 * recoil and climbing. Only the flame and clock hands require fresh triangles. */
export function drawWearableAccessories(
  target: Mesh,
  look: CharacterAppearance,
  mat: Float32Array,
  {
    x,
    z,
    base,
    angle,
    height = 1,
    time = 0,
    cpu = false,
  }: {
    x: number;
    z: number;
    base: number;
    angle: number;
    height: number;
    time: number;
    cpu?: boolean;
  },
) {
  if (look.headOnly || (look.back !== 'new-year-rocket' && look.neck !== 'clock-amulet')) return;
  const si = Math.sin(angle),
    co = Math.cos(angle),
    attach = (data: number[] | Float32Array, bone: number, cacheKey: string) => {
      if (target.characters && !cpu) {
        target.characters.add(
          target,
          rigidCharacterMesh(data, bone, cacheKey),
          mat,
          wearablePalette,
          { x, z, base, angle, height },
        );
        return;
      }
      const k = bone * 12;
      for (let i = 0; i < data.length; i += 11) {
        const px =
            mat[k] * data[i] + mat[k + 1] * data[i + 1] + mat[k + 2] * data[i + 2] + mat[k + 3],
          py =
            (mat[k + 4] * data[i] +
              mat[k + 5] * data[i + 1] +
              mat[k + 6] * data[i + 2] +
              mat[k + 7]) *
            height,
          pz =
            mat[k + 8] * data[i] +
            mat[k + 9] * data[i + 1] +
            mat[k + 10] * data[i + 2] +
            mat[k + 11],
          nx = mat[k] * data[i + 3] + mat[k + 1] * data[i + 4] + mat[k + 2] * data[i + 5],
          ny =
            (mat[k + 4] * data[i + 3] + mat[k + 5] * data[i + 4] + mat[k + 6] * data[i + 5]) /
            height,
          nz = mat[k + 8] * data[i + 3] + mat[k + 9] * data[i + 4] + mat[k + 10] * data[i + 5];
        target.data.push(
          x + px * si + pz * co,
          base + py,
          z - px * co + pz * si,
          nx * si + nz * co,
          ny,
          -nx * co + nz * si,
          data[i + 6],
          data[i + 7],
          data[i + 8],
          data[i + 9],
          data[i + 10],
        );
      }
    };
  if (look.back === 'new-year-rocket') {
    attach(rocketMesh(), 1, 'wearable-rocket');
    if ((look.rocketBurnUntil || 0) > (look.serverTime ?? Date.now())) {
      const frame = Math.floor(time * 30);
      if (frame !== flameFrame) {
        flameFrame = frame;
        const flame = new Mesh(),
          pulse = 0.82 + 0.18 * Math.sin(time * 37),
          tail = 0.56 * pulse;
        flame.cylinder(0, 0.73 - tail, -0.34, 0.015, tail, '#ee9148', 14, 0.12, { emissive: 0.9 });
        flame.cylinder(0, 0.73 - tail * 0.7, -0.34, 0.005, tail * 0.7, '#ffe4a0', 12, 0.072, {
          emissive: 1,
        });
        for (let i = 0; i < 4; i++) {
          const t = (time * 1.8 + i * 0.27) % 1;
          flame.sphere(
            Math.sin(i * 2.4) * 0.08,
            0.72 - t * 0.65,
            -0.34 + Math.cos(i * 2.4) * 0.05,
            0.013,
            0.027,
            0.013,
            '#f5ca70',
            7,
            5,
            { emissive: 0.8 },
          );
        }
        flameData = flame.data;
      }
      attach(flameData!, 1, 'wearable-flame');
    }
  }
  if (look.neck === 'clock-amulet')
    attach(clockMesh((look.serverTime ?? Date.now()) / 1000), 2, 'wearable-clock');
}
