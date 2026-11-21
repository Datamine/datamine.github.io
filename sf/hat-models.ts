import { Mesh, pose, rgb } from './geometry.ts';
import { hatById } from './hat-catalog.ts';

const hatGeometryCache = new Map<string, { mesh: Mesh; channels: number[] }>();
/** Head-local original meshes. The same triangles furnish the shop windows
 * and attach to bone 3 on a person; none are screen-space decorations. */
export function getHatGeometry(id: string) {
  if (!hatById(id)) return null;
  if (hatGeometryCache.has(id)) return hatGeometryCache.get(id)!;
  const m = new Mesh(),
    h = hatById(id)!,
    [body, trim, gem] = h.colors;
  const band = (r: number, y: number, height: number, color = trim, rz = r * 0.87) => {
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12;
      m.quad(
        [Math.sin(a) * r, y, Math.cos(a) * rz] satisfies [number, number, number],
        [Math.sin(b) * r, y, Math.cos(b) * rz] satisfies [number, number, number],
        [Math.sin(b) * r, y + height, Math.cos(b) * rz] satisfies [number, number, number],
        [Math.sin(a) * r, y + height, Math.cos(a) * rz] satisfies [number, number, number],
        color,
      );
    }
  };
  const brim = (r: number, y = 0.035, rz = r * 0.82) => {
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12,
        A = [Math.sin(a) * r, y, Math.cos(a) * rz] satisfies [number, number, number],
        B = [Math.sin(b) * r, y, Math.cos(b) * rz] satisfies [number, number, number];
      m.tri([0, y, 0] satisfies [number, number, number], B, A, body);
      m.tri(
        [0, y - 0.012, 0] satisfies [number, number, number],
        [A[0], y - 0.012, A[2]] satisfies [number, number, number],
        [B[0], y - 0.012, B[2]] satisfies [number, number, number],
        body,
      );
      m.quad(
        [A[0], y - 0.012, A[2]] satisfies [number, number, number],
        [B[0], y - 0.012, B[2]] satisfies [number, number, number],
        B,
        A,
        body,
      );
    }
  };
  if (id === 'paper') {
    const a = [-0.18, 0.01, -0.13] satisfies [number, number, number],
      b = [0.18, 0.01, -0.13] satisfies [number, number, number],
      c = [0.18, 0.01, 0.13] satisfies [number, number, number],
      d = [-0.18, 0.01, 0.13] satisfies [number, number, number],
      l = [-0.16, 0.22, 0] satisfies [number, number, number],
      r = [0.16, 0.22, 0] satisfies [number, number, number];
    m.quad(a, l, r, b, body);
    m.quad(d, c, r, l, body);
    m.tri(a, d, l, trim);
    m.tri(b, r, c, trim);
    for (const z of [-0.131, 0.131] satisfies [number, number])
      m.quad(
        [-0.19, 0.005, z] satisfies [number, number, number],
        [0.19, 0.005, z] satisfies [number, number, number],
        [0.18, 0.065, z] satisfies [number, number, number],
        [-0.18, 0.065, z] satisfies [number, number, number],
        body,
      );
    for (const z of [-0.133, 0.133] satisfies [number, number])
      for (let i = 0; i < 4; i++) m.box(-0.12 + i * 0.063, 0.023, z, 0.04, 0.005, 0.002, trim);
  } else if (id === 'pirate') {
    m.sphere(0, 0.09, 0, 0.145, 0.13, 0.128, body, 20, 9);
    // A curled, three-cornered brim with a stitched gold edge.
    const edge = Array.from({ length: 36 }, (_, i) => {
      const a = (i * Math.PI) / 18,
        r = 0.215 + 0.04 * Math.cos(a * 3);
      return [
        Math.sin(a) * r,
        0.05 + 0.1 * (0.5 - 0.5 * Math.cos(a * 3)),
        Math.cos(a) * r * 0.85,
      ] satisfies [number, number, number];
    });
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i],
        b = edge[(i + 1) % edge.length];
      m.tri([0, 0.065, 0] satisfies [number, number, number], b, a, body);
      m.tri(
        [0, 0.05, 0] satisfies [number, number, number],
        [a[0], a[1] - 0.012, a[2]] satisfies [number, number, number],
        [b[0], b[1] - 0.012, b[2]] satisfies [number, number, number],
        body,
      );
      m.rod(a, b, 0.005, trim, 5);
    }
    // Small ivory skull and crossbones on the front of the crown.
    m.sphere(0, 0.136, 0.123, 0.035, 0.035, 0.011, gem, 12, 7);
    m.box(-0.022, 0.092, 0.128, 0.044, 0.025, 0.01, gem);
    for (const x of [-0.014, 0.014] satisfies [number, number])
      m.sphere(x, 0.14, 0.135, 0.009, 0.01, 0.004, body, 8, 4);
    for (const side of [-1, 1] satisfies [number, number])
      m.rod(
        [-0.04, 0.078 + side * 0.014, 0.143] satisfies [number, number, number],
        [0.04, 0.078 - side * 0.014, 0.143] satisfies [number, number, number],
        0.005,
        gem,
        6,
      );
  } else if (id === 'beanie') {
    m.sphere(0, 0.055, 0, 0.139, 0.16, 0.124, body, 16, 8);
    band(0.145, 0.0, 0.065, trim, 0.13);
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      m.rod(
        [Math.sin(a) * 0.142, 0.01, Math.cos(a) * 0.128] satisfies [number, number, number],
        [Math.sin(a) * 0.142, 0.064, Math.cos(a) * 0.128] satisfies [number, number, number],
        0.003,
        body,
        4,
      );
    }
    m.sphere(0, 0.213, 0, 0.035, 0.035, 0.035, trim, 10, 5);
  } else if (id === 'stetson') {
    // Broad, upturned sides and a pinched crown, rather than a flat disk.
    const edge = Array.from({ length: 32 }, (_, i) => {
      const a = (i * Math.PI) / 16;
      return [Math.sin(a) * 0.29, 0.035 + 0.085 * Math.sin(a) ** 4, Math.cos(a) * 0.235] satisfies [
        number,
        number,
        number,
      ];
    });
    for (let i = 0; i < 32; i++) {
      const a = edge[i],
        b = edge[(i + 1) % 32];
      m.tri([0, 0.04, 0] satisfies [number, number, number], b, a, body);
      m.tri(
        [0, 0.028, 0] satisfies [number, number, number],
        [a[0], a[1] - 0.012, a[2]] satisfies [number, number, number],
        [b[0], b[1] - 0.012, b[2]] satisfies [number, number, number],
        body,
      );
      m.rod(a, b, 0.004, gem, 5);
    }
    const ring = (top: boolean, i: number) => {
      const a = (i * Math.PI) / 12;
      return [
        Math.sin(a) * (top ? 0.103 : 0.143),
        top ? 0.235 + 0.035 * Math.abs(Math.sin(a)) : 0.045,
        Math.cos(a) * (top ? 0.105 : 0.13),
      ] satisfies [number, number, number];
    };
    for (let i = 0; i < 24; i++) {
      const a = ring(true, i),
        b = ring(true, i + 1);
      m.quad(ring(false, i), ring(false, i + 1), b, a, body);
      m.tri([0, 0.225, 0] satisfies [number, number, number], a, b, body);
    }
    band(0.145, 0.055, 0.035, trim, 0.132);
    m.box(-0.025, 0.059, 0.132, 0.05, 0.03, 0.012, gem);
  } else if (id === 'panama') {
    brim(0.25);
    m.cylinder(0, 0.035, 0, 0.14, 0.17, body, 24, 0.125);
    band(0.142, 0.057, 0.037, trim, 0.142);
    m.box(-0.055, 0.2, -0.065, 0.11, 0.008, 0.11, trim);
  } else if (id === 'beret') {
    m.sphere(0.035, 0.09, -0.012, 0.195, 0.105, 0.16, body, 20, 8);
    band(0.14, 0.0, 0.043, trim, 0.125);
    m.cylinder(0.047, 0.175, -0.025, 0.015, 0.045, body, 8);
  } else if (id === 'top-hat') {
    brim(0.215);
    m.cylinder(0, 0.035, 0, 0.13, 0.31, body, 24, 0.15);
    band(0.137, 0.06, 0.048);
    m.cylinder(0, 0.345, 0, 0.15, 0.012, body, 24, 0.15);
    m.box(-0.025, 0.065, 0.139, 0.05, 0.038, 0.012, gem);
  } else if (id === 'cavalier') {
    brim(0.28, 0.045);
    m.sphere(0, 0.09, -0.01, 0.15, 0.14, 0.13, body, 16, 8);
    band(0.149, 0.05, 0.039);
    // Curved feather with a raised quill and individual vanes.
    const points = [
      [0.1, 0.12, -0.015] satisfies [number, number, number],
      [0.16, 0.24, -0.03] satisfies [number, number, number],
      [0.15, 0.37, -0.05] satisfies [number, number, number],
      [0.08, 0.49, -0.065] satisfies [number, number, number],
    ];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      m.rod(a, b, 0.007, trim, 6);
      for (const side of [-1, 1] satisfies [number, number])
        m.tri(
          a,
          [a[0] + side * 0.05, a[1] + 0.065, a[2] + 0.01] satisfies [number, number, number],
          b,
          gem,
        );
    }
    m.sphere(0.12, 0.12, 0.04, 0.025, 0.03, 0.015, trim, 10, 6);
  } else if (id === 'wizard') {
    brim(0.245);
    m.cylinder(0, 0.035, 0, 0.145, 0.36, body, 24, 0.045);
    m.rod(
      [0, 0.35, 0] satisfies [number, number, number],
      [0.07, 0.53, 0.025] satisfies [number, number, number],
      0.04,
      body,
      12,
    );
    m.sphere(0.085, 0.54, 0.026, 0.039, 0.025, 0.033, body, 12, 6);
    band(0.146, 0.05, 0.045);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5,
        r = 0.12 - i * 0.014,
        y = 0.14 + i * 0.051;
      m.sphere(Math.sin(a) * r, y, Math.cos(a) * r, 0.014, 0.014, 0.01, trim, 8, 4);
    }
    m.sphere(0, 0.14, 0.12, 0.025, 0.025, 0.013, gem, 10, 6);
  } else if (id === 'laurel') {
    // Open wreath, rather than a solid cap: the wearer's hair remains visible.
    for (let i = 0; i < 19; i++) {
      const a = 0.3 + (i * (Math.PI * 2 - 0.6)) / 18,
        x = Math.sin(a) * 0.146,
        z = Math.cos(a) * 0.133;
      const b = a + 0.18;
      m.rod(
        [x, 0.035, z] satisfies [number, number, number],
        [Math.sin(b) * 0.146, 0.035, Math.cos(b) * 0.133] satisfies [number, number, number],
        0.009,
        body,
        6,
      );
      for (const side of [-1, 1] satisfies [number, number]) {
        const tip = [
            x + Math.sin(a) * side * 0.04,
            0.08,
            z + Math.cos(a) * side * 0.035,
          ] satisfies [number, number, number],
          l = [x + Math.cos(a) * 0.025, 0.047, z - Math.sin(a) * 0.025] satisfies [
            number,
            number,
            number,
          ],
          r = [x - Math.cos(a) * 0.025, 0.047, z + Math.sin(a) * 0.025] satisfies [
            number,
            number,
            number,
          ];
        m.tri([x, 0.035, z] satisfies [number, number, number], l, tip, body);
        m.tri([x, 0.035, z] satisfies [number, number, number], tip, r, trim);
      }
    }
  } else if (id === 'stone-of-jordan') {
    // A conspicuously large, irregular stone, balanced on the head.
    const ring = (y: number, r: number, phase: number) =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i * Math.PI * 2) / 9 + phase,
          k = 1 + 0.11 * Math.sin(i * 2.4 + y * 3);
        return [
          Math.sin(a) * r * k,
          y + 0.025 * Math.sin(i * 1.7),
          Math.cos(a) * r * 0.82 * k,
        ] satisfies [number, number, number];
      });
    const rings = [
      ring(0.035, 0.15, 0),
      ring(0.16, 0.32, 0.12),
      ring(0.39, 0.27, -0.08),
      ring(0.51, 0.1, 0.1),
    ];
    for (let j = 1; j < rings.length; j++)
      for (let i = 0; i < 9; i++) {
        const k = (i + 1) % 9;
        m.tri(rings[j - 1][i], rings[j][i], rings[j][k], i % 3 ? body : trim);
        m.tri(rings[j - 1][i], rings[j][k], rings[j - 1][k], i % 4 ? body : trim);
      }
    for (let i = 0; i < 9; i++)
      m.tri(
        [0, 0.54, 0] satisfies [number, number, number],
        rings[3][(i + 1) % 9],
        rings[3][i],
        i % 2 ? body : trim,
      );
    for (const [a, b] of [
      [
        [-0.07, 0.22, 0.258] satisfies [number, number, number],
        [0.03, 0.34, 0.232] satisfies [number, number, number],
      ],
      [
        [0.03, 0.34, 0.232] satisfies [number, number, number],
        [0.09, 0.26, 0.255] satisfies [number, number, number],
      ],
      [
        [0.09, 0.26, 0.255] satisfies [number, number, number],
        [-0.03, 0.25, 0.262] satisfies [number, number, number],
      ],
    ])
      m.rod(a, b, 0.009, gem, 5);
  } else if (id === 'santa') {
    const rings = [
        [0, 0.035, 0.145] satisfies [number, number, number],
        [0, 0.16, 0.13] satisfies [number, number, number],
        [0.04, 0.3, 0.085] satisfies [number, number, number],
        [0.13, 0.4, 0.045] satisfies [number, number, number],
        [0.21, 0.37, 0.012] satisfies [number, number, number],
      ],
      point = (r: number[], i: number) =>
        [
          r[0] + Math.sin((i * Math.PI) / 10) * r[2],
          r[1],
          Math.cos((i * Math.PI) / 10) * r[2] * 0.87,
        ] satisfies [number, number, number];
    for (let j = 1; j < rings.length; j++)
      for (let i = 0; i < 20; i++)
        m.quad(
          point(rings[j - 1], i),
          point(rings[j - 1], i + 1),
          point(rings[j], i + 1),
          point(rings[j], i),
          i % 5 ? body : gem,
        );
    band(0.15, 0.005, 0.07, trim, 0.135);
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      m.sphere(Math.sin(a) * 0.145, 0.04, Math.cos(a) * 0.13, 0.022, 0.036, 0.022, trim, 8, 5);
    }
    m.sphere(0.22, 0.365, 0, 0.048, 0.052, 0.046, trim, 12, 7);
  } else if (id === 'crown') {
    // Folded blue paper, with the open zigzag silhouette of a partyhat.
    band(0.145, 0.0, 0.13, body, 0.13);
    band(0.148, 0.006, 0.016, gem, 0.133);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3,
        b = ((i + 1) * Math.PI) / 3,
        mid = (a + b) / 2,
        A = [Math.sin(a) * 0.145, 0.13, Math.cos(a) * 0.13] satisfies [number, number, number],
        B = [Math.sin(b) * 0.145, 0.13, Math.cos(b) * 0.13] satisfies [number, number, number],
        tip = [Math.sin(mid) * 0.153, 0.33, Math.cos(mid) * 0.139] satisfies [
          number,
          number,
          number,
        ];
      m.tri(A, B, tip, body);
      m.tri(
        [B[0] * 0.975, B[1], B[2] * 0.975] satisfies [number, number, number],
        [A[0] * 0.975, A[1], A[2] * 0.975] satisfies [number, number, number],
        [tip[0] * 0.975, tip[1], tip[2] * 0.975] satisfies [number, number, number],
        trim,
      );
      m.rod(A, tip, 0.0025, gem, 4);
    }
  }
  const palette = h.colors.map(rgb),
    channels = [];
  for (let i = 0; i < m.data.length; i += 33) {
    const color = m.data.slice(i + 6, i + 9);
    channels.push(palette.findIndex((p) => p.every((c, k) => Math.abs(c - color[k]) < 1e-6)));
  }
  const result = { mesh: m, channels };
  hatGeometryCache.set(id, result);
  return result;
}
export function drawHatModel(
  m: Mesh,
  id: string,
  x: number,
  y: number,
  z: number,
  angle = 0,
  scale = 1,
) {
  const model = getHatGeometry(id);
  if (!model) return;
  pose(m, x, y, z, angle, () => {
    const data = model.mesh.data;
    for (let i = 0; i < data.length; i += 11)
      m.data.push(
        data[i] * scale,
        data[i + 1] * scale,
        data[i + 2] * scale,
        ...data.slice(i + 3, i + 11),
      );
  });
}
