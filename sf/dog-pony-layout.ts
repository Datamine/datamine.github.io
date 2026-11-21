// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
/** Shared geography, price and timing for the little Foundry Lane showground. */
export const DOG_PONY_SHOW = Object.freeze({
  id: 'dog-pony-show',
  administrator: 'dog-pony-administrator',
  label: contentText('dog-pony-layout.module.label-1', {}),
  x: 68.2,
  z: 170.7,
  west: 64.4,
  east: 71.5,
  north: 167.2,
  south: 174.4,
  price: 1,
  durationMs: 3000,
  entry: Object.freeze({ x: 70.1, y: 168.2 }),
  stage: Object.freeze({ x: 65.1, z: 169.5, w: 5.8, d: 2.6 }),
});
export function inDogPonyShow(x: number, z: number, pad = 0) {
  const s = DOG_PONY_SHOW;
  return x > s.west - pad && x < s.east + pad && z > s.north - pad && z < s.south + pad;
}
export function dogPonyPose(startedAt: number | undefined, now: number) {
  const elapsed = typeof startedAt === 'number' && startedAt > 0 ? (now - startedAt) / 1000 : -1,
    active = elapsed >= 0 && elapsed < DOG_PONY_SHOW.durationMs / 1000;
  const progress = active ? Math.max(0, Math.min(1, (elapsed - 0.45) / 1.35)) : 0;
  return {
    active,
    progress,
    angle: progress * Math.PI * 2,
    height: Math.sin(progress * Math.PI) * 1.65,
    crouch: active && elapsed < 0.45 ? Math.sin((elapsed / 0.45) * Math.PI) * 0.06 : 0,
  };
}
