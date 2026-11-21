import type { SignAtlas } from './types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import type { Mesh } from './geometry.ts';
import { pose, unit, cross, sub } from './geometry.ts';
import type { Color, Material, NumericVector } from './types/geometry.ts';

// Alcatraz is centered at reference (42, 2.5); share its east/west latitude.
const prometheusX = 96,
  prometheusZ = 3.75;
export const PROMETHEUS = Object.freeze({
  x: prometheusX,
  z: prometheusZ,
  rotation: Math.PI / 2,
  figureBase: 4.75,
  torch: { x: prometheusX - 0.12, y: 13.23, z: prometheusZ - 1.25 },
});
const prometheusBronze = '#679b87',
  prometheusShade = '#527f73',
  prometheusMetal = { metal: 0.32 };

const prometheusCurve = (
  a: readonly number[],
  b: readonly number[],
  c: readonly number[],
  d: readonly number[],
  t: number,
) =>
  b.map(
    (v, i) =>
      0.5 *
      (2 * v +
        (-a[i] + c[i]) * t +
        (2 * a[i] - 5 * v + 4 * c[i] - d[i]) * t * t +
        (-a[i] + 3 * v - 3 * c[i] + d[i]) * t * t * t),
  );
function prometheusSamples(points: readonly (readonly number[])[], steps: number) {
  const result = [];
  for (let i = 0; i < points.length - 1; i++)
    for (let j = 0; j < steps; j++)
      result.push(
        prometheusCurve(
          points[Math.max(0, i - 1)],
          points[i],
          points[i + 1],
          points[Math.min(points.length - 1, i + 2)],
          j / steps,
        ),
      );
  if (points.length) result.push([...points.at(-1)!]);
  return result;
}
/** Shared vertex normals follow the actual curved surface, including the
 * folds and shifting centerline, so no horizontal lighting seams remain. */
function prometheusSurface(
  m: Mesh,
  rows: number,
  sides: number,
  point: (row: number, angle: number) => NumericVector,
  color: Color,
  material: Material | undefined,
) {
  const vertices = Array.from({ length: rows }, (_, j) =>
    Array.from({ length: sides }, (_, i) => point(j, (i * Math.PI * 2) / sides)),
  );
  const normals = vertices.map((row, j) =>
    row.map((p, i) =>
      unit(
        cross(
          sub(vertices[Math.min(rows - 1, j + 1)][i], vertices[Math.max(0, j - 1)][i]),
          sub(row[(i + 1) % sides], row[(i + sides - 1) % sides]),
        ),
      ),
    ),
  );
  for (let j = 1; j < rows; j++)
    for (let i = 0; i < sides; i++) {
      const n = (i + 1) % sides,
        start = m.data.length,
        indices = [
          [j - 1, n] satisfies [number, number],
          [j - 1, i] satisfies [number, number],
          [j, i] satisfies [number, number],
          [j - 1, n] satisfies [number, number],
          [j, i] satisfies [number, number],
          [j, n] satisfies [number, number],
        ];
      m.quad(
        vertices[j - 1][n],
        vertices[j - 1][i],
        vertices[j][i],
        vertices[j][n],
        color,
        material,
      );
      for (const [v, [row, col]] of indices.entries())
        for (let k = 0; k < 3; k++) m.data[start + v * 11 + 3 + k] = normals[row][col][k];
    }
}
function prometheusLoft(
  m: Mesh,
  rings: readonly (readonly number[])[],
  color: string,
  flutes = 0,
  material: Material = prometheusMetal,
  sides = 48,
  steps = 3,
) {
  const samples = prometheusSamples(
    rings.map((r) => [r[0], r[1], r[2], r[3] || 0, r[4] || 0]),
    steps,
  );
  prometheusSurface(
    m,
    samples.length,
    sides,
    (j, a) => {
      const r = samples[j],
        fold = flutes ? 1 + Math.cos(a * flutes + r[0] * 0.5) * 0.065 : 1;
      return [
        r[3] + Math.cos(a) * Math.max(0.001, r[1]) * fold,
        r[0],
        r[4] + Math.sin(a) * Math.max(0.001, r[2]) * fold,
      ];
    },
    color,
    material,
  );
}
/** Curved, tapered limbs and locks, rather than constant-width cylinders. */
function prometheusTube(
  m: Mesh,
  points: number[][],
  color: string,
  sides = 24,
  steps = 3,
  material: Material = prometheusMetal,
) {
  const samples = prometheusSamples(points, steps),
    frames = samples.map((p, j) => {
      const axis = unit(
          sub(
            samples[Math.min(samples.length - 1, j + 1)].slice(0, 3),
            samples[Math.max(0, j - 1)].slice(0, 3),
          ),
        ),
        u = unit(
          cross(
            axis,
            Math.abs(axis[2]) < 0.85
              ? ([0, 0, 1] satisfies [number, number, number])
              : ([1, 0, 0] satisfies [number, number, number]),
          ),
        );
      return [u, cross(u, axis)];
    });
  prometheusSurface(
    m,
    samples.length,
    sides,
    (j, a) =>
      samples[j]
        .slice(0, 3)
        .map(
          (v, k) =>
            v +
            Math.max(0.002, samples[j][3]) *
              (frames[j][0][k] * Math.cos(a) + frames[j][1][k] * Math.sin(a)),
        ),
    color,
    material,
  );
}

