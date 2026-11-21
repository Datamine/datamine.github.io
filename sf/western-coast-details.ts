import type { Mesh } from './geometry.ts';
import { rand, pose } from './geometry.ts';
import { westernCoastX, westernBeachWidth } from './coastline.ts';
import { drawSeagull } from './life.ts';

const COASTAL_GULL_COVES = [55, 81, 112, 143, 170, 210, 234] satisfies [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export const COASTAL_GULL_COUNT = COASTAL_GULL_COVES.length * 3;
export function coastalSeagullFlight(time: number, index: number, reduced = false) {
  const centerZ = COASTAL_GULL_COVES[Math.floor(index / 3)],
    centerX = westernCoastX(centerZ) - 1.6,
    rate = (0.18 + index * 0.006) * (reduced ? 0.5 : 1),
    seconds = time * 0.001,
    a = seconds * rate + index * 1.7,
    rx = 2.3 + (index % 3) * 0.55,
    rz = 2.7 + (index % 2) * 0.7;
  return {
    x: centerX + Math.cos(a) * rx,
    z: centerZ + Math.sin(a) * rz,
    y: 2.8 + (index % 3) * 0.4 + Math.sin(a * 1.4) * 0.2,
    angle: Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx),
    bank: Math.sin(a) * 0.035,
    flap: reduced ? 0.015 : Math.sin(seconds * 5.1 + index) * 0.15,
  };
}
export function drawCoastalSeagulls(m: Mesh, time: number = 0, viewer: number[], reduced = false) {
  for (let i = 0; i < COASTAL_GULL_COUNT; i++) {
    const bird = coastalSeagullFlight(time, i, reduced);
    if (Math.hypot(bird.x - viewer[0], bird.z - viewer[1]) < 32) drawSeagull(m, bird);
  }
}

/** Small groups of fractured basalt replace a regular row of identical props.
 * The rocks are static native meshes; the shoreline owns their positions. */
export function createCoastalRocks() {
  const rocks = [];
  for (let group = 0; group < 26; group++) {
    const centerZ = 46 + group * 7.35 + rand(group, 1, 4) * 2,
      rocky = westernBeachWidth(centerZ) < 0.8,
      count = group >= 18 ? 2 : rocky ? 4 : 2;
    for (let j = 0; j < count; j++) {
      const z = centerZ + (j - 0.8) * 0.65,
        x = westernCoastX(z) + (j === 0 ? 0.22 : -0.35 - rand(group, j, 12) * 0.85),
        rx = Math.min(0.25 + rand(group, j, 8) * (rocky ? 0.5 : 0.27), (13.4 - x) / 1.2);
      rocks.push({
        x,
        z,
        rx,
        rz: rx * (0.65 + rand(group, j, 18) * 0.55),
        height: 0.25 + rand(group, j, 21) * (rocky ? 1.05 : 0.5),
        angle: rand(group, j, 25) * Math.PI,
        seed: group * 7 + j,
      });
    }
  }
  return rocks;
}
export function drawCoastalRocks(
  m: Mesh,
  rocks: {
    x: number;
    z: number;
    rx: number;
    rz: number;
    height: number;
    angle: number;
    seed: number;
  }[],
  ground: (x: number, z: number) => number,
  land: (x: number, z: number) => boolean,
) {
  for (const r of rocks) {
    const base = land(r.x, r.z) ? ground(r.x, r.z) - 0.12 : -0.1;
    pose(m, r.x, base, r.z, r.angle, () => {
      const sides = 10,
        at = (ring: number, i: number) => {
          const a = (i * Math.PI * 2) / sides,
            radius =
              ([1, 0.95, 0.65, 0.2] satisfies [number, number, number, number])[ring] *
              (0.85 + rand(r.seed, i % sides, ring + 8) * 0.24);
          return [
            Math.cos(a) * r.rx * radius,
            ([0, 0.22, 0.76, 1] satisfies [number, number, number, number])[ring] * r.height,
            Math.sin(a) * r.rz * radius,
          ] satisfies [number, number, number];
        };
      for (let ring = 1; ring < 4; ring++)
        for (let i = 0; i < sides; i++)
          m.quad(
            at(ring - 1, (i + 1) % sides),
            at(ring - 1, i),
            at(ring, i),
            at(ring, (i + 1) % sides),
            ring === 3 ? '#a1a492' : r.seed % 2 ? '#737e79' : '#858d80',
            'stone',
          );
      for (let i = 0; i < sides; i++)
        m.tri(
          [0, r.height, 0] satisfies [number, number, number],
          at(3, (i + 1) % sides),
          at(3, i),
          '#a8aa95',
          'stone',
        );
    });
  }
}
