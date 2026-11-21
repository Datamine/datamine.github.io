import type { ParcelRectangle } from './types/parcels.ts';

import { Mesh, pose, tint, unit, cross, sub } from './geometry.ts';
import type { Material } from './types/geometry.ts';

const labBrainCache = new Map<string, Mesh>();
/** Two original, folded cortical surfaces with a real central fissure. The
 * grooves deform the actual surface, and finite-difference normals preserve
 * the soft lobes without flattening the gyri into painted stripes. */
export function neuralBrainMesh(small = false, color = '#cba0b0') {
  const key = small + color;
  if (labBrainCache.has(key)) return labBrainCache.get(key)!;
  const m = new Mesh(),
    segments = small ? 16 : 32,
    rings = small ? 10 : 18;
  for (const side of [-1, 1] satisfies [number, number]) {
    const surface = (theta: number, phi: number) => {
      const s = Math.sin(theta),
        fold =
          Math.sin(phi * 7 + Math.sin(theta * 4) * 1.4 + side * 0.4) +
          0.45 * Math.sin(theta * 14 + phi * 3),
        ripple = (small ? 0.012 : 0.025) * fold * s;
      const x = side * 0.222 + Math.cos(phi) * s * (0.205 + ripple);
      return [
        side < 0 ? Math.min(-0.012, x) : Math.max(0.012, x),
        Math.cos(theta) * (0.25 + ripple * 0.4),
        Math.sin(phi) * s * (0.34 + ripple),
      ] satisfies [number, number, number];
    };
    const normal = (theta: number, phi: number) => {
      const e = 0.002,
        a = sub(surface(theta + e, phi), surface(theta - e, phi)),
        b = sub(surface(theta, phi + e), surface(theta, phi - e));
      let n = unit(cross(b, a)),
        p = surface(theta, phi);
      if (Math.hypot(...n) < 0.1) n = [0, Math.cos(theta) >= 0 ? 1 : -1, 0];
      if (n[0] * (p[0] - side * 0.222) + n[1] * p[1] + n[2] * p[2] < 0) n = n.map((v) => -v);
      return n;
    };
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < segments; j++) {
        const uv = [
            [(i / rings) * Math.PI, (j / segments) * Math.PI * 2] satisfies [number, number],
            [((i + 1) / rings) * Math.PI, (j / segments) * Math.PI * 2] satisfies [number, number],
            [((i + 1) / rings) * Math.PI, ((j + 1) / segments) * Math.PI * 2] satisfies [
              number,
              number,
            ],
            [(i / rings) * Math.PI, ((j + 1) / segments) * Math.PI * 2] satisfies [number, number],
          ],
          points = uv.map((p) => surface(...p));
        const shade = Math.round(7 * Math.sin(j * 0.8 + i * 0.6)),
          start = m.data.length;
        m.quad(points[0], points[1], points[2], points[3], tint(color, shade));
        for (const [v, p] of [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]].entries()) {
          const n = normal(...p);
          for (let k = 0; k < 3; k++) m.data[start + v * 11 + 3 + k] = n[k];
        }
      }
    // Fine conductive traces follow selected gyri rather than enclosing
    // the brain in an opaque sphere. Dark, recessed seams remain visible.
    if (!small)
      for (let row = 0; row < 3; row++) {
        const theta = 0.55 + row * 0.73;
        for (let j = 0; j < 24; j++) {
          const a = surface(theta, (j * Math.PI * 2) / 24),
            b = surface(theta, ((j + 1) * Math.PI * 2) / 24);
          a[1] += 0.008;
          b[1] += 0.008;
          m.rod(a, b, 0.005, row === 1 ? '#c6c7c3' : '#b08098', 3);
        }
      }
  }
  // Cerebellum and a short, non-gory brainstem.
  m.sphere(0, -0.24, -0.15, 0.15, 0.1, 0.13, tint(color, -19), 12, 6);
  m.cylinder(0, -0.38, -0.11, 0.048, 0.15, tint(color, -12), 10, 0.06);
  labBrainCache.set(key, m);
  return m;
}
function appendLabBrain(
  m: Mesh,
  x: number,
  y: number,
  z: number,
  scale = 1,
  angle = 0,
  small = false,
  color?: string,
) {
  const data = neuralBrainMesh(small, color).data;
  pose(m, x, y, z, angle, () => {
    for (let i = 0; i < data.length; i += 11)
      m.data.push(
        data[i] * scale,
        data[i + 1] * scale,
        data[i + 2] * scale,
        ...data.slice(i + 3, i + 11),
      );
  });
}
function labArc(
  m: Mesh,
  center: readonly number[],
  radius: number,
  axis: number,
  color: string,
  thickness = 0.012,
  start = 0,
  end = Math.PI * 2,
  material: (Material | undefined) | null = null,
) {
  const at = (a: number) =>
    axis === 0
      ? [center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius, center[2]]
      : axis === 1
        ? [center[0], center[1] + Math.sin(a) * radius, center[2] + Math.cos(a) * radius]
        : [center[0] + Math.cos(a) * radius, center[1], center[2] + Math.sin(a) * radius];
  const n = Math.ceil((end - start) * Math.max(4, radius * 10)),
    sides = thickness < 0.007 ? 3 : thickness < 0.016 ? 4 : 6;
  for (let i = 0; i < n; i++)
    m.rod(
      at(start + ((end - start) * i) / n),
      at(start + ((end - start) * (i + 1)) / n),
      thickness,
      color,
      sides,
      material,
    );
}
const labRect = (r: ParcelRectangle) => [
  [r.x - r.w / 2, r.z - r.d / 2] satisfies [number, number],
  [r.x + r.w / 2, r.z - r.d / 2],
  [r.x + r.w / 2, r.z + r.d / 2],
  [r.x - r.w / 2, r.z + r.d / 2],
];
/** +Z is the doorway. All dimensions are plot-local and share one footprint
 * plan; the suspended apparatus never consumes the doorway or working aisle. */