export function drawPrometheus(m: Mesh, signs: SignAtlas) {
  const site = PROMETHEUS,
    start = m.data.length;
  pose(m, site.x, 0, site.z, site.rotation, () => {
    // A low breakwater and four levels of granite make the harbor plinth.
    m.cylinder(0, -0.3, 0, 3.05, 0.42, '#8b9d91', 64, 2.85, 'stone');
    m.cylinder(0, 0.12, 0, 2.8, 0.18, '#c2c7b4', 64, 2.7, 'stone');
    for (const [r, y, h, top] of [
      [2.2, 0.3, 0.18, 2.2] satisfies [number, number, number, number],
      [2, 0.48, 0.18, 2] satisfies [number, number, number, number],
      [1.8, 0.66, 0.22, 1.8] satisfies [number, number, number, number],
      [1.58, 0.88, 0.22, 1.58] satisfies [number, number, number, number],
      [1.4, 1.1, 0.2, 1.4] satisfies [number, number, number, number],
      [1.27, 1.3, 2.75, 1.19] satisfies [number, number, number, number],
    ])
      m.cylinder(0, y, 0, r, h, '#aeb9aa', 8, top, 'stone');
    for (const y of [1.35, 3.55, 4.05] satisfies [number, number, number])
      m.cylinder(0, y, 0, 1.34, 0.14, '#d2cdb4', 8, 1.34, 'stone');
    m.cylinder(0, 4.19, 0, 1.45, 0.22, '#a0b0a1', 8, 1.45, 'stone');
    m.cylinder(0, 4.41, 0, 1.3, 0.2, '#c6c7b0', 8, 1.2, 'stone');
    m.cylinder(0, 4.61, 0, 1.2, 0.14, '#a7b3a3', 12, 1.2, 'stone');
    // Shallow stone joints and bronze acanthus leaves catch the light
    // without enlarging the island or adding another texture.
    for (let side = 0; side < 8; side++)
      pose(m, 0, 0, 0, (side * Math.PI) / 4, () => {
        for (const y of [1.87, 2.48, 3.09] satisfies [number, number, number])
          m.box(-0.43, y, 1.184, 0.86, 0.014, 0.018, '#909f93', 'stone');
        for (const hand of [-1, 1] satisfies [number, number])
          prometheusTube(
            m,
            [
              [hand * 0.07, 3.79, 1.29, 0.013] satisfies [number, number, number, number],
              [hand * 0.23, 3.87, 1.34, 0.036] satisfies [number, number, number, number],
              [hand * 0.32, 4.0, 1.29, 0.012] satisfies [number, number, number, number],
            ],
            '#929a78',
            10,
            2,
          );
      });
    m.box(-0.9, 2.02, 1.255, 1.8, 0.9, 0.06, '#7c8264', { metal: 0.35 });
    const uv = signs.get('PROMETHEUS');
    if (uv)
      m.quad(
        [-0.85, 2.45, 1.325] satisfies [number, number, number],
        [0.85, 2.45, 1.325] satisfies [number, number, number],
        [0.85, 2.85, 1.325] satisfies [number, number, number],
        [-0.85, 2.85, 1.325] satisfies [number, number, number],
        '#ffffff',
        uv,
      );
    const motto = signs.get('Fire is for everyone.');
    if (motto)
      m.quad(
        [-0.8, 2.08, 1.325] satisfies [number, number, number],
        [0.8, 2.08, 1.325] satisfies [number, number, number],
        [0.8, 2.29, 1.325] satisfies [number, number, number],
        [-0.8, 2.29, 1.325] satisfies [number, number, number],
        '#ffffff',
        motto,
      );
    pose(m, 0, site.figureBase, 0, 0, () => {
      // Contrapposto: one foot advances while the other bears the weight.
      for (const [x, z, y] of [
        [-0.29, 0.22, 0] satisfies [number, number, number],
        [0.3, -0.08, 0.08] satisfies [number, number, number],
      ]) {
        m.sphere(x, y + 0.1, z + 0.13, 0.19, 0.12, 0.36, prometheusShade, 24, 10, prometheusMetal);
        prometheusTube(
          m,
          [
            [x, y + 0.16, z, 0.135] satisfies [number, number, number, number],
            [x * 0.97, 0.7, z - 0.025, 0.2] satisfies [number, number, number, number],
            [x * 0.9, 1.3, z - 0.06, 0.155] satisfies [number, number, number, number],
            [x * 0.9, 1.7, z - 0.06, 0.18] satisfies [number, number, number, number],
          ],
          prometheusBronze,
        );
        prometheusTube(
          m,
          [
            [x * 0.9, 1.7, z - 0.06, 0.18] satisfies [number, number, number, number],
            [x * 0.84, 2.25, z - 0.03, 0.285] satisfies [number, number, number, number],
            [x * 0.75, 3.25, 0, 0.27] satisfies [number, number, number, number],
          ],
          prometheusBronze,
        );
        for (let toe = 0; toe < 4; toe++)
          m.sphere(
            x - 0.11 + toe * 0.068,
            y + 0.105,
            z + 0.39,
            0.043,
            0.065,
            0.085,
            prometheusBronze,
            12,
            6,
            prometheusMetal,
          );
      }
      // A folded chiton falls diagonally, leaving the chest and shoulders clear.
      prometheusLoft(
        m,
        [
          [0.75, 0.57, 0.5, -0.06, 0.03] satisfies [number, number, number, number, number],
          [1.1, 0.66, 0.5, -0.04, 0] satisfies [number, number, number, number, number],
          [1.65, 0.62, 0.47, 0, 0] satisfies [number, number, number, number, number],
          [2.3, 0.58, 0.43, 0.04, 0] satisfies [number, number, number, number, number],
          [2.95, 0.53, 0.37, 0.06, 0] satisfies [number, number, number, number, number],
          [3.45, 0.47, 0.31, 0.03, 0] satisfies [number, number, number, number, number],
          [3.7, 0.39, 0.26] satisfies [number, number, number],
        ],
        prometheusShade,
        18,
      );
      prometheusLoft(
        m,
        [
          [3.2, 0.44, 0.28] satisfies [number, number, number],
          [3.7, 0.4, 0.26, 0.02, 0] satisfies [number, number, number, number, number],
          [4.1, 0.43, 0.29, 0.025, -0.015] satisfies [number, number, number, number, number],
          [4.6, 0.56, 0.33, 0, -0.015] satisfies [number, number, number, number, number],
          [5.1, 0.67, 0.34, -0.025, 0] satisfies [number, number, number, number, number],
          [5.45, 0.64, 0.3, -0.035, 0] satisfies [number, number, number, number, number],
          [5.65, 0.43, 0.24, -0.02, 0] satisfies [number, number, number, number, number],
          [5.83, 0.2, 0.18] satisfies [number, number, number],
        ],
        prometheusBronze,
      );
      for (const side of [-1, 1] satisfies [number, number]) {
        m.sphere(side * 0.27, 5.05, 0.29, 0.29, 0.15, 0.075, '#72a58d', 32, 16, prometheusMetal);
        for (let rib = 0; rib < 3; rib++)
          prometheusTube(
            m,
            [
              [side * 0.07, 4.7 - rib * 0.19, 0.3, 0.016] satisfies [
                number,
                number,
                number,
                number,
              ],
              [side * 0.23, 4.68 - rib * 0.19, 0.32, 0.025] satisfies [
                number,
                number,
                number,
                number,
              ],
              [side * 0.39, 4.73 - rib * 0.19, 0.245, 0.008] satisfies [
                number,
                number,
                number,
                number,
              ],
            ],
            prometheusBronze,
            12,
            2,
          );
      }
      m.rod(
        [-0.46, 5.45, -0.12] satisfies [number, number, number],
        [0.36, 3.65, 0.3] satisfies [number, number, number],
        0.09,
        prometheusShade,
        20,
        prometheusMetal,
      );
      for (let i = 0; i < 6; i++)
        m.rod(
          [-0.49 + i * 0.035, 5.45, 0.05] satisfies [number, number, number],
          [0.31 + i * 0.03, 3.65, 0.29] satisfies [number, number, number],
          0.015,
          '#81ac94',
          6,
          prometheusMetal,
        );
      m.cylinder(0, 3.65, 0, 0.43, 0.12, '#b09e6a', 40, 0.43, { metal: 0.5 });
      // Extended right arm, carefully articulated wrist and torch-bearing hand.
      const shoulder = [-0.6, 5.38, 0] satisfies [number, number, number],
        elbow = [-1.02, 6.42, 0.02] satisfies [number, number, number],
        hand = [-1.25, 7.28, 0.12] satisfies [number, number, number];
      m.sphere(...shoulder, 0.27, 0.31, 0.28, prometheusBronze, 28, 14, prometheusMetal);
      prometheusTube(
        m,
        [
          [...shoulder, 0.23],
          [-0.83, 5.82, 0.015, 0.265] satisfies [number, number, number, number],
          [-0.96, 6.18, 0.02, 0.2] satisfies [number, number, number, number],
          [...elbow, 0.18],
        ],
        prometheusBronze,
        28,
      );
      m.sphere(...elbow, 0.19, 0.23, 0.2, prometheusBronze, 28, 14, prometheusMetal);
      prometheusTube(
        m,
        [
          [...elbow, 0.18],
          [-1.12, 6.7, 0.04, 0.195] satisfies [number, number, number, number],
          [-1.22, 7.07, 0.09, 0.125] satisfies [number, number, number, number],
          [...hand, 0.105],
        ],
        prometheusBronze,
        28,
      );
      m.sphere(...hand, 0.19, 0.23, 0.17, '#74a78f', 24, 12, prometheusMetal);
      for (let i = 0; i < 4; i++)
        prometheusTube(
          m,
          [
            [-1.4, 7.29 + i * 0.075, 0.14, 0.034] satisfies [number, number, number, number],
            [-1.31, 7.3 + i * 0.075, 0.23, 0.038] satisfies [number, number, number, number],
            [-1.19, 7.31 + i * 0.075, 0.22, 0.033] satisfies [number, number, number, number],
            [-1.17, 7.3 + i * 0.075, 0.16, 0.018] satisfies [number, number, number, number],
          ],
          prometheusShade,
          10,
          2,
        );
      prometheusTube(
        m,
        [
          [-1.09, 7.24, 0.14, 0.045] satisfies [number, number, number, number],
          [-1.11, 7.39, 0.22, 0.04] satisfies [number, number, number, number],
          [-1.21, 7.43, 0.24, 0.021] satisfies [number, number, number, number],
        ],
        prometheusBronze,
        12,
        2,
      );
      const leftShoulder = [0.6, 5.35, 0] satisfies [number, number, number],
        leftElbow = [0.96, 4.55, 0.1] satisfies [number, number, number],
        leftHand = [0.58, 4.05, 0.35] satisfies [number, number, number];
      m.sphere(...leftShoulder, 0.27, 0.3, 0.27, prometheusBronze, 28, 14, prometheusMetal);
      prometheusTube(
        m,
        [
          [...leftShoulder, 0.23],
          [0.84, 5.08, 0.045, 0.245] satisfies [number, number, number, number],
          [...leftElbow, 0.17],
        ],
        prometheusBronze,
        28,
      );
      m.sphere(...leftElbow, 0.19, 0.21, 0.19, prometheusBronze, 28, 14, prometheusMetal);
      prometheusTube(
        m,
        [
          [...leftElbow, 0.17],
          [0.85, 4.3, 0.23, 0.185] satisfies [number, number, number, number],
          [...leftHand, 0.105],
        ],
        prometheusBronze,
        28,
      );
      m.sphere(...leftHand, 0.17, 0.21, 0.16, prometheusBronze, 28, 14, prometheusMetal);
      for (let finger = 0; finger < 4; finger++)
        prometheusTube(
          m,
          [
            [0.48 + finger * 0.055, 4.05, 0.44, 0.028] satisfies [number, number, number, number],
            [0.5 + finger * 0.055, 3.91, 0.47, 0.033] satisfies [number, number, number, number],
            [0.55 + finger * 0.05, 3.9, 0.4, 0.018] satisfies [number, number, number, number],
          ],
          prometheusBronze,
          10,
          2,
        );
      // Broken bronze shackles remain in his lowered hand.
      for (let link = 0; link < 7; link++)
        for (let i = 0; i < 16; i++) {
          if (link === 6 && i > 10) continue;
          const a = (i * Math.PI) / 8,
            b = ((i + 1) * Math.PI) / 8,
            y = 4.04 - link * 0.14,
            at = (t: number) =>
              link % 2
                ? ([0.6 + Math.cos(t) * 0.085, y + Math.sin(t) * 0.13, 0.42] satisfies [
                    number,
                    number,
                    number,
                  ])
                : ([0.6, y + Math.sin(t) * 0.13, 0.42 + Math.cos(t) * 0.085] satisfies [
                    number,
                    number,
                    number,
                  ]);
          m.rod(at(a), at(b), 0.023, '#a39062', 8, { metal: 0.5 });
        }
      m.cylinder(0, 5.45, 0, 0.19, 0.42, prometheusBronze, 28);
      prometheusLoft(
        m,
        [
          [5.72, 0.12, 0.15, 0, 0.06] satisfies [number, number, number, number, number],
          [5.82, 0.24, 0.22, 0, 0.045] satisfies [number, number, number, number, number],
          [6, 0.31, 0.28, 0, 0.025] satisfies [number, number, number, number, number],
          [6.2, 0.34, 0.3, 0, 0.02] satisfies [number, number, number, number, number],
          [6.4, 0.28, 0.26, 0, 0] satisfies [number, number, number, number, number],
          [6.55, 0.12, 0.12, 0, -0.015] satisfies [number, number, number, number, number],
          [6.57, 0.005, 0.005] satisfies [number, number, number],
        ],
        '#76a48b',
        0,
        prometheusMetal,
        56,
        3,
      );
      // Brow, cheek planes, nose, lips and a curled beard give the face a gaze.
      for (const side of [-1, 1] satisfies [number, number]) {
        m.rod(
          [side * 0.05, 6.25, 0.29] satisfies [number, number, number],
          [side * 0.25, 6.24, 0.26] satisfies [number, number, number],
          0.045,
          prometheusShade,
          12,
          prometheusMetal,
        );
        m.sphere(side * 0.135, 6.18, 0.296, 0.057, 0.028, 0.025, '#375f58', 16, 8, prometheusMetal);
        m.sphere(
          side * 0.23,
          6.03,
          0.22,
          0.11,
          0.1,
          0.09,
          prometheusBronze,
          20,
          10,
          prometheusMetal,
        );
        m.sphere(
          side * 0.325,
          6.12,
          0.015,
          0.045,
          0.1,
          0.067,
          prometheusBronze,
          20,
          12,
          prometheusMetal,
        );
        prometheusTube(
          m,
          [
            [side * 0.04, 6.22, 0.311, 0.016] satisfies [number, number, number, number],
            [side * 0.13, 6.235, 0.32, 0.021] satisfies [number, number, number, number],
            [side * 0.22, 6.205, 0.283, 0.01] satisfies [number, number, number, number],
          ],
          '#81ad92',
          12,
          2,
        );
      }
      m.tri(
        [-0.07, 6.25, 0.29] satisfies [number, number, number],
        [0.07, 6.25, 0.29] satisfies [number, number, number],
        [0, 6.02, 0.47] satisfies [number, number, number],
        '#88b297',
        prometheusMetal,
      );
      m.tri(
        [-0.07, 6.25, 0.29] satisfies [number, number, number],
        [0, 6.02, 0.47] satisfies [number, number, number],
        [-0.075, 5.99, 0.32] satisfies [number, number, number],
        prometheusBronze,
        prometheusMetal,
      );
      m.tri(
        [0.07, 6.25, 0.29] satisfies [number, number, number],
        [0.075, 5.99, 0.32] satisfies [number, number, number],
        [0, 6.02, 0.47] satisfies [number, number, number],
        prometheusShade,
        prometheusMetal,
      );
      m.rod(
        [-0.11, 5.94, 0.3] satisfies [number, number, number],
        [0.11, 5.94, 0.3] satisfies [number, number, number],
        0.025,
        prometheusShade,
        12,
        prometheusMetal,
      );
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8,
          x = Math.cos(a),
          z = Math.sin(a);
        prometheusTube(
          m,
          [
            [x * 0.12, 6.52, z * 0.1, 0.035] satisfies [number, number, number, number],
            [x * 0.26, 6.49, z * 0.23, 0.07] satisfies [number, number, number, number],
            [x * 0.335, 6.32, z * 0.29, 0.066] satisfies [number, number, number, number],
            [x * 0.32, 6.18, z * 0.25, 0.025] satisfies [number, number, number, number],
          ],
          prometheusShade,
          12,
          3,
        );
      }
      prometheusLoft(
        m,
        [
          [5.65, 0.025, 0.025, 0, 0.27] satisfies [number, number, number, number, number],
          [5.73, 0.14, 0.075, 0, 0.27] satisfies [number, number, number, number, number],
          [5.83, 0.22, 0.085, 0, 0.27] satisfies [number, number, number, number, number],
          [5.91, 0.245, 0.045, 0, 0.29] satisfies [number, number, number, number, number],
        ],
        prometheusShade,
        9,
        prometheusMetal,
        40,
        3,
      );
      m.cylinder(-1.25, 7.15, 0.12, 0.055, 1.05, '#bca36a', 24, 0.07, { metal: 0.55 });
      m.cylinder(-1.25, 8.2, 0.12, 0.11, 0.2, '#a28b54', 32, 0.35, { metal: 0.6 });
      m.cylinder(-1.25, 8.4, 0.12, 0.36, 0.09, '#d5bc78', 40, 0.34, { metal: 0.6 });
      for (const y of [7.74, 7.84, 8.12] satisfies [number, number, number])
        m.cylinder(-1.25, y, 0.12, 0.08, 0.035, '#d6c28b', 32, 0.08, { metal: 0.55 });
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5,
          dx = Math.cos(a),
          dz = Math.sin(a);
        prometheusTube(
          m,
          [
            [-1.25 + dx * 0.12, 8.22, 0.12 + dz * 0.12, 0.013] satisfies [
              number,
              number,
              number,
              number,
            ],
            [-1.25 + dx * 0.27, 8.31, 0.12 + dz * 0.27, 0.021] satisfies [
              number,
              number,
              number,
              number,
            ],
            [-1.25 + dx * 0.355, 8.43, 0.12 + dz * 0.355, 0.012] satisfies [
              number,
              number,
              number,
              number,
            ],
          ],
          '#e1c98b',
          10,
          2,
          { metal: 0.55 },
        );
      }
    });
  });
  return {
    id: 'prometheus',
    kind: 'monument',
    label: contentText('prometheus.drawPrometheus.label-1', {}),
    navigationAccess: 'observe-only',
    entry: { x: site.x - 4, y: site.z - 0.5 },
    description: contentText('prometheus.drawPrometheus.description-2', {}),
    start,
    count: m.data.length - start,
    lo: [site.x - 3.1, -0.3, site.z - 3.1] satisfies [number, number, number],
    hi: [site.x + 3.1, 14.9, site.z + 3.1] satisfies [number, number, number],
  };
}

