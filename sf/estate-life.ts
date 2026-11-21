import type { WorldObject } from './types/world.ts';
import { requiredValue } from './types/assert.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { drawHumanNPC } from './human-npc.ts';
import { estatePoint } from './estate-design.ts';
import type { Mesh } from './geometry.ts';

export function createEstateResidents(houses: readonly Partial<WorldObject>[]) {
  return houses
    .filter((h) => h.pool)
    .map((h, i) => {
      const pool = requiredValue(h.pool, 'The estate pool is missing.'),
        [x, z] = requiredValue(pool.center, 'The estate pool center is missing.'),
        edge = estatePoint(
          requiredValue(h.plot, 'The estate parcel is missing.'),
          pool.x + pool.w / 2,
          requiredValue(h.d, 'Estate parcel depth') / 2 + 0.38,
        );
      return {
        id: 'estate-swimmer-' + i,
        label:
          i % 2
            ? contentText('estate-life.createEstateResidents.label-1.yes', {})
            : contentText('estate-life.createEstateResidents.label-1.no', {}),
        estateResident: true,
        regional: true,
        female: !!(i % 2),
        x,
        z,
        origin: [x, z],
        base: requiredValue(pool.base, 'The estate pool height is missing.') - 1.13,
        height: 1.85,
        angle: (h.rotation || 0) + Math.PI / 2,
        pool: Object.assign(pool, {
          base: requiredValue(pool.base, 'The estate pool height is missing.'),
        }),
        seed: i * 1.73,
        approach: { x: edge[0] - 0.5, y: edge[1] - 0.5 },
        skin: (['#ad805e', '#79543d', '#c6a284'] satisfies [string, string, string])[i % 3],
        shirt: (['#b88173', '#5d91a0', '#7d9161'] satisfies [string, string, string])[i % 3],
        description: (
          [
            'A resident doing very small laps in a very expensive pool. Calls this a liquidity event.',
            'Has mastered the difficult art of scheduling absolutely nothing before lunch.',
            'A dedicated student of water temperature and cantilevered architecture.',
          ] satisfies [string, string, string]
        )[i % 3],
        poolTalk: (
          [
            'The architect called it a reflecting pool. I am reflecting on not going to work.',
            'They asked if I wanted a home office. I asked for another sun lounger.',
            'The pool is heated. My financial adviser says that is technically a burn rate.',
          ] satisfies [string, string, string]
        )[i % 3],
      };
    });
}

/** Reuses the cached human rig and the existing dynamic batch. Only nearby
 * pools animate; immersion and the shallow-water depth buffer hide the legs. */
export function drawEstateResidents(
  m: Mesh,
  residents: ReturnType<typeof createEstateResidents>,
  time: number,
  viewer: number[],
  reduced = false,
  addTarget: (
    start: number,
    npc: ReturnType<typeof createEstateResidents>[number],
  ) => void = () => {},
  visible: (x: number, z: number, base: number) => boolean = () => true,
) {
  for (const npc of residents) {
    if (
      Math.hypot(npc.origin[0] - viewer[0], npc.origin[1] - viewer[1]) > 26 ||
      !visible(npc.x, npc.z, npc.base)
    )
      continue;
    const t = reduced ? 0 : time * 0.001 + npc.seed;
    npc.x = npc.origin[0] + Math.cos(t * 0.31) * 0.1;
    npc.z = npc.origin[1] + Math.sin(t * 0.31) * 0.12;
    const start = m.data.length;
    drawHumanNPC(m, npc, time, {
      x: npc.x,
      z: npc.z,
      base: npc.base + Math.sin(t * 1.8) * 0.018,
      angle: npc.angle,
      phase: 0,
      seated: false,
      skin: npc.skin,
      shirt: npc.shirt,
      appearance: {
        mode: 'swim',
        female: npc.female,
        longHair: npc.female,
        backpack: false,
        pants: npc.shirt,
        time: t,
      },
      reduced: reduced,
    });
    addTarget(start, npc);
    // Fine concentric ripples, kept outside the human hit box.
    for (const radius of [0.29, 0.43] satisfies [number, number])
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12,
          b = ((i + 1) * Math.PI) / 12,
          r = radius + 0.012 * Math.sin(t * 2);
        m.quad(
          [npc.x + Math.cos(a) * r, npc.pool.base + 0.012, npc.z + Math.sin(a) * r],
          [
            npc.x + Math.cos(a) * (r + 0.009),
            npc.pool.base + 0.012,
            npc.z + Math.sin(a) * (r + 0.009),
          ],
          [
            npc.x + Math.cos(b) * (r + 0.009),
            npc.pool.base + 0.012,
            npc.z + Math.sin(b) * (r + 0.009),
          ],
          [npc.x + Math.cos(b) * r, npc.pool.base + 0.012, npc.z + Math.sin(b) * r],
          '#abd4ca',
        );
      }
  }
}
