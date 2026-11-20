import { GLASS_UV } from './glazing.js';
import { MATERIAL_IDS } from './materials.js';

const rand = (x, y, salt = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 19.3) * 43758.5453;
  return n - Math.floor(n);
};
const colorCache = new Map();
function rgb(hex) {
  if (!colorCache.has(hex))
    colorCache.set(hex, [
      parseInt(hex.slice(1, 3), 16) / 255,
      parseInt(hex.slice(3, 5), 16) / 255,
      parseInt(hex.slice(5, 7), 16) / 255,
    ]);
  return colorCache.get(hex);
}
function tint(hex, n) {
  return (
    '#' +
    rgb(hex)
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v * 255 + n)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
const sub = (a, b) => a.map((v, i) => v - b[i]),
  dot = (a, b) => a.reduce((v, n, i) => v + n * b[i], 0),
  cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  unit = (a) => {
    const n = Math.hypot(...a) || 1;
    return a.map((v) => v / n);
  };
const sphereTemplates = new Map();
function sphereTemplate(segments, rings) {
  const key = segments + ':' + rings;
  if (sphereTemplates.has(key)) return sphereTemplates.get(key);
  const points = new Float64Array(rings * segments * 18);
  let at = 0;
  const point = (i, j) => {
    const a = (i * Math.PI) / rings,
      b = (j * Math.PI * 2) / segments;
    return [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)];
  };
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segments; j++) {
      const a = point(i, j),
        b = point(i, j + 1),
        c = point(i + 1, j + 1),
        d = point(i + 1, j);
      for (const p of [a, d, c, a, c, b]) {
        points.set(p, at);
        at += 3;
      }
    }
  sphereTemplates.set(key, points);
  return points;
}
function sphereMaterial(material) {
  if (typeof material === 'string') return [-2 - MATERIAL_IDS[material], 0];
  if (material?.material) return [-2 - MATERIAL_IDS[material.material], material.angle || 0];
  if (material?.snow) return [-0.75, material.groom || 0];
  if (material?.water !== undefined) return [-1.75, material.water];
  if (material?.envelope) return [-1, -8];
  if (material?.glass !== undefined) return [GLASS_UV, material.glass];
  if (material?.window !== undefined) return [-1.05, material.window];
  if (material?.emissive) return [-1.25, material.emissive];
  if (material?.metal) return [-1.4, material.metal];
  return [-1, -1];
}
class Mesh {
  constructor() {
    this.data = [];
  }
  tri(a, b, c, color, uv = null) {
    const abx = b[0] - a[0],
      aby = b[1] - a[1],
      abz = b[2] - a[2],
      acx = c[0] - a[0],
      acy = c[1] - a[1],
      acz = c[2] - a[2];
    let nx = aby * acz - abz * acy,
      ny = abz * acx - abx * acz,
      nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    const col = typeof color === 'string' ? rgb(color) : color;
    let u = -1,
      v = -1,
      material = true;
    if (typeof uv === 'string') {
      u = -2 - MATERIAL_IDS[uv];
      v = 0;
    } else if (uv?.material) {
      u = -2 - MATERIAL_IDS[uv.material];
      v = uv.angle || 0;
    } else if (uv?.snow) {
      u = -0.75;
      v = uv.groom || 0;
    } else if (uv?.water !== undefined) {
      u = -1.75;
      v = uv.water;
    } else if (uv?.envelope) {
      u = -1;
      v = -8;
    } else if (uv?.glass !== undefined) {
      u = GLASS_UV;
      v = uv.glass;
    } else if (uv?.window !== undefined) {
      u = -1.05;
      v = uv.window;
    } else if (uv?.emissive) {
      u = -1.25;
      v = uv.emissive;
    } else if (uv?.metal) {
      u = -1.4;
      v = uv.metal;
    } else material = !uv;
    const data = this.data,
      r = col[0],
      g = col[1],
      blue = col[2];
    data.push(
      a[0],
      a[1],
      a[2],
      nx,
      ny,
      nz,
      r,
      g,
      blue,
      material ? u : uv[0][0],
      material ? v : uv[0][1],
    );
    data.push(
      b[0],
      b[1],
      b[2],
      nx,
      ny,
      nz,
      r,
      g,
      blue,
      material ? u : uv[1][0],
      material ? v : uv[1][1],
    );
    data.push(
      c[0],
      c[1],
      c[2],
      nx,
      ny,
      nz,
      r,
      g,
      blue,
      material ? u : uv[2][0],
      material ? v : uv[2][1],
    );
  }
  quad(a, b, c, d, color, uv = null) {
    this.tri(a, b, c, color, uv && !Array.isArray(uv) ? uv : uv && [uv[0], uv[1], uv[2]]);
    this.tri(a, c, d, color, uv && !Array.isArray(uv) ? uv : uv && [uv[0], uv[2], uv[3]]);
  }
  box(x, y, z, w, h, d, color, material = null) {
    const a = [x, y, z],
      b = [x + w, y, z],
      c = [x + w, y, z + d],
      e = [x, y, z + d],
      A = [x, y + h, z],
      B = [x + w, y + h, z],
      C = [x + w, y + h, z + d],
      E = [x, y + h, z + d];
    this.quad(a, b, c, e, color, material);
    this.quad(A, E, C, B, color, material);
    this.quad(e, c, C, E, color, material);
    this.quad(b, a, A, B, color, material);
    this.quad(a, e, E, A, color, material);
    this.quad(c, b, B, C, color, material);
  }
  cylinder(x, y, z, r, h, color, segments = 8, topRadius = r, material = null) {
    // Keep explicitly square roofs and beams square; round visible trunks,
    // domes and columns with more segments and continuous side normals.
    if (segments !== 4) segments = Math.max(segments, r >= 0.16 ? 16 : r >= 0.055 ? 10 : segments);
    for (let i = 0; i < segments; i++) {
      const a = (i * Math.PI * 2) / segments,
        b = ((i + 1) * Math.PI * 2) / segments,
        p = [x + Math.cos(a) * r, y, z + Math.sin(a) * r],
        q = [x + Math.cos(b) * r, y, z + Math.sin(b) * r],
        P = [x + Math.cos(a) * topRadius, y + h, z + Math.sin(a) * topRadius],
        Q = [x + Math.cos(b) * topRadius, y + h, z + Math.sin(b) * topRadius],
        start = this.data.length;
      this.quad(q, p, P, Q, color, material);
      if (segments >= 10)
        for (const [j, t] of [b, a, a, b, a, b].entries()) {
          const n = unit([Math.cos(t), (r - topRadius) / (h || 1e-8), Math.sin(t)]);
          for (let k = 0; k < 3; k++) this.data[start + j * 11 + 3 + k] = n[k];
        }
      if (topRadius) this.tri([x, y + h, z], Q, P, color, material);
    }
  }
  sphere(x, y, z, rx, ry, rz, color, segments = 8, rings = 4, material = null) {
    if (Math.max(rx, ry, rz) >= 0.25) {
      segments = Math.max(segments, 12);
      rings = Math.max(rings, 6);
    }
    const points = sphereTemplate(segments, rings),
      col = typeof color === 'string' ? rgb(color) : color,
      [u, v] = sphereMaterial(material),
      data = this.data;
    const ix = rx / (rx * rx || 1e-8),
      iy = ry / (ry * ry || 1e-8),
      iz = rz / (rz * rz || 1e-8),
      uvIndices = [0, 1, 2, 0, 2, 3];
    for (let i = 0; i < points.length; i += 3) {
      const px = points[i],
        py = points[i + 1],
        pz = points[i + 2],
        nx = px * ix,
        ny = py * iy,
        nz = pz * iz,
        length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const uv = Array.isArray(material) ? material[uvIndices[(i / 3) % 6]] : null;
      data.push(
        x + px * rx,
        y + py * ry,
        z + pz * rz,
        nx / length,
        ny / length,
        nz / length,
        col[0],
        col[1],
        col[2],
        uv ? uv[0] : u,
        uv ? uv[1] : v,
      );
    }
  }
  rod(a, b, r, color, segments = 6, material = null) {
    const axis = unit(sub(b, a)),
      u = unit(cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])),
      v = cross(axis, u),
      at = (p, t) => p.map((n, i) => n + (u[i] * Math.cos(t) + v[i] * Math.sin(t)) * r);
    for (let i = 0; i < segments; i++) {
      const t = (i * Math.PI * 2) / segments,
        t2 = ((i + 1) * Math.PI * 2) / segments,
        start = this.data.length;
      this.quad(at(a, t), at(a, t2), at(b, t2), at(b, t), color, material);
      if (segments >= 10)
        for (const [j, angle] of [t, t2, t2, t, t2, t].entries())
          for (let k = 0; k < 3; k++)
            this.data[start + j * 11 + 3 + k] = u[k] * Math.cos(angle) + v[k] * Math.sin(angle);
    }
  }
}
function matrixMultiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 4; i++) out[col * 4 + row] += a[i * 4 + row] * b[col * 4 + i];
  return out;
}
function rayBox(ray, lo, hi) {
  let near = 0,
    far = 220;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ray.dir[i]) < 1e-9) {
      if (ray.origin[i] < lo[i] || ray.origin[i] > hi[i]) return null;
    } else {
      let a = (lo[i] - ray.origin[i]) / ray.dir[i],
        b = (hi[i] - ray.origin[i]) / ray.dir[i];
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a);
      far = Math.min(far, b);
      if (near > far) return null;
    }
  }
  return near;
}
function rayTriangleValues(ray, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const ex = bx - ax,
    ey = by - ay,
    ez = bz - az,
    fx = cx - ax,
    fy = cy - ay,
    fz = cz - az,
    dx = ray.dir[0],
    dy = ray.dir[1],
    dz = ray.dir[2];
  const px = dy * fz - dz * fy,
    py = dz * fx - dx * fz,
    pz = dx * fy - dy * fx,
    det = ex * px + ey * py + ez * pz;
  if (Math.abs(det) < 1e-8) return null;
  const inv = 1 / det,
    tx = ray.origin[0] - ax,
    ty = ray.origin[1] - ay,
    tz = ray.origin[2] - az,
    u = (tx * px + ty * py + tz * pz) * inv;
  if (u < -0.0001 || u > 1.0001) return null;
  const qx = ty * ez - tz * ey,
    qy = tz * ex - tx * ez,
    qz = tx * ey - ty * ex,
    v = (dx * qx + dy * qy + dz * qz) * inv;
  if (v < -0.0001 || u + v > 1.0001) return null;
  const distance = (fx * qx + fy * qy + fz * qz) * inv;
  return distance > 0.01 ? distance : null;
}
function rayTriangle(ray, a, b, c) {
  return rayTriangleValues(ray, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}
export function rayTriangleAt(ray, data, i, stride = 11, indices = null) {
  const vertex = i / stride,
    a = indices ? indices[vertex] * stride : i,
    b = indices ? indices[vertex + 1] * stride : i + stride,
    c = indices ? indices[vertex + 2] * stride : i + stride * 2;
  return rayTriangleValues(
    ray,
    data[a],
    data[a + 1],
    data[a + 2],
    data[b],
    data[b + 1],
    data[b + 2],
    data[c],
    data[c + 1],
    data[c + 2],
  );
}
function pose(m, x, y, z, angle, draw) {
  const start = m.data.length;
  draw(m);
  const c = Math.cos(angle),
    s = Math.sin(angle);
  m.characters?.transform(
    start,
    new Float32Array([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, x, y, z, 1]),
    angle,
  );
  for (let i = start; i < m.data.length; i += 11) {
    const xx = m.data[i],
      zz = m.data[i + 2],
      nx = m.data[i + 3],
      nz = m.data[i + 5];
    m.data[i] = x + xx * c - zz * s;
    m.data[i + 1] += y;
    m.data[i + 2] = z + xx * s + zz * c;
    m.data[i + 3] = nx * c - nz * s;
    m.data[i + 5] = nx * s + nz * c;
    if (m.data[i + 9] <= -2) m.data[i + 10] += angle;
  }
}

// Wall indices match makeBuilding: north, south, west, east in building space.
// Rotate each outward normal into world space and compare it with the actual
// eye-to-building direction. This also handles off-center players and any yaw.
export function cutawayWallMask(building, eye) {
  const { x, y, w, d, rotation = 0 } = building,
    c = Math.cos(rotation),
    s = Math.sin(rotation);
  const dx = eye[0] - (x + w / 2),
    dz = eye[2] - (y + d / 2);
  const localX = c * dx + s * dz,
    localZ = -s * dx + c * dz;
  const facing = [-localZ, localZ, -localX, localX];
  return facing.reduce((mask, value, side) => (value > 1e-7 ? mask | (1 << side) : mask), 0);
}

export { rand, rgb, tint, sub, dot, cross, unit, Mesh, matrixMultiply, rayBox, rayTriangle, pose };
