import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { Mesh, pose } from './geometry.ts';
import { drawWalkingDog } from './companions.ts';
import { drawPlaque } from './southern-district.ts';
import { DOG_PONY_SHOW, dogPonyPose } from './dog-pony-layout.ts';

const showRect = (x: number, z: number, w: number, d: number) => [
  [x, z] satisfies [number, number],
  [x + w, z] satisfies [number, number],
  [x + w, z + d] satisfies [number, number],
  [x, z + d] satisfies [number, number],
];
export const DOG_PONY_SIGN = 'DOG & PONY SHOW';
export function createDogPonyAdministrator(ground: (x: number, z: number) => number) {
  const s = DOG_PONY_SHOW;
  return {
    id: s.administrator,
    siteId: s.id,
    kind: 'show-administrator',
    label: contentText('dog-pony-show.createDogPonyAdministrator.label-1', {}),
    name: contentText('dog-pony-show.createDogPonyAdministrator.name-2', {}),
    neighborhoodService: 'dog-pony',
    x: s.entry.x + 0.5,
    z: s.entry.y + 0.5,
    base: ground(s.entry.x + 0.5, s.entry.y + 0.5),
    approach: { x: s.entry.x + 1, y: s.entry.y },
    height: 1.85,
    angle: 0,
    skin: '#ad825f',
    hair: '#473b34',
    shirt: '#b18462',
    coat: true,
    regional: true,
    showStartedAt: 0,
    description: contentText('dog-pony-show.createDogPonyAdministrator.description-3', {}),
  };
}

export function drawDogPonyShowground(
  m: Mesh,
  terrain: import('./types/parcels.ts').ParcelTerrain,
  signs: SignAtlas,
) {
  const s = DOG_PONY_SHOW,
    start = m.data.length,
    stage = s.stage,
    base = terrain.height(s.x, s.z),
    solids = [showRect(stage.x, stage.z, stage.w, stage.d)];
  terrain.cutPlot({
    cx: stage.x + stage.w / 2,
    cz: stage.z + stage.d / 2,
    w: stage.w + 0.1,
    d: stage.d + 0.1,
    angle: 0,
    height: base,
    onlyLower: true,
  });
  // Fine-grained gravel, checkerboard paths, planting beds and a cedar stage
  // give this clearing texture without laying another rectangular turf tile.
  for (let ix = 0; ix < 7; ix++)
    for (let iz = 0; iz < 3; iz++) {
      const x = s.west + 0.25 + ix * 0.92,
        z = 172.5 + iz * 0.65,
        y = terrain.height(x, z) + 0.015;
      m.box(
        x,
        y,
        z,
        0.87,
        0.012,
        0.6,
        (ix + iz) % 3 ? '#c6b596' : '#aeb7a0',
        (ix + iz) % 3 ? 'flagstone' : 'dirt',
      );
    }
  m.box(stage.x, base - 0.02, stage.z, stage.w, 0.19, stage.d, '#ad8968', 'cedar');
  for (let i = 0; i < 26; i++)
    m.box(
      stage.x + 0.06 + i * 0.22,
      base + 0.175,
      stage.z + 0.03,
      0.012,
      0.007,
      stage.d - 0.06,
      '#866c54',
    );
  for (const x of [stage.x + 0.12, stage.x + stage.w - 0.12] satisfies [number, number]) {
    m.cylinder(x, base + 0.17, stage.z + 0.08, 0.045, 2.45, '#a7825e', 12);
    m.rod([x, base + 2.65, stage.z + 0.08], [x, base + 2.3, stage.z + 0.27], 0.022, '#c2a986', 8);
  }
  for (let i = 0; i < 14; i++) {
    const x = stage.x + (i * stage.w) / 14,
      w = stage.w / 14;
    m.quad(
      [x, base + 2.65, stage.z + 0.05],
      [x + w, base + 2.65, stage.z + 0.05],
      [x + w, base + 2.3, stage.z + 0.275],
      [x, base + 2.3, stage.z + 0.275],
      i % 2 ? '#8c6e9f' : '#e2ccb0',
    );
    m.tri(
      [x, base + 2.19, stage.z + 0.275],
      [x + w, base + 2.19, stage.z + 0.275],
      [x + w * 0.5, base + 1.98, stage.z + 0.275],
      i % 3 ? '#d8ab65' : '#7eaba0',
    );
  }
  m.box(stage.x + 1.0, base + 0.7, stage.z - 0.04, 3.8, 0.65, 0.07, '#496b60', 'cedar');
  drawPlaque(
    m,
    signs,
    DOG_PONY_SIGN,
    stage.x + stage.w / 2,
    base + 0.82,
    stage.z + 0.04,
    3.6,
    0.35,
  );
  for (const x of [s.west + 0.2, s.east - 0.25] satisfies [number, number])
    for (const z of [s.north + 0.35, s.south - 0.2] satisfies [number, number]) {
      const y = terrain.height(x, z);
      m.cylinder(x, y, z, 0.16, 0.27, '#b88462', 14, 0.22, 'limewash');
      for (let i = 0; i < 5; i++) {
        m.sphere(
          x + Math.sin(i * 2.4) * 0.14,
          y + 0.4,
          z + Math.cos(i * 2.4) * 0.14,
          0.13,
          0.16,
          0.12,
          '#7d9b60',
          10,
          5,
        );
        m.sphere(
          x + Math.sin(i * 2.4) * 0.16,
          y + 0.54,
          z + Math.cos(i * 2.4) * 0.16,
          0.055,
          0.045,
          0.055,
          i % 2 ? '#d8a5bd' : '#e7c571',
          10,
          5,
        );
      }
      solids.push(showRect(x - 0.24, z - 0.24, 0.48, 0.48));
    }
  for (let i = 0; i < 8; i++) {
    const z = s.north + 0.3 + i * 0.9,
      x = s.west + 0.08,
      y = terrain.height(x, z);
    m.box(x - 0.025, y, z - 0.025, 0.05, 0.6, 0.05, '#c7b79b', 'wood');
    if (i < 7)
      for (const h of [0.22, 0.47] satisfies [number, number])
        m.rod([x, y + h, z], [x, terrain.height(x, z + 0.9) + h, z + 0.9], 0.022, '#c7b79b', 6);
  }
  solids.push(showRect(s.west - 0.02, s.north + 0.2, 0.2, 6.9));
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number];
  for (let i = start; i < m.data.length; i += 11)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.data[i + k]);
      hi[k] = Math.max(hi[k], m.data[i + k]);
    }
  return {
    id: s.id,
    kind: 'dog-pony-show',
    label: s.label,
    entry: { ...s.entry },
    base,
    start,
    count: m.data.length - start,
    lo,
    hi,
    footprint: showRect(s.west, s.north, s.east - s.west, s.south - s.north),
    navigationPolygons: solids,
    description: contentText('dog-pony-show.drawDogPonyShowground.description-5', {}),
  };
}

