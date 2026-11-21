import type { RegisterObject } from '../../types/model-context.ts';
/** Register the real vertex range and bounds without a scene or GPU. */
export const registerFixtureObject: RegisterObject = (
  mesh,
  start,
  info,
  end = mesh.data.length,
) => {
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (let i = start; i < end; i += 11)
    for (let axis = 0; axis < 3; axis++) {
      lo[axis] = Math.min(lo[axis], mesh.data[i + axis]);
      hi[axis] = Math.max(hi[axis], mesh.data[i + axis]);
    }
  return { ...info, mesh, start: start / 11, count: (end - start) / 11, lo, hi };
};
/** Array.map preserves a fixed tuple's length, which its standard signature erases. */
export function mapTuple<const T extends readonly unknown[], R>(
  values: T,
  map: (value: T[number], index: number) => R,
): { [K in keyof T]: R } {
  return values.map(map) as { [K in keyof T]: R };
}
