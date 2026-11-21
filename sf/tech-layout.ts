// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** South Bay business plots, kept clear of homes, cow pens and research courts. */
export const APPLE_CAMPUS = Object.freeze({
  x: 43,
  z: 173.8,
  outer: 3.4,
  inner: 2.2,
  base: 1.6,
  height: 2.55,
  segments: 64,
  entry: Object.freeze({ x: 42.5, y: 171.8 }),
});
export const ROBOTAXI_DEALER = Object.freeze({
  x: 47.5,
  z: 168.6,
  w: 3.2,
  d: 3.6,
  base: 1.6,
  entry: Object.freeze({ x: 47, y: 166.1 }),
});
export const TECH_PATHS = Object.freeze([
  {
    name: contentText('tech-layout.module.name-1', {}),
    halfWidth: 0.36,
    points: [
      [42.5, 167.5] satisfies [number, number],
      [43, 169] satisfies [number, number],
      [43, 172.3] satisfies [number, number],
    ],
  },
  {
    name: contentText('tech-layout.module.name-2', {}),
    halfWidth: 0.36,
    points: [[50, 166.1] satisfies [number, number], [47.5, 166.1] satisfies [number, number]],
  },
]);
export function appleRingSections() {
  const c = APPLE_CAMPUS,
    parts = [];
  for (let i = 0; i < c.segments; i++) {
    const a = (i * Math.PI * 2) / c.segments,
      b = ((i + 1) * Math.PI * 2) / c.segments;
    if (Math.abs((a + b) / 2 - Math.PI) < 0.3) continue; // Open northern gateway.
    const at = (r: number, t: number) =>
      [c.x + Math.sin(t) * r, c.z + Math.cos(t) * r] satisfies [number, number];
    parts.push({ a, b, polygon: [at(c.outer, a), at(c.outer, b), at(c.inner, b), at(c.inner, a)] });
  }
  return parts;
}
export function inTechGrounds(x: number, z: number, margin = 0) {
  const a = APPLE_CAMPUS,
    r = ROBOTAXI_DEALER;
  return (
    Math.hypot(x - a.x, z - a.z) < a.outer + 0.5 + margin ||
    (Math.abs(x - r.x) < r.w / 2 + 0.2 + margin && Math.abs(z - r.z) < r.d / 2 + 0.3 + margin)
  );
}
