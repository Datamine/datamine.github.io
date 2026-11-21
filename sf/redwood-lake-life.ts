// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { drawHumanNPC } from './human-npc.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { SOUTHERN_LAKE } from './southern-countryside-layout.ts';

export function sampleRedwoodCanoe(time: number) {
  const a = time * 0.000028,
    l = SOUTHERN_LAKE;
  return {
    x: l.x + Math.cos(a) * l.rx * 0.4,
    z: l.z + Math.sin(a) * l.rz * 0.4,
    angle: Math.atan2(Math.cos(a) * l.rz, -Math.sin(a) * l.rx),
  };
}
export function sampleRedwoodGeese(time: number) {
  const l = SOUTHERN_LAKE;
  return Array.from({ length: 6 }, (_, i) => {
    const a = time * 0.000045 + i * 0.16;
    return {
      x: l.x + Math.cos(a) * l.rx * 0.69,
      z: l.z + Math.sin(a) * l.rz * 0.69,
      angle: Math.atan2(Math.cos(a) * l.rz, -Math.sin(a) * l.rx),
      index: i,
    };
  });
}
const canoePassengers = [
  { x: 0, z: 0 },
  { x: 0, z: 0 },
];
/** Animated scenery; paths follow the actual elliptical water boundary. */
export function drawRedwoodLakeLife(
  m: Mesh,
  time: number,
  addTarget: (
    value0: number,
    value1: {
      sight: {
        id: string;
        kind: string;
        label: string;
        description: string;
        entry: { x: number; y: 188 };
      };
    },
  ) => void = () => {},
) {
  const lake = SOUTHERN_LAKE,
    boat = sampleRedwoodCanoe(time),
    base = lake.level + 0.035,
    start = m.data.length;
  pose(m, boat.x, base, boat.z, boat.angle, () => {
    const width = (x: number) => 0.42 * Math.sqrt(Math.max(0, 1 - (x / 1.8) ** 2));
    for (let i = 0; i < 18; i++) {
      const x = -1.8 + i * 0.2,
        q = x + 0.2,
        a = width(x),
        b = width(q);
      for (const side of [-1, 1] satisfies [number, number]) {
        m.quad(
          [x, -0.08, 0] satisfies [number, number, number],
          [q, -0.08, 0] satisfies [number, number, number],
          [q, 0.22, side * b] satisfies [number, number, number],
          [x, 0.22, side * a] satisfies [number, number, number],
          side < 0 ? '#ce8764' : '#ad674b',
          'cedar',
        );
        m.rod(
          [x, 0.22, side * a] satisfies [number, number, number],
          [q, 0.22, side * b] satisfies [number, number, number],
          0.025,
          '#e7c39b',
          8,
        );
      }
    }
    for (const x of [-0.65, 0.65] satisfies [number, number])
      m.box(x - 0.15, 0.13, -0.33, 0.3, 0.045, 0.66, '#c8ab79', 'cedar');
    const stroke = Math.sin(time * 0.0022),
      px = 0.62 + stroke * 0.18;
    m.rod(
      [px, 0.9, 0.27] satisfies [number, number, number],
      [px - 0.28, -0.03, 0.72] satisfies [number, number, number],
      0.023,
      '#d0ae77',
      8,
    );
    m.sphere(px - 0.3, -0.03, 0.75, 0.09, 0.24, 0.035, '#b78b5e', 12, 7, 'wood');
  });
  for (const [i, offset] of ([-0.65, 0.65] satisfies [number, number]).entries()) {
    const x = boat.x + Math.cos(boat.angle) * offset,
      z = boat.z + Math.sin(boat.angle) * offset;
    drawHumanNPC(m, canoePassengers[i], time, {
      x: x,
      z: z,
      base: base - 0.07,
      angle: boat.angle,
      phase: 0,
      seated: false,
      skin: i ? '#b38365' : '#916a4d',
      shirt: i ? '#b7777b' : '#658d9b',
      appearance: {
        mode: 'rest',
        sitBlend: 1,
        height: 0.95,
        backpack: false,
        hair: i ? '#4e342b' : '#403a32',
        female: i === 1,
        longHair: i === 1,
        time: time * 0.001,
      },
      reduced: time === 0,
    });
  }
  addTarget(start, {
    sight: {
      id: 'redwood-canoe',
      kind: 'canoe',
      label: contentText('redwood-lake-life.drawRedwoodLakeLife.label-1', {}),
      description: contentText('redwood-lake-life.drawRedwoodLakeLife.description-2', {}),
      entry: { x: lake.x + lake.rx + 0.8, y: lake.z },
    },
  });
  for (const goose of sampleRedwoodGeese(time)) {
    const begin = m.data.length;
    pose(m, goose.x, base, goose.z, goose.angle, () => {
      m.sphere(0, 0.12, 0, 0.32, 0.19, 0.17, '#9b9984', 16, 9);
      m.sphere(-0.06, 0.2, 0, 0.25, 0.075, 0.15, '#747b6c', 12, 7);
      m.rod(
        [0.19, 0.18, 0] satisfies [number, number, number],
        [0.3, 0.6, 0] satisfies [number, number, number],
        0.057,
        '#343a35',
        12,
      );
      m.sphere(0.32, 0.64, 0, 0.09, 0.1, 0.075, '#303935', 14, 8);
      for (const side of [-1, 1] satisfies [number, number])
        m.sphere(0.33, 0.615, side * 0.063, 0.068, 0.04, 0.016, '#e4e3d1', 10, 6);
      m.sphere(0.43, 0.63, 0, 0.075, 0.026, 0.033, '#373d37', 10, 6);
      m.tri(
        [-0.25, 0.16, -0.1] satisfies [number, number, number],
        [-0.47, 0.17, 0] satisfies [number, number, number],
        [-0.25, 0.16, 0.1] satisfies [number, number, number],
        '#535e52',
      );
    });
    addTarget(begin, {
      sight: {
        id: 'redwood-goose-' + goose.index,
        kind: 'wildlife',
        label: contentText('redwood-lake-life.drawRedwoodLakeLife.label-3', {}),
        description: contentText('redwood-lake-life.drawRedwoodLakeLife.description-4', {}),
        entry: { x: lake.x + lake.rx + 0.8, y: lake.z },
      },
    });
  }
}
