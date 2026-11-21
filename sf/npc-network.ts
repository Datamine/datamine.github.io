interface PresentationActor {
  id: string | number;
  networked?: boolean;
  networkVisible?: boolean;
  moving?: boolean;
  motion?: number;
}
interface PresentationOptions<T extends PresentationActor> {
  npcs: readonly T[];
  lives?: readonly { setNetworkControlled: (controlled: boolean) => void }[];
  now?: () => number;
}
import { createActorMotionGroup } from './snapshot-motion.ts';
/** Only snapshots move shared actors. Interpolation stops on connection loss. */
export function createNPCPresentation<T extends PresentationActor>({
  npcs,
  lives = [],
  now = () => performance.now(),
}: PresentationOptions<T>) {
  const byId = new Map(npcs.map((n) => [n.id, n])),
    motion = createActorMotionGroup({ now });
  for (const life of lives) life.setNetworkControlled(true);
  for (const npc of npcs) {
    npc.networked = true;
    npc.networkVisible = false;
  }
  function sync<R extends { id: string | number }>(records: readonly R[], time = now()) {
    const visible = new Set(records.map((n) => n.id));
    for (const npc of npcs) npc.networkVisible = visible.has(npc.id);
    motion.retain(visible);
    for (const current of records) {
      const npc = byId.get(current.id);
      if (!npc) continue;
      motion.accept(npc.id, npc, current, time);
      npc.networked = true;
      npc.networkVisible = true;
    }
  }
  function update(connected: boolean) {
    motion.update(connected);
    if (connected)
      for (const npc of npcs) if (npc.networkVisible) npc.moving = (npc.motion || 0) > 0.01;
  }
  return { sync, update, clear: () => motion.clear() };
}
