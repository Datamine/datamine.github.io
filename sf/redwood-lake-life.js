import { pose } from './geometry.js';
import { drawCharacter } from './characters.js';
import { SOUTHERN_LAKE } from './southern-countryside-layout.js';

export function sampleRedwoodCanoe(time) {
  const a = time * 0.000028,
    l = SOUTHERN_LAKE;
  return {
    x: l.x + Math.cos(a) * l.rx * 0.4,
    z: l.z + Math.sin(a) * l.rz * 0.4,
    angle: Math.atan2(Math.cos(a) * l.rz, -Math.sin(a) * l.rx),
  };
}
export function sampleRedwoodGeese(time) {
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
/** Animated scenery; paths follow the actual elliptical water boundary. */
export function drawRedwoodLakeLife(m, time, addTarget = () => {}) {
  const lake = SOUTHERN_LAKE,
    boat = sampleRedwoodCanoe(time),
    base = lake.level + 0.035,
    start = m.data.length;
  pose(m, boat.x, base, boat.z, boat.angle, () => {
    const width = (x) => 0.42 * Math.sqrt(Math.max(0, 1 - (x / 1.8) ** 2));
    for (let i = 0; i < 18; i++) {
      const x = -1.8 + i * 0.2,
        q = x + 0.2,
        a = width(x),
        b = width(q);
      for (const side of [-1, 1]) {
        m.quad(
          [x, -0.08, 0],
          [q, -0.08, 0],
          [q, 0.22, side * b],
          [x, 0.22, side * a],
          side < 0 ? '#ce8764' : '#ad674b',
          'cedar',
        );
        m.rod([x, 0.22, side * a], [q, 0.22, side * b], 0.025, '#e7c39b', 8);
      }
    }
    for (const x of [-0.65, 0.65])
      m.box(x - 0.15, 0.13, -0.33, 0.3, 0.045, 0.66, '#c8ab79', 'cedar');
    const stroke = Math.sin(time * 0.0022),
      px = 0.62 + stroke * 0.18;
    m.rod([px, 0.9, 0.27], [px - 0.28, -0.03, 0.72], 0.023, '#d0ae77', 8);
    m.sphere(px - 0.3, -0.03, 0.75, 0.09, 0.24, 0.035, '#b78b5e', 12, 7, 'wood');
  });
  for (const [i, offset] of [-0.65, 0.65].entries()) {
    const x = boat.x + Math.cos(boat.angle) * offset,
      z = boat.z + Math.sin(boat.angle) * offset;
    drawCharacter(
      m,
      x,
      z,
      base - 0.07,
      boat.angle,
      0,
      false,
      i ? '#b38365' : '#916a4d',
      i ? '#b7777b' : '#658d9b',
      {
        mode: 'rest',
        sitBlend: 1,
        height: 0.95,
        backpack: false,
        hair: i ? '#4e342b' : '#403a32',
        female: i === 1,
        longHair: i === 1,
        time: time * 0.001,
      },
    );
  }
  addTarget(start, {
    sight: {
      id: 'redwood-canoe',
      kind: 'canoe',
      label: 'Canoeing couple',
      description:
        'Two people taking the scenic route around Redwood Lake. Neither has checked a notification in quite some time.',
      entry: { x: lake.x + lake.rx + 0.8, y: lake.z },
    },
  });
  for (const goose of sampleRedwoodGeese(time)) {
    const begin = m.data.length;
    pose(m, goose.x, base, goose.z, goose.angle, () => {
      m.sphere(0, 0.12, 0, 0.32, 0.19, 0.17, '#9b9984', 16, 9);
      m.sphere(-0.06, 0.2, 0, 0.25, 0.075, 0.15, '#747b6c', 12, 7);
      m.rod([0.19, 0.18, 0], [0.3, 0.6, 0], 0.057, '#343a35', 12);
      m.sphere(0.32, 0.64, 0, 0.09, 0.1, 0.075, '#303935', 14, 8);
      for (const side of [-1, 1])
        m.sphere(0.33, 0.615, side * 0.063, 0.068, 0.04, 0.016, '#e4e3d1', 10, 6);
      m.sphere(0.43, 0.63, 0, 0.075, 0.026, 0.033, '#373d37', 10, 6);
      m.tri([-0.25, 0.16, -0.1], [-0.47, 0.17, 0], [-0.25, 0.16, 0.1], '#535e52');
    });
    addTarget(begin, {
      sight: {
        id: 'redwood-goose-' + goose.index,
        kind: 'wildlife',
        label: 'Canada goose',
        description: 'A very well-dressed waterfowl with strong views about personal space.',
        entry: { x: lake.x + lake.rx + 0.8, y: lake.z },
      },
    });
  }
}
