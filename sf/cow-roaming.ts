import { isFiniteNumber } from './types/json.ts';
import type { SharedCow } from './types/shared-world.ts';
import { COW_PEN } from './jurassic-layout.ts';

/** Small, deterministic grazing walks. This does not consume the combat RNG.
 * Destinations, pauses and animation phases are serializable herd state. */
export function updateGrazingCow(
  cow: Pick<SharedCow, 'id' | 'x' | 'z' | 'home' | 'hp'> &
    Partial<
      Pick<
        SharedCow,
        'angle' | 'phase' | 'motion' | 'grazingPause' | 'grazingVisit' | 'grazingTarget'
      >
    >,
  dt: unknown,
  {
    blocked = false,
    clear = () => true,
    travel = () => true,
  }: {
    blocked?: boolean;
    clear?: (x: number, y: number) => boolean;
    travel?: (ax: number, ay: number, bx: number, by: number, ignore?: boolean) => boolean;
  } = {},
) {
  cow.motion = 0;
  if (!cow.hp || blocked || !isFiniteNumber(dt) || dt <= 0) return;
  cow.grazingPause = Math.max(0, (cow.grazingPause ?? 2) - dt);
  if (cow.grazingPause) return;
  if (!cow.grazingTarget) {
    const i = Number(cow.id.match(/\d+$/)?.[0] || 0),
      visit = (cow.grazingVisit || 0) + 1;
    cow.grazingVisit = visit;
    const angle = i * 2.399 + visit * 1.79,
      radius = 0.65 + 0.65 * (0.5 + 0.5 * Math.sin(i * 13 + visit * 7));
    const x = Math.max(
        COW_PEN.x - COW_PEN.w / 2 + 1,
        Math.min(COW_PEN.x + COW_PEN.w / 2 - 1, cow.home.x + Math.cos(angle) * radius),
      ),
      z = Math.max(
        COW_PEN.z - COW_PEN.d / 2 + 1,
        Math.min(COW_PEN.z + COW_PEN.d / 2 - 1, cow.home.z + Math.sin(angle) * radius),
      );
    if (!clear(x - 0.5, z - 0.5) || !travel(cow.x - 0.5, cow.z - 0.5, x - 0.5, z - 0.5, true)) {
      cow.grazingPause = 2;
      return;
    }
    cow.grazingTarget = { x, z };
  }
  const target = cow.grazingTarget,
    dx = target.x - cow.x,
    dz = target.z - cow.z,
    distance = Math.hypot(dx, dz),
    step = Math.min(distance, 0.35 * dt);
  if (step) {
    const x = cow.x + (dx / distance) * step,
      z = cow.z + (dz / distance) * step;
    if (!travel(cow.x - 0.5, cow.z - 0.5, x - 0.5, z - 0.5, true)) {
      cow.grazingTarget = null;
      cow.grazingPause = 2;
      return;
    }
    cow.x = x;
    cow.z = z;
    cow.angle = Math.atan2(dz, dx);
    cow.phase = (cow.phase || 0) + step * 7;
    cow.motion = 1;
  }
  if (distance <= step + 1e-6) {
    cow.grazingTarget = null;
    cow.grazingPause = 3 + (cow.grazingVisit! % 4);
  }
}
