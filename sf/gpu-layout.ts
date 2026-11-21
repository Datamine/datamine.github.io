// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
export const GPU_FACTORY = Object.freeze({
  x: 77,
  z: 170.7,
  w: 4.8,
  d: 4.6,
  base: 1.6,
  entry: Object.freeze({ x: 76.5, y: 174.4 }),
});
export function inGPUFactoryGrounds(x: number, z: number, margin = 0) {
  const f = GPU_FACTORY;
  return (
    Math.abs(x - f.x) <= f.w / 2 + 0.4 + margin &&
    z >= f.z - f.d / 2 - 0.3 - margin &&
    z <= 175.6 + margin
  );
}
export const GPU_FACTORY_PATH = Object.freeze({
  name: contentText('gpu-layout.module.name-1', {}),
  halfWidth: 0.35,
  points: [
    [72.5, 175.5] satisfies [number, number],
    [77, 175.5] satisfies [number, number],
    [77, 173.5] satisfies [number, number],
  ],
});
