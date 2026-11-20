import { pose } from './geometry.js';

export const BUS_SIGNS = Object.freeze(['MARKET ST', 'NIGHTLIFE']);
function signalDisk(m, y, color, material = null) {
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6,
      b = ((i + 1) * Math.PI) / 6;
    m.tri(
      [0.111, y, 0],
      [0.111, y + Math.cos(a) * 0.065, Math.sin(a) * 0.065],
      [0.111, y + Math.cos(b) * 0.065, Math.sin(b) * 0.065],
      color,
      material,
    );
  }
}
export function drawTrafficSignalPosts(m, signals, ground) {
  for (const p of signals.fixtures) {
    p.base = ground(p.x, p.z) + (p.overhead ? 0.8 : 0);
    pose(m, p.x, p.base, p.z, p.angle, () => {
      if (p.overhead) {
        const span = p.width + 1;
        m.rod([0, 2.45, -span], [0, 2.45, span], 0.008, '#78877e', 4);
        m.rod([0, 2.45, 0], [0, 2.37, 0], 0.018, '#849182', 6);
      } else {
        m.cylinder(0, 0, 0, 0.055, 0.11, '#7b806e', 8, 0.04);
        m.cylinder(0, 0.1, 0, 0.028, 2.27, '#9a9166', 8, 0.028, { metal: 0.25 });
      }
      m.box(-0.13, 1.65, -0.12, 0.24, 0.76, 0.24, '#b29a51');
      m.box(0.098, 1.68, -0.096, 0.012, 0.7, 0.192, '#303a34');
      for (const [y, color] of [
        [2.22, '#563932'],
        [2.02, '#595234'],
        [1.82, '#334c3b'],
      ]) {
        signalDisk(m, y, color);
        m.box(0.1, y + 0.072, -0.09, 0.085, 0.023, 0.18, '#5e654c');
      }
    });
  }
}
export function drawTrafficSignalLights(m, signals, time, viewer, visible = () => true) {
  for (const p of signals.fixtures)
    if (Math.hypot(p.x - viewer.x, p.z - viewer.z) < 35 && visible(p.x, p.z, p.base)) {
      const green = signals.phase(p.node, time) === p.phase;
      pose(
        m,
        p.x + 0.004 * Math.cos(p.angle),
        p.base,
        p.z + 0.004 * Math.sin(p.angle),
        p.angle,
        () => signalDisk(m, green ? 1.82 : 2.22, green ? '#67de84' : '#f26b4b', { emissive: 0.95 }),
      );
    }
}
export function drawSlowBus(m, bus, time, signs) {
  pose(m, bus.x, bus.base, bus.z, bus.angle, () => {
    m.box(-0.98, 0.14, -0.305, 1.96, 0.48, 0.61, '#c75e4c', { metal: 0.15 });
    m.box(-0.97, 0.62, -0.3, 1.94, 0.36, 0.6, '#e6e2c8');
    m.box(-0.99, 0.98, -0.31, 1.98, 0.055, 0.62, '#dadccb');
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const x = -0.89 + i * 0.29;
        m.box(
          x,
          0.66,
          side * 0.304,
          0.235,
          0.26,
          0.012,
          i % 4 === 0 ? '#486766' : '#6d8d8a',
          'glass',
        );
        m.box(x + 0.242, 0.64, side * 0.311, 0.026, 0.34, 0.015, '#c5c8b2');
      }
      m.box(-0.94, 0.57, side * 0.309, 1.86, 0.06, 0.015, '#dcdcc2');
      for (const x of [-0.62, 0.58]) {
        m.sphere(x, 0.18, side * 0.315, 0.17, 0.17, 0.04, '#333e3d', 14, 7);
        m.sphere(x, 0.18, side * 0.35, 0.09, 0.09, 0.009, '#acb9b4', 12, 6);
        for (let spoke = 0; spoke < 3; spoke++) {
          const a = bus.travel / 0.17 + (spoke * Math.PI * 2) / 3;
          m.rod(
            [x, 0.18, side * 0.36],
            [x + Math.cos(a) * 0.075, 0.18 + Math.sin(a) * 0.075, side * 0.36],
            0.008,
            '#71857f',
            5,
          );
        }
      }
      // A pair of glazed folding doors near the front axle.
      for (const x of [0.33, 0.49]) {
        m.box(x, 0.28, side * 0.322, 0.145, 0.57, 0.014, '#465b59');
        m.box(x + 0.025, 0.45, side * 0.332, 0.095, 0.35, 0.008, '#829c96', 'glass');
      }
    }
    m.box(0.982, 0.65, -0.26, 0.015, 0.24, 0.52, '#5e7d7b', 'glass');
    m.box(-0.995, 0.65, -0.25, 0.015, 0.23, 0.5, '#6d8a83', 'glass');
    m.box(0.993, 0.91, -0.26, 0.015, 0.075, 0.52, '#263d33');
    const uv = signs.get(bus.destination === 'Market Street' ? 'MARKET ST' : 'NIGHTLIFE');
    if (uv)
      m.quad(
        [1.012, 0.92, 0.25],
        [1.012, 0.92, -0.25],
        [1.012, 0.98, -0.25],
        [1.012, 0.98, 0.25],
        '#f2dda0',
        uv,
      );
    for (const side of [-1, 1]) {
      m.box(0.995, 0.35, side * 0.21 - 0.04, 0.014, 0.075, 0.08, '#f0e9b6', { emissive: 0.45 });
      m.box(-1.005, 0.36, side * 0.21 - 0.03, 0.012, 0.06, 0.06, '#cf5f4b');
      m.rod([0.83, 0.83, side * 0.3], [1.0, 0.83, side * 0.4], 0.015, '#83918b', 7);
      m.box(0.96, 0.76, side * 0.4 - 0.015, 0.08, 0.12, 0.03, '#425b59');
    }
    m.box(-0.4, 1.035, -0.2, 0.65, 0.08, 0.4, '#9cae9f');
    for (let i = 0; i < 6; i++) m.box(-0.36 + i * 0.1, 1.12, -0.16, 0.035, 0.012, 0.32, '#6b8078');
    m.box(0.99, 0.19, -0.27, 0.045, 0.055, 0.54, '#919f91');
  });
}
