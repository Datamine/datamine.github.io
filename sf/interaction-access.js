import { GAMEPLAY } from './config/gameplay.js';

/** These are world-space feet positions. Logical entry tiles must be
 * converted before using this API. */
export function npcInRange(player, npc, { range = GAMEPLAY.interactionRange, height = 2.5 } = {}) {
  return (
    !!npc &&
    Math.hypot(player.x - npc.x, player.z - npc.z) <= range &&
    Math.abs(player.y - npc.base) <= height
  );
}
export function nearbyServiceNPC(geometry, player, predicate, options) {
  let nearest = null,
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
export function fuelCarInRange(car, station, npc = null) {
  const at = car?.position,
    bay = station && car?.sample(station.distance);
  return (
    !!at &&
    !!bay &&
    (Math.hypot(at.x - bay.x, at.z - bay.z) <= 6 ||
      (!!npc && Math.hypot(at.x - npc.x, at.z - npc.z) <= 6))
  );
}