export function drawPrometheusFlame(m: Mesh, time: number, reduced = false) {
  const p = PROMETHEUS.torch,
    t = reduced ? 0 : time * 0.001;
  pose(m, p.x, p.y, p.z, 0, () => {
    for (let tongue = 0; tongue < 3; tongue++) {
      const a = (tongue * Math.PI * 2) / 3,
        height = 1.1 + Math.sin(t * 3.1 + tongue) * 0.17,
        rings = [];
      for (let i = 0; i <= 10; i++) {
        const f = i / 10,
          r = 0.13 * Math.sin(Math.PI * f) ** 0.7 + 0.015,
          lean = Math.sin(t * 2.4 + tongue + f * 2) * f * 0.23;
        rings.push([
          f * height,
          r,
          r,
          Math.cos(a) * (0.12 + lean),
          Math.sin(a) * (0.12 + lean),
        ] satisfies [number, number, number, number, number]);
      }
      prometheusLoft(
        m,
        rings,
        tongue === 0 ? '#ffdf7c' : tongue === 1 ? '#fcb349' : '#f5cb5d',
        0,
        { emissive: 0.95 },
        20,
        1,
      );
    }
    m.sphere(0, 0.18, 0, 0.16, 0.25, 0.16, '#fff0bd', 24, 14, { emissive: 1 });
  });
}

export function prometheusTorchLight() {
  return {
    ...PROMETHEUS.torch,
    y: PROMETHEUS.torch.y + 0.45,
    radius: 1.65,
    strength: 0.4,
    poolStrength: 0,
    color: [1, 0.58, 0.18] satisfies [number, number, number],
  };
}
