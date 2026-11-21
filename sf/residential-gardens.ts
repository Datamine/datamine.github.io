import type { Parcel } from './types/parcels.ts';
import type { Mesh } from './geometry.ts';
import { pose } from './geometry.ts';
import { suburbanPlan, suburbanGardenFences } from './suburban-layout.ts';

/** White pickets stop at the front gate and garage. All planting stays inside
 * the home parcel; each picket follows the actual slope below it. */
export function drawResidentialGarden(
  m: Mesh,
  p: Readonly<Parcel>,
  terrain: { height: (x: number, z: number) => number },
) {
  const plan = suburbanPlan(p),
    a = p.rotation || 0,
    point = (u: number, v: number): [number, number] => [
      p.x + u * Math.cos(a) - v * Math.sin(a),
      p.z + u * Math.sin(a) + v * Math.cos(a),
    ];
  const fences = suburbanGardenFences(p);
  pose(m, p.x, 0, p.z, a, () => {
    for (const f of fences) {
      if (f.w > 0.9)
        for (let j = 0; j < 4; j++) {
          const x = f.x + ((j + 0.5) * f.w) / 4,
            z = f.z - 0.19,
            y = terrain.height(...point(x, z));
          m.sphere(
            x,
            y + 0.13,
            z,
            Math.min(0.18, f.w / 8),
            0.16,
            0.105,
            j % 2 ? '#668456' : '#52764e',
            9,
            5,
          );
        }
      const steps = Math.max(2, Math.ceil(f.w / 0.15));
      for (let i = 0; i <= steps; i++) {
        const x = f.x + (i * f.w) / steps,
          z = f.z + 0.035,
          y = terrain.height(...point(x, z));
        m.box(x - 0.022, y, z - 0.022, 0.044, 0.36, 0.044, '#eeeade', 'wood');
        m.tri(
          [x - 0.03, y + 0.36, z + 0.025],
          [x + 0.03, y + 0.36, z + 0.025],
          [x, y + 0.42, z + 0.025],
          '#f7f0df',
        );
      }
      for (const h of [0.12, 0.27] satisfies [number, number])
        for (let i = 0; i < steps; i++) {
          const x = f.x + (i * f.w) / steps,
            xx = f.x + ((i + 1) * f.w) / steps,
            y = terrain.height(...point(x, f.z)),
            yy = terrain.height(...point(xx, f.z));
          m.rod([x, y + h, f.z], [xx, yy + h, f.z], 0.016, '#dedfce', 4);
        }
    }
    for (const side of [-1, 1] satisfies [number, number]) {
      const u = side < 0 ? plan.house.x + 0.18 : plan.house.x + plan.house.w - 0.18,
        v = plan.front + 0.23;
      if (Math.abs(u - plan.entry.x) < 0.38) continue;
      const y = terrain.height(...point(u, v));
      for (let j = 0; j < 3; j++)
        m.sphere(
          u + (j - 1) * 0.11,
          y + 0.15,
          v,
          0.13,
          0.16,
          0.12,
          (['#52794f', '#668a57', '#789260'] satisfies [string, string, string])[j],
          9,
          5,
        );
      for (let j = 0; j < 7; j++) {
        const x = u + Math.cos(j * 2.4) * 0.15,
          z = v + Math.sin(j * 2.4) * 0.09;
        m.sphere(
          x,
          y + 0.28 + (j % 2) * 0.045,
          z,
          0.075,
          0.065,
          0.07,
          (['#9baed6', '#c3add3', '#d7d7df'] satisfies [string, string, string])[
            ((j + (p.seed || 0) * 100) | 0) % 3
          ],
          9,
          5,
        );
      }
    }
  });
  return fences;
}
