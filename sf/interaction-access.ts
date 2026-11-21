import type { WorldPoint } from './types/geometry.ts';
import type { Actor } from './types/world.ts';
import { GAMEPLAY } from './config/gameplay.ts';
import type { ServerGeometry, ServerPlayer } from './types/server.ts';

/** These are world-space feet positions. Logical entry tiles must be
 * converted before using this API. */
export function npcInRange(
  player: WorldPoint & { y: number },
  npc: Pick<Actor, 'x' | 'z' | 'base'>,
  { range = GAMEPLAY.interactionRange, height = 2.5 }: { range?: number; height?: number } = {},
) {
  return (
    !!npc &&
    Math.hypot(player.x - npc.x, player.z - npc.z) <= range &&
    Math.abs(player.y - (npc.base ?? 0)) <= height
  );
}
export function nearbyServiceNPC(
  geometry: Pick<ServerGeometry, 'merchants'>,
  player: Pick<ServerPlayer, 'x' | 'y' | 'z'>,
  predicate: (actor: Actor) => boolean,
  options?: { range?: number; height?: number },
) {
  let nearest: Actor | null = null,
    distance = Infinity;
  for (const npc of geometry.merchants || [])
    if (predicate(npc) && npcInRange(player, npc, options)) {
      const d = Math.hypot(player.x - npc.x, player.z - npc.z);
      if (d < distance) {
        nearest = npc;
        distance = d;
      }
    }
  return nearest;
}
/** Serve the roadside parking bay or a car pulled up beside the counter.
 * Check the actual car position, including off-road parking. */
export function fuelCarInRange(
  car: { position: WorldPoint | null; sample: (distance: number) => WorldPoint } | null | undefined,
  station: { distance?: number } | undefined,
  npc: WorldPoint | null = null,
) {
  const at = car?.position,
    bay = station && car?.sample(station.distance ?? 0);
  return (
    !!at &&
    !!bay &&
    (Math.hypot(at.x - bay.x, at.z - bay.z) <= 6 ||
      (!!npc && Math.hypot(at.x - npc.x, at.z - npc.z) <= 6))
  );
}
