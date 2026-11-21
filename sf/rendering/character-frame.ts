import type { CharacterDraw, SkinnedMesh } from '../types/rendering.ts';
import type { NumericVector } from '../types/geometry.ts';
import { affineNormalMatrix } from './mesh-transform.ts';

/** Affine transforms and CPU reference/picking for the cached character draw.
 * Matrices are column-major, matching WebGL. Bone rows match the native rig. */
export function characterRoot(
  x: number,
  base: number,
  z: number,
  angle: number,
  height = 1,
  out = new Float32Array(16),
) {
  const s = Math.sin(angle),
    c = Math.cos(angle);
  out.set([s, 0, -c, 0, 0, height, 0, 0, c, 0, s, 0, x, base, z, 1] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]);
  return out;
}
export function characterNormal(root: NumericVector, out = new Float32Array(9)) {
  return affineNormalMatrix(root, out);
}

export function characterPoint(
  draw: CharacterDraw,
  id: number,
  out = new Float32Array(6),
  local = new Float64Array(6),
) {
  const mesh = draw.mesh,
    v = mesh.vertices,
    k = id * 6,
    a = mesh.bonesA[id] * 12,
    b = mesh.bonesB[id] * 12,
    w = mesh.weights[id],
    q = 1 - w,
    m = draw.bones,
    r = draw.root,
    n = draw.normal;
  for (let row = 0; row < 3; row++) {
    const A = a + row * 4,
      B = b + row * 4;
    local[row] =
      (m[A] * v[k] + m[A + 1] * v[k + 1] + m[A + 2] * v[k + 2] + m[A + 3]) * q +
      (m[B] * v[k] + m[B + 1] * v[k + 1] + m[B + 2] * v[k + 2] + m[B + 3]) * w;
    local[row + 3] =
      (m[A] * v[k + 3] + m[A + 1] * v[k + 4] + m[A + 2] * v[k + 5]) * q +
      (m[B] * v[k + 3] + m[B + 1] * v[k + 4] + m[B + 2] * v[k + 5]) * w;
  }
  for (let row = 0; row < 3; row++) {
    out[row] = r[row] * local[0] + r[4 + row] * local[1] + r[8 + row] * local[2] + r[12 + row];
    out[row + 3] = n[row] * local[3] + n[3 + row] * local[4] + n[6 + row] * local[5];
  }
  if (draw.normalizeNormals) {
    const length = Math.hypot(out[3], out[4], out[5]) || 1;
    for (let row = 3; row < 6; row++) out[row] /= length;
  }
  return out;
}
const influenceBounds = new WeakMap<SkinnedMesh, { lo: number[]; hi: number[] }[]>();
function characterBoneBounds(mesh: SkinnedMesh) {
  if (influenceBounds.has(mesh)) return influenceBounds.get(mesh)!;
  const bounds = Array.from({ length: 16 }, () => ({
    lo: [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi: [-Infinity, -Infinity, -Infinity] satisfies [number, number, number],
  }));
  for (let id = 0; id < mesh.bonesA.length; id++)
    for (const bone of new Set([mesh.bonesA[id], mesh.bonesB[id]])) {
      const b = bounds[bone];
      for (let k = 0; k < 3; k++) {
        b.lo[k] = Math.min(b.lo[k], mesh.vertices[id * 6 + k]);
        b.hi[k] = Math.max(b.hi[k], mesh.vertices[id * 6 + k]);
      }
    }
  influenceBounds.set(mesh, bounds);
  return bounds;
}
/** The union of transformed influence boxes encloses every blended vertex. */
export function characterBounds(draw: CharacterDraw) {
  const lo = [Infinity, Infinity, Infinity] satisfies [number, number, number],
    hi = [-Infinity, -Infinity, -Infinity] satisfies [number, number, number],
    r = draw.root,
    m = draw.bones;
  for (const [bone, b] of characterBoneBounds(draw.mesh).entries()) {
    if (!Number.isFinite(b.lo[0])) continue;
    const k = bone * 12;
    for (let corner = 0; corner < 8; corner++) {
      const x = b[corner & 1 ? 'hi' : 'lo'][0],
        y = b[corner & 2 ? 'hi' : 'lo'][1],
        z = b[corner & 4 ? 'hi' : 'lo'][2];
      const px = m[k] * x + m[k + 1] * y + m[k + 2] * z + m[k + 3],
        py = m[k + 4] * x + m[k + 5] * y + m[k + 6] * z + m[k + 7],
        pz = m[k + 8] * x + m[k + 9] * y + m[k + 10] * z + m[k + 11];
      for (let a = 0; a < 3; a++) {
        const v = r[a] * px + r[4 + a] * py + r[8 + a] * pz + r[12 + a];
        lo[a] = Math.min(lo[a], v);
        hi[a] = Math.max(hi[a], v);
      }
    }
  }
  return { lo, hi };
}
/** Exact triangles are generated lazily for a mouse ray, never every frame. */
export function characterPickMesh(draw: CharacterDraw) {
  if (draw.pickMesh) return draw.pickMesh;
  const mesh = draw.mesh,
    data = new Float32Array(mesh.bonesA.length * 11),
    p = new Float32Array(6),
    local = new Float64Array(6);
  // Deform shared vertices once, including when several triangles use them.
  for (let id = 0; id < mesh.bonesA.length; id++) {
    characterPoint(draw, id, p, local);
    const slot = mesh.slots[id],
      shade = mesh.shades[id],
      palette = draw.palette,
      k = slot * 4;
    const color = slot < 0 ? mesh.colors!.subarray(id * 3, id * 3 + 3) : palette.subarray(k, k + 3),
      surface = palette[k + 3],
      u = slot < 0 ? mesh.uv![id * 2] : surface === 1 ? -1.4 : surface === 2 ? -1.25 : -1,
      v = slot < 0 ? mesh.uv![id * 2 + 1] : surface === 1 ? 0.4 : surface === 2 ? 0.22 : -1;
    data.set(p, id * 11);
    data[id * 11 + 6] = color[0] * shade;
    data[id * 11 + 7] = color[1] * shade;
    data[id * 11 + 8] = color[2] * shade;
    data[id * 11 + 9] = u;
    data[id * 11 + 10] = v + (u <= -2 ? draw.uvAngle : 0);
  }
  return (draw.pickMesh = { data, indices: draw.indices });
}
