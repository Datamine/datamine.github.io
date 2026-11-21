import type { NumericVector } from '../types/geometry.ts';
import type { Mesh } from '../geometry.ts';

/** Inverse transpose of an affine matrix's linear part, column-major. */
export function affineNormalMatrix(
  matrix: NumericVector,
  out: Float32Array | Float64Array = new Float32Array(9),
) {
  const [a, d, g] = matrix;
  const b = matrix[4],
    e = matrix[5],
    h = matrix[6];
  const c = matrix[8],
    f = matrix[9],
    i = matrix[10];
  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const determinant = a * A + b * B + c * C;
  const inverse = 1 / (determinant || 1);
  out.set(
    (
      [
        A,
        c * h - b * i,
        b * f - c * e,
        B,
        a * i - c * g,
        c * d - a * f,
        C,
        b * g - a * h,
        a * e - b * d,
      ] satisfies [number, number, number, number, number, number, number, number, number]
    ).map((value) => value * inverse),
  );
  return out;
}

/** Pitch around a fixed point, in the vertical plane of the given heading. */
export function pitchAroundPoint(x: number, y: number, z: number, heading: number, pitch: number) {
  const fx = Math.cos(heading),
    fz = Math.sin(heading);
  const cosine = Math.cos(pitch),
    sine = Math.sin(pitch),
    delta = cosine - 1;
  const xx = 1 + fx * fx * delta,
    xz = fx * fz * delta;
  const zz = 1 + fz * fz * delta;
  return new Float64Array([
    xx,
    -fx * sine,
    xz,
    0,
    fx * sine,
    cosine,
    fz * sine,
    0,
    xz,
    -fz * sine,
    zz,
    0,
    x - xx * x - fx * sine * y - xz * z,
    y + fx * sine * x - cosine * y + fz * sine * z,
    z - xz * x - fz * sine * y - zz * z,
    1,
  ] satisfies [
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
}

/** Transform both ordinary triangles and deferred GPU characters. Keeping
 * these together prevents models, accessories and picking from separating. */
export function transformMeshRange(
  mesh: Mesh,
  start: number,
  matrix: number[] | Float64Array<ArrayBuffer>,
  { normalizeNormals = false }: { normalizeNormals?: boolean } | undefined = {},
) {
  mesh.characters?.transform(start, matrix, 0, normalizeNormals);
  const data = mesh.data;
  const normal = affineNormalMatrix(matrix, new Float64Array(9));
  for (let at = start; at < data.length; at += 11) {
    const x = data[at],
      y = data[at + 1],
      z = data[at + 2];
    const nx = data[at + 3],
      ny = data[at + 4],
      nz = data[at + 5];
    data[at] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    data[at + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    data[at + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    const a = normal[0] * nx + normal[3] * ny + normal[6] * nz;
    const b = normal[1] * nx + normal[4] * ny + normal[7] * nz;
    const c = normal[2] * nx + normal[5] * ny + normal[8] * nz;
    const length = normalizeNormals ? Math.hypot(a, b, c) || 1 : 1;
    data[at + 3] = a / length;
    data[at + 4] = b / length;
    data[at + 5] = c / length;
  }
}
