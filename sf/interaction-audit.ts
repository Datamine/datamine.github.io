import type { WorldModel } from './types/server.ts';
import { npcInRange } from './interaction-access.ts';

/** Exercise authored arrival points at every stop in an NPC's patrol. Being
 * pathfindable is insufficient if the server would reject the conversation. */
export function auditInteractionApproaches<
  T extends Pick<import('./types/world.ts').Actor, 'id' | 'x' | 'z' | 'base'> & {
    roam?: Pick<import('./types/world.ts').RoamingRoute, 'points'>;
  },
>(world: {
  merchants: T[];
  characterGround: (x: number, z: number) => number;
  approaches: { merchant: (npc: T) => import('./types/geometry.ts').Point | null };
  landClearAt?: WorldModel['landClearAt'];
  canTravel?: WorldModel['canTravel'];
}) {
  const errors = [];
  let checked = 0;
  for (const npc of world.merchants) {
    const original = { x: npc.x, z: npc.z, base: npc.base };
    const positions = [null, ...(npc.roam?.points || [])];
    try {
      for (const point of positions) {
        if (point) {
          npc.x = point.x + 0.5;
          npc.z = point.y + 0.5;
          npc.base = world.characterGround(npc.x, npc.z) + 0.025;
        }
        const arrival = world.approaches.merchant(npc);
        checked++;
        if (!arrival) {
          errors.push(npc.id + ': no conversation approach');
          continue;
        }
        const feet = {
          x: arrival.x + 0.5,
          z: arrival.y + 0.5,
          y: world.characterGround(arrival.x + 0.5, arrival.y + 0.5),
        };
        if (!npcInRange(feet, npc))
          errors.push(
            npc.id +
              ': conversation approach is outside server range at ' +
              JSON.stringify({ x: npc.x, z: npc.z, arrival }),
          );
        if (
          world.landClearAt &&
          world.canTravel &&
          world.landClearAt(npc.x - 0.5, npc.z - 0.5) &&
          !world.canTravel(npc.x - 0.5, npc.z - 0.5, arrival.x, arrival.y, true)
        )
          errors.push(npc.id + ': conversation approach is separated from the NPC by scenery');
      }
    } finally {
      Object.assign(npc, original);
    }
  }
  return { ok: !errors.length, errors, checked };
}