export function neuralLabLayout({ w, d }: { w: number; d: number }) {
  return {
    core: { x: 0, z: -d / 2 + 0.74, w: 1.28, d: 1.13 },
    gpu: { x: -w / 2 + 0.45, z: -d / 2 + 0.46, w: 0.55, d: 0.5 },
    desk: { x: -w / 2 + 0.5, z: -d / 2 + 1.82, w: 0.66, d: 0.85 },
    pods: [
      { x: w / 2 - 0.45, z: -d / 2 + 0.55, w: 0.57, d: 0.62 },
      { x: w / 2 - 0.45, z: -d / 2 + 1.78, w: 0.57, d: 0.62 },
    ],
  };
}
function drawLabPod(m: Mesh, p: ParcelRectangle, color: string, index: number) {
  m.cylinder(p.x, 0.02, p.z, 0.29, 0.16, '#526b73', 24, 0.29, { metal: 0.3 });
  m.cylinder(p.x, 0.18, p.z, 0.24, 0.045, '#99b8b6', 24, 0.24);
  m.cylinder(p.x, 1.4, p.z, 0.27, 0.085, '#81999a', 24, 0.24, { metal: 0.28 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4,
      x = p.x + Math.cos(a) * 0.235,
      z = p.z + Math.sin(a) * 0.235;
    m.rod([x, 0.21, z], [x, 1.42, z], 0.012, '#9ab6b8', 8);
  }
  for (const y of [0.32, 1.25] satisfies [number, number])
    labArc(m, [p.x, y, p.z], 0.245, 2, '#91c1c3', 0.009, 0, Math.PI * 2, { emissive: 0.18 });
  appendLabBrain(m, p.x, 0.94, p.z, 0.44, index ? 0.25 : -0.2, true, color);
  m.cylinder(p.x, 0.25, p.z, 0.075, 0.16, '#4d6971', 16, 0.12);
  m.cylinder(p.x, 0.415, p.z, 0.09, 0.025, color, 16, 0.09, { emissive: 0.2 });
  // A pressure gauge, small isolation valves, and a braided return line.
  m.sphere(p.x - 0.17, 1.45, p.z, 0.06, 0.04, 0.06, '#d1d7c8', 12, 6);
  m.rod([p.x - 0.17, 1.48, p.z], [p.x - 0.14, 1.48, p.z + 0.025], 0.005, '#536772', 5);
  m.rod([p.x + 0.21, 0.2, p.z], [p.x + 0.31, 0.2, p.z], 0.017, '#91a5a1', 8);
  m.rod([p.x + 0.31, 0.2, p.z], [p.x + 0.31, 1.35, p.z], 0.014, '#5e7e85', 8);
}
export function drawNeuralLabInterior(
  m: Mesh,
  b: import('./types/interiors.ts').InteriorBuilding,
  base: number,
) {
  const plan = neuralLabLayout(b),
    { w, d } = b;
  b.neuralLab = plan;
  b.interiorObstacles = [plan.core, plan.gpu, plan.desk, ...plan.pods].map((r) =>
    labRect(r).map(([x, z]) => [b.x + w / 2 + x, b.y + d / 2 + z]),
  );
  pose(m, b.x + w / 2, base, b.y + d / 2, 0, () => {
    m.box(-w / 2 + 0.12, -0.01, -d / 2 + 0.12, w - 0.24, 0.035, d - 0.24, '#788e91', 'concrete');
    // Ceramic cable channels and restrained floor illumination.
    for (const side of [-1, 1] satisfies [number, number]) {
      const x = side * (w / 2 - 0.13);
      m.box(x - 0.015, 0.027, -d / 2 + 0.15, 0.03, 0.012, d - 0.32, '#97b1b1');
      m.box(x - 0.006, 0.042, -d / 2 + 0.27, 0.012, 0.005, d - 0.6, '#8cb4b7', { emissive: 0.12 });
    }
    const c = plan.core;
    m.cylinder(c.x, 0.025, c.z, 0.56, 0.15, '#3f5e6a', 32, 0.56, { metal: 0.25 });
    m.cylinder(c.x, 0.175, c.z, 0.49, 0.06, '#a9bab8', 32, 0.49);
    m.cylinder(c.x, 0.235, c.z, 0.42, 0.1, '#566f79', 32, 0.36);
    m.cylinder(c.x, 0.335, c.z, 0.34, 0.025, '#90b6bd', 32, 0.34, { emissive: 0.18 });
    for (const a of [0, Math.PI] satisfies [number, number]) {
      const x = c.x + Math.cos(a) * 0.59,
        z = c.z + 0.1;
      m.box(x - 0.035, 0.12, z - 0.035, 0.07, 2.11, 0.07, '#758e96', { metal: 0.25 });
      m.sphere(x, 2.26, z, 0.1, 0.09, 0.1, '#adbfc1', 16, 8, { metal: 0.2 });
      m.rod(
        [x, 2.27, z] satisfies [number, number, number],
        [c.x, 2.42, c.z] satisfies [number, number, number],
        0.025,
        '#819fa6',
        10,
      );
    }
    labArc(
      m,
      [c.x, 1.65, c.z] satisfies [number, number, number],
      0.65,
      0,
      '#87a8b5',
      0.024,
      0,
      Math.PI * 2,
      { metal: 0.3 },
    );
    labArc(
      m,
      [c.x, 1.65, c.z] satisfies [number, number, number],
      0.53,
      1,
      '#a597b2',
      0.018,
      0,
      Math.PI * 2,
      { metal: 0.22 },
    );
    labArc(
      m,
      [c.x, 1.08, c.z] satisfies [number, number, number],
      0.47,
      2,
      '#77acba',
      0.013,
      0,
      Math.PI * 2,
      { emissive: 0.2 },
    );
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [c.x + side * 0.22, 0.36, c.z] satisfies [number, number, number],
        [c.x + side * 0.22, 1.23, c.z] satisfies [number, number, number],
        0.008,
        '#6d9fae',
        6,
        {
          emissive: 0.12,
        },
      );
    const gpu = plan.gpu;
    m.box(gpu.x - 0.275, 0.03, gpu.z - 0.25, 0.55, 1.83, 0.5, '#354e5d', { metal: 0.18 });
    for (let row = 0; row < 7; row++) {
      const y = 0.16 + row * 0.22;
      m.box(gpu.x - 0.24, y, gpu.z + 0.258, 0.48, 0.16, 0.016, '#576f80');
      for (let j = 0; j < 5; j++)
        m.box(gpu.x - 0.2 + j * 0.08, y + 0.045, gpu.z + 0.28, 0.045, 0.025, 0.012, '#293f4d');
      m.sphere(
        gpu.x + 0.19,
        y + 0.12,
        gpu.z + 0.282,
        0.01,
        0.01,
        0.008,
        row % 3 ? '#82b4b7' : '#c5ad79',
        8,
        4,
        { emissive: 0.22 },
      );
    }
    const desk = plan.desk;
    for (const dx of [-0.27, 0.27] satisfies [number, number])
      for (const dz of [-0.33, 0.33] satisfies [number, number])
        m.box(desk.x + dx - 0.018, 0.02, desk.z + dz - 0.018, 0.036, 0.72, 0.036, '#6d8691', {
          metal: 0.2,
        });
    m.box(desk.x - 0.33, 0.74, desk.z - 0.425, 0.66, 0.06, 0.85, '#aebcb4', 'concrete');
    m.box(desk.x - 0.27, 0.85, desk.z - 0.28, 0.06, 0.42, 0.58, '#344c5a');
    m.box(desk.x - 0.203, 0.88, desk.z - 0.24, 0.012, 0.34, 0.5, '#658d99', { emissive: 0.16 });
    m.box(desk.x - 0.09, 0.805, desk.z - 0.28, 0.24, 0.025, 0.47, '#577381');
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 3; col++)
        m.box(
          desk.x - 0.065 + col * 0.065,
          0.832,
          desk.z - 0.25 + row * 0.08,
          0.042,
          0.006,
          0.045,
          '#a1b2ad',
        );
    // A tiny electrode cap, with wires terminating at the console.
    m.sphere(desk.x + 0.11, 0.91, desk.z + 0.27, 0.12, 0.1, 0.12, '#a8a0b1', 12, 6);
    for (let i = 0; i < 4; i++) {
      const x = desk.x + 0.02 + i * 0.055;
      m.rod(
        [x, 0.98, desk.z + 0.27] satisfies [number, number, number],
        [desk.x - 0.08, 0.83, desk.z + 0.08] satisfies [number, number, number],
        0.005,
        '#728b9c',
        5,
      );
    }
    plan.pods.forEach((p, i) => drawLabPod(m, p, i ? '#aab795' : '#a5a1c3', i));
    // Wall-sized connectome: branching pathways and synapses, not a blank
    // office whiteboard. It stays behind the apparatus and below the roof.
    const z = -d / 2 + 0.13;
    m.box(0.33, 0.65, z, Math.max(0.6, w / 2 - 0.53), 1.18, 0.025, '#344e60');
    const nodes = [
      [0.49, 0.82] satisfies [number, number],
      [0.69, 1.3] satisfies [number, number],
      [0.95, 0.95] satisfies [number, number],
      [1.17, 1.49] satisfies [number, number],
      [1.35, 1.05] satisfies [number, number],
      [0.66, 1.62] satisfies [number, number],
      [1.35, 1.74] satisfies [number, number],
    ].filter((p) => p[0] < w / 2 - 0.22);
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < Math.min(nodes.length, i + 3); j++)
        m.rod(
          [nodes[i][0], nodes[i][1], z + 0.04] satisfies [number, number, number],
          [nodes[j][0], nodes[j][1], z + 0.04] satisfies [number, number, number],
          0.006,
          '#7b9cad',
          5,
          { emissive: 0.1 },
        );
    for (const [x, y] of nodes)
      m.sphere(x, y, z + 0.05, 0.025, 0.025, 0.015, '#adbec8', 10, 5, { emissive: 0.16 });
  });
  return plan;
}

