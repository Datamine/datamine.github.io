import { isFiniteNumber } from './types/json.ts';
import type { Appearance } from './types/content.ts';
import { SEARCH_ROCKET } from './config/search-houses.ts';

/** Presentation of a server-authorized hop. Tile movement stays on its native
 * navigation surface; the lift never advances routes or bypasses obstacles. */
export function sampleRocketHop(startedAt: unknown, time: unknown) {
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(time))
    return { active: false, progress: 0, height: 0, tuck: 0, air: 0 };
  const elapsed = time - startedAt;
  if (
    !Number.isFinite(startedAt) ||
    !Number.isFinite(time) ||
    startedAt <= 0 ||
    elapsed < 0 ||
    elapsed >= SEARCH_ROCKET.jumpMs
  )
    return { active: false, progress: 0, height: 0, tuck: 0, air: 0 };
  const progress = elapsed / SEARCH_ROCKET.jumpMs,
    flight = Math.max(0, Math.min(1, (progress - 0.12) / 0.76)),
    air = Math.sin(Math.PI * flight);
  const crouch =
    progress < 0.12
      ? Math.sin((Math.PI * progress) / 0.12)
      : progress > 0.88
        ? Math.sin((Math.PI * (progress - 0.88)) / 0.12)
        : 0;
  return {
    active: true,
    progress,
    height: SEARCH_ROCKET.jumpHeight * air * air,
    tuck: air * 0.16 + crouch * 0.13,
    air,
  };
}
export const rocketHopPose = (progress: number) =>
  sampleRocketHop(1, 1 + progress * SEARCH_ROCKET.jumpMs);
export function rocketHopForPose(
  p: { hp?: number; mode: string; appearance?: Appearance },
  time: number,
) {
  return (p.hp || 0) > 0 &&
    (['walk', 'dance'] satisfies [string, string]).includes(p.mode) &&
    p.appearance?.back === 'new-year-rocket'
    ? sampleRocketHop(p.appearance.rocketHopAt, time)
    : sampleRocketHop(0, time);
}
