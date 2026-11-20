import { Mesh, pose, rgb } from './geometry.js';
import { hatById } from './hat-catalog.js';

const hatGeometryCache = new Map();
/** Head-local original meshes. The same triangles furnish the shop windows
 * and attach to bone 3 on a person; none are screen-space decorations. */
export function getHatGeometry(id) {
  if (!hatById(id)) return null;
  if (hatGeometryCache.has(id)) return hatGeometryCache.get(id);
  const m = new Mesh(),
    h = hatById(id),
    [body, trim, gem] = h.colors;
  const band = (r, y, height, color = trim, rz = r * 0.87) => {
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12;
      m.quad(
        [Math.sin(a) * r, y, Math.cos(a) * rz],
        [Math.sin(b) * r, y, Math.cos(b) * rz],
        [Math.sin(b) * r, y + height, Math.cos(b) * rz],
        [Math.sin(a) * r, y + height, Math.cos(a) * rz],
        color,
      );
    }
  };
  const brim = (r, y = 0.035, rz = r * 0.82) => {
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12,
        A = [Math.sin(a) * r, y, Math.cos(a) * rz],
        B = [Math.sin(b) * r, y, Math.cos(b) * rz];
      m.tri([0, y, 0], B, A, body);
      m.tri([0, y - 0.012, 0], [A[0], y - 0.012, A[2]], [B[0], y - 0.012, B[2]], body);
      m.quad([A[0], y - 0.012, A[2]], [B[0], y - 0.012, B[2]], B, A, body);
    }
  };
  if (id === 'paper') {
    const a = [-0.18, 0.01, -0.13],
      b = [0.18, 0.01, -0.13],
      c = [0.18, 0.01, 0.13],
      d = [-0.18, 0.01, 0.13],
      l = [-0.16, 0.22, 0],
      r = [0.16, 0.22, 0];
    m.quad(a, l, r, b, body);
    m.quad(d, c, r, l, body);
    m.tri(a, d, l, trim);
    m.tri(b, r, c, trim);
    for (const z of [-0.131, 0.131])
      m.quad([-0.19, 0.005, z], [0.19, 0.005, z], [0.18, 0.065, z], [-0.18, 0.065, z], body);
    for (const z of [-0.133, 0.133])
      for (let i = 0; i < 4; i++) m.box(-0.12 + i * 0.063, 0.023, z, 0.04, 0.005, 0.002, trim);
  } else if (id === 'pirate') {
    m.sphere(0, 0.09, 0, 0.145, 0.13, 0.128, body, 20, 9);
    // A curled, three-cornered brim with a stitched gold edge.
    const edge = Array.from({ length: 36 }, (_, i) => {
      const a = (i * Math.PI) / 18,
        r = 0.215 + 0.04 * Math.cos(a * 3);
      return [Math.sin(a) * r, 0.05 + 0.1 * (0.5 - 0.5 * Math.cos(a * 3)), Math.cos(a) * r * 0.85];
    });
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i],
        b = edge[(i + 1) % edge.length];
      m.tri([0, 0.065, 0], b, a, body);
      m.tri([0, 0.05, 0], [a[0], a[1] - 0.012, a[2]], [b[0], b[1] - 0.012, b[2]], body);
      m.rod(a, b, 0.005, trim, 5);
    }
    // Small ivory skull and crossbones on the front of the crown.
    m.sphere(0, 0.136, 0.123, 0.035, 0.035, 0.011, gem, 12, 7);
    m.box(-0.022, 0.092, 0.128, 0.044, 0.025, 0.01, gem);
    for (const x of [-0.014, 0.014]) m.sphere(x, 0.14, 0.135, 0.009, 0.01, 0.004, body, 8, 4);
    for (const side of [-1, 1])
      m.rod(
        [-0.04, 0.078 + side * 0.014, 0.143],
        [0.04, 0.078 - side * 0.014, 0.143],
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
        [Math.sin(a) * 0.142, 0.01, Math.cos(a) * 0.128],
        [Math.sin(a) * 0.142, 0.064, Math.cos(a) * 0.128],
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
      return [Math.sin(a) * 0.29, 0.035 + 0.085 * Math.sin(a) ** 4, Math.cos(a) * 0.235];
    });
    for (let i = 0; i < 32; i++) {
      const a = edge[i],
        b = edge[(i + 1) % 32];
      m.tri([0, 0.04, 0], b, a, body);
      m.tri([0, 0.028, 0], [a[0], a[1] - 0.012, a[2]], [b[0], b[1] - 0.012, b[2]], body);
      m.rod(a, b, 0.004, gem, 5);
    }
    const ring = (top, i) => {
      const a = (i * Math.PI) / 12;
      return [
        Math.sin(a) * (top ? 0.103 : 0.143),
        top ? 0.235 + 0.035 * Math.abs(Math.sin(a)) : 0.045,
        Math.cos(a) * (top ? 0.105 : 0.13),
      ];
    };
    for (let i = 0; i < 24; i++) {
      const a = ring(true, i),
        b = ring(true, i + 1);
      m.quad(ring(false, i), ring(false, i + 1), b, a, body);
      m.tri([0, 0.225, 0], a, b, body);
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
      [0.1, 0.12, -0.015],
      [0.16, 0.24, -0.03],
      [0.15, 0.37, -0.05],
      [0.08, 0.49, -0.065],
    ];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      m.rod(a, b, 0.007, trim, 6);
      for (const side of [-1, 1]) m.tri(a, [a[0] + side * 0.05, a[1] + 0.065, a[2] + 0.01], b, gem);
    }
    m.sphere(0.12, 0.12, 0.04, 0.025, 0.03, 0.015, trim, 10, 6);
  } else if (id === 'wizard') {
    brim(0.245);
    m.cylinder(0, 0.035, 0, 0.145, 0.36, body, 24, 0.045);
    m.rod([0, 0.35, 0], [0.07, 0.53, 0.025], 0.04, body, 12);
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
      m.rod([x, 0.035, z], [Math.sin(b) * 0.146, 0.035, Math.cos(b) * 0.133], 0.009, body, 6);
      for (const side of [-1, 1]) {
        const tip = [x + Math.sin(a) * side * 0.04, 0.08, z + Math.cos(a) * side * 0.035],
          l = [x + Math.cos(a) * 0.025, 0.047, z - Math.sin(a) * 0.025],
          r = [x - Math.cos(a) * 0.025, 0.047, z + Math.sin(a) * 0.025];
        m.tri([x, 0.035, z], l, tip, body);
        m.tri([x, 0.035, z], tip, r, trim);
      }
    }
  } else if (id === 'stone-of-jordan') {
    // A conspicuously large, irregular stone, balanced on the head.
    const ring = (y, r, phase) =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i * Math.PI * 2) / 9 + phase,
          k = 1 + 0.11 * Math.sin(i * 2.4 + y * 3);
        return [Math.sin(a) * r * k, y + 0.025 * Math.sin(i * 1.7), Math.cos(a) * r * 0.82 * k];
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
      m.tri([0, 0.54, 0], rings[3][(i + 1) % 9], rings[3][i], i % 2 ? body : trim);
    for (const [a, b] of [
      [
        [-0.07, 0.22, 0.258],
        [0.03, 0.34, 0.232],
      ],
      [
        [0.03, 0.34, 0.232],
        [0.09, 0.26, 0.255],
      ],
      [
        [0.09, 0.26, 0.255],
        [-0.03, 0.25, 0.262],
      ],
    ])
      m.rod(a, b, 0.009, gem, 5);
  } else if (id === 'santa') {
    const rings = [
        [0, 0.035, 0.145],
        [0, 0.16, 0.13],
        [0.04, 0.3, 0.085],
        [0.13, 0.4, 0.045],
        [0.21, 0.37, 0.012],
      ],
      point = (r, i) => [
        r[0] + Math.sin((i * Math.PI) / 10) * r[2],
        r[1],
        Math.cos((i * Math.PI) / 10) * r[2] * 0.87,
      ];
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
        A = [Math.sin(a) * 0.145, 0.13, Math.cos(a) * 0.13],
        B = [Math.sin(b) * 0.145, 0.13, Math.cos(b) * 0.13],
        tip = [Math.sin(mid) * 0.153, 0.33, Math.cos(mid) * 0.139];
      m.tri(A, B, tip, body);
      m.tri(
        [B[0] * 0.975, B[1], B[2] * 0.975],
        [A[0] * 0.975, A[1], A[2] * 0.975],
        [tip[0] * 0.975, tip[1], tip[2] * 0.975],
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
export function drawHatModel(m, id, x, y, z, angle = 0, scale = 1) {
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