/** Only appended while inside this lab. Heavy cortical geometry is cached;
 * the pulse, particles and bobbing brain share the ordinary dynamic draw batch. */
export function drawNeuralLabAnimation(
  m: Mesh,
  b: import('./types/interiors.ts').InteriorBuilding & { id?: string },
  base: number,
  time: number,
  { reduced = false }: { reduced?: boolean } | undefined = {},
) {
  if (b.id !== 'ai-lab') return;
  const p = typeof b.neuralLab === 'object' ? b.neuralLab : neuralLabLayout(b),
    t = reduced ? 0 : time * 0.001,
    c = p.core;
  pose(m, b.x + b.w / 2, base, b.y + b.d / 2, b.rotation || 0, () => {
    appendLabBrain(m, c.x, 1.67 + Math.sin(t * 0.8) * 0.025, c.z, 1, 0.1 * Math.sin(t * 0.37));
    const pulse = 0.18 + 0.08 * (0.5 + 0.5 * Math.sin(t * 1.3));
    for (let i = 0; i < 5; i++) {
      const a = t * 0.35 + (i * Math.PI * 2) / 5,
        x = c.x + Math.cos(a) * 0.58,
        y = 1.65 + Math.sin(a) * 0.58,
        z = c.z;
      m.sphere(x, y, z, 0.025, 0.025, 0.025, i % 2 ? '#c7b1ce' : '#9bc3d0', 10, 5, {
        emissive: pulse,
      });
    }
    for (let i = 0; i < 4; i++) {
      const a = t * 0.48 + (i * Math.PI) / 2;
      m.sphere(
        c.x,
        1.65 + Math.sin(a) * 0.49,
        c.z + Math.cos(a) * 0.49,
        0.02,
        0.02,
        0.02,
        '#b0c8d0',
        8,
        4,
        { emissive: 0.25 },
      );
    }
    // Traveling activity along four electrode feeds.
    for (let i = 0; i < 4; i++) {
      const f = (t * 0.22 + i * 0.25) % 1,
        x = c.x + (i % 2 ? 1 : -1) * 0.22,
        y = 0.4 + f * 0.83;
      m.sphere(x, y, c.z, 0.013, 0.045, 0.013, '#9dbacb', 8, 4, { emissive: 0.25 });
    }
    const desk = p.desk;
    for (let i = 0; i < 27; i++) {
      const at = (j: number) => {
        const z = desk.z - 0.22 + j * 0.0175,
          phase = j * 0.72 - t * 1.65,
          spike = Math.exp(-((Math.sin(phase * 0.23) / 0.22) ** 2)),
          y = 1.03 + Math.sin(phase) * (0.018 + 0.07 * spike);
        return [desk.x - 0.186, y, z] satisfies [number, number, number];
      };
      m.rod(at(i), at(i + 1), 0.004, '#b5d0c1', 5, { emissive: 0.26 });
    }
    for (const [i, pod] of p.pods.entries()) {
      labArc(
        m,
        [pod.x, 0.5 + ((t * 0.08 + i * 0.45) % 1) * 0.65, pod.z],
        0.2,
        2,
        i ? '#c8b7d3' : '#a6c7b1',
        0.005,
        0,
        Math.PI * 2,
        { emissive: 0.16 },
      );
    }
  });
}
