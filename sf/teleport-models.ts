import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
export function drawTabletTeleport(
  m: Mesh,
  teleport: { position: { x: number; y: number; z: number }; base: number; progress: number },
  time: number,
) {
  const { position: p, base, progress } = teleport,
    charge = Math.min(1, progress * 5),
    turn = time * 0.006;
  pose(m, p.x, base + 0.04, p.z, 0, () => {
    const radius = 0.5 + Math.sin(progress * Math.PI) * 0.25;
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12;
      m.rod(
        [Math.cos(a) * radius, 0.02, Math.sin(a) * radius] satisfies [number, number, number],
        [Math.cos(b) * radius, 0.02, Math.sin(b) * radius] satisfies [number, number, number],
        0.015,
        '#af75e9',
        5,
        { emissive: 0.7 },
      );
    }
    for (let k = 0; k < 5; k++) {
      let previous: [number, number, number] | null = null;
      for (let i = 0; i < 9; i++) {
        const t = i / 8,
          angle = turn + (k * Math.PI * 2) / 5 + t * 2.6,
          wide = (0.4 + 0.16 * Math.sin(i * 4 + k)) * (1 - t * 0.5),
          point = [
            Math.cos(angle) * wide,
            (p.y - base + 2.3) * t * charge,
            Math.sin(angle) * wide,
          ] satisfies [number, number, number];
        if (previous) m.rod(previous, point, 0.016, '#b16bff', 5, { emissive: 0.9 });
        previous = point;
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + turn * 0.4,
        y = ((time * 0.001 + i * 0.21) % 1) * (p.y - base + 2.2),
        r = 0.2 + charge * 0.35;
      m.sphere(Math.cos(a) * r, y, Math.sin(a) * r, 0.026, 0.06, 0.026, '#e6b5ff', 6, 4, {
        emissive: 0.7,
      });
    }
  });
}