let dogPonyModels: Float32Array<ArrayBuffer>[] | null = null;
function showModels() {
  if (dogPonyModels) return dogPonyModels;
  const dog = new Mesh(),
    pony = new Mesh();
  drawWalkingDog(
    dog,
    { x: 0, z: 0, angle: 0, phase: 0, color: '#b77c4f', dark: '#68472f' },
    0,
    () => 0,
  );
  pony.sphere(0, 0.87, 0, 0.65, 0.34, 0.27, '#ad805c', 20, 10);
  pony.sphere(0.46, 1.13, 0, 0.24, 0.39, 0.22, '#b48b65', 18, 9);
  pony.sphere(0.65, 1.48, 0, 0.24, 0.23, 0.19, '#b9906c', 18, 9);
  pony.sphere(0.85, 1.36, 0, 0.23, 0.13, 0.15, '#d8c2a0', 16, 8);
  for (const side of [-1, 1] satisfies [number, number]) {
    pony.cylinder(0.53, 1.64, side * 0.12, 0.065, 0.25, '#ad805c', 12, 0.012);
    pony.sphere(0.77, 1.52, side * 0.168, 0.024, 0.028, 0.016, '#303632', 12, 7);
    pony.sphere(0.98, 1.4, side * 0.085, 0.018, 0.026, 0.015, '#755d4c', 10, 5);
    for (const front of [-1, 1] satisfies [number, number]) {
      const x = front * 0.43;
      pony.rod(
        [x, 0.85, side * 0.18] satisfies [number, number, number],
        [x + front * 0.035, 0.2, side * 0.18] satisfies [number, number, number],
        0.075,
        '#b58c66',
        12,
      );
      pony.box(x - 0.09, 0.16, side * 0.18 - 0.09, 0.19, 0.11, 0.18, '#484741');
    }
  }
  for (let j = 0; j < 9; j++)
    pony.sphere(0.25 + j * 0.035, 1.12 + j * 0.065, 0, 0.09, 0.12, 0.24, '#5c4638', 12, 6);
  pony.rod(
    [-0.59, 0.98, 0] satisfies [number, number, number],
    [-0.8, 0.55, 0.05] satisfies [number, number, number],
    0.1,
    '#5c4638',
    12,
  );
  pony.sphere(-0.79, 0.46, 0.05, 0.13, 0.24, 0.11, '#5c4638', 14, 7);
  pony.box(-0.27, 1.12, -0.29, 0.55, 0.055, 0.58, '#7c98aa');
  return (dogPonyModels = [new Float32Array(dog.data), new Float32Array(pony.data)]);
}
export function drawDogPonyAnimals(
  m: Mesh,
  startedAt: number | undefined,
  now: number,
  ground: (x: number, z: number) => number,
) {
  const state = dogPonyPose(startedAt, now),
    s = DOG_PONY_SHOW;
  for (const [index, data] of showModels().entries()) {
    const x = s.x + (index ? 1.08 : -1.15),
      z = s.z + 0.12,
      base = ground(s.x, s.z) + 0.19,
      pivot = index ? 0.85 : 0.4,
      c = Math.cos(state.angle),
      sn = Math.sin(state.angle);
    pose(m, x, base, z, Math.PI / 2, () => {
      const start = m.data.length;
      for (const value of data) m.data.push(value);
      for (let i = start; i < m.data.length; i += 11) {
        const u = m.data[i],
          v = m.data[i + 1] - pivot,
          nx = m.data[i + 3],
          ny = m.data[i + 4];
        m.data[i] = u * c - v * sn;
        m.data[i + 1] = pivot + u * sn + v * c + state.height - state.crouch;
        m.data[i + 3] = nx * c - ny * sn;
        m.data[i + 4] = nx * sn + ny * c;
      }
    });
  }
  return state;
}
